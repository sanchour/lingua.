import { afterEach, describe, expect, it, vi } from 'vitest';
import { dayEnd, DAY } from '@/core/srs/scheduler';
import { createDb } from './db';
import type { LinguaDB } from './db';
import { createDeck, makeNote, updateDeck } from './decks';
import { answerCard, buryNote, catchUp, loadStudySession, overdueCards, undoAnswer, unburyNote } from './study';

// A deck of hundreds of cards, in a database made for the test, is slow when many test files run at once.
vi.setConfig({ testTimeout: 30_000 });

const open: LinguaDB[] = [];
function freshDb(): LinguaDB {
  const db = createDb(`memory-${Math.random().toString(36).slice(2)}`);
  open.push(db);
  return db;
}
afterEach(async () => {
  await Promise.all(open.splice(0).map((db) => db.delete()));
});

const NOW = new Date(2026, 9, 29, 12).getTime();
const TODAY = dayEnd(NOW) - DAY;
const opts = { lang: 'es', mode: 'classic' as const, durationMs: 2000, now: NOW };

async function reviewDeck(db: LinguaDB, notes: number, directions: Array<'recognition' | 'production'> = ['recognition']) {
  const deckId = await createDeck('es', { name: 'Test' }, db);
  const deck = (await db.decks.get(deckId))!;
  await updateDeck(deckId, { config: { ...deck.config, directions, maxReviews: 1000 } }, db);
  const made = Array.from({ length: notes }, (_, i) => makeNote({ ...deck, config: { ...deck.config, directions, maxReviews: 1000 } }, { term: `w${i}`, meaning: `m${i}` }, NOW));
  await db.notes.bulkAdd(made.map((m) => m.note));
  await db.cards.bulkAdd(made.flatMap((m) => m.cards));
  return deckId;
}

describe('leeches', () => {
  it('marks a card the eighth time it is forgotten, once, and an undo takes the mark back', async () => {
    const db = freshDb();
    const deckId = await reviewDeck(db, 1);
    const card = (await db.cards.where('deckId').equals(deckId).first())!;
    await db.cards.update(card.id, { state: 2, lapses: 7, stability: 10, difficulty: 6, reps: 20, due: NOW - DAY, lastReview: NOW - 10 * DAY, scheduledDays: 10 });
    const first = await answerCard((await db.cards.get(card.id))!, 1, opts, db);
    expect(first.leech).toBe(true);
    expect(first.card).toMatchObject({ lapses: 8, leech: 1 });
    expect((await db.cards.get(card.id))?.leech).toBe(1);
    // Forgotten again: still a leech, not news.
    await db.cards.update(card.id, { state: 2 });
    expect((await answerCard((await db.cards.get(card.id))!, 1, { ...opts, now: NOW + DAY }, db)).leech).toBe(false);
    await undoAnswer(first.undo, db);
    expect((await db.cards.get(card.id))?.leech).toBeUndefined();
  });

  it('a card forgotten fewer times is not one', async () => {
    const db = freshDb();
    const deckId = await reviewDeck(db, 1);
    const card = (await db.cards.where('deckId').equals(deckId).first())!;
    await db.cards.update(card.id, { state: 2, lapses: 2, stability: 10, difficulty: 6, reps: 5, due: NOW - DAY, lastReview: NOW - 10 * DAY, scheduledDays: 10 });
    expect((await answerCard((await db.cards.get(card.id))!, 1, opts, db)).leech).toBe(false);
  });
});

