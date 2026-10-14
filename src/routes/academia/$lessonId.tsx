import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, ChartLine, Check } from "lucide-react";
import { findLesson, ALL_LESSONS } from "@/lib/academy/catalog";
import { getLesson, listProgress, setLessonDone } from "@/lib/academy/server";
import type { Block } from "@/lib/academy/lessons.server";
import { useAccess } from "@/lib/use-access";
import { Callout, Panel, ProLock, btnPrimary, btnSecondary } from "@/components/kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/academia/$lessonId")({
  loader: async ({ params }) => {
    const found = findLesson(params.lessonId);
    if (!found) throw notFound();
    return { result: await getLesson({ data: { id: params.lessonId } }) };
  },
  head: ({ params }) => ({
    meta: [{ title: `${findLesson(params.lessonId)?.lesson.title ?? "Lição"} — Academia Sextante` }],
  }),
  component: LessonPage,
});

function LessonPage() {
  const { lessonId } = Route.useParams();
  const { result: initial } = Route.useLoaderData();
  const { signedIn, pro, loading } = useAccess();
  const [result, setResult] = useState(initial);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const found = findLesson(lessonId)!;
  const { trail, lesson } = found;
  const flatIndex = ALL_LESSONS.findIndex((x) => x.lesson.id === lessonId);
  const prev = ALL_LESSONS[flatIndex - 1];
  const next = ALL_LESSONS[flatIndex + 1];

  useEffect(() => setResult(initial), [initial]);

  // The loader may have run before the session cookie was visible (first SSR
  // hit inside the app). Re-check once access is known.
  useEffect(() => {
    if (loading || result.status !== "locked") return;
    if (signedIn) void getLesson({ data: { id: lessonId } }).then(setResult);
  }, [loading, signedIn, pro, lessonId, result.status]);

  useEffect(() => {
    if (!signedIn) return;
    void listProgress()
      .then((ids) => setDone(ids.includes(lessonId)))
      .catch(() => undefined);
  }, [signedIn, lessonId]);

  async function toggleDone() {
    setBusy(true);
    try {
      await setLessonDone({ data: { id: lessonId, done: !done } });
      setDone(!done);
      if (!done) toast.success("Lição concluída");
    } catch {
      toast.error("Não foi possível salvar o progresso.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="mx-auto max-w-2xl space-y-5">
      <div>
        <Link to="/academia" className="inline-flex h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden="true" /> Trilha {trail.number} · {trail.title}
        </Link>
        <h1 className="mt-1 text-[26px] font-bold leading-tight md:text-3xl">{lesson.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{lesson.minutes} min de leitura</p>
      </div>

      {result.status === "ok" ? (
        <div className="space-y-4 text-[15px] leading-relaxed text-[#d5dae3]">
          {result.blocks.map((b, i) => (
            <LessonBlock key={i} block={b} />
          ))}
        </div>
      ) : result.status === "locked" ? (
        <ProLock
          signedIn={signedIn}
          title="Esta lição faz parte do Sextante Pro"
          body="No Pro você libera as quatro trilhas, todas as estratégias do simulador e o Diário ilimitado."
        />
      ) : (
        <Callout tone="warn">Lição não encontrada.</Callout>
      )}

      {result.status === "ok" ? (
        <div className="flex flex-wrap gap-2">
          {lesson.tryStrategy ? (
            <Link to="/simulador" search={{ estrategia: lesson.tryStrategy }} className={btnPrimary}>
              <ChartLine className="size-4" aria-hidden="true" /> Testar no simulador
            </Link>
          ) : null}
          {signedIn ? (
            <button type="button" onClick={() => void toggleDone()} disabled={busy} className={cn(btnSecondary, done && "border-gain-border text-gain")}>
              <Check className="size-4" aria-hidden="true" /> {done ? "Concluída" : "Marcar como concluída"}
            </button>
          ) : null}
        </div>
      ) : null}

      <nav aria-label="Lições" className="grid grid-cols-2 gap-2 border-t border-border pt-4">
        {prev ? (
          <Link to="/academia/$lessonId" params={{ lessonId: prev.lesson.id }} className="flex min-h-12 flex-col justify-center rounded-xl px-1 text-sm">
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowLeft className="size-3.5" aria-hidden="true" /> Anterior
            </span>
            <span className="truncate">{prev.lesson.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            to="/academia/$lessonId"
            params={{ lessonId: next.lesson.id }}
            className="flex min-h-12 flex-col items-end justify-center rounded-xl px-1 text-right text-sm"
          >
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              Próxima <ArrowRight className="size-3.5" aria-hidden="true" />
            </span>
            <span className="truncate">{next.lesson.title}</span>
          </Link>
        ) : null}
      </nav>
    </article>
  );
}

function LessonBlock({ block }: { block: Block }) {
  if ("p" in block) return <p>{block.p}</p>;
  if ("h" in block) return <h2 className="pt-2 text-lg font-semibold text-foreground">{block.h}</h2>;
  if ("ul" in block)
    return (
      <ul className="list-disc space-y-1.5 pl-5 marker:text-brass">
        {block.ul.map((li) => (
          <li key={li}>{li}</li>
        ))}
      </ul>
    );
  if ("tip" in block) return <Callout tone="tip">{block.tip}</Callout>;
  if ("warn" in block) return <Callout tone="warn">{block.warn}</Callout>;
  return (
    <Panel className="p-0 md:p-0">
      <table className="w-full text-[13px]">
        <caption className="px-4 pb-2 pt-3 text-left text-xs font-medium text-muted-foreground">{block.table.caption}</caption>
        <tbody>
          {block.table.rows.map(([k, v]) => (
            <tr key={k} className="border-t border-border">
              <th scope="row" className="px-4 py-2.5 text-left font-medium text-foreground">
                {k}
              </th>
              <td className="num px-4 py-2.5 text-right text-[#c3cad6]">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
