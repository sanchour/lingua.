import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TimerVideo } from './videoLike';

describe('the follow clock', () => {
  let t = 0;
  const make = () => new TimerVideo({ durationMs: 10_000, now: () => t });
  beforeEach(() => {
    t = 0;
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('stands still until played, then runs at the speed set', async () => {
    const v = make();
    expect(v.paused).toBe(true);
    t = 5000;
    expect(v.currentTime).toBe(0);
    await v.play();
    t = 7000;
    expect(v.currentTime).toBe(2);
    v.playbackRate = 2;
    t = 8000;
    expect(v.currentTime).toBe(4);
    v.pause();
    t = 9000;
    expect(v.currentTime).toBe(4);
    expect(v.paused).toBe(true);
  });

  it('can be nudged and seeked, and tells listeners', async () => {
    const v = make();
    const seen: string[] = [];
    for (const e of ['play', 'pause', 'seeked', 'timeupdate', 'ended']) v.addEventListener(e, () => seen.push(e));
    v.currentTime = 3;
    expect(v.currentTime).toBe(3);
    await v.play();
    t = 500;
    v.currentTime = v.currentTime - 0.5;
    expect(v.currentTime).toBeCloseTo(3, 5);
    v.pause();
    expect(seen).toEqual(['seeked', 'timeupdate', 'play', 'seeked', 'timeupdate', 'pause']);
  });

  it('keeps within the length and ends there', async () => {
    const v = make();
    const ended = vi.fn();
    v.addEventListener('ended', ended);
    v.currentTime = -4;
    expect(v.currentTime).toBe(0);
    v.currentTime = 99;
    expect(v.currentTime).toBe(10);
    v.currentTime = 9;
    await v.play();
    t = 5000;
    vi.advanceTimersByTime(300);
    expect(ended).toHaveBeenCalledTimes(1);
    expect(v.paused).toBe(true);
    expect(v.ended).toBe(true);
    expect(v.currentTime).toBe(10);
  });
});
