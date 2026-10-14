import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Check } from "lucide-react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { openExternalLink } from "@/lib/open-external-link";
import { getSubscriptionStatus, startBillingPortal, startCheckout } from "@/lib/billing/checkout";
import {
  getOfferingPackages,
  hasProEntitlement,
  purchasePackage,
  restorePurchases,
  type RevenueCatPackage,
} from "@/lib/billing/revenuecat";
import { PRO_FEATURES, PRO_PRICES, TRIAL_DAYS } from "@/lib/billing/plans";
import type { SextantePlan } from "@/lib/billing/stripe.server";
import { refreshAccess } from "@/lib/use-access";
import { Callout, PageHeader, Panel, Tag, btnPrimary, btnSecondary } from "@/components/kit";
import { num } from "@/lib/format";
import { cn } from "@/lib/utils";

type Search = { success?: 1; canceled?: 1 };

export const Route = createFileRoute("/assinatura")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    success: s.success === 1 || s.success === "1" ? 1 : undefined,
    canceled: s.canceled === 1 || s.canceled === "1" ? 1 : undefined,
  }),
  head: () => ({ meta: [{ title: "Sextante Pro" }] }),
  component: AssinaturaPage,
});

type Sub = Awaited<ReturnType<typeof getSubscriptionStatus>> | null;

const STATUS_TEXT: Record<string, string> = {
  active: "Assinatura Pro ativa.",
  trialing: "Você está no período de teste grátis do Pro.",
  past_due: "Pagamento pendente: atualize o cartão para manter o Pro.",
  canceled: "Assinatura cancelada. Você está no plano grátis.",
};

