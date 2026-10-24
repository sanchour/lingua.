import { afterEach, describe, expect, it } from 'vitest';
import { localDateKey } from '@/lib/format';
import { createDb } from './db';
import type { LinguaDB } from './db';
import { addNote, createDeck, deckCounts, deleteDeck, forgetDeck, orderNewCards, updateDeck } from './decks';
import { completeOnboarding } from './languages';
import { addStarterDeck, addStarterToDeck, starterItems } from './starter';
import { answerCard, dueSummary, loadStudySession, undoAnswer } from './study';
import { setWordState } from './words';

const open: LinguaDB[] = [];
function freshDb(): LinguaDB {
  const db = createDb(`thesaurus-${Math.random().toString(36).slice(2)}`);
  open.push(db);
  return db;
}
afterEach(async () => {
  await Promise.all(open.splice(0).map((db) => db.delete()));
});

async function withSpanish(db: LinguaDB) {
  await completeOnboarding({ target: 'es', native: 'en', level: 'A0', seedKnown: false, theme: 'paper' }, db);
  await db.starterLists.put({
    lang: 'es',
    version: 2,
    lemmaFreq: ['de', 'ser', 'casa', 'perro', 'comer'],
    themes: { animals: [['perro', 'dog', 'noun', 'm'], ['gato', 'cat', 'noun', 'm'], ['oso polar', 'polar bear', 'noun', 'm']] },
  });
  await db.dictEntries.bulkPut([
    { pack: 'es-en', lemma: 'de', senses: [{ pos: 'prep', glosses: ['of', 'from'] }] },
    { pack: 'es-en', lemma: 'ser', senses: [{ pos: 'verb', glosses: ['to be (essentially or identified as)'] }] },
    { pack: 'es-en', lemma: 'casa', gender: 'f', senses: [{ pos: 'noun', glosses: ['house'] }] },
    { pack: 'es-en', lemma: 'perro', gender: 'm', ipa: '/ˈpero/', senses: [{ pos: 'noun', glosses: ['dog'] }] },
    { pack: 'es-en', lemma: 'comer', senses: [{ pos: 'verb', glosses: ['to eat'] }] },
  ]);
  await db.dictExamples.put({ pack: 'es-en', lemma: 'perro', ex: [['El perro duerme.', 'The dog sleeps.', 3, 8]] });
}

