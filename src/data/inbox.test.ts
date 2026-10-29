import { afterEach, describe, expect, it } from 'vitest';
import { createDb } from './db';
import type { LinguaDB } from './db';
import { addNote, createDeck } from './decks';
import { duplicateDeck, mergeDecks, setDeckFlag } from './deckTools';
import { addInboxToDeck, inboxStateOf, markInboxKnown, setInboxState } from './inbox';
import { recordSighting } from './memory';
import { loadStudySession } from './study';
import type { Word } from './types';
import { setWordFavourite, setWordState } from './words';

const open: LinguaDB[] = [];
function freshDb(): LinguaDB {
  const db = createDb(`inbox-${Math.random().toString(36).slice(2)}`);
  open.push(db);
  return db;
}
afterEach(async () => {
  await Promise.all(open.splice(0).map((db) => db.delete()));
});

const row = (patch: Partial<Word>): Word => ({ id: 'es:x', lang: 'es', norm: 'x', state: 0, stateChangedAt: 1, createdAt: 1, updatedAt: 1, ...patch });

describe('where a word waits', () => {
  it('is new with no row, kept when it has one that says nothing, and follows what the learner did', () => {
    expect(inboxStateOf([])).toBe('new');
    expect(inboxStateOf([undefined, null])).toBe('new');
    expect(inboxStateOf([row({})])).toBe('kept');
    expect(inboxStateOf([row({ inbox: 'new' })])).toBe('new');
    expect(inboxStateOf([row({ inbox: 'ignored' })])).toBe('ignored');
    expect(inboxStateOf([row({ state: 1 })])).toBe('kept');
    // Learning a word beats having ignored one of its forms.
    expect(inboxStateOf([row({ inbox: 'ignored' }), row({ state: 2 })])).toBe('kept');
    expect(inboxStateOf([row({ deletedAt: 5, inbox: 'ignored' })])).toBe('new');
  });

  it('moves words with a bulk change, making rows for words that had none', async () => {
    const db = freshDb();
    await setInboxState('es', ['uno', 'dos', 'uno'], 'ignored', db);
    expect((await db.words.toArray()).map((w) => [w.norm, w.state, w.inbox]).sort()).toEqual([['dos', 0, 'ignored'], ['uno', 0, 'ignored']]);
    await setInboxState('es', ['uno'], 'new', db);
    expect((await db.words.get('es:uno'))?.inbox).toBe('new');
  });

  it('a word marked a favourite from the dictionary is kept, not waiting', async () => {
    const db = freshDb();
    await setWordFavourite('es', 'casa', true, {}, db);
    expect(inboxStateOf([await db.words.get('es:casa')])).toBe('kept');
  });
});

describe('deciding about words in the inbox', () => {
  it('Mark known makes them Known and takes them out of the inbox', async () => {
    const db = freshDb();
    expect(await markInboxKnown('es', ['hola', 'holas'], db)).toBe(2);
    expect((await db.words.toArray()).map((w) => [w.state, w.inbox])).toEqual([[1, 'kept'], [1, 'kept']]);
  });

  it('Add to a deck makes a flashcard with the meaning and the sentence it was met in, once', async () => {
    const db = freshDb();
    const deckId = await createDeck('es', { name: 'Mine' }, db);
    await recordSighting('es', 'casas', { surface: 'casas', lemma: 'casa', sentence: 'Las casas son viejas.', where: { kind: 'chat', id: 'c1', title: 'A chat' } }, db);
    const words = [{ key: 'casa', forms: ['casas', 'casa'], term: 'casa', lemma: 'casa', gloss: 'house', sentence: 'Las casas son viejas.' }];
    expect(await addInboxToDeck('es', deckId, words, db)).toEqual({ added: 1, skipped: 0 });
    const note = (await db.notes.toArray())[0];
    expect(note).toMatchObject({ term: 'casa', meaning: 'house', deckId, wordId: 'es:casa', context: { sentence: 'Las casas son viejas.' } });
    expect(await db.cards.where('noteId').equals(note.id).count()).toBeGreaterThan(0);
    expect(await db.words.get('es:casa')).toMatchObject({ state: 2, noteId: note.id, inbox: 'kept' });
    expect(await db.words.get('es:casas')).toMatchObject({ state: 0, inbox: 'kept' });
    expect(await addInboxToDeck('es', deckId, words, db)).toEqual({ added: 0, skipped: 1 });
    expect(await db.notes.count()).toBe(1);
  });

  it('a word already learning keeps the card it has', async () => {
    const db = freshDb();
    await setWordState('es', 'perro', 2, { surface: 'perro', gloss: 'dog' }, db);
    const deckId = await createDeck('es', { name: 'Mine' }, db);
    expect(await addInboxToDeck('es', deckId, [{ key: 'perro', forms: ['perro'], term: 'perro' }], db)).toEqual({ added: 0, skipped: 1 });
  });
});

