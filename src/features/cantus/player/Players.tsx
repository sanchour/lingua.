import { useEffect, useRef, useState } from 'react';
import { loadSpotifyApi } from '@/services/sonus/spotify';
import type { SpotifyController } from '@/services/sonus/spotify';
import { loadYouTubeApi } from '@/services/cantus/youtube';
import type { YTPlayer } from '@/services/cantus/youtube';
import type { Song } from '@/data/types';
import { cx } from '@/lib/cx';
import { appleEmbedUrl, appleSongUrl } from '@/services/cantus/catalog';
import type { createSpotifyClock, createYouTubeClock, SCWidget, SoundCloudClock, TimerClock } from './clocks';

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

/** A player that tells the page nothing: a press in it moves focus into its frame, so that starts or pauses the lyrics' timer. */
function useFramePress(clock: TimerClock) {
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
  return { frame, back };
}

/**
 * Apple Music's own player: the whole song when you're signed in to Apple Music in it, a preview
 * otherwise. It tells the page nothing, but pressing it moves focus into it: so a press starts or
 * pauses the lyrics' timer, and tapping the line being sung puts them right.
 */
export function AppleMusicPlayer({ song, clock }: { song: Song; clock: TimerClock }) {
  const { frame, back } = useFramePress(clock);
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

type SCApi = { Widget: (iframe: HTMLIFrameElement) => SCWidget };
let soundCloudApi: Promise<SCApi> | null = null;
/** SoundCloud's Widget API script (its official way to control the player), loaded once. */
function loadSoundCloudApi(): Promise<SCApi> {
  const ready = (window as unknown as { SC?: SCApi }).SC;
  if (ready?.Widget) return Promise.resolve(ready);
  soundCloudApi ??= new Promise<SCApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://w.soundcloud.com/player/api.js';
    script.async = true;
    script.onload = () => {
      const sc = (window as unknown as { SC?: SCApi }).SC;
      if (sc?.Widget) resolve(sc);
      else reject(new Error('SoundCloud’s player didn’t load'));
    };
    script.onerror = () => {
      soundCloudApi = null;
      reject(new Error('SoundCloud’s player didn’t load'));
    };
    document.head.append(script);
  });
  return soundCloudApi;
}

/** SoundCloud's own player: the whole track, telling the lyrics where it is. */
export function SoundCloudPlayer({ url, clock }: { url: string; clock: SoundCloudClock }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [failed, setFailed] = useState(false);
  const src = `https://w.soundcloud.com/player/?${new URLSearchParams({ url, auto_play: 'false', visual: 'false', show_comments: 'false', show_reposts: 'false', color: '#b4587e' })}`;
  useEffect(() => {
    let alive = true;
    loadSoundCloudApi()
      .then((SC) => {
        if (!alive || !ref.current) return;
        const widget = SC.Widget(ref.current);
        widget.bind('ready', () => alive && clock.attach(widget));
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      clock.attach(null);
    };
  }, [src, clock]);
  return (
    <div>
      <iframe ref={ref} title="SoundCloud player" src={src} allow="autoplay; encrypted-media" className="h-[166px] w-full rounded-xl border-0" />
      {failed && <p className="mt-2 text-[13px] text-ink-soft">SoundCloud’s player didn’t answer: it plays, but the lyrics can’t follow it. Choose “Music playing anywhere” in the source menu and start them with the song.</p>}
    </div>
  );
}

/** Vimeo, Dailymotion or Bandcamp: their own player. It tells the page nothing, so a press in it starts or pauses the lyrics' timer, as Apple's does. */
export function LinkPlayer({ song, clock }: { song: Song; clock: TimerClock }) {
  const { frame, back } = useFramePress(clock);
  const [vimeo, hash] = (song.vimeoId ?? '').split('/');
  const src = vimeo
    ? `https://player.vimeo.com/video/${vimeo}?dnt=1${hash ? `&h=${hash}` : ''}`
    : song.dailymotionId
      ? `https://www.dailymotion.com/embed/video/${song.dailymotionId}`
      : song.bandcampUrl;
  if (!src) return null;
  const video = Boolean(song.vimeoId || song.dailymotionId);
  return (
    <div>
      <iframe ref={frame} title={`${song.title}, played by ${song.vimeoId ? 'Vimeo' : song.dailymotionId ? 'Dailymotion' : 'Bandcamp'}`} src={src} allow="autoplay; fullscreen; encrypted-media" className={cx('block w-full rounded-xl border-0', video ? 'aspect-video' : 'h-[120px]')} />
      <span ref={back} tabIndex={-1} className="sr-only" />
    </div>
  );
}
