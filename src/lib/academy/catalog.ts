/**
 * Academy catalog — titles and access rules only (safe to ship to the
 * browser). Lesson bodies live in `lessons.server.ts` and are served through
 * `getLesson`, which checks the plan on the server.
 */
import type { StrategyId } from "../options/strategies";

export type LessonMeta = {
  id: string;
  title: string;
  minutes: number;
  /** Free even when the trail is Pro (used as a taste of the paid content). */
  free?: boolean;
  /** Opens the simulator pre-set to this strategy. */
  tryStrategy?: StrategyId;
};

export type Trail = {
  id: string;
  number: number;
  title: string;
  description: string;
  free: boolean;
  lessons: LessonMeta[];
};

export const TRAILS: Trail[] = [
  {
    id: "fundamentos",
    number: 1,
    title: "Fundamentos",
    description: "O que é uma opção, como ela é precificada e de onde vem o dinheiro de quem ganha.",
    free: true,
    lessons: [
      { id: "o-que-e-uma-opcao", title: "O que é uma opção", minutes: 4, tryStrategy: "long_call" },
      { id: "strike-vencimento-premio", title: "Strike, vencimento e prêmio", minutes: 5 },
      { id: "comprar-ou-vender", title: "Comprar ou vender: de onde vem o dinheiro", minutes: 5, tryStrategy: "put_credit_spread" },
      { id: "exercicio-e-liquidacao", title: "Exercício, assignment e liquidação", minutes: 4 },
      { id: "break-even", title: "Break-even, lucro máximo e perda máxima", minutes: 4, tryStrategy: "covered_call" },
    ],
  },
  {
    id: "gregas",
    number: 2,
    title: "As Gregas",
    description: "Como o preço da opção reage a preço, tempo e volatilidade — em dólares.",
    free: false,
    lessons: [
      { id: "delta", title: "Delta: quanto a opção anda com a ação", minutes: 4 },
      { id: "gamma", title: "Gamma: por que o risco acelera perto do vencimento", minutes: 4 },
      { id: "theta", title: "Theta: o tempo trabalhando contra o comprador", minutes: 4, tryStrategy: "long_call" },
      { id: "vega-volatilidade", title: "Vega e volatilidade implícita", minutes: 6, tryStrategy: "long_straddle" },
    ],
  },
  {
    id: "renda",
    number: 3,
    title: "Estratégias de renda",
    description: "Vender prêmio com o risco sob controle: covered call, put coberta, spreads e iron condor.",
    free: false,
    lessons: [
      { id: "covered-call", title: "Covered call", minutes: 5, tryStrategy: "covered_call" },
      { id: "cash-secured-put", title: "Cash-secured put", minutes: 5, tryStrategy: "cash_secured_put" },
      { id: "credit-spreads", title: "Credit spreads", minutes: 6, tryStrategy: "put_credit_spread" },
      { id: "iron-condor", title: "Iron condor", minutes: 6, tryStrategy: "iron_condor" },
    ],
  },
  {
    id: "risco",
    number: 4,
    title: "Risco e valor esperado",
    description: "A matemática que separa uma boa operação de uma operação que só parece boa.",
    free: false,
    lessons: [
      { id: "valor-esperado", title: "Por que 80% de acerto pode perder dinheiro", minutes: 6, free: true, tryStrategy: "put_credit_spread" },
      { id: "tamanho-de-posicao", title: "Tamanho de posição e drawdown", minutes: 5 },
      { id: "amostra-e-backtest", title: "Amostra, backtest e custos", minutes: 6 },
    ],
  },
];

export function findLesson(lessonId: string): { trail: Trail; lesson: LessonMeta; index: number } | null {
  for (const trail of TRAILS) {
    const index = trail.lessons.findIndex((l) => l.id === lessonId);
    if (index >= 0) return { trail, lesson: trail.lessons[index], index };
  }
  return null;
}

export function lessonIsFree(trail: Trail, lesson: LessonMeta): boolean {
  return trail.free || Boolean(lesson.free);
}

export const ALL_LESSONS = TRAILS.flatMap((t) => t.lessons.map((l) => ({ trail: t, lesson: l })));
