// Diarium entries: writing, saving as you type, and keeping each AI review with the text it read.
import { useLiveQuery } from 'dexie-react-hooks';
import { countWords } from '@/core/text/tokenizer';
import { localDateKey } from '@/lib/format';
import { db } from './db';
import type { LinguaDB } from './db';
import { addNote, createDeck } from './decks';
import type { NoteInput } from './decks';
import type { JournalEntry, JournalReview } from './types';

export function useJournal(lang: string): JournalEntry[] | undefined {
  return useLiveQuery(
    async () =>
      (await db.journalEntries.where('lang').equals(lang).toArray())
        .filter((e) => !e.deletedAt)
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
    [lang],
  );
}

export function useJournalEntry(id: string | undefined): JournalEntry | null | undefined {
  return useLiveQuery(async () => (id ? ((await db.journalEntries.get(id)) ?? null) : null), [id]);
}

export async function createEntry(lang: string, prompt?: { text: string; en?: string }, database: LinguaDB = db): Promise<string> {
  const now = Date.now();
  const entry: JournalEntry = { id: crypto.randomUUID(), lang, date: localDateKey(now), prompt: prompt?.text, promptEn: prompt?.en, text: '', words: 0, createdAt: now, updatedAt: now };
  await database.journalEntries.add(entry);
  return entry.id;
}

export async function saveEntryText(id: string, text: string, lang: string, database: LinguaDB = db): Promise<void> {
  await database.journalEntries.update(id, { text, words: countWords(text, lang), updatedAt: Date.now() });
}

export async function updateEntry(id: string, patch: Partial<Pick<JournalEntry, 'title' | 'prompt' | 'date'>>, database: LinguaDB = db): Promise<void> {
  await database.journalEntries.update(id, { ...patch, updatedAt: Date.now() });
}

/** Stores a review; the text it replaced is kept as an earlier version when it differed. */
export async function saveReview(id: string, review: JournalReview, database: LinguaDB = db): Promise<void> {
  await database.transaction('rw', database.journalEntries, async () => {
    const entry = await database.journalEntries.get(id);
    if (!entry) return;
    const versions = [...(entry.versions ?? [])];
    if (entry.review && entry.review.text !== review.text) versions.push({ text: entry.review.text, at: entry.review.reviewedAt });
    await database.journalEntries.put({ ...entry, review, versions: versions.slice(-10), updatedAt: Date.now() });
  });
}

/** Adopts the corrected text as the entry (the review stays, so the changes can still be seen). */
export async function acceptCorrections(id: string, lang: string, database: LinguaDB = db): Promise<void> {
  const entry = await database.journalEntries.get(id);
  if (!entry?.review) return;
  const versions = [...(entry.versions ?? []), { text: entry.text, at: Date.now() }].slice(-10);
  await database.journalEntries.update(id, { text: entry.review.corrected, words: countWords(entry.review.corrected, lang), versions, updatedAt: Date.now() });
}

export async function deleteEntry(id: string, database: LinguaDB = db): Promise<void> {
  await database.journalEntries.update(id, { deletedAt: Date.now(), updatedAt: Date.now() });
}

/** The Thesaurus deck that corrections and words from the journal go to. */
export async function ensureJournalDeck(lang: string, database: LinguaDB = db): Promise<string> {
  const existing = await database.decks
    .where('lang')
    .equals(lang)
    .filter((d) => d.name === 'Journal' && !d.deletedAt)
    .first();
  if (existing) return existing.id;
  return createDeck(lang, { name: 'Journal', description: 'Corrections and words from your Diarium entries.' }, database);
}

/** Adds a correction or a word to the Journal deck; returns false when it is already there. */
export async function addToJournalDeck(lang: string, note: NoteInput, database: LinguaDB = db): Promise<boolean> {
  const deckId = await ensureJournalDeck(lang, database);
  const same = await database.notes
    .where('deckId')
    .equals(deckId)
    .filter((n) => !n.deletedAt && n.term.toLocaleLowerCase(lang) === note.term.toLocaleLowerCase(lang))
    .first();
  if (same) return false;
  await addNote(deckId, note, database);
  return true;
}
