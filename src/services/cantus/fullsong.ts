// The whole song, found by itself: Apple and Spotify play 30 seconds to most learners, so a song
// opened in Cantus looks for a full recording it may embed. YouTube first, through the learner's
// own Data API key when there is one (kept on the device, sent in a header), else through the
// public Piped and Invidious servers, tried in turn. Candidates are ranked by title, artist and
// length; official audio first; live, covers, sped-up and the like never. Only YouTube's own
// embedded player plays what is found. And one field takes a link from anywhere.
import { artistsOf, fit, fold, titleParts, words } from './fuzzy';
import { spotifyTrackId } from './spotify';
import { searchYouTubeVideos, withTimeout, youtubeEmbedCheck, youtubeId } from './youtube';

export interface Candidate {
  id: string;
  title: string;
  channel: string;
  durationMs?: number;
  live?: boolean;
  /** Known to play on other sites (the Data API says so); otherwise checked before it's chosen. */
  embeddable?: boolean;
  /** From YouTube Music's songs: the artist's own audio. */
  official?: boolean;
}

export interface FoundSong {
  youtubeId: string;
  /** "Official audio", "Music video" or "Video": what the menu says it plays from. */
  label: string;
  channel: string;
  durationMs?: number;
}

interface SongLike {
  title: string;
  artist: string;
  durationMs?: number;
}

/** Another recording than the song's, unless the song's own title says it. */
const NEVER = /(?:^| )(live|en vivo|ao vivo|en directo|dal vivo|концерт|concert|concierto|cover|covers|karaoke|reaction|reacci[oó]n|react|sped up|speed up|slowed|reverb|nightcore|8d|tutorial|lesson|instrumental|remix|acoustic|ac[uú]stico|1 hour|10 hours|extended|bass boosted|piano version|letra y acordes|chords)(?= |$)/g;
const LYRIC_VIDEO = /(?:^| )(lyrics?|letra|lyric video|paroles|testo|текст)(?= |$)/;
const hasWord = (text: string, word: string) => ` ${text} `.includes(` ${word} `);

/** How well a found video is the song itself; null when it isn't. Exported for tests. */
export function scoreCandidate(song: SongLike, c: Candidate): { score: number; label: string } | null {
  if (c.live || c.embeddable === false) return null;
  const title = fold(c.title);
  const own = fold(song.title);
  if ([...title.matchAll(NEVER)].some((m) => !hasWord(own, m[1]))) return null;
  const base = words(titleParts(song.title, song.artist).base);
  const seen = [...words(c.title), ...words(c.channel)];
  if (!base.length || !fit(base, words(c.title)).all) return null;
  const artist = artistsOf(song.artist)[0] ?? song.artist;
  const channel = fold(c.channel);
  const topic = / topic$/.test(channel);
  const byArtist = fit(words(artist), seen).all || channel.replace(/ /g, '').includes(fold(artist).replace(/ /g, ''));
  if (!byArtist) return null;
  let score = 3;
  let label = 'Video';
  if (topic || c.official || /\b(official audio|audio oficial|audio officiel|official visualizer|visualizer)\b/.test(title)) {
    score += 3;
    label = 'Official audio';
  } else if (/\b(official (music )?video|video oficial|videoclip oficial|clip officiel)\b/.test(title) || /vevo$/.test(channel.replace(/ /g, ''))) {
    score += 1.5;
    label = 'Music video';
  }
  if (LYRIC_VIDEO.test(title) && !LYRIC_VIDEO.test(own)) score -= 2;
  if (song.durationMs && c.durationMs) {
    const off = Math.abs(song.durationMs - c.durationMs);
    if (off > 60_000) return null;
    score += off <= 3_000 ? 4 : off <= 8_000 ? 2 : off <= 20_000 ? 0 : -4;
  }
  return { score, label };
}

export function rankCandidates(song: SongLike, list: Candidate[], rejected: readonly string[] = []): Array<Candidate & { score: number; label: string }> {
  const seen = new Set<string>();
  return list
    .filter((c) => !rejected.includes(c.id) && !seen.has(c.id) && seen.add(c.id))
    .flatMap((c) => {
      const s = scoreCandidate(song, c);
      return s ? [{ ...c, ...s }] : [];
    })
    .sort((a, b) => b.score - a.score);
}

