// What Visio uses of a <video> (5.2-4): time, play, pause, speed and events. A real <video> fits it, and so do the two stand-ins:
// TimerVideo here (a follow clock for a show watched in its own app) and YouTubeVideo (the official embed).

export interface VideoLike {
  readonly paused: boolean;
  readonly ended: boolean;
  /** Seconds; NaN until known. */
  readonly duration: number;
  readonly readyState: number;
  /** Seconds. */
  currentTime: number;
  playbackRate: number;
  play(): Promise<void>;
  pause(): void;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
  /** Only a real <video> has text tracks. */
  readonly textTracks?: Iterable<{ mode: string; language: string }>;
}

/** The small event hub the stand-ins share. */
export class Emitter {
  private readonly listeners = new Map<string, Set<() => void>>();
  addEventListener(type: string, listener: () => void): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
  }
  removeEventListener(type: string, listener: () => void): void {
    this.listeners.get(type)?.delete(listener);
  }
  protected emit(...types: string[]): void {
    for (const type of types) for (const fn of [...(this.listeners.get(type) ?? [])]) fn();
  }
}

export interface TimerOptions {
  durationMs: number;
  /** Milliseconds, steadily rising: `performance.now` unless a test supplies its own. */
  now?: () => number;
  /** How often "timeupdate" fires while playing. */
  tickMs?: number;
}

/**
 * A follow clock (TimerVideo): the same stand-in on a timer, for a subtitles-only item. Play when the show plays in its own app,
 * pause when it pauses, and nudge the time by half a second until the lines match.
 */
export class TimerVideo extends Emitter implements VideoLike {
  readonly readyState = 4;
  readonly duration: number;
  private readonly now: () => number;
  private readonly tickMs: number;
  private position = 0;
  private startedAt = 0;
  private rate = 1;
  private playing = false;
  private ended_ = false;
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor({ durationMs, now = () => performance.now(), tickMs = 250 }: TimerOptions) {
    super();
    this.duration = durationMs / 1000;
    this.now = now;
    this.tickMs = tickMs;
  }

  get paused(): boolean {
    return !this.playing;
  }
  get ended(): boolean {
    return this.ended_;
  }

  get currentTime(): number {
    const ms = this.playing ? this.position + (this.now() - this.startedAt) * this.rate : this.position;
    return Math.min(this.duration, Math.max(0, ms / 1000));
  }
  set currentTime(seconds: number) {
    this.position = Math.min(this.duration, Math.max(0, seconds)) * 1000;
    this.startedAt = this.now();
    this.ended_ = false;
    this.emit('seeked', 'timeupdate');
  }

  get playbackRate(): number {
    return this.rate;
  }
  set playbackRate(rate: number) {
    this.rebase();
    this.rate = rate;
    this.emit('ratechange');
  }

  async play(): Promise<void> {
    if (this.playing) return;
    if (this.ended_ || this.currentTime >= this.duration) this.position = 0;
    this.ended_ = false;
    this.playing = true;
    this.startedAt = this.now();
    this.timer = setInterval(() => this.tick(), this.tickMs);
    this.emit('play', 'playing');
  }

  pause(): void {
    if (!this.playing) return;
    this.rebase();
    this.playing = false;
    clearInterval(this.timer);
    this.emit('pause');
  }

  /** Stops the timer for good (when the page closes). */
  dispose(): void {
    this.playing = false;
    clearInterval(this.timer);
  }

  private rebase(): void {
    if (!this.playing) return;
    this.position = this.currentTime * 1000;
    this.startedAt = this.now();
  }

  private tick(): void {
    if (this.currentTime >= this.duration) {
      this.rebase();
      this.playing = false;
      this.ended_ = true;
      clearInterval(this.timer);
      this.emit('timeupdate', 'pause', 'ended');
      return;
    }
    this.emit('timeupdate');
  }
}
