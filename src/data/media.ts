// Sonus data: audio items (files, podcast episodes, Spotify links), podcast feeds, transcripts and
// playback positions. Audio bytes live in `blobs`, so list queries never load them.
import { useLiveQuery } from 'dexie-react-hooks';
import type { ParsedFeed } from '@/core/parsers/rss';
import { db } from './db';
import type { LinguaDB } from './db';
import { addText } from './library';
import type { Cue, Feed, FeedEpisode, Media, PlaybackProgress, Transcript } from './types';

const alive = <T extends { deletedAt?: number }>(row: T | undefined): row is T => Boolean(row && !row.deletedAt);
const recent = (m: Media) => m.lastPlayedAt ?? m.createdAt;

// ── Reading ──────────────────────────────────────────────────────────────────

/** The listening library (or, with 'watch', the videos) for a language, most recently played first. */
/** A language's media: what you listen to, what you watch, or both (Sonus et Visio's library). */
export function useMediaList(lang: string, shelf: 'listen' | 'watch' | 'all' = 'listen'): Media[] | undefined {
  return useLiveQuery(
    async () =>
      (await db.media.where('lang').equals(lang).toArray())
        .filter((m) => alive(m) && (shelf === 'all' || (shelf === 'watch') === (m.kind === 'video')))
        .sort((a, b) => recent(b) - recent(a)),
    [lang, shelf],
  );
}

export function useMedia(id: string | undefined): Media | null | undefined {
  return useLiveQuery(async () => (id ? ((await db.media.get(id)) ?? null) : null), [id]);
}

export function useFeeds(lang: string): Feed[] | undefined {
  return useLiveQuery(async () => (await db.feeds.where('lang').equals(lang).toArray()).filter(alive).sort((a, b) => a.title.localeCompare(b.title)), [lang]);
}

export function useFeed(id: string | undefined): Feed | null | undefined {
  return useLiveQuery(async () => {
    const feed = id ? await db.feeds.get(id) : undefined;
    return alive(feed) ? feed : null;
  }, [id]);
}

/** The episodes of a feed that are already in the library, by guid. */
export function useFeedMedia(feedId: string | undefined): Map<string, Media> | undefined {
  return useLiveQuery(async () => {
    if (!feedId) return new Map();
    const rows = (await db.media.where('feedId').equals(feedId).toArray()).filter(alive);
    return new Map(rows.map((m) => [m.guid ?? m.id, m]));
  }, [feedId]);
}

export function usePlaybackMap(): Map<string, PlaybackProgress> | undefined {
  return useLiveQuery(async () => new Map((await db.playbackProgress.toArray()).map((p) => [p.mediaId, p])), []);
}

const transcriptId = (mediaId: string, role: Transcript['role'] = 'target') => `${mediaId}:${role}`;

export function getTranscript(mediaId: string, database: LinguaDB = db): Promise<Transcript | undefined> {
  return database.transcripts.get(transcriptId(mediaId)).then((t) => (alive(t) ? t : undefined));
}

export function useTranscript(mediaId: string | undefined): Transcript | null | undefined {
  return useLiveQuery(async () => (mediaId ? ((await getTranscript(mediaId)) ?? null) : null), [mediaId]);
}

/** Which items have a transcript (for badges in lists). */
export function useTranscribedIds(): Set<string> | undefined {
  return useLiveQuery(async () => new Set((await db.transcripts.toArray()).filter((t) => alive(t) && t.role === 'target').map((t) => t.mediaId)), []);
}

// ── Adding ───────────────────────────────────────────────────────────────────

export interface NewAudio {
  lang: string;
  title: string;
  artist?: string;
  collection?: string;
  durationMs?: number;
  blob: Blob;
  mime: string;
  cover?: { blob: Blob; mime: string };
  /** A part of an audiobook or course (see data/books.ts). */
  bookId?: string;
  bookKind?: Media['bookKind'];
  episode?: number;
  chapters?: Media['chapters'];
}

