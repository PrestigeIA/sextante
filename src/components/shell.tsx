import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, ChartLine, House, NotebookPen, UserRound } from "lucide-react";
import { SextanteMark } from "@/components/mark";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useAccess } from "@/lib/use-access";
import { cn } from "@/lib/utils";

const APP_NAV = [
  { to: "/", label: "Início", icon: House },
  { to: "/simulador", label: "Simular", icon: ChartLine },
  { to: "/diario", label: "Diário", icon: NotebookPen },
  { to: "/academia", label: "Academia", icon: BookOpen },
  { to: "/conta", label: "Conta", icon: UserRound },
] as const;

function isActive(pathname: string, to: string) {
  return to === "/" ? pathname === "/" : pathname.startsWith(to);
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, isPending } = useCurrentUserState();
  const { pro } = useAccess();
  const visitor = !isPending && !user;

  return (
    <div className="relative flex min-h-dvh flex-col bg-background text-foreground">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Sextante, início">
            <SextanteMark className="size-8" />
            <span className="text-lg font-bold tracking-tight">Sextante</span>
          </Link>

          <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
            {(visitor
              ? [
                  { to: "/simulador", label: "Simulador" },
                  { to: "/academia", label: "Academia" },
                  { to: "/precos", label: "Preços" },
                ]
              : APP_NAV.slice(0, 4).map((n) => ({ to: n.to, label: n.label === "Simular" ? "Simulador" : n.label }))
            ).map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex h-11 items-center rounded-lg px-3 text-sm font-medium transition-colors",
                  isActive(pathname, item.to) ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {isPending ? null : user ? (
              <>
                {pro ? (
                  <span className="hidden rounded-md border border-brass-border px-2 py-1 text-xs font-semibold text-brass sm:inline">
                    PRO
                  </span>
                ) : (
                  <Link
                    to="/assinatura"
                    className="hidden h-11 items-center rounded-lg border border-brass-border px-3 text-sm font-semibold text-brass sm:flex"
                  >
                    Seja Pro
                  </Link>
                )}
                <Link
                  to="/conta"
                  aria-label="Minha conta"
                  className="grid size-11 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
                >
                  {(user.displayName ?? user.primaryEmail ?? "?").trim().charAt(0).toUpperCase()}
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex h-11 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Entrar
                </Link>
                <Link
                  to="/login"
                  search={{ modo: "criar" }}
                  className="hidden h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground sm:flex"
                >
                  Criar conta grátis
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="conteudo" className="relative mx-auto w-full max-w-6xl flex-1 px-4 pb-32 pt-6 md:px-6 md:pb-16 md:pt-10">
        {children}
      </main>

      <footer className="mx-auto w-full max-w-6xl px-4 pb-28 md:px-6 md:pb-10">
        <div className="border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
          <p>
            Sextante é uma ferramenta educacional e de simulação. Não recomenda, não intermedeia e não executa
            operações, e não é consultoria de investimentos. Opções envolvem risco elevado, inclusive de perda total
            do capital aplicado.
          </p>
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            <Link to="/termos" className="underline underline-offset-2 hover:text-foreground">
              Termos de Uso
            </Link>
            <Link to="/privacidade" className="underline underline-offset-2 hover:text-foreground">
              Privacidade
            </Link>
            <Link to="/suporte" className="underline underline-offset-2 hover:text-foreground">
              Suporte
            </Link>
          </p>
        </div>
      </footer>

      <nav
        aria-label="Navegação do app"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <ul className="grid grid-cols-5">
          {APP_NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.to);
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-[22px]" strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
