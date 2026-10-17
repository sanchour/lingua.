import { useEffect, useRef, useState } from 'react';
import { loadSpotifyApi } from '@/services/sonus/spotify';
import type { SpotifyController } from '@/services/sonus/spotify';
import { loadYouTubeApi } from '@/services/cantus/youtube';
import type { YTPlayer } from '@/services/cantus/youtube';
import type { Song } from '@/data/types';
import { cx } from '@/lib/cx';
import { appleEmbedUrl, appleSongUrl } from '@/services/cantus/catalog';
import type { createSpotifyClock, createYouTubeClock, TimerClock } from './clocks';

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

/**
 * Apple Music's own player: the whole song when you're signed in to Apple Music in it, a preview
 * otherwise. It tells the page nothing, but pressing it moves focus into it: so a press starts or
 * pauses the lyrics' timer, and tapping the line being sung puts them right.
 */
export function AppleMusicPlayer({ song, clock }: { song: Song; clock: TimerClock }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const back = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const pressed = () =>
      window.setTimeout(() => {
        if (document.activeElement !== frame.current) return;
        clock.toggle();
        // Focus back on the page, so the next press is noticed too.
        back.current?.focus({ preventScroll: true });
      }, 0);
    window.addEventListener('blur', pressed);
    return () => window.removeEventListener('blur', pressed);
  }, [clock]);
  return (
    <div className="relative">
      <iframe
        ref={frame}
        title={`${song.title} in Apple Music`}
        src={appleEmbedUrl(song)}
        height={175}
        allow="autoplay *; encrypted-media *; clipboard-write"
        sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
        className="block w-full overflow-hidden rounded-xl border-0 bg-surface"
      />
      {/* The artwork and title open the song in Apple Music, as Apple's own do, but without being
          taken for a press on Play. */}
      <a href={appleSongUrl(song)} target="_blank" rel="noopener noreferrer" aria-label={`${song.title} in Apple Music`} className="absolute top-0 left-0 h-[112px] w-[calc(100%-84px)] rounded-tl-xl" />
      <span ref={back} tabIndex={-1} className="sr-only" />
    </div>
  );
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
