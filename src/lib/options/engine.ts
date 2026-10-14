/**
 * Sextante options engine — pure TypeScript, no dependencies, runs the same on
 * the server, in the browser and in `node --test`.
 *
 * Model: Black-Scholes (European exercise, lognormal prices, continuous rate,
 * no dividends). Two volatilities on purpose:
 *
 *   - `ivMarket`     prices the premiums (what the market charges today);
 *   - `volForecast`  drives the probabilities and the expected value (what the
 *                    user believes the underlying will actually do).
 *
 * When both are equal and the premiums are the model's fair prices, the
 * expected value of ANY strategy is zero before costs — and negative after.
 * That is the central lesson of the product: an edge only exists when the
 * premium you trade differs from what you believe the risk is worth.
 *
 * Money is in US dollars. Option premiums and strikes are per share; one
 * contract = `CONTRACT_MULTIPLIER` shares.
 */

export const CONTRACT_MULTIPLIER = 100;

export type OptionType = "call" | "put";
/** +1 = bought (long), −1 = sold (short). */
export type Side = 1 | -1;

export type OptionLeg = {
  kind: "option";
  type: OptionType;
  side: Side;
  strike: number;
  /** Number of contracts. */
  qty: number;
  /** Premium per share actually traded (or assumed). */
  premium: number;
};

export type StockLeg = {
  kind: "stock";
  side: Side;
  /** Number of shares. */
  qty: number;
  /** Price per share paid (long) or received (short). */
  price: number;
};

export type Leg = OptionLeg | StockLeg;

export type Market = {
  spot: number;
  /** Annualized implied volatility used to price premiums (0.16 = 16%). */
  ivMarket: number;
  /** Annualized volatility the user expects to be realized (0.16 = 16%). */
  volForecast: number;
  /** Calendar days to expiration. */
  days: number;
  /** Annualized risk-free rate (0.04 = 4%). */
  rate: number;
};

export type Costs = {
  /** Broker commission per contract per execution (USD). */
  commissionPerContract: number;
  /** Expected slippage per contract per execution (USD) — part of the bid/ask spread paid. */
  slippagePerContract: number;
  /** Count both opening and closing executions (true) or only opening (false, held to expiry). */
  roundTrip: boolean;
};

export const DEFAULT_COSTS: Costs = {
  commissionPerContract: 0.65,
  slippagePerContract: 1,
  roundTrip: true,
};

// ---------------------------------------------------------------------------
// Normal distribution
// ---------------------------------------------------------------------------

/** Standard normal density. */
export function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/**
 * Standard normal CDF — Marsaglia's Taylor-series method (2004), accurate to
 * about 1e-15 on the range that matters; clamped beyond ±8.5σ.
 */
export function normCdf(x: number): number {
  if (x < -8.5) return 0;
  if (x > 8.5) return 1;
  let s = x;
  let t = 0;
  let b = x;
  const q = x * x;
  let i = 1;
  while (s !== t) {
    t = s;
    i += 2;
    b *= q / i;
    s = t + b;
  }
  return 0.5 + s * Math.exp(-0.5 * q - 0.9189385332046727);
}

// ---------------------------------------------------------------------------
// Black-Scholes price and greeks (per share)
// ---------------------------------------------------------------------------

export type Greeks = {
  price: number;
  /** ∂price/∂spot. */
  delta: number;
  /** ∂²price/∂spot². */
  gamma: number;
  /** Price change for one calendar day passing. */
  thetaPerDay: number;
  /** Price change for +1 volatility point (0.01). */
  vegaPerPoint: number;
};

function yearsFromDays(days: number): number {
  return Math.max(days, 0) / 365;
}

