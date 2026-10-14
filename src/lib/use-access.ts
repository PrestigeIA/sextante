import { useEffect } from "react";
import { create } from "zustand";
import { getAccess, type Access } from "./access";
import { useCurrentUserState } from "./auth/use-current-user";

type AccessState = {
  access: Access | null;
  /** user id the cached access belongs to ("" = signed out). */
  forUser: string | null;
  set: (a: Access, forUser: string) => void;
};

const useAccessStore = create<AccessState>((set) => ({
  access: null,
  forUser: null,
  set: (access, forUser) => set({ access, forUser }),
}));

/** Re-fetch access (call after a purchase or sign-in). */
export async function refreshAccess(userId: string | null): Promise<Access> {
  const a = await getAccess();
  useAccessStore.getState().set(a, userId ?? "");
  return a;
}

/**
 * Client view of the plan. `loading` until the first answer for the current
 * user. Pro limits are enforced again on the server for every write.
 */
export function useAccess(): { loading: boolean; signedIn: boolean; pro: boolean } {
  const { user, isPending } = useCurrentUserState();
  const access = useAccessStore((s) => s.access);
  const forUser = useAccessStore((s) => s.forUser);
  const key = user?.id ?? "";

  useEffect(() => {
    if (isPending || forUser === key) return;
    void refreshAccess(user?.id ?? null).catch(() => {
      useAccessStore.getState().set({ signedIn: Boolean(user), pro: false }, key);
    });
  }, [isPending, forUser, key, user]);

  if (isPending || forUser !== key || !access) {
    return { loading: true, signedIn: Boolean(user), pro: false };
  }
  return { loading: false, signedIn: access.signedIn, pro: access.pro };
}
