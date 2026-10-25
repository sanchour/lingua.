// Free audiobooks from LibriVox. LibriVox's own API doesn't let web pages read it (no CORS), but
// its recordings live on archive.org, whose search and file lists do, so books are found and opened
// there. A book's parts stream from archive.org like podcast episodes; its downloads allow apps too,
// so Save for offline and Whisper work.
import { parseDuration } from '@/core/parsers/rss';
import { getBook, saveRemoteBook } from '@/data/books';
import type { RemotePart } from '@/data/books';
import type { LinguaDB } from '@/data/db';
import { decodeEntities } from '@/lib/entities';

/**
 * archive.org's language codes for each language: MARC, with the ISO 639-2 spellings some items use.
 * The counts are LibriVox books on archive.org, checked on 2026-10-19. LibriVox's own catalogue
 * shows more for some languages because it also counts sections of multilingual collections.
 */
export const LIBRIVOX_LANGUAGES: Record<string, string[]> = {
  en: ['eng'], // 19131
  es: ['spa'], // 564
  fr: ['fre', 'fra'], // 275 + 40
  de: ['deu', 'ger'], // 847 + 2
  it: ['ita'], // 89
  pt: ['por'], // 107
  ru: ['rus'], // 76
  el: ['ell', 'gre'], // 34 + 0; Ancient Greek (grc, 45: Homer, Plato) is left out
  sv: ['swe'], // 13
  hu: ['hun'], // 2
  nl: ['nld', 'dut'], // 210 + 1
  nb: ['nor', 'nob', 'nno'], // 1 + 0 + 0
  tr: ['tur'], // 0
  id: ['ind'], // 1
  sw: ['swa', 'swh'], // 0
  la: ['lat'], // 16
  ar: ['ara'], // 3
  zh: ['zho', 'chi'], // 25 + 1
  ja: ['jpn'], // 37
  ko: ['kor'], // 3
  hi: ['hin'], // 2
  pl: ['pol'], // 31
  vi: ['vie'], // 0
  tl: ['tgl', 'fil'], // 4 + 0
  th: ['tha'], // 0
  fa: ['per', 'fas'], // 0
  yue: ['yue'], // 1
  cs: ['ces', 'cze'], // 1 + 0
  ro: ['ron', 'rum'], // 3 + 0
  sh: ['hrv', 'srp', 'bos', 'hbs', 'scr', 'scc'], // 1 (hrv)
  ms: ['msa', 'may', 'zsm'], // 0
  ta: ['tam'], // 2
  ka: ['kat', 'geo'], // 0
  uz: ['uzb'], // 0
  mn: ['mon'], // 0
};

const ROWS = 24;

export interface LibrivoxHit {
  identifier: string;
  title: string;
  author?: string;
  downloads?: number;
  /** The whole book's length. */
  runtimeMs?: number;
  coverUrl: string;
}

export interface LibrivoxBook {
  identifier: string;
  title: string;
  author?: string;
  description?: string;
  coverUrl: string;
  /** In order: by track number when the tracks are sound, else by file name. */
  parts: RemotePart[];
}

/** Saved LibriVox books keep archive.org's identifier in their id, so opening one again finds it. */
export const librivoxBookId = (identifier: string): string => `librivox-${identifier}`;

export const librivoxCover = (identifier: string): string => `https://archive.org/services/img/${encodeURIComponent(identifier)}`;

// ── Search ───────────────────────────────────────────────────────────────────

/**
 * The words of a search, safe for archive.org's Lucene syntax. Escaping isn't enough there (its
 * search fails on an escaped +, & or -), so only letters, digits and an apostrophe inside a word
 * are kept: archive.org keeps "d'Escarbagnas" as one word and finds nothing for "d" and
 * "escarbagnas". Words are lowercased so AND, OR and NOT are searched for, not obeyed.
 */
