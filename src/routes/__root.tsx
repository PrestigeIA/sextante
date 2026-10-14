import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";
import { AuthProvider } from "@/lib/auth/provider";
import { NativeStatusBar } from "@/components/native-status-bar";
import { NativePurchasesInit } from "@/components/native-purchases-init";
import { Shell } from "@/components/shell";
import appCss from "../styles.css?url";

const APP_NAME = "Sextante";
const DESCRIPTION =
  "Aprenda e simule opções americanas em português: payoff, gregas, probabilidade e valor esperado depois dos custos.";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: `${APP_NAME} — opções com precisão, não com palpite` },
      { name: "theme-color", content: "#0a0d12" },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: `${APP_NAME} — opções com precisão, não com palpite` },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/og.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/icon-192.png" },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <AuthProvider>
          <Shell>
            <NativeStatusBar />
            <NativePurchasesInit />
            <Analytics />
            <Outlet />
          </Shell>
          <Toaster theme="dark" position="top-center" toastOptions={{ className: "font-sans" }} />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
