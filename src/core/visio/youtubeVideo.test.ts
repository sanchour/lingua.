import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { YouTubeVideo, YT_STATE } from './youtubeVideo';
import type { YouTubePlayer } from './youtubeVideo';

function fake(): YouTubePlayer & { time: number; rate: number; calls: string[] } {
  const p = {
    time: 0,
    rate: 1,
    calls: [] as string[],
    playVideo: () => void p.calls.push('play'),
    pauseVideo: () => void p.calls.push('pause'),
    seekTo: (s: number) => {
      p.time = s;
      p.calls.push(`seek ${s}`);
    },
    getCurrentTime: () => p.time,
    getDuration: () => 120,
    getPlaybackRate: () => p.rate,
    setPlaybackRate: (r: number) => {
      p.rate = r;
    },
  };
  return p;
}

describe('YouTube as a video', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('is paused until YouTube says it plays, and tells listeners', () => {
    const player = fake();
    const v = new YouTubeVideo(player);
    const seen: string[] = [];
    for (const e of ['play', 'pause', 'timeupdate', 'ended']) v.addEventListener(e, () => seen.push(e));
    expect(v.paused).toBe(true);
    void v.play();
    expect(player.calls).toEqual(['play']);
    v.handleState(YT_STATE.playing);
    expect(v.paused).toBe(false);
    vi.advanceTimersByTime(520);
    v.handleState(YT_STATE.buffering);
    expect(v.paused).toBe(false);
    v.handleState(YT_STATE.paused);
    expect(v.paused).toBe(true);
    expect(seen).toEqual(['play', 'timeupdate', 'timeupdate', 'timeupdate', 'pause']);
    vi.advanceTimersByTime(1000);
    expect(seen).toHaveLength(5);
  });

  it('seeks, reads time and length, and sets the speed through the player', () => {
    const player = fake();
    const v = new YouTubeVideo(player);
    v.currentTime = 42;
    expect(player.calls).toEqual(['seek 42']);
    expect(v.currentTime).toBe(42);
    expect(v.duration).toBe(120);
    v.playbackRate = 1.5;
    expect(v.playbackRate).toBe(1.5);
  });

  it('ends once and stops the ticking', () => {
    const v = new YouTubeVideo(fake());
    const ended = vi.fn();
    v.addEventListener('ended', ended);
    v.handleState(YT_STATE.playing);
    v.handleState(YT_STATE.ended);
    expect(ended).toHaveBeenCalledTimes(1);
    expect(v.ended).toBe(true);
    expect(v.paused).toBe(true);
  });
});
