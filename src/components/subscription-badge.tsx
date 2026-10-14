import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { getSubscriptionStatus } from "@/lib/billing/checkout";
import { cn } from "@/lib/utils";

type Status = Awaited<ReturnType<typeof getSubscriptionStatus>>;

const LABEL = {
  pt: {
    trialing: "Teste grátis",
    active: "Assinante",
    past_due: "Pagamento pendente",
    canceled: null,
    none: "Assinar",
  },
  en: {
    trialing: "Free trial",
    active: "Subscriber",
    past_due: "Payment issue",
    canceled: null,
    none: "Subscribe",
  },
};

/** Small status pill linking to /assinatura. Shown next to UserButton when signed in. */
export function SubscriptionBadge({ locale }: { locale: "pt" | "en" }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getSubscriptionStatus()
      .then((s) => {
        if (!cancelled) setStatus(s);
      })
      .catch(() => {
        /* not signed in, or offline — show nothing rather than an error pill */
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded) return null;
  const label = LABEL[locale][status?.status ?? "none"];
  if (!label) return null; // canceled — no nag pill, just let them find /assinatura themselves

  const urgent = status?.status === "past_due";
  return (
    <Link
      to="/assinatura"
      className={cn(
        "flex h-11 items-center rounded-md border px-3 text-sm font-medium",
        urgent
          ? "border-bad/40 bg-bad/10 text-bad"
          : "border-border bg-card text-muted-foreground",
      )}
    >
      {label}
    </Link>
  );
}
