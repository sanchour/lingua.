import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import type { LinguaDB } from './db';

const bookmarkKey = (lang: string) => `grammar:bookmarks:${lang}`;
const noteKey = (lang: string) => `grammar:notes:${lang}`;

export type TopicNotesMap = Record<string, { note: string; updatedAt: number }>;

export async function getGrammarBookmarks(lang: string, database: LinguaDB = db): Promise<Set<string>> {
  const row = await database.settings.get(bookmarkKey(lang));
  if (!row || !Array.isArray(row.value)) return new Set();
  return new Set(row.value as string[]);
}

export function useGrammarBookmarks(lang: string): Set<string> {
  const result = useLiveQuery(() => getGrammarBookmarks(lang), [lang]);
  return result ?? new Set();
}

export async function toggleGrammarBookmark(lang: string, topicId: string, database: LinguaDB = db): Promise<boolean> {
  const current = await getGrammarBookmarks(lang, database);
  const next = new Set(current);
  let isBookmarked = false;
  if (next.has(topicId)) {
    next.delete(topicId);
  } else {
    next.add(topicId);
    isBookmarked = true;
  }
  await database.settings.put({
    key: bookmarkKey(lang),
    value: Array.from(next),
    updatedAt: Date.now(),
  });
  return isBookmarked;
}

export async function isGrammarBookmarked(lang: string, topicId: string, database: LinguaDB = db): Promise<boolean> {
  const bookmarks = await getGrammarBookmarks(lang, database);
  return bookmarks.has(topicId);
}

export async function getGrammarNotesMap(lang: string, database: LinguaDB = db): Promise<TopicNotesMap> {
  const row = await database.settings.get(noteKey(lang));
  if (!row || typeof row.value !== 'object' || row.value === null) return {};
  return row.value as TopicNotesMap;
}

export async function getGrammarNote(lang: string, topicId: string, database: LinguaDB = db): Promise<string> {
  const map = await getGrammarNotesMap(lang, database);
  return map[topicId]?.note ?? '';
}

export function useGrammarNote(lang: string, topicId: string): string | undefined {
  return useLiveQuery(async () => {
    return getGrammarNote(lang, topicId);
  }, [lang, topicId]);
}

export async function saveGrammarNote(lang: string, topicId: string, noteText: string, database: LinguaDB = db): Promise<void> {
  const current = await getGrammarNotesMap(lang, database);
  const next = { ...current };
  const trimmed = noteText.trim();
  if (!trimmed) {
    delete next[topicId];
  } else {
    next[topicId] = {
      note: trimmed,
      updatedAt: Date.now(),
    };
  }
  await database.settings.put({
    key: noteKey(lang),
    value: next,
    updatedAt: Date.now(),
  });
}
