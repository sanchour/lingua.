// Phrases chosen in the reader, saved as cards in "From my reading".
import { db } from './db';
import type { LinguaDB } from './db';
import { newCard } from './decks';
import type { Note } from './types';
import { ensureMinedDeck } from './words';

export interface PhraseContext {
  sentence?: string;
  textId?: string;
  chapterIndex?: number;
  blockIndex?: number;
}

/** Saves a phrase with its translation. Returns false when the same phrase is already in the deck. */
export async function savePhrase(lang: string, phrase: string, meaning: string, ctx: PhraseContext = {}, database: LinguaDB = db): Promise<boolean> {
  const term = phrase.trim();
  const deckId = await ensureMinedDeck(lang, database);
  const same = await database.notes
    .where('deckId')
    .equals(deckId)
    .filter((n) => !n.deletedAt && n.term.toLocaleLowerCase(lang) === term.toLocaleLowerCase(lang))
    .first();
  if (same) return false;
  const now = Date.now();
  const note: Note = {
    id: crypto.randomUUID(),
    deckId,
    lang,
    term,
    meaning: meaning.trim(),
    context: ctx.sentence ? { sentence: ctx.sentence, textId: ctx.textId, chapterIndex: ctx.chapterIndex, blockIndex: ctx.blockIndex } : undefined,
    tags: ['phrase'],
    source: 'codex',
    createdAt: now,
    updatedAt: now,
  };
  await database.transaction('rw', database.notes, database.cards, async () => {
    await database.notes.add(note);
    await database.cards.add(newCard(note.id, deckId, now));
  });
  return true;
}
