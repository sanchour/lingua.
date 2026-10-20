// Cantus search: songs, artists and albums for what the learner typed, from several places at once.
// Apple's search index leaves some artists' own recordings out (Bad Bunny's "BAILE INoLVIDABLE"
// and "Diles" are in no store's results, though his catalogue has them), so search also asks
// LRCLIB (which knows the songs people sing) and Spotify when connected, and opens the whole
// catalogue of the artists the query names or those songs belong to. A typo is put right from the
// words the results use ("inolvidabel" → "inolvidable"); originals come before covers.
import { bigArtwork, STORE, toHit } from './catalog';
import type { ItunesTrack, SongHit } from './catalog';
import { albumBase, artistsOf, findSpan, fit, fold, isSingle, titleParts, Vocabulary, words } from './fuzzy';
import { spotifyGet } from './spotify';
import type { SpotifyTrack } from './spotify';

export interface ArtistHit {
  artistId: number;
  name: string;
  genre?: string;
}

export interface AlbumHit {
  collectionId: number;
  name: string;
  artist: string;
  artworkUrl?: string;
  year?: number;
  /** A single or an EP. */
  single: boolean;
}

export type TopResult = { kind: 'song'; song: SongHit } | { kind: 'artist'; artist: ArtistHit };

export interface CatalogResults {
  query: string;
  /** The query with its typos put right, when it had any (results are for this). */
  corrected?: string;
  top: TopResult | null;
  songs: SongHit[];
  artists: ArtistHit[];
  albums: AlbumHit[];
}

/** A song known by name from elsewhere (LRCLIB, Spotify): who sings it, not where to play it. */
export interface KnownSong {
  title: string;
  artist: string;
}

/** Stores asked besides the language's own: where its music is mostly sold. */
const MORE_STORES: Record<string, string[]> = { es: ['us', 'mx'], pt: ['pt', 'us'], fr: ['ca', 'be'], de: ['at', 'ch'], en: ['gb'], it: ['us'], ar: ['sa', 'ae'], zh: ['cn', 'hk'], ko: ['us'], ja: ['us'], hi: ['us'] };

export const storesFor = (lang: string) => [...new Set([STORE[lang] ?? 'us', ...(MORE_STORES[lang] ?? ['us'])])].slice(0, 3);

const within = (signal: AbortSignal | undefined, ms: number) => (signal ? AbortSignal.any([signal, AbortSignal.timeout(ms)]) : AbortSignal.timeout(ms));

async function itunes(path: 'search' | 'lookup', params: Record<string, string>, signal?: AbortSignal): Promise<ItunesTrack[]> {
  const res = await fetch(`https://itunes.apple.com/${path}?${new URLSearchParams(params)}`, { signal: within(signal, 10_000) });
  if (!res.ok) throw new Error(`Apple ${res.status}`);
  return ((await res.json()) as { results?: ItunesTrack[] }).results ?? [];
}

async function lrclib(q: string, signal?: AbortSignal): Promise<KnownSong[]> {
  const res = await fetch(`https://lrclib.net/api/search?${new URLSearchParams({ q })}`, { signal: within(signal, 8_000) });
  if (!res.ok) throw new Error(`LRCLIB ${res.status}`);
  const list = (await res.json()) as Array<{ trackName?: string; artistName?: string }>;
  return list
    .slice(0, 30)
    .filter((r) => r.trackName && r.artistName)
    .map((r) => ({ title: r.trackName!, artist: r.artistName! }));
}

/** The learner's Spotify search, for when they've connected it. */
export async function spotifyKnown(q: string): Promise<KnownSong[]> {
  const found = await spotifyGet<{ tracks?: { items?: SpotifyTrack[] } }>(`/search?${new URLSearchParams({ q, type: 'track', limit: '10' })}`);
  return (found.tracks?.items ?? []).map((t) => ({ title: t.name, artist: t.artists.map((a) => a.name).join(', ') }));
}

interface Options {
  signal?: AbortSignal;
  /** Songs known from elsewhere (the learner's Spotify). */
  known?: (q: string) => Promise<KnownSong[]>;
  /** Search the words as typed, without putting typos right. */
  exact?: boolean;
}

