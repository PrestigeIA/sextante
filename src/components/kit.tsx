import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Lock, TriangleAlert, Info, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

/** Rounded dark surface — the base card of the app. */
export function Panel({
  children,
  className,
  as: As = "section",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <As className={cn("rounded-[18px] border border-border bg-card p-4 md:p-5", className)} {...rest}>
      {children}
    </As>
  );
}

export function PanelTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-[13px] font-medium text-muted-foreground">{children}</h2>
      {aside}
    </div>
  );
}

/** Label + big monospaced number. */
export function Stat({
  label,
  value,
  tone,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  tone?: "gain" | "loss" | "warn" | "default";
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "num truncate text-[15px] font-semibold",
          tone === "gain" && "text-gain",
          tone === "loss" && "text-loss",
          tone === "warn" && "text-warn",
        )}
      >
        {value}
      </span>
      {hint ? <span className="text-[11px] text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

export function Tag({
  children,
  tone = "brass",
  className,
}: {
  children: ReactNode;
  tone?: "brass" | "info" | "warn" | "gain" | "loss" | "muted";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        tone === "brass" && "border border-brass-border text-brass",
        tone === "info" && "bg-info-bg text-info",
        tone === "warn" && "bg-warn-bg text-warn",
        tone === "gain" && "bg-gain-bg text-gain",
        tone === "loss" && "bg-loss-bg text-loss",
        tone === "muted" && "bg-secondary text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Callout({
  tone,
  children,
  className,
}: {
  tone: "warn" | "info" | "tip";
  children: ReactNode;
  className?: string;
}) {
  const Icon = tone === "warn" ? TriangleAlert : tone === "info" ? Info : Lightbulb;
  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border px-3.5 py-3 text-[13px] leading-relaxed",
        tone === "warn" && "border-warn-border bg-warn-bg text-[#ecdccb]",
        tone === "info" && "border-[#1d3557] bg-info-bg text-[#cfe0fb]",
        tone === "tip" && "border-brass-border bg-brass-bg text-[#efe2c4]",
        className,
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 size-4 shrink-0",
          tone === "warn" ? "text-warn" : tone === "info" ? "text-info" : "text-brass",
        )}
        aria-hidden="true"
      />
      <div>{children}</div>
    </div>
  );
}

/** Upsell card shown in place of a Pro-only feature. */
export function ProLock({
  title = "Disponível no Sextante Pro",
  body,
  signedIn,
}: {
  title?: string;
  body: ReactNode;
  signedIn: boolean;
}) {
  return (
    <Panel className="border-brass-border bg-[linear-gradient(180deg,#17140c,#121722)]">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brass-bg text-brass">
          <Lock className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 space-y-2">
          <h3 className="text-[15px] font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{body}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              to={signedIn ? "/assinatura" : "/login"}
              search={signedIn ? undefined : { modo: "criar" }}
              className="inline-flex h-11 items-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
            >
              {signedIn ? "Ver planos" : "Criar conta grátis"}
            </Link>
          </div>
        </div>
      </div>
    </Panel>
  );
}

export function PageHeader({
  title,
  subtitle,
  aside,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[26px] font-bold leading-tight md:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {aside}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: ReactNode; action?: ReactNode }) {
  return (
    <Panel className="flex flex-col items-start gap-2 border-dashed py-8">
      <h3 className="text-[15px] font-semibold">{title}</h3>
      <p className="max-w-prose text-sm text-muted-foreground">{body}</p>
      {action ? <div className="pt-2">{action}</div> : null}
    </Panel>
  );
}

export const fieldClass =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-[15px] text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

export const btnPrimary =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-[15px] font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50";

export const btnSecondary =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors hover:bg-accent disabled:opacity-50";
