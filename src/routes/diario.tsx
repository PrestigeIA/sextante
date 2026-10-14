import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Plus, Trash2, X } from "lucide-react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useAccess } from "@/lib/use-access";
import { FREE_LIMITS } from "@/lib/access";
import { createTrade, deleteTrade, listTrades, updateTrade, type TradeInput } from "@/lib/journal/trades";
import {
  VALIDATION_SAMPLE,
  realizedNet,
  sampleVerdict,
  summarize,
  unrealized,
  type Trade,
} from "@/lib/journal/metrics";
import { STRATEGIES, UNDERLYINGS } from "@/lib/options/strategies";
import {
  Callout,
  EmptyState,
  PageHeader,
  Panel,
  PanelTitle,
  Stat,
  Tag,
  btnPrimary,
  btnSecondary,
  fieldClass,
} from "@/components/kit";
import { num, pct, pnlColor, shortDate, todayIso, usd } from "@/lib/format";
import { cn } from "@/lib/utils";

type Search = {
  novo?: 1;
  estrategia?: string;
  ativo?: string;
  pernas?: string;
  direcao?: "credit" | "debit";
  preco?: number;
  risco?: number;
  contratos?: number;
  dias?: number;
};

function str(v: unknown, max = 60): string | undefined {
  return typeof v === "string" && v.length <= max ? v : undefined;
}
function n(v: unknown): number | undefined {
  const x = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(x) && x >= 0 ? x : undefined;
}

export const Route = createFileRoute("/diario")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    novo: s.novo === 1 || s.novo === "1" ? 1 : undefined,
    estrategia: str(s.estrategia),
    ativo: str(s.ativo, 12),
    pernas: str(s.pernas, 120),
    direcao: s.direcao === "credit" || s.direcao === "debit" ? s.direcao : undefined,
    preco: n(s.preco),
    risco: n(s.risco),
    contratos: n(s.contratos),
    dias: n(s.dias),
  }),
  head: () => ({ meta: [{ title: "Diário de trades — Sextante" }] }),
  component: DiarioPage,
});

type AccountFilter = "all" | "paper" | "real";
type StatusFilter = "all" | "open" | "closed";

function DiarioPage() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return null;
  if (!user) {
    return (
      <div className="space-y-4">
        <PageHeader title="Diário" subtitle="Registre operações simuladas ou reais e meça o resultado líquido de verdade." />
        <EmptyState
          title="Entre para usar o Diário"
          body="O Diário guarda suas operações na sua conta, calcula o resultado depois dos custos e diz quando a amostra já é suficiente para tirar conclusões."
          action={
            <Link to="/login" search={{ modo: "criar" }} className={btnPrimary}>
              Criar conta grátis
            </Link>
          }
        />
      </div>
    );
  }
  return <Journal />;
}

