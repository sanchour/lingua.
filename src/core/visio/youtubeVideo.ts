// YouTubeVideo (5.2-4): YouTube's official embedded player behind the parts of a <video> that Visio uses, so the clock, the two
// lines, auto-pause, hover-to-pause, the line keys and the scrubber work for a YouTube video as for a file.
import { Emitter } from './videoLike';
import type { VideoLike } from './videoLike';

/** The few methods of YouTube's IFrame player that are used. */
export interface YouTubePlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlaybackRate(): number;
  setPlaybackRate(rate: number): void;
  destroy?(): void;
}

/** YouTube's `onStateChange` values. */
export const YT_STATE = { ended: 0, playing: 1, paused: 2, buffering: 3, cued: 5 } as const;

export class YouTubeVideo extends Emitter implements VideoLike {
  readonly readyState = 4;
  private state: number = YT_STATE.cued;
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(
    private readonly player: YouTubePlayer,
    private readonly tickMs = 250,
  ) {
    super();
  }

  get paused(): boolean {
    return this.state !== YT_STATE.playing && this.state !== YT_STATE.buffering;
  }
  get ended(): boolean {
    return this.state === YT_STATE.ended;
  }
  get duration(): number {
    const d = this.player.getDuration();
    return d > 0 ? d : NaN;
  }
  get currentTime(): number {
    return this.player.getCurrentTime() || 0;
  }
  set currentTime(seconds: number) {
    this.player.seekTo(Math.max(0, seconds), true);
    this.emit('seeked', 'timeupdate');
  }
  get playbackRate(): number {
    return this.player.getPlaybackRate() || 1;
  }
  set playbackRate(rate: number) {
    // YouTube offers a fixed set of speeds and uses the nearest.
    this.player.setPlaybackRate(rate);
    this.emit('ratechange');
  }

  async play(): Promise<void> {
    this.player.playVideo();
  }
  pause(): void {
    this.player.pauseVideo();
  }

  /** From the player's `onStateChange`. */
  handleState(state: number): void {
    const was = this.paused;
    this.state = state;
    if (this.paused === was && state !== YT_STATE.ended) return;
    if (!this.paused) {
      this.emit('play', 'playing');
      this.timer ??= setInterval(() => this.emit('timeupdate'), this.tickMs);
      return;
    }
    clearInterval(this.timer);
    this.timer = undefined;
    this.emit('timeupdate', 'pause');
    if (state === YT_STATE.ended) this.emit('ended');
  }

  /** From the player's `onPlaybackRateChange`. */
  handleRate(): void {
    this.emit('ratechange');
  }

  dispose(): void {
    clearInterval(this.timer);
    this.timer = undefined;
    this.player.destroy?.();
  }
}
