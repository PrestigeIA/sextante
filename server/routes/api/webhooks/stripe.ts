/**
 * Stripe webhook — the single source of truth that keeps `sextante_subscription`
 * in sync with what Stripe actually billed. Never trust the client's
 * checkout-success redirect alone (it fires before payment settles, and a
 * user can hit it without paying) — only this webhook grants access.
 *
 * Configure in the Stripe Dashboard: Developers → Webhooks → Add endpoint,
 * pointing at `{your domain}/api/webhooks/stripe`, subscribed to:
 *   checkout.session.completed, customer.subscription.updated,
 *   customer.subscription.deleted, invoice.payment_failed
 * Copy its signing secret into STRIPE_WEBHOOK_SECRET.
 */
import { defineEventHandler, getHeader, readRawBody } from "h3";
import Stripe from "stripe";
import { stripe } from "../../../../src/lib/billing/stripe.server";
import { getSql } from "../../../../src/lib/db";
import { env } from "../../../../src/lib/env.server";
import type { SextantePlan } from "../../../../src/lib/billing/stripe.server";

/** Map a Stripe Price ID back to our plan name via the configured env vars. */
function planForPriceId(priceId: string | undefined): SextantePlan {
  if (!priceId) return "monthly";
  if (priceId === env("STRIPE_PRICE_ANNUAL")) return "annual";
  return "monthly";
}

function mapStatus(s: Stripe.Subscription.Status): "trialing" | "active" | "past_due" | "canceled" {
  if (s === "trialing") return "trialing";
  if (s === "active") return "active";
  if (s === "past_due" || s === "unpaid" || s === "incomplete") return "past_due";
  return "canceled"; // canceled, incomplete_expired, paused
}

async function upsertSubscriptionFromStripe(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const userId = (sub.metadata?.sextanteUserId as string | undefined) ?? null;
  const sql = await getSql();

  // The subscription's metadata carries sextanteUserId only if we set it at
  // creation; otherwise resolve via the customer we stored during checkout.
  const resolvedUserId =
    userId ??
    (
      await sql<{ user_id: string }>`
        select "user_id" from "sextante_subscription" where "provider_customer_id" = ${customerId}
      `
    )[0]?.user_id;
  if (!resolvedUserId) return; // nothing to reconcile against (shouldn't happen)

  const priceId = sub.items.data[0]?.price.id;
  const periodEnd = sub.items.data[0]?.current_period_end;

  await sql`
    insert into "sextante_subscription"
      ("user_id", "status", "plan", "provider", "provider_customer_id",
       "provider_subscription_id", "current_period_end", "updated_at")
    values
      (${resolvedUserId}, ${mapStatus(sub.status)}, ${planForPriceId(priceId)}, 'stripe',
       ${customerId}, ${sub.id}, ${periodEnd ? new Date(periodEnd * 1000).toISOString() : null},
       current_timestamp)
    on conflict ("user_id") do update set
      "status" = excluded."status",
      "plan" = excluded."plan",
      "provider_customer_id" = excluded."provider_customer_id",
      "provider_subscription_id" = excluded."provider_subscription_id",
      "current_period_end" = excluded."current_period_end",
      "updated_at" = current_timestamp
  `;
}

export default defineEventHandler(async (event) => {
  if (!stripe) return new Response("Stripe not configured", { status: 500 });

  const signature = getHeader(event, "stripe-signature");
  const webhookSecret = env("STRIPE_WEBHOOK_SECRET");
  const rawBody = await readRawBody(event);
  if (!signature || !webhookSecret || !rawBody) {
    return new Response("Missing signature", { status: 400 });
  }

  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    return new Response(
      `Webhook signature verification failed: ${err instanceof Error ? err.message : "unknown"}`,
      { status: 400 },
    );
  }

  switch (stripeEvent.type) {
    case "checkout.session.completed": {
      const session = stripeEvent.data.object;
      if (session.mode === "subscription" && session.subscription) {
        const subId =
          typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        const sub = await stripe.subscriptions.retrieve(subId);
        // Attach sextanteUserId now that we know it, so future events self-resolve.
        if (session.client_reference_id) {
          await stripe.subscriptions.update(subId, {
            metadata: { sextanteUserId: session.client_reference_id },
          });
          sub.metadata = { ...sub.metadata, sextanteUserId: session.client_reference_id };
        }
        await upsertSubscriptionFromStripe(sub);
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await upsertSubscriptionFromStripe(stripeEvent.data.object);
      break;
    }
    case "invoice.payment_failed": {
      const invoice = stripeEvent.data.object;
      const subId = invoice.parent?.subscription_details?.subscription;
      if (typeof subId === "string") {
        const sub = await stripe.subscriptions.retrieve(subId);
        await upsertSubscriptionFromStripe(sub);
      }
      break;
    }
    default:
      break;
  }

  return { received: true };
});
