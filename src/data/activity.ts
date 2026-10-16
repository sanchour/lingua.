import { localDateKey } from '@/lib/format';
import { db } from './db';
import type { LinguaDB } from './db';
import type { ActivitySession, DailyStat } from './types';

type Counter = 'readMs' | 'wordsRead' | 'listenMs' | 'watchMs' | 'reviews' | 'againCount' | 'newCards' | 'newKnown' | 'newLearning';

const emptyDay = (lang: string, date: string): DailyStat => ({
  id: `${lang}:${date}`,
  lang,
  date,
  readMs: 0,
  wordsRead: 0,
  listenMs: 0,
  watchMs: 0,
  reviews: 0,
  againCount: 0,
  newCards: 0,
  knownTotal: 0,
  learningTotal: 0,
  newKnown: 0,
  newLearning: 0,
  goalMet: 0,
  updatedAt: 0,
});

/** Adds to today's counters for a language and re-evaluates the daily goal (keeps the streak). */
export async function bumpDaily(lang: string, delta: Partial<Record<Counter, number>>, database: LinguaDB = db): Promise<void> {
  const date = localDateKey();
  await database.transaction('rw', database.dailyStats, database.languages, async () => {
    const day = (await database.dailyStats.get(`${lang}:${date}`)) ?? emptyDay(lang, date);
    for (const [key, value] of Object.entries(delta) as Array<[Counter, number]>) day[key] += value;
    const goal = (await database.languages.get(lang))?.dailyGoal ?? { reviews: 50, readMinutes: 15, listenMinutes: 10 };
    const studyMinutes = (day.readMs + day.listenMs + day.watchMs) / 60_000;
    day.goalMet = studyMinutes >= goal.readMinutes || day.reviews >= goal.reviews ? 1 : 0;
    day.updatedAt = Date.now();
    await database.dailyStats.put(day);
  });
}

/** Stores today's Known / Learning totals so vocabulary growth can be charted later. */
export async function snapshotVocabulary(lang: string, database: LinguaDB = db): Promise<void> {
  const date = localDateKey();
  const [known, learning] = await Promise.all([
    database.words.where('[lang+state]').equals([lang, 1]).count(),
    database.words.where('[lang+state]').equals([lang, 2]).count(),
  ]);
  await database.transaction('rw', database.dailyStats, async () => {
    const day = (await database.dailyStats.get(`${lang}:${date}`)) ?? emptyDay(lang, date);
    await database.dailyStats.put({ ...day, knownTotal: known, learningTotal: learning, updatedAt: Date.now() });
  });
}

export async function recordSession(session: Omit<ActivitySession, 'id'>, database: LinguaDB = db): Promise<void> {
  if (session.activeMs < 5_000) return; // ignore accidental opens
  await database.sessions.add({ ...session, id: crypto.randomUUID() });
  if (session.type === 'read') await bumpDaily(session.lang, { readMs: session.activeMs, wordsRead: session.wordsRead ?? 0 }, database);
  await snapshotVocabulary(session.lang, database);
}
