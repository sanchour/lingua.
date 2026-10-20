// YouTube's embedded player (free, no key): plays a whole song and tells the page where it is, so
// the lyrics can follow. Only the video's id is needed; it comes from a link the learner pastes,
// or from a search (the learner's own Data API key, sent in a header and never in a URL).

/** youtu.be/ID, youtube.com/watch?v=ID, m. and music.youtube.com, /shorts/, /embed/, /live/, /v/, or a bare id. */
export function youtubeId(input: string): string | null {
  const s = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  const m =
    /(?:youtube\.com|youtube-nocookie\.com)\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/|v\/|e\/)([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])/i.exec(s) ??
    /youtu\.be\/([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])/i.exec(s);
  return m ? m[1] : null;
}

export const youtubeWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

/** "PT3M49S" → 229000; YouTube's lengths are ISO 8601 durations. */
export function isoDurationMs(iso: string | undefined): number | undefined {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(iso ?? '');
  if (!m) return undefined;
  const [, d, h, min, s] = m.map((x) => Number(x ?? 0));
  return Math.round((((d * 24 + h) * 60 + min) * 60 + s) * 1000);
}

/** What YouTube's oEmbed says of a video: its title and channel, or why it can't play on another site. */
export type YouTubeEmbedCheck = { ok: true; title: string; channel: string } | { ok: false; why: 'not-embeddable' | 'not-found' };

/**
 * Whether a video plays in YouTube's embedded player, from its oEmbed (no key, open to every site).
 * 401/403: the owner turned embedding off; 400/404: no such video, or it is private. Throws when
 * YouTube couldn't be asked.
 */
export async function youtubeEmbedCheck(id: string, signal?: AbortSignal): Promise<YouTubeEmbedCheck> {
  const url = `https://www.youtube.com/oembed?${new URLSearchParams({ url: youtubeWatchUrl(id), format: 'json' })}`;
  const res = await fetch(url, { signal: withTimeout(signal, 8000) });
  if (res.status === 401 || res.status === 403) return { ok: false, why: 'not-embeddable' };
  if (!res.ok) {
    if (res.status === 400 || res.status === 404) return { ok: false, why: 'not-found' };
    throw new Error('YouTube didn’t answer. Try again in a moment.');
  }
  const data = (await res.json()) as { title?: string; author_name?: string };
  return { ok: true, title: data.title ?? '', channel: data.author_name ?? '' };
}

/** The caller's signal (when there is one) and a time limit, whichever ends first. */
export function withTimeout(signal: AbortSignal | undefined, ms: number): AbortSignal {
  const timeout = AbortSignal.timeout(ms);
  if (!signal) return timeout;
  // AbortSignal.any is missing before iOS 17.4: there, the caller's signal alone.
  return typeof AbortSignal.any === 'function' ? AbortSignal.any([signal, timeout]) : signal;
}

/** The learner's YouTube key was refused (wrong, or the API isn't turned on for it), or today's quota is used up. */
export class YouTubeKeyError extends Error {
  constructor(readonly code: 'key' | 'quota') {
    super(code === 'quota' ? 'Your YouTube key has used up today’s searches. They come back tomorrow.' : 'YouTube didn’t accept your key. Check it in Ordo › Music.');
    this.name = 'YouTubeKeyError';
  }
}

export interface YouTubeVideo {
  id: string;
  title: string;
  channel: string;
  channelId: string;
  durationMs?: number;
  embeddable: boolean;
  /** Live now or a premiere still to come: no whole song yet. */
  live: boolean;
}

const DATA_API = 'https://www.googleapis.com/youtube/v3';

/** One Data API request, the key in its header (never the URL, which can end up in logs and history). */
async function dataApi<T>(path: string, params: Record<string, string>, key: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${DATA_API}/${path}?${new URLSearchParams(params)}`, { headers: { 'X-Goog-Api-Key': key }, signal: withTimeout(signal, 10_000) });
  if (res.ok) return (await res.json()) as T;
  const body = (await res.json().catch(() => null)) as { error?: { errors?: Array<{ reason?: string }>; details?: Array<{ reason?: string }> } } | null;
  const reasons = [...(body?.error?.errors ?? []), ...(body?.error?.details ?? [])].map((e) => e.reason ?? '');
  if (reasons.some((r) => /quota|rateLimit|dailyLimit/i.test(r))) throw new YouTubeKeyError('quota');
  if (res.status === 400 || res.status === 403) throw new YouTubeKeyError('key');
  throw new Error('YouTube didn’t answer. Try again in a moment.');
}

interface SearchList {
  items?: Array<{ id?: { videoId?: string } }>;
}

interface VideoList {
  items?: Array<{
    id: string;
    snippet?: { title?: string; channelTitle?: string; channelId?: string; liveBroadcastContent?: string };
    contentDetails?: { duration?: string };
    status?: { embeddable?: boolean; privacyStatus?: string };
  }>;
}

/**
 * Videos for a search, with their lengths and whether they can be embedded: search.list (100 of
 * the key's 10,000 free daily units) then videos.list for the details (1 unit). `music` keeps to
 * YouTube's Music category, where official audio and music videos are.
 */
export async function searchYouTubeVideos(key: string, query: string, { signal, music = true, max = 10 }: { signal?: AbortSignal; music?: boolean; max?: number } = {}): Promise<YouTubeVideo[]> {
  const params: Record<string, string> = { part: 'snippet', type: 'video', videoEmbeddable: 'true', maxResults: String(max), q: query };
  if (music) params.videoCategoryId = '10';
  const found = await dataApi<SearchList>('search', params, key, signal);
  const ids = (found.items ?? []).map((i) => i.id?.videoId).filter((id): id is string => Boolean(id));
  if (!ids.length) return [];
  const details = await dataApi<VideoList>('videos', { part: 'snippet,contentDetails,status', id: ids.join(',') }, key, signal);
  const byId = new Map((details.items ?? []).map((v) => [v.id, v]));
  return ids.flatMap((id) => {
    const v = byId.get(id);
    if (!v) return [];
    return [
      {
        id,
        title: v.snippet?.title ?? '',
        channel: v.snippet?.channelTitle ?? '',
        channelId: v.snippet?.channelId ?? '',
        durationMs: isoDurationMs(v.contentDetails?.duration) || undefined,
        embeddable: v.status?.embeddable !== false && v.status?.privacyStatus !== 'private',
        live: v.snippet?.liveBroadcastContent === 'live' || v.snippet?.liveBroadcastContent === 'upcoming',
      },
    ];
  });
}

export interface YTPlayer {
  getCurrentTime(): number;
  getPlayerState(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  pauseVideo(): void;
  destroy(): void;
}

interface YTNamespace {
  Player: new (
    el: HTMLElement,
    options: {
      videoId: string;
      width?: string | number;
      height?: string | number;
      host?: string;
      playerVars?: Record<string, string | number>;
      events?: { onReady?: (e: { target: YTPlayer }) => void; onStateChange?: (e: { data: number; target: YTPlayer }) => void; onError?: () => void };
    },
  ) => YTPlayer;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let api: Promise<YTNamespace> | null = null;

/** Loads YouTube's player API once, when a song with a video is opened. */
export function loadYouTubeApi(): Promise<YTNamespace> {
  api ??= new Promise<YTNamespace>((resolve, reject) => {
    if (window.YT?.Player) return resolve(window.YT);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT!);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => {
      api = null;
      reject(new Error('YouTube’s player couldn’t be loaded.'));
    };
    document.head.append(script);
  });
  return api;
}

/** YT.PlayerState.PLAYING */
export const YT_PLAYING = 1;