describe('ready-made decks', () => {
  it('builds a frequency band with meanings, examples and what is already known', async () => {
    const db = freshDb();
    await withSpanish(db);
    await setWordState('es', 'de', 1, {}, db);
    const items = await starterItems('es', { kind: 'frequency', milestone: 100 }, db);
    expect(items.map((i) => i.term)).toEqual(['de', 'ser', 'casa', 'perro', 'comer']);
    expect(items[1].meaning).toBe('to be');
    expect(items[0].known).toBe(true);
    expect(items[3]).toMatchObject({ gender: 'm', ipa: '/ˈpero/', freqRank: 4, wordId: 'es:perro', example: { text: 'El perro duerme.', cloze: [3, 8] } });
  });

  it('adds a deck once, skipping known words and words already in a deck, in list order', async () => {
    const db = freshDb();
    await withSpanish(db);
    await setWordState('es', 'de', 1, {}, db);
    await setWordState('es', 'casa', 2, {}, db); // now a card in "From my reading"
    const first = await addStarterDeck('es', { kind: 'frequency', milestone: 100 }, { skipKnown: true }, db);
    expect(first).toMatchObject({ added: 3, skippedKnown: 1, skippedInDeck: 1 });
    const deck = await db.decks.get(first.deckId);
    expect(deck).toMatchObject({ name: 'Top 100', kind: 'starterFrequency' });
    expect((await db.folders.get(deck!.folderId!))?.name).toBe('Ready-made');

    const session = await loadStudySession('es', first.deckId, Date.now(), db);
    expect(session.queue.map((c) => session.notes.get(c.noteId)?.term)).toEqual(['ser', 'perro', 'comer']);

    const again = await addStarterDeck('es', { kind: 'frequency', milestone: 100 }, { skipKnown: true }, db);
    expect(again).toMatchObject({ deckId: first.deckId, added: 0 });

    const theme = await addStarterDeck('es', { kind: 'theme', id: 'animals' }, { skipKnown: false }, db);
    expect(theme.added).toBe(2); // perro is already in Top 100; the phrase "oso polar" stays
  });

  it('adds a ready-made deck to a deck you have, skipping the words already there (5.1-3b)', async () => {
    const db = freshDb();
    await withSpanish(db);
    const deckId = await createDeck('es', { name: 'Holiday' }, db);
    await addNote(deckId, { term: 'perro', meaning: 'dog' }, db);
    const first = await addStarterToDeck('es', { kind: 'theme', id: 'animals' }, deckId, { skipKnown: false }, db);
    expect(first).toMatchObject({ deckId, added: 2, skippedInDeck: 1 });
    const again = await addStarterToDeck('es', { kind: 'theme', id: 'animals' }, deckId, { skipKnown: false }, db);
    expect(again).toMatchObject({ added: 0, skippedInDeck: 3 });
    const terms = (await db.notes.where('deckId').equals(deckId).toArray()).map((n) => n.term).sort();
    expect(terms).toEqual(['gato', 'oso polar', 'perro']);
  });

  it('gathers the words looked up in songs and shows, the most met first (5.1-3b)', async () => {
    const db = freshDb();
    await withSpanish(db);
    const now = Date.now();
    const base = { lang: 'es', createdAt: now, updatedAt: now };
    await db.sightings.bulkPut([
      { ...base, id: 'es:casa:video:v1', norm: 'casa', lemma: 'casa', surface: 'casa', kind: 'video', sourceId: 'v1', title: 'A show', sentence: 'Mi casa es tu casa.', at: now, count: 1 },
      { ...base, id: 'es:perros:song:s1', norm: 'perros', lemma: 'perro', surface: 'perros', kind: 'song', sourceId: 's1', title: 'A song', sentence: 'Los perros ladran.', at: now - 10, count: 3 },
      { ...base, id: 'es:comer:book:b1', norm: 'comer', lemma: 'comer', surface: 'comer', kind: 'book', sourceId: 'b1', title: 'A book', at: now, count: 5 },
    ]);
    const items = await starterItems('es', { kind: 'theme', id: 'heard' }, db);
    // Read in a book doesn't count; the song's word was met more often.
    expect(items.map((i) => i.term)).toEqual(['perro', 'casa']);
    expect(items[0]).toMatchObject({ meaning: 'dog', wordId: 'es:perro', example: { text: 'Los perros ladran.', cloze: [4, 10] } });
  });
});

describe('studying', () => {
  it('respects the daily new-card limit and records answers with undo', async () => {
    const db = freshDb();
    await withSpanish(db);
    const deckId = await createDeck('es', { name: 'Mine' }, db);
    const deck = (await db.decks.get(deckId))!;
    await updateDeck(deckId, { config: { ...deck.config, newPerDay: 2 } }, db);
    for (const term of ['uno', 'dos', 'tres']) await addNote(deckId, { term, meaning: term }, db);

    let session = await loadStudySession('es', deckId, Date.now(), db);
    expect(session.queue).toHaveLength(2);
    const { card, undo } = await answerCard(session.queue[0], 3, { lang: 'es', mode: 'classic', durationMs: 4000 }, db);
    expect(card.state).toBe(1);
    expect(card.reps).toBe(1);
    expect(await db.reviewLogs.count()).toBe(1);
    expect((await db.dailyStats.get(`es:${localDateKey()}`))?.reviews).toBe(1);

    session = await loadStudySession('es', deckId, Date.now(), db);
    expect(session.queue.filter((c) => c.state === 0)).toHaveLength(1); // one new card left today

    await undoAnswer(undo, db);
    expect((await db.cards.get(card.id))?.state).toBe(0);
    expect(await db.reviewLogs.count()).toBe(0);
    expect((await db.dailyStats.get(`es:${localDateKey()}`))?.reviews).toBe(0);
  });

  it('practice outside the schedule is logged without moving the card', async () => {
    const db = freshDb();
    await withSpanish(db);
    const deckId = await createDeck('es', { name: 'Mine' }, db);
    await addNote(deckId, { term: 'uno', meaning: 'one' }, db);
    const [card] = await db.cards.toArray();
    const { card: after } = await answerCard(card, 1, { lang: 'es', mode: 'mcq', durationMs: 2000, affectSchedule: false }, db);
    expect(after).toEqual(card);
    expect((await db.reviewLogs.toArray())[0]).toMatchObject({ affectedSchedule: 0, mode: 'mcq', rating: 1 });
  });

  it('a mined card that matures marks its word Known in the reader', async () => {
    const db = freshDb();
    await withSpanish(db);
    await setWordState('es', 'casa', 2, { gloss: 'house' }, db);
    const card = (await db.cards.toArray())[0];
    const now = Date.now();
    const review = { ...card, state: 2 as const, stability: 40, difficulty: 4, reps: 6, scheduledDays: 30, lastReview: now - 30 * 86_400_000, due: now };
    await db.cards.put(review);
    const { card: after } = await answerCard(review, 3, { lang: 'es', mode: 'classic', durationMs: 3000, now }, db);
    expect(after.scheduledDays).toBeGreaterThanOrEqual(21);
    expect((await db.words.get('es:casa'))?.state).toBe(1);
    expect(await db.cards.get(card.id)).toBeDefined(); // Known keeps the card
  });

  it('counts due cards per deck and forgets deleted decks', async () => {
    const db = freshDb();
    await withSpanish(db);
    const deckId = await createDeck('es', { name: 'Mine' }, db);
    await addNote(deckId, { term: 'uno', meaning: 'one' }, db);
    await addNote(deckId, { term: 'dos', meaning: 'two' }, db);
    const deck = (await db.decks.get(deckId))!;
    expect(await deckCounts(deck, Date.now(), db)).toEqual({ total: 2, new: 2, learning: 0, due: 0 });
    expect(await dueSummary('es', Date.now(), db)).toMatchObject({ due: 0, fresh: 2 });
    await deleteDeck(deckId, db);
    expect((await deckCounts(deck, Date.now(), db)).total).toBe(0);
    expect(await dueSummary('es', Date.now(), db)).toMatchObject({ due: 0, fresh: 0, decks: 0 });
  });
});

