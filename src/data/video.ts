// Visio data: videos (files or links), their two subtitle tracks, and lines saved as flashcards.
import { useLiveQuery } from 'dexie-react-hooks';
import { getLanguage } from '@/core/lang/languages';
import { db } from './db';
import type { LinguaDB } from './db';
import { defaultDeckConfig, newCard } from './decks';
import type { Cue, Deck, Media, Note, Transcript } from './types';

export type TrackRole = Transcript['role'];

const trackId = (mediaId: string, role: TrackRole) => `${mediaId}:${role}`;

export interface NewVideo {
  lang: string;
  title: string;
  /** A stored file, or a link to stream. */
  blob?: Blob;
  mime?: string;
  url?: string;
  durationMs?: number;
  poster?: Blob;
  collection?: string;
  /** A YouTube video: played from YouTube's embed, with its picture from the web. */
  youtubeId?: string;
  coverUrl?: string;
}

export async function addVideo(input: NewVideo, database: LinguaDB = db): Promise<string> {
  const id = crypto.randomUUID();
  const now = Date.now();
  const blobId = input.blob ? crypto.randomUUID() : undefined;
  const coverBlobId = input.poster ? crypto.randomUUID() : undefined;
  await database.transaction('rw', database.media, database.blobs, async () => {
    if (input.blob && blobId) await database.blobs.add({ id: blobId, kind: 'video', mime: input.mime ?? input.blob.type, size: input.blob.size, blob: input.blob, createdAt: now });
    if (input.poster && coverBlobId) await database.blobs.add({ id: coverBlobId, kind: 'cover', mime: 'image/jpeg', size: input.poster.size, blob: input.poster, createdAt: now });
    await database.media.add({
      id,
      lang: input.lang,
      kind: 'video',
      title: input.title.trim() || 'Untitled',
      collection: input.collection,
      blobId,
      mime: input.mime ?? input.blob?.type,
      sizeBytes: input.blob?.size,
      remoteUrl: input.url,
      youtubeId: input.youtubeId,
      coverUrl: input.coverUrl,
      durationMs: input.durationMs,
      coverBlobId,
      createdAt: now,
      updatedAt: now,
    });
  });
  return id;
}

export interface Tracks {
  target: Transcript | null;
  native: Transcript | null;
}

export function useTracks(mediaId: string | undefined): Tracks | undefined {
  return useLiveQuery(async () => {
    if (!mediaId) return { target: null, native: null };
    const [target, native] = await db.transcripts.bulkGet([trackId(mediaId, 'target'), trackId(mediaId, 'native')]);
    return { target: target && !target.deletedAt ? target : null, native: native && !native.deletedAt ? native : null };
  }, [mediaId]);
}

/** Which videos have each track (for the badges on the shelf). */
export function useTrackIndex(): Map<string, Set<TrackRole>> | undefined {
  return useLiveQuery(async () => {
    const out = new Map<string, Set<TrackRole>>();
    for (const t of await db.transcripts.toArray()) {
      if (t.deletedAt) continue;
      if (!out.has(t.mediaId)) out.set(t.mediaId, new Set());
      out.get(t.mediaId)!.add(t.role);
    }
    return out;
  }, []);
}

export async function saveTrack(mediaId: string, lang: string, role: TrackRole, cues: Cue[], source: Transcript['source'], database: LinguaDB = db): Promise<void> {
  const now = Date.now();
  const id = trackId(mediaId, role);
  const existing = await database.transcripts.get(id);
  await database.transcripts.put({ id, mediaId, lang, role, source, offsetMs: 0, cues, createdAt: existing?.createdAt ?? now, updatedAt: now });
}

export async function removeTrack(mediaId: string, role: TrackRole, database: LinguaDB = db): Promise<void> {
  await database.transcripts.update(trackId(mediaId, role), { deletedAt: Date.now(), updatedAt: Date.now() });
}

