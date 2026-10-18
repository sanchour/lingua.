// Finding songs: Apple's public catalogue search (no key; artwork, a 30-second preview, the
// length), looked up in the store of the country most associated with the language.

export interface SongHit {
  itunesId: number;
  title: string;
  artist: string;
  album?: string;
  year?: number;
  genre?: string;
  artworkUrl?: string;
  previewUrl?: string;
  durationMs?: number;
  appleUrl?: string;
}

/** Apple store per language: its songs come first in that store's results. */
export const STORE: Record<string, string> = { en: 'us', es: 'es', pt: 'br', fr: 'fr', de: 'de', it: 'it', ru: 'ru', el: 'gr', sv: 'se', hu: 'hu', nl: 'nl', nb: 'no', tr: 'tr', id: 'id', sw: 'ke', la: 'it', ar: 'eg', zh: 'tw', ja: 'jp', ko: 'kr' };

/** Apple's artwork URLs carry their size; ask for a large square. */
export const bigArtwork = (url: string | undefined, px = 600) => url?.replace(/\/\d+x\d+(bb|cc)?\.(jpg|png|webp)$/, `/${px}x${px}bb.jpg`);

interface ItunesTrack {
  trackId?: number;
  kind?: string;
  trackName?: string;
  artistName?: string;
  collectionName?: string;
  releaseDate?: string;
  primaryGenreName?: string;
  artworkUrl100?: string;
  previewUrl?: string;
  trackTimeMillis?: number;
  trackViewUrl?: string;
}

const clean = (s: string) => s.toLocaleLowerCase().replace(/\s*[([].*?[)\]]/g, '').replace(/\s+-\s+.*$/, '').trim();

function toHit(t: ItunesTrack): SongHit | null {
  if (!t.trackId || !t.trackName || !t.artistName || (t.kind && t.kind !== 'song')) return null;
  const year = t.releaseDate ? Number(t.releaseDate.slice(0, 4)) : undefined;
  return {
    itunesId: t.trackId,
    title: t.trackName,
    artist: t.artistName,
    album: t.collectionName,
    year: year && year > 1900 ? year : undefined,
    genre: t.primaryGenreName,
    artworkUrl: bigArtwork(t.artworkUrl100),
    previewUrl: t.previewUrl,
    durationMs: t.trackTimeMillis,
    appleUrl: t.trackViewUrl?.replace(/[?&]uo=\d+/, ''),
  };
}

/** Songs matching a search, without the same song from several albums. */
export async function searchSongs(lang: string, term: string, { limit = 30, byArtist = false }: { limit?: number; byArtist?: boolean } = {}): Promise<SongHit[]> {
  const params = new URLSearchParams({ term: term.trim(), media: 'music', entity: 'song', limit: String(Math.min(200, limit * 2)), country: STORE[lang] ?? 'us' });
  if (byArtist) params.set('attribute', 'artistTerm');
  const res = await fetch(`https://itunes.apple.com/search?${params}`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error('Apple’s music search didn’t answer. Try again in a moment.');
  const data = (await res.json()) as { results?: ItunesTrack[] };
  const seen = new Set<string>();
  const out: SongHit[] = [];
  for (const t of data.results ?? []) {
    const hit = toHit(t);
    if (!hit) continue;
    const key = `${clean(hit.title)}|${clean(hit.artist)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(hit);
    if (out.length >= limit) break;
  }
  return out;
}

/** The catalogue's best match for a title and artist (charts, Spotify likes). */
export async function matchSong(lang: string, title: string, artist: string): Promise<SongHit | null> {
  const hits = await searchSongs(lang, `${title} ${artist}`, { limit: 8 });
  const t = clean(title);
  const a = clean(artist);
  return hits.find((h) => clean(h.title) === t && (clean(h.artist).includes(a) || a.includes(clean(h.artist)))) ?? hits.find((h) => clean(h.title) === t) ?? null;
}

/** The Apple store a song's link points into (its country), else the language's own. */
export function appleStoreOf(song: { appleUrl?: string; lang: string }): string {
  return /music\.apple\.com\/([a-z]{2})\//.exec(song.appleUrl ?? '')?.[1] ?? STORE[song.lang] ?? 'us';
}

/** The song in Apple Music: on a phone, this opens the Music app. */
export const appleSongUrl = (song: { appleUrl?: string; lang: string; itunesId?: number }) => (song.itunesId ? `https://music.apple.com/${appleStoreOf(song)}/song/${song.itunesId}` : song.appleUrl);

/** Apple Music's player for one song, to put on a page. */
export const appleEmbedUrl = (song: { appleUrl?: string; lang: string; itunesId?: number }) => `https://embed.music.apple.com/${appleStoreOf(song)}/song/${song.itunesId}`;
