import { afterEach, describe, expect, it, vi } from 'vitest';
import { DAY, dayEnd } from '@/core/srs/scheduler';
import { createDb } from './db';
import type { LinguaDB } from './db';
import { createDeck, makeNote } from './decks';
import { averageReviewMs, dueCalendar, forgetCard, rescheduleCard, studyMinutes, trickyNotes } from './memoryViews';
import { setDeckFlag } from './deckTools';

vi.setConfig({ testTimeout: 30_000 });
const open: LinguaDB[] = [];
function freshDb(): LinguaDB {
  const db = createDb(`views-${Math.random().toString(36).slice(2)}`);
  open.push(db);
  return db;
}
afterEach(async () => {
  await Promise.all(open.splice(0).map((db) => db.delete()));
});

const NOW = new Date(2026, 9, 29, 12).getTime();

async function deckWith(db: LinguaDB, cards: Array<Record<string, unknown>>) {
  const deckId = await createDeck('es', { name: 'D' }, db);
  const deck = (await db.decks.get(deckId))!;
  const made = cards.map((_patch, i) => makeNote(deck, { term: `w${i}`, meaning: `m${i}` }, NOW));
  await db.notes.bulkAdd(made.map((m) => m.note));
  await db.cards.bulkAdd(made.map((m, i) => ({ ...m.cards[0], state: 2, stability: 20, difficulty: 5, reps: 5, lastReview: NOW - 10 * DAY, due: NOW + DAY, ...cards[i] }) as never));
  return { deckId, notes: made.map((m) => m.note), cards: made.map((m) => m.cards[0]) };
}

describe('the due calendar and the time today takes', () => {
  it('counts the five weeks ahead from the cards of the decks in use', async () => {
    const db = freshDb();
    const { deckId } = await deckWith(db, [{ due: NOW - 2 * DAY }, { due: dayEnd(NOW) + 100 }, { due: dayEnd(NOW) + DAY + 100 }, { due: dayEnd(NOW) + DAY + 200 }]);
    const days = await dueCalendar('es', NOW, db);
    expect(days.slice(0, 3).map((d) => d.count)).toEqual([1, 1, 2]);
    await setDeckFlag(deckId, 'archived', true, db);
    expect((await dueCalendar('es', NOW, db)).reduce((n, d) => n + d.count, 0)).toBe(0);
  });

  it('estimates minutes from the learner’s own pace once they have one', async () => {
    const db = freshDb();
    expect(await averageReviewMs('es', db)).toBeUndefined();
    expect(await studyMinutes('es', 60, db)).toBe(8);
    await db.reviewLogs.bulkAdd(Array.from({ length: 12 }, (_, i) => ({ id: `l${i}`, cardId: 'c', deckId: 'd', reviewedAt: i, durationMs: 20_000, rating: 3, mode: 'classic', affectedSchedule: 1, stateBefore: 2, stabilityAfter: 1, difficultyAfter: 1, elapsedDays: 1, scheduledDays: 1 }) as never));
    expect(await averageReviewMs('es', db)).toBe(20_000);
    expect(await studyMinutes('es', 30, db)).toBe(10);
  });
});

describe('putting a card on another day, and forgetting it', () => {
  it('moves only the day, and only for a card that has been studied', async () => {
    const db = freshDb();
    const { cards } = await deckWith(db, [{}, { state: 0 }]);
    await db.cards.update(cards[0].id, { buriedUntil: NOW + DAY });
    await rescheduleCard(cards[0].id, NOW + 9 * DAY, db);
    const moved = (await db.cards.get(cards[0].id))!;
    expect(moved).toMatchObject({ due: NOW + 9 * DAY, stability: 20, reps: 5 });
    expect(moved.buriedUntil).toBeUndefined();
    await expect(rescheduleCard(cards[1].id, NOW + DAY, db)).rejects.toThrow(/studied/);
  });

  it('forgetting makes a card new again, keeping its place and its note', async () => {
    const db = freshDb();
    const { cards } = await deckWith(db, [{ lapses: 4, leech: 1 }]);
    await forgetCard(cards[0].id, db);
    const after = (await db.cards.get(cards[0].id))!;
    expect(after).toMatchObject({ id: cards[0].id, noteId: cards[0].noteId, state: 0, reps: 0, lapses: 0 });
    expect(after.leech).toBeUndefined();
    await forgetCard('missing', db);
  });
});

describe('hard and rusty words', () => {
  it('finds the notes with a card forgotten often, and those not seen for a long while', async () => {
    const db = freshDb();
    const { notes } = await deckWith(db, [{ lapses: 5, due: NOW - DAY }, {}, { lastReview: NOW - 90 * DAY }, { leech: 1, lastReview: NOW - 90 * DAY }]);
    expect((await trickyNotes('es', 'difficult', NOW, db)).map((n) => n.id).sort()).toEqual([notes[0].id, notes[3].id].sort());
    expect((await trickyNotes('es', 'rusty', NOW, db)).map((n) => n.id).sort()).toEqual([notes[2].id, notes[3].id].sort());
    expect(await trickyNotes('fr', 'rusty', NOW, db)).toEqual([]);
  });
});
