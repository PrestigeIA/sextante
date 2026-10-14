import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "../auth/middleware";
import { getSql } from "../db";
import { findLesson, lessonIsFree } from "./catalog";
import type { Block } from "./lessons.server";

export type LessonResult =
  | { status: "ok"; blocks: Block[] }
  | { status: "locked"; reason: "signin" | "pro" }
  | { status: "missing" };

/**
 * Lesson body, after checking the plan on the server. Free lessons are open to
 * everyone (signed in or not); Pro lessons need an active Pro entitlement.
 */
export const getLesson = createServerFn({ method: "GET" })
  .validator((input: { id: string }) => z.object({ id: z.string().min(1).max(80) }).parse(input))
  .handler(async ({ data }): Promise<LessonResult> => {
    const found = findLesson(data.id);
    const { LESSONS } = await import("./lessons.server");
    const blocks = LESSONS[data.id];
    if (!found || !blocks) return { status: "missing" };
    if (lessonIsFree(found.trail, found.lesson)) return { status: "ok", blocks };

    const { getSessionUser } = await import("../auth/verify.server");
    const user = await getSessionUser();
    if (!user) return { status: "locked", reason: "signin" };
    const { isProUser } = await import("../billing/entitlement.server");
    if (!(await isProUser(user.id))) return { status: "locked", reason: "pro" };
    return { status: "ok", blocks };
  });

/** Lesson ids the signed-in user has completed. Empty when signed out. */
export const listProgress = createServerFn({ method: "GET" }).handler(async (): Promise<string[]> => {
  const { getSessionUser } = await import("../auth/verify.server");
  const user = await getSessionUser();
  if (!user) return [];
  const sql = await getSql();
  const rows = await sql<{ lesson_id: string }>`
    select "lesson_id" from "sextante_lesson_progress" where "user_id" = ${user.id}
  `;
  return rows.map((r) => r.lesson_id);
});

export const setLessonDone = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; done: boolean }) =>
    z.object({ id: z.string().min(1).max(80), done: z.boolean() }).parse(input),
  )
  .handler(async ({ context, data }): Promise<void> => {
    if (!findLesson(data.id)) throw new Error("Lesson not found");
    const sql = await getSql();
    if (data.done) {
      await sql`
        insert into "sextante_lesson_progress" ("user_id", "lesson_id") values (${context.userId}, ${data.id})
        on conflict do nothing
      `;
    } else {
      await sql`
        delete from "sextante_lesson_progress" where "user_id" = ${context.userId} and "lesson_id" = ${data.id}
      `;
    }
  });