/** Price and greeks of one option, per share. Handles expiry (T = 0) as intrinsic value. */
export function blackScholes(
  type: OptionType,
  spot: number,
  strike: number,
  days: number,
  vol: number,
  rate = 0,
): Greeks {
  const T = yearsFromDays(days);
  if (T <= 0 || vol <= 0) {
    const intrinsic = type === "call" ? Math.max(spot - strike, 0) : Math.max(strike - spot, 0);
    const itm = type === "call" ? spot > strike : spot < strike;
    return {
      price: intrinsic,
      delta: itm ? (type === "call" ? 1 : -1) : 0,
      gamma: 0,
      thetaPerDay: 0,
      vegaPerPoint: 0,
    };
  }
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(spot / strike) + (rate + 0.5 * vol * vol) * T) / (vol * sqrtT);
  const d2 = d1 - vol * sqrtT;
  const disc = Math.exp(-rate * T);
  const price =
    type === "call"
      ? spot * normCdf(d1) - strike * disc * normCdf(d2)
      : strike * disc * normCdf(-d2) - spot * normCdf(-d1);
  const delta = type === "call" ? normCdf(d1) : normCdf(d1) - 1;
  const gamma = normPdf(d1) / (spot * vol * sqrtT);
  const thetaAnnual =
    type === "call"
      ? (-spot * normPdf(d1) * vol) / (2 * sqrtT) - rate * strike * disc * normCdf(d2)
      : (-spot * normPdf(d1) * vol) / (2 * sqrtT) + rate * strike * disc * normCdf(-d2);
  const vega = spot * normPdf(d1) * sqrtT;
  return {
    price,
    delta,
    gamma,
    thetaPerDay: thetaAnnual / 365,
    vegaPerPoint: vega / 100,
  };
}

/** Fair premium rounded to the nearest $0.01 (what the simulator pre-fills). */
export function fairPremium(
  type: OptionType,
  market: Pick<Market, "spot" | "ivMarket" | "days" | "rate">,
  strike: number,
): number {
  const p = blackScholes(type, market.spot, strike, market.days, market.ivMarket, market.rate).price;
  return Math.round(p * 100) / 100;
}

// ---------------------------------------------------------------------------
// Position analytics
// ---------------------------------------------------------------------------

function legUnits(leg: Leg): number {
  return leg.kind === "option" ? leg.qty * CONTRACT_MULTIPLIER : leg.qty;
}

/** Cash flow when opening the position: positive = credit received, negative = debit paid. */
export function openingCashFlow(legs: Leg[]): number {
  let total = 0;
  for (const leg of legs) {
    const px = leg.kind === "option" ? leg.premium : leg.price;
    total += -leg.side * px * legUnits(leg);
  }
  return total;
}

/** Value of the legs at expiration for an underlying price `s` (excluding the opening cash flow). */
function terminalValue(legs: Leg[], s: number): number {
  let total = 0;
  for (const leg of legs) {
    if (leg.kind === "stock") {
      total += leg.side * s * leg.qty;
    } else {
      const intrinsic = leg.type === "call" ? Math.max(s - leg.strike, 0) : Math.max(leg.strike - s, 0);
      total += leg.side * intrinsic * legUnits(leg);
    }
  }
  return total;
}

/** Profit or loss at expiration (USD, before costs) if the underlying finishes at `s`. */
export function payoffAtExpiry(legs: Leg[], s: number): number {
  return openingCashFlow(legs) + terminalValue(legs, s);
}

/** Total trading costs for the position (USD). */
export function tradingCosts(legs: Leg[], costs: Costs = DEFAULT_COSTS): number {
  let contracts = 0;
  for (const leg of legs) if (leg.kind === "option") contracts += leg.qty;
  const perExecution = contracts * (costs.commissionPerContract + costs.slippagePerContract);
  return perExecution * (costs.roundTrip ? 2 : 1);
}

/** Slope of the payoff for prices beyond every strike (per $1 of underlying). */
function slopeAbove(legs: Leg[]): number {
  let slope = 0;
  for (const leg of legs) {
    if (leg.kind === "stock") slope += leg.side * leg.qty;
    else if (leg.type === "call") slope += leg.side * legUnits(leg);
  }
  return slope;
}

function kinks(legs: Leg[]): number[] {
  const ks = new Set<number>();
  for (const leg of legs) if (leg.kind === "option") ks.add(leg.strike);
  return [...ks].sort((a, b) => a - b);
}

export type Extreme = { value: number; unbounded: boolean };

