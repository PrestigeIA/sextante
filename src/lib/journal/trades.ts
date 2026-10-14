import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "../auth/middleware";
import { getSql } from "../db";
import { FREE_LIMITS } from "../access";
import type { Trade } from "./metrics";

function nid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");
const money = z.number().finite().min(0).max(10_000_000);

const tradeInput = z.object({
  account: z.enum(["paper", "real"]),
  strategy: z.string().trim().min(1).max(60),
  underlying: z.string().trim().min(1).max(12).transform((s) => s.toUpperCase()),
  legsText: z.string().trim().max(120).default(""),
  direction: z.enum(["credit", "debit"]),
  contracts: z.number().int().min(1).max(10_000),
  entryPrice: money,
  maxRisk: money,
  fees: money.default(0),
  openedAt: isoDate,
  expiresAt: isoDate.nullable(),
  followedPlan: z.boolean().default(true),
  notes: z.string().trim().max(2000).default(""),
});

export type TradeInput = z.input<typeof tradeInput>;

type Row = {
  id: string;
  account: "paper" | "real";
  strategy: string;
  underlying: string;
  legs_text: string;
  direction: "credit" | "debit";
  contracts: number;
  entry_price: number;
  max_risk: number;
  fees: number;
  opened_at: string;
  expires_at: string | null;
  status: "open" | "closed";
  mark_price: number | null;
  exit_price: number | null;
  closed_at: string | null;
  followed_plan: boolean;
  notes: string;
};

const SELECT = `
  select "id", "account", "strategy", "underlying", "legs_text", "direction", "contracts",
         "entry_price"::float8 as "entry_price", "max_risk"::float8 as "max_risk", "fees"::float8 as "fees",
         "opened_at", "expires_at", "status", "mark_price"::float8 as "mark_price",
         "exit_price"::float8 as "exit_price", "closed_at", "followed_plan", "notes"
  from "sextante_trade"`;

function toTrade(r: Row): Trade {
  return {
    id: r.id,
    account: r.account,
    strategy: r.strategy,
    underlying: r.underlying,
    legsText: r.legs_text,
    direction: r.direction,
    contracts: Number(r.contracts),
    entryPrice: Number(r.entry_price),
    maxRisk: Number(r.max_risk),
    fees: Number(r.fees),
    openedAt: r.opened_at,
    expiresAt: r.expires_at,
    status: r.status,
    markPrice: r.mark_price === null ? null : Number(r.mark_price),
    exitPrice: r.exit_price === null ? null : Number(r.exit_price),
    closedAt: r.closed_at,
    followedPlan: r.followed_plan,
    notes: r.notes,
  };
}

export const listTrades = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Trade[]> => {
    const sql = await getSql();
    const rows = await sql.query<Row>(
      `${SELECT} where "user_id" = $1 order by "opened_at" desc, "created_at" desc`,
      [context.userId],
    );
    return rows.map(toTrade);
  });

export const createTrade = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: TradeInput) => tradeInput.parse(input))
  .handler(async ({ context, data }): Promise<{ id: string }> => {
    const sql = await getSql();
    const { isProUser } = await import("../billing/entitlement.server");
    if (!(await isProUser(context.userId))) {
      const [{ n }] = await sql<{ n: number }>`
        select count(*)::int as "n" from "sextante_trade" where "user_id" = ${context.userId}
      `;
      if (n >= FREE_LIMITS.trades) throw new Error("FREE_LIMIT_TRADES");
    }
    const id = nid("trd");
    await sql`
      insert into "sextante_trade"
        ("id", "user_id", "account", "strategy", "underlying", "legs_text", "direction", "contracts",
         "entry_price", "max_risk", "fees", "opened_at", "expires_at", "followed_plan", "notes")
      values
        (${id}, ${context.userId}, ${data.account}, ${data.strategy}, ${data.underlying}, ${data.legsText},
         ${data.direction}, ${data.contracts}, ${data.entryPrice}, ${data.maxRisk}, ${data.fees},
         ${data.openedAt}, ${data.expiresAt}, ${data.followedPlan}, ${data.notes})
    `;
    return { id };
  });

const updateInput = z.discriminatedUnion("action", [
  z.object({ action: z.literal("mark"), id: z.string().min(1), markPrice: money.nullable() }),
  z.object({
    action: z.literal("close"),
    id: z.string().min(1),
    exitPrice: money,
    closedAt: isoDate,
    extraFees: money.default(0),
    followedPlan: z.boolean(),
  }),
  z.object({ action: z.literal("reopen"), id: z.string().min(1) }),
]);

export const updateTrade = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: z.input<typeof updateInput>) => updateInput.parse(input))
  .handler(async ({ context, data }): Promise<void> => {
    const sql = await getSql();
    if (data.action === "mark") {
      await sql`
        update "sextante_trade" set "mark_price" = ${data.markPrice}, "updated_at" = current_timestamp
        where "id" = ${data.id} and "user_id" = ${context.userId} and "status" = 'open'
      `;
    } else if (data.action === "close") {
      await sql`
        update "sextante_trade" set
          "status" = 'closed', "exit_price" = ${data.exitPrice}, "closed_at" = ${data.closedAt},
          "fees" = "fees" + ${data.extraFees}, "followed_plan" = ${data.followedPlan},
          "mark_price" = null, "updated_at" = current_timestamp
        where "id" = ${data.id} and "user_id" = ${context.userId}
      `;
    } else {
      await sql`
        update "sextante_trade" set "status" = 'open', "exit_price" = null, "closed_at" = null,
          "updated_at" = current_timestamp
        where "id" = ${data.id} and "user_id" = ${context.userId}
      `;
    }
  });

export const deleteTrade = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => z.object({ id: z.string().min(1) }).parse(input))
  .handler(async ({ context, data }): Promise<void> => {
    const sql = await getSql();
    await sql`delete from "sextante_trade" where "id" = ${data.id} and "user_id" = ${context.userId}`;
  });
