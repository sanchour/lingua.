// Audio and transcript files from the device: tags, cover art, chapters and duration for audio
// (MP4 boxes for M4A/M4B, ID3 for the rest); SRT, VTT or plain text for transcripts. Several files
// or a folder can become one audiobook or course, its parts in order.
import type { AudioTags } from '@/core/parsers/id3';
import { readId3 } from '@/core/parsers/id3';
import { blobSource, readMp4 } from '@/core/parsers/mp4';
import { looksTimed, parseSubtitles, textToCues } from '@/core/parsers/subtitles';
import { decodeText } from '@/core/parsers/text';
import type { BookKind } from '@/data/books';
import { db } from '@/data/db';
import type { LinguaDB } from '@/data/db';
import { addAudio } from '@/data/media';
import type { NewAudio } from '@/data/media';
import type { AudioChapter, Cue, Transcript } from '@/data/types';
import { decodeEntities } from '@/lib/entities';

export const AUDIO_ACCEPT = 'audio/*,.mp3,.m4a,.m4b,.aac,.ogg,.oga,.opus,.wav,.flac,.webm,audio/mp4,audio/x-m4b';
export const TRANSCRIPT_ACCEPT = '.srt,.vtt,.txt,text/plain,text/vtt';

const MIME_BY_EXT: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  m4b: 'audio/mp4',
  mp4: 'audio/mp4',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/ogg',
  wav: 'audio/wav',
  flac: 'audio/flac',
  webm: 'audio/webm',
};

const IMAGE = /\.(jpe?g|png|webp)$/i;
const IMAGE_MIME: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
// Playlists and cue sheets come with audio/* types but aren't sound; macOS leaves "._" twins in folders.
const NOT_AUDIO = /\.(m3u8?|pls|cue|xspf)$/i;
const HIDDEN = /(^|\/)(\.|__MACOSX\/)/;

const extOf = (name: string) => (name.includes('.') ? (name.split('.').pop()?.toLowerCase() ?? '') : '');
const baseName = (name: string) => name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim();
/** Where a file sits in a chosen folder ("Book/CD 1/01.mp3"), or just its name. */
const pathOf = (file: File) => file.webkitRelativePath || file.name;
const natural = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/** Duration from the browser's own decoder (metadata only, nothing is played). */
export function probeDuration(blob: Blob): Promise<number | undefined> {
  // Outside a browser (tests) there is no decoder to ask.
  if (typeof document === 'undefined') return Promise.resolve(undefined);
  return new Promise((resolve) => {
    const audio = document.createElement('audio');
    const url = URL.createObjectURL(blob);
    const done = (ms?: number) => {
      URL.revokeObjectURL(url);
      audio.removeAttribute('src');
      resolve(ms);
    };
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => done(Number.isFinite(audio.duration) ? Math.round(audio.duration * 1000) : undefined);
    audio.onerror = () => done(undefined);
    window.setTimeout(() => done(undefined), 8000);
    audio.src = url;
  });
}

// ── Tags ─────────────────────────────────────────────────────────────────────

export interface FileTags extends AudioTags {
  /** From the file's header (MP4), for when the browser can't tell. */
  durationMs?: number;
  chapters: AudioChapter[];
  /** The file is MP4 (M4A, M4B), whatever its name says. */
  mp4: boolean;
}

// Tags written through a web form can keep HTML entities (LibriVox’s 64 kbps files: "F&aacute;bulas").
export { decodeEntities };

const decodeTags = (tags: FileTags): FileTags => {
  const decode = (s: string | undefined) => (s ? decodeEntities(s) : s);
  return { ...tags, title: decode(tags.title), artist: decode(tags.artist), album: decode(tags.album), chapters: tags.chapters.map((c) => ({ ...c, title: decodeEntities(c.title) })) };
};

/** Reads an audio file's tags: MP4 boxes when it starts as MP4, else its ID3 tag. Never throws. */
export async function readAudioTags(file: Blob): Promise<FileTags> {
  try {
    const mp4 = await readMp4(blobSource(file));
    if (mp4) return decodeTags({ ...mp4, mp4: true });
  } catch {
    // A damaged MP4 still imports, just without tags.
  }
  try {
    const head = new Uint8Array(await file.slice(0, 10).arrayBuffer());
    if (head.length < 10 || head[0] !== 0x49 || head[1] !== 0x44 || head[2] !== 0x33) return { chapters: [], mp4: false }; // no "ID3"
    // The whole tag, so a large cover or chapters after it aren't cut off (capped for broken sizes).
    const size = 10 + (((head[6] & 0x7f) << 21) | ((head[7] & 0x7f) << 14) | ((head[8] & 0x7f) << 7) | (head[9] & 0x7f));
    const tags = readId3(new Uint8Array(await file.slice(0, Math.min(size, 8 * 1024 * 1024)).arrayBuffer()));
    return decodeTags({ ...tags, chapters: tags.chapters ?? [], mp4: false });
  } catch {
    return { chapters: [], mp4: false };
  }
}

