import { useEffect, useRef, useState } from 'react';
import { loadSpotifyApi } from '@/services/sonus/spotify';
import type { SpotifyController } from '@/services/sonus/spotify';
import { loadYouTubeApi } from '@/services/cantus/youtube';
import type { YTPlayer } from '@/services/cantus/youtube';
import { cx } from '@/lib/cx';
import type { createSpotifyClock, createYouTubeClock } from './clocks';

/**
 * Spotify's own player for a track: the whole song when you're signed in to Spotify in this
 * browser, a preview otherwise. It reports where it is, so the lyrics follow.
 */
export function SpotifyPlayer({ trackId, clock, compact }: { trackId: string; clock: ReturnType<typeof createSpotifyClock>; compact?: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const height = compact ? 80 : 152;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let controller: SpotifyController | null = null;
    let cancelled = false;
    const target = document.createElement('div');
    host.replaceChildren(target);
    loadSpotifyApi()
      .then((api) => {
        if (cancelled) return;
        api.createController(target, { uri: `spotify:track:${trackId}`, width: '100%', height }, (c) => {
          if (cancelled) return c.destroy();
          controller = c;
          clock.attach(c);
          c.addListener('playback_update', (e) => clock.update(e.data.position, e.data.isPaused));
        });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      clock.attach(null);
      clock.update(clock.now(), true);
      controller?.destroy();
    };
  }, [trackId, clock, height]);

  if (failed) {
    return (
      <iframe
        title="Spotify"
        src={`https://open.spotify.com/embed/track/${trackId}`}
        width="100%"
        height={height}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        className="rounded-xl border-0"
      />
    );
  }
  return <div ref={hostRef} style={{ minHeight: height }} className="overflow-hidden rounded-xl [&_iframe]:rounded-xl" />;
}

/** YouTube's player for the song's video: the whole song for everyone, no sign-in. */
export function YouTubePlayer({ videoId, clock, className }: { videoId: string; clock: ReturnType<typeof createYouTubeClock>; className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let player: YTPlayer | null = null;
    let cancelled = false;
    const target = document.createElement('div');
    host.replaceChildren(target);
    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;
        player = new YT.Player(target, {
          videoId,
          width: '100%',
          height: '100%',
          host: 'https://www.youtube-nocookie.com',
          playerVars: { playsinline: 1, rel: 0, modestbranding: 1, iv_load_policy: 3 },
          events: {
            onReady: (e) => !cancelled && clock.attach(e.target),
            onError: () => !cancelled && setFailed(true),
          },
        });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      clock.attach(null);
      player?.destroy();
    };
  }, [videoId, clock]);

  return (
    <div className={cx('relative aspect-video overflow-hidden rounded-xl bg-black', className)}>
      <div ref={hostRef} className="absolute inset-0 [&_iframe]:size-full" />
      {failed && <p className="absolute inset-0 grid place-items-center p-4 text-center text-sm text-white/80">This video can’t be played here. Try another link.</p>}
    </div>
  );
}
