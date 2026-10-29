import { useLiveQuery } from 'dexie-react-hooks';
import { getLanguage } from '@/core/lang/languages';
import { bumpDaily } from './activity';
import { defaultDeckConfig, newCard } from './decks';
import { db } from './db';
import { recordSighting } from './memory';
import type { LinguaDB } from './db';
import type { WordHistory } from '@/core/contracts/word';
import type { Deck, Note, SightingKind, Word, WordState } from './types';

export const wordId = (lang: string, norm: string) => `${lang}:${norm}`;

/** Current states for a set of forms (absent = Unseen). One IndexedDB read. */
export async function getWordStates(lang: string, norms: string[], database: LinguaDB = db): Promise<Map<string, WordState>> {
  const rows = await database.words.bulkGet(norms.map((n) => wordId(lang, n)));
  const states = new Map<string, WordState>();
  rows.forEach((row, i) => {
    if (row && !row.deletedAt && row.state) states.set(norms[i], row.state);
  });
  return states;
}

export function useWord(lang: string, norm: string | null): Word | null | undefined {
  return useLiveQuery(async () => (norm ? ((await db.words.get(wordId(lang, norm))) ?? null) : null), [lang, norm]);
}

export interface WordContext {
  /** The word as written in the text (kept for the flashcard front). */
  surface?: string;
  sentence?: string;
  gloss?: string;
  /** Set when `gloss` was picked for this sentence: the word's usual meaning, which it differs from. */
  usualGloss?: string;
  lemma?: string;
  textId?: string;
  chapterIndex?: number;
  blockIndex?: number;
  /** Found while listening or watching: the item and the line's clip. */
  mediaId?: string;
  /** Heard in a song. */
  songId?: string;
  startMs?: number;
  endMs?: number;
  source?: Note['source'];
  /** Where it was met when that isn't a text, a song or a programme (a conversation, a drill). */
  where?: { kind: SightingKind; id: string; title: string };
}

/** The language's "From my reading" deck, created on first use. */
export async function ensureMinedDeck(lang: string, database: LinguaDB = db): Promise<string> {
  const existing = await database.decks.where('lang').equals(lang).filter((d) => d.kind === 'mined' && !d.deletedAt).first();
  if (existing) return existing.id;
  const now = Date.now();
  const deck: Deck = {
    id: crypto.randomUUID(),
    lang,
    folderId: null,
    name: 'From my reading',
    description: `${getLanguage(lang)?.name ?? lang} words you marked as Learning while reading.`,
    order: 0,
    kind: 'mined',
    config: await defaultDeckConfig(database),
    createdAt: now,
    updatedAt: now,
  };
  await database.decks.add(deck);
  return deck.id;
}

/**
 * Sets a word's state with its side effects:
 * - Learning creates a flashcard (note + card) in "From my reading", with the sentence as context.
 * - Leaving Learning deletes a never-reviewed card; a reviewed card is suspended on Reset and kept on Known.
 */
export async function setWordState(lang: string, norm: string, state: WordState, ctx: WordContext = {}, database: LinguaDB = db): Promise<void> {
  const id = wordId(lang, norm);
  const previous = await database.transaction('rw', [database.words, database.notes, database.cards, database.decks, database.settings], async (): Promise<WordState> => {
    const now = Date.now();
    const existing = await database.words.get(id);
    const before: WordState = existing && !existing.deletedAt ? existing.state : 0;
    if (before === state) return before;

    const word: Word = {
      ...(existing ?? { id, lang, norm, createdAt: now }),
      state,
      stateChangedAt: now,
      updatedAt: now,
      lemma: existing?.lemma ?? ctx.lemma,
      deletedAt: undefined,
    } as Word;

    const card = word.noteId ? await database.cards.where('noteId').equals(word.noteId).filter((c) => !c.deletedAt).first() : undefined;
    if (state === 2) {
      if (card) {
        await database.cards.update(card.id, { suspended: 0, updatedAt: now });
      } else {
        const deckId = await ensureMinedDeck(lang, database);
        const note: Note = {
          id: crypto.randomUUID(),
          deckId,
          lang,
          term: ctx.surface?.toLocaleLowerCase(lang) ?? norm,
          meaning: existing?.gloss ?? ctx.gloss ?? '',
          lemma: ctx.lemma,
          context: ctx.sentence ? { sentence: ctx.sentence, textId: ctx.textId, chapterIndex: ctx.chapterIndex, blockIndex: ctx.blockIndex, mediaId: ctx.mediaId, songId: ctx.songId, startMs: ctx.startMs, endMs: ctx.endMs } : undefined,
          tags: [],
          source: ctx.source ?? 'codex',
          wordId: id,
          createdAt: now,
          updatedAt: now,
        };
        await database.notes.add(note);
        await database.cards.add(newCard(note.id, deckId, now));
        word.noteId = note.id;
      }
    } else if (card) {
      if (card.reps === 0) {
        await database.cards.delete(card.id);
        await database.notes.delete(card.noteId);
        word.noteId = undefined;
      } else if (state === 0) {
        await database.cards.update(card.id, { suspended: 1, updatedAt: now });
      }
    }
    await database.words.put(word);
    return before;
  });

  if (state !== previous && state !== 0) await recordSighting(lang, norm, ctx, database).catch(() => undefined);
  if (state === 1 && previous !== 1) await bumpDaily(lang, { newKnown: 1 }, database);
  if (state === 2 && previous !== 2) await bumpDaily(lang, { newLearning: 1 }, database);
}

