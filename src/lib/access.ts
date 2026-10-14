import { createServerFn } from "@tanstack/react-start";

/** Free-plan limits, enforced on the server. */
export const FREE_LIMITS = {
  trades: 5,
  simulations: 3,
} as const;

export type Access = { signedIn: boolean; pro: boolean };

/**
 * Who is asking and what they may use. Works signed out (returns
 * `{ signedIn: false, pro: false }`) so public pages like the simulator can
 * call it without forcing a login.
 */
export const getAccess = createServerFn({ method: "GET" }).handler(async (): Promise<Access> => {
  const { getSessionUser } = await import("./auth/verify.server");
  const user = await getSessionUser();
  if (!user) return { signedIn: false, pro: false };
  const { isProUser } = await import("./billing/entitlement.server");
  return { signedIn: true, pro: await isProUser(user.id) };
});
