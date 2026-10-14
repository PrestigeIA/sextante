/**
 * Trade-journal math — pure functions, shared by the server and the UI.
 *
 * Prices are per share; one contract = 100 shares.
 *  - credit trade: you receive `entry` and later pay `exit` to close
 *                  → P&L = (entry − exit) × 100 × contracts − fees
 *  - debit trade:  you pay `entry` and later receive `exit`
 *                  → P&L = (exit − entry) × 100 × contracts − fees
 */

export const MULTIPLIER = 100;
/** Minimum closed trades before the journal calls a result statistically meaningful. */
export const VALIDATION_SAMPLE = 30;

export type Trade = {
  id: string;
  account: "paper" | "real";
  strategy: string;
  underlying: string;
  legsText: string;
  direction: "credit" | "debit";
  contracts: number;
  entryPrice: number;
  maxRisk: number;
  fees: number;
  openedAt: string; // YYYY-MM-DD
  expiresAt: string | null;
  status: "open" | "closed";
  markPrice: number | null;
  exitPrice: number | null;
  closedAt: string | null;
  followedPlan: boolean;
  notes: string;
};

function grossFor(t: Pick<Trade, "direction" | "contracts" | "entryPrice">, price: number): number {
  const perShare = t.direction === "credit" ? t.entryPrice - price : price - t.entryPrice;
  return perShare * MULTIPLIER * t.contracts;
}

/** Realized gross P&L of a closed trade (before fees), or null when still open. */
export function realizedGross(t: Trade): number | null {
  if (t.status !== "closed" || t.exitPrice === null) return null;
  return grossFor(t, t.exitPrice);
}

/** Realized net P&L of a closed trade (after fees), or null when still open. */
export function realizedNet(t: Trade): number | null {
  const g = realizedGross(t);
  return g === null ? null : g - t.fees;
}

/** Unrealized P&L of an open trade marked at `markPrice`, or null when unmarked/closed. */
export function unrealized(t: Trade): number | null {
  if (t.status !== "open" || t.markPrice === null) return null;
  return grossFor(t, t.markPrice);
}

export type JournalSummary = {
  closedCount: number;
  openCount: number;
  realizedGross: number;
  unrealized: number;
  fees: number;
  /** Realized gross + unrealized − all fees. */
  netResult: number;
  wins: number;
  losses: number;
  winRate: number | null;
  avgWin: number | null;
  avgLoss: number | null;
  profitFactor: number | null;
  /** Average realized net P&L per closed trade. */
  expectancy: number | null;
  /** Largest peak-to-trough fall of cumulative realized net P&L, as a positive number. */
  maxDrawdown: number;
  /** Cumulative realized net P&L after each closed trade, oldest first. */
  equityCurve: { date: string; value: number }[];
  followedPlanRate: number | null;
  /** Closed trades as a share of VALIDATION_SAMPLE (0–1). */
  sampleProgress: number;
};

/** Sort key for closed trades: close date, then open date. */
function closedOrder(a: Trade, b: Trade): number {
  const ca = a.closedAt ?? a.openedAt;
  const cb = b.closedAt ?? b.openedAt;
  return ca < cb ? -1 : ca > cb ? 1 : a.openedAt < b.openedAt ? -1 : 1;
}

export function summarize(trades: Trade[]): JournalSummary {
  const closed = trades.filter((t) => t.status === "closed" && t.exitPrice !== null).sort(closedOrder);
  const open = trades.filter((t) => t.status === "open");

  let realized = 0;
  let fees = 0;
  let wins = 0;
  let losses = 0;
  let sumWin = 0;
  let sumLoss = 0;
  let cum = 0;
  let peak = 0;
  let maxDd = 0;
  const curve: { date: string; value: number }[] = [];

  for (const t of closed) {
    const gross = realizedGross(t) ?? 0;
    const net = gross - t.fees;
    realized += gross;
    fees += t.fees;
    if (net > 0) {
      wins += 1;
      sumWin += net;
    } else {
      losses += 1;
      sumLoss += -net;
    }
    cum += net;
    peak = Math.max(peak, cum);
    maxDd = Math.max(maxDd, peak - cum);
    curve.push({ date: t.closedAt ?? t.openedAt, value: cum });
  }

  let unreal = 0;
  for (const t of open) {
    unreal += unrealized(t) ?? 0;
    fees += t.fees;
  }

  const n = closed.length;
  const all = trades.length;
  return {
    closedCount: n,
    openCount: open.length,
    realizedGross: realized,
    unrealized: unreal,
    fees,
    netResult: realized + unreal - fees,
    wins,
    losses,
    winRate: n ? wins / n : null,
    avgWin: wins ? sumWin / wins : null,
    avgLoss: losses ? sumLoss / losses : null,
    profitFactor: sumLoss > 0 ? sumWin / sumLoss : wins > 0 ? Number.POSITIVE_INFINITY : null,
    expectancy: n ? cum / n : null,
    maxDrawdown: maxDd,
    equityCurve: curve,
    followedPlanRate: all ? trades.filter((t) => t.followedPlan).length / all : null,
    sampleProgress: Math.min(n / VALIDATION_SAMPLE, 1),
  };
}

/** Plain-language read of the sample, so a lucky streak is never mistaken for an edge. */
export function sampleVerdict(s: JournalSummary): { tone: "neutral" | "good" | "bad"; text: string } {
  if (s.closedCount === 0) {
    return {
      tone: "neutral",
      text: "Registre e encerre operações para começar a medir. Comece no modo paper, sem dinheiro real.",
    };
  }
  if (s.closedCount < VALIDATION_SAMPLE) {
    const lead =
      (s.expectancy ?? 0) > 0 ? "Resultado positivo até aqui, mas ainda não é conclusivo." : "Resultado ainda negativo, e a amostra é pequena.";
    return {
      tone: "neutral",
      text: `${lead} Com ${s.closedCount} ${s.closedCount === 1 ? "operação encerrada" : "operações encerradas"}, uma única perda grande muda tudo. Avalie depois de pelo menos ${VALIDATION_SAMPLE}.`,
    };
  }
  if ((s.expectancy ?? 0) > 0 && (s.profitFactor ?? 0) > 1.2) {
    return {
      tone: "good",
      text: "Amostra suficiente e expectativa positiva depois dos custos. Confira se o resultado veio de várias condições de mercado antes de aumentar o risco.",
    };
  }
  return {
    tone: "bad",
    text: "Amostra suficiente, mas sem vantagem clara depois dos custos. Revise a estratégia antes de continuar.",
  };
}
