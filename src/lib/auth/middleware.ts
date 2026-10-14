import { createMiddleware } from "@tanstack/react-start";

/**
 * Auth middleware for server functions — the standard way to get the caller's
 * verified user id. The session cookie is same-origin and rides along
 * automatically with every request.
 *
 *   import { createServerFn } from "@tanstack/react-start";
 *   import { getSql } from "@/lib/db";
 *   import { authMiddleware } from "@/lib/auth/middleware";
 *
 *   export const listTodos = createServerFn({ method: "GET" })
 *     .middleware([authMiddleware])
 *     .handler(async ({ context }) => {
 *       const sql = await getSql();
 *       return sql`select * from todos where user_id = ${context.userId}`;
 *     });
 *
 * Signed out with auth on -> throws `UnauthorizedError` (see `verify.server.ts`).
 * With auth disabled (`VITE_AUTH_ENABLED=false`) it resolves the shared dev
 * user — but throws instead when a `DATABASE_URL` is also set, so an app
 * without sign-in must not use this at all. On the auth-on path, use it on
 * every server function that touches per-user data and scope every query by
 * `context.userId`.
 */
export const authMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const { requireUserId } = await import("./verify.server");
    const userId = await requireUserId();
    return next({ context: { userId } });
  },
);
