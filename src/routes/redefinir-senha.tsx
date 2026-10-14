import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthError, resetPasswordWithToken } from "@/lib/auth/client";
import { useLocale } from "@/lib/locale";

export const Route = createFileRoute("/redefinir-senha")({ component: ResetPasswordPage });

const COPY = {
  pt: {
    title: "Criar nova senha",
    subtitle: "Escolha uma nova senha para entrar no Sextante.",
    password: "Nova senha",
    confirm: "Repita a nova senha",
    hint: "Mínimo de 8 caracteres.",
    save: "Salvar nova senha",
    saving: "Salvando…",
    mismatch: "As senhas não são iguais.",
    tooShort: "A senha precisa ter pelo menos 8 caracteres.",
    invalidTitle: "Link inválido ou expirado",
    invalid: "Este link não vale mais. Peça um novo para continuar.",
    requestNew: "Pedir novo link",
    doneTitle: "Senha alterada",
    done: "Pronto. Entre com a nova senha. Por segurança, você foi desconectado dos outros aparelhos.",
    signIn: "Ir para o login",
    error: "Não foi possível salvar a senha. Tente novamente ou peça um novo link.",
  },
  en: {
    title: "Choose a new password",
    subtitle: "Pick a new password to sign in to Sextante.",
    password: "New password",
    confirm: "Repeat the new password",
    hint: "At least 8 characters.",
    save: "Save new password",
    saving: "Saving…",
    mismatch: "The passwords don't match.",
    tooShort: "Password must be at least 8 characters.",
    invalidTitle: "Invalid or expired link",
    invalid: "This link is no longer valid. Request a new one to continue.",
    requestNew: "Request a new link",
    doneTitle: "Password changed",
    done: "All set. Sign in with your new password. For security, you were signed out of your other devices.",
    signIn: "Go to sign in",
    error: "We couldn't save the password. Try again or request a new link.",
  },
};

function ResetPasswordPage() {
  const locale = useLocale((s) => s.locale);
  const t = COPY[locale];
  // The token arrives in the query string (?token=… from the emailed link).
  // `undefined` = not read yet (SSR / first paint); `null` = missing or invalid.
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const tk = q.get("token");
    setToken(q.get("error") || !tk ? null : tk);
    // Don't leave the one-time token sitting in the address bar / history.
    if (tk) window.history.replaceState(null, "", window.location.pathname);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError(t.tooShort);
    if (password !== confirm) return setError(t.mismatch);
    if (!token) return;
    setBusy(true);
    try {
      await resetPasswordWithToken(password, token);
      setDone(true);
    } catch (err) {
      if (err instanceof AuthError && err.code === "INVALID_TOKEN") setToken(null);
      else setError(t.error);
    } finally {
      setBusy(false);
    }
  }

  if (token === undefined) return null;

  if (token === null) {
    return (
      <div className="mx-auto max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-[26px] font-bold">{t.invalidTitle}</h1>
          <p className="text-sm text-muted-foreground">{t.invalid}</p>
        </div>
        <Link
          to="/esqueci-senha"
          className="block w-full rounded-md bg-black px-4 py-2 text-center text-white dark:bg-white dark:text-black"
        >
          {t.requestNew}
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-[26px] font-bold">{t.doneTitle}</h1>
          <p className="text-sm text-muted-foreground">{t.done}</p>
        </div>
        <Link
          to="/login"
          className="block w-full rounded-md bg-black px-4 py-2 text-center text-white dark:bg-white dark:text-black"
        >
          {t.signIn}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div className="space-y-1">
        <h1 className="text-[26px] font-bold">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder={t.password}
          aria-label={t.password}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-12 rounded-xl border border-input bg-background px-3 text-[15px] text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder={t.confirm}
          aria-label={t.confirm}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="h-12 rounded-xl border border-input bg-background px-3 text-[15px] text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <p className="text-xs text-muted-foreground">{t.hint}</p>
        {error && (
          <p role="alert" className="text-sm text-loss">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="h-12 w-full cursor-pointer rounded-xl bg-primary px-4 text-[15px] font-bold text-primary-foreground disabled:opacity-60"
        >
          {busy ? t.saving : t.save}
        </button>
      </form>
    </div>
  );
}
