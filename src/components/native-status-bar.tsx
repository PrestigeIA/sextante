import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * Makes the iOS/Android status bar blend with the app instead of showing as
 * a default black bar. Native-only — a no-op on web, where the browser
 * chrome isn't ours to style anyway.
 */
export function NativeStatusBar() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    void (async () => {
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        await StatusBar.setStyle({ style: Style.Dark }); // light text/icons on the dark app background
        await StatusBar.setBackgroundColor({ color: "#0a0d12" }); // Android only; iOS follows the webview bg
        await StatusBar.setOverlaysWebView({ overlay: false });
      } catch {
        /* status bar plugin not available in this build — safe to ignore */
      }
    })();
  }, []);

  return null;
}