/** Marks many Unseen forms as Known at once (page-turn auto-known, proficiency seeding). No cards involved. */
export async function markKnownBulk(lang: string, norms: string[], database: LinguaDB = db): Promise<number> {
  if (!norms.length) return 0;
  const now = Date.now();
  let added = 0;
  await database.transaction('rw', database.words, async () => {
    const ids = norms.map((n) => wordId(lang, n));
    const existing = await database.words.bulkGet(ids);
    const rows: Word[] = [];
    existing.forEach((row, i) => {
      if (row && !row.deletedAt && row.state !== 0) return;
      rows.push({ ...(row ?? { id: ids[i], lang, norm: norms[i], createdAt: now }), state: 1, stateChangedAt: now, updatedAt: now, deletedAt: undefined });
    });
    await database.words.bulkPut(rows);
    added = rows.length;
  });
  return added;
}

export async function setWordGloss(lang: string, norm: string, gloss: string, database: LinguaDB = db): Promise<void> {
  const id = wordId(lang, norm);
  const now = Date.now();
  await database.transaction('rw', database.words, database.notes, async () => {
    const existing = await database.words.get(id);
    const word: Word = { ...(existing ?? { id, lang, norm, state: 0, stateChangedAt: now, createdAt: now }), gloss: gloss.trim() || undefined, updatedAt: now };
    await database.words.put(word);
    if (word.noteId) await database.notes.update(word.noteId, { meaning: gloss.trim(), updatedAt: now });
  });
}

/** Applies proficiency seeding once the frequency list is installed. */
export async function applyKnownSeed(lang: string, database: LinguaDB = db): Promise<number> {
  const profile = await database.languages.get(lang);
  if (!profile || !profile.seededKnownTopN || profile.seedAppliedAt) return 0;
  const top = await database.frequency.where('[lang+rank]').between([lang, 1], [lang, profile.seededKnownTopN], true, true).toArray();
  if (!top.length) return 0;
  const added = await markKnownBulk(lang, top.map((r) => r.norm), database);
  await database.languages.update(lang, { seedAppliedAt: Date.now(), updatedAt: Date.now() });
  return added;
}

export function useVocabularyCounts(lang: string): { known: number; learning: number } | undefined {
  return useLiveQuery(async () => {
    const [known, learning] = await Promise.all([
      db.words.where('[lang+state]').equals([lang, 1]).count(),
      db.words.where('[lang+state]').equals([lang, 2]).count(),
    ]);
    return { known, learning };
  }, [lang]);
}

// ── The learner's half of a word (6-1) ──────────────────────────────────────

export const MAX_TAGS = 12;
const MAX_TAG_LENGTH = 24;

/** A tag as it is kept: trimmed, one line, short. */
export const cleanTag = (tag: string) => tag.replace(/[\s,]+/g, ' ').trim().slice(0, MAX_TAG_LENGTH);

/** A list of tags as it is kept: cleaned, none twice (whatever the case), at most twelve. */
export function cleanTags(tags: readonly string[], lang?: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = cleanTag(raw);
    const key = tag.toLocaleLowerCase(lang);
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out.slice(0, MAX_TAGS);
}

/** Changes the learner's fields of a word. A word never met yet gets a row of its own (Unseen), so a favourite can be set from the dictionary. */
type WordFields = Partial<Pick<Word, 'tags' | 'favourite' | 'important' | 'note'>>;

