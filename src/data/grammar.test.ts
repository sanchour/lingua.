import { afterEach, describe, expect, it } from 'vitest';
import { itemId, itemKey } from '@/core/grammar/progress';
import type { Grammar, Item } from '@/core/grammar/types';
import { createDb } from './db';
import type { LinguaDB } from './db';
import { answerGrammarItem, dueGrammarItems, finishGrammarLesson, grammarProgress } from './grammar';

const open: LinguaDB[] = [];
function freshDb(): LinguaDB {
  const db = createDb(`grammar-${Math.random().toString(36).slice(2)}`);
  open.push(db);
  return db;
}
afterEach(async () => {
  await Promise.all(open.splice(0).map((db) => db.delete()));
});

const item: Item = { s: 'Ayer [comimos] paella.', en: 'Yesterday we ate paella.', wrong: ['comemos', 'comíamos', 'comeremos'] };
const grammar: Grammar = {
  lang: 'es',
  sources: [{ name: 'test' }],
  units: [{ title: 'U', topics: [{ id: 'preterite', title: 'Preterite', level: 'A2', summary: '', rule: [], why: '', items: [item] }] }],
};
const DAY = 86_400_000;

describe('grammar progress', () => {
  it('makes an item’s card on its first answer, logs it under the hidden deck and counts the review', async () => {
    const db = freshDb();
    const now = Date.UTC(2026, 9, 20, 10);
    const row = await answerGrammarItem({ lang: 'es', topic: 'preterite', item, grade: 3, durationMs: 4000, now }, db);
    expect(row.id).toBe(itemId('es', 'preterite', itemKey(item)));
    expect(row.state).not.toBe(0);
    expect(row.reps).toBe(1);
    const logs = await db.reviewLogs.toArray();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ deckId: 'grammar:es', mode: 'grammar', affectedSchedule: 1, rating: 3 });
    expect((await db.dailyStats.toArray())[0].reviews).toBe(1);
  });

  it('logs an item that isn’t due without moving it, and practice never moves it', async () => {
    const db = freshDb();
    const now = Date.UTC(2026, 9, 20, 10);
    const first = await answerGrammarItem({ lang: 'es', topic: 'preterite', item, grade: 3, durationMs: 1000, now }, db);
    const again = await answerGrammarItem({ lang: 'es', topic: 'preterite', item, grade: 1, durationMs: 1000, now: now + 1000 }, db);
    expect(again.due).toBe(first.due);
    const practice = await answerGrammarItem({ lang: 'es', topic: 'preterite', item, grade: 1, durationMs: 1000, now: first.due + DAY, practice: true }, db);
    expect(practice.due).toBe(first.due);
    expect((await db.reviewLogs.toArray()).sort((a, b) => a.reviewedAt - b.reviewedAt).map((l) => l.affectedSchedule)).toEqual([1, 0, 0]);
  });

  it('passes a step at 80 % on the current step only, and learns the topic after step 5', async () => {
    const db = freshDb();
    expect(await finishGrammarLesson('es', 'preterite', 1, 0.7, db)).toEqual({ passed: false, step: 1 });
    expect(await finishGrammarLesson('es', 'preterite', 1, 0.8, db)).toEqual({ passed: true, step: 2 });
    // A lesson of another step (or practice) doesn't move it.
    expect(await finishGrammarLesson('es', 'preterite', 4, 1, db)).toEqual({ passed: false, step: 2 });
    expect(await finishGrammarLesson('es', 'preterite', null, 1, db)).toEqual({ passed: false, step: 2 });
    for (const s of [2, 3, 4, 5]) await finishGrammarLesson('es', 'preterite', s, 0.9, db);
    const row = (await grammarProgress('es', db)).get('preterite')!;
    expect(row.step).toBe(6);
    expect(row.lessons).toBe(8);
  });

  it('finds the items due with their topics', async () => {
    const db = freshDb();
    const now = Date.UTC(2026, 9, 20, 10);
    const row = await answerGrammarItem({ lang: 'es', topic: 'preterite', item, grade: 3, durationMs: 1000, now }, db);
    expect(await dueGrammarItems(grammar, row.due - 1, db)).toHaveLength(0);
    const due = await dueGrammarItems(grammar, row.due + 1, db);
    expect(due.map((d) => d.item.s)).toEqual([item.s]);
  });
});
