import { getSql } from "../db";

/** Statuses that grant Pro features. `past_due` keeps access during the store's grace period. */
const PRO_STATUSES = new Set(["trialing", "active", "past_due"]);

/** Server-side source of truth for "is this user Pro?". Never trust the client for this. */
export async function isProUser(userId: string): Promise<boolean> {
  const sql = await getSql();
  const [row] = await sql<{ status: string; current_period_end: string | null }>`
    select "status", "current_period_end" from "sextante_subscription" where "user_id" = ${userId}
  `;
  if (!row || !PRO_STATUSES.has(row.status)) return false;
  // A canceled store subscription keeps working until the period it paid for ends.
  return true;
}
