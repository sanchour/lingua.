import type { PlayheadClock } from '@/features/sonus/player/KaraokeTranscript';

export type VideoClock = PlayheadClock & {
  attach: (video: HTMLVideoElement | null) => void;
  now: () => number;
  video: () => HTMLVideoElement | null;
};

/** A playhead for a <video>: every frame while playing, and on every seek or pause. */
export function createVideoClock(): VideoClock {
  let el: HTMLVideoElement | null = null;
  let frame = 0;
  const listeners = new Set<(ms: number) => void>();
  const now = () => (el ? el.currentTime * 1000 : 0);
  const emit = () => {
    const ms = now();
    for (const fn of listeners) fn(ms);
  };
  const loop = () => {
    emit();
    frame = el && !el.paused ? requestAnimationFrame(loop) : 0;
  };
  const onPlay = () => {
    if (!frame) frame = requestAnimationFrame(loop);
  };
  const events = ['play', 'playing'] as const;
  const still = ['pause', 'seeked', 'timeupdate', 'loadedmetadata'] as const;
  return {
    attach(video) {
      if (el) {
        for (const e of events) el.removeEventListener(e, onPlay);
        for (const e of still) el.removeEventListener(e, emit);
      }
      cancelAnimationFrame(frame);
      frame = 0;
      el = video;
      if (!el) return;
      for (const e of events) el.addEventListener(e, onPlay);
      for (const e of still) el.addEventListener(e, emit);
      if (!el.paused) onPlay();
    },
    now,
    video: () => el,
    onTime(fn) {
      listeners.add(fn);
      fn(now());
      return () => listeners.delete(fn);
    },
    seek(ms) {
      if (el) el.currentTime = Math.max(0, ms / 1000);
      emit();
    },
    play() {
      if (el?.paused) void el.play().catch(() => undefined);
    },
  };
}
