import { useEffect } from "react";
import { configureRevenueCat, syncRevenueCatUser } from "@/lib/billing/revenuecat";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

/**
 * Native-only. Configures RevenueCat once at startup and keeps its
 * app_user_id in step with whoever is signed into Sextante, so the RevenueCat
 * webhook (server/routes/api/webhooks/revenuecat.ts) can match purchases
 * back to the right sextante_subscription row. A no-op on web.
 */
export function NativePurchasesInit() {
  const { user, isPending } = useCurrentUserState();

  useEffect(() => {
    void configureRevenueCat();
  }, []);

  useEffect(() => {
    console.log("[revenuecat] NativePurchasesInit effect: isPending =", isPending, "user?.id =", user?.id);
    if (isPending) return;
    void syncRevenueCatUser(user?.id ?? null);
  }, [isPending, user?.id]);

  return null;
}
