import { afterEach, describe, expect, it } from 'vitest';
import { recordSession } from './activity';
import { createDb } from './db';
import type { LinguaDB } from './db';
import { checkMilestones, goalProgress, goalStatus, importCapabilities, saveCapability, seedCapabilities } from './journey';
import { completeOnboarding } from './languages';
import type { Goal } from './types';

const open: LinguaDB[] = [];
function freshDb(): LinguaDB {
  const db = createDb(`journey-${Math.random().toString(36).slice(2)}`);
  open.push(db);
  return db;
}
afterEach(async () => {
  await Promise.all(open.splice(0).map((db) => db.delete()));
});

describe('milestones', () => {
  it('records each milestone once, dated when it happened', async () => {
    const db = freshDb();
    await completeOnboarding({ target: 'es', native: 'en', level: 'A1', theme: 'paper', seedKnown: false }, db);
    const at = Date.now() - 3 * 86_400_000;
    await recordSession({ lang: 'es', type: 'listen', startedAt: at - 11 * 3_600_000, endedAt: at, activeMs: 11 * 3_600_000 }, db);
    const first = await checkMilestones('es', db);
    expect(first.map((e) => e.id).sort()).toEqual(['es:hours:10', 'es:started']);
    expect(first.find((e) => e.kind === 'hours')?.at).toBe(at);
    expect(await checkMilestones('es', db)).toEqual([]);
  });
});

describe('Tabula', () => {
  it('seeds studied languages, imports Notion rows and remembers level changes', async () => {
    const db = freshDb();
    await completeOnboarding({ target: 'ru', native: 'en', level: 'A2', theme: 'paper', seedKnown: false }, db);
    await seedCapabilities(db);
    expect((await db.capabilities.toArray()).map((c) => [c.id, c.level])).toEqual([['ru', 'A2']]);
    const result = await importCapabilities(
      [
        { id: 'ru', name: 'Russian', level: 'B1', status: 'learning', methods: ['Self-study'], started: '2023-04-17' },
        { id: 'nl', name: 'Dutch', level: 'C2', status: 'native', methods: ['Natural'], started: '2005-06-27' },
      ],
      db,
    );
    expect(result).toEqual({ added: 1, updated: 1 });
    const events = await db.journeyEvents.toArray();
    expect(events.map((e) => e.title)).toEqual(['Russian: B1']);
    const ru = (await db.capabilities.get('ru'))!;
    await saveCapability({ ...ru, notes: 'Tutor on Tuesdays' }, db);
    expect(await db.journeyEvents.count()).toBe(1);
  });
});

describe('goal progress', () => {
  const base: Goal = { id: 'g', lang: 'es', kind: 'books-year', target: 12, createdAt: 0, updatedAt: 0 };
  const data = { level: 'A2' as const, hours: 100, hoursPerWeek: 5, hoursThisWeek: 2, wordsThisWeek: 40, booksThisYear: 3 };
  it('describes each kind of goal honestly', () => {
    const july = new Date('2026-07-01T12:00:00').getTime();
    expect(goalProgress(base, data, july)).toMatchObject({ fraction: 0.25, label: '3 of 12 books in 2026' });
    expect(goalProgress(base, data, july).projection).toMatch(/behind/);
    expect(goalProgress({ ...base, kind: 'hours-week', target: 4 }, data).fraction).toBe(0.5);
    const level = goalProgress({ ...base, kind: 'level', target: 'B1' }, data, july);
    expect(level.label).toBe('A2 → B1');
    expect(level.projection).toMatch(/190 hours away/);
  });

  it('says whether a goal is reached, on track, behind or open', () => {
    const july = new Date('2026-07-01T12:00:00').getTime();
    const status = (goal: Goal, d = data, now = july) => goalStatus(goal, goalProgress(goal, d, now));
    expect(status(base)).toBe('behind');
    expect(status(base, { ...data, booksThisYear: 6 })).toBe('on track');
    expect(status(base, { ...data, booksThisYear: 12 })).toBe('reached');
    expect(status({ ...base, kind: 'hours-week', target: 4 })).toBe('open');
    expect(status({ ...base, kind: 'level', target: 'A2' })).toBe('reached');
    expect(status({ ...base, kind: 'level', target: 'B1' })).toBe('open');
    expect(status({ ...base, kind: 'level', target: 'B1', by: '2026-07-15' })).toBe('behind');
    expect(status({ ...base, kind: 'level', target: 'B1', by: '2030-01-01' })).toBe('on track');
  });
});