describe('a guess and a hint', () => {
  it('"I guessed" turns a right answer into Hard and is logged, with the hint and where it was', async () => {
    const db = freshDb();
    const deckId = await reviewDeck(db, 1);
    const card = (await db.cards.where('deckId').equals(deckId).first())!;
    await answerCard(card, 3, { ...opts, guessed: true, hinted: true, contextId: 'book-1' }, db);
    expect(await db.reviewLogs.toArray()).toMatchObject([{ rating: 2, guessed: 1, hinted: 1, contextId: 'book-1' }]);
    const plain = (await db.cards.where('deckId').equals(deckId).first())!;
    await answerCard(plain, 4, opts, db);
    // The logs come back in the order of their ids, not of their times: the other answer is the one that was not a guess.
    const other = (await db.reviewLogs.toArray()).find((l) => !l.guessed)!;
    expect(other.rating).toBe(4);
    expect(other.guessed).toBeUndefined();
  });

  it('a wrong answer stays wrong when it was a guess', async () => {
    const db = freshDb();
    const deckId = await reviewDeck(db, 1);
    const card = (await db.cards.where('deckId').equals(deckId).first())!;
    await answerCard(card, 1, { ...opts, guessed: true }, db);
    expect((await db.reviewLogs.toArray())[0].rating).toBe(1);
  });
});

describe('burying', () => {
  it('a buried note leaves the lesson until tomorrow, and comes back when un-buried', async () => {
    const db = freshDb();
    const deckId = await reviewDeck(db, 2);
    const notes = await db.notes.where('deckId').equals(deckId).toArray();
    const queue = async (at = NOW) => (await loadStudySession('es', null, at, db)).queue.length;
    expect(await queue()).toBe(2);
    await buryNote(notes[0].id, NOW, db);
    expect(await queue()).toBe(1);
    expect(await queue(dayEnd(NOW) + 1000)).toBe(2);
    await unburyNote(notes[0].id, db);
    expect(await queue()).toBe(2);
  });

  it('answering one direction buries the other, when the deck asks for it', async () => {
    const db = freshDb();
    const deckId = await reviewDeck(db, 1, ['recognition', 'production']);
    const cards = await db.cards.where('deckId').equals(deckId).toArray();
    expect(cards).toHaveLength(2);
    // As it is: both may come the same day.
    await answerCard(cards[0], 3, opts, db);
    expect((await db.cards.get(cards[1].id))?.buriedUntil).toBeUndefined();
    const deck = (await db.decks.get(deckId))!;
    await updateDeck(deckId, { config: { ...deck.config, burySiblings: true } }, db);
    await answerCard((await db.cards.get(cards[1].id))!, 3, opts, db);
    expect((await db.cards.get(cards[0].id))?.buriedUntil).toBe(dayEnd(NOW));
    expect((await db.cards.get(cards[1].id))?.buriedUntil).toBeUndefined();
  });
});

describe('catching up', () => {
  it('spreads 300 overdue cards over a week: about 43 a day, the rest later', async () => {
    const db = freshDb();
    const deckId = await reviewDeck(db, 150, ['recognition', 'production']);
    const cards = await db.cards.where('deckId').equals(deckId).toArray();
    expect(cards).toHaveLength(300);
    await Promise.all(cards.map((c, i) => db.cards.update(c.id, { state: 2, stability: 5, difficulty: 5, reps: 3, due: TODAY - (1 + (i % 40)) * DAY - i, lastReview: TODAY - 50 * DAY })));
    expect((await overdueCards('es', NOW, db)).length).toBe(300);
    expect((await loadStudySession('es', null, NOW, db)).queue.length).toBe(300);

    expect(await catchUp('es', 7, NOW, db)).toBe(300);
    const today = (await loadStudySession('es', null, NOW, db)).queue.length;
    expect(today).toBeGreaterThanOrEqual(42);
    expect(today).toBeLessThanOrEqual(43);
    // Nothing is overdue any more, and the last of them is due on the seventh day.
    expect((await overdueCards('es', NOW + 7 * DAY, db)).length).toBeLessThanOrEqual(300);
    expect((await loadStudySession('es', null, NOW + 7 * DAY, db)).queue.length).toBe(300);
    expect((await loadStudySession('es', null, NOW + 3 * DAY, db)).queue.length).toBeGreaterThan(today);
  });
});
