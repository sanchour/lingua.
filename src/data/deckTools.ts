// The deck workshop (6-2): putting a deck away, pinning it, copying it, folding one into another.
import { db } from './db';
import type { LinguaDB } from './db';
import { makeNote } from './decks';
import type { NoteInput } from './decks';
import type { Bit, Deck } from './types';

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