/**
 * Maximum profit and maximum loss at expiration. The payoff is piecewise
 * linear with kinks only at strikes, so the extremes sit at 0, at a strike,
 * or at +∞ (unbounded when the slope above the highest strike is non-zero).
 */
export function payoffExtremes(legs: Leg[]): { maxProfit: Extreme; maxLoss: Extreme } {
  const points = [0, ...kinks(legs)];
  const values = points.map((s) => payoffAtExpiry(legs, s));
  const up = slopeAbove(legs);
  const maxProfit: Extreme = { value: Math.max(...values), unbounded: up > 1e-9 };
  const maxLoss: Extreme = { value: -Math.min(...values), unbounded: up < -1e-9 };
  return { maxProfit, maxLoss };
}

/** Underlying prices at expiration where P&L (before costs) crosses zero. */
export function breakevens(legs: Leg[]): number[] {
  const ks = kinks(legs);
  const top = (ks[ks.length - 1] ?? legs.find((l) => l.kind === "stock")?.price ?? 100) * 3;
  const points = [0, ...ks, top];
  const result: number[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const fa = payoffAtExpiry(legs, a);
    const fb = payoffAtExpiry(legs, b);
    if (fa === 0 && i > 0) result.push(a);
    if ((fa < 0 && fb > 0) || (fa > 0 && fb < 0)) {
      result.push(a + ((b - a) * -fa) / (fb - fa));
    }
  }
  // Beyond the top point the payoff is linear; check a crossing there.
  const fTop = payoffAtExpiry(legs, top);
  const up = slopeAbove(legs);
  if (up !== 0 && Math.sign(fTop) === -Math.sign(up)) result.push(top - fTop / up);
  return [...new Set(result.map((x) => Math.round(x * 100) / 100))].sort((a, b) => a - b);
}

/**
 * Probability, expected value and spread of the outcome at expiration, under
 * a lognormal distribution with volatility `vol` and drift `rate`.
 * Integrated numerically on a fine log-price grid (±7σ), which handles any
 * combination of legs without special cases.
 */
export function outcomeDistribution(
  legs: Leg[],
  market: Market,
  vol = market.volForecast,
): { probProfit: number; expectedPayoff: number; probMaxLoss: number } {
  const T = yearsFromDays(market.days);
  if (T <= 0 || vol <= 0) {
    const p = payoffAtExpiry(legs, market.spot);
    return { probProfit: p > 0 ? 1 : 0, expectedPayoff: p, probMaxLoss: 0 };
  }
  const sd = vol * Math.sqrt(T);
  const mu = Math.log(market.spot) + (market.rate - 0.5 * vol * vol) * T;
  const N = 4000;
  const zMin = -7;
  const zMax = 7;
  const dz = (zMax - zMin) / N;
  const { maxLoss } = payoffExtremes(legs);
  let probProfit = 0;
  let expected = 0;
  let probMaxLoss = 0;
  let mass = 0;
  for (let i = 0; i <= N; i += 1) {
    const z = zMin + i * dz;
    const w = normPdf(z) * dz * (i === 0 || i === N ? 0.5 : 1);
    const s = Math.exp(mu + sd * z);
    const p = payoffAtExpiry(legs, s);
    mass += w;
    expected += w * p;
    if (p > 1e-9) probProfit += w;
    if (!maxLoss.unbounded && maxLoss.value > 0 && p <= -maxLoss.value + 0.005) probMaxLoss += w;
  }
  return {
    probProfit: probProfit / mass,
    expectedPayoff: expected / mass,
    probMaxLoss: probMaxLoss / mass,
  };
}

export type PositionGreeks = {
  delta: number;
  gamma: number;
  thetaPerDay: number;
  vegaPerPoint: number;
};

