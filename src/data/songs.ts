// Cantus: songs and their lyrics, saved lines, and lyrics opened as a Codex text.
import { useLiveQuery } from 'dexie-react-hooks';
import { getLanguage } from '@/core/lang/languages';
import { sungLines } from '@/core/cantus/lyrics';
import type { SongHit } from '@/services/cantus/catalog';
import { db } from './db';
import type { LinguaDB } from './db';
import { defaultDeckConfig, newCard } from './decks';
import { addText } from './library';
import type { Deck, Note, Song } from './types';

const alive = (s: Song | undefined): s is Song => Boolean(s && !s.deletedAt);

export const songIdOf = (lang: string, hit: Pick<SongHit, 'itunesId'>) => `${lang}:itunes:${hit.itunesId}`;

/** Your songs, newest saved first. */
export function useSavedSongs(lang: string): Song[] | undefined {
  return useLiveQuery(
    async () =>
      (await db.songs.where('lang').equals(lang).toArray()).filter((s) => alive(s) && s.savedAt).sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0)),
    [lang],
  );
}

/** Songs opened lately (saved or not), most recent first. */
export function useRecentSongs(lang: string, limit = 12): Song[] | undefined {
  return useLiveQuery(
    async () =>
      (await db.songs.where('lang').equals(lang).toArray())
        .filter((s) => alive(s) && s.lastPlayedAt)
        .sort((a, b) => (b.lastPlayedAt ?? 0) - (a.lastPlayedAt ?? 0))
        .slice(0, limit),
    [lang, limit],
  );
}

/** The songs you open most, from two plays up, the most first. */
export function useMostPlayed(lang: string, limit = 12): Song[] | undefined {
  return useLiveQuery(
    async () =>
      (await db.songs.where('lang').equals(lang).toArray())
        .filter((s) => alive(s) && (s.plays ?? 0) >= 2)
        .sort((a, b) => (b.plays ?? 0) - (a.plays ?? 0) || (b.lastPlayedAt ?? 0) - (a.lastPlayedAt ?? 0))
        .slice(0, limit),
    [lang, limit],
  );
}

export function useSong(id: string | undefined): Song | null | undefined {
  return useLiveQuery(async () => (id ? ((await db.songs.get(id)) ?? null) : null), [id]);
}

/** Keeps a found song (or refreshes what Apple says about it) and returns its id. */
export async function openSong(lang: string, hit: SongHit, extra: Partial<Pick<Song, 'spotifyId'>> = {}, database: LinguaDB = db): Promise<string> {
  const id = songIdOf(lang, hit);
  const now = Date.now();
  await database.transaction('rw', database.songs, async () => {
    const existing = await database.songs.get(id);
    const about = {
      title: hit.title,
      artist: hit.artist,
      album: hit.album,
      year: hit.year,
      genre: hit.genre,
      artworkUrl: hit.artworkUrl,
      durationMs: hit.durationMs,
      itunesId: hit.itunesId,
      appleUrl: hit.appleUrl,
      previewUrl: hit.previewUrl,
    };
    if (existing) {
      await database.songs.put({ ...existing, ...about, ...extra, spotifyId: extra.spotifyId ?? existing.spotifyId, deletedAt: undefined, updatedAt: now });
    } else {
      await database.songs.add({ id, lang, ...about, ...extra, lines: [], createdAt: now, updatedAt: now });
    }
  });
  return id;
}

export async function patchSong(id: string, patch: Partial<Omit<Song, 'id' | 'lang' | 'createdAt'>>, database: LinguaDB = db): Promise<void> {
  await database.songs.update(id, { ...patch, updatedAt: Date.now() });
}

export async function setSongSaved(id: string, saved: boolean, database: LinguaDB = db): Promise<void> {
  await patchSong(id, { savedAt: saved ? Date.now() : undefined }, database);
}

export async function markSongPlayed(id: string, database: LinguaDB = db): Promise<void> {
  const song = await database.songs.get(id);
  if (!song) return;
  const now = Date.now();
  // Opened again within a minute (a reload, or React running the effect twice) counts once.
  const again = song.lastPlayedAt !== undefined && now - song.lastPlayedAt < 60_000;
  await patchSong(id, { lastPlayedAt: now, plays: (song.plays ?? 0) + (again ? 0 : 1) }, database);
}

/** Forgets a song (its saved lines and words stay in your decks). */
export async function removeSong(id: string, database: LinguaDB = db): Promise<void> {
  await patchSong(id, { deletedAt: Date.now(), savedAt: undefined, lastPlayedAt: undefined }, database);
}

