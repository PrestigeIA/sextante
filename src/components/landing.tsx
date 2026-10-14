import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { BookOpen, ChartLine, NotebookPen, Sigma, Check, X } from "lucide-react";
import { analyze, payoffCurve, type Market } from "@/lib/options/engine";
import { buildLegs } from "@/lib/options/strategies";
import { PayoffChart } from "@/components/payoff-chart";
import { Panel, Stat, Tag, btnPrimary, btnSecondary } from "@/components/kit";
import { PricingCards } from "@/components/pricing";
import { pct, usd } from "@/lib/format";

/** Fixed, clearly-labelled example computed live by the real engine. */
function useExample() {
  return useMemo(() => {
    const market: Market = { spot: 670, ivMarket: 0.16, volForecast: 0.16, days: 38, rate: 0 };
    const legs = buildLegs(
      "put_credit_spread",
      { strike: 640, width: 5, callStrike: 690, contracts: 1, premiums: { "Put vendida": 3.4, "Put comprada": 2.6 } },
      market,
    );
    const a = analyze(legs, market);
    return { market, legs, a, curve: payoffCurve(legs, 610, 700) };
  }, []);
}

const FAQ = [
  {
    q: "O Sextante recomenda operações ou opera por mim?",
    a: "Não. O Sextante ensina e calcula: você monta a operação, vê os números e decide. Ele não se conecta à sua corretora, não envia ordens e não dá recomendação personalizada de investimento.",
  },
  {
    q: "De onde vêm os preços?",
    a: "Você digita a cotação do ativo e, se quiser, o prêmio que está vendo na corretora. O simulador calcula o preço justo pelo modelo Black-Scholes e mostra se o prêmio negociado é bom ou ruim em relação a ele.",
  },
  {
    q: "Preciso ter conta em corretora americana?",
    a: "Não para aprender e simular. O Diário tem o modo paper, para registrar operações simuladas e medir o resultado antes de arriscar dinheiro.",
  },
  {
    q: "Serve para quem mora no Brasil?",
    a: "Sim. O conteúdo é em português e explica o mercado de opções dos EUA. Questões de tributação dependem da sua residência fiscal: a Academia explica os conceitos, mas confirme sempre com um contador.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. No site, o cancelamento é feito no portal de assinatura. No app, pelas assinaturas da App Store ou do Google Play. O acesso Pro continua até o fim do período pago.",
  },
];

