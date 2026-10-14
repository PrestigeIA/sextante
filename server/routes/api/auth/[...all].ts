/**
 * Catch-all route exposing Better Auth's HTTP handler at /api/auth/* —
 * sign-up, sign-in, sign-out, get-session, etc. all go through here.
 *
 * This was missing from the project entirely (not something removed during
 * the Grok cleanup) — the client (`src/lib/auth/client.ts`) has always
 * POSTed to `/api/auth/sign-up/email` expecting Better Auth's server to
 * answer, but nothing in the route tree forwarded those requests to it,
 * which is why sign-up/sign-in 404'd both locally and once deployed.
 */
import { defineEventHandler } from "h3";
import { auth } from "../../../../src/lib/auth/server";

export default defineEventHandler((event) => auth.handler(event.req));
