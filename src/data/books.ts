// Audiobooks and courses. A book is its parts: ordinary Sonus items that share a `bookId`, with
// `episode` as the part's number, so downloads, transcripts, sync and backups work unchanged. The
// book's title is its parts' `collection` and its author their `artist`; changing the book writes
// every part.
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import type { LinguaDB } from './db';
import { deleteMedia } from './media';
import type { Media, PlaybackProgress } from './types';

export type BookKind = NonNullable<Media['bookKind']>;

export interface Book {
  id: string;
  lang: string;
  title: string;
  author?: string;
  kind: BookKind;
  /** In order, by part number. */
  parts: Media[];
  /** The first part's artwork. */
  coverBlobId?: string;
  coverUrl?: string;
  /** All parts together, when every part's length is known. */
  durationMs?: number;
  /** The Codex text the book is read along with. */
  readAlongTextId?: string;
  /** Lessons marked done (courses). */
  done: number;
  /** When one of its parts was last played. */
  lastPlayedAt?: number;
  createdAt: number;
}

const alive = (m: Media | undefined): m is Media => Boolean(m && !m.deletedAt);

/** Part order: by number, then by when they were added. */
export const byPart = (a: Media, b: Media): number => (a.episode ?? 0) - (b.episode ?? 0) || a.createdAt - b.createdAt;

/** The books among a list of items, most recently played (or added) first. */
export function groupBooks(media: readonly Media[]): Book[] {
  const groups = new Map<string, Media[]>();
  for (const m of media) {
    if (!alive(m) || !m.bookId) continue;
    const parts = groups.get(m.bookId);
    if (parts) parts.push(m);
    else groups.set(m.bookId, [m]);
  }
  const books = [...groups].map(([id, parts]) => toBook(id, parts));
  return books.sort((a, b) => (b.lastPlayedAt ?? b.createdAt) - (a.lastPlayedAt ?? a.createdAt));
}

function toBook(id: string, unsorted: Media[]): Book {
  const parts = [...unsorted].sort(byPart);
  const first = parts[0];
  const cover = parts.find((p) => p.coverBlobId || p.coverUrl) ?? first;
  const lengths = parts.map((p) => p.durationMs);
  const played = parts.map((p) => p.lastPlayedAt ?? 0);
  return {
    id,
    lang: first.lang,
    title: parts.find((p) => p.collection)?.collection ?? first.title,
    author: parts.find((p) => p.artist)?.artist,
    kind: first.bookKind ?? 'audiobook',
    parts,
    coverBlobId: cover.coverBlobId,
    coverUrl: cover.coverUrl,
    durationMs: lengths.every((ms) => ms) ? lengths.reduce<number>((sum, ms) => sum + (ms ?? 0), 0) : undefined,
    readAlongTextId: parts.find((p) => p.readAlongTextId)?.readAlongTextId,
    done: parts.filter((p) => p.doneAt).length,
    lastPlayedAt: Math.max(...played) || undefined,
    createdAt: Math.min(...parts.map((p) => p.createdAt)),
  };
}

async function partsOf(bookId: string, database: LinguaDB): Promise<Media[]> {
  return (await database.media.where('bookId').equals(bookId).toArray()).filter(alive);
}

// ── Reading ──────────────────────────────────────────────────────────────────

/** A language's audiobooks and courses. */
export function useBooks(lang: string): Book[] | undefined {
  return useLiveQuery(async () => groupBooks(await db.media.where('lang').equals(lang).toArray()), [lang]);
}

export async function getBook(bookId: string, database: LinguaDB = db): Promise<Book | null> {
  const parts = await partsOf(bookId, database);
  return parts.length ? toBook(bookId, parts) : null;
}

export function useBook(bookId: string | undefined): Book | null | undefined {
  return useLiveQuery(async () => (bookId ? getBook(bookId) : null), [bookId]);
}

/** The part after (or, with -1, before) this one in its book; null at either end. */
export async function nextPart(media: Pick<Media, 'id' | 'bookId'>, step: 1 | -1 = 1, database: LinguaDB = db): Promise<Media | null> {
  if (!media.bookId) return null;
  const parts = (await partsOf(media.bookId, database)).sort(byPart);
  const at = parts.findIndex((p) => p.id === media.id);
  return at < 0 ? null : (parts[at + step] ?? null);
}