/** Audio worth trying in a picked folder: not its pictures, texts, playlists or hidden files. */
export function isAudioFile(file: File): boolean {
  if (HIDDEN.test(pathOf(file)) || NOT_AUDIO.test(file.name)) return false;
  return Boolean(MIME_BY_EXT[extOf(file.name)]) || file.type.startsWith('audio/');
}

interface ReadFile {
  path: string;
  /** The file, typed so every browser plays it. */
  blob: Blob;
  mime: string;
  tags: FileTags;
  durationMs?: number;
  title: string;
  track?: number;
}

/** Reads one audio file; null when it isn't audio this device can play. */
async function readFile(file: File): Promise<ReadFile | null> {
  const ext = extOf(file.name);
  const tags = await readAudioTags(file);
  // MP4 audio arrives as audio/x-m4a, audio/x-m4b, video/mp4 or nothing; audio/mp4 plays everywhere.
  const mime = tags.mp4 ? 'audio/mp4' : file.type || MIME_BY_EXT[ext] || 'audio/mpeg';
  const blob = tags.mp4 && file.type !== mime ? file.slice(0, file.size, mime) : file;
  const probed = await probeDuration(blob);
  if (probed === undefined && !MIME_BY_EXT[ext] && !tags.mp4) return null;
  return { path: pathOf(file), blob, mime, tags, durationMs: probed ?? tags.durationMs, title: tags.title || baseName(file.name), track: tags.track };
}

const coverOf = (tags: FileTags): NewAudio['cover'] => (tags.cover ? { blob: new Blob([tags.cover.data as BlobPart], { type: tags.cover.mime }), mime: tags.cover.mime } : undefined);

// ── Order and names ──────────────────────────────────────────────────────────

/** Natural order of two paths, folder by folder: "Part 2" before "Part 10", "CD 1/…" before "CD 1 Bonus/…". */
export function comparePaths(a: string, b: string): number {
  const x = a.replace(/\.[^./]+$/, '').split('/');
  const y = b.replace(/\.[^./]+$/, '').split('/');
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    const c = natural.compare(x[i], y[i]);
    if (c) return c;
  }
  return x.length - y.length;
}

/**
 * Parts in listening order: by track number when every part has one of its own, else by path and
 * name. Repeated numbers mean each disc counts from 1, which only the folders can put in order.
 */
export function orderParts<T extends { path: string; track?: number }>(parts: readonly T[]): T[] {
  const tracks = parts.map((p) => p.track ?? 0);
  const byTrack = tracks.every((t) => t > 0) && new Set(tracks).size === tracks.length;
  return [...parts].sort((a, b) => (byTrack ? (a.track ?? 0) - (b.track ?? 0) : 0) || comparePaths(a.path, b.path));
}

/** The innermost folder all the paths share ("Le Petit Prince" for "Audio/Le Petit Prince/CD 1/01.mp3" …). */
export function commonFolder(paths: readonly string[]): string | undefined {
  const folders = paths.map((p) => p.split('/').slice(0, -1));
  if (!folders.length) return undefined;
  let depth = 0;
  while (depth < folders[0].length && folders.every((f) => f[depth] === folders[0][depth])) depth++;
  const name = depth ? folders[0][depth - 1].replace(/_+/g, ' ').trim() : '';
  return name || undefined;
}

/**
 * A book's title: the one given, else the album all its parts share, else the folder they came
 * in, else the first part's title. Parts are in order; a part without an album doesn't count.
 */
export function bookTitleFrom(parts: ReadonlyArray<{ path: string; title: string; album?: string }>, given?: string): string {
  const title = given?.trim();
  if (title) return title;
  const albums = parts.map((p) => p.album?.trim()).filter((a): a is string => Boolean(a));
  if (albums.length && albums.every((a) => natural.compare(a, albums[0]) === 0)) return albums[0];
  return commonFolder(parts.map((p) => p.path)) ?? parts[0]?.title ?? 'Untitled';
}

/** A folder's own picture (cover.jpg, folder.jpg, front.jpg, or its only picture), the nearest the top. */
export function folderCover(files: readonly File[]): File | undefined {
  const images = files.filter((f) => IMAGE.test(f.name) && !HIDDEN.test(pathOf(f)));
  const depth = (f: File) => pathOf(f).split('/').length;
  const named = images.filter((f) => /^(cover|folder|front)/i.test(f.name)).sort((a, b) => depth(a) - depth(b) || comparePaths(pathOf(a), pathOf(b)));
  return named[0] ?? (images.length === 1 ? images[0] : undefined);
}

/**
 * The title a book of these files would get, to fill in before it's added. Cheap: reads only the
 * first and last part's tags, and the parts are put in name order.
 */
