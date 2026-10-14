import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "./auth/middleware";
import { getSql } from "./db";
import { FREE_LIMITS } from "./access";

export type SimulationPayload = {
  strategy: string;
  underlying: string;
  spot: number;
  ivMarket: number;
  volForecast: number;
  days: number;
  strike: number;
  width: number;
  callStrike: number;
  contracts: number;
  premiums: Record<string, number>;
  /** Snapshot of the headline numbers at save time, for the home screen. */
  snapshot: {
    openingCashFlow: number;
    maxProfit: number | null;
    maxLoss: number | null;
    probProfit: number;
    expectedValueNet: number;
    legsText: string;
  };
};

export type SavedSimulation = {
  id: string;
  name: string;
  strategy: string;
  createdAt: string;
  payload: SimulationPayload;
};

const payloadSchema = z.object({
  strategy: z.string().max(40),
  underlying: z.string().max(12),
  spot: z.number().positive().max(1e6),
  ivMarket: z.number().min(0).max(5),
  volForecast: z.number().min(0).max(5),
  days: z.number().min(0).max(2000),
  strike: z.number().min(0).max(1e6),
  width: z.number().min(0).max(1e5),
  callStrike: z.number().min(0).max(1e6),
  contracts: z.number().int().min(1).max(10000),
  premiums: z.record(z.string(), z.number().min(0).max(1e6)),
  snapshot: z.object({
    openingCashFlow: z.number(),
    maxProfit: z.number().nullable(),
    maxLoss: z.number().nullable(),
    probProfit: z.number(),
    expectedValueNet: z.number(),
    legsText: z.string().max(160),
  }),
});

export const listSimulations = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<SavedSimulation[]> => {
    const sql = await getSql();
    const rows = await sql<{ id: string; name: string; strategy: string; created_at: string; payload: SimulationPayload }>`
      select "id", "name", "strategy", "created_at", "payload" from "sextante_simulation"
      where "user_id" = ${context.userId} order by "created_at" desc limit 50
    `;
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      strategy: r.strategy,
      createdAt: new Date(r.created_at).toISOString(),
      payload: typeof r.payload === "string" ? JSON.parse(r.payload) : r.payload,
    }));
  });

export const saveSimulation = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { name: string; payload: SimulationPayload }) =>
    z.object({ name: z.string().trim().min(1).max(80), payload: payloadSchema }).parse(input),
  )
  .handler(async ({ context, data }): Promise<{ id: string }> => {
    const sql = await getSql();
    const { isProUser } = await import("./billing/entitlement.server");
    if (!(await isProUser(context.userId))) {
      const [{ n }] = await sql<{ n: number }>`
        select count(*)::int as "n" from "sextante_simulation" where "user_id" = ${context.userId}
      `;
      if (n >= FREE_LIMITS.simulations) throw new Error("FREE_LIMIT_SIMULATIONS");
    }
    const id = `sim_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    await sql`
      insert into "sextante_simulation" ("id", "user_id", "name", "strategy", "payload")
      values (${id}, ${context.userId}, ${data.name}, ${data.payload.strategy}, ${JSON.stringify(data.payload)}::jsonb)
    `;
    return { id };
  });

export const deleteSimulation = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => z.object({ id: z.string().min(1) }).parse(input))
  .handler(async ({ context, data }): Promise<void> => {
    const sql = await getSql();
    await sql`delete from "sextante_simulation" where "id" = ${data.id} and "user_id" = ${context.userId}`;
  });