/** The language's "From Cantus" deck, created on first use. */
export async function ensureCantusDeck(lang: string, database: LinguaDB = db): Promise<string> {
  const existing = await database.decks
    .where('lang')
    .equals(lang)
    .filter((d) => d.kind === 'cantus' && !d.deletedAt)
    .first();
  if (existing) return existing.id;
  const now = Date.now();
  const deck: Deck = {
    id: crypto.randomUUID(),
    lang,
    folderId: null,
    name: 'From Cantus',
    description: `${getLanguage(lang)?.name ?? lang} lines saved from songs. Each card can play its line again.`,
    order: 0,
    kind: 'cantus',
    config: await defaultDeckConfig(database),
    createdAt: now,
    updatedAt: now,
  };
  await database.decks.add(deck);
  return deck.id;
}

/** Whether a line of a song is already a card. */
export function useSavedLines(songId: string | undefined): Set<number> | undefined {
  return useLiveQuery(async () => {
    if (!songId) return new Set<number>();
    const notes = await db.notes.where('lang').equals(songId.split(':')[0]).filter((n) => !n.deletedAt && n.context?.songId === songId && n.tags.includes('line')).toArray();
    return new Set(notes.map((n) => n.context?.blockIndex ?? -1));
  }, [songId]);
}

/**
 * Saves a lyric line as a card: the line on the front, its translation on the back, and the song
 * and the line's time so the card can play it again. False when it is already saved.
 */
export async function saveSongLine(song: Song, index: number, translation: string, database: LinguaDB = db): Promise<boolean> {
  const line = song.lines[index];
  if (!line?.text) return false;
  const deckId = await ensureCantusDeck(song.lang, database);
  const same = await database.notes
    .where('deckId')
    .equals(deckId)
    .filter((n) => !n.deletedAt && n.context?.songId === song.id && n.context?.blockIndex === index)
    .first();
  if (same) return false;
  const next = song.lines.slice(index + 1).find((l) => l.startMs !== undefined)?.startMs;
  const now = Date.now();
  const note: Note = {
    id: crypto.randomUUID(),
    deckId,
    lang: song.lang,
    term: line.text,
    meaning: translation,
    context: {
      sentence: line.text,
      songId: song.id,
      blockIndex: index,
      startMs: line.startMs,
      endMs: line.startMs !== undefined ? (next ?? line.startMs + 5000) : undefined,
    },
    tags: ['line', 'song'],
    source: 'cantus',
    createdAt: now,
    updatedAt: now,
  };
  await database.transaction('rw', database.notes, database.cards, async () => {
    await database.notes.add(note);
    await database.cards.add(newCard(note.id, deckId, now));
  });
  return true;
}

/** The lyrics as a Codex text (one paragraph per verse), made once and reused. */
export async function openLyricsInCodex(song: Song, database: LinguaDB = db): Promise<string> {
  if (song.textId) {
    const text = await database.texts.get(song.textId);
    if (text && !text.deletedAt) return text.id;
  }
  const verses: string[][] = [[]];
  for (const line of song.lines) {
    if (line.text) verses[verses.length - 1].push(line.text);
    else if (verses[verses.length - 1].length) verses.push([]);
  }
  const blocks = verses.filter((v) => v.length).map((v) => ({ t: 'p' as const, text: v.join(' / ') }));
  const textId = await addText(
    {
      lang: song.lang,
      title: song.title,
      author: song.artist,
      kind: 'article',
      source: 'cantus',
      chapters: [{ title: song.title, blocks }],
      coverDesign: { cloth: 'plum', ornament: 'stars' },
      shelf: 'reading',
    },
    database,
  );
  await patchSong(song.id, { textId }, database);
  return textId;
}

/** How many songs a language has in Your songs, and how many lines were saved from songs. */
export function useSongTotals(lang: string): { saved: number; lines: number } | undefined {
  return useLiveQuery(async () => {
    const [songs, notes] = await Promise.all([
      db.songs.where('lang').equals(lang).filter((s) => !s.deletedAt && Boolean(s.savedAt)).count(),
      db.notes.where('lang').equals(lang).filter((n) => !n.deletedAt && n.source === 'cantus').count(),
    ]);
    return { saved: songs, lines: notes };
  }, [lang]);
}

export const lyricWordCount = (song: Pick<Song, 'lines'>) => sungLines(song.lines).reduce((n, l) => n + l.text.split(/\s+/).length, 0);
