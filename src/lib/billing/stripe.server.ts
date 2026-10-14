/**
 * Stripe client + plan configuration for Sextante Pro (WEB checkout).
 *
 * One product ("Sextante Pro"), two billing cycles. Create the product and two
 * recurring Prices in the Stripe Dashboard, then set the env vars below to
 * their Price IDs. Inside the iOS/Android app, billing goes through the
 * stores via RevenueCat instead (see revenuecat.ts) — Apple and Google require
 * in-app purchase for digital subscriptions sold inside an app.
 */
import Stripe from "stripe";
import { env } from "../env.server";

const secretKey = env("STRIPE_SECRET_KEY");

/** Null when STRIPE_SECRET_KEY isn't set — callers must handle this (see checkout.ts). */
export const stripe = secretKey ? new Stripe(secretKey) : null;

export type SextantePlan = "monthly" | "annual";

export const PLAN_PRICE_IDS: Record<SextantePlan, string | undefined> = {
  monthly: env("STRIPE_PRICE_MONTHLY"),
  annual: env("STRIPE_PRICE_ANNUAL"),
};

/** Free-trial length for a first-time subscriber, in days. Keep in sync with the store listing. */
export const TRIAL_PERIOD_DAYS = 7;

export function isPlan(value: string): value is SextantePlan {
  return value === "monthly" || value === "annual";
}
