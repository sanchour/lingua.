// Lock-screen and headphone controls (Media Session API): title and artwork, play/pause, skips,
// and previous/next: a sentence when the item has a transcript, a chapter or part in a book.
import { blobUrl } from '@/data/library';
import type { Media } from '@/data/types';

interface Controls {
  play: () => Promise<void> | void;
  pause: () => void;
  skip: (seconds: number) => void;
  seek: (ms: number) => void;
  previous: () => void;
  next: () => void;
}

const ACTIONS: MediaSessionAction[] = ['play', 'pause', 'stop', 'seekbackward', 'seekforward', 'seekto', 'previoustrack', 'nexttrack'];
let artworkUrl: string | null = null;
let lastPositionUpdate = 0;

const supported = () => typeof navigator !== 'undefined' && 'mediaSession' in navigator;

function handle(action: MediaSessionAction, fn: MediaSessionActionHandler | null) {
  try {
    navigator.mediaSession.setActionHandler(action, fn);
  } catch {
    // This browser doesn't offer that action.
  }
}

export function setupMediaSession(media: Media | null, controls?: Controls): void {
  if (!supported()) return;
  if (artworkUrl) URL.revokeObjectURL(artworkUrl);
  artworkUrl = null;
  if (!media || !controls) {
    navigator.mediaSession.metadata = null;
    for (const action of ACTIONS) handle(action, null);
    return;
  }
  const base = import.meta.env.BASE_URL;
  const fallback = [
    { src: `${base}pwa-192x192.png`, sizes: '192x192', type: 'image/png' },
    { src: `${base}pwa-512x512.png`, sizes: '512x512', type: 'image/png' },
  ];
  const apply = (artwork: MediaImage[]) => {
    navigator.mediaSession.metadata = new MediaMetadata({ title: media.title, artist: media.artist ?? media.collection ?? 'Lingua', album: media.collection ?? 'Sonus', artwork });
  };
  apply(media.coverUrl ? [{ src: media.coverUrl, sizes: '600x600' }, ...fallback] : fallback);
  if (media.coverBlobId) {
    void blobUrl(media.coverBlobId).then((url) => {
      if (!url) return;
      artworkUrl = url;
      apply([{ src: url, sizes: '512x512' }, ...fallback]);
    });
  }
  handle('play', () => void controls.play());
  handle('pause', () => controls.pause());
  handle('stop', () => controls.pause());
  // A live station can only play and pause.
  if (media.kind === 'radio') {
    for (const action of ACTIONS.slice(3)) handle(action, null);
    return;
  }
  handle('seekbackward', (d) => controls.skip(-(d.seekOffset ?? 10)));
  handle('seekforward', (d) => controls.skip(d.seekOffset ?? 30));
  handle('seekto', (d) => d.seekTime !== undefined && controls.seek(d.seekTime * 1000));
  handle('previoustrack', () => controls.previous());
  handle('nexttrack', () => controls.next());
}

/** A live station's song on the lock screen, the station under it. */
export function showNowPlaying(media: Media, text: string | null): void {
  const metadata = supported() ? navigator.mediaSession.metadata : null;
  if (!metadata) return;
  metadata.title = text ?? media.title;
  metadata.artist = text ? media.title : (media.artist ?? 'Radio');
}

/** Keeps the lock screen's progress bar right (at most every half second). */
export function updatePositionState(audio: HTMLAudioElement): void {
  if (!supported() || !navigator.mediaSession.setPositionState) return;
  navigator.mediaSession.playbackState = audio.paused ? 'paused' : 'playing';
  const now = performance.now();
  if (now - lastPositionUpdate < 500 || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
  lastPositionUpdate = now;
  try {
    navigator.mediaSession.setPositionState({ duration: audio.duration, playbackRate: audio.playbackRate, position: Math.min(audio.currentTime, audio.duration) });
  } catch {
    // Some browsers reject positions while metadata is still loading.
  }
}