/**
 * Where to carry on: the part played last unless it was finished (then the one after it); for a
 * course, the first lesson not yet done; else the first part.
 */
export function continuePart(book: Book, playback?: ReadonlyMap<string, PlaybackProgress>): Media {
  const { parts } = book;
  if (book.kind === 'course') {
    const open = parts.find((p) => !p.doneAt);
    if (open) return open;
  }
  const last = parts.reduce<Media | null>((best, p) => ((p.lastPlayedAt ?? 0) > (best?.lastPlayedAt ?? 0) ? p : best), null);
  if (!last) return parts[0];
  const finished = playback?.get(last.id)?.completed || (book.kind === 'course' && last.doneAt);
  if (!finished) return last;
  return parts[parts.indexOf(last) + 1] ?? last;
}

// ── Changing ─────────────────────────────────────────────────────────────────

export interface BookPatch {
  title?: string;
  author?: string;
  kind?: BookKind;
  /** null stops reading along. */
  readAlongTextId?: string | null;
}

/** Renames the book, changes its kind or its read-along text: every part is written. */
export async function updateBook(bookId: string, patch: BookPatch, database: LinguaDB = db): Promise<void> {
  const now = Date.now();
  const change: Partial<Media> = { updatedAt: now };
  if (patch.title !== undefined) change.collection = patch.title.trim() || 'Untitled';
  if (patch.author !== undefined) change.artist = patch.author.trim() || undefined;
  if (patch.kind !== undefined) change.bookKind = patch.kind;
  if (patch.readAlongTextId !== undefined) change.readAlongTextId = patch.readAlongTextId ?? undefined;
  await database.transaction('rw', database.media, async () => {
    for (const part of await partsOf(bookId, database)) await database.media.update(part.id, change);
  });
}

/** Marks a course's lesson done (or not done again). */
export async function setLessonDone(mediaId: string, done: boolean, database: LinguaDB = db): Promise<void> {
  const now = Date.now();
  await database.media.update(mediaId, { doneAt: done ? now : undefined, updatedAt: now });
}

/** Removes the book: every part with its audio, transcript and position. */
export async function deleteBook(bookId: string, database: LinguaDB = db): Promise<void> {
  for (const part of await partsOf(bookId, database)) await deleteMedia(part.id, database);
}

/** A part that streams from the web (LibriVox), like a podcast episode. */
export interface RemotePart {
  /** Stable within the book (the file's name), so opening the book again finds its parts. */
  guid: string;
  title: string;
  remoteUrl: string;
  mime?: string;
  durationMs?: number;
  sizeBytes?: number;
}

export interface RemoteBook {
  lang: string;
  bookId: string;
  title: string;
  author?: string;
  kind: BookKind;
  coverUrl?: string;
  description?: string;
  parts: RemotePart[];
}

/** Adds a book whose parts stream from the web; parts it already has are kept as they are. */
export async function saveRemoteBook(input: RemoteBook, database: LinguaDB = db): Promise<string> {
  const now = Date.now();
  await database.transaction('rw', database.media, async () => {
    const existing = new Set((await partsOf(input.bookId, database)).map((p) => p.guid));
    const rows: Media[] = input.parts
      .map((part, i) => ({ part, episode: i + 1 }))
      .filter(({ part }) => !existing.has(part.guid))
      .map(({ part, episode }) => ({
        id: crypto.randomUUID(),
        lang: input.lang,
        kind: 'audio',
        title: part.title.trim() || `Part ${episode}`,
        collection: input.title,
        artist: input.author,
        durationMs: part.durationMs,
        mime: part.mime,
        sizeBytes: part.sizeBytes,
        guid: part.guid,
        remoteUrl: part.remoteUrl,
        coverUrl: input.coverUrl,
        description: input.description,
        bookId: input.bookId,
        bookKind: input.kind,
        episode,
        createdAt: now,
        updatedAt: now,
      }));
    if (rows.length) await database.media.bulkAdd(rows);
  });
  return input.bookId;
}
