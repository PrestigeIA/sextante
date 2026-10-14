import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analyze,
  blackScholes,
  breakevens,
  normCdf,
  payoffAtExpiry,
  payoffExtremes,
  type Leg,
  type Market,
} from "./engine.ts";
import { buildLegs, defaultInputs, STRATEGIES } from "./strategies.ts";

const close = (a: number, b: number, tol: number, msg?: string) =>
  assert.ok(Math.abs(a - b) <= tol, `${msg ?? ""} expected ${b}, got ${a}`);

test("normal CDF matches reference values", () => {
  close(normCdf(0), 0.5, 1e-12);
  close(normCdf(1), 0.8413447460685429, 1e-10);
  close(normCdf(-1.96), 0.024997895148220435, 1e-10);
  close(normCdf(3), 0.9986501019683699, 1e-10);
  close(normCdf(-6), 9.865876450376946e-10, 1e-14);
});

test("Black-Scholes reference price (S=K=100, T=1y, σ=20%, r=0)", () => {
  const c = blackScholes("call", 100, 100, 365, 0.2, 0);
  close(c.price, 7.965567455405804, 1e-8);
  close(c.delta, 0.539827837277029, 1e-8);
});

test("put-call parity holds with interest", () => {
  const S = 450;
  const K = 440;
  const days = 45;
  const r = 0.04;
  const c = blackScholes("call", S, K, days, 0.18, r).price;
  const p = blackScholes("put", S, K, days, 0.18, r).price;
  close(c - p, S - K * Math.exp((-r * days) / 365), 1e-8);
});

test("put credit spread: profit, loss and breakeven from the whiteboard example", () => {
  const legs: Leg[] = [
    { kind: "option", type: "put", side: -1, strike: 660, qty: 1, premium: 2.0 },
    { kind: "option", type: "put", side: 1, strike: 655, qty: 1, premium: 1.2 },
  ];
  const { maxProfit, maxLoss } = payoffExtremes(legs);
  close(maxProfit.value, 80, 1e-9);
  close(maxLoss.value, 420, 1e-9);
  assert.equal(maxLoss.unbounded, false);
  assert.deepEqual(breakevens(legs), [659.2]);
});

test("covered call at $110 is a $700 profit, not a loss", () => {
  const legs: Leg[] = [
    { kind: "stock", side: 1, qty: 100, price: 100 },
    { kind: "option", type: "call", side: -1, strike: 105, qty: 1, premium: 2 },
  ];
  close(payoffAtExpiry(legs, 110), 700, 1e-9);
});

test("long call has unbounded profit and loss limited to the premium", () => {
  const legs: Leg[] = [{ kind: "option", type: "call", side: 1, strike: 100, qty: 1, premium: 2 }];
  const { maxProfit, maxLoss } = payoffExtremes(legs);
  assert.equal(maxProfit.unbounded, true);
  close(maxLoss.value, 200, 1e-9);
  assert.deepEqual(breakevens(legs), [102]);
});

test("fair premiums + forecast = IV  =>  expected value ≈ 0 before costs, for every strategy", () => {
  const market: Market = { spot: 671.24, ivMarket: 0.16, volForecast: 0.16, days: 38, rate: 0 };
  for (const s of STRATEGIES) {
    const legs = buildLegs(s.id, defaultInputs(s.id, market.spot), market);
    // Use unrounded fair prices so the identity is exact up to integration error.
    const exact = legs.map((l) =>
      l.kind === "option"
        ? { ...l, premium: blackScholes(l.type, market.spot, l.strike, market.days, 0.16, 0).price }
        : l,
    );
    const a = analyze(exact, market);
    close(a.expectedValueGross, 0, 0.6, `${s.id} EV`);
    assert.ok(a.expectedValueNet < a.expectedValueGross, `${s.id} costs reduce EV`);
  }
});

test("selling when realized vol is forecast below implied vol creates positive EV", () => {
  const market: Market = { spot: 500, ivMarket: 0.2, volForecast: 0.14, days: 30, rate: 0 };
  const legs = buildLegs("put_credit_spread", defaultInputs("put_credit_spread", 500), market);
  const a = analyze(legs, market);
  assert.ok(a.expectedValueGross > 0);
});

test("high probability of profit can coexist with negative expected value", () => {
  const market: Market = { spot: 671.24, ivMarket: 0.16, volForecast: 0.16, days: 38, rate: 0 };
  const legs: Leg[] = [
    { kind: "option", type: "put", side: -1, strike: 630, qty: 1, premium: 1.78 },
    { kind: "option", type: "put", side: 1, strike: 625, qty: 1, premium: 1.27 },
  ];
  const a = analyze(legs, market);
  assert.ok(a.probProfit > 0.85, `POP ${a.probProfit}`);
  assert.ok(a.expectedValueNet < 0, `EV ${a.expectedValueNet}`);
});
