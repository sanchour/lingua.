import { useEffect, useRef, useState } from 'react';
import type { Media } from '@/data/types';
import { recordSession } from '@/data/activity';
import { loadSpotifyApi } from '@/services/sonus/spotify';
import type { SpotifyController } from '@/services/sonus/spotify';
import type { PlayheadClock } from './KaraokeTranscript';

/**
 * A playhead for Spotify's embed: its position arrives a few times a second and is carried
 * forward smoothly between updates, so a transcript can follow it.
 */
export function createSpotifyClock(): PlayheadClock & { attach: (c: SpotifyController | null) => void; update: (positionMs: number, paused: boolean) => void } {
  let controller: SpotifyController | null = null;
  let position = 0;
  let at = performance.now();
  let paused = true;
  let frame = 0;
  const listeners = new Set<(ms: number) => void>();
  const now = () => (paused ? position : position + (performance.now() - at));
  const loop = () => {
    for (const fn of listeners) fn(now());
    frame = paused ? 0 : requestAnimationFrame(loop);
  };
  return {
    attach: (c) => (controller = c),
    update(positionMs, isPaused) {
      position = positionMs;
      at = performance.now();
      paused = isPaused;
      if (!paused && !frame) frame = requestAnimationFrame(loop);
      if (paused) for (const fn of listeners) fn(position);
    },
    onTime(fn) {
      listeners.add(fn);
      fn(now());
      return () => listeners.delete(fn);
    },
    seek: (ms) => controller?.seek(ms / 1000),
    play: () => {
      if (paused) controller?.togglePlay();
    },
  };
}

/** Spotify's own player, embedded. Playing time is recorded as listening. */
export function SpotifyEmbed({ media, clock }: { media: Media; clock: ReturnType<typeof createSpotifyClock> }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const spotify = media.spotify!;
  const tall = spotify.type !== 'episode' && spotify.type !== 'track';

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let controller: SpotifyController | null = null;
    let cancelled = false;
    let playingSince = 0;
    let listened = 0;
    const startedAt = Date.now();
    const target = document.createElement('div');
    host.replaceChildren(target);
    loadSpotifyApi()
      .then((api) => {
        if (cancelled) return;
        api.createController(target, { uri: spotify.uri, width: '100%', height: tall ? 380 : 232 }, (c) => {
          if (cancelled) return c.destroy();
          controller = c;
          clock.attach(c);
          c.addListener('playback_update', (e) => {
            const { isPaused, position } = e.data;
            clock.update(position, isPaused);
            if (!isPaused && !playingSince) playingSince = performance.now();
            if (isPaused && playingSince) {
              listened += performance.now() - playingSince;
              playingSince = 0;
            }
          });
        });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (playingSince) listened += performance.now() - playingSince;
      if (listened >= 5000) void recordSession({ lang: media.lang, type: 'listen', refId: media.id, startedAt, endedAt: Date.now(), activeMs: Math.round(listened) });
      clock.attach(null);
      controller?.destroy();
    };
  }, [spotify.uri, tall, clock, media.id, media.lang]);

  if (failed) {
    return (
      <iframe
        title={media.title}
        src={spotify.embedUrl}
        width="100%"
        height={tall ? 380 : 232}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        className="rounded-2xl border-0"
      />
    );
  }
  return <div ref={hostRef} className="min-h-[232px] overflow-hidden rounded-2xl bg-surface [&_iframe]:rounded-2xl" />;
}
