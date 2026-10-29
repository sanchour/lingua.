// Thesaurus storage: folders, decks, notes and their cards. Deleting keeps tombstones (deletedAt)
// so backups merge correctly; tombstoned cards move to TRASH_DECK so deck counts stay index-only.
import Dexie from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { dayEnd } from '@/core/srs/scheduler';
import { db } from './db';
import type { LinguaDB } from './db';
import { getSettings } from './settings';
import { DEFAULT_DECK_CONFIG, makeNote, newCard } from './cardFactory';
import type { NoteInput } from './cardFactory';
import type { Card, Deck, Folder, Note } from './types';

export { DEFAULT_DECK_CONFIG, makeNote, newCard } from './cardFactory';
export type { NoteInput } from './cardFactory';

export const TRASH_DECK = '~deleted';

/** Deck settings start from the learner's study defaults (Settings › Study). */
export async function defaultDeckConfig(database: LinguaDB = db): Promise<Deck['config']> {
  const study = (await getSettings(database)).study;
  return { ...DEFAULT_DECK_CONFIG, newPerDay: study.newPerDay, maxReviews: study.maxReviews, desiredRetention: study.desiredRetention };
}

const alive = <T extends { deletedAt?: number }>(row: T | undefined): row is T => Boolean(row && !row.deletedAt);
const byOrder = (a: { order: number; name: string }, b: { order: number; name: string }) => a.order - b.order || a.name.localeCompare(b.name);

// ── Reading ─────────────────────────────────────────────────────────────────

export function useFolders(lang: string): Folder[] | undefined {
  return useLiveQuery(async () => (await db.folders.where('lang').equals(lang).toArray()).filter(alive).sort(byOrder), [lang]);
}

export function useDecks(lang: string): Deck[] | undefined {
  return useLiveQuery(async () => (await db.decks.where('lang').equals(lang).toArray()).filter(alive).sort(byOrder), [lang]);
}

export function useDeck(id: string | undefined): Deck | null | undefined {
  return useLiveQuery(async () => (id ? ((await db.decks.get(id)) ?? null) : null), [id]);
}

export interface DeckCounts {
  total: number;
  /** New cards still available today (the deck's daily limit minus those already started). */
  new: number;
  learning: number;
  /** Reviews due today. */
  due: number;
}

/** Card counts for a deck, mostly from indexes (cheap enough to stay live on the overview). */
export async function deckCounts(deck: Pick<Deck, 'id' | 'config'>, now = Date.now(), database: LinguaDB = db): Promise<DeckCounts> {
  const deckId = deck.id;
  const byState = (s: number) => database.cards.where('[deckId+state]').equals([deckId, s]).count();
  const [fresh, learning, relearning, review, due, introduced] = await Promise.all([
    byState(0),
    byState(1),
    byState(3),
    byState(2),
    database.cards
      .where('[deckId+due]')
      .between([deckId, Dexie.minKey], [deckId, dayEnd(now)])
      .filter((c) => c.state === 2 && !c.suspended)
      .count(),
    database.reviewLogs
      .where('[deckId+reviewedAt]')
      .between([deckId, dayEnd(now) - 86_400_000], [deckId, Dexie.maxKey])
      .filter((l) => l.stateBefore === 0 && l.affectedSchedule === 1)
      .count(),
  ]);
  const newToday = Math.min(fresh, Math.max(0, deck.config.newPerDay - introduced));
  return { total: fresh + learning + relearning + review, new: newToday, learning: learning + relearning, due };
}

