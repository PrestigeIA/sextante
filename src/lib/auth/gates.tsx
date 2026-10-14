import { useState, type ReactNode } from "react";
import { Navigate, Link } from "@tanstack/react-router";
import { AuthError, authEnabled, passwordResetEnabled, signInWithEmail, signOut, signUpWithEmail } from "./client";
import { useLocale } from "../locale";
import { useCurrentUser, useCurrentUserState } from "./use-current-user";

/** Where `RedirectToSignIn` sends signed-out visitors. Create this route. */
export const SIGN_IN_PATH = "/login";

/** Render children only when a user is present (real session, or the disabled-auth dev user). */
export function SignedIn({ children }: { children: ReactNode }) {
  const { user } = useCurrentUserState();
  return user ? <>{children}</> : null;
}

/**
 * Render children only once we KNOW the visitor is signed out (`isPending` has
 * cleared and there is no user). Hidden while the session is still loading.
 */
export function SignedOut({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending || user) return null;
  return <>{children}</>;
}

/** Client-side redirect to the sign-in route. */
export function RedirectToSignIn({ to = SIGN_IN_PATH }: { to?: string }) {
  return <Navigate to={to} />;
}

export function SignInGate({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return null;
  if (user) return <>{children}</>;
  return <>{fallback ?? <EmailPasswordForm />}</>;
}

const FORM_COPY = {
  pt: {
    name: "Nome",
    email: "E-mail",
    password: "Senha",
    signIn: "Entrar",
    signUp: "Criar conta",
    forgot: "Esqueci minha senha",
    toSignUp: "Novo por aqui? Criar uma conta",
    toSignIn: "Já tem conta? Entrar",
    generic: "Algo deu errado. Tente novamente.",
    errors: {
      INVALID_EMAIL_OR_PASSWORD: "E-mail ou senha incorretos.",
      INVALID_EMAIL: "E-mail inválido.",
      INVALID_PASSWORD: "Senha incorreta.",
      PASSWORD_TOO_SHORT: "A senha precisa ter pelo menos 8 caracteres.",
      USER_ALREADY_EXISTS: "Já existe uma conta com esse e-mail. Tente entrar.",
      USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Já existe uma conta com esse e-mail. Tente entrar.",
    } as Record<string, string>,
  },
  en: {
    name: "Name",
    email: "Email",
    password: "Password",
    signIn: "Sign in",
    signUp: "Create account",
    forgot: "Forgot your password?",
    toSignUp: "New here? Create an account",
    toSignIn: "Already have an account? Sign in",
    generic: "Something went wrong. Please try again.",
    errors: {
      INVALID_EMAIL_OR_PASSWORD: "Incorrect email or password.",
      INVALID_EMAIL: "Invalid email.",
      INVALID_PASSWORD: "Incorrect password.",
      PASSWORD_TOO_SHORT: "Password must be at least 8 characters.",
      USER_ALREADY_EXISTS: "An account with this email already exists. Try signing in.",
      USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "An account with this email already exists. Try signing in.",
    } as Record<string, string>,
  },
};

/** Minimal email/password sign-in + sign-up form. Restyle freely. */
export function EmailPasswordForm({ initialMode = "signin" }: { initialMode?: "signin" | "signup" } = {}) {
  const locale = useLocale((s) => s.locale);
  const t = FORM_COPY[locale];
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        await signUpWithEmail(email, password, name || email);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      const code = err instanceof AuthError ? err.code : undefined;
      setError((code && t.errors[code]) || t.generic);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-3">
      {mode === "signup" && (
        <input
          type="text"
          placeholder={t.name}
          aria-label={t.name}
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-12 rounded-xl border border-input bg-background px-3 text-[15px] text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      )}
      <input
        type="email"
        required
        placeholder={t.email}
        aria-label={t.email}
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="h-12 rounded-xl border border-input bg-background px-3 text-[15px] text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <input
        type="password"
        required
        placeholder={mode === "signup" ? `${t.password} (mín. 8 caracteres)` : t.password}
        aria-label={t.password}
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="h-12 rounded-xl border border-input bg-background px-3 text-[15px] text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
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
        {busy ? "…" : mode === "signup" ? t.signUp : t.signIn}
      </button>
      {mode === "signin" && passwordResetEnabled && (
        <Link
          to="/esqueci-senha"
          className="flex min-h-11 items-center justify-center text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {t.forgot}
        </Link>
      )}
      <button
        type="button"
        onClick={() => {
          setError(null);
          setMode(mode === "signup" ? "signin" : "signup");
        }}
        className="min-h-11 text-sm font-semibold text-brass underline-offset-4 hover:underline"
      >
        {mode === "signup" ? t.toSignIn : t.toSignUp}
      </button>
    </form>
  );
}

/** Minimal signed-in identity chip + sign-out. Restyle freely. */
export function UserButton() {
  const user = useCurrentUser();
  const [signingOut, setSigningOut] = useState(false);
  if (!user) return null;
  const label = user.displayName ?? user.primaryEmail ?? "Account";
  return (
    <div className="flex items-center gap-2">
      <Link to="/conta" className="flex items-center gap-2">
        {user.profileImageUrl ? (
          <img src={user.profileImageUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <span className="grid h-8 w-8 place-items-center rounded-full bg-black/10 text-sm font-medium dark:bg-white/20">
            {label.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="text-sm font-medium">{label}</span>
      </Link>
      {authEnabled && (
        <button
          type="button"
          disabled={signingOut}
          onClick={() => {
            setSigningOut(true);
            void signOut().catch(() => setSigningOut(false));
          }}
          className="cursor-pointer text-sm underline-offset-4 opacity-70 hover:underline disabled:cursor-wait disabled:no-underline"
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      )}
    </div>
  );
}
