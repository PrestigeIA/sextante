import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Lock, RotateCcw, Save, NotebookPen, Minus, Plus } from "lucide-react";
import { analyze, DEFAULT_COSTS, fairPremium, payoffCurve, type Market } from "@/lib/options/engine";
import {
  STRATEGIES,
  UNDERLYINGS,
  buildLegs,
  defaultInputs,
  isStrategyId,
  roundStrike,
  strategyMeta,
  type StrategyId,
  type StrategyInputs,
} from "@/lib/options/strategies";
import { PayoffChart } from "@/components/payoff-chart";
import { Callout, Panel, PanelTitle, ProLock, Stat, Tag, btnPrimary, btnSecondary, fieldClass } from "@/components/kit";
import { useAccess } from "@/lib/use-access";
import { saveSimulation } from "@/lib/simulations";
import { num, pct, usd } from "@/lib/format";
import { cn } from "@/lib/utils";

type Search = { estrategia?: StrategyId };

export const Route = createFileRoute("/simulador")({
  validateSearch: (s: Record<string, unknown>): Search =>
    typeof s.estrategia === "string" && isStrategyId(s.estrategia) ? { estrategia: s.estrategia } : {},
  head: () => ({ meta: [{ title: "Simulador de opções — Sextante" }] }),
  component: SimuladorPage,
});

const DEFAULT_SPOT = 670;

function SimuladorPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { signedIn, pro } = useAccess();

  const [strategy, setStrategy] = useState<StrategyId>(search.estrategia ?? "put_credit_spread");
  const [underlying, setUnderlying] = useState("XSP");
  const [spot, setSpot] = useState(DEFAULT_SPOT);
  const [ivPct, setIvPct] = useState(16);
  const [forecastPct, setForecastPct] = useState(16);
  const [days, setDays] = useState(38);
  const [inputs, setInputs] = useState<StrategyInputs>(() =>
    defaultInputs(search.estrategia ?? "put_credit_spread", DEFAULT_SPOT),
  );
  const [commission, setCommission] = useState(DEFAULT_COSTS.commissionPerContract);
  const [slippage, setSlippage] = useState(DEFAULT_COSTS.slippagePerContract);
  const [roundTrip, setRoundTrip] = useState(true);
  const [lockedPick, setLockedPick] = useState<StrategyId | null>(null);
  const [saving, setSaving] = useState(false);

  const meta = strategyMeta(strategy);
  const und = UNDERLYINGS.find((u) => u.symbol === underlying) ?? UNDERLYINGS[0];

  const market: Market = useMemo(
    () => ({ spot, ivMarket: ivPct / 100, volForecast: forecastPct / 100, days, rate: 0 }),
    [spot, ivPct, forecastPct, days],
  );
  const legs = useMemo(() => buildLegs(strategy, inputs, market), [strategy, inputs, market]);
  const a = useMemo(
    () => analyze(legs, market, { commissionPerContract: commission, slippagePerContract: slippage, roundTrip }),
    [legs, market, commission, slippage, roundTrip],
  );

  const strikes = legs.flatMap((l) => (l.kind === "option" ? [l.strike] : []));
  const lo = Math.min(spot - a.expectedMove * 2.2, ...strikes) * 0.995;
  const hi = Math.max(spot + a.expectedMove * 2.2, ...strikes) * 1.005;
  const curve = useMemo(() => payoffCurve(legs, Math.max(lo, 0.01), hi), [legs, lo, hi]);

  const credit = a.openingCashFlow >= 0;
  const evPositive = a.expectedValueNet > 0;
  const legsText = legs
    .map((l) => (l.kind === "option" ? `${l.side > 0 ? "+" : "−"}${num(l.strike, l.strike % 1 ? 1 : 0)}${l.type === "call" ? "C" : "P"}` : `+${l.qty} ações`))
    .join(" ");

  function pickStrategy(id: StrategyId) {
    const m = strategyMeta(id);
    if (!m.free && !pro) {
      setLockedPick(id);
      return;
    }
    setLockedPick(null);
    setStrategy(id);
    setInputs(defaultInputs(id, spot));
    void navigate({ to: "/simulador", search: { estrategia: id }, replace: true });
  }

  function changeSpot(v: number) {
    if (!Number.isFinite(v) || v <= 0) return;
    setSpot(v);
    setInputs((prev) => ({ ...defaultInputs(strategy, v), contracts: prev.contracts }));
  }

  function setPremium(label: string, value: number | null) {
    setInputs((prev) => {
      const premiums = { ...prev.premiums };
      if (value === null || !Number.isFinite(value)) delete premiums[label];
      else premiums[label] = Math.max(0, value);
      return { ...prev, premiums };
    });
  }

  async function onSave() {
    if (!signedIn) {
      void navigate({ to: "/login", search: { modo: "criar" } });
      return;
    }
    setSaving(true);
    try {
      await saveSimulation({
        data: {
          name: `${meta.name} · ${underlying} ${legsText}`,
          payload: {
            strategy,
            underlying,
            spot,
            ivMarket: market.ivMarket,
            volForecast: market.volForecast,
            days,
            strike: inputs.strike,
            width: inputs.width,
            callStrike: inputs.callStrike,
            contracts: inputs.contracts,
            premiums: inputs.premiums as Record<string, number>,
            snapshot: {
              openingCashFlow: a.openingCashFlow,
              maxProfit: a.maxProfit.unbounded ? null : a.maxProfit.value,
              maxLoss: a.maxLoss.unbounded ? null : a.maxLoss.value,
              probProfit: a.probProfit,
              expectedValueNet: a.expectedValueNet,
              legsText,
            },
          },
        },
      });
      toast.success("Simulação salva");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("FREE_LIMIT_SIMULATIONS")) {
        toast.error("O plano grátis guarda até 3 simulações. Apague uma ou seja Pro.");
      } else {
        toast.error("Não foi possível salvar agora.");
      }
    } finally {
      setSaving(false);
    }
  }

  function onRegister() {
    const perShare = Math.abs(a.openingCashFlow) / (100 * Math.max(inputs.contracts, 1));
    void navigate({
      to: "/diario",
      search: {
        novo: 1,
        estrategia: meta.name,
        ativo: underlying,
        pernas: legsText,
        direcao: credit ? "credit" : "debit",
        preco: Math.round(perShare * 100) / 100,
        risco: a.capitalRequired === null ? undefined : Math.round(a.capitalRequired),
        contratos: inputs.contracts,
        dias: days,
      },
    });
  }

  const strikeMin = roundStrike(spot * 0.8);
  const strikeMax = roundStrike(spot * 1.2);
  const step = spot >= 25 ? 1 : 0.5;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[26px] font-bold leading-tight md:text-3xl">Simulador</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monte a operação e veja lucro, perda, probabilidade e valor esperado depois dos custos.
        </p>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 scrollbar-none md:mx-0 md:px-0">
        <div role="group" aria-label="Estratégia" className="flex w-max gap-2 pb-1">
          {STRATEGIES.map((s) => {
            const active = s.id === strategy;
            const locked = !s.free && !pro;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => pickStrategy(s.id)}
                aria-pressed={active}
                className={cn(
                  "flex h-11 items-center gap-1.5 rounded-full border px-4 text-[13px] font-semibold transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {s.name}
                {locked ? <Lock className="size-3.5" aria-label="Pro" /> : null}
              </button>
            );
          })}
        </div>
      </div>

      {lockedPick ? (
        <ProLock
          signedIn={signedIn}
          title={`${strategyMeta(lockedPick).name} faz parte do Sextante Pro`}
          body={`${strategyMeta(lockedPick).summary} No plano grátis você simula compra de call e put, put credit spread e covered call.`}
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <Panel>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold">{meta.name}</span>
                  <Tag tone="muted">{meta.family}</Tag>
                </div>
                <p className="mt-1 text-[13px] text-muted-foreground">{meta.summary}</p>
              </div>
              <span className="num shrink-0 text-xs text-muted-foreground">{legsText}</span>
            </div>
            <div className="mt-3">
              <PayoffChart points={curve} spot={spot} breakevens={a.breakevens} />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Resultado no vencimento, antes dos custos, para {inputs.contracts}{" "}
              {inputs.contracts === 1 ? "contrato" : "contratos"}.
            </p>
          </Panel>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Tile label={credit ? "Crédito recebido" : "Débito pago"} value={usd(a.openingCashFlow, { sign: true })} tone={credit ? "gain" : "loss"} />
            <Tile
              label="Lucro máximo"
              value={a.maxProfit.unbounded ? "Ilimitado" : usd(a.maxProfit.value, { sign: true })}
              tone="gain"
            />
            <Tile
              label="Perda máxima"
              value={a.maxLoss.unbounded ? "Ilimitada" : usd(-a.maxLoss.value, { sign: true })}
              tone="loss"
            />
            <Tile label="Break-even" value={a.breakevens.length ? a.breakevens.map((b) => num(b)).join(" / ") : "—"} />
            <Tile label="Prob. de lucro" value={pct(a.probProfit * 100)} hint="pela sua volatilidade" />
            <Tile
              label="Acerto p/ empatar"
              value={a.breakevenWinRate === null ? "—" : pct(a.breakevenWinRate * 100)}
              hint="ganho máx. vs perda máx."
            />
            <Tile label="Capital em risco" value={a.capitalRequired === null ? "Ilimitado" : usd(a.capitalRequired, { decimals: 0 })} />
            <Tile
              label="Retorno máx. s/ risco"
              value={a.maxReturnOnCapital === null ? "—" : pct(a.maxReturnOnCapital * 100)}
            />
            <Tile label="Movimento esperado (1σ)" value={`±${usd(a.expectedMove)}`} hint={`até ${days} dias`} />
          </div>

          <section
            aria-label="Valor esperado"
            className={cn(
              "rounded-[18px] border p-4 md:p-5",
              evPositive ? "border-gain-border bg-gain-bg" : "border-warn-border bg-warn-bg",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className={cn("text-sm font-semibold", evPositive ? "text-gain" : "text-warn")}>Valor esperado líquido</h2>
              <span className={cn("num text-2xl font-semibold", evPositive ? "text-gain" : "text-warn")}>
                {usd(a.expectedValueNet, { sign: true })}
              </span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-[#d5dae3]">
              {evPositive
                ? "Pela sua previsão de volatilidade, o preço negociado compensa o risco e os custos. A vantagem só é real se a sua previsão estiver certa: teste no Diário antes de confiar nela."
                : forecastPct === ivPct && Math.abs(a.priceEdge) < 1
                  ? "Com o preço justo e a mesma volatilidade que o mercado, o valor esperado é zero menos os custos. Uma vantagem só aparece se o prêmio negociado for melhor que o justo ou se a sua previsão de volatilidade for diferente da do mercado."
                  : "O prêmio negociado não compensa o risco e os custos. Alta probabilidade de lucro não significa operação boa."}
            </p>
            <dl className="num mt-3 space-y-1 text-xs text-[#a9b2c1]">
              <div className="flex justify-between gap-4">
                <dt>Resultado médio no vencimento (antes dos custos)</dt>
                <dd>{usd(a.expectedValueGross, { sign: true })}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Preço negociado vs preço justo</dt>
                <dd>{usd(a.priceEdge, { sign: true })}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Custos ({roundTrip ? "abertura + fechamento" : "só abertura"})</dt>
                <dd>{usd(-a.costs, { sign: true })}</dd>
              </div>
            </dl>
          </section>

          <Panel>
            <PanelTitle>Gregas da posição (hoje)</PanelTitle>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Delta (ações eq.)" value={`${a.greeks.delta >= 0 ? "+" : "−"}${num(Math.abs(a.greeks.delta), 1)}`} />
              <Stat label="Gamma" value={num(a.greeks.gamma, 2)} />
              <Stat
                label="Theta / dia"
                value={usd(a.greeks.thetaPerDay, { sign: true })}
                tone={a.greeks.thetaPerDay >= 0 ? "gain" : "loss"}
              />
              <Stat
                label="Vega / 1pt IV"
                value={usd(a.greeks.vegaPerPoint, { sign: true })}
                tone={a.greeks.vegaPerPoint >= 0 ? "gain" : "loss"}
              />
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel>
            <PanelTitle>Ativo e mercado</PanelTitle>
            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-[13px]">Ativo</span>
                <select className={fieldClass} value={underlying} onChange={(e) => setUnderlying(e.target.value)}>
                  {UNDERLYINGS.map((u) => (
                    <option key={u.symbol} value={u.symbol}>
                      {u.symbol} — {u.name}
                    </option>
                  ))}
                </select>
                <span className="block text-xs text-muted-foreground">
                  {und.style === "europeia" ? "Europeia" : "Americana"} · liquidação em {und.settlement}
                  {und.section1256 ? " · Sec. 1256 (60/40)" : ""}. {und.note}
                </span>
              </label>
              <NumberField label="Preço atual do ativo" value={spot} onChange={changeSpot} step={1} min={1} prefix="$" hint="Digite a cotação que você vê na corretora." />
              <NumberField label="Dias até o vencimento" value={days} onChange={(v) => setDays(Math.max(0, Math.round(v)))} step={1} min={0} />
              <RangeField
                label="Volatilidade implícita (mercado)"
                value={ivPct}
                min={5}
                max={80}
                step={1}
                display={`${ivPct}%`}
                onChange={(v) => {
                  if (forecastPct === ivPct) setForecastPct(v);
                  setIvPct(v);
                }}
                hint="Define o preço justo dos prêmios."
              />
              <RangeField
                label="Sua previsão de volatilidade"
                value={forecastPct}
                min={5}
                max={80}
                step={1}
                display={`${forecastPct}%`}
                onChange={setForecastPct}
                hint="Define probabilidades e valor esperado. Igual à implícita = sem opinião."
              />
            </div>
          </Panel>

          <Panel>
            <PanelTitle>Estrutura</PanelTitle>
            <div className="space-y-4">
              <RangeField
                label={strategy === "iron_condor" ? "Put vendida (strike)" : credit ? "Strike vendido" : "Strike principal"}
                value={inputs.strike}
                min={strikeMin}
                max={strikeMax}
                step={step}
                display={num(inputs.strike, inputs.strike % 1 ? 1 : 0)}
                onChange={(v) => setInputs((p) => ({ ...p, strike: v, premiums: {} }))}
              />
              {strategy === "iron_condor" ? (
                <RangeField
                  label="Call vendida (strike)"
                  value={inputs.callStrike}
                  min={strikeMin}
                  max={strikeMax}
                  step={step}
                  display={num(inputs.callStrike, inputs.callStrike % 1 ? 1 : 0)}
                  onChange={(v) => setInputs((p) => ({ ...p, callStrike: v, premiums: {} }))}
                />
              ) : null}
              {meta.usesWidth ? (
                <div className="space-y-1.5">
                  <span id="largura" className="text-[13px]">
                    Largura do spread
                  </span>
                  <div role="group" aria-labelledby="largura" className="grid grid-cols-4 gap-1.5">
                    {[1, 2.5, 5, 10].map((w) => (
                      <button
                        key={w}
                        type="button"
                        aria-pressed={inputs.width === w}
                        onClick={() => setInputs((p) => ({ ...p, width: w, premiums: {} }))}
                        className={cn(
                          "num h-11 rounded-xl border text-[13px] font-semibold",
                          inputs.width === w ? "border-primary bg-brass-bg text-brass" : "border-border text-muted-foreground",
                        )}
                      >
                        ${num(w, w % 1 ? 1 : 0)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <NumberField
                label="Contratos"
                value={inputs.contracts}
                min={1}
                step={1}
                onChange={(v) => setInputs((p) => ({ ...p, contracts: Math.max(1, Math.round(v)) }))}
              />
            </div>
          </Panel>

          <Panel>
            <PanelTitle
              aside={
                Object.keys(inputs.premiums).length ? (
                  <button
                    type="button"
                    onClick={() => setInputs((p) => ({ ...p, premiums: {} }))}
                    className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-brass"
                  >
                    <RotateCcw className="size-3.5" aria-hidden="true" /> Usar preço justo
                  </button>
                ) : null
              }
            >
              Prêmios por ação
            </PanelTitle>
            <ul className="space-y-3">
              {legs.map((l) =>
                l.kind === "option" ? (
                  <li key={l.label} className="grid grid-cols-[1fr_auto] items-end gap-3">
                    <div className="min-w-0">
                      <span className="text-[13px] font-medium">
                        {l.label} {num(l.strike, l.strike % 1 ? 1 : 0)}
                      </span>
                      <span className="num block text-[11px] text-muted-foreground">
                        Justo: ${num(fairPremium(l.type, market, l.strike))}
                      </span>
                    </div>
                    <label className="w-28">
                      <span className="sr-only">Prêmio negociado da {l.label}</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.05"
                        min="0"
                        value={inputs.premiums[l.label] ?? l.premium}
                        onChange={(e) => setPremium(l.label, e.target.value === "" ? null : Number(e.target.value))}
                        className={cn(fieldClass, "num text-right", inputs.premiums[l.label] !== undefined && "border-primary")}
                      />
                    </label>
                  </li>
                ) : (
                  <li key={l.label} className="flex justify-between text-[13px]">
                    <span>{l.label} compradas</span>
                    <span className="num text-muted-foreground">${num(l.price)}</span>
                  </li>
                ),
              )}
            </ul>
            <p className="mt-3 text-[11px] text-muted-foreground">
              O simulador preenche o preço justo pelo modelo. Digite o preço real da corretora para ver se ele é bom.
            </p>
          </Panel>

          <details className="group rounded-[18px] border border-border bg-card">
            <summary className="flex h-12 cursor-pointer list-none items-center justify-between px-4 text-[13px] font-medium text-muted-foreground">
              Custos de execução
              <span className="num text-xs">{usd(a.costs)}</span>
            </summary>
            <div className="space-y-4 px-4 pb-4">
              <NumberField label="Comissão por contrato" prefix="$" value={commission} step={0.05} min={0} onChange={setCommission} />
              <NumberField
                label="Slippage por contrato"
                prefix="$"
                value={slippage}
                step={0.5}
                min={0}
                onChange={setSlippage}
                hint="Parte do spread entre compra e venda que você paga em cada execução."
              />
              <label className="flex min-h-11 items-center gap-3 text-[13px]">
                <input type="checkbox" className="size-5 accent-[#e2b355]" checked={roundTrip} onChange={(e) => setRoundTrip(e.target.checked)} />
                Contar abertura e fechamento
              </label>
            </div>
          </details>

          <div className="grid gap-2">
            <button type="button" onClick={onRegister} className={btnPrimary}>
              <NotebookPen className="size-4" aria-hidden="true" /> Registrar no Diário
            </button>
            <button type="button" onClick={() => void onSave()} disabled={saving} className={btnSecondary}>
              <Save className="size-4" aria-hidden="true" /> {saving ? "Salvando…" : "Salvar simulação"}
            </button>
            <Link
              to="/academia/$lessonId"
              params={{ lessonId: "valor-esperado" }}
              className="inline-flex h-11 items-center justify-center text-sm font-semibold text-brass"
            >
              Aprender: por que o valor esperado importa
            </Link>
          </div>
        </div>
      </div>

      <Callout tone="info">
        Premissas: modelo Black-Scholes (preços lognormais, exercício europeu, sem dividendos, juros zero). A
        probabilidade usa a sua previsão de volatilidade, não a realidade. Opções americanas podem ser exercidas antes do
        vencimento. Conteúdo educacional, não é recomendação.
      </Callout>
    </div>
  );
}

function Tile({ label, value, tone, hint }: { label: string; value: string; tone?: "gain" | "loss"; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2.5">
      <Stat label={label} value={value} tone={tone} hint={hint} />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min,
  prefix,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  prefix?: string;
  hint?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (v: number) => (min !== undefined ? Math.max(min, v) : v);
  return (
    <div className="space-y-1.5">
      <label className="block space-y-1.5">
        <span className="text-[13px]">{label}</span>
        <div className="flex gap-1.5">
          <button
            type="button"
            aria-label={`Diminuir ${label}`}
            onClick={() => onChange(clamp(Math.round((value - step) * 100) / 100))}
            className="grid size-11 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground"
          >
            <Minus className="size-4" aria-hidden="true" />
          </button>
          <div className="relative flex-1">
            {prefix ? (
              <span className="num pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{prefix}</span>
            ) : null}
            <input
              type="number"
              inputMode="decimal"
              step={step}
              min={min}
              value={draft ?? String(value)}
              onChange={(e) => {
                setDraft(e.target.value);
                const v = Number(e.target.value);
                if (e.target.value !== "" && Number.isFinite(v)) onChange(clamp(v));
              }}
              onBlur={() => setDraft(null)}
              className={cn(fieldClass, "num text-center", prefix && "pl-7")}
            />
          </div>
          <button
            type="button"
            aria-label={`Aumentar ${label}`}
            onClick={() => onChange(clamp(Math.round((value + step) * 100) / 100))}
            className="grid size-11 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground"
          >
            <Plus className="size-4" aria-hidden="true" />
          </button>
        </div>
      </label>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="flex items-center justify-between gap-3">
        <span className="text-[13px]">{label}</span>
        <span className="num text-[13px] font-semibold">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(Math.max(value, min), max)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 w-full cursor-pointer"
      />
      {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}
