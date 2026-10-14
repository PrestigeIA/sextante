import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useLocale } from "@/lib/locale";
import { sendSupportMessage } from "@/lib/support";

export const Route = createFileRoute("/suporte")({ component: SuportePage });

const COPY = {
  pt: {
    title: "Suporte",
    subtitle: "Dúvidas sobre sua conta, privacidade, cobrança ou qualquer outra coisa — escreva aqui.",
    subject: "Assunto",
    subjectPlaceholder: "Ex: Dúvida sobre um caso",
    body: "Mensagem",
    send: "Enviar mensagem",
    sent: "Mensagem enviada — respondemos por e-mail em breve.",
    sendAnother: "Enviar outra mensagem",
  },
  en: {
    title: "Support",
    subtitle: "Questions about your account, privacy, billing, or anything else — write here.",
    subject: "Subject",
    subjectPlaceholder: "E.g. Question about a case",
    body: "Message",
    send: "Send message",
    sent: "Message sent — we'll reply by email soon.",
    sendAnother: "Send another message",
  },
};

function SuportePage() {
  const locale = useLocale((s) => s.locale);
  const t = COPY[locale];
  const { user, isPending } = useCurrentUserState();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isPending) return null;
  if (!user) return <RedirectToSignIn />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await sendSupportMessage({
        data: { email: user!.primaryEmail ?? "", subject, body },
      });
      setSent(true);
      setSubject("");
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-[26px] font-bold">{t.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      <Card>
        <CardContent className="p-5">
          {sent ? (
            <div className="space-y-3">
              <p className="text-sm">{t.sent}</p>
              <Button size="sm" variant="outline" onClick={() => setSent(false)}>
                {t.sendAnother}
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="subject">
                  {t.subject}
                </label>
                <input
                  id="subject"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={t.subjectPlaceholder}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="body">
                  {t.body}
                </label>
                <textarea
                  id="body"
                  required
                  rows={5}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              {error && <p className="text-sm text-loss">{error}</p>}
              <Button type="submit" disabled={busy}>
                {t.send}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
