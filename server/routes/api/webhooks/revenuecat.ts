/**
 * RevenueCat webhook — the iOS counterpart to server/routes/api/webhooks/stripe.ts.
 * Keeps `sextante_subscription` in sync with what Apple actually billed via
 * RevenueCat, for users on the native app's In-App Purchase flow.
 *
 * Configure in the RevenueCat dashboard: Project settings → Integrations →
 * Webhooks, URL `{your domain}/api/webhooks/revenuecat`, Authorization
 * header value = REVENUECAT_WEBHOOK_SECRET (same string on both sides).
 *
 * app_user_id is set to our own `user.id` at login time — see
 * syncRevenueCatUser() in src/lib/billing/revenuecat.ts — so no separate
 * customer-id lookup is needed here, unlike the Stripe webhook.
 */
import { defineEventHandler, getHeader, readBody } from "h3";
import { getSql } from "../../../../src/lib/db";
import { env } from "../../../../src/lib/env.server";

type RevenueCatEvent = {
  type: string;
  app_user_id: string;
  entitlement_ids?: string[] | null;
  product_id?: string;
  expiration_at_ms?: number | null;
};

const PRO_ENTITLEMENT = "sextante_pro";

function planForProductId(productId: string | undefined): "monthly" | "annual" {
  if (productId?.includes("annual")) return "annual";
  return "monthly";
}

function statusForEventType(type: string): "active" | "past_due" | "canceled" | null {
  switch (type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "UNCANCELLATION":
    case "PRODUCT_CHANGE":
      return "active";
    case "BILLING_ISSUE":
      return "past_due";
    case "EXPIRATION":
      return "canceled";
    // CANCELLATION: access continues until expiration_at_ms — no status
    // change yet, EXPIRATION will fire when it actually lapses.
    // TEST: dashboard "send test event" button — nothing to persist.
    default:
      return null;
  }
}

export default defineEventHandler(async (event) => {
  const secret = env("REVENUECAT_WEBHOOK_SECRET");
  if (!secret) return new Response("Not configured", { status: 500 });

  const auth = getHeader(event, "authorization");
  // RevenueCat sends exactly what you configured as the header value — but
  // we accept an optional "Bearer " prefix too, in case it was entered with
  // one (a common convention we can't fully rule out from the dashboard UI).
  const normalizedAuth = auth?.replace(/^Bearer\s+/i, "");
  if (normalizedAuth !== secret) {
    console.error("[revenuecat-webhook] auth header mismatch");
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await readBody<{ event: RevenueCatEvent }>(event);
  const rcEvent = body?.event;
  if (!rcEvent?.app_user_id) return new Response("ok", { status: 200 });

  // Only act on events for our paid entitlement — RevenueCat can be used for
  // other entitlements later without this webhook mis-firing on them.
  if (rcEvent.entitlement_ids && !rcEvent.entitlement_ids.includes(PRO_ENTITLEMENT)) {
    return new Response("ok", { status: 200 });
  }

  const status = statusForEventType(rcEvent.type);
  if (!status) return new Response("ok", { status: 200 });

  const sql = await getSql();
  try {
    await sql`
      insert into "sextante_subscription"
        ("user_id", "status", "plan", "provider", "provider_subscription_id", "current_period_end", "updated_at")
      values
        (${rcEvent.app_user_id}, ${status}, ${planForProductId(rcEvent.product_id)}, 'revenuecat',
         ${rcEvent.product_id ?? null},
         ${rcEvent.expiration_at_ms ? new Date(rcEvent.expiration_at_ms).toISOString() : null},
         current_timestamp)
      on conflict ("user_id") do update set
        "status" = excluded."status",
        "plan" = excluded."plan",
        "provider" = excluded."provider",
        "provider_subscription_id" = excluded."provider_subscription_id",
        "current_period_end" = excluded."current_period_end",
        "updated_at" = current_timestamp
    `;
  } catch (err) {
    // Most likely cause: app_user_id doesn't match any real Sextante account —
    // e.g. a RevenueCat-generated anonymous ID from before the app
    // successfully logged the user in (see syncRevenueCatUser). There's
    // nothing to update in that case; log it clearly so it's diagnosable,
    // but return 200 so RevenueCat stops retrying an event we can never
    // satisfy.
    console.error(
      `[revenuecat-webhook] failed to upsert for app_user_id=${rcEvent.app_user_id}:`,
      err instanceof Error ? err.message : err,
    );
    return new Response("ok (logged, not applied)", { status: 200 });
  }

  return new Response("ok", { status: 200 });
});
