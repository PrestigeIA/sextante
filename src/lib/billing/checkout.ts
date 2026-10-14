import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "../auth/middleware";
import { getSql } from "../db";
import { env } from "../env.server";
import {
  PLAN_PRICE_IDS,
  TRIAL_PERIOD_DAYS,
  isPlan,
  stripe,
  type SextantePlan,
} from "./stripe.server";

function siteUrl(): string {
  return env("BETTER_AUTH_URL") ?? "http://localhost:8080";
}

/** Find (or create) the Stripe Customer for the signed-in user, and remember its id. */
async function resolveStripeCustomerId(userId: string): Promise<string> {
  if (!stripe) throw new Error("stripe_not_configured");
  const sql = await getSql();

  const [existing] = await sql<{ provider_customer_id: string | null }>`
    select "provider_customer_id" from "sextante_subscription" where "user_id" = ${userId}
  `;
  if (existing?.provider_customer_id) return existing.provider_customer_id;

  const [user] = await sql<{ email: string; name: string }>`
    select "email", "name" from "user" where "id" = ${userId}
  `;
  const customer = await stripe.customers.create({
    email: user?.email,
    name: user?.name,
    metadata: { sextanteUserId: userId },
  });
  return customer.id;
}

export const startCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { plan: SextantePlan }) => input)
  .handler(async ({ context, data }): Promise<{ url: string }> => {
    if (!stripe) throw new Error("Stripe is not configured (STRIPE_SECRET_KEY missing).");
    if (!isPlan(data.plan)) throw new Error("Invalid plan.");
    const priceId = PLAN_PRICE_IDS[data.plan];
    if (!priceId) {
      throw new Error(
        `No Stripe Price configured for plan "${data.plan}" — set STRIPE_PRICE_${data.plan.toUpperCase()}.`,
      );
    }

    const customerId = await resolveStripeCustomerId(context.userId);
    const base = siteUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { trial_period_days: TRIAL_PERIOD_DAYS },
      success_url: `${base}/assinatura?success=1`,
      cancel_url: `${base}/assinatura?canceled=1`,
      client_reference_id: context.userId,
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return { url: session.url };
  });

/** Stripe's hosted portal — the user manages/cancels/switches billing cycle there directly. */
export const startBillingPortal = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ url: string }> => {
    if (!stripe) throw new Error("Stripe is not configured (STRIPE_SECRET_KEY missing).");
    const sql = await getSql();
    const [existing] = await sql<{ provider_customer_id: string | null }>`
      select "provider_customer_id" from "sextante_subscription" where "user_id" = ${context.userId}
    `;
    if (!existing?.provider_customer_id) {
      throw new Error("No billing account yet — start a subscription first.");
    }
    const portal = await stripe.billingPortal.sessions.create({
      customer: existing.provider_customer_id,
      return_url: `${siteUrl()}/assinatura`,
    });
    return { url: portal.url };
  });

export const getSubscriptionStatus = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const [row] = await sql<{
      status: "trialing" | "active" | "past_due" | "canceled";
      plan: SextantePlan;
      current_period_end: string | null;
    }>`
      select "status", "plan", "current_period_end" from "sextante_subscription"
      where "user_id" = ${context.userId}
    `;
    return row ?? null;
  });