/** Stores an audio file (and its cover art) for offline listening. */
export async function addAudio(input: NewAudio, database: LinguaDB = db): Promise<string> {
  const id = crypto.randomUUID();
  const now = Date.now();
  const blobId = crypto.randomUUID();
  const coverBlobId = input.cover ? crypto.randomUUID() : undefined;
  await database.transaction('rw', database.media, database.blobs, async () => {
    await database.blobs.add({ id: blobId, kind: 'audio', mime: input.mime, size: input.blob.size, blob: input.blob, createdAt: now });
    if (input.cover && coverBlobId) await database.blobs.add({ id: coverBlobId, kind: 'cover', mime: input.cover.mime, size: input.cover.blob.size, blob: input.cover.blob, createdAt: now });
    await database.media.add({
      id,
      lang: input.lang,
      kind: 'audio',
      title: input.title.trim() || 'Untitled',
      artist: input.artist,
      collection: input.collection,
      durationMs: input.durationMs,
      blobId,
      mime: input.mime,
      sizeBytes: input.blob.size,
      coverBlobId,
      bookId: input.bookId,
      bookKind: input.bookKind,
      episode: input.episode,
      chapters: input.chapters?.length ? input.chapters : undefined,
      createdAt: now,
      updatedAt: now,
    });
  });
  return id;
}

export async function addSpotify(lang: string, spotify: NonNullable<Media['spotify']>, info: { title: string; coverUrl?: string; artist?: string }, database: LinguaDB = db): Promise<string> {
  const existing = (await database.media.where('lang').equals(lang).toArray()).find((m) => alive(m) && m.spotify?.uri === spotify.uri);
  if (existing) return existing.id;
  const id = crypto.randomUUID();
  const now = Date.now();
  await database.media.add({ id, lang, kind: 'spotify', title: info.title, artist: info.artist, coverUrl: info.coverUrl, spotify, createdAt: now, updatedAt: now });
  return id;
}

export async function updateMedia(id: string, patch: Partial<Omit<Media, 'id' | 'createdAt'>>, database: LinguaDB = db): Promise<void> {
  await database.media.update(id, { ...patch, updatedAt: Date.now() });
}

/** Removes an item with its audio, transcript and position. Words you marked stay. */
export async function deleteMedia(id: string, database: LinguaDB = db): Promise<void> {
  await database.transaction('rw', [database.media, database.blobs, database.transcripts, database.playbackProgress], async () => {
    const media = await database.media.get(id);
    if (!media) return;
    await database.blobs.bulkDelete([media.blobId, media.coverBlobId].filter((x): x is string => Boolean(x)));
    const now = Date.now();
    await database.transcripts.where('[mediaId+role]').between([id, ''], [id, '￿']).modify({ deletedAt: now, updatedAt: now });
    await database.playbackProgress.delete(id);
    await database.media.update(id, { deletedAt: now, updatedAt: now, blobId: undefined, coverBlobId: undefined });
  });
}

// ── Podcasts ─────────────────────────────────────────────────────────────────