function AssinaturaPage() {
  const search = Route.useSearch();
  const { user, isPending } = useCurrentUserState();
  const [sub, setSub] = useState<Sub | undefined>(undefined);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isNative, setIsNative] = useState(false);
  const [packages, setPackages] = useState<RevenueCatPackage[] | null>(null);
  const [nativeEntitled, setNativeEntitled] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    void getSubscriptionStatus()
      .then(setSub)
      .catch(() => setSub(null));
    if (search.success) void refreshAccess(user.id);
  }, [user, search.success]);

  // Native apps must sell through the store (App Store Guideline 3.1.1 /
  // Google Play billing policy). Checked in an effect so SSR markup matches.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    setIsNative(true);
    getOfferingPackages()
      .then(setPackages)
      .catch((err) => {
        console.error("[revenuecat] getOfferingPackages failed:", err);
        setPackages([]);
      });
    hasProEntitlement()
      .then(setNativeEntitled)
      .catch(() => undefined);
  }, []);

  async function act(key: string, fn: () => Promise<void>) {
    setError(null);
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      const cancelled = typeof err === "object" && err !== null && "userCancelled" in err && (err as { userCancelled?: boolean }).userCancelled;
      if (!cancelled) setError(err instanceof Error && err.message ? traduzir(err.message) : "Algo deu errado. Tente novamente.");
    } finally {
      setBusy(null);
    }
  }

  if (isPending) return null;

  const hasSub = sub && sub.status !== "canceled";
  const nativePro = isNative && nativeEntitled;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Sextante Pro" subtitle="Tudo o que você precisa para estudar, simular e medir opções com método." />

      {search.success ? (
        <Callout tone="tip">Pagamento recebido. O Pro é ativado assim que a confirmação chega, em geral em segundos.</Callout>
      ) : null}
      {search.canceled ? <Callout tone="info">Checkout cancelado. Nada foi cobrado.</Callout> : null}

      <Panel>
        <h2 className="text-[15px] font-semibold">O que o Pro libera</h2>
        <ul className="mt-3 space-y-2.5">
          {PRO_FEATURES.map((f) => (
            <li key={f} className="flex gap-2.5 text-sm">
              <Check className="mt-0.5 size-4 shrink-0 text-brass" aria-hidden="true" />
              {f}
            </li>
          ))}
        </ul>
      </Panel>

      {!user ? (
        <Panel className="space-y-3">
          <p className="text-sm text-muted-foreground">Crie uma conta grátis para assinar e guardar seu progresso.</p>
          <Link to="/login" search={{ modo: "criar" }} className={btnPrimary}>
            Criar conta grátis
          </Link>
        </Panel>
      ) : isNative ? (
        nativePro ? (
          <Panel className="space-y-3">
            <p className="text-sm font-semibold text-gain">Seu Pro está ativo.</p>
            <button
              type="button"
              className={btnSecondary}
              onClick={() =>
                void openExternalLink(
                  Capacitor.getPlatform() === "android"
                    ? "https://play.google.com/store/account/subscriptions"
                    : "itms-apps://apps.apple.com/account/subscriptions",
                )
              }
            >
              Gerenciar assinatura
            </button>
          </Panel>
        ) : (
          <div className="space-y-3">
            {packages === null ? (
              <p className="text-sm text-muted-foreground">Carregando planos…</p>
            ) : packages.length === 0 ? (
              <Callout tone="warn">Não foi possível carregar os planos agora. Tente novamente em alguns minutos.</Callout>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {packages.map((pkg) => (
                  <Panel key={pkg.identifier} className="space-y-3">
                    <h3 className="text-lg font-semibold">{pkg.product.title}</h3>
                    <p className="num text-2xl font-semibold">{pkg.product.priceString}</p>
                    <button
                      type="button"
                      disabled={busy === pkg.identifier}
                      onClick={() =>
                        void act(pkg.identifier, async () => {
                          const ok = await purchasePackage(pkg);
                          setNativeEntitled(ok);
                          if (ok) await refreshAccess(user.id);
                        })
                      }
                      className={cn(btnPrimary, "w-full")}
                    >
                      Assinar
                    </button>
                  </Panel>
                ))}
              </div>
            )}
            <button
              type="button"
              disabled={busy === "restore"}
              onClick={() =>
                void act("restore", async () => {
                  const ok = await restorePurchases();
                  setNativeEntitled(ok);
                  if (ok) await refreshAccess(user.id);
                })
              }
              className="h-11 text-sm font-semibold text-muted-foreground underline-offset-4 hover:underline"
            >
              Restaurar compra
            </button>
            <p className="text-xs text-muted-foreground">
              A assinatura é cobrada pela loja e renova automaticamente até ser cancelada nas configurações da sua conta
              da loja. Ao assinar você concorda com os <Link to="/termos" className="underline">Termos de Uso</Link> e a{" "}
              <Link to="/privacidade" className="underline">Política de Privacidade</Link>.
            </p>
          </div>
        )
      ) : sub === undefined ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : hasSub ? (
        <Panel className="space-y-3">
          <div className="flex items-center gap-2">
            <Tag tone={sub.status === "past_due" ? "warn" : "gain"}>{sub.plan === "annual" ? "anual" : "mensal"}</Tag>
            <p className="text-sm font-semibold">{STATUS_TEXT[sub.status]}</p>
          </div>
          {sub.current_period_end ? (
            <p className="text-xs text-muted-foreground">
              Próxima renovação: {new Date(sub.current_period_end).toLocaleDateString("pt-BR")}
            </p>
          ) : null}
          <button
            type="button"
            disabled={busy === "portal"}
            onClick={() =>
              void act("portal", async () => {
                const { url } = await startBillingPortal();
                await openExternalLink(url);
              })
            }
            className={btnSecondary}
          >
            Gerenciar ou cancelar
          </button>
        </Panel>
      ) : (
        <div className="space-y-3">
          {sub?.status === "canceled" ? <Callout tone="info">{STATUS_TEXT.canceled}</Callout> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {(["monthly", "annual"] as SextantePlan[]).map((plan) => {
              const p = PRO_PRICES[plan];
              return (
                <Panel key={plan} className={cn("space-y-3", plan === "annual" && "border-brass-border")}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{p.label}</h3>
                    {plan === "annual" ? <Tag>melhor preço</Tag> : null}
                  </div>
                  <p>
                    <span className="num text-2xl font-semibold">US$ {num(p.price, p.price % 1 ? 2 : 0)}</span>
                    <span className="text-sm text-muted-foreground"> / {p.period}</span>
                  </p>
                  <button
                    type="button"
                    disabled={busy === plan}
                    onClick={() =>
                      void act(plan, async () => {
                        const { url } = await startCheckout({ data: { plan } });
                        await openExternalLink(url);
                      })
                    }
                    className={cn(plan === "annual" ? btnPrimary : btnSecondary, "w-full")}
                  >
                    {busy === plan ? "Abrindo…" : `Testar ${TRIAL_DAYS} dias grátis`}
                  </button>
                </Panel>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {TRIAL_DAYS} dias grátis no primeiro teste; depois a cobrança é automática no ciclo escolhido até você cancelar.
            Pagamento processado pela Stripe.
          </p>
        </div>
      )}

      {error ? (
        <p role="alert" className="text-sm text-loss">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function traduzir(message: string): string {
  if (message.includes("not configured") || message.includes("STRIPE_PRICE")) {
    return "Os pagamentos ainda não estão ativos neste ambiente.";
  }
  if (message === "Unauthorized") return "Entre na sua conta para continuar.";
  return "Algo deu errado. Tente novamente.";
}