async function patchWord(lang: string, norm: string, patch: WordFields | ((word: Word) => WordFields), ctx: { lemma?: string; gloss?: string }, database: LinguaDB): Promise<void> {
  const id = wordId(lang, norm);
  await database.transaction('rw', database.words, async () => {
    const now = Date.now();
    const existing = await database.words.get(id);
    const base: Word = existing ?? { id, lang, norm, state: 0, stateChangedAt: now, lemma: ctx.lemma, gloss: ctx.gloss, createdAt: now, updatedAt: now };
    await database.words.put({ ...base, ...(typeof patch === 'function' ? patch(base) : patch), deletedAt: undefined, updatedAt: now });
  });
}

export const setWordFavourite = (lang: string, norm: string, on: boolean, ctx: { lemma?: string; gloss?: string } = {}, database: LinguaDB = db) =>
  patchWord(lang, norm, { favourite: on ? 1 : 0 }, ctx, database);

export const setWordImportant = (lang: string, norm: string, on: boolean, ctx: { lemma?: string; gloss?: string } = {}, database: LinguaDB = db) =>
  patchWord(lang, norm, { important: on ? 1 : 0 }, ctx, database);

export const setWordTags = (lang: string, norm: string, tags: readonly string[], ctx: { lemma?: string; gloss?: string } = {}, database: LinguaDB = db) =>
  patchWord(lang, norm, { tags: cleanTags(tags, lang) }, ctx, database);

/** Changes the saved tags as they are when it runs (two quick changes never undo each other, as they would if each read the screen's list). */
export const changeWordTags = (lang: string, norm: string, change: (tags: string[]) => string[], ctx: { lemma?: string; gloss?: string } = {}, database: LinguaDB = db) =>
  patchWord(lang, norm, (word) => ({ tags: cleanTags(change(word.tags ?? []), lang) }), ctx, database);

/** The learner's own note on the word (the field `Word.note` has always had; now edited on the word's page). */
export const setWordNote = (lang: string, norm: string, note: string, ctx: { lemma?: string; gloss?: string } = {}, database: LinguaDB = db) =>
  patchWord(lang, norm, { note: note.trim() ? note : undefined }, ctx, database);

/** The words of a language the learner marked, newest change first (for a filter in the dictionary and the word memory). */
export async function markedWords(lang: string, flag: 'favourite' | 'important', database: LinguaDB = db): Promise<Word[]> {
  const rows = await database.words.where(`[lang+${flag}]`).equals([lang, 1]).toArray();
  return rows.filter((w) => !w.deletedAt).sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * What the learner has done with a word, worked out when asked and never stored: when it was first met, how it was reviewed,
 * how often it was recalled. Its flashcards are found by the note's `wordId`; its review log is the cards' own.
 */
export async function wordHistory(lang: string, norm: string, database: LinguaDB = db): Promise<WordHistory & { places: number; log: Array<{ at: number; rating: number; mode: string }> }> {
  const id = wordId(lang, norm);
  const [word, sightings, notes] = await Promise.all([database.words.get(id), database.sightings.where('[lang+norm]').equals([lang, norm]).toArray(), database.notes.where('wordId').equals(id).toArray()]);
  const cardIds = (await database.cards.where('noteId').anyOf(notes.map((n) => n.id)).toArray()).filter((c) => !c.deletedAt).map((c) => c.id);
  const logs = cardIds.length ? await database.reviewLogs.where('cardId').anyOf(cardIds).toArray() : [];
  const met = [...sightings.map((s) => s.at), ...(word && !word.deletedAt ? [word.createdAt] : [])];
  return {
    firstMetAt: met.length ? Math.min(...met) : undefined,
    lastReviewedAt: logs.length ? Math.max(...logs.map((l) => l.reviewedAt)) : undefined,
    recallRate: logs.length ? logs.filter((l) => l.rating >= 3).length / logs.length : undefined,
    reviews: logs.length,
    places: sightings.length,
    log: logs.sort((a, b) => b.reviewedAt - a.reviewedAt).slice(0, 30).map((l) => ({ at: l.reviewedAt, rating: l.rating, mode: l.mode })),
  };
}

export function useWordHistory(lang: string, norm: string | null) {
  return useLiveQuery(async () => (norm ? wordHistory(lang, norm) : undefined), [lang, norm]);
}
