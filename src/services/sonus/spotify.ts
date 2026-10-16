// Spotify links. Spotify's audio is DRM-protected, so it plays in Spotify's own embedded player;
// the embed's iFrame API still reports the position, which keeps a transcript in step with it.
import type { Media } from '@/data/types';

type SpotifyKind = NonNullable<Media['spotify']>['type'];
const KINDS: SpotifyKind[] = ['episode', 'show', 'playlist', 'track'];

/** open.spotify.com links (any locale prefix, with or without tracking query) and spotify: URIs. */
export function parseSpotifyLink(input: string): NonNullable<Media['spotify']> | null {
  const value = input.trim();
  const fromUrl = /open\.spotify\.com\/(?:intl-[a-z-]+\/)?(episode|show|playlist|track)\/([A-Za-z0-9]{10,})/i.exec(value);
  const fromUri = /^spotify:(episode|show|playlist|track):([A-Za-z0-9]{10,})$/i.exec(value);
  const m = fromUrl ?? fromUri;
  if (!m) return null;
  const type = m[1].toLowerCase() as SpotifyKind;
  if (!KINDS.includes(type)) return null;
  return { type, uri: `spotify:${type}:${m[2]}`, embedUrl: `https://open.spotify.com/embed/${type}/${m[2]}` };
}

/** Title and artwork for a link, from Spotify's public oEmbed endpoint. */
export async function spotifyInfo(spotify: NonNullable<Media['spotify']>): Promise<{ title: string; coverUrl?: string }> {
  const page = spotify.embedUrl.replace('/embed/', '/');
  try {
    const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(page)}`, { signal: AbortSignal.timeout(8000) });
    const data = (await res.json()) as { title?: string; thumbnail_url?: string };
    return { title: data.title ?? 'Spotify', coverUrl: data.thumbnail_url };
  } catch {
    return { title: `Spotify ${spotify.type}` };
  }
}

export interface SpotifyController {
  loadUri(uri: string): void;
  play(): void;
  togglePlay(): void;
  seek(seconds: number): void;
  destroy(): void;
  addListener(event: 'playback_update', fn: (e: { data: { isPaused: boolean; position: number; duration: number } }) => void): void;
  addListener(event: 'ready', fn: () => void): void;
}

interface IFrameApi {
  createController(el: HTMLElement, options: { uri: string; width?: string | number; height?: string | number }, ready: (c: SpotifyController) => void): void;
}

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: IFrameApi) => void;
  }
}

let api: Promise<IFrameApi> | null = null;

/** Loads Spotify's embed API once (only when a Spotify item is opened). */
export function loadSpotifyApi(): Promise<IFrameApi> {
  api ??= new Promise<IFrameApi>((resolve, reject) => {
    window.onSpotifyIframeApiReady = resolve;
    const script = document.createElement('script');
    script.src = 'https://open.spotify.com/embed/iframe-api/v1';
    script.async = true;
    script.onerror = () => {
      api = null;
      reject(new Error('Spotify’s player couldn’t be loaded.'));
    };
    document.head.append(script);
  });
  return api;
}
