/**
 * Transactional email via Resend's REST API (server-only, no SDK dependency).
 *
 * Env:
 *   RESEND_API_KEY  required to actually send (store as a Sensitive var in Vercel)
 *   EMAIL_FROM      optional, default "Sextante <no-reply@SEU-DOMINIO>" — the domain
 *                   must be verified in Resend (SPF + DKIM) or mail lands in spam.
 *
 * Never throws: callers (auth flows) must not break or leak whether an
 * address exists. Logs only a status — never the recipient, body or links.
 */
import { env } from "../env.server";

export function isEmailConfigured(): boolean {
  return Boolean(env("RESEND_API_KEY"));
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendEmailResult {
  ok: boolean;
  error?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = env("RESEND_API_KEY");
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — email not sent");
    return { ok: false, error: "not_configured" };
  }
  const from = env("EMAIL_FROM") ?? "Sextante <no-reply@SEU-DOMINIO>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error(`[email] provider rejected the message (HTTP ${res.status})`);
      return { ok: false, error: `http_${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] send failed:", err instanceof Error ? err.name : "unknown error");
    return { ok: false, error: "network" };
  }
}