function Journal() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { pro, signedIn } = useAccess();
  const [trades, setTrades] = useState<Trade[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(Boolean(search.novo));
  const [account, setAccount] = useState<AccountFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");

  const load = useCallback(async () => {
    try {
      setTrades(await listTrades());
      setError(null);
    } catch {
      setError("Não foi possível carregar o Diário. Verifique a conexão e tente de novo.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const scoped = useMemo(
    () => (trades ?? []).filter((t) => account === "all" || t.account === account),
    [trades, account],
  );
  const summary = useMemo(() => summarize(scoped), [scoped]);
  const verdict = sampleVerdict(summary);
  const visible = scoped.filter((t) => status === "all" || t.status === status);
  const atFreeLimit = !pro && (trades?.length ?? 0) >= FREE_LIMITS.trades;
  const closedRecent = scoped
    .filter((t) => t.status === "closed")
    .sort((a, b) => ((a.closedAt ?? "") < (b.closedAt ?? "") ? -1 : 1))
    .slice(-16);

  function closeForm() {
    setFormOpen(false);
    if (search.novo) void navigate({ to: "/diario", search: {}, replace: true });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Diário"
        subtitle="Operações simuladas (paper) e reais, medidas depois dos custos."
        aside={
          !formOpen ? (
            <button type="button" onClick={() => setFormOpen(true)} className={cn(btnPrimary, "h-11 px-4 text-sm")}>
              <Plus className="size-4" aria-hidden="true" /> Registrar
            </button>
          ) : null
        }
      />

      {formOpen ? (
        atFreeLimit ? (
          <Panel className="border-brass-border">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <h2 className="text-[15px] font-semibold">Limite do plano grátis</h2>
                <p className="text-sm text-muted-foreground">
                  O plano grátis guarda até {FREE_LIMITS.trades} operações. No Pro o Diário é ilimitado, e você chega à
                  amostra de {VALIDATION_SAMPLE} operações necessária para avaliar uma estratégia.
                </p>
                <Link to={signedIn ? "/assinatura" : "/login"} className={cn(btnPrimary, "h-11 text-sm")}>
                  Ver planos
                </Link>
              </div>
              <button type="button" aria-label="Fechar" onClick={closeForm} className="grid size-11 place-items-center text-muted-foreground">
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
          </Panel>
        ) : (
          <TradeForm
            initial={search}
            onCancel={closeForm}
            onSaved={() => {
              closeForm();
              void load();
            }}
          />
        )
      ) : null}

      <div role="group" aria-label="Conta" className="flex gap-2">
        {(
          [
            ["all", "Todas"],
            ["paper", "Paper"],
            ["real", "Real"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={account === id}
            onClick={() => setAccount(id)}
            className={cn(
              "h-11 rounded-full border px-4 text-[13px] font-semibold",
              account === id ? "border-primary bg-brass-bg text-brass" : "border-border text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? <Callout tone="warn">{error}</Callout> : null}

      {trades === null && !error ? (
        <Panel>
          <p className="text-sm text-muted-foreground">Carregando…</p>
        </Panel>
      ) : trades && trades.length === 0 ? (
        <EmptyState
          title="Nenhuma operação ainda"
          body="Monte uma operação no simulador e toque em Registrar no Diário, ou registre direto aqui. Comece no modo paper: o objetivo é medir antes de arriscar dinheiro."
          action={
            <div className="flex flex-wrap gap-2">
              <Link to="/simulador" className={cn(btnSecondary, "h-11")}>
                Abrir o simulador
              </Link>
              <button type="button" onClick={() => setFormOpen(true)} className={cn(btnPrimary, "h-11 text-sm")}>
                Registrar operação
              </button>
            </div>
          }
        />
      ) : trades ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <Panel>
              <PanelTitle aside={<Tag tone={account === "real" ? "warn" : "info"}>{account === "all" ? "Todas" : account}</Tag>}>
                Resultado líquido
              </PanelTitle>
              <div className={cn("num text-[32px] font-semibold leading-none", pnlColor(summary.netResult))}>
                {usd(summary.netResult, { sign: true })}
              </div>
              <dl className="mt-4 space-y-1.5 border-t border-border pt-3 text-[13px]">
                <Row label="Realizado (bruto)" value={usd(summary.realizedGross, { sign: true })} className={pnlColor(summary.realizedGross)} />
                <Row label="Não realizado" value={usd(summary.unrealized, { sign: true })} className={pnlColor(summary.unrealized)} />
                <Row label="Taxas e custos" value={usd(-summary.fees, { sign: true })} className={summary.fees ? "text-loss" : ""} />
                <Row label="Imposto estimado" value="valide com seu contador" className="text-muted-foreground" />
              </dl>
            </Panel>

            {closedRecent.length > 0 ? (
              <Panel>
                <PanelTitle aside={<span className="text-xs text-muted-foreground">líquido, $</span>}>
                  Últimas operações encerradas
                </PanelTitle>
                <BarChart values={closedRecent.map((t) => realizedNet(t) ?? 0)} />
              </Panel>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <Box>
                <Stat
                  label="Taxa de acerto"
                  value={summary.winRate === null ? "—" : pct(summary.winRate * 100)}
                  hint={`${summary.wins} ganhos · ${summary.losses} perdas`}
                />
              </Box>
              <Box>
                <Stat
                  label="Profit factor"
                  value={
                    summary.profitFactor === null
                      ? "—"
                      : Number.isFinite(summary.profitFactor)
                        ? num(summary.profitFactor)
                        : "∞"
                  }
                  hint="ganhos ÷ perdas"
                />
              </Box>
              <Box>
                <Stat
                  label="Ganho médio / perda média"
                  value={`${summary.avgWin === null ? "—" : `+${num(summary.avgWin, 0)}`} / ${summary.avgLoss === null ? "—" : `−${num(summary.avgLoss, 0)}`}`}
                />
              </Box>
              <Box>
                <Stat
                  label="Média por operação"
                  value={summary.expectancy === null ? "—" : usd(summary.expectancy, { sign: true })}
                  tone={summary.expectancy === null ? undefined : summary.expectancy >= 0 ? "gain" : "loss"}
                />
              </Box>
              <Box>
                <Stat label="Drawdown máximo" value={usd(-summary.maxDrawdown, { sign: true })} tone={summary.maxDrawdown ? "loss" : undefined} />
              </Box>
              <Box>
                <Stat
                  label="Seguiu o plano"
                  value={summary.followedPlanRate === null ? "—" : pct(summary.followedPlanRate * 100, 0)}
                  hint="das operações"
                />
              </Box>
            </div>

            <Panel>
              <div className="flex items-center justify-between">
                <h2 className="text-[13px] font-semibold">Amostra para validação</h2>
                <span className="num text-[13px] text-muted-foreground">
                  {summary.closedCount} / {VALIDATION_SAMPLE}
                </span>
              </div>
              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-border"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={VALIDATION_SAMPLE}
                aria-valuenow={summary.closedCount}
                aria-label="Operações encerradas"
              >
                <div className="h-2 rounded-full bg-info" style={{ width: `${Math.round(summary.sampleProgress * 100)}%` }} />
              </div>
              <p
                className={cn(
                  "mt-3 text-[13px] leading-relaxed",
                  verdict.tone === "good" ? "text-gain" : verdict.tone === "bad" ? "text-warn" : "text-[#c3cad6]",
                )}
              >
                {verdict.text}
              </p>
            </Panel>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">Operações</h2>
              <div role="group" aria-label="Filtrar" className="flex gap-0.5 rounded-xl border border-border bg-card p-0.5">
                {(
                  [
                    ["all", "Todas"],
                    ["open", "Abertas"],
                    ["closed", "Encerradas"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={status === id}
                    onClick={() => setStatus(id)}
                    className={cn(
                      "h-10 rounded-lg px-3 text-xs font-semibold",
                      status === id ? "bg-brass-bg text-brass" : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {visible.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma operação neste filtro.</p>
            ) : (
              <ul className="space-y-2">
                {visible.map((t) => (
                  <TradeRow key={t.id} trade={t} onChanged={() => void load()} />
                ))}
              </ul>
            )}
            {!pro ? (
              <p className="text-xs text-muted-foreground">
                Plano grátis: {Math.min(trades.length, FREE_LIMITS.trades)} de {FREE_LIMITS.trades} operações usadas.{" "}
                <Link to="/assinatura" className="font-semibold text-brass underline-offset-2 hover:underline">
                  Diário ilimitado no Pro
                </Link>
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[#a9b2c1]">{label}</dt>
      <dd className={cn("num", className)}>{value}</dd>
    </div>
  );
}

function Box({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-border bg-card px-3 py-3">{children}</div>;
}

function BarChart({ values }: { values: number[] }) {
  const W = 640;
  const H = 150;
  const max = Math.max(1, ...values.map((v) => Math.abs(v)));
  const zero = H / 2;
  const slot = W / Math.max(values.length, 8);
  const bw = Math.min(30, slot * 0.6);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`Resultado de ${values.length} operações encerradas`}>
      <line x1="0" x2={W} y1={zero} y2={zero} stroke="#3a4354" />
      {values.map((v, i) => {
        const h = Math.max(2, (Math.abs(v) / max) * (H / 2 - 18));
        const x = i * slot + (slot - bw) / 2;
        const up = v >= 0;
        return (
          <g key={i}>
            <rect x={x} y={up ? zero - h : zero} width={bw} height={h} rx="4" fill={up ? "#3ddc97" : "#ff7a7a"} />
            <text
              x={x + bw / 2}
              y={up ? zero - h - 4 : zero + h + 12}
              fill={up ? "#3ddc97" : "#ff7a7a"}
              fontSize="11"
              textAnchor="middle"
              fontFamily="Geist Mono, monospace"
            >
              {(up ? "+" : "−") + Math.round(Math.abs(v))}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function TradeForm({ initial, onCancel, onSaved }: { initial: Search; onCancel: () => void; onSaved: () => void }) {
  const today = todayIso();
  const [form, setForm] = useState({
    account: "paper" as "paper" | "real",
    strategy: initial.estrategia ?? "Put Credit Spread",
    underlying: initial.ativo ?? "XSP",
    legsText: initial.pernas ?? "",
    direction: initial.direcao ?? ("credit" as "credit" | "debit"),
    contracts: String(initial.contratos ?? 1),
    entryPrice: initial.preco !== undefined ? String(initial.preco) : "",
    maxRisk: initial.risco !== undefined ? String(initial.risco) : "",
    fees: "0",
    openedAt: today,
    expiresAt: initial.dias !== undefined ? addDays(today, Math.round(initial.dias)) : "",
    followedPlan: true,
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload: TradeInput = {
      account: form.account,
      strategy: form.strategy,
      underlying: form.underlying,
      legsText: form.legsText,
      direction: form.direction,
      contracts: Number(form.contracts),
      entryPrice: Number(form.entryPrice),
      maxRisk: Number(form.maxRisk),
      fees: Number(form.fees || 0),
      openedAt: form.openedAt,
      expiresAt: form.expiresAt || null,
      followedPlan: form.followedPlan,
      notes: form.notes,
    };
    if (!payload.entryPrice && payload.entryPrice !== 0) return setError("Informe o preço de entrada.");
    if (!Number.isInteger(payload.contracts) || payload.contracts < 1) return setError("Contratos deve ser um número inteiro.");
    setBusy(true);
    try {
      await createTrade({ data: payload });
      toast.success("Operação registrada");
      onSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(msg.includes("FREE_LIMIT_TRADES") ? `O plano grátis guarda até ${FREE_LIMITS.trades} operações.` : "Confira os campos e tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel as="div">
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Nova operação</h2>
          <button type="button" aria-label="Fechar" onClick={onCancel} className="grid size-11 place-items-center text-muted-foreground">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div role="group" aria-label="Tipo de conta" className="grid grid-cols-2 gap-2">
          {(["paper", "real"] as const).map((acc) => (
            <button
              key={acc}
              type="button"
              aria-pressed={form.account === acc}
              onClick={() => set("account", acc)}
              className={cn(
                "h-11 rounded-xl border text-sm font-semibold",
                form.account === acc ? "border-primary bg-brass-bg text-brass" : "border-border text-muted-foreground",
              )}
            >
              {acc === "paper" ? "Paper (simulada)" : "Real"}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Estratégia">
            <input list="strategies" className={fieldClass} value={form.strategy} onChange={(e) => set("strategy", e.target.value)} required maxLength={60} />
            <datalist id="strategies">
              {STRATEGIES.map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>
          </Field>
          <Field label="Ativo">
            <input list="underlyings" className={cn(fieldClass, "uppercase")} value={form.underlying} onChange={(e) => set("underlying", e.target.value)} required maxLength={12} />
            <datalist id="underlyings">
              {UNDERLYINGS.filter((u) => u.symbol !== "AÇÃO").map((u) => (
                <option key={u.symbol} value={u.symbol} />
              ))}
            </datalist>
          </Field>
          <Field label="Pernas (opcional)" hint="Ex.: −660P +655P">
            <input className={cn(fieldClass, "num")} value={form.legsText} onChange={(e) => set("legsText", e.target.value)} maxLength={120} />
          </Field>
          <Field label="Entrada">
            <select className={fieldClass} value={form.direction} onChange={(e) => set("direction", e.target.value as "credit" | "debit")}>
              <option value="credit">Crédito (recebi)</option>
              <option value="debit">Débito (paguei)</option>
            </select>
          </Field>
          <Field label="Preço de entrada por ação ($)" hint="Ex.: 0,80 = $80 por contrato">
            <input type="number" inputMode="decimal" step="0.01" min="0" className={cn(fieldClass, "num")} value={form.entryPrice} onChange={(e) => set("entryPrice", e.target.value)} required />
          </Field>
          <Field label="Contratos">
            <input type="number" inputMode="numeric" step="1" min="1" className={cn(fieldClass, "num")} value={form.contracts} onChange={(e) => set("contracts", e.target.value)} required />
          </Field>
          <Field label="Risco máximo da operação ($)" hint="A perda máxima possível">
            <input type="number" inputMode="decimal" step="1" min="0" className={cn(fieldClass, "num")} value={form.maxRisk} onChange={(e) => set("maxRisk", e.target.value)} required />
          </Field>
          <Field label="Taxas na abertura ($)">
            <input type="number" inputMode="decimal" step="0.01" min="0" className={cn(fieldClass, "num")} value={form.fees} onChange={(e) => set("fees", e.target.value)} />
          </Field>
          <Field label="Data de abertura">
            <input type="date" className={fieldClass} value={form.openedAt} onChange={(e) => set("openedAt", e.target.value)} required />
          </Field>
          <Field label="Vencimento">
            <input type="date" className={fieldClass} value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} />
          </Field>
        </div>
        <Field label="Observações (opcional)">
          <textarea className={cn(fieldClass, "h-20 py-2")} value={form.notes} onChange={(e) => set("notes", e.target.value)} maxLength={2000} />
        </Field>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" className="size-5 accent-[#e2b355]" checked={form.followedPlan} onChange={(e) => set("followedPlan", e.target.checked)} />
          A entrada seguiu as regras do meu plano
        </label>
        {error ? (
          <p role="alert" className="text-sm text-loss">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={busy} className={btnPrimary}>
            {busy ? "Salvando…" : "Salvar operação"}
          </button>
          <button type="button" onClick={onCancel} className={btnSecondary}>
            Cancelar
          </button>
        </div>
      </form>
    </Panel>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[13px]">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

function TradeRow({ trade: t, onChanged }: { trade: Trade; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"none" | "close" | "mark">("none");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(todayIso());
  const [extraFees, setExtraFees] = useState("0");
  const [followed, setFollowed] = useState(t.followedPlan);
  const [busy, setBusy] = useState(false);

  const value = t.status === "closed" ? realizedNet(t) : unrealized(t);
  const label = t.status === "closed" ? "líquido" : t.markPrice === null ? "sem marcação" : "não realizado";

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      setMode("none");
      onChanged();
    } catch {
      toast.error("Não foi possível salvar. Confira os valores.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-[14px] border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold">{t.strategy}</span>
            <Tag tone={t.status === "open" ? "info" : "muted"}>{t.status === "open" ? "aberta" : "encerrada"}</Tag>
            {t.account === "real" ? <Tag tone="warn">real</Tag> : null}
          </div>
          <span className="num mt-0.5 block truncate text-xs text-muted-foreground">
            {t.underlying} {t.legsText ? `· ${t.legsText}` : ""} · {t.status === "open" ? `vence ${shortDate(t.expiresAt)}` : shortDate(t.closedAt)}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="text-right">
            <span className={cn("num block text-sm font-semibold", pnlColor(value))}>{value === null ? "—" : usd(value, { sign: true })}</span>
            <span className="block text-[10px] text-muted-foreground">{label}</span>
          </div>
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden="true" />
        </div>
      </button>
      {open ? (
        <div className="space-y-3 border-t border-border px-3.5 py-3 text-[13px]">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <Row label={t.direction === "credit" ? "Crédito" : "Débito"} value={`$${num(t.entryPrice)} × ${t.contracts}`} />
            <Row label="Risco máx." value={usd(t.maxRisk, { decimals: 0 })} />
            <Row label="Aberta em" value={shortDate(t.openedAt)} />
            <Row label="Taxas" value={usd(t.fees)} />
            {t.exitPrice !== null ? <Row label="Saída" value={`$${num(t.exitPrice)}`} /> : null}
            {t.markPrice !== null ? <Row label="Marcação" value={`$${num(t.markPrice)}`} /> : null}
            <Row label="Seguiu o plano" value={t.followedPlan ? "sim" : "não"} />
          </dl>
          {t.notes ? <p className="text-muted-foreground">{t.notes}</p> : null}

          {mode === "none" ? (
            <div className="flex flex-wrap gap-2">
              {t.status === "open" ? (
                <>
                  <button type="button" className={cn(btnPrimary, "h-10 px-3 text-[13px]")} onClick={() => { setPrice(""); setMode("close"); }}>
                    Encerrar
                  </button>
                  <button type="button" className={cn(btnSecondary, "h-10 px-3 text-[13px]")} onClick={() => { setPrice(t.markPrice === null ? "" : String(t.markPrice)); setMode("mark"); }}>
                    Atualizar marcação
                  </button>
                </>
              ) : (
                <button type="button" disabled={busy} className={cn(btnSecondary, "h-10 px-3 text-[13px]")} onClick={() => void run(() => updateTrade({ data: { action: "reopen", id: t.id } }), "Operação reaberta")}>
                  Reabrir
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold text-loss"
                onClick={() => {
                  if (window.confirm("Excluir esta operação do Diário?")) void run(() => deleteTrade({ data: { id: t.id } }), "Operação excluída");
                }}
              >
                <Trash2 className="size-4" aria-hidden="true" /> Excluir
              </button>
            </div>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const p = Number(price);
                if (!Number.isFinite(p) || p < 0 || price === "") return;
                if (mode === "mark") {
                  void run(() => updateTrade({ data: { action: "mark", id: t.id, markPrice: p } }), "Marcação atualizada");
                } else {
                  void run(
                    () =>
                      updateTrade({
                        data: { action: "close", id: t.id, exitPrice: p, closedAt: date, extraFees: Number(extraFees || 0), followedPlan: followed },
                      }),
                    "Operação encerrada",
                  );
                }
              }}
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label={mode === "mark" ? "Preço atual por ação ($)" : "Preço de saída por ação ($)"} hint={mode === "close" ? "0 se venceu sem valor" : undefined}>
                  <input type="number" inputMode="decimal" step="0.01" min="0" autoFocus className={cn(fieldClass, "num")} value={price} onChange={(e) => setPrice(e.target.value)} required />
                </Field>
                {mode === "close" ? (
                  <>
                    <Field label="Data">
                      <input type="date" className={fieldClass} value={date} onChange={(e) => setDate(e.target.value)} required />
                    </Field>
                    <Field label="Taxas no fechamento ($)">
                      <input type="number" inputMode="decimal" step="0.01" min="0" className={cn(fieldClass, "num")} value={extraFees} onChange={(e) => setExtraFees(e.target.value)} />
                    </Field>
                  </>
                ) : null}
              </div>
              {mode === "close" ? (
                <label className="flex min-h-11 items-center gap-3">
                  <input type="checkbox" className="size-5 accent-[#e2b355]" checked={followed} onChange={(e) => setFollowed(e.target.checked)} />
                  Entrada e saída seguiram o plano (incluindo o stop)
                </label>
              ) : null}
              <div className="flex gap-2">
                <button type="submit" disabled={busy} className={cn(btnPrimary, "h-10 px-4 text-[13px]")}>
                  Salvar
                </button>
                <button type="button" onClick={() => setMode("none")} className={cn(btnSecondary, "h-10 px-4 text-[13px]")}>
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      ) : null}
    </li>
  );
}
