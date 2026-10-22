import { afterEach, describe, expect, it } from 'vitest';
import type { LessonId } from '@/core/course/outline';
import { finishCourseLesson, nextLesson } from './course';
import { createDb } from './db';
import type { LinguaDB } from './db';

const open: LinguaDB[] = [];
function freshDb(): LinguaDB {
  const db = createDb(`course-${Math.random().toString(36).slice(2)}`);
  open.push(db);
  return db;
}
afterEach(async () => {
  await Promise.all(open.splice(0).map((db) => db.delete()));
});

const ALL: LessonId[] = ['words', 'phrases', 'grammar', 'speak', 'write', 'check'];
const rows = async (db: LinguaDB) => new Map((await db.courseProgress.toArray()).map((r) => [r.unit, r]));

describe('course progress', () => {
  it('goes lesson by lesson, and a passed check finishes the unit', async () => {
    const db = freshDb();
    expect(nextLesson(await rows(db), () => ALL)).toEqual({ unit: 'hello', lesson: 'words', done: 0, of: 6 });
    await finishCourseLesson('es', 'hello', 'words', 0.9, ALL, db);
    await finishCourseLesson('es', 'hello', 'phrases', 0.7, ALL, db);
    expect(nextLesson(await rows(db), () => ALL)).toMatchObject({ unit: 'hello', lesson: 'grammar', done: 2 });

    expect(await finishCourseLesson('es', 'hello', 'check', 0.6, ALL, db)).toEqual({ unitDone: false, passed: false });
    expect(await finishCourseLesson('es', 'hello', 'check', 0.85, ALL, db)).toEqual({ unitDone: true, passed: true });
    const hello = (await rows(db)).get('hello')!;
    expect(Object.keys(hello.lessons).sort()).toEqual([...ALL].sort());
    expect(hello.lessons.words.score).toBe(0.9);
    expect(nextLesson(await rows(db), () => ALL)).toEqual({ unit: 'me', lesson: 'words', done: 0, of: 6 });
  });

  it('keeps the better score of a lesson done twice', async () => {
    const db = freshDb();
    await finishCourseLesson('fr', 'me', 'words', 0.9, ALL, db);
    await finishCourseLesson('fr', 'me', 'words', 0.5, ALL, db);
    expect((await rows(db)).get('me')!.lessons.words.score).toBe(0.9);
  });
});
