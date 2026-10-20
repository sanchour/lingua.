// Where a song's playhead comes from: Spotify's embed, YouTube's, Apple Music's (a timer its Play
// button starts), Apple's 30-second preview, or the learner's own timer when the music plays
// somewhere else (a speaker, the Music app). All look the same to the lyric sheet. Positions are
// carried forward smoothly between the players' updates.
import type { PlayheadClock } from '@/features/sonus/player/KaraokeTranscript';
import type { SpotifyController } from '@/services/sonus/spotify';
import { YT_PLAYING } from '@/services/cantus/youtube';
import type { YTPlayer } from '@/services/cantus/youtube';

export type ClockKind = 'spotify' | 'youtube' | 'soundcloud' | 'link' | 'apple' | 'preview' | 'timer';

export interface SongClock extends PlayheadClock {
  kind: ClockKind;
  pause(): void;
  toggle(): void;
  isPlaying(): boolean;
  now(): number;
  onPlaying(fn: (playing: boolean) => void): () => void;
  /** Real time the music has been playing, for Ratio. */
  heardMs(): number;
  /** The song's length as its player tells it (0 until it does, and for timers and the preview). */
  durationMs(): number;
  onDuration(fn: (ms: number) => void): () => void;
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
  let duration = 0;
  // Asked for while the player isn't there yet (still loading, or being made again after the
  // room was left): handed to it once it is.
  let wantedMs: number | null = null;
  let wantedPlay = false;
  const times = new Set<(ms: number) => void>();
  const states = new Set<(playing: boolean) => void>();
  const durations = new Set<(ms: number) => void>();
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
  const setDuration = (ms: number) => {
    if (!(ms > 0) || Math.abs(ms - duration) < 500) return;
    duration = ms;
    for (const fn of durations) fn(ms);
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
    seek: (ms) => {
      const to = Math.max(0, ms);
      const c = controls();
      if (c) return c.seek(to);
      wantedMs = to;
      update(to, paused);
    },
    play: () => {
      if (!paused) return;
      const c = controls();
      if (c) c.play();
      else wantedPlay = true;
    },
    pause: () => {
      wantedPlay = false;
      if (!paused) controls()?.pause();
    },
    toggle: () => (paused && !wantedPlay ? clock.play() : clock.pause()),
    isPlaying: () => !paused,
    now,
    heardMs: () => heard + (paused ? 0 : performance.now() - at),
    durationMs: () => duration,
    onDuration(fn) {
      durations.add(fn);
      return () => durations.delete(fn);
    },
  };
  /** What was asked for while there was no player, cleared as the new player takes it. */
  const takeWanted = () => {
    const wanted = { ms: wantedMs, play: wantedPlay };
    wantedMs = null;
    wantedPlay = false;
    return wanted;
  };
  return { clock, update, now, isPaused: () => paused, setDuration, takeWanted, wantedMs: () => wantedMs };
}

export type TimerClock = SongClock & { nudge(ms: number): void };

/**
 * The learner's own timer: start it when the song starts wherever it plays, nudge it to match.
 * Apple Music's player tells the page nothing, so it runs on one too (`apple`).
 */
export function createTimerClock(kind: 'timer' | 'apple' | 'link' = 'timer'): TimerClock {
  const core = createCore(kind, () => controls);
  const controls: Controls = {
    play: () => core.update(core.now(), false),
    pause: () => core.update(core.now(), true),
    seek: (ms) => core.update(ms, core.isPaused()),
  };
  return { ...core.clock, nudge: (ms) => core.update(core.now() + ms, core.isPaused()) };
}

export type SpotifyClock = SongClock & {
  attach(c: SpotifyController | null): void;
  /** The embed has loaded: a Play asked for meanwhile starts it. */
  ready(): void;
  update(positionMs: number, paused: boolean, durationMs?: number): void;
};

/** Spotify's embed reports its position a few times a second (`playback_update`). */
export function createSpotifyClock(): SpotifyClock {
  let controller: SpotifyController | null = null;
  // A new embed seeks only once it plays: until then, the place to go to when it starts.
  let started = false;
  let from: number | null = null;
  let playWhenReady = false;
  const core = createCore('spotify', () =>
    controller
      ? {
          play: () => controller!.togglePlay(),
          pause: () => controller!.togglePlay(),
          seek: (ms) => {
            if (started) return controller!.seek(ms / 1000);
            from = ms;
            core.update(ms, core.isPaused());
          },
        }
      : null,
  );
  return {
    ...core.clock,
    attach(c) {
      controller = c;
      started = false;
      if (!c) return core.update(core.now(), true);
      const wanted = core.takeWanted();
      // A new embed (the room left and come back to, a new link) goes on where the song was.
      from = wanted.ms ?? (core.now() > 1000 ? core.now() : null);
      playWhenReady = wanted.play;
    },
    ready() {
      if (controller && playWhenReady) controller.togglePlay();
      playWhenReady = false;
    },
    update(positionMs, paused, durationMs) {
      if (durationMs) core.setDuration(durationMs);
      if (!started && !paused) {
        started = true;
        if (from !== null) {
          controller?.seek(from / 1000);
          positionMs = from;
        }
        from = null;
      }
      // Until it plays, the lyrics stay where the song was left, not at the embed's 0:00.
      core.update(!started && from !== null ? from : positionMs, paused);
    },
  };
}

export type YouTubeClock = SongClock & {
  attach(p: YTPlayer | null): void;
  /** Asks the player where it is now (on its state changes), not at the next poll. */
  refresh(): void;
  /** Where a new player should start (s), so a song left and come back to goes on from there. */
  startSeconds(): number;
};