/** Subscribes (or refreshes an existing subscription to the same address). */
export async function saveFeed(lang: string, url: string, parsed: ParsedFeed, database: LinguaDB = db): Promise<string> {
  const now = Date.now();
  const existing = (await database.feeds.where('lang').equals(lang).toArray()).find((f) => f.url === url);
  const row: Feed = {
    id: existing?.id ?? crypto.randomUUID(),
    lang,
    url,
    title: parsed.title,
    author: parsed.author,
    description: parsed.description,
    imageUrl: parsed.imageUrl,
    link: parsed.link,
    episodes: parsed.episodes,
    lastFetchedAt: now,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await database.feeds.put(row);
  return row.id;
}

export async function unsubscribe(feedId: string, database: LinguaDB = db): Promise<void> {
  await database.feeds.update(feedId, { deletedAt: Date.now(), updatedAt: Date.now() });
}

/** The library item for a podcast episode, created the first time it is played or saved. */
export async function episodeMedia(feed: Feed, episode: FeedEpisode, database: LinguaDB = db): Promise<string> {
  const existing = (await database.media.where('feedId').equals(feed.id).toArray()).find((m) => alive(m) && (m.guid === episode.guid || m.remoteUrl === episode.url));
  if (existing) return existing.id;
  const id = crypto.randomUUID();
  const now = Date.now();
  await database.media.add({
    id,
    lang: feed.lang,
    kind: 'audio',
    title: episode.title,
    collection: feed.title,
    artist: feed.author,
    durationMs: episode.durationMs,
    mime: episode.mime,
    sizeBytes: episode.sizeBytes,
    feedId: feed.id,
    guid: episode.guid,
    remoteUrl: episode.url,
    coverUrl: episode.imageUrl ?? feed.imageUrl,
    publishedAt: episode.publishedAt,
    description: episode.description,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

/** Keeps a downloaded copy of a streamed episode for offline listening. */
export async function attachDownload(mediaId: string, blob: Blob, mime: string, database: LinguaDB = db): Promise<void> {
  const blobId = crypto.randomUUID();
  await database.transaction('rw', database.media, database.blobs, async () => {
    const media = await database.media.get(mediaId);
    if (media?.blobId) await database.blobs.delete(media.blobId);
    await database.blobs.add({ id: blobId, kind: 'audio', mime, size: blob.size, blob, createdAt: Date.now() });
    await database.media.update(mediaId, { blobId, mime, sizeBytes: blob.size, updatedAt: Date.now() });
  });
}

/** Frees the space a download uses; the episode keeps streaming from the web. */
export async function removeDownload(mediaId: string, database: LinguaDB = db): Promise<void> {
  await database.transaction('rw', database.media, database.blobs, async () => {
    const media = await database.media.get(mediaId);
    if (!media?.blobId || !media.remoteUrl) return;
    await database.blobs.delete(media.blobId);
    await database.media.update(mediaId, { blobId: undefined, updatedAt: Date.now() });
  });
}

export async function audioBlob(media: Pick<Media, 'blobId'>, database: LinguaDB = db): Promise<Blob | undefined> {
  return media.blobId ? (await database.blobs.get(media.blobId))?.blob : undefined;
}

// ── Playback & transcripts ───────────────────────────────────────────────────

export async function savePlayback(mediaId: string, positionMs: number, rate: number, completed: boolean, database: LinguaDB = db): Promise<void> {
  await database.playbackProgress.put({ mediaId, positionMs: Math.round(positionMs), rate, completed: completed ? 1 : 0, updatedAt: Date.now() });
}

export async function markPlayed(mediaId: string, database: LinguaDB = db): Promise<void> {
  await database.media.update(mediaId, { lastPlayedAt: Date.now() });
}

/** Saves the transcript; a Codex copy made earlier is rebuilt the next time it’s opened. `original`: the transcript a book’s text was timed from. */
export async function saveTranscript(mediaId: string, lang: string, cues: Cue[], source: Transcript['source'], original?: Transcript['original'], database: LinguaDB = db): Promise<void> {
  const now = Date.now();
  await database.transaction('rw', database.transcripts, database.media, async () => {
    const id = transcriptId(mediaId);
    const existing = await database.transcripts.get(id);
    await database.transcripts.put({ id, mediaId, lang, role: 'target', source, offsetMs: 0, cues, ...(original ? { original } : {}), createdAt: existing?.createdAt ?? now, updatedAt: now });
    await database.media.update(mediaId, { textId: undefined, updatedAt: now });
  });
}

/** Shifts every cue (for transcripts that run early or late). */
export async function shiftTranscript(mediaId: string, deltaMs: number, database: LinguaDB = db): Promise<void> {
  const t = await getTranscript(mediaId, database);
  if (!t) return;
  const cues = t.cues.map((c) => ({
    ...c,
    startMs: Math.max(0, c.startMs + deltaMs),
    endMs: Math.max(0, c.endMs + deltaMs),
    words: c.words?.map((w) => ({ ...w, startMs: Math.max(0, w.startMs + deltaMs), endMs: Math.max(0, w.endMs + deltaMs) })),
  }));
  await database.transcripts.update(t.id, { cues, offsetMs: t.offsetMs + deltaMs, updatedAt: Date.now() });
}

export async function deleteTranscript(mediaId: string, database: LinguaDB = db): Promise<void> {
  await database.transcripts.update(transcriptId(mediaId), { deletedAt: Date.now(), updatedAt: Date.now() });
}

/** The transcript as a Codex text (one paragraph per sentence), made on first use. */
export async function transcriptText(media: Media, database: LinguaDB = db): Promise<string | null> {
  if (media.textId && alive(await database.texts.get(media.textId))) return media.textId;
  const transcript = await getTranscript(media.id, database);
  if (!transcript?.cues.length) return null;
  const textId = await addText(
    {
      lang: media.lang,
      title: media.title,
      author: media.collection ?? media.artist,
      kind: 'transcript',
      source: 'sonus',
      chapters: [{ title: media.title, blocks: transcript.cues.map((c, i) => ({ t: 'p' as const, text: c.text, cue: i })) }],
    },
    database,
  );
  await database.texts.update(textId, { mediaId: media.id });
  await database.media.update(media.id, { textId, updatedAt: Date.now() });
  return textId;
}
