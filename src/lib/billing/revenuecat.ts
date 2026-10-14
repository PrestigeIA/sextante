import { Capacitor } from "@capacitor/core";
import { Purchases } from "@revenuecat/purchases-capacitor";

/**
 * RevenueCat wrapper for the native iOS app's In-App Purchase flow — added
 * to satisfy App Store Guideline 3.1.1 after Apple rejected the external
 * Stripe payment link twice (Sept 2026). The WEB app keeps using Stripe
 * checkout unchanged (see checkout.ts) — this file is native-only.
 *
 * IMPORTANT: this imports the native plugin STATICALLY (not via dynamic
 * `import()`). We tried dynamic import first to keep it out of the web
 * bundle, but on-device logs showed the import() call itself hanging
 * indefinitely inside the native WebView (logged "importing native
 * plugin…" and then nothing, ever — see the project notes for
 * the debugging trail). Static import costs the web bundle a bit of unused
 * code but is the reliable option; don't switch back without re-testing on
 * a real device.
 *
 * Entitlement used throughout: "sextante_pro" (configured in the RevenueCat
 * dashboard, mapped to the monthly/quarterly/annual products).
 *
 * All functions are no-ops (return null/false) on web so call sites don't
 * need to branch on Capacitor.isNativePlatform() themselves for every call —
 * only the UI branch in assinatura.tsx needs that check, to decide whether
 * to show the RevenueCat buttons or the Stripe ones at all.
 */

const ENTITLEMENT_ID = "sextante_pro";
let configured = false;
/** Guards against concurrent configure() calls racing each other — we saw
 * this happen in practice (NativePurchasesInit's effect and the assinatura
 * page's effect both firing configureRevenueCat() around the same time). */
let configuringPromise: Promise<void> | null = null;

/** Rejects with a clear error if `promise` hasn't settled within `ms` — used
 * to turn the silent-hang failure mode we kept hitting while wiring this up
 * (native bridge call that never resolves or rejects) into something visible
 * instead of an infinite "Carregando planos…". */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`[revenuecat] ${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

/** Call once at app start (see NativePurchasesInit). Safe to call more than
 * once, including concurrently — later callers await the same in-flight
 * configure(). */
export async function configureRevenueCat(): Promise<void> {
  if (!Capacitor.isNativePlatform() || configured) return;
  if (configuringPromise) return configuringPromise;

  configuringPromise = (async () => {
    const apiKey = import.meta.env.VITE_REVENUECAT_PUBLIC_API_KEY as string | undefined;
    console.log("[revenuecat] configureRevenueCat: apiKey present?", Boolean(apiKey));
    if (!apiKey) {
      console.warn("[revenuecat] VITE_REVENUECAT_PUBLIC_API_KEY not set — IAP disabled");
      return;
    }
    console.log("[revenuecat] calling configure()…");
    await withTimeout(Purchases.configure({ apiKey }), 15000, "configure()");
    console.log("[revenuecat] configure() resolved OK");
    configured = true;
  })();

  try {
    await configuringPromise;
  } finally {
    configuringPromise = null;
  }
}

/** Call when the signed-in user changes, so RevenueCat's app_user_id matches
 * our own user.id — this is what lets the webhook (see
 * server/routes/api/webhooks/revenuecat.ts) know which sextante_subscription row
 * to update. */
export async function syncRevenueCatUser(userId: string | null): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  console.log("[revenuecat] syncRevenueCatUser called with userId =", userId);
  await configureRevenueCat();
  if (!configured) return;
  if (userId) {
    console.log("[revenuecat] calling logIn with appUserID =", userId);
    const { customerInfo } = await Purchases.logIn({ appUserID: userId });
    console.log("[revenuecat] logIn done, originalAppUserId =", customerInfo.originalAppUserId);
  } else {
    console.log("[revenuecat] no userId — calling logOut");
    await Purchases.logOut();
  }
}

export type RevenueCatPackage = {
  identifier: string;
  product: { identifier: string; priceString: string; title: string };
};

/** Returns the current offering's packages, or [] on web / if not configured. */
export async function getOfferingPackages(): Promise<RevenueCatPackage[]> {
  if (!Capacitor.isNativePlatform()) return [];
  console.log("[revenuecat] getOfferingPackages: start");
  await configureRevenueCat();
  console.log("[revenuecat] getOfferingPackages: configured =", configured);
  if (!configured) return [];
  console.log("[revenuecat] getOfferingPackages: calling getOfferings()…");
  const { current } = await withTimeout(Purchases.getOfferings(), 15000, "getOfferings()");
  console.log("[revenuecat] getOfferingPackages: got offerings, current =", JSON.stringify(current));
  return (current?.availablePackages ?? []) as RevenueCatPackage[];
}

/** Purchases a package and returns whether the "sextante_pro" entitlement is
 * active afterward. Throws on failure (including user cancellation) —
 * callers should catch and check `err.userCancelled` before showing an
 * error message, per RevenueCat's convention. */
export async function purchasePackage(pkg: RevenueCatPackage): Promise<boolean> {
  const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg as never });
  return Boolean(customerInfo.entitlements.active[ENTITLEMENT_ID]);
}

export async function restorePurchases(): Promise<boolean> {
  const { customerInfo } = await Purchases.restorePurchases();
  return Boolean(customerInfo.entitlements.active[ENTITLEMENT_ID]);
}

/** Current entitlement state, or null on web / if not configured. */
export async function hasProEntitlement(): Promise<boolean | null> {
  if (!Capacitor.isNativePlatform()) return null;
  await configureRevenueCat();
  if (!configured) return null;
  const { customerInfo } = await Purchases.getCustomerInfo();
  return Boolean(customerInfo.entitlements.active[ENTITLEMENT_ID]);
}