describe('the deck workshop', () => {
  async function deckWithWords(db: LinguaDB, name: string, terms: string[], lang = 'es') {
    const id = await createDeck(lang, { name }, db);
    for (const t of terms) await addNote(id, { term: t, meaning: `m-${t}`, tags: ['t'] }, db);
    return id;
  }

  it('an archived deck leaves the lessons that mix decks, but can be studied by name', async () => {
    const db = freshDb();
    const a = await deckWithWords(db, 'A', ['uno']);
    const b = await deckWithWords(db, 'B', ['dos']);
    await setDeckFlag(b, 'archived', true, db);
    expect([...(await loadStudySession('es', null, Date.now(), db)).decks.keys()]).toEqual([a]);
    expect([...(await loadStudySession('es', b, Date.now(), db)).decks.keys()]).toEqual([b]);
    await setDeckFlag(b, 'archived', false, db);
    expect((await loadStudySession('es', null, Date.now(), db)).decks.size).toBe(2);
    await setDeckFlag(a, 'pinned', true, db);
    await setDeckFlag(a, 'important', true, db);
    expect(await db.decks.get(a)).toMatchObject({ pinned: 1, important: 1 });
  });

  it('a copy has the same notes and fresh cards, and is a deck of its own', async () => {
    const db = freshDb();
    const id = await deckWithWords(db, 'Verbs', ['comer', 'beber']);
    await db.decks.update(id, { pinned: 1, archived: 1, kind: 'mined' });
    const note = (await db.notes.where('deckId').equals(id).first())!;
    await db.notes.update(note.id, { wordId: 'es:comer' });
    await db.cards.where('noteId').equals(note.id).modify({ reps: 5, state: 2 });
    const copyId = await duplicateDeck(id, db);
    const copy = (await db.decks.get(copyId))!;
    expect(copy).toMatchObject({ name: 'Verbs (copy)', kind: 'custom', archived: 0, pinned: 0 });
    const notes = await db.notes.where('deckId').equals(copyId).toArray();
    expect(notes.map((n) => n.term).sort()).toEqual(['beber', 'comer']);
    expect(notes.every((n) => !n.wordId && n.id !== note.id)).toBe(true);
    const cards = await db.cards.where('deckId').equals(copyId).toArray();
    expect(cards.length).toBeGreaterThanOrEqual(2);
    expect(cards.every((c) => c.reps === 0 && c.state === 0)).toBe(true);
    // The original is as it was.
    expect((await db.cards.where('noteId').equals(note.id).first())?.reps).toBe(5);
  });

  it('merging moves the notes and cards and puts the emptied deck away; another language is left alone', async () => {
    const db = freshDb();
    const a = await deckWithWords(db, 'A', ['uno']);
    const b = await deckWithWords(db, 'B', ['dos', 'tres']);
    const f = await deckWithWords(db, 'F', ['un'], 'fr');
    expect(await mergeDecks(a, [b, f, a], db)).toBe(2);
    expect((await db.notes.where('deckId').equals(a).toArray()).map((n) => n.term).sort()).toEqual(['dos', 'tres', 'uno']);
    expect(await db.cards.where('deckId').equals(a).count()).toBe(3);
    expect((await db.decks.get(b))?.deletedAt).toBeGreaterThan(0);
    expect((await db.decks.get(f))?.deletedAt).toBeUndefined();
    expect(await db.notes.where('deckId').equals(f).count()).toBe(1);
  });
});