/** Position greeks in dollars (delta in share-equivalents). Uses the market IV. */
export function positionGreeks(legs: Leg[], market: Market): PositionGreeks {
  const g: PositionGreeks = { delta: 0, gamma: 0, thetaPerDay: 0, vegaPerPoint: 0 };
  for (const leg of legs) {
    if (leg.kind === "stock") {
      g.delta += leg.side * leg.qty;
      continue;
    }
    const bs = blackScholes(leg.type, market.spot, leg.strike, market.days, market.ivMarket, market.rate);
    const units = leg.side * legUnits(leg);
    g.delta += bs.delta * units;
    g.gamma += bs.gamma * units;
    g.thetaPerDay += bs.thetaPerDay * units;
    g.vegaPerPoint += bs.vegaPerPoint * units;
  }
  return g;
}

/** Model value of the position today (USD), legs marked at the market IV. */
export function modelValue(legs: Leg[], market: Market): number {
  let total = 0;
  for (const leg of legs) {
    if (leg.kind === "stock") total += leg.side * market.spot * leg.qty;
    else
      total +=
        leg.side *
        blackScholes(leg.type, market.spot, leg.strike, market.days, market.ivMarket, market.rate).price *
        legUnits(leg);
  }
  return total;
}

export type Analysis = {
  /** Positive = credit received, negative = debit paid. */
  openingCashFlow: number;
  maxProfit: Extreme;
  maxLoss: Extreme;
  breakevens: number[];
  /** Capital at risk / buying power for a defined-risk or fully-secured position. */
  capitalRequired: number | null;
  probProfit: number;
  probMaxLoss: number;
  /** Win rate needed to break even if every trade ended at max profit or max loss. */
  breakevenWinRate: number | null;
  /** E[P&L at expiry] under the forecast volatility, before costs. */
  expectedValueGross: number;
  costs: number;
  /** E[P&L at expiry] under the forecast volatility, after costs. */
  expectedValueNet: number;
  /** Premium traded minus model fair value at the market IV (positive = favorable price). */
  priceEdge: number;
  /** Return on capital at max profit, when capital is defined. */
  maxReturnOnCapital: number | null;
  greeks: PositionGreeks;
  /** One-standard-deviation expected move of the underlying by expiration (USD). */
  expectedMove: number;
};

export function analyze(legs: Leg[], market: Market, costs: Costs = DEFAULT_COSTS): Analysis {
  const cash = openingCashFlow(legs);
  const { maxProfit, maxLoss } = payoffExtremes(legs);
  const dist = outcomeDistribution(legs, market);
  const cost = tradingCosts(legs, costs);
  const fair = -modelValue(legs, market); // fair opening cash flow at market IV
  const capitalRequired = maxLoss.unbounded ? null : Math.max(maxLoss.value, 0);
  const breakevenWinRate =
    maxLoss.unbounded || maxProfit.unbounded || maxProfit.value <= 0 || maxLoss.value <= 0
      ? null
      : maxLoss.value / (maxLoss.value + maxProfit.value);
  return {
    openingCashFlow: cash,
    maxProfit,
    maxLoss,
    breakevens: breakevens(legs),
    capitalRequired,
    probProfit: dist.probProfit,
    probMaxLoss: dist.probMaxLoss,
    breakevenWinRate,
    expectedValueGross: dist.expectedPayoff,
    costs: cost,
    expectedValueNet: dist.expectedPayoff - cost,
    priceEdge: cash - fair,
    maxReturnOnCapital:
      capitalRequired && capitalRequired > 0 && !maxProfit.unbounded
        ? maxProfit.value / capitalRequired
        : null,
    greeks: positionGreeks(legs, market),
    expectedMove: market.spot * market.ivMarket * Math.sqrt(yearsFromDays(market.days)),
  };
}

/** Sample the expiry payoff curve for charting. */
export function payoffCurve(
  legs: Leg[],
  from: number,
  to: number,
  points = 121,
): { s: number; pnl: number }[] {
  const out: { s: number; pnl: number }[] = [];
  const ks = kinks(legs).filter((k) => k > from && k < to);
  const xs = new Set<number>();
  for (let i = 0; i < points; i += 1) xs.add(from + ((to - from) * i) / (points - 1));
  for (const k of ks) xs.add(k);
  for (const s of [...xs].sort((a, b) => a - b)) out.push({ s, pnl: payoffAtExpiry(legs, s) });
  return out;
}
