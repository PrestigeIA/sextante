import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { passwordResetEnabled, requestPasswordReset } from "@/lib/auth/client";
import { useLocale } from "@/lib/locale";

export const Route = createFileRoute("/esqueci-senha")({ component: ForgotPasswordPage });

const COPY = {
  pt: {
    title: "Esqueci minha senha",
    subtitle: "Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.",
    email: "E-mail",
    send: "Enviar link",
    sending: "Enviando…",
    sentTitle: "Verifique seu e-mail",
    sent: "Se existir uma conta com esse e-mail, enviamos um link para redefinir a senha. Ele vale por 1 hora. Confira também a caixa de spam.",
    error: "Não foi possível enviar agora. Aguarde um instante e tente de novo.",
    back: "Voltar para o login",
    unavailable: "A recuperação de senha ainda não está disponível. Fale com o suporte pelo contato do site.",
  },
  en: {
    title: "Forgot your password?",
    subtitle: "Enter your account email and we'll send a link to choose a new password.",
    email: "Email",
    send: "Send link",
    sending: "Sending…",
    sentTitle: "Check your email",
    sent: "If an account exists for that email, we sent a link to reset the password. It's valid for 1 hour. Check your spam folder too.",
    error: "We couldn't send it right now. Please wait a moment and try again.",
    back: "Back to sign in",
    unavailable: "Password recovery isn't available yet. Please contact support through the website.",
  },
};

function ForgotPasswordPage() {
  const locale = useLocale((s) => s.locale);
  const t = COPY[locale];
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch {
      setError(t.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div className="space-y-1">
        <h1 className="text-[26px] font-bold">{sent ? t.sentTitle : t.title}</h1>
        <p className="text-sm text-muted-foreground">
          {!passwordResetEnabled ? t.unavailable : sent ? t.sent : t.subtitle}
        </p>
      </div>
      {passwordResetEnabled && !sent && (
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder={t.email}
            aria-label={t.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-xl border border-input bg-background px-3 text-[15px] text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
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
            {busy ? t.sending : t.send}
          </button>
        </form>
      )}
      <Link to="/login" className="block text-center text-sm underline-offset-4 opacity-80 hover:underline">
        {t.back}
      </Link>
    </div>
  );
}