/** YT.PlayerState: not started yet, and cued (loaded, waiting for Play). */
const YT_UNSTARTED = -1;
const YT_CUED = 5;

/** YouTube's player is asked where it is four times a second. */
export function createYouTubeClock(): YouTubeClock {
  let player: (YTPlayer & { getDuration?(): number }) | null = null;
  // Back in the tab (timers slow down in the background): ask at once, don't wait for the next poll.
  const onVisible = () => document.visibilityState === 'visible' && poll();
  let timer = 0;
  // Where the current player was made to start (ms).
  let madeAt = 0;
  // Just after a seek the player can still say the old place for a moment: not a jump back.
  let seekingTo: number | null = null;
  let seekAt = 0;
  const seekTo = (p: YTPlayer, ms: number) => {
    p.seekTo(ms / 1000, true);
    seekingTo = ms;
    seekAt = performance.now();
    core.update(ms, core.isPaused());
  };
  const core = createCore('youtube', () =>
    player
      ? {
          play: () => player!.playVideo(),
          pause: () => player!.pauseVideo(),
          seek: (ms) => seekTo(player!, ms),
        }
      : null,
  );
  const poll = () => {
    if (!player) return;
    try {
      const state = player.getPlayerState();
      const paused = state !== YT_PLAYING;
      core.setDuration((player.getDuration?.() ?? 0) * 1000);
      // Not started yet, the player says 0:00 even when it was given a place to start from.
      if (state === YT_UNSTARTED || state === YT_CUED) return core.update(core.now(), true);
      const ms = player.getCurrentTime() * 1000;
      if (seekingTo !== null) {
        if (Math.abs(ms - seekingTo) > 1500 && performance.now() - seekAt < 1500) return core.update(core.now(), paused);
        seekingTo = null;
      }
      core.update(ms, paused);
    } catch {
      /* the player is gone */
    }
  };
  return {
    ...core.clock,
    attach(p) {
      player = p;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      if (!p) return core.update(core.now(), true);
      document.addEventListener('visibilitychange', onVisible);
      const wanted = core.takeWanted();
      // The player was made at startSeconds(); a place asked for since then is sought.
      if (wanted.ms !== null && Math.abs(wanted.ms - madeAt) > 1500) seekTo(p, wanted.ms);
      if (wanted.play) p.playVideo();
      timer = window.setInterval(poll, 250);
    },
    refresh: poll,
    startSeconds() {
      const s = Math.floor((core.wantedMs() ?? (core.now() > 1000 ? core.now() : 0)) / 1000);
      madeAt = s * 1000;
      return s;
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
  const controls: Controls = {
    play: () => void audio?.play().catch(() => errors.forEach((fn) => fn())),
    pause: () => audio?.pause(),
    seek: (ms) => {
      const a = audio;
      if (!a) return;
      const to = (ms - start) / 1000;
      a.currentTime = Math.max(0, Math.min(Number.isFinite(a.duration) ? a.duration - 0.25 : 29.5, to));
      report();
    },
  };
  const core = createCore('preview', () => (audio ? controls : null));
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
      const wanted = core.takeWanted();
      if (wanted.ms !== null) controls.seek(wanted.ms);
      if (wanted.play) controls.play();
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

/** SoundCloud's Widget API, as much of it as the clock uses. */
export interface SCWidget {
  bind(event: string, fn: (e?: { currentPosition?: number }) => void): void;
  play(): void;
  pause(): void;
  seekTo(ms: number): void;
  getDuration(fn: (ms: number) => void): void;
  getPosition(fn: (ms: number) => void): void;
  isPaused(fn: (paused: boolean) => void): void;
}

export type SoundCloudClock = SongClock & { attach(widget: SCWidget | null): void };

/** SoundCloud's widget tells its place as it plays (and is asked twice a second besides). */
export function createSoundCloudClock(): SoundCloudClock {
  let widget: SCWidget | null = null;
  let timer = 0;
  const core = createCore('soundcloud', () =>
    widget
      ? {
          play: () => widget!.play(),
          pause: () => widget!.pause(),
          seek: (ms) => {
            pending = ms;
            widget!.seekTo(ms);
            core.update(ms, core.isPaused());
          },
        }
      : null,
  );
  // A place asked for that the widget hasn't reached yet (before its first play it ignores seeks):
  // held until it is, or until a few seconds into playing.
  let pending: number | null = null;
  const report = (ms: number, paused: boolean) => {
    if (pending !== null && Math.abs(ms - pending) > 1500) return core.update(pending, paused);
    pending = null;
    core.update(ms, paused);
  };
  const poll = () => widget?.getPosition((ms) => widget?.isPaused((paused) => report(ms, paused)));
  const onVisible = () => document.visibilityState === 'visible' && poll();
  return {
    ...core.clock,
    attach(w) {
      widget = w;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      if (!w) return core.update(core.now(), true);
      document.addEventListener('visibilitychange', onVisible);
      w.getDuration((ms) => core.setDuration(ms));
      w.bind('playProgress', (e) => e?.currentPosition !== undefined && report(e.currentPosition, false));
      w.bind('play', () => {
        const held = pending;
        if (held !== null) {
          w.seekTo(held);
          window.setTimeout(() => pending === held && (pending = null), 3000);
        }
        poll();
      });
      w.bind('pause', () => poll());
      w.bind('finish', () => core.update(core.now(), true));
      const wanted = core.takeWanted();
      if (wanted.ms !== null) {
        pending = wanted.ms;
        w.seekTo(wanted.ms);
      }
      if (wanted.play) w.play();
      timer = window.setInterval(poll, 500);
    },
  };
}
