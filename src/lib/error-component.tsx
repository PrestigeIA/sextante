import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

const FALLBACK_MESSAGE = "Ocorreu um erro inesperado. Recarregue a página.";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return FALLBACK_MESSAGE;
}

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main
      className={
        "flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center " +
        "bg-background text-foreground"
      }
    >
      <span className="text-loss" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="text-lg font-semibold">Algo deu errado</h1>
      <p className="max-w-md text-sm break-words text-muted-foreground">
        {errorMessage(error)}
      </p>
    </main>
  );
}

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-start gap-3 py-16">
      <h1 className="text-[26px] font-bold">Página não encontrada</h1>
      <p className="text-sm text-muted-foreground">O endereço pode ter mudado ou não existe mais.</p>
      <Link to="/" className="inline-flex h-11 items-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">
        Voltar ao início
      </Link>
    </div>
  );
}
