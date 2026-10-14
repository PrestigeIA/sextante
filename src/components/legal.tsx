import type { ReactNode } from "react";
import { BRAND, LEGAL_DRAFT } from "@/lib/brand";
import { Callout } from "@/components/kit";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-[26px] font-bold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Última atualização: {BRAND.lastUpdated}</p>
      </div>
      {LEGAL_DRAFT ? (
        <Callout tone="warn">Rascunho para revisão jurídica. Este texto ainda não está em vigor.</Callout>
      ) : null}
      {children}
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}
