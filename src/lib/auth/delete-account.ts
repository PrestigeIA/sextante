import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "./middleware";

/**
 * Full account deletion — required by App Store Guideline 5.1.1(v) for any
 * app that supports account creation. Cancels any live Stripe subscription
 * first (so the person doesn't keep getting billed for an account that no
 * longer exists), then deletes the `user` row. Every other table
 * (session, account, sextante_subscription, sextante_trade,
 * sextante_simulation, sextante_lesson_progress, sextante_support_message) has `on delete cascade` back to
 * `user.id` — see migrations/0002_sextante.sql — so this one delete cleans up
 * everything.
 */
export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<void> => {
    const sql = await getSql();

    const [sub] = await sql<{ provider: string; provider_subscription_id: string | null }>`
      select "provider", "provider_subscription_id" from "sextante_subscription" where "user_id" = ${context.userId}
    `;
    if (sub?.provider === "stripe" && sub.provider_subscription_id) {
      const { stripe } = await import("@/lib/billing/stripe.server");
      if (stripe) {
        try {
          await stripe.subscriptions.cancel(sub.provider_subscription_id);
        } catch {
          // If it's already canceled/missing on Stripe's side, that's fine —
          // don't let a Stripe hiccup block the person from deleting their
          // account, which is the part that actually matters here.
        }
      }
    }

    await sql`delete from "user" where "id" = ${context.userId}`;
  });
