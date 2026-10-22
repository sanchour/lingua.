// Covers for Goodreads books, from Open Library (which sends CORS). By ISBN, fifty to a request,
// through the Books API: its answers name covers by id, which Open Library doesn't rate-limit (the
// covers-by-ISBN address allows 100 an IP every five minutes). Books without an ISBN, or with one
// Open Library doesn't know, by title and author, one at a time.
import { plainTitle } from '@/core/parsers/goodreads';
import { db } from '@/data/db';
import type { LinguaDB } from '@/data/db';
import type { Text } from '@/data/types';

const OPEN_LIBRARY = 'https://openlibrary.org';
const coverById = (id: number) => `https://covers.openlibrary.org/b/id/${id}-M.jpg`;

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Open Library answered ${res.status}`);
  return (await res.json()) as T;
}

/** The covers Open Library has for these ISBNs, by ISBN. */
export async function isbnCovers(isbns: string[], signal?: AbortSignal): Promise<Map<string, string>> {
  const keys = isbns.map((isbn) => `ISBN:${isbn}`).join(',');
  const data = await getJson<Record<string, { cover?: { medium?: string } }>>(`${OPEN_LIBRARY}/api/books?bibkeys=${encodeURIComponent(keys)}&format=json&jscmd=data`, signal);
  // A cover id of -1 is Open Library's "none" (a one-pixel picture).
  return new Map(Object.entries(data).flatMap(([key, book]) => (book.cover?.medium && !book.cover.medium.includes('/id/-1-') ? [[key.slice('ISBN:'.length), book.cover.medium.replace(/^http:/, 'https:')] as const] : [])));
}

/** A cover found by title and author (the best match that has one), or '' when there is none. */
export async function searchCover(title: string, author: string | undefined, signal?: AbortSignal): Promise<string> {
  const params = new URLSearchParams({ title: plainTitle(title), limit: '5', fields: 'cover_i' });
  if (author) params.set('author', author);
  const data = await getJson<{ docs?: Array<{ cover_i?: number }> }>(`${OPEN_LIBRARY}/search.json?${params}`, signal);
  const id = data.docs?.find((d) => (d.cover_i ?? 0) > 0)?.cover_i;
  return id ? coverById(id) : '';
}

const pause = (ms: number, signal: AbortSignal) => new Promise((resolve) => setTimeout(resolve, signal.aborted ? 0 : ms));

/**
 * Looks up covers for the language's Goodreads books that have none yet, saving each as it comes
 * ('' when Open Library has none, so it isn't asked again). Stops when `signal` aborts, or at the
 * first failure (offline): the rest is asked for next time.
 */
export async function fillCovers(lang: string, signal: AbortSignal, database: LinguaDB = db): Promise<void> {
  const missing = (await database.texts.where('lang').equals(lang).toArray()).filter((t) => t.goodreads && !t.deletedAt && !t.coverBlobId && t.coverUrl === undefined);
  const left = new Map<string, Text>(missing.map((t) => [t.id, t]));

  const withIsbn = missing.filter((t) => t.goodreads?.isbn13);
  for (let i = 0; i < withIsbn.length && !signal.aborted; i += 50) {
    const batch = withIsbn.slice(i, i + 50);
    const found = await isbnCovers([...new Set(batch.map((t) => t.goodreads!.isbn13!))], signal);
    const changes = batch.flatMap((t) => {
      const url = found.get(t.goodreads!.isbn13!);
      if (!url) return [];
      left.delete(t.id);
      return [{ key: t.id, changes: { coverUrl: url } }];
    });
    if (changes.length) await database.texts.bulkUpdate(changes);
  }

  for (const t of left.values()) {
    if (signal.aborted) return;
    await database.texts.update(t.id, { coverUrl: await searchCover(t.title, t.author, signal) });
    await pause(250, signal);
  }
}
