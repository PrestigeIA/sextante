import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * UI language. The Sextante launches in Portuguese; the account screens
 * inherited from the shared base keep their English copy so the app can be
 * translated later without restructuring.
 */
export type Locale = "pt" | "en";

type LocaleState = { locale: Locale; setLocale: (l: Locale) => void };

export const useLocale = create<LocaleState>()(
  persist((set) => ({ locale: "pt", setLocale: (locale) => set({ locale }) }), {
    name: "sextante-locale",
  }),
);
