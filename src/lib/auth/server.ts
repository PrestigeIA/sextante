/**
 * Self-hosted Better Auth for the Sextante app (server-only).
 *
 * Runs its own Better Auth at `/api/auth/*` against this app's own database
 * (Postgres in production via `DATABASE_URL`, PGLite locally). No external
 * identity broker — this is a standard, portable Better Auth setup.
 *
 * Enabled today: email/password (see `./email-password`).
 * To add Google sign-in later: use Better Auth's built-in `socialProviders.google`
 * with your OWN Google OAuth client id/secret (console.cloud.google.com) —
 * do NOT reintroduce a third-party broker.
 *
 * NEVER import this from client code — it pulls in `pg` + server-only Better
 * Auth internals. The client uses `@/lib/auth/client`; components read the
 * user via `@/lib/auth/use-current-user`; server functions get a verified id
 * via `@/lib/auth/middleware`.
 */
import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { getCookie } from "@tanstack/react-start/server";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import { ensureDbReady, getPglite } from "../db";
import { emailAndPasswordEnabled } from "./email-password";
import { pgliteDialect } from "./pglite-dialect";
import { env } from "../env.server";
import { sendEmail } from "../email/send.server";
import { buildResetPasswordEmail } from "../email/reset-password-email";

// Kick (and share) PGLite bootstrap as soon as the auth server module loads.
void ensureDbReady();

/**
 * Dev secret must outlive module reloads: PGLite (and its session rows) is
 * stored on `globalThis`, so an HMR re-eval of this file must NOT mint a new
 * signing secret or every existing session becomes invalid mid-dev.
 */
const globalAuthRef = globalThis as typeof globalThis & {
  __sextanteAuthDevSecret__?: string;
};
function devAuthSecret(): string {
  globalAuthRef.__sextanteAuthDevSecret__ ??= randomBytes(32).toString("hex");
  return globalAuthRef.__sextanteAuthDevSecret__;
}

/** True when email/password sign-in is active. */
export const authConfigured = emailAndPasswordEnabled;

const explicitBaseURL = env("BETTER_AUTH_URL");
const LOCAL_DEV_ORIGINS: string[] = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://[::1]:8080",
  "http://localhost:8081",
  "http://127.0.0.1:8081",
];
// Vercel injects VERCEL_URL with the CURRENT deployment's unique URL (a new
// one every deploy, e.g. sextante-abc123-team.vercel.app) — trust it too,
// alongside the stable BETTER_AUTH_URL alias, so a visitor who lands on that
// URL right after a deploy (very common — it's what "Redeploy" opens) isn't
// rejected as an untrusted origin.
const vercelDeploymentURL = env("VERCEL_URL");

/** "https://www.foo.com" -> "https://foo.com", or vice versa — whichever it ISN'T already. */
function wwwVariant(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.startsWith("www.")) {
      u.hostname = u.hostname.slice(4);
    } else {
      u.hostname = `www.${u.hostname}`;
    }
    return u.origin;
  } catch {
    return null;
  }
}

const baseURL = explicitBaseURL ?? {
  allowedHosts: ["localhost", "127.0.0.1", "[::1]"],
  protocol: "auto" as const,
  fallback: "http://localhost:8080",
};
const trustedOrigins: string[] = explicitBaseURL
  ? [
      explicitBaseURL,
      // Trust the www/non-www sibling automatically — a domain with either a
      // root->www redirect (or the reverse) otherwise rejects real visitors
      // depending on which exact host BETTER_AUTH_URL happens to name.
      ...(wwwVariant(explicitBaseURL) ? [wwwVariant(explicitBaseURL)!] : []),
      ...(vercelDeploymentURL ? [`https://${vercelDeploymentURL}`] : []),
      ...LOCAL_DEV_ORIGINS,
    ]
  : LOCAL_DEV_ORIGINS;

const databaseUrl = env("DATABASE_URL");

// Real Postgres when `DATABASE_URL` is set (deployed), else the app's embedded
// PGLite (dev) via a Kysely dialect. Both use the Better Auth schema from
// `migrations/auth/0001_auth.sql`.
const database = databaseUrl
  ? new Pool({ connectionString: databaseUrl })
  : { dialect: pgliteDialect(() => getPglite()), type: "postgres" as const };

export const SESSION_TOKEN_COOKIE = "__Host-sextante-auth.session_token";

export const auth = betterAuth({
  baseURL,
  secret: env("BETTER_AUTH_SECRET") ?? devAuthSecret(),
  database,
  trustedOrigins,

  session: { cookieCache: { enabled: true, maxAge: 300 } },

  ...(emailAndPasswordEnabled
    ? {
        emailAndPassword: {
          enabled: true,
          // Reset links last 1 hour, work once, and a successful reset signs
          // the account out everywhere (a stolen session shouldn't survive it).
          resetPasswordTokenExpiresIn: 60 * 60,
          revokeSessionsOnPasswordReset: true,
          // Awaited (no background handler configured) so serverless doesn't
          // freeze before the email leaves. Never throws — see sendEmail.
          sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) => {
            const { subject, html, text } = buildResetPasswordEmail(url);
            await sendEmail({ to: user.email, subject, html, text });
          },
        },
      }
    : {}),

  advanced: {
    useSecureCookies: false,
    defaultCookieAttributes: { secure: true, sameSite: "lax", path: "/" },
    cookies: {
      session_token: { name: SESSION_TOKEN_COOKIE },
      session_data: { name: "__Host-sextante-auth.session_data" },
      account_data: { name: "__Host-sextante-auth.account_data" },
      dont_remember: { name: "__Host-sextante-auth.dont_remember" },
    },
  },

  plugins: [
    // Kept for parity with the client's fetch setup; harmless with cookie auth.
    bearer(),
    // Bridges Better Auth's Set-Cookie into TanStack Start responses. MUST be
    // last so it runs after every other plugin's hooks.
    tanstackStartCookies(),
  ],
});

export function readSessionToken(): string | null {
  return getCookie(SESSION_TOKEN_COOKIE) ?? null;
}
