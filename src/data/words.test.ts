import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { localDateKey } from '@/lib/format';
import { bumpDaily } from './activity';
import { createDb } from './db';
import type { LinguaDB } from './db';
import { completeOnboarding } from './languages';
import { SCHEMA_V17 } from './db';
import { applyKnownSeed, changeWordTags, cleanTags, markedWords, markKnownBulk, setWordFavourite, setWordImportant, setWordNote, setWordState, setWordTags, wordHistory } from './words';

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

describe('the learner’s half of a word (6-1)', () => {
  it('keeps tags short, one line, without repeats whatever the case, at most twelve', () => {
    expect(cleanTags(['  Travel ', 'travel', 'to\n  eat', '', 'x'.repeat(40), 'a,b'])).toEqual(['Travel', 'to eat', 'x'.repeat(24), 'a b']);
    expect(cleanTags(Array.from({ length: 20 }, (_, i) => `t${i}`))).toHaveLength(12);
  });

  it('marks a word never met before, as an Unseen row that changes nothing else', async () => {
    const db = freshDb();
    await setWordFavourite('es', 'casa', true, { lemma: 'casa', gloss: 'house' }, db);
    await setWordTags('es', 'casa', ['home', 'Home', 'noun'], {}, db);
    await setWordNote('es', 'casa', 'Not "caso"!', {}, db);
    expect(await db.words.get('es:casa')).toMatchObject({ state: 0, lemma: 'casa', gloss: 'house', favourite: 1, tags: ['home', 'noun'], note: 'Not "caso"!' });
    expect(await db.cards.count()).toBe(0);
  });

  it('two quick tag changes never undo each other', async () => {
    const db = freshDb();
    await Promise.all([changeWordTags('es', 'casa', (t) => [...t, 'home'], {}, db), changeWordTags('es', 'casa', (t) => [...t, 'noun'], {}, db)]);
    expect((await db.words.get('es:casa'))?.tags?.sort()).toEqual(['home', 'noun']);
    await changeWordTags('es', 'casa', (t) => t.filter((x) => x !== 'home'), {}, db);
    expect((await db.words.get('es:casa'))?.tags).toEqual(['noun']);
  });

  it('survives the word being learned, known and reset, and clears with the toggles', async () => {
    const db = freshDb();
    await setWordImportant('es', 'perro', true, {}, db);
    await setWordState('es', 'perro', 2, { surface: 'perro', gloss: 'dog' }, db);
    await setWordState('es', 'perro', 1, {}, db);
    expect(await db.words.get('es:perro')).toMatchObject({ state: 1, important: 1 });
    await setWordImportant('es', 'perro', false, {}, db);
    await setWordNote('es', 'perro', '   ', {}, db);
    expect(await db.words.get('es:perro')).toMatchObject({ important: 0, note: undefined });
  });

  it('finds the marked words of a language, newest first, by the new indexes', async () => {
    const db = freshDb();
    await setWordFavourite('es', 'uno', true, {}, db);
    await setWordFavourite('es', 'dos', true, {}, db);
    await setWordFavourite('fr', 'trois', true, {}, db);
    await setWordImportant('es', 'tres', true, {}, db);
    await setWordFavourite('es', 'uno', false, {}, db);
    expect((await markedWords('es', 'favourite', db)).map((w) => w.norm)).toEqual(['dos']);
    expect((await markedWords('es', 'important', db)).map((w) => w.norm)).toEqual(['tres']);
    expect(await markedWords('de', 'favourite', db)).toEqual([]);
  });

  it('works out the history from the sightings and the card’s reviews', async () => {
    const db = freshDb();
    expect(await wordHistory('es', 'luna', db)).toMatchObject({ reviews: 0, places: 0, firstMetAt: undefined, recallRate: undefined });
    await setWordState('es', 'luna', 2, { surface: 'luna', gloss: 'moon', sentence: 'La luna es grande.', textId: 'book-1' }, db);
    const card = (await db.cards.toArray())[0];
    const log = (n: number, rating: 1 | 2 | 3 | 4, at: number) => ({ id: `l${n}`, cardId: card.id, deckId: card.deckId, reviewedAt: at, durationMs: 1000, rating, mode: 'classic' as const, affectedSchedule: 1 as const, stateBefore: 2 as const, stabilityAfter: 3, difficultyAfter: 5, elapsedDays: 1, scheduledDays: 3 });
    await db.reviewLogs.bulkAdd([log(1, 3, 1_000), log(2, 1, 2_000), log(3, 4, 3_000), log(4, 3, 4_000)]);
    const h = await wordHistory('es', 'luna', db);
    expect(h).toMatchObject({ reviews: 4, lastReviewedAt: 4_000, recallRate: 0.75, places: 1 });
    expect(h.firstMetAt).toBeGreaterThan(0);
    expect(h.log.map((l) => l.rating)).toEqual([3, 4, 1, 3]);
  });

  it('opens a version-17 device with its words, and the new indexes work on them', async () => {
    const name = `words-old-${Math.random().toString(36).slice(2)}`;
    const old = new Dexie(name);
    old.version(17).stores({ ...SCHEMA_V17, words: 'id, [lang+state], [lang+lemma], updatedAt' });
    await old.table('words').add({ id: 'es:hola', lang: 'es', norm: 'hola', state: 1, stateChangedAt: 1, createdAt: 1, updatedAt: 1 });
    old.close();
    const db = createDb(name);
    open.push(db);
    expect(await db.words.get('es:hola')).toMatchObject({ state: 1 });
    expect((await db.words.get('es:hola'))?.favourite).toBeUndefined();
    await setWordFavourite('es', 'hola', true, {}, db);
    expect((await markedWords('es', 'favourite', db)).map((w) => w.norm)).toEqual(['hola']);
  });
});
