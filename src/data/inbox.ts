// The inbox (6-2): saving is not scheduling. A word met or looked up waits here until the learner decides: add it to a deck,
// mark it known, or ignore it. Nothing is made a card until they do.
import type { InboxState } from '@/core/contracts/word';
import { bumpDaily } from './activity';
import { db } from './db';
import type { LinguaDB } from './db';
import { addNote } from './decks';
import type { Word } from './types';
import { markKnownBulk, wordId } from './words';

/**
 * Where a word waits, from the rows of its forms. A word with no row at all was only met: it is new. A row that says nothing
 * (a favourite, a reset word, one from before the inbox) is kept; so is any word the learner knows or is learning.
 */
export function inboxStateOf(rows: ReadonlyArray<Word | undefined | null>): InboxState {
  const live = rows.filter((w): w is Word => Boolean(w && !w.deletedAt));
  if (!live.length) return 'new';
  if (live.some((w) => w.state > 0)) return 'kept';
  if (live.some((w) => w.inbox === 'ignored')) return 'ignored';
  return live.every((w) => w.inbox === 'new') ? 'new' : 'kept';
}

/** Sets where some words wait, making a (Unseen) row for a word that has none. */
export async function setInboxState(lang: string, norms: readonly string[], state: InboxState, database: LinguaDB = db): Promise<void> {
  const unique = [...new Set(norms)];
  await database.transaction('rw', database.words, async () => {
    const now = Date.now();
    const existing = await database.words.bulkGet(unique.map((n) => wordId(lang, n)));
    await database.words.bulkPut(
      unique.map((norm, i): Word => {
        const row = existing[i];
        return row ? { ...row, inbox: state, deletedAt: undefined, updatedAt: now } : { id: wordId(lang, norm), lang, norm, state: 0, stateChangedAt: now, inbox: state, createdAt: now, updatedAt: now };
      }),
    );
  });
}

/** Marks words Known and takes them out of the inbox. */
export async function markInboxKnown(lang: string, norms: readonly string[], database: LinguaDB = db): Promise<number> {
  const n = await markKnownBulk(lang, [...norms], database);
  await setInboxState(lang, norms, 'kept', database);
  return n;
}

export interface InboxWord {
  /** The word's key (its lemma, or the form met). */
  key: string;
  /** Every form met, so the reader knows them all. */
  forms: string[];
  term: string;
  lemma?: string;
  gloss?: string;
  /** The last sentence it was met in. */
  sentence?: string;
}

/**
 * Adds words to a deck as flashcards with their meaning and the sentence they were met in, and makes them Learning. A word that
 * already has a flashcard stays as it is (counted as skipped), so adding twice never makes two.
 */
export async function addInboxToDeck(lang: string, deckId: string, words: readonly InboxWord[], database: LinguaDB = db): Promise<{ added: number; skipped: number }> {
  let added = 0;
  let skipped = 0;
  for (const w of words) {
    const id = wordId(lang, w.key);
    const row = await database.words.get(id);
    if (row && !row.deletedAt && row.noteId) {
      skipped++;
      continue;
    }
    const noteId = await addNote(
      deckId,
      { term: w.term, meaning: w.gloss ?? '', lemma: w.lemma, wordId: id, source: 'codex', context: w.sentence ? { sentence: w.sentence } : undefined },
      database,
    );
    const now = Date.now();
    const became = !row || row.deletedAt || row.state !== 2;
    await database.words.put({ ...(row ?? { id, lang, norm: w.key, createdAt: now }), state: 2, stateChangedAt: now, noteId, inbox: 'kept', lemma: row?.lemma ?? w.lemma, deletedAt: undefined, updatedAt: now } as Word);
    // The other forms met stay as they were: only the word's own row carries the card.
    await setInboxState(lang, w.forms.filter((f) => f !== w.key), 'kept', database);
    if (became) await bumpDaily(lang, { newLearning: 1 }, database);
    added++;
  }
  return { added, skipped };
}