export function useDeckCounts(decks: Deck[] | undefined): Map<string, DeckCounts> | undefined {
  const key = decks?.map((d) => `${d.id}:${d.config.newPerDay}`).join(',') ?? '';
  return useLiveQuery(async () => {
    if (!decks) return undefined;
    const now = Date.now();
    const counts = await Promise.all(decks.map((d) => deckCounts(d, now)));
    return new Map(decks.map((d, i) => [d.id, counts[i]]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

export function useDeckNotes(deckId: string | undefined): Note[] | undefined {
  return useLiveQuery(async () => (deckId ? (await db.notes.where('deckId').equals(deckId).toArray()).filter(alive) : []), [deckId]);
}

export function useDeckCards(deckId: string | undefined): Card[] | undefined {
  return useLiveQuery(
    async () => (deckId ? (await db.cards.where('[deckId+due]').between([deckId, Dexie.minKey], [deckId, Dexie.maxKey]).toArray()).filter(alive) : []),
    [deckId],
  );
}

// ── Folders ─────────────────────────────────────────────────────────────────

export async function createFolder(lang: string, name: string, parentId: string | null = null, database: LinguaDB = db): Promise<string> {
  const now = Date.now();
  const siblings = await database.folders.where('lang').equals(lang).count();
  const folder: Folder = { id: crypto.randomUUID(), lang, parentId, name: name.trim() || 'New folder', order: siblings, createdAt: now, updatedAt: now };
  await database.folders.add(folder);
  return folder.id;
}

export async function updateFolder(id: string, patch: Partial<Pick<Folder, 'name' | 'parentId' | 'order'>>, database: LinguaDB = db): Promise<void> {
  await database.folders.update(id, { ...patch, updatedAt: Date.now() });
}

/** Removes a folder; its decks and sub-folders move up to its parent. */
export async function deleteFolder(id: string, database: LinguaDB = db): Promise<void> {
  await database.transaction('rw', database.folders, database.decks, async () => {
    const folder = await database.folders.get(id);
    if (!folder) return;
    const now = Date.now();
    await database.decks.where('folderId').equals(id).modify({ folderId: folder.parentId, updatedAt: now });
    await database.folders.where('parentId').equals(id).modify({ parentId: folder.parentId, updatedAt: now });
    await database.folders.update(id, { deletedAt: now, updatedAt: now });
  });
}

/** The folder ready-made decks go into, created on first use. */
export async function ensureFolder(lang: string, name: string, database: LinguaDB = db): Promise<string> {
  const existing = (await database.folders.where('lang').equals(lang).toArray()).find((f) => alive(f) && f.name === name && !f.parentId);
  return existing?.id ?? createFolder(lang, name, null, database);
}

// ── Decks ───────────────────────────────────────────────────────────────────

export interface NewDeck {
  name: string;
  folderId?: string | null;
  description?: string;
  kind?: Deck['kind'];
  starter?: Deck['starter'];
}

export async function createDeck(lang: string, input: NewDeck, database: LinguaDB = db): Promise<string> {
  const now = Date.now();
  const count = await database.decks.where('lang').equals(lang).count();
  const deck: Deck = {
    id: crypto.randomUUID(),
    lang,
    folderId: input.folderId ?? null,
    name: input.name.trim() || 'New deck',
    description: input.description,
    order: count,
    kind: input.kind ?? 'custom',
    starter: input.starter,
    config: await defaultDeckConfig(database),
    createdAt: now,
    updatedAt: now,
  };
  await database.decks.add(deck);
  return deck.id;
}

export async function updateDeck(id: string, patch: Partial<Pick<Deck, 'name' | 'description' | 'folderId' | 'order' | 'config' | 'color' | 'coverBlobId'>>, database: LinguaDB = db): Promise<void> {
  await database.decks.update(id, { ...patch, updatedAt: Date.now() });
}

/** Deletes a deck with its notes and cards. Words keep their reading state. */
export async function deleteDeck(id: string, database: LinguaDB = db): Promise<void> {
  await database.transaction('rw', [database.decks, database.notes, database.cards, database.words], async () => {
    const now = Date.now();
    const notes = await database.notes.where('deckId').equals(id).toArray();
    await database.words.bulkUpdate(notes.filter((n) => n.wordId).map((n) => ({ key: n.wordId!, changes: { noteId: undefined, updatedAt: now } })));
    await database.notes.where('deckId').equals(id).modify({ deletedAt: now, updatedAt: now });
    await database.cards
      .where('[deckId+due]')
      .between([id, Dexie.minKey], [id, Dexie.maxKey])
      .modify({ deletedAt: now, updatedAt: now, deckId: TRASH_DECK });
    await database.decks.update(id, { deletedAt: now, updatedAt: now });
  });
}

// ── Notes & cards ───────────────────────────────────────────────────────────

export async function addNote(deckId: string, input: NoteInput, database: LinguaDB = db): Promise<string> {
  const deck = await database.decks.get(deckId);
  if (!deck) throw new Error('This deck no longer exists.');
  const { note, cards } = makeNote(deck, input, Date.now());
  await database.transaction('rw', database.notes, database.cards, async () => {
    await database.notes.add(note);
    await database.cards.bulkAdd(cards);
  });
  return note.id;
}

export async function updateNote(id: string, patch: Partial<NoteInput>, database: LinguaDB = db): Promise<void> {
  await database.notes.update(id, { ...patch, updatedAt: Date.now() });
}

/** Moves a note (and its cards) to another deck. */
export async function moveNote(id: string, deckId: string, database: LinguaDB = db): Promise<void> {
  const now = Date.now();
  await database.transaction('rw', database.notes, database.cards, async () => {
    await database.notes.update(id, { deckId, updatedAt: now });
    await database.cards.where('noteId').equals(id).modify({ deckId, updatedAt: now });
  });
}

export async function deleteNote(id: string, database: LinguaDB = db): Promise<void> {
  const now = Date.now();
  await database.transaction('rw', [database.notes, database.cards, database.words], async () => {
    const note = await database.notes.get(id);
    if (note?.wordId) await database.words.update(note.wordId, { noteId: undefined, updatedAt: now });
    await database.cards.where('noteId').equals(id).modify({ deletedAt: now, updatedAt: now, deckId: TRASH_DECK });
    await database.notes.update(id, { deletedAt: now, updatedAt: now });
  });
}

/**
 * Changes which ways a deck is studied (word → meaning, meaning → word, or both): adds the missing
 * cards to every note and removes cards of a direction that was turned off.
 */
export async function setDeckDirections(deckId: string, directions: Card['direction'][], database: LinguaDB = db): Promise<void> {
  await database.transaction('rw', database.decks, database.notes, database.cards, async () => {
    const deck = await database.decks.get(deckId);
    if (!deck || !directions.length) return;
    const now = Date.now();
    await database.decks.update(deckId, { config: { ...deck.config, directions }, updatedAt: now });
    const cards = (await database.cards.where('[deckId+due]').between([deckId, Dexie.minKey], [deckId, Dexie.maxKey]).toArray()).filter((c) => !c.deletedAt);
    const removed = cards.filter((c) => !directions.includes(c.direction));
    await database.cards.bulkUpdate(removed.map((c) => ({ key: c.id, changes: { deletedAt: now, updatedAt: now, deckId: TRASH_DECK } })));
    const notes = (await database.notes.where('deckId').equals(deckId).toArray()).filter(alive);
    const have = new Set(cards.map((c) => `${c.noteId}:${c.direction}`));
    const added = notes.flatMap((n, i) => directions.filter((d) => !have.has(`${n.id}:${d}`)).map((d) => ({ ...newCard(n.id, deckId, now, d), due: now + i })));
    await database.cards.bulkAdd(added);
  });
}

/** Every card of a deck back to new, in the deck's order of new cards (5.1-3b, the settings' danger zone). The review history stays. */
export async function forgetDeck(deckId: string, database: LinguaDB = db): Promise<number> {
  const now = Date.now();
  const cards = (await database.cards.where('[deckId+due]').between([deckId, Dexie.minKey], [deckId, Dexie.maxKey]).toArray()).filter((c) => !c.deletedAt).sort((a, b) => a.createdAt - b.createdAt);
  await database.cards.bulkPut(
    cards.map((c, i) => {
      const { id: _id, noteId: _note, deckId: _deck, direction: _dir, createdAt: _made, suspended: _off, ...fresh } = newCard(c.noteId, deckId, now, c.direction);
      return { ...c, ...fresh, lastReview: undefined, due: now + i, updatedAt: now };
    }),
  );
  const deck = await database.decks.get(deckId);
  await orderNewCards(deckId, deck?.config.newOrder ?? 'ordered', Math.random, database);
  return cards.length;
}

/**
 * Puts a deck's new cards in order, most common words first (then as they were added), or shuffles
 * them (5.1-3b, the settings' Order). New cards come in the order of their due time.
 */
export async function orderNewCards(deckId: string, order: 'ordered' | 'shuffled', random: () => number = Math.random, database: LinguaDB = db): Promise<void> {
  const fresh = (await database.cards.where('[deckId+due]').between([deckId, Dexie.minKey], [deckId, Dexie.maxKey]).toArray()).filter((c) => c.state === 0 && !c.deletedAt);
  if (!fresh.length) return;
  const notes = new Map((await database.notes.bulkGet([...new Set(fresh.map((c) => c.noteId))])).flatMap((n) => (n ? [[n.id, n] as const] : [])));
  const rank = (c: Card) => notes.get(c.noteId)?.freqRank ?? Infinity;
  const made = (c: Card) => notes.get(c.noteId)?.createdAt ?? c.createdAt;
  let sorted: Card[];
  if (order === 'ordered') sorted = fresh.sort((a, b) => rank(a) - rank(b) || made(a) - made(b) || a.direction.localeCompare(b.direction));
  else {
    sorted = [...fresh];
    for (let i = sorted.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
    }
  }
  const start = Math.min(...fresh.map((c) => c.due));
  const now = Date.now();
  await database.cards.bulkPut(sorted.map((c, i) => ({ ...c, due: start + i, updatedAt: now })));
}

export async function setSuspended(noteId: string, suspended: boolean, database: LinguaDB = db): Promise<void> {
  await database.cards.where('noteId').equals(noteId).modify({ suspended: suspended ? 1 : 0, updatedAt: Date.now() });
}