const PIPED = ['https://api.piped.private.coffee', 'https://pipedapi.ducks.party'];
const INVIDIOUS_DIRECTORY = 'https://api.invidious.io/instances.json?sort_by=health';

async function piped(q: string, filter: 'music_songs' | 'videos', signal?: AbortSignal): Promise<Candidate[] | null> {
  for (const base of PIPED) {
    try {
      const res = await fetch(`${base}/search?${new URLSearchParams({ q, filter })}`, { signal: withTimeout(signal, 8_000) });
      if (!res.ok) continue;
      const data = (await res.json()) as { items?: Array<{ url?: string; type?: string; title?: string; uploaderName?: string; duration?: number; isShort?: boolean }> };
      return (data.items ?? []).flatMap((it) => {
        const id = it.url ? youtubeId(`https://www.youtube.com${it.url}`) : null;
        if (!id || it.type !== 'stream' || it.isShort) return [];
        return [{ id, title: it.title ?? '', channel: it.uploaderName ?? '', durationMs: it.duration && it.duration > 0 ? it.duration * 1000 : undefined, live: it.duration === -1, official: filter === 'music_songs' }];
      });
    } catch (e) {
      if (signal?.aborted) throw e;
    }
  }
  return null;
}

let invidiousHosts: string[] | null = null;
async function invidious(q: string, signal?: AbortSignal): Promise<Candidate[] | null> {
  try {
    if (!invidiousHosts) {
      const res = await fetch(INVIDIOUS_DIRECTORY, { signal: withTimeout(signal, 6_000) });
      const list = (await res.json()) as Array<[string, { type?: string; api?: boolean; cors?: boolean; uri?: string }]>;
      invidiousHosts = list.filter(([, i]) => i.type === 'https' && i.api && i.cors && i.uri).map(([, i]) => i.uri!.replace(/\/$/, '')).slice(0, 3);
    }
  } catch (e) {
    if (signal?.aborted) throw e;
    return null;
  }
  for (const host of invidiousHosts) {
    try {
      const res = await fetch(`${host}/api/v1/search?${new URLSearchParams({ q, type: 'video' })}`, { signal: withTimeout(signal, 8_000) });
      if (!res.ok) continue;
      const items = (await res.json()) as Array<{ type?: string; videoId?: string; title?: string; author?: string; lengthSeconds?: number; liveNow?: boolean }>;
      return items.filter((i) => i.type === 'video' && i.videoId).map((i) => ({ id: i.videoId!, title: i.title ?? '', channel: i.author ?? '', durationMs: i.lengthSeconds ? i.lengthSeconds * 1000 : undefined, live: i.liveNow }));
    } catch (e) {
      if (signal?.aborted) throw e;
    }
  }
  return null;
}

/** What to search for: the first artist and the title without "(feat. …)". */
export const fullSongQuery = (song: SongLike) => `${artistsOf(song.artist)[0] ?? song.artist} ${song.title.replace(/\s*[([](?:feat|ft|featuring|with|con)\.?\s[^)\]]*[)\]]/gi, '')}`.trim();

/** A whole recording of the song that YouTube's player may embed, or null. */
export async function findFullSong(song: SongLike, { key, signal, rejected = [] }: { key?: string; signal?: AbortSignal; rejected?: readonly string[] } = {}): Promise<FoundSong | null> {
  const q = fullSongQuery(song);
  const ways: Array<() => Promise<Candidate[] | null>> = [];
  if (key) ways.push(() => searchYouTubeVideos(key, q, { signal, max: 10 }).catch((e: unknown) => (signal?.aborted ? Promise.reject(e) : null)));
  ways.push(
    () => piped(q, 'music_songs', signal),
    () => piped(q, 'videos', signal),
    () => invidious(q, signal),
  );
  let answered = false;
  for (const way of ways) {
    const list = await way();
    if (list) answered = true;
    if (!list?.length) continue;
    for (const c of rankCandidates(song, list, rejected).slice(0, 3)) {
      // Found without the Data API: ask YouTube whether its owner lets it play on other sites.
      if (c.embeddable === undefined) {
        const check = await youtubeEmbedCheck(c.id, signal).catch((e: unknown) => {
          if (signal?.aborted) throw e;
          return null;
        });
        if (!check?.ok) continue;
      }
      return { youtubeId: c.id, label: c.label, channel: c.channel, durationMs: c.durationMs };
    }
  }
  if (signal?.aborted) throw signal.reason;
  // Offline, or every server busy: that isn't "there is none", so the caller saves nothing.
  if (!answered) throw new Error('No search server answered');
  return null;
}

