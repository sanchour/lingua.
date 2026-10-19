// Where a song's playhead comes from: Spotify's embed, YouTube's, Apple Music's (a timer its Play
// button starts), Apple's 30-second preview, or the learner's own timer when the music plays
// somewhere else (a speaker, the Music app). All look the same to the lyric sheet. Positions are
// carried forward smoothly between the players' updates.
import type { PlayheadClock } from '@/features/sonus/player/KaraokeTranscript';
import type { SpotifyController } from '@/services/sonus/spotify';
import { YT_PLAYING } from '@/services/cantus/youtube';
import type { YTPlayer } from '@/services/cantus/youtube';

export type ClockKind = 'spotify' | 'youtube' | 'apple' | 'preview' | 'timer';

export interface SongClock extends PlayheadClock {
  kind: ClockKind;
  pause(): void;
  toggle(): void;
  isPlaying(): boolean;
  now(): number;
  onPlaying(fn: (playing: boolean) => void): () => void;
  /** Real time the music has been playing, for Ratio. */
  heardMs(): number;
}

interface Controls {
  play(): void;
  pause(): void;
  seek(ms: number): void;
}

function createCore(kind: ClockKind, controls: () => Controls | null) {
  let position = 0;
  let at = performance.now();
  let paused = true;
  let frame = 0;
  let heard = 0;
  const times = new Set<(ms: number) => void>();
  const states = new Set<(playing: boolean) => void>();
  const now = () => (paused ? position : position + (performance.now() - at));
  const loop = () => {
    const t = now();
    for (const fn of times) fn(t);
    frame = paused ? 0 : requestAnimationFrame(loop);
  };
  const update = (ms: number, isPaused: boolean) => {
    const t = performance.now();
    if (!paused) heard += t - at;
    const changed = paused !== isPaused;
    position = Math.max(0, ms);
    at = t;
    paused = isPaused;
    if (changed) for (const fn of states) fn(!paused);
    if (!paused && !frame) frame = requestAnimationFrame(loop);
    if (paused) for (const fn of times) fn(position);
  };
  const clock: SongClock = {
    kind,
    onTime(fn) {
      times.add(fn);
      fn(now());
      return () => times.delete(fn);
    },
    onPlaying(fn) {
      states.add(fn);
      return () => states.delete(fn);
    },
    seek: (ms) => controls()?.seek(Math.max(0, ms)),
    play: () => {
      if (paused) controls()?.play();
    },
    pause: () => {
      if (!paused) controls()?.pause();
    },
    toggle: () => (paused ? controls()?.play() : controls()?.pause()),
    isPlaying: () => !paused,
    now,
    heardMs: () => heard + (paused ? 0 : performance.now() - at),
  };
  return { clock, update, now, isPaused: () => paused };
}

export type TimerClock = SongClock & { nudge(ms: number): void };

/**
 * The learner's own timer: start it when the song starts wherever it plays, nudge it to match.
 * Apple Music's player tells the page nothing, so it runs on one too (`apple`).
 */
export function createTimerClock(kind: 'timer' | 'apple' = 'timer'): TimerClock {
  const core = createCore(kind, () => controls);
  const controls: Controls = {
    play: () => core.update(core.now(), false),
    pause: () => core.update(core.now(), true),
    seek: (ms) => core.update(ms, core.isPaused()),
  };
  return { ...core.clock, nudge: (ms) => core.update(core.now() + ms, core.isPaused()) };
}

/** Spotify's embed reports its position a few times a second (`playback_update`). */
export function createSpotifyClock(): SongClock & { attach(c: SpotifyController | null): void; update(positionMs: number, paused: boolean): void } {
  let controller: SpotifyController | null = null;
  const core = createCore('spotify', () =>
    controller
      ? {
          play: () => controller!.togglePlay(),
          pause: () => controller!.togglePlay(),
          seek: (ms) => controller!.seek(ms / 1000),
        }
      : null,
  );
  return { ...core.clock, attach: (c) => (controller = c), update: core.update };
}

/** YouTube's player is asked where it is four times a second. */
export function createYouTubeClock(): SongClock & { attach(p: YTPlayer | null): void } {
  let player: YTPlayer | null = null;
  let timer = 0;
  const core = createCore('youtube', () =>
    player
      ? {
          play: () => player!.playVideo(),
          pause: () => player!.pauseVideo(),
          seek: (ms) => {
            player!.seekTo(ms / 1000, true);
            core.update(ms, core.isPaused());
          },
        }
      : null,
  );
  const poll = () => {
    if (!player) return;
    try {
      core.update(player.getCurrentTime() * 1000, player.getPlayerState() !== YT_PLAYING);
    } catch {
      /* the player is gone */
    }
  };
  return {
    ...core.clock,
    attach(p) {
      player = p;
      window.clearInterval(timer);
      if (p) timer = window.setInterval(poll, 250);
      else core.update(core.now(), true);
    },
  };
}

export type PreviewClock = SongClock & {
  /** Where in the song the preview starts (ms); the lyrics follow from there. */
  setStart(ms: number): void;
  /** The preview's own position (ms from its start). */
  previewMs(): number;
  onError(fn: () => void): () => void;
  load(url: string): void;
  release(): void;
};

/**
 * Apple's 30-second preview, played on the page itself: it always plays, for everyone. It is a
 * piece from somewhere in the song, so the song's time is where it starts plus how far it has got.
 */
export function createPreviewClock(): PreviewClock {
  let audio: HTMLAudioElement | null = null;
  let start = 0;
  const errors = new Set<() => void>();
  const report = () => audio && core.update(start + audio.currentTime * 1000, audio.paused || audio.ended);
  const core = createCore('preview', () =>
    audio
      ? {
          play: () => void audio!.play().catch(() => errors.forEach((fn) => fn())),
          pause: () => audio!.pause(),
          seek: (ms) => {
            const a = audio!;
            const to = (ms - start) / 1000;
            a.currentTime = Math.max(0, Math.min(Number.isFinite(a.duration) ? a.duration - 0.25 : 29.5, to));
            report();
          },
        }
      : null,
  );
  const EVENTS = ['play', 'playing', 'pause', 'ended', 'seeked', 'timeupdate', 'waiting'] as const;
  const fail = () => errors.forEach((fn) => fn());
  const release = () => {
    if (!audio) return;
    audio.pause();
    for (const e of EVENTS) audio.removeEventListener(e, report);
    audio.removeEventListener('error', fail);
    audio.removeAttribute('src');
    audio.load();
    audio = null;
    core.update(core.now(), true);
  };
  return {
    ...core.clock,
    setStart(ms) {
      start = ms;
      report();
    },
    previewMs: () => (audio ? audio.currentTime * 1000 : 0),
    onError(fn) {
      errors.add(fn);
      return () => errors.delete(fn);
    },
    load(url) {
      if (audio?.src === url) return;
      release();
      audio = new Audio();
      audio.preload = 'auto';
      for (const e of EVENTS) audio.addEventListener(e, report);
      audio.addEventListener('error', fail);
      audio.src = url;
    },
    release,
  };
}

/** The clock as the lyrics see it: moved by the song's timing nudge (positive = lyrics later). */
export function shifted(clock: SongClock, offset: () => number): PlayheadClock {
  return {
    onTime: (fn) => clock.onTime((ms) => fn(ms - offset())),
    seek: (ms) => clock.seek(ms + offset()),
    play: () => clock.play(),
  };
}
