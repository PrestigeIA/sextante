import { createFileRoute } from "@tanstack/react-router";
import { EmailPasswordForm, RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { SextanteMark } from "@/components/mark";

type Search = { modo?: "criar" };

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): Search => (s.modo === "criar" ? { modo: "criar" } : {}),
  head: () => ({ meta: [{ title: "Entrar — Sextante" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { modo } = Route.useSearch();
  const { user, isPending } = useCurrentUserState();

  if (isPending) return null;
  if (user) return <RedirectToSignIn to="/" />;

  const signup = modo === "criar";
  return (
    <div className="mx-auto max-w-sm space-y-6 pt-4">
      <div className="space-y-3">
        <SextanteMark className="size-12" />
        <h1 className="text-[26px] font-bold leading-tight">{signup ? "Crie sua conta grátis" : "Entrar no Sextante"}</h1>
        <p className="text-sm text-muted-foreground">
          {signup
            ? "Salve simulações, registre operações no Diário e acompanhe seu progresso na Academia."
            : "Acesse seu Diário, suas simulações e sua assinatura."}
        </p>
      </div>
      <EmailPasswordForm key={signup ? "signup" : "signin"} initialMode={signup ? "signup" : "signin"} />
    </div>
  );
}
