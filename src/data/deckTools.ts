// The deck workshop (6-2): putting a deck away, pinning it, copying it, folding one into another.
import { db } from './db';
import type { LinguaDB } from './db';
import { createDeck, deleteNote, makeNote, moveNote, setSuspended } from './decks';
import type { NoteInput } from './decks';
import type { Bit, Deck } from './types';
import type { Draft } from '@/core/srs/deckFrom';

export type DeckFlag = 'archived' | 'pinned' | 'important';

/**
 * Archived is not "mastered": the deck, its cards and its history stay, it only leaves the lists and the lessons that mix decks.
 * Pinned decks sit first; important ones are marked.
 */
export async function setDeckFlag(id: string, flag: DeckFlag, on: boolean, database: LinguaDB = db): Promise<void> {
  const bit: Bit = on ? 1 : 0;
  const deck = await database.decks.get(id);
  if (deck) await database.decks.put({ ...deck, [flag]: bit, updatedAt: Date.now() });
}

/** A copy of a deck with fresh cards: its notes as they are written, none of its schedule or history. */
export async function duplicateDeck(id: string, database: LinguaDB = db): Promise<string> {
  const source = await database.decks.get(id);
  if (!source || source.deletedAt) throw new Error('This deck no longer exists.');
  const now = Date.now();
  const copy: Deck = {
    ...source,
    id: crypto.randomUUID(),
    name: `${source.name} (copy)`,
    // A copy is a deck of its own: a ready-made list or a book's words would otherwise be filled in again.
    kind: 'custom',
    starter: undefined,
    archived: 0,
    pinned: 0,
    order: (await database.decks.where('lang').equals(source.lang).count()) + 1,
    createdAt: now,
    updatedAt: now,
  };
  const notes = (await database.notes.where('deckId').equals(id).toArray()).filter((n) => !n.deletedAt).sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt));
  await database.transaction('rw', database.decks, database.notes, database.cards, async () => {
    await database.decks.add(copy);
    for (const n of notes) {
      // The copy's cards are not linked to the word (a word's card is one card), and carry no history.
      const { id: _id, deckId: _deckId, wordId: _wordId, createdAt: _c, updatedAt: _u, deletedAt: _d, lang: _l, ...input } = n;
      const made = makeNote(copy, input as NoteInput, now);
      await database.notes.add(made.note);
      await database.cards.bulkAdd(made.cards);
    }
  });
  return copy.id;
}

/** Moves the notes and cards of some decks into one, and puts the emptied decks away (deleted, as a deck deleted by hand). */
export async function mergeDecks(intoId: string, fromIds: readonly string[], database: LinguaDB = db): Promise<number> {
  const target = await database.decks.get(intoId);
  if (!target || target.deletedAt) throw new Error('This deck no longer exists.');
  let moved = 0;
  await database.transaction('rw', database.decks, database.notes, database.cards, async () => {
    const now = Date.now();
    for (const fromId of new Set(fromIds)) {
      if (fromId === intoId) continue;
      const from = await database.decks.get(fromId);
      if (!from || from.deletedAt || from.lang !== target.lang) continue;
      const notes = await database.notes.where('deckId').equals(fromId).toArray();
      moved += notes.filter((n) => !n.deletedAt).length;
      await database.notes.where('deckId').equals(fromId).modify({ deckId: intoId, updatedAt: now });
      await database.cards.where('noteId').anyOf(notes.map((n) => n.id)).modify({ deckId: intoId, updatedAt: now });
      await database.decks.update(fromId, { deletedAt: now, updatedAt: now });
    }
  });
  return moved;
}

/** Bulk actions on the cards a learner has selected in a deck (6-2b). */
export async function moveNotes(ids: readonly string[], deckId: string, database: LinguaDB = db): Promise<void> {
  const target = await database.decks.get(deckId);
  if (!target || target.deletedAt) throw new Error('This deck no longer exists.');
  for (const id of ids) await moveNote(id, deckId, database);
}

export async function deleteNotes(ids: readonly string[], database: LinguaDB = db): Promise<void> {
  for (const id of ids) await deleteNote(id, database);
}

export async function suspendNotes(ids: readonly string[], suspended: boolean, database: LinguaDB = db): Promise<void> {
  for (const id of ids) await setSuspended(id, suspended, database);
}

/** Adds and removes tags on each note as it is when this runs; tags are compared without case and kept in the order they came. */
export async function tagNotes(ids: readonly string[], change: { add?: string[]; remove?: string[] }, database: LinguaDB = db): Promise<void> {
  const add = (change.add ?? []).map((t) => t.trim()).filter(Boolean);
  const remove = new Set((change.remove ?? []).map((t) => t.trim().toLocaleLowerCase()));
  await database.transaction('rw', database.notes, async () => {
    for (const id of ids) {
      const note = await database.notes.get(id);
      if (!note) continue;
      const kept = (note.tags ?? []).filter((t) => !remove.has(t.toLocaleLowerCase()));
      const have = new Set(kept.map((t) => t.toLocaleLowerCase()));
      const tags = [...kept, ...add.filter((t) => !have.has(t.toLocaleLowerCase()) && have.add(t.toLocaleLowerCase()))];
      await database.notes.update(id, { tags, updatedAt: Date.now() });
    }
  });
}

/** A deck of the words a learner pasted or picked from a text; each draft becomes a card as if added by hand. */
export async function deckFromDrafts(lang: string, name: string, drafts: readonly Draft[], database: LinguaDB = db): Promise<string> {
  const deckId = await createDeck(lang, { name }, database);
  const deck = (await database.decks.get(deckId))!;
  const now = Date.now();
  await database.transaction('rw', database.notes, database.cards, async () => {
    for (const d of drafts) {
      const made = makeNote(deck, { term: d.term, meaning: d.meaning }, now);
      await database.notes.add(made.note);
      await database.cards.bulkAdd(made.cards);
    }
  });
  return deckId;
}

/** The normalised words the learner already knows (state 1), so a deck made from a text leaves them out. */
export async function knownNorms(lang: string, database: LinguaDB = db): Promise<Set<string>> {
  return new Set((await database.words.where('lang').equals(lang).filter((w) => w.state === 1 && !w.deletedAt).toArray()).map((w) => w.norm));
}

/** Moves a deck one place up (-1) or down (1) among the decks of its folder, for a tree sorted by hand. The places are written out again, so every deck has its own. */
export async function shiftDeck(id: string, by: -1 | 1, database: LinguaDB = db): Promise<void> {
  const deck = await database.decks.get(id);
  if (!deck) return;
  const siblings = (await database.decks.where('lang').equals(deck.lang).toArray())
    .filter((d) => !d.deletedAt && d.folderId === deck.folderId)
    .sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);
  const at = siblings.findIndex((d) => d.id === id);
  const to = at + by;
  if (at < 0 || to < 0 || to >= siblings.length) return;
  [siblings[at], siblings[to]] = [siblings[to], siblings[at]];
  const now = Date.now();
  await database.transaction('rw', database.decks, () => Promise.all(siblings.map((d, i) => (d.order === i ? undefined : database.decks.update(d.id, { order: i, updatedAt: now })))));
}