/** Everything a search finds, merged and ranked. */
export async function searchCatalog(lang: string, query: string, { signal, known, exact = false }: Options = {}): Promise<CatalogResults> {
  const q = query.trim();
  const stores = storesFor(lang);
  // A source that fails or is slow is left out; leaving the page (or typing on) stops them all.
  const ask = <T>(p: Promise<T>): Promise<T | null> =>
    p.catch((e: unknown) => {
      if (signal?.aborted) throw e;
      return null;
    });

  const [songLists, artistList, albumList, sung, liked] = await Promise.all([
    Promise.all(stores.map((country) => ask(itunes('search', { term: q, media: 'music', entity: 'song', limit: '50', country }, signal)))),
    ask(itunes('search', { term: q, media: 'music', entity: 'musicArtist', limit: '6', country: stores[0] }, signal)),
    ask(itunes('search', { term: q, media: 'music', entity: 'album', limit: '12', country: stores[0] }, signal)),
    ask(lrclib(q, signal)),
    known ? ask(known(q)) : Promise.resolve(null),
  ]);
  if (songLists.every((l) => l === null) && artistList === null) throw new Error('Apple’s music search didn’t answer. Check the connection and try again.');

  // Apple's results in order, the language's own store first.
  const ranked = new Map<number, number>();
  const hits = new Map<number, SongHit>();
  songLists.forEach((list, store) =>
    (list ?? []).forEach((t, i) => {
      const hit = toHit(t);
      if (!hit || hits.has(hit.itunesId)) return;
      hits.set(hit.itunesId, hit);
      ranked.set(hit.itunesId, store * 50 + i);
    }),
  );
  const knownSongs: KnownSong[] = [...(sung ?? []), ...(liked ?? [])];

  // Typos: put right from the words the results use.
  const typedRaw = words(q);
  let typed = typedRaw;
  let corrected: string | undefined;
  if (!exact) {
    const vocab = new Vocabulary();
    for (const h of hits.values()) {
      vocab.add(h.title);
      vocab.add(h.artist);
    }
    for (const k of knownSongs) {
      vocab.add(k.title);
      vocab.add(k.artist);
    }
    const fixed = typedRaw.map((w) => vocab.correct(w) ?? w);
    if (fixed.some((w, i) => w !== typedRaw[i])) {
      typed = fixed;
      corrected = fixed.map((w) => vocab.spelling(w)).join(' ');
      // The songs people sing, asked again with the right words.
      knownSongs.push(...((await ask(lrclib(corrected, signal))) ?? []));
    }
  }

  // Artists: Apple's, and those of the songs found whose name the query holds.
  const artists = new Map<number, ArtistHit>();
  for (const a of artistList ?? []) if (a.artistId && a.artistName) artists.set(a.artistId, { artistId: a.artistId, name: a.artistName, genre: a.primaryGenreName });
  for (const h of hits.values()) {
    const first = artistsOf(h.artist)[0] ?? h.artist;
    if (h.artistId && !artists.has(h.artistId) && findSpan(typed, words(first))) artists.set(h.artistId, { artistId: h.artistId, name: first, genre: h.genre });
  }

  // Whose whole catalogue to open: artists the query names, then whoever sings the song it names.
  const names: string[] = [];
  const add = (name: string) => {
    if (names.length < 2 && !names.some((n) => fold(n) === fold(name))) names.push(name);
  };
  const candidates = [...[...artists.values()].map((a) => a.name), ...knownSongs.flatMap((k) => artistsOf(k.artist))];
  candidates
    .map((name) => ({ name, span: findSpan(typed, words(name)) }))
    .filter((c) => c.span)
    .sort((a, b) => b.span!.end - b.span!.start - (a.span!.end - a.span!.start) || Number(b.span!.exact) - Number(a.span!.exact))
    .forEach((c) => add(c.name));
  const namesArtist = names.length > 0;
  // The song the query names, by whoever is most known for it (the original, not its covers).
  const singers = new Map<string, { name: string; n: number }>();
  for (const k of knownSongs) {
    const base = words(titleParts(k.title).base);
    const rest = withoutArtist(typed, artistsOf(k.artist));
    if (!rest.length || !fit(rest, base).all || !fit(base, rest).all) continue;
    const name = artistsOf(k.artist)[0] ?? k.artist;
    const entry = singers.get(fold(name)) ?? { name, n: 0 };
    entry.n++;
    singers.set(fold(name), entry);
  }
  [...singers.values()].sort((a, b) => b.n - a.n).forEach((s) => add(s.name));
  const opened = await Promise.all(names.map((name) => ask(catalogueOf(name, artists, stores, signal))));
  opened.forEach((list) =>
    (list ?? []).forEach((hit) => {
      if (!hits.has(hit.itunesId)) hits.set(hit.itunesId, hit);
    }),
  );

  // Rank: the title asked for, the artist named, the original before covers and other versions.
  const sungBy = new Map<string, number>();
  for (const k of knownSongs) {
    const base = titleParts(k.title).base;
    const key = `${base}|${fold(artistsOf(k.artist)[0] ?? k.artist)}`;
    const n = (sungBy.get(key) ?? 0) + 1;
    sungBy.set(key, n);
    // The most any artist is known for this title: theirs is the original.
    sungBy.set(base, Math.max(sungBy.get(base) ?? 0, n));
  }
  const scored = [...hits.values()]
    .map((hit) => ({ hit, ...rank(hit, typed, sungBy, ranked.get(hit.itunesId), namesArtist) }))
    .filter((s) => s.relevant)
    .sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const songs: SongHit[] = [];
  for (const { hit } of scored) {
    const parts = titleParts(hit.title, hit.artist);
    const key = `${parts.base}|${parts.version}|${fold(artistsOf(hit.artist)[0] ?? hit.artist)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    songs.push(hit);
    if (songs.length >= 40) break;
  }

  const artistHits = [...artists.values()]
    .map((a) => ({ a, f: fit(words(a.name), typed) }))
    .sort((x, y) => Number(y.f.all) - Number(x.f.all) || y.f.score - x.f.score)
    .map((x) => x.a)
    // Apple sometimes has one artist twice: the first is enough.
    .filter((a, i, all) => all.findIndex((b) => fold(b.name) === fold(a.name)) === i)
    .slice(0, 8);
  const whole = (name: string) => {
    const n = words(name);
    return n.length > 0 && fit(typed, n).all && fit(n, typed).all;
  };
  const topArtist = artistHits.find((a) => whole(a.name));
  const topSong = scored[0] && songs[0] === scored[0].hit && scored[0].titleFits ? songs[0] : undefined;
  const top: TopResult | null = topArtist && !(topSong && whole(titleParts(topSong.title).base)) ? { kind: 'artist', artist: topArtist } : topSong ? { kind: 'song', song: topSong } : null;

  const albums: AlbumHit[] = [];
  const albumSeen = new Set<string>();
  for (const t of albumList ?? []) {
    if (!t.collectionId || !t.collectionName || !t.artistName) continue;
    const key = `${albumBase(t.collectionName)}|${fold(t.artistName)}`;
    if (albumSeen.has(key) || fit(typed, [...words(albumBase(t.collectionName)), ...words(t.artistName)]).score < 0.5) continue;
    albumSeen.add(key);
    const year = t.releaseDate ? Number(t.releaseDate.slice(0, 4)) : undefined;
    albums.push({ collectionId: t.collectionId, name: t.collectionName.replace(/\s+-\s+(?:Single|EP)$/i, ''), artist: t.artistName, artworkUrl: bigArtwork(t.artworkUrl100, 400), year: year && year > 1900 ? year : undefined, single: isSingle(t.collectionName) });
  }

  return { query: q, corrected, top, songs, artists: artistHits, albums: albums.slice(0, 10) };
}

/** The typed words without those naming one of the artists. */
function withoutArtist(typed: string[], names: string[]): string[] {
  for (const name of names) {
    const span = findSpan(typed, words(name));
    if (span) return typed.filter((_, i) => i < span.start || i >= span.end);
  }
  return typed;
}

/** An artist's songs, by Apple's lookup: what search leaves out is there. */
async function catalogueOf(name: string, artists: Map<number, ArtistHit>, stores: string[], signal?: AbortSignal): Promise<SongHit[]> {
  let artist = [...artists.values()].find((a) => fold(a.name) === fold(name));
  if (!artist) {
    const found = await itunes('search', { term: name, media: 'music', entity: 'musicArtist', limit: '3', country: stores[0] }, signal);
    const match = found.find((a) => a.artistId && a.artistName && fold(a.artistName) === fold(name));
    if (!match) return [];
    artist = { artistId: match.artistId!, name: match.artistName!, genre: match.primaryGenreName };
    artists.set(artist.artistId, artist);
  }
  for (const country of [stores[0], 'us']) {
    const list = await itunes('lookup', { id: String(artist.artistId), entity: 'song', limit: '200', country }, signal);
    const songs = list.map(toHit).filter((h): h is SongHit => h !== null);
    if (songs.length) return songs;
  }
  return [];
}

/** How well a song answers the query; `relevant` when it has anything to do with it. */
function rank(hit: SongHit, typed: string[], sungBy: Map<string, number>, appleRank: number | undefined, namesArtist: boolean): { score: number; relevant: boolean; titleFits: boolean } {
  const parts = titleParts(hit.title, hit.artist);
  const title = parts.base.split(' ').filter(Boolean);
  const names = artistsOf(hit.artist);
  let rest = typed;
  let artistNamed = 0;
  for (const name of names) {
    const span = findSpan(typed, words(name));
    if (span) {
      rest = typed.filter((_, i) => i < span.start || i >= span.end);
      artistNamed = span.exact ? 1 : 0.8;
      break;
    }
  }
  let score = artistNamed * 3;
  let titleFits = false;
  if (rest.length) {
    const asked = fit(rest, title);
    const covered = fit(title, rest);
    titleFits = asked.all && covered.all;
    score += asked.score * 4 + (asked.all ? 2 : 0) + (covered.all && asked.score >= 0.5 ? 2 : 0);
  } else {
    // Only the artist was typed: their songs.
    score += 1;
  }
  const any = fit(typed, [...title, ...names.flatMap(words)]);
  if (!artistNamed) score += any.score - (namesArtist ? 2 : 0);
  if (parts.cover) score -= 6;
  if (parts.version && !typed.some((w) => parts.version.includes(w))) score -= 1;
  // LRCLIB and Spotify know the song by this artist: the original, the one people sing.
  const sung = Math.max(0, ...names.map((name) => sungBy.get(`${parts.base}|${fold(name)}`) ?? 0));
  if (sung) score += 3 * (sung / (sungBy.get(parts.base) ?? sung));
  if (appleRank !== undefined) score += Math.max(0, 1 - appleRank / 50);
  return { score, relevant: any.score > 0 && (rest.length === 0 || fit(rest, title).score > 0 || any.all), titleFits: titleFits || (!rest.length && artistNamed > 0) };
}
