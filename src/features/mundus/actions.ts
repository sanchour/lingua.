import { searchKey } from '@/design/primitives';
import { db } from '@/data/db';
import { addShelfItems } from '@/data/library';
import type { Pick } from '@/core/mundus/types';
import { pickFiles } from '@/services/files/files';
import { searchPodcasts, subscribe } from '@/services/sonus/podcasts';
import { importSubtitlesOnly, SUBTITLE_ACCEPT } from '@/services/visio/files';

// What Mundus's "Add to …" buttons do: each hands the pick to the room where it belongs.

/** Puts a book on Codex's wishlist shelf (want to read). Returns false if it is already there. */
export async function addBookToCodex(lang: string, pick: Pick): Promise<boolean> {
  const key = searchKey(pick.title);
  const existing = await db.texts.where('lang').equals(lang).filter((t) => !t.deletedAt && searchKey(t.title) === key).count();
  if (existing) return false;
  await addShelfItems(lang, [{ title: pick.title, author: pick.by, shelf: 'to-read', shelves: ['mundus'] }]);
  return true;
}

/**
 * Finds a podcast in Apple's directory by its name (and host) and follows it in Sonus. Returns the
 * feed id, or null when the directory has nothing that matches the name.
 */
export async function followPodcast(lang: string, pick: Pick): Promise<string | null> {
  const term = pick.search ?? (pick.by ? `${pick.title} ${pick.by}` : pick.title);
  let hits = await searchPodcasts(term);
  if (!hits.length && term !== pick.title) hits = await searchPodcasts(pick.title);
  const want = searchKey(pick.title);
  const hit = hits.find((h) => searchKey(h.title) === want) ?? hits.find((h) => searchKey(h.title).includes(want) || want.includes(searchKey(h.title))) ?? null;
  if (!hit) return null;
  return subscribe(lang, hit.feedUrl);
}

/**
 * Visio's Subtitles-only flow for a series or film watched elsewhere: pick its subtitle files
 * (the language's, and English if you have them), saved under the pick's title. Returns the new
 * item's id, or null when nothing was chosen or nothing could be read.
 */
export async function addSubtitlesFor(lang: string, title: string): Promise<string | null> {
  const files = await pickFiles(SUBTITLE_ACCEPT);
  if (!files.length) return null;
  const { ids } = await importSubtitlesOnly(lang, files, title);
  return ids[0] ?? null;
}