export function searchWords(query: string): string[] {
  const words = query.toLowerCase().replace(/’/g, "'").match(/[\p{L}\p{M}\p{N}]+('[\p{L}\p{M}\p{N}]+)*/gu);
  return (words ?? []).slice(0, 8);
}

/** The language's LibriVox books, each word found in the title or the author; null for a language without a code. */
export function librivoxQuery(lang: string, query = ''): string | null {
  const codes = LIBRIVOX_LANGUAGES[lang];
  if (!codes) return null;
  const words = searchWords(query).map((w) => `(title:(${w}) OR creator:(${w}))`);
  return ['collection:librivoxaudio', `language:(${codes.join(' OR ')})`, ...words].join(' AND ');
}

type Field = string | string[] | undefined;

const first = (field: Field): string | undefined => (Array.isArray(field) ? field[0] : field);
const joined = (field: Field, separator: string): string | undefined => (Array.isArray(field) ? field.join(separator) : field);

interface SearchAnswer {
  response?: {
    numFound: number;
    docs: Array<{ identifier: string; title?: Field; creator?: Field; downloads?: number; runtime?: Field }>;
  };
}

/** A book's runtime: "21:10:20" or "41:37", and a few written "00:32.47" (hours, minutes, then seconds after the dot). */
export function runtimeMs(value: string | undefined): number | undefined {
  const v = value?.trim();
  if (!v) return undefined;
  return parseDuration(/^\d+:\d\d\.\d\d$/.test(v) ? v.replace('.', ':') : v);
}

/** LibriVox's books in the language, most downloaded first, 24 to a page (pages start at 1). */
export async function searchLibrivox(lang: string, { query = '', page = 1 }: { query?: string; page?: number } = {}): Promise<{ hits: LibrivoxHit[]; total: number }> {
  const q = librivoxQuery(lang, query);
  if (!q) return { hits: [], total: 0 };
  const params = new URLSearchParams({ q });
  for (const field of ['identifier', 'title', 'creator', 'downloads', 'runtime']) params.append('fl[]', field);
  params.append('sort[]', 'downloads desc');
  params.set('rows', String(ROWS));
  params.set('page', String(Math.max(1, Math.floor(page) || 1)));
  params.set('output', 'json');
  const data = await getJson<SearchAnswer>(`https://archive.org/advancedsearch.php?${params}`, 10_000);
  if (!data.response) throw new Error('LibriVox didn’t answer.');
  return {
    total: data.response.numFound,
    hits: data.response.docs.map((doc) => ({
      identifier: doc.identifier,
      title: decodeEntities(first(doc.title) ?? doc.identifier),
      author: decodeEntities(joined(doc.creator, ', ') ?? '') || undefined,
      downloads: doc.downloads,
      runtimeMs: runtimeMs(first(doc.runtime)),
      coverUrl: librivoxCover(doc.identifier),
    })),
  };
}

// ── A book ───────────────────────────────────────────────────────────────────

interface ArchiveFile {
  name: string;
  /** 'original' for the file LibriVox uploaded, 'derivative' for the copies archive.org made of it. */
  source?: string;
  format?: string;
  title?: string;
  track?: string;
  length?: string;
  size?: string;
}

interface MetadataAnswer {
  metadata?: { title?: Field; creator?: Field; description?: Field };
  files?: ArchiveFile[];
}

// The 64 kbps copies are small and plenty for speech; older books have only the VBR ones.
const FORMATS = ['64Kbps MP3', 'VBR MP3', '128Kbps MP3'];

/** "1/30" or "01" → 1. */
function trackNumber(value: string | undefined): number | undefined {
  const n = parseInt(value ?? '', 10);
  return Number.isFinite(n) ? n : undefined;
}

/** A file's length: seconds ("106.62"), "mm:ss" or "h:mm:ss". */
export function lengthMs(value: string | undefined): number | undefined {
  return value?.trim() ? parseDuration(value) : undefined;
}

/** A title without HTML entities or UTF-8 read the wrong way ("Ã¡" for "á"). */
const isClean = (title: string | undefined): title is string => Boolean(title?.trim()) && !/&#?\w+;|Ã[\u0080-\u00bf]|\ufffd/.test(title!);

/** The parts of a book from archive.org's file list for it. Throws when it has no MP3s. */
export function parseLibrivoxBook(identifier: string, data: MetadataAnswer): LibrivoxBook {
  // archive.org answers an unknown identifier with an empty object.
  if (!data?.metadata) throw new Error('That audiobook isn’t on archive.org.');
  const mp3s = (data.files ?? []).filter((f) => f.name && FORMATS.includes(f.format ?? ''));
  const format = FORMATS.find((wanted) => mp3s.some((f) => f.format === wanted));
  // The copies of one recording share a name: "x.mp3", "x_64kb.mp3", "x_128kb.mp3".
  const recording = (f: ArchiveFile) => f.name.replace(/_(64|128)kb(\.mp3)$/i, '$2');
  const copies = new Map<string, ArchiveFile[]>();
  for (const f of mp3s) copies.set(recording(f), [...(copies.get(recording(f)) ?? []), f]);
  const found = mp3s
    .filter((f) => f.format === format)
    .map((file) => {
      const same = [file, ...copies.get(recording(file))!.filter((f) => f !== file)];
      // The title from the uploaded original, else the VBR copy: a derived copy can have it in HTML
      // entities, or garbled (the Chinese Art of War's third part).
      const rank = (f: ArchiveFile) => (f.source === 'original' ? 0 : f.format === 'VBR MP3' ? 1 : f === file ? 2 : 3);
      const titles = [...same].sort((a, b) => rank(a) - rank(b)).map((f) => f.title);
      const size = Number(file.size);
      return {
        // This copy's own track and length first; older books have the track only on the VBR copy.
        track: same.map((f) => trackNumber(f.track)).find((n) => n !== undefined),
        name: file.name,
        part: {
          guid: file.name,
          // "001 El águila": the part's number is shown beside it already.
          title: decodeEntities(titles.find(isClean) ?? file.title ?? '').replace(/^\d{1,3}[ .:_-]+(?=\S)/, '').trim(),
          remoteUrl: `https://archive.org/download/${encodeURIComponent(identifier)}/${file.name.split('/').map(encodeURIComponent).join('/')}`,
          mime: 'audio/mpeg',
          durationMs: same.map((f) => lengthMs(f.length)).find((ms) => ms !== undefined),
          sizeBytes: size > 0 ? size : undefined,
        } satisfies RemotePart,
      };
    });
  if (!found.length) throw new Error('That audiobook has no MP3 files to play.');
  // Track numbers order the parts when they number them exactly: one each, none above the count.
  // Some books have gaps, a number twice (the Divina Commedia's part 12 says 6) or a stray one (a
  // 25 among Alarcón's 16 parts); LibriVox numbers its file names too, so natural name order is
  // the safer one then.
  const tracks = new Set(found.map((p) => p.track));
  const byTrack = tracks.size === found.length && found.every((p) => p.track !== undefined && p.track <= found.length);
  const parts = found
    .sort((a, b) => (byTrack ? a.track! - b.track! : 0) || a.name.localeCompare(b.name, undefined, { numeric: true }))
    .map(({ part }) => part);
  const { metadata } = data;
  return {
    identifier,
    title: decodeEntities(first(metadata.title) ?? identifier).trim(),
    author: decodeEntities(joined(metadata.creator, ', ') ?? '').trim() || undefined,
    description: plainDescription(joined(metadata.description, '\n')),
    coverUrl: librivoxCover(identifier),
    parts,
  };
}

/** A LibriVox book's details and parts, from archive.org. */
export async function librivoxBook(identifier: string): Promise<LibrivoxBook> {
  const data = await getJson<MetadataAnswer>(`https://archive.org/metadata/${encodeURIComponent(identifier)}`, 15_000);
  return parseLibrivoxBook(identifier, data);
}

/** Adds a LibriVox book to Sonus as an audiobook (at once if it's already there). Returns the book's id. */
export async function openLibrivoxBook(lang: string, identifier: string, database?: LinguaDB): Promise<string> {
  const bookId = librivoxBookId(identifier);
  if (await getBook(bookId, database)) return bookId;
  const book = await librivoxBook(identifier);
  return saveRemoteBook(
    { lang, bookId, kind: 'audiobook', title: book.title, author: book.author, coverUrl: book.coverUrl, description: book.description, parts: book.parts },
    database,
  );
}

/**
 * Adds a course whose audio is one archive.org item (the FSI courses, 5.2-3) to Sonus as a course:
 * its lessons play in order and are marked done. Returns the book's id.
 */
export async function openArchiveCourse(lang: string, identifier: string, title?: string, database?: LinguaDB): Promise<string> {
  const bookId = `archive-${identifier}`;
  if (await getBook(bookId, database)) return bookId;
  const book = await librivoxBook(identifier);
  // archive.org's thumbnails of these items are mostly blank pages: the course gets a drawn cover.
  // "FSI - French Basic Course (Revised) - Volume 1 - Unit 01 01.01": the course's name goes once, above.
  const prefix = book.parts.length > 1 ? commonPrefix(book.parts.map((p) => p.title)) : '';
  const parts = book.parts.map((p) => ({ ...p, title: p.title.slice(prefix.length).replace(/^[\s\-–:]+/, '') || p.title }));
  return saveRemoteBook({ lang, bookId, kind: 'course', title: title ?? book.title, author: book.author, description: book.description, parts }, database);
}

function commonPrefix(titles: string[]): string {
  let prefix = titles[0] ?? '';
  for (const t of titles) while (prefix && !t.startsWith(prefix)) prefix = prefix.slice(0, -1);
  // Only up to a word's end, so "Unit 0" doesn't eat the lesson's own number.
  return prefix.replace(/\S*$/, '');
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getJson<T>(url: string, timeoutMs: number): Promise<T> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (res.ok) return (await res.json()) as T;
  } catch {
    // Offline, timed out, or not JSON: said the same way below.
  }
  throw new Error('LibriVox didn’t answer.');
}

// Shared with the file importer, which meets the same entities in LibriVox's tags.
export { decodeEntities };

/** A book's description as short plain text, without LibriVox's footer (catalogue links, other formats). */
export function plainDescription(html: string | undefined, max = 500): string | undefined {
  if (!html) return undefined;
  let text = decodeEntities(
    html
      .replace(/<br\s*\/?>|<\/(p|div|li)>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  );
  const footer = text.search(/For (further information|more free audio ?books)/i);
  if (footer >= 0) text = text.slice(0, footer);
  text = text
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
  if (!text) return undefined;
  return text.length > max ? `${text.slice(0, max).replace(/\s+\S*$/, '')}…` : text;
}
