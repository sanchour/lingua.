import { afterEach, describe, expect, it } from 'vitest';
import { localDateKey } from '@/lib/format';
import { bumpDaily } from './activity';
import { createDb } from './db';
import type { LinguaDB } from './db';
import { completeOnboarding } from './languages';
import { applyKnownSeed, markKnownBulk, setWordState } from './words';

const open: LinguaDB[] = [];
function freshDb(): LinguaDB {
  const db = createDb(`words-${Math.random().toString(36).slice(2)}`);
  open.push(db);
  return db;
}
afterEach(async () => {
  await Promise.all(open.splice(0).map((db) => db.delete()));
});

describe('setWordState', () => {
  it('Learning creates a flashcard with context; Reset removes an unreviewed one', async () => {
    const db = freshDb();
    await setWordState('ru', 'книгу', 2, { surface: 'книгу', gloss: 'book', sentence: 'Она читает книгу.' }, db);
    const word = await db.words.get('ru:книгу');
    expect(word?.state).toBe(2);
    const note = await db.notes.get(word!.noteId!);
    expect(note).toMatchObject({ term: 'книгу', meaning: 'book', context: { sentence: 'Она читает книгу.' }, source: 'codex' });
    expect(await db.cards.count()).toBe(1);
    expect((await db.decks.toArray()).map((d) => d.name)).toEqual(['From my reading']);

    await setWordState('ru', 'книгу', 0, {}, db);
    expect((await db.words.get('ru:книгу'))?.state).toBe(0);
    expect(await db.cards.count()).toBe(0);
    expect(await db.notes.count()).toBe(0);
  });

  it('a reviewed card is suspended on Reset and kept on Known', async () => {
    const db = freshDb();
    await setWordState('el', 'σπίτι', 2, {}, db);
    const card = (await db.cards.toArray())[0];
    await db.cards.update(card.id, { reps: 3 });
    await setWordState('el', 'σπίτι', 0, {}, db);
    expect((await db.cards.get(card.id))?.suspended).toBe(1);
    await setWordState('el', 'σπίτι', 2, {}, db);
    expect((await db.cards.get(card.id))?.suspended).toBe(0);
    await setWordState('el', 'σπίτι', 1, {}, db);
    expect(await db.cards.get(card.id)).toBeDefined();
  });

  it('counts new known and learning words for today', async () => {
    const db = freshDb();
    await setWordState('de', 'haus', 1, {}, db);
    await setWordState('de', 'baum', 2, {}, db);
    const day = await db.dailyStats.get(`de:${localDateKey()}`);
    expect([day?.newKnown, day?.newLearning]).toEqual([1, 1]);
  });
});

describe('seeding and bulk known', () => {
  it('marks the top-N frequency forms Known once, without touching marked words', async () => {
    const db = freshDb();
    await completeOnboarding({ target: 'es', native: 'en', level: 'A1', seedKnown: true, theme: 'paper' }, db);
    await db.frequency.bulkPut(['de', 'que', 'no', 'casa'].map((norm, i) => ({ id: `es:${norm}`, lang: 'es', norm, rank: i + 1 })));
    await db.words.put({ id: 'es:que', lang: 'es', norm: 'que', state: 2, stateChangedAt: 1, createdAt: 1, updatedAt: 1 });

    expect(await applyKnownSeed('es', db)).toBe(3); // A1 seeds the top 100: de, no, casa (que is Learning)
    expect((await db.words.get('es:que'))?.state).toBe(2);
    expect(await applyKnownSeed('es', db)).toBe(0); // only once
    expect(await markKnownBulk('es', ['casa', 'perro'], db)).toBe(1);
  });
});

describe('daily goal', () => {
  it('is met once study minutes reach the language goal', async () => {
    const db = freshDb();
    await completeOnboarding({ target: 'sv', native: 'en', level: 'A0', seedKnown: false, theme: 'paper' }, db);
    await bumpDaily('sv', { readMs: 10 * 60_000 }, db);
    expect((await db.dailyStats.get(`sv:${localDateKey()}`))?.goalMet).toBe(0);
    await bumpDaily('sv', { readMs: 5 * 60_000 }, db);
    expect((await db.dailyStats.get(`sv:${localDateKey()}`))?.goalMet).toBe(1);
  });
});
