import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { authClient, signOut } from "@/lib/auth/client";
import { deleteAccount } from "@/lib/auth/delete-account";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useLocale } from "@/lib/locale";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/conta")({ component: ContaPage });

const COPY = {
  pt: {
    title: "Minha conta",
    name: "Nome",
    email: "E-mail",
    emailNote: "O e-mail de login não pode ser trocado por aqui ainda.",
    saveName: "Salvar nome",
    nameSaved: "Nome atualizado",
    changePassword: "Trocar senha",
    currentPassword: "Senha atual",
    newPassword: "Nova senha",
    savePassword: "Atualizar senha",
    passwordSaved: "Senha atualizada",
    subscription: "Assinatura",
    manageSubscription: "Ver ou gerenciar assinatura",
    dangerZone: "Excluir conta",
    dangerBody:
      "Isso apaga sua conta, seu Diário, suas simulações e seu progresso, e cancela a assinatura feita pelo site. Assinaturas feitas pela App Store ou Google Play precisam ser canceladas na loja. Não pode ser desfeito.",
    deleteAccount: "Excluir minha conta",
    confirmPrompt: "Digite EXCLUIR para confirmar:",
    confirmPlaceholder: "EXCLUIR",
    confirmButton: "Excluir definitivamente",
    cancel: "Cancelar",
    deleting: "Excluindo…",
  },
  en: {
    title: "My account",
    name: "Name",
    email: "Email",
    emailNote: "The login email can't be changed here yet.",
    saveName: "Save name",
    nameSaved: "Name updated",
    changePassword: "Change password",
    currentPassword: "Current password",
    newPassword: "New password",
    savePassword: "Update password",
    passwordSaved: "Password updated",
    subscription: "Subscription",
    manageSubscription: "View or manage subscription",
    dangerZone: "Delete account",
    dangerBody:
      "This deletes your account, journal, simulations and progress, and cancels a web subscription. App Store / Google Play subscriptions must be canceled in the store. This can't be undone.",
    deleteAccount: "Delete my account",
    confirmPrompt: "Type DELETE to confirm:",
    confirmPlaceholder: "DELETE",
    confirmButton: "Permanently delete",
    cancel: "Cancel",
    deleting: "Deleting…",
  },
};

function ContaPage() {
  const locale = useLocale((s) => s.locale);
  const t = COPY[locale];
  const { user, isPending } = useCurrentUserState();

  if (isPending) return null;
  if (!user) return <RedirectToSignIn />;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[26px] font-bold">{t.title}</h1>
        <button
          type="button"
          onClick={() => void signOut()}
          className="h-11 rounded-xl border border-border px-4 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          {locale === "pt" ? "Sair" : "Sign out"}
        </button>
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <NameForm initialName={user.displayName ?? ""} t={t} />
          <div className="space-y-1 border-t border-border pt-4">
            <p className="text-sm font-medium">{t.email}</p>
            <p className="text-sm text-muted-foreground">{user.primaryEmail}</p>
            <p className="text-xs text-muted-foreground">{t.emailNote}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <PasswordForm t={t} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between p-5">
          <span className="text-sm font-medium">{t.subscription}</span>
          <Link to="/assinatura" className="text-sm font-semibold text-brass underline-offset-4 hover:underline">
            {t.manageSubscription}
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap gap-x-5 gap-y-2 p-5 text-sm">
          <Link to="/suporte" className="underline-offset-4 hover:underline">Suporte</Link>
          <Link to="/termos" className="underline-offset-4 hover:underline">Termos de Uso</Link>
          <Link to="/privacidade" className="underline-offset-4 hover:underline">Privacidade</Link>
        </CardContent>
      </Card>

      <DangerZone t={t} />
    </div>
  );
}

function DangerZone({ t }: { t: (typeof COPY)["pt"] }) {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmWord = t.confirmPlaceholder; // "EXCLUIR" / "DELETE"

  async function onConfirmDelete() {
    setBusy(true);
    setError(null);
    try {
      await deleteAccount();
      await authClient.signOut();
      void navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <Card className="border-loss/40">
      <CardContent className="space-y-3 p-5">
        <h2 className="text-sm font-medium text-loss">{t.dangerZone}</h2>
        <p className="text-sm text-muted-foreground">{t.dangerBody}</p>
        {!confirming ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-loss/40 text-loss hover:bg-loss-bg"
            onClick={() => setConfirming(true)}
          >
            {t.deleteAccount}
          </Button>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="delete-confirm">
              {t.confirmPrompt}
            </label>
            <input
              id="delete-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={t.confirmPlaceholder}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            {error && <p className="text-sm text-loss">{error}</p>}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={confirmText.trim().toUpperCase() !== confirmWord || busy}
                onClick={onConfirmDelete}
              >
                {busy ? t.deleting : t.confirmButton}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setConfirming(false);
                  setConfirmText("");
                  setError(null);
                }}
              >
                {t.cancel}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NameForm({ initialName, t }: { initialName: string; t: (typeof COPY)["pt"] }) {
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const { error: err } = await authClient.updateUser({ name });
      if (err) throw new Error(err.message ?? "Failed to update name");
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <label className="text-sm font-medium" htmlFor="name">
        {t.name}
      </label>
      <input
        id="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-loss">{error}</p>}
      {saved && <p className="text-sm text-good">{t.nameSaved}</p>}
      <Button type="submit" disabled={busy} size="sm">
        {t.saveName}
      </Button>
    </form>
  );
}

function PasswordForm({ t }: { t: (typeof COPY)["pt"] }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const { error: err } = await authClient.changePassword({
        currentPassword: current,
        newPassword: next,
        revokeOtherSessions: true,
      });
      if (err) throw new Error(err.message ?? "Failed to update password");
      setSaved(true);
      setCurrent("");
      setNext("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <h2 className="text-sm font-medium">{t.changePassword}</h2>
      <input
        type="password"
        placeholder={t.currentPassword}
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <input
        type="password"
        placeholder={t.newPassword}
        value={next}
        onChange={(e) => setNext(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-loss">{error}</p>}
      {saved && <p className="text-sm text-good">{t.passwordSaved}</p>}
      <Button type="submit" disabled={busy} size="sm">
        {t.savePassword}
      </Button>
    </form>
  );
}
