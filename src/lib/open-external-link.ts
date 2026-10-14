/**
 * Opens a URL the "right" way for the current environment:
 *   - Web (browser tab): normal same-tab navigation.
 *   - Native app (Capacitor): plain navigation, which Capacitor's own WebView
 *     hands off to the REAL system Safari app for any domain outside
 *     capacitor.config.ts's allowNavigation list — no plugin needed. This
 *     matters for more than UX: Apple's External Purchase Link rules (US
 *     storefront) require payment links to leave the app into the actual
 *     system browser. @capacitor/browser's Browser.open() does NOT satisfy
 *     this — on iOS it presents an in-app SFSafariViewController sheet,
 *     which Apple's review explicitly rejects for this purpose (confirmed
 *     by a real Guideline 3.1.1 rejection — see the project notes
 *     if this comment ever needs the paper trail). Do not "fix" this by
 *     reaching for that plugin again.
 */
export async function openExternalLink(url: string): Promise<void> {
  if (typeof window !== "undefined") window.location.href = url;
}