describe('forgetting a deck', () => {
  it('puts every card back to new, most common first, and keeps the history', async () => {
    const db = freshDb();
    await withSpanish(db);
    const deckId = await createDeck('es', { name: 'Mine' }, db);
    for (const [term, freqRank] of [['tres', 30], ['uno', 10], ['dos', 20]] as const) await addNote(deckId, { term, meaning: term, freqRank }, db);
    const session = await loadStudySession('es', deckId, Date.now(), db);
    await answerCard(session.queue[0], 3, { lang: 'es', mode: 'classic', durationMs: 4000 }, db);
    await answerCard(session.queue[1], 4, { lang: 'es', mode: 'classic', durationMs: 4000 }, db);

    expect(await forgetDeck(deckId, db)).toBe(3);
    const cards = (await db.cards.where('deckId').equals(deckId).toArray()).sort((a, b) => a.due - b.due);
    expect(cards.map((c) => [c.state, c.reps, c.lapses])).toEqual([[0, 0, 0], [0, 0, 0], [0, 0, 0]]);
    const notes = await db.notes.bulkGet(cards.map((c) => c.noteId));
    expect(notes.map((n) => n?.term)).toEqual(['uno', 'dos', 'tres']);
    expect(await db.reviewLogs.count()).toBe(2);
  });
});

describe('the order of new cards', () => {
  it('puts the most common words first, or shuffles them, and keeps the order once studied', async () => {
    const db = freshDb();
    await withSpanish(db);
    const deckId = await createDeck('es', { name: 'Mine' }, db);
    for (const [term, freqRank] of [['raro', 900], ['comer', 5], ['casa', 3], ['solo', undefined]] as const) await addNote(deckId, { term, meaning: term, freqRank }, db);
    const terms = async () => {
      const cards = (await db.cards.where('deckId').equals(deckId).toArray()).sort((a, b) => a.due - b.due);
      return (await db.notes.bulkGet(cards.map((c) => c.noteId))).map((n) => n?.term);
    };

    await orderNewCards(deckId, 'ordered', Math.random, db);
    expect(await terms()).toEqual(['casa', 'comer', 'raro', 'solo']);

    let seed = 7;
    await orderNewCards(deckId, 'shuffled', () => ((seed = (seed * 16807) % 2147483647) / 2147483647), db);
    const shuffled = await terms();
    expect([...shuffled].sort()).toEqual(['casa', 'comer', 'raro', 'solo']);
    expect(shuffled).not.toEqual(['casa', 'comer', 'raro', 'solo']);

    await orderNewCards(deckId, 'ordered', Math.random, db);
    expect(await terms()).toEqual(['casa', 'comer', 'raro', 'solo']);
  });
});