export type MusicLink =
  | { kind: 'youtube'; id: string }
  | { kind: 'spotify'; id: string }
  | { kind: 'apple'; id: number; url: string }
  | { kind: 'soundcloud'; url: string }
  | { kind: 'vimeo'; id: string }
  | { kind: 'dailymotion'; id: string }
  | { kind: 'bandcamp'; url: string }
  /** A Bandcamp page: its player needs the number in Share › Embed. */
  | { kind: 'bandcamp-page' };

const SOUNDCLOUD_PAGES = /^(search|discover|stream|you|upload|charts|tags|pages|settings|messages|notifications|people)$/i;
const SOUNDCLOUD_LISTS = /^(sets|tracks|albums|likes|reposts|followers|following|popular-tracks|comments|spotlight)$/i;

/** Which service a pasted link (or embed code) is from, and what plays it. */
export function parseMusicLink(input: string): MusicLink | null {
  const s = input.trim();
  if (!s) return null;
  const yt = youtubeId(s);
  if (yt) return { kind: 'youtube', id: yt };
  const sp = spotifyTrackId(s);
  if (sp) return { kind: 'spotify', id: sp };
  const apple = /music\.apple\.com\/[a-z]{2}\/(?:album\/[^?\s]*\?(?:.*&)?i=(\d+)|song\/(?:[^/\s]*\/)?(\d+))/i.exec(s);
  if (apple) return { kind: 'apple', id: Number(apple[1] ?? apple[2]), url: apple[0].startsWith('http') ? apple[0] : `https://${apple[0]}` };
  const sc = /https?:\/\/(?:www\.|m\.)?soundcloud\.com\/([^/\s?#]+)\/([^/\s?#]+)(?:\/s-[A-Za-z0-9]+)?/i.exec(s);
  if (sc && !SOUNDCLOUD_PAGES.test(sc[1]) && !SOUNDCLOUD_LISTS.test(sc[2])) return { kind: 'soundcloud', url: sc[0].replace('//m.', '//') };
  const scShort = /https?:\/\/on\.soundcloud\.com\/[A-Za-z0-9]+/i.exec(s);
  if (scShort) return { kind: 'soundcloud', url: scShort[0] };
  const vimeo = /vimeo\.com\/(?:video\/|channels\/[^/\s]+\/)?(\d{5,})(?:\/([0-9a-f]{6,}))?/i.exec(s);
  if (vimeo) {
    // An unlisted video plays only with its hash: kept as "id/hash".
    const hash = vimeo[2] ?? /[?&]h=([0-9a-f]{6,})/i.exec(s)?.[1];
    return { kind: 'vimeo', id: hash ? `${vimeo[1]}/${hash}` : vimeo[1] };
  }
  const dm = /dailymotion\.com\/(?:embed\/)?video\/([a-z0-9]+)/i.exec(s) ?? /dai\.ly\/([a-z0-9]+)/i.exec(s) ?? /dailymotion\.com\/player\.html\?video=([a-z0-9]+)/i.exec(s);
  if (dm) return { kind: 'dailymotion', id: dm[1] };
  const bc = /bandcamp\.com\/EmbeddedPlayer\/[^"'\s]*/i.exec(s)?.[0];
  const album = bc && /album=(\d+)/i.exec(bc)?.[1];
  const track = bc && /track=(\d+)/i.exec(bc)?.[1];
  if (album || track) return { kind: 'bandcamp', url: `https://bandcamp.com/EmbeddedPlayer/${album ? `album=${album}/` : ''}${track ? `track=${track}/` : ''}size=large/bgcol=1a1215/linkcol=e8a0bf/artwork=small/tracklist=false/transparent=true/` };
  if (/\.bandcamp\.com\/(?:track|album)\//i.test(s)) return { kind: 'bandcamp-page' };
  return null;
}
