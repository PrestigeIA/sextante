import { test } from "node:test";
import assert from "node:assert/strict";
import { realizedNet, summarize, type Trade } from "./metrics.ts";

function t(over: Partial<Trade>): Trade {
  return {
    id: Math.random().toString(36),
    account: "paper",
    strategy: "put_credit_spread",
    underlying: "XSP",
    legsText: "",
    direction: "credit",
    contracts: 1,
    entryPrice: 0.8,
    maxRisk: 420,
    fees: 0,
    openedAt: "2026-09-01",
    expiresAt: null,
    status: "closed",
    markPrice: null,
    exitPrice: 0,
    closedAt: "2026-09-10",
    followedPlan: true,
    notes: "",
    ...over,
  };
}

test("credit trade expiring worthless keeps the full credit, minus fees", () => {
  assert.equal(realizedNet(t({ fees: 6 })), 74);
});

test("debit trade sold higher is a gain", () => {
  assert.equal(realizedNet(t({ direction: "debit", entryPrice: 2, exitPrice: 3.5, contracts: 2 })), 300);
});

test("summary: win rate, profit factor and drawdown", () => {
  const s = summarize([
    t({ exitPrice: 0, closedAt: "2026-09-01" }), // +80
    t({ exitPrice: 5, closedAt: "2026-09-02" }), // −420
    t({ exitPrice: 0.2, closedAt: "2026-09-03" }), // +60
    t({ status: "open", exitPrice: null, closedAt: null, markPrice: 0.5 }), // +30 unrealized
  ]);
  assert.equal(s.closedCount, 3);
  assert.equal(s.openCount, 1);
  assert.equal(s.wins, 2);
  assert.ok(Math.abs((s.winRate ?? 0) - 2 / 3) < 1e-12);
  assert.ok(Math.abs((s.profitFactor ?? 0) - 140 / 420) < 1e-12);
  assert.equal(s.maxDrawdown, 420);
  assert.ok(Math.abs(s.unrealized - 30) < 1e-9);
  assert.ok(Math.abs(s.netResult - (80 - 420 + 60 + 30)) < 1e-9);
});
