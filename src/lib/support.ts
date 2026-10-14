import { createServerFn } from "@tanstack/react-start";
import { getSql } from "./db";
import { authMiddleware } from "./auth/middleware";

function nid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const sendSupportMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { email: string; subject: string; body: string }) => input)
  .handler(async ({ context, data }): Promise<void> => {
    const sql = await getSql();
    await sql`
      insert into "sextante_support_message" ("id", "user_id", "email", "subject", "body")
      values (${nid("support")}, ${context.userId}, ${data.email}, ${data.subject}, ${data.body})
    `;
    // TODO: once an email provider (e.g. Resend) is configured, also send a
    // notification here so support requests don't require checking the DB.
  });