export function Landing() {
  const { market, a, curve } = useExample();
  const [native, setNative] = useState(false);
  useEffect(() => setNative(Capacitor.isNativePlatform()), []);

  return (
    <div className="space-y-20 md:space-y-28">
      {/* Hero */}
      <section className="grid items-center gap-10 pt-2 lg:grid-cols-[1.05fr_1fr]">
        <div className="space-y-6">
          <Tag>opções americanas · em português</Tag>
          <h1 className="text-[40px] font-bold leading-[1.05] tracking-tight md:text-6xl">
            Opções com precisão,
            <br />
            <span className="text-brass">não com palpite.</span>
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
            Aprenda, simule e meça operações com opções antes de arriscar dinheiro. O Sextante mostra quanto você pode
            ganhar, quanto pode perder e se a operação vale a pena depois dos custos.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/simulador" className={btnPrimary}>
              <ChartLine className="size-4" aria-hidden="true" /> Abrir o simulador
            </Link>
            <Link to="/login" search={{ modo: "criar" }} className={btnSecondary}>
              Criar conta grátis
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">Sem cartão para começar. Simulador aberto, sem cadastro.</p>
        </div>

        <Panel className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[15px] font-semibold">Put Credit Spread · XSP</span>
              <span className="num block text-xs text-muted-foreground">640 / 635 · 38 dias · 1 contrato</span>
            </div>
            <Tag tone={a.expectedValueNet < 0 ? "warn" : "gain"}>{a.expectedValueNet < 0 ? "VE negativo" : "VE positivo"}</Tag>
          </div>
          <PayoffChart points={curve} spot={market.spot} breakevens={a.breakevens} height={190} />
          <div className="grid grid-cols-4 gap-2">
            <Stat label="Crédito" value={usd(a.openingCashFlow, { sign: true, decimals: 0 })} tone="gain" />
            <Stat label="Perda máx." value={usd(-a.maxLoss.value, { sign: true, decimals: 0 })} tone="loss" />
            <Stat label="Prob. lucro" value={pct(a.probProfit * 100, 0)} />
            <Stat label="VE líquido" value={usd(a.expectedValueNet, { sign: true, decimals: 0 })} tone="warn" />
          </div>
          <p className="rounded-xl border border-warn-border bg-warn-bg px-3 py-2.5 text-[13px] leading-relaxed text-[#ecdccb]">
            Mais de {pct(Math.floor(a.probProfit * 100), 0)} de chance de lucro, e mesmo assim a operação perde dinheiro
            na média. O Sextante mostra isso antes de você entrar.
          </p>
          <p className="text-[11px] text-muted-foreground">Exemplo ilustrativo calculado pelo próprio simulador.</p>
        </Panel>
      </section>

      {/* How it works */}
      <section aria-labelledby="como" className="space-y-8">
        <div className="max-w-2xl">
          <h2 id="como" className="text-3xl font-bold md:text-4xl">
            O ciclo de quem opera com método
          </h2>
          <p className="mt-2 text-muted-foreground">
            Corretoras mostram o preço. O Sextante mostra se o preço compensa o risco.
          </p>
        </div>
        <ol className="grid gap-3 md:grid-cols-4">
          {[
            { icon: BookOpen, t: "Aprender", d: "Trilhas curtas em português, do que é uma call até valor esperado e tamanho de posição." },
            { icon: ChartLine, t: "Simular", d: "Monte 10 estratégias e veja payoff, gregas, probabilidade e o resultado médio depois dos custos." },
            { icon: NotebookPen, t: "Registrar", d: "Leve a operação para o Diário em modo paper, com risco, custos e se você seguiu o plano." },
            { icon: Sigma, t: "Medir", d: "Taxa de acerto, profit factor, drawdown e o aviso de quando a amostra já permite conclusões." },
          ].map((s, i) => (
            <li key={s.t}>
              <Panel className="h-full">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-brass-bg text-brass">
                    <s.icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="num text-xs text-muted-foreground">0{i + 1}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold">{s.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
              </Panel>
            </li>
          ))}
        </ol>
      </section>

      {/* Differentiators */}
      <section aria-labelledby="diferente" className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 id="diferente" className="text-3xl font-bold md:text-4xl">
            O número que a corretora não mostra
          </h2>
          <p className="text-muted-foreground">
            A maioria das plataformas destaca a probabilidade de lucro. Ela engana: uma operação que ganha $80 em 80% das
            vezes e perde $420 nas outras 20% perde dinheiro no longo prazo.
          </p>
          <p className="text-muted-foreground">
            O Sextante separa as duas volatilidades que importam: a que o mercado cobra no prêmio e a que você espera que
            aconteça. Se elas forem iguais, o valor esperado é zero menos os custos. Uma vantagem só existe quando você
            tem um motivo para discordar do mercado.
          </p>
        </div>
        <Panel className="space-y-3">
          {[
            ["Resultado líquido primeiro", "Realizado, não realizado e custos separados. Nada de resultado bruto inflado."],
            ["Amostra mínima", "O Diário avisa que 8 operações boas ainda não provam nada, e mostra quanto falta para 30."],
            ["Disciplina medida", "Registre se a entrada e o stop seguiram o plano. Comportamento também é resultado."],
            ["Mercado americano em português", "XSP, SPX, SPY: estilo de exercício, liquidação e tributação explicados."],
          ].map(([t, d]) => (
            <div key={t} className="flex gap-3">
              <Check className="mt-1 size-4 shrink-0 text-gain" aria-hidden="true" />
              <div>
                <h3 className="text-[15px] font-semibold">{t}</h3>
                <p className="text-sm text-muted-foreground">{d}</p>
              </div>
            </div>
          ))}
        </Panel>
      </section>

      {/* What it is not */}
      <section aria-labelledby="nao" className="rounded-[24px] border border-border bg-surface p-6 md:p-10">
        <h2 id="nao" className="text-2xl font-bold">O que o Sextante não é</h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            "Não é robô de trading e não envia ordens à sua corretora.",
            "Não dá dicas, sinais nem recomendação personalizada de investimento.",
            "Não promete renda: opções envolvem risco alto, inclusive de perda total.",
          ].map((t) => (
            <li key={t} className="flex gap-3 text-sm text-muted-foreground">
              <X className="mt-0.5 size-4 shrink-0 text-loss" aria-hidden="true" />
              {t}
            </li>
          ))}
        </ul>
      </section>

      {!native ? (
        <section aria-labelledby="precos-titulo" className="space-y-6">
          <div className="max-w-2xl">
            <h2 id="precos-titulo" className="text-3xl font-bold md:text-4xl">
              Comece grátis. Seja Pro quando fizer sentido.
            </h2>
          </div>
          <PricingCards />
        </section>
      ) : null}

      <section aria-labelledby="faq" className="mx-auto max-w-3xl space-y-4">
        <h2 id="faq" className="text-3xl font-bold">Perguntas frequentes</h2>
        <div className="divide-y divide-border rounded-[18px] border border-border bg-card">
          {FAQ.map((f) => (
            <details key={f.q} className="group px-5">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-[15px] font-medium">
                {f.q}
                <span className="text-brass transition-transform group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="pb-4 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="rounded-[24px] border border-brass-border bg-[linear-gradient(160deg,#1a160c,#0d1118_60%)] p-8 text-center md:p-14">
        <h2 className="text-3xl font-bold md:text-4xl">Saiba onde você está antes de decidir.</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Abra o simulador agora. Sem cadastro, sem cartão.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/simulador" className={btnPrimary}>
            Abrir o simulador
          </Link>
          <Link to="/academia" className={btnSecondary}>
            Ver a Academia
          </Link>
        </div>
      </section>
    </div>
  );
}