/** Moves a track earlier or later (subtitles that run out of sync). */
export async function shiftTrack(mediaId: string, role: TrackRole, deltaMs: number, database: LinguaDB = db): Promise<void> {
  const t = await database.transcripts.get(trackId(mediaId, role));
  if (!t) return;
  const move = (ms: number) => Math.max(0, ms + deltaMs);
  await database.transcripts.update(t.id, {
    cues: t.cues.map((c) => ({ ...c, startMs: move(c.startMs), endMs: move(c.endMs), words: c.words?.map((w) => ({ ...w, startMs: move(w.startMs), endMs: move(w.endMs) })) })),
    offsetMs: t.offsetMs + deltaMs,
    updatedAt: Date.now(),
  });
}

/** Frees the space of a video file but keeps its subtitles and the cards made from it. */
export async function keepSubtitlesOnly(mediaId: string, database: LinguaDB = db): Promise<void> {
  const media = await database.media.get(mediaId);
  if (!media?.blobId) return;
  await database.blobs.delete(media.blobId);
  await database.media.update(mediaId, { blobId: undefined, sizeBytes: undefined, updatedAt: Date.now() });
}

export async function attachVideoFile(mediaId: string, blob: Blob, database: LinguaDB = db): Promise<void> {
  const blobId = crypto.randomUUID();
  const now = Date.now();
  await database.transaction('rw', database.media, database.blobs, async () => {
    const media = await database.media.get(mediaId);
    if (media?.blobId) await database.blobs.delete(media.blobId);
    await database.blobs.add({ id: blobId, kind: 'video', mime: blob.type, size: blob.size, blob, createdAt: now });
    await database.media.update(mediaId, { blobId, mime: blob.type, sizeBytes: blob.size, updatedAt: now });
  });
}

export async function videoBlob(media: Pick<Media, 'blobId'>, database: LinguaDB = db): Promise<Blob | undefined> {
  return media.blobId ? (await database.blobs.get(media.blobId))?.blob : undefined;
}

/** The language's "From Visio" deck, created on first use. */
export async function ensureVisioDeck(lang: string, database: LinguaDB = db): Promise<string> {
  const existing = await database.decks
    .where('lang')
    .equals(lang)
    .filter((d) => d.kind === 'visio' && !d.deletedAt)
    .first();
  if (existing) return existing.id;
  const now = Date.now();
  const deck: Deck = {
    id: crypto.randomUUID(),
    lang,
    folderId: null,
    name: 'From Visio',
    description: `${getLanguage(lang)?.name ?? lang} lines and words saved while watching.`,
    order: 0,
    kind: 'visio',
    config: await defaultDeckConfig(database),
    createdAt: now,
    updatedAt: now,
  };
  await database.decks.add(deck);
  return deck.id;
}

/**
 * Saves a subtitle line as a card: the line on the front, your own subtitle (or a translation) on
 * the back, and the clip so the card can replay it. Returns false when the line is already saved.
 */
export async function saveLine(media: Media, cue: Cue, translation: string, database: LinguaDB = db): Promise<boolean> {
  const deckId = await ensureVisioDeck(media.lang, database);
  const same = await database.notes
    .where('deckId')
    .equals(deckId)
    .filter((n) => !n.deletedAt && n.context?.mediaId === media.id && n.context?.startMs === cue.startMs)
    .first();
  if (same) return false;
  const now = Date.now();
  const note: Note = {
    id: crypto.randomUUID(),
    deckId,
    lang: media.lang,
    term: cue.text,
    meaning: translation,
    context: { sentence: cue.text, mediaId: media.id, startMs: cue.startMs, endMs: cue.endMs },
    tags: ['line'],
    source: 'visio',
    createdAt: now,
    updatedAt: now,
  };
  await database.transaction('rw', database.notes, database.cards, async () => {
    await database.notes.add(note);
    await database.cards.add(newCard(note.id, deckId, now));
  });
  return true;
}
