// One memory for every word (4.0-2): wherever a word is looked up or marked (a book, a comic, a
// song, a podcast, a film, a conversation, a card), Lingua keeps where it was met and the sentence.
// One row per word, form and place, so the same word met in many places gathers all its sentences.
import { useLiveQuery } from 'dexie-react-hooks';
import { packId } from '@/core/packs/format';
import { db } from './db';
import type { LinguaDB } from './db';
import type { Sighting, SightingKind } from './types';
import type { WordContext } from './words';

const sightingId = (lang: string, norm: string, kind: SightingKind, sourceId: string) => `${lang}:${norm}:${kind}:${sourceId}`;

/** Where a word's context says it was met: the book, song or programme, with its title. */
export async function sourceOf(ctx: WordContext, database: LinguaDB = db): Promise<{ kind: SightingKind; id: string; title: string } | null> {
  if (ctx.where) return ctx.where;
  if (ctx.songId) {
    const song = await database.songs.get(ctx.songId);
    return { kind: 'song', id: ctx.songId, title: song ? `${song.title} · ${song.artist}` : 'A song' };
  }
  if (ctx.mediaId) {
    const media = await database.media.get(ctx.mediaId);
    const kind: SightingKind = media?.kind === 'video' ? 'video' : media?.kind === 'radio' ? 'radio' : 'listening';
    return { kind, id: ctx.mediaId, title: media?.title ?? 'Something you listened to' };
  }
  if (ctx.textId) {
    const text = await database.texts.get(ctx.textId);
    return { kind: text?.kind === 'comic' ? 'comic' : 'book', id: ctx.textId, title: text?.title ?? 'Something you read' };
  }
  return null;
}

/** Keeps that this word was met here (once per place; meeting it again there moves it to the top). */
export async function recordSighting(lang: string, norm: string, ctx: WordContext, database: LinguaDB = db): Promise<void> {
  const source = await sourceOf(ctx, database);
  if (!source || !norm) return;
  const id = sightingId(lang, norm, source.kind, source.id);
  const lemma = ctx.lemma ?? (await database.dictForms.get([packId(lang), norm]))?.lemmas[0];
  const now = Date.now();
  await database.transaction('rw', database.sightings, async () => {
    const existing = await database.sightings.get(id);
    const row: Sighting = {
      id,
      lang,
      norm,
      lemma: existing?.lemma ?? lemma,
      surface: ctx.surface ?? existing?.surface,
      kind: source.kind,
      sourceId: source.id,
      title: source.title,
      sentence: ctx.sentence ?? existing?.sentence,
      at: now,
      count: (existing?.count ?? 0) + 1,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await database.sightings.put(row);
  });
}

/** Every place a word was met: its form as written, and every form of the same lemma. Newest first. */
export async function sightingsOf(lang: string, norm: string, lemma: string | undefined, database: LinguaDB = db): Promise<Sighting[]> {
  const [byNorm, byLemma] = await Promise.all([
    database.sightings.where('[lang+norm]').equals([lang, norm]).toArray(),
    lemma ? database.sightings.where('[lang+lemma]').equals([lang, lemma]).toArray() : [],
  ]);
  const seen = new Map<string, Sighting>();
  for (const s of [...byNorm, ...byLemma]) if (!s.deletedAt) seen.set(s.id, s);
  return [...seen.values()].sort((a, b) => b.at - a.at);
}

export function useSightings(lang: string, norm: string, lemma: string | undefined): Sighting[] | undefined {
  return useLiveQuery(() => sightingsOf(lang, norm, lemma), [lang, norm, lemma]);
}

/** One word in the memory: every form and place it was met, gathered under its lemma. */
export interface Remembered {
  key: string;
  lemma?: string;
  forms: string[];
  surface: string;
  sightings: Sighting[];
  kinds: Set<SightingKind>;
  lastAt: number;
}

/** The whole memory for a language, one entry per word (forms of one lemma together). */
export async function wordMemory(lang: string, database: LinguaDB = db): Promise<Remembered[]> {
  const rows = await database.sightings.where('[lang+at]').between([lang, 0], [lang, Infinity]).toArray();
  const words = new Map<string, Remembered>();
  for (const s of rows) {
    if (s.deletedAt) continue;
    const key = s.lemma ?? s.norm;
    const w = words.get(key) ?? { key, lemma: s.lemma, forms: [], surface: s.lemma ?? s.surface ?? s.norm, sightings: [], kinds: new Set(), lastAt: 0 };
    if (!w.forms.includes(s.norm)) w.forms.push(s.norm);
    w.sightings.push(s);
    w.kinds.add(s.kind);
    w.lastAt = Math.max(w.lastAt, s.at);
    words.set(key, w);
  }
  for (const w of words.values()) w.sightings.sort((a, b) => b.at - a.at);
  return [...words.values()].sort((a, b) => b.lastAt - a.lastAt);
}

export const SIGHTING_KINDS: Record<SightingKind, { label: string; plural: string }> = {
  book: { label: 'Book', plural: 'Books and texts' },
  comic: { label: 'Comic', plural: 'Comics' },
  song: { label: 'Song', plural: 'Songs' },
  listening: { label: 'Listening', plural: 'Podcasts and audiobooks' },
  radio: { label: 'Radio', plural: 'Radio' },
  video: { label: 'Video', plural: 'Films and shows' },
  chat: { label: 'Conversation', plural: 'Conversations' },
  journal: { label: 'Journal', plural: 'Your journal' },
  cards: { label: 'Cards', plural: 'Cards and drills' },
};

/** Where a sighting's place opens, when it can. */
export function sightingLink(s: Pick<Sighting, 'kind' | 'sourceId'>): string | undefined {
  switch (s.kind) {
    case 'book':
    case 'comic':
      return `/codex/book/${s.sourceId}`;
    case 'song':
      return `/cantus/song/${encodeURIComponent(s.sourceId)}`;
    case 'listening':
      return `/sonus/play/${s.sourceId}`;
    case 'video':
      return `/visio/watch/${s.sourceId}`;
    case 'chat':
      return '/mentis/sermo';
    case 'journal':
      return `/mentis/diarium/${s.sourceId}`;
    default:
      return undefined;
  }
}
