// Cursus, the course: which lessons of which units are done, and what comes next.
import { useLiveQuery } from 'dexie-react-hooks';
import { CHECK_PASS, OUTLINE } from '@/core/course/outline';
import type { LessonId, UnitId } from '@/core/course/outline';
import { db } from './db';
import type { LinguaDB } from './db';
import type { CourseProgressRow } from './types';

export const courseRowId = (lang: string, unit: string) => `${lang}:${unit}`;

export function useCourseProgress(lang: string): Map<string, CourseProgressRow> | undefined {
  return useLiveQuery(async () => new Map((await db.courseProgress.where('lang').equals(lang).toArray()).filter((r) => !r.deletedAt).map((r) => [r.unit, r])), [lang]);
}

/**
 * Records a lesson done with its first-try score (the better of this and an earlier one). A unit
 * check at 80% or more finishes the unit, and every lesson in it counts as done (testing out).
 * Returns whether the unit is now done.
 */
export async function finishCourseLesson(lang: string, unit: UnitId, lesson: LessonId, score: number, lessons: LessonId[], database: LinguaDB = db, now = Date.now()): Promise<{ unitDone: boolean; passed: boolean }> {
  const id = courseRowId(lang, unit);
  return database.transaction('rw', database.courseProgress, async () => {
    const row: CourseProgressRow = (await database.courseProgress.get(id)) ?? { id, lang, unit, lessons: {}, createdAt: now, updatedAt: now };
    const passed = lesson !== 'check' || score >= CHECK_PASS;
    const before = row.lessons[lesson];
    if (passed) row.lessons = { ...row.lessons, [lesson]: { score: Math.max(score, before?.score ?? 0), at: now } };
    if (lesson === 'check' && passed) {
      row.doneAt ??= now;
      for (const l of lessons) row.lessons[l] ??= { score, at: now };
    }
    row.updatedAt = now;
    await database.courseProgress.put(row);
    return { unitDone: Boolean(row.doneAt), passed };
  });
}

export interface NextLesson {
  unit: UnitId;
  lesson: LessonId;
  /** Lessons done in that unit, and how many it has. */
  done: number;
  of: number;
}

/** The first lesson not done, in the course's order; null when the whole course is done. */
export function nextLesson(progress: Map<string, CourseProgressRow>, lessonsOf: (unit: UnitId) => LessonId[]): NextLesson | null {
  for (const u of OUTLINE) {
    const row = progress.get(u.id);
    if (row?.doneAt) continue;
    const lessons = lessonsOf(u.id);
    const lesson = lessons.find((l) => !row?.lessons[l]) ?? 'check';
    return { unit: u.id, lesson, done: lessons.filter((l) => row?.lessons[l]).length, of: lessons.length };
  }
  return null;
}
