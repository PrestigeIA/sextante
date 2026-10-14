import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Lock } from "lucide-react";
import { TRAILS, lessonIsFree } from "@/lib/academy/catalog";
import { listProgress } from "@/lib/academy/server";
import { useAccess } from "@/lib/use-access";
import { PageHeader, Panel, Tag } from "@/components/kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/academia/")({
  head: () => ({ meta: [{ title: "Academia de opções — Sextante" }] }),
  component: AcademiaPage,
});

function AcademiaPage() {
  const { pro, signedIn } = useAccess();
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!signedIn) return;
    void listProgress()
      .then((ids) => setDone(new Set(ids)))
      .catch(() => undefined);
  }, [signedIn]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Academia"
        subtitle="Trilhas curtas em português, ligadas ao simulador. Leia, abra a operação e mexa nos números."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {TRAILS.map((trail) => {
          const completed = trail.lessons.filter((l) => done.has(l.id)).length;
          return (
            <Panel key={trail.id} as="article" className="flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Trilha {trail.number}</span>
                  <h2 className="text-lg font-semibold">{trail.title}</h2>
                </div>
                {trail.free ? <Tag tone="gain">grátis</Tag> : <Tag>pro</Tag>}
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground">{trail.description}</p>
              {signedIn ? (
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-1.5 rounded-full bg-primary"
                      style={{ width: `${Math.round((completed / trail.lessons.length) * 100)}%` }}
                    />
                  </div>
                  <span className="num text-xs text-muted-foreground">
                    {completed}/{trail.lessons.length}
                  </span>
                </div>
              ) : null}
              <ol className="mt-3 divide-y divide-border">
                {trail.lessons.map((lesson, i) => {
                  const open = lessonIsFree(trail, lesson) || pro;
                  const isDone = done.has(lesson.id);
                  return (
                    <li key={lesson.id}>
                      <Link
                        to="/academia/$lessonId"
                        params={{ lessonId: lesson.id }}
                        className="flex min-h-12 items-center gap-3 py-2"
                      >
                        <span
                          className={cn(
                            "num grid size-7 shrink-0 place-items-center rounded-full border text-xs",
                            isDone ? "border-gain bg-gain-bg text-gain" : "border-border text-muted-foreground",
                          )}
                          aria-hidden="true"
                        >
                          {isDone ? <Check className="size-3.5" /> : i + 1}
                        </span>
                        <span className="min-w-0 flex-1 text-sm">
                          {lesson.title}
                          {isDone ? <span className="sr-only"> (concluída)</span> : null}
                        </span>
                        {!trail.free && lesson.free ? <Tag tone="gain">grátis</Tag> : null}
                        {!open ? <Lock className="size-4 text-muted-foreground" aria-label="Pro" /> : null}
                        <span className="num text-xs text-muted-foreground">{lesson.minutes} min</span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
