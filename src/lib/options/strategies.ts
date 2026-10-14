/**
 * Strategy templates for the simulator. Each one turns a few intuitive inputs
 * (strikes as a distance from the current price, width, contracts) into legs.
 * Premiums default to the Black-Scholes fair price at the market IV; the user
 * can override every premium with the price they actually see at the broker.
 */
import {
  fairPremium,
  type Leg,
  type Market,
  type OptionLeg,
  type OptionType,
  type Side,
} from "./engine.ts";

export type StrategyId =
  | "long_call"
  | "long_put"
  | "covered_call"
  | "cash_secured_put"
  | "put_credit_spread"
  | "call_credit_spread"
  | "bull_call_spread"
  | "bear_put_spread"
  | "iron_condor"
  | "long_straddle";

export type StrategyFamily = "direcional" | "renda" | "volatilidade";

export type StrategyMeta = {
  id: StrategyId;
  name: string;
  family: StrategyFamily;
  /** One line: what view of the market this expresses. */
  view: string;
  /** Free plan can use it. */
  free: boolean;
  /** Uses a second strike defined by a width. */
  usesWidth: boolean;
  /** Short strike(s) are placed by distance from spot. */
  summary: string;
};

export const STRATEGIES: StrategyMeta[] = [
  {
    id: "long_call",
    name: "Compra de Call",
    family: "direcional",
    view: "Alta forte antes do vencimento",
    free: true,
    usesWidth: false,
    summary: "Paga o prêmio; ganha se o ativo subir acima do strike mais o prêmio.",
  },
  {
    id: "long_put",
    name: "Compra de Put",
    family: "direcional",
    view: "Queda forte ou proteção",
    free: true,
    usesWidth: false,
    summary: "Paga o prêmio; ganha se o ativo cair abaixo do strike menos o prêmio.",
  },
  {
    id: "put_credit_spread",
    name: "Put Credit Spread",
    family: "renda",
    view: "Neutro a alta, risco definido",
    free: true,
    usesWidth: true,
    summary: "Vende uma put e compra outra mais abaixo. Recebe crédito; a perda é limitada à largura menos o crédito.",
  },
  {
    id: "covered_call",
    name: "Covered Call",
    family: "renda",
    view: "Neutro a leve alta, já tem as ações",
    free: true,
    usesWidth: false,
    summary: "Tem 100 ações e vende uma call acima. Recebe prêmio e abre mão da alta acima do strike.",
  },
  {
    id: "cash_secured_put",
    name: "Cash-Secured Put",
    family: "renda",
    view: "Aceita comprar o ativo mais barato",
    free: false,
    usesWidth: false,
    summary: "Vende uma put com o dinheiro do strike reservado. Recebe prêmio; pode ser exercido e comprar 100 ações.",
  },
  {
    id: "call_credit_spread",
    name: "Call Credit Spread",
    family: "renda",
    view: "Neutro a baixa, risco definido",
    free: false,
    usesWidth: true,
    summary: "Vende uma call e compra outra mais acima. Recebe crédito com perda limitada.",
  },
  {
    id: "iron_condor",
    name: "Iron Condor",
    family: "renda",
    view: "Ativo dentro de um intervalo",
    free: false,
    usesWidth: true,
    summary: "Put credit spread + call credit spread. Ganha se o ativo ficar entre os strikes vendidos.",
  },
  {
    id: "bull_call_spread",
    name: "Bull Call Spread",
    family: "direcional",
    view: "Alta moderada, custo menor",
    free: false,
    usesWidth: true,
    summary: "Compra uma call e vende outra acima. Paga menos que a call sozinha, com ganho limitado.",
  },
  {
    id: "bear_put_spread",
    name: "Bear Put Spread",
    family: "direcional",
    view: "Queda moderada, custo menor",
    free: false,
    usesWidth: true,
    summary: "Compra uma put e vende outra abaixo. Paga menos que a put sozinha, com ganho limitado.",
  },
  {
    id: "long_straddle",
    name: "Long Straddle",
    family: "volatilidade",
    view: "Movimento grande, sem saber a direção",
    free: false,
    usesWidth: false,
    summary: "Compra call e put no mesmo strike. Ganha se o ativo andar mais que os dois prêmios somados.",
  },
];

export function strategyMeta(id: StrategyId): StrategyMeta {
  const meta = STRATEGIES.find((s) => s.id === id);
  if (!meta) throw new Error(`Unknown strategy: ${id}`);
  return meta;
}

export function isStrategyId(value: string): value is StrategyId {
  return STRATEGIES.some((s) => s.id === value);
}

export type StrategyInputs = {
  /** Main strike (the one sold in credit strategies, the one bought in debit ones). */
  strike: number;
  /** Distance to the second strike, for spreads and condors (USD). */
  width: number;
  /** For the iron condor: the call side's short strike. */
  callStrike: number;
  contracts: number;
  /** Optional premium overrides, keyed by leg label. Missing = fair price. */
  premiums: Partial<Record<string, number>>;
};

export type LabeledLeg = Leg & { label: string };

