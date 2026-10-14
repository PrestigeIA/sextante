import { createAuthClient } from "better-auth/react";

/**
 * Better Auth client for this React SPA (browser-side).
 * Talks to this app's own Better Auth at same-origin `/api/auth/*`.
 */
export const authClient = createAuthClient();

/**
 * "Forgot password" is shown only when VITE_PASSWORD_RESET_ENABLED=true at build
 * time. Turn it on once RESEND_API_KEY is set and the sending domain is
 * verified — otherwise users would be told to check an email that never comes.
 */
export const passwordResetEnabled = import.meta.env.VITE_PASSWORD_RESET_ENABLED === "true";

/** True when sign-in UI should be shown. */
export const authEnabled = import.meta.env.VITE_AUTH_ENABLED !== "false";

/** Error carrying Better Auth's machine-readable `code` so forms can translate it. */
export class AuthError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

function authError(error: { message?: string; code?: string }, fallback: string): AuthError {
  return new AuthError(error.message ?? fallback, error.code);
}

export async function signUpWithEmail(
  email: string,
  password: string,
  name: string,
): Promise<void> {
  const { error } = await authClient.signUp.email({ email, password, name });
  if (error) throw authError(error, "Sign-up failed");
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const { error } = await authClient.signIn.email({ email, password });
  if (error) throw authError(error, "Sign-in failed");
}

export async function signOut(redirectTo = "/"): Promise<void> {
  const { error } = await authClient.signOut();
  if (error) throw new Error(error.message ?? "Sign-out failed");
  // This browser's cached cases/alerts belong to the account that just
  // signed out — clear them so the next visitor (or the same person signed
  // out) doesn't see someone else's data.
  if (typeof window !== "undefined") window.location.href = redirectTo;
}

/**
 * Ask the server to email a reset link. The server answers the same way
 * whether or not the address has an account (no account enumeration), so this
 * only throws on network/rate-limit failures.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const redirectTo = `${window.location.origin}/redefinir-senha`;
  const { error } = await authClient.requestPasswordReset({ email, redirectTo });
  if (error) throw authError(error, "Request failed");
}

/** Set a new password using the token from the emailed link. */
export async function resetPasswordWithToken(newPassword: string, token: string): Promise<void> {
  const { error } = await authClient.resetPassword({ newPassword, token });
  if (error) throw authError(error, "Reset failed");
}
