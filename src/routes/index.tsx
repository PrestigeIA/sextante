import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChartLine, NotebookPen, ArrowRight, Sparkles, Trash2 } from "lucide-react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useAccess } from "@/lib/use-access";
import { Landing } from "@/components/landing";
import { Callout, EmptyState, Panel, PanelTitle, Stat, Tag, btnPrimary } from "@/components/kit";
import { listTrades } from "@/lib/journal/trades";
import { summarize, VALIDATION_SAMPLE, type Trade } from "@/lib/journal/metrics";
import { deleteSimulation, listSimulations, type SavedSimulation } from "@/lib/simulations";
import { listProgress } from "@/lib/academy/server";
import { ALL_LESSONS } from "@/lib/academy/catalog";
import { isStrategyId, strategyMeta } from "@/lib/options/strategies";
import { pct, pnlColor, usd } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: IndexPage });

function IndexPage() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return null;
  return user ? <Home name={user.displayName} /> : <Landing />;
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

function Home({ name }: { name: string | null }) {
  const { pro } = useAccess();
  const [trades, setTrades] = useState<Trade[] | null>(null);
  const [sims, setSims] = useState<SavedSimulation[] | null>(null);
  const [done, setDone] = useState<string[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([listTrades(), listSimulations(), listProgress()])
      .then(([t, s, p]) => {
        if (!alive) return;
        setTrades(t);
        setSims(s);
        setDone(p);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const summary = useMemo(() => (trades ? summarize(trades) : null), [trades]);
  const nextLesson = done ? ALL_LESSONS.find((x) => !done.includes(x.lesson.id)) : undefined;
  const firstName = name?.split(" ")[0];
  const sim = sims?.[0];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">{greeting()}{firstName ? `, ${firstName}` : ""}</p>
        <h1 className="text-[26px] font-bold leading-tight md:text-3xl">Seu painel</h1>
      </div>

      {failed ? <Callout tone="warn">Não foi possível carregar seus dados agora. Puxe para atualizar ou tente mais tarde.</Callout> : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {summary && trades && trades.length > 0 ? (
            <Panel>
              <PanelTitle aside={<Link to="/diario" className="text-[13px] font-semibold text-brass">Abrir Diário</Link>}>
                Diário · resultado líquido
              </PanelTitle>
              <div className={cn("num text-[34px] font-semibold leading-none", pnlColor(summary.netResult))}>
                {usd(summary.netResult, { sign: true })}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Todas as contas · depois dos custos</p>
              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4">
                <Stat label="Realizado" value={usd(summary.realizedGross, { sign: true })} tone={summary.realizedGross >= 0 ? "gain" : "loss"} />
                <Stat label="Não realizado" value={usd(summary.unrealized, { sign: true })} tone={summary.unrealized >= 0 ? "gain" : "loss"} />
                <Stat label="Custos" value={usd(-summary.fees, { sign: true })} tone={summary.fees ? "loss" : undefined} />
                <Stat label="Abertas" value={String(summary.openCount)} />
                <Stat label="Taxa de acerto" value={summary.winRate === null ? "—" : pct(summary.winRate * 100)} />
                <Stat label="Amostra" value={`${summary.closedCount} / ${VALIDATION_SAMPLE}`} />
              </div>
            </Panel>
          ) : trades ? (
            <EmptyState
              title="Seu Diário está vazio"
              body="Monte uma operação no simulador e registre no modo paper. Em algumas semanas você terá números reais para avaliar, sem arriscar dinheiro."
              action={
                <Link to="/simulador" className={cn(btnPrimary, "h-11 text-sm")}>
                  <ChartLine className="size-4" aria-hidden="true" /> Montar a primeira operação
                </Link>
              }
            />
          ) : (
            <Panel>
              <p className="text-sm text-muted-foreground">Carregando…</p>
            </Panel>
          )}

          <div className="grid grid-cols-3 gap-2">
            {[
              { to: "/simulador", icon: ChartLine, t: "Simular", d: "Payoff e VE" },
              { to: "/diario", icon: NotebookPen, t: "Registrar", d: "Nova operação" },
              { to: "/academia", icon: BookOpen, t: "Academia", d: "Trilhas" },
            ].map((a) => (
              <Link key={a.to} to={a.to} className="flex flex-col gap-2 rounded-[14px] border border-border bg-card p-3.5 hover:bg-accent">
                <a.icon className="size-5 text-brass" aria-hidden="true" />
                <span className="text-sm font-semibold">{a.t}</span>
                <span className="-mt-1.5 text-xs text-muted-foreground">{a.d}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Panel>
            <PanelTitle aside={<Link to="/simulador" className="text-[13px] font-semibold text-brass">Nova</Link>}>
              Última simulação salva
            </PanelTitle>
            {sim ? <SimCard sim={sim} onDeleted={() => setSims((s) => (s ? s.filter((x) => x.id !== sim.id) : s))} /> : (
              <p className="text-sm text-muted-foreground">
                {sims ? "Nenhuma simulação salva ainda. No simulador, toque em Salvar simulação." : "Carregando…"}
              </p>
            )}
          </Panel>

          <Panel>
            <PanelTitle aside={<Link to="/academia" className="text-[13px] font-semibold text-brass">Trilhas</Link>}>
              Continuar aprendendo
            </PanelTitle>
            {nextLesson ? (
              <Link
                to="/academia/$lessonId"
                params={{ lessonId: nextLesson.lesson.id }}
                className="flex items-center gap-3 rounded-xl py-1"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brass-bg text-brass">
                  <BookOpen className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-muted-foreground">
                    Trilha {nextLesson.trail.number} · {nextLesson.trail.title}
                  </span>
                  <span className="block text-sm font-semibold">{nextLesson.lesson.title}</span>
                </span>
                <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">{done ? "Você concluiu todas as lições. Revise quando quiser." : "Carregando…"}</p>
            )}
          </Panel>

          {!pro ? (
            <Panel className="border-brass-border">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 size-5 shrink-0 text-brass" aria-hidden="true" />
                <div className="space-y-1.5">
                  <h2 className="text-[15px] font-semibold">Sextante Pro</h2>
                  <p className="text-sm text-muted-foreground">
                    Todas as estratégias, as quatro trilhas e o Diário ilimitado para chegar à amostra mínima.
                  </p>
                  <Link to="/assinatura" className="inline-flex h-11 items-center text-sm font-semibold text-brass">
                    Ver planos <ArrowRight className="ml-1 size-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SimCard({ sim, onDeleted }: { sim: SavedSimulation; onDeleted: () => void }) {
  const s = sim.payload.snapshot;
  const name = isStrategyId(sim.strategy) ? strategyMeta(sim.strategy).name : sim.strategy;
  const ev = s.expectedValueNet;
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="block text-[15px] font-semibold">
            {name} · {sim.payload.underlying}
          </span>
          <span className="num block truncate text-xs text-muted-foreground">
            {s.legsText} · {sim.payload.days} dias · {sim.payload.contracts} contr.
          </span>
        </div>
        <Tag tone={ev >= 0 ? "gain" : "warn"}>{ev >= 0 ? "VE positivo" : "VE negativo"}</Tag>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <Stat label={s.openingCashFlow >= 0 ? "Crédito" : "Débito"} value={usd(s.openingCashFlow, { sign: true, decimals: 0 })} />
        <Stat label="Perda máx." value={s.maxLoss === null ? "Ilim." : usd(-s.maxLoss, { sign: true, decimals: 0 })} tone="loss" />
        <Stat label="Prob. lucro" value={pct(s.probProfit * 100, 0)} />
        <Stat label="VE líquido" value={usd(ev, { sign: true, decimals: 0 })} tone={ev >= 0 ? "gain" : "loss"} />
      </div>
      <div className="flex items-center justify-between">
        <Link
          to="/simulador"
          search={isStrategyId(sim.strategy) ? { estrategia: sim.strategy } : {}}
          className="inline-flex h-10 items-center text-[13px] font-semibold text-brass"
        >
          Abrir estratégia no simulador
        </Link>
        <button
          type="button"
          aria-label="Apagar simulação"
          onClick={() => void deleteSimulation({ data: { id: sim.id } }).then(onDeleted)}
          className="grid size-10 place-items-center text-muted-foreground hover:text-loss"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