function opt(
  label: string,
  type: OptionType,
  side: Side,
  strike: number,
  qty: number,
  market: Market,
  premiums: Partial<Record<string, number>>,
): LabeledLeg {
  const k = Math.max(roundStrike(strike), 0.5);
  const premium = premiums[label] ?? fairPremium(type, market, k);
  const leg: OptionLeg = { kind: "option", type, side, strike: k, qty, premium };
  return { ...leg, label };
}

/** Strikes on a $1 grid for prices >= 25, $0.50 below — close enough to real chains for teaching. */
export function roundStrike(x: number): number {
  return x >= 25 ? Math.round(x) : Math.round(x * 2) / 2;
}

export function buildLegs(id: StrategyId, input: StrategyInputs, market: Market): LabeledLeg[] {
  const q = Math.max(1, Math.round(input.contracts));
  const p = input.premiums;
  const k = input.strike;
  const w = Math.max(input.width, 0.5);
  switch (id) {
    case "long_call":
      return [opt("Call comprada", "call", 1, k, q, market, p)];
    case "long_put":
      return [opt("Put comprada", "put", 1, k, q, market, p)];
    case "covered_call":
      return [
        { kind: "stock", side: 1, qty: 100 * q, price: market.spot, label: `${100 * q} ações` },
        opt("Call vendida", "call", -1, k, q, market, p),
      ];
    case "cash_secured_put":
      return [opt("Put vendida", "put", -1, k, q, market, p)];
    case "put_credit_spread":
      return [
        opt("Put vendida", "put", -1, k, q, market, p),
        opt("Put comprada", "put", 1, k - w, q, market, p),
      ];
    case "call_credit_spread":
      return [
        opt("Call vendida", "call", -1, k, q, market, p),
        opt("Call comprada", "call", 1, k + w, q, market, p),
      ];
    case "bull_call_spread":
      return [
        opt("Call comprada", "call", 1, k, q, market, p),
        opt("Call vendida", "call", -1, k + w, q, market, p),
      ];
    case "bear_put_spread":
      return [
        opt("Put comprada", "put", 1, k, q, market, p),
        opt("Put vendida", "put", -1, k - w, q, market, p),
      ];
    case "iron_condor":
      return [
        opt("Put comprada", "put", 1, k - w, q, market, p),
        opt("Put vendida", "put", -1, k, q, market, p),
        opt("Call vendida", "call", -1, input.callStrike, q, market, p),
        opt("Call comprada", "call", 1, input.callStrike + w, q, market, p),
      ];
    case "long_straddle":
      return [
        opt("Call comprada", "call", 1, k, q, market, p),
        opt("Put comprada", "put", 1, k, q, market, p),
      ];
  }
}

/** Sensible starting inputs for a strategy given the current price. */
export function defaultInputs(id: StrategyId, spot: number): StrategyInputs {
  const s = spot;
  const width = s >= 200 ? 5 : s >= 50 ? 2.5 : 1;
  const base = { width, contracts: 1, premiums: {}, callStrike: roundStrike(s * 1.03) };
  switch (id) {
    case "put_credit_spread":
    case "cash_secured_put":
      return { ...base, strike: roundStrike(s * 0.975) };
    case "iron_condor":
      return { ...base, strike: roundStrike(s * 0.97), callStrike: roundStrike(s * 1.03) };
    case "call_credit_spread":
    case "covered_call":
      return { ...base, strike: roundStrike(s * 1.025) };
    case "bear_put_spread":
    case "long_put":
    case "long_call":
    case "bull_call_spread":
    case "long_straddle":
      return { ...base, strike: roundStrike(s) };
  }
}

/** Underlyings offered as presets. Prices are NOT provided — the user types today's price. */
export type Underlying = {
  symbol: string;
  name: string;
  style: "europeia" | "americana";
  settlement: "dinheiro" | "ações";
  /** IRS Section 1256 (60/40) treatment for broad-based index options. */
  section1256: boolean;
  note: string;
};

export const UNDERLYINGS: Underlying[] = [
  {
    symbol: "XSP",
    name: "Mini-SPX (1/10 do S&P 500)",
    style: "europeia",
    settlement: "dinheiro",
    section1256: true,
    note: "Sem exercício antecipado e liquidado em dinheiro. Tamanho bom para contas menores.",
  },
  {
    symbol: "SPX",
    name: "Índice S&P 500",
    style: "europeia",
    settlement: "dinheiro",
    section1256: true,
    note: "O mais líquido do mundo, mas cada contrato representa um valor alto.",
  },
  {
    symbol: "SPY",
    name: "ETF do S&P 500",
    style: "americana",
    settlement: "ações",
    section1256: false,
    note: "Muito líquido. Pode ser exercido antes do vencimento e entrega ações.",
  },
  {
    symbol: "QQQ",
    name: "ETF do Nasdaq-100",
    style: "americana",
    settlement: "ações",
    section1256: false,
    note: "Mais volátil que o SPY. Exercício antecipado possível.",
  },
  {
    symbol: "IWM",
    name: "ETF do Russell 2000",
    style: "americana",
    settlement: "ações",
    section1256: false,
    note: "Empresas menores; volatilidade maior que a do S&P 500.",
  },
  {
    symbol: "AÇÃO",
    name: "Outra ação (AAPL, MSFT, NVDA…)",
    style: "americana",
    settlement: "ações",
    section1256: false,
    note: "Atenção a balanços e eventos: a volatilidade muda muito perto deles.",
  },
];