export async function suggestBookTitle(files: File[]): Promise<string | undefined> {
  const parts = orderParts(files.filter(isAudioFile).map((file) => ({ file, path: pathOf(file) })));
  if (!parts.length) return undefined;
  const ends = [...new Set([parts[0], parts[parts.length - 1]])];
  const tags = new Map(await Promise.all(ends.map(async (p) => [p, await readAudioTags(p.file)] as const)));
  return bookTitleFrom(parts.map((p) => ({ path: p.path, title: tags.get(p)?.title || baseName(p.file.name), album: tags.get(p)?.album })));
}

// ── Adding ───────────────────────────────────────────────────────────────────

/**
 * Adds audio files to the library; returns the new ids (files the device can't play are skipped).
 * An M4B, or any file with chapters, becomes an audiobook of one part.
 */
export async function importAudioFiles(lang: string, files: File[], database: LinguaDB = db): Promise<{ ids: string[]; skipped: string[] }> {
  const ids: string[] = [];
  const skipped: string[] = [];
  for (const file of files) {
    const part = await readFile(file);
    if (!part) {
      skipped.push(file.name);
      continue;
    }
    const { tags } = part;
    const book = extOf(file.name) === 'm4b' || tags.chapters.length > 1;
    ids.push(
      await addAudio(
        {
          lang,
          title: part.title,
          artist: tags.artist,
          collection: book ? tags.album || part.title : tags.album,
          durationMs: part.durationMs,
          blob: part.blob,
          mime: part.mime,
          cover: coverOf(tags),
          ...(book ? { bookId: crypto.randomUUID(), bookKind: 'audiobook' as const, episode: 1, chapters: tags.chapters } : {}),
        },
        database,
      ),
    );
  }
  return { ids, skipped };
}

export interface BookOptions {
  /** Empty: the parts' album, the folder's name or the first part's title. */
  title?: string;
  /** Empty: each part's artist tag. */
  author?: string;
  kind: BookKind;
  /** How far reading the files has got, 0–1 (each file is probed for its length). */
  onProgress?: (fraction: number) => void;
}

/**
 * Makes one audiobook or course of several files or a folder: its parts in order (track numbers,
 * else names), sharing one bookId. A folder's pictures, texts and playlists are left out quietly;
 * `skipped` names the audio files this device can't play. No playable audio: nothing is added and
 * `ids` is empty.
 */
export async function importBook(lang: string, files: File[], options: BookOptions, database: LinguaDB = db): Promise<{ bookId: string; ids: string[]; skipped: string[] }> {
  const bookId = crypto.randomUUID();
  const audio = files.filter(isAudioFile);
  const read: ReadFile[] = [];
  const skipped: string[] = [];
  for (const [i, file] of audio.entries()) {
    const part = await readFile(file);
    if (part) read.push(part);
    else skipped.push(file.name);
    options.onProgress?.((i + 1) / audio.length);
  }
  if (!read.length) return { bookId, ids: [], skipped };

  const parts = orderParts(read);
  const title = bookTitleFrom(parts.map((p) => ({ path: p.path, title: p.title, album: p.tags.album })), options.title);
  const author = options.author?.trim();
  const picture = folderCover(files);
  const fallbackCover: NewAudio['cover'] = picture ? { blob: picture, mime: picture.type || IMAGE_MIME[extOf(picture.name)] || 'image/jpeg' } : undefined;
  const ids: string[] = [];
  // One transaction, so the book appears whole (or not at all if storage runs out).
  await database.transaction('rw', database.media, database.blobs, async () => {
    for (const [i, part] of parts.entries()) {
      ids.push(
        await addAudio(
          {
            lang,
            title: part.title,
            artist: author || part.tags.artist,
            collection: title,
            durationMs: part.durationMs,
            blob: part.blob,
            mime: part.mime,
            cover: coverOf(part.tags) ?? fallbackCover,
            bookId,
            bookKind: options.kind,
            episode: i + 1,
            chapters: part.tags.chapters,
          },
          database,
        ),
      );
    }
  });
  return { bookId, ids, skipped };
}

// ── Transcripts ──────────────────────────────────────────────────────────────

/** Reads a transcript file: timed (SRT/VTT) or plain text spread over the audio. */
export async function readTranscriptFile(file: File, lang: string, durationMs: number | undefined): Promise<{ cues: Cue[]; source: Transcript['source'] }> {
  const text = decodeText(new Uint8Array(await file.arrayBuffer()), lang);
  if (looksTimed(text)) {
    const cues = parseSubtitles(text);
    if (!cues.length) throw new Error('No captions were found in that file.');
    return { cues, source: /\.vtt$/i.test(file.name) || text.startsWith('WEBVTT') ? 'vtt' : 'srt' };
  }
  if (!text.trim()) throw new Error('That file is empty.');
  return { cues: textToCues(text, durationMs ?? 0, lang), source: 'text' };
}
