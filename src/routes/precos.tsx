import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { PageHeader } from "@/components/kit";
import { PricingCards } from "@/components/pricing";

export const Route = createFileRoute("/precos")({
  head: () => ({ meta: [{ title: "Preços — Sextante" }] }),
  component: PrecosPage,
});

function PrecosPage() {
  const [native, setNative] = useState(false);
  useEffect(() => setNative(Capacitor.isNativePlatform()), []);
  // Inside the store apps prices come from the store (Guideline 3.1.1).
  if (native) return <Navigate to="/assinatura" />;
  return (
    <div className="space-y-6">
      <PageHeader title="Preços" subtitle="Comece grátis. O Pro libera todas as estratégias, trilhas e o Diário ilimitado." />
      <PricingCards />
      <p className="text-xs text-muted-foreground">
        Valores em dólares americanos. Impostos locais podem ser adicionados no checkout. A assinatura renova
        automaticamente até ser cancelada.
      </p>
    </div>
  );
}
