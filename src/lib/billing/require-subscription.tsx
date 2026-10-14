import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { getSubscriptionStatus } from "./checkout";

/**
 * Gates a route behind sign-in AND a subscription that has at least started
 * (trialing/active/past_due) — i.e. the person has entered a card, even if
 * still within the free trial. Someone signed in with NO subscription record
 * (never started checkout, or canceled) is redirected to /assinatura instead
 * of seeing the feature. Case-count limits during trial are enforced
 * separately, server-side, in cases.ts.
 */
export function RequireSubscription({ children }: { children: React.ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const redirected = useRef(false);

  useEffect(() => {
    if (isPending || !user || redirected.current) return;
    let cancelled = false;
    getSubscriptionStatus()
      .then((sub) => {
        if (cancelled) return;
        const hasStarted =
          sub?.status === "trialing" || sub?.status === "active" || sub?.status === "past_due";
        if (hasStarted) {
          setChecked(true);
        } else {
          redirected.current = true;
          void navigate({ to: "/assinatura" });
        }
      })
      .catch(() => {
        if (cancelled) return;
        redirected.current = true;
        void navigate({ to: "/assinatura" });
      });
    return () => {
      cancelled = true;
    };
  }, [isPending, user, navigate]);

  if (isPending) return null;
  if (!user) return <RedirectToSignIn />;
  if (!checked) return null; // resolving, or already redirecting to /assinatura
  return <>{children}</>;
}
