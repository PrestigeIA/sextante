import type { CapacitorConfig } from "@capacitor/core";

/**
 * Native shells (iOS + Android) around the live Sextante site — the same
 * server.url approach: the app needs its server (auth, database,
 * subscription) on every screen, so the webview points at the real deployment.
 *
 * SEXTANTE_APP_URL must be the CANONICAL host (no redirect in between): a
 * cross-host redirect from server.url shows as a blank white screen in
 * WKWebView. Set it before `npx cap sync`.
 */
const appUrl = process.env.SEXTANTE_APP_URL ?? "https://www.SEU-DOMINIO.com";
const host = new URL(appUrl).hostname;

const config: CapacitorConfig = {
  appId: "com.prestigeia.sextante",
  appName: "Sextante",
  webDir: "dist", // unused in server.url mode, but required by the CLI
  backgroundColor: "#0a0d12",
  server: {
    url: appUrl,
    cleartext: false,
    allowNavigation: [host, host.replace(/^www\./, ""), "*.vercel.app"],
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#0a0d12",
  },
  android: {
    backgroundColor: "#0a0d12",
  },
};

export default config;
