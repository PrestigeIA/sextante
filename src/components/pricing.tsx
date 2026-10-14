import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { FREE_FEATURES, PRO_FEATURES, PRO_PRICES, TRIAL_DAYS } from "@/lib/billing/plans";
import { Panel, Tag, btnPrimary, btnSecondary } from "@/components/kit";
import { num } from "@/lib/format";

/** Web price list (never shown inside the native apps — stores show their own). */
export function PricingCards() {
  const monthlyEquivalent = PRO_PRICES.annual.price / 12;
  const saving = 1 - PRO_PRICES.annual.price / (PRO_PRICES.monthly.price * 12);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Panel className="flex flex-col p-6">
        <h3 className="text-xl font-semibold">Grátis</h3>
        <p className="num mt-2 text-3xl font-semibold">$0</p>
        <p className="text-sm text-muted-foreground">Para aprender o essencial.</p>
        <ul className="mt-5 flex-1 space-y-2.5">
          {FREE_FEATURES.map((f) => (
            <li key={f} className="flex gap-2.5 text-sm">
              <Check className="mt-0.5 size-4 shrink-0 text-gain" aria-hidden="true" />
              {f}
            </li>
          ))}
        </ul>
        <Link to="/login" search={{ modo: "criar" }} className={`${btnSecondary} mt-6`}>
          Criar conta grátis
        </Link>
      </Panel>
      <Panel className="flex flex-col border-brass-border p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Pro</h3>
          <Tag>{TRIAL_DAYS} dias grátis</Tag>
        </div>
        <p className="mt-2">
          <span className="num text-3xl font-semibold">US$ {num(PRO_PRICES.monthly.price)}</span>
          <span className="text-sm text-muted-foreground"> / mês</span>
        </p>
        <p className="text-sm text-muted-foreground">
          ou US$ {num(PRO_PRICES.annual.price, 0)} / ano (equivale a US$ {num(monthlyEquivalent)} / mês, {Math.round(saving * 100)}%
          a menos).
        </p>
        <ul className="mt-5 flex-1 space-y-2.5">
          {PRO_FEATURES.map((f) => (
            <li key={f} className="flex gap-2.5 text-sm">
              <Check className="mt-0.5 size-4 shrink-0 text-brass" aria-hidden="true" />
              {f}
            </li>
          ))}
        </ul>
        <Link to="/assinatura" className={`${btnPrimary} mt-6`}>
          Começar teste grátis
        </Link>
        <p className="mt-2 text-center text-xs text-muted-foreground">Cancele quando quiser.</p>
      </Panel>
    </div>
  );
}
