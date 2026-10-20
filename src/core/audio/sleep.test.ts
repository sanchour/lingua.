import { describe, expect, it } from 'vitest';
import type { AudioChapter } from '@/data/types';
import { chapterAt, fadeVolume, SLEEP_FADE_MS, sleepAfterSeek, sleepDue, startSleep } from './sleep';

const chapters: AudioChapter[] = [
  { title: 'Intro', startMs: 0 },
  { title: 'Uno', startMs: 60_000 },
  { title: 'Dos', startMs: 300_000 },
];
const now = 1_000_000;

describe('sleep timer', () => {
  it('starts a timer in minutes, at a chapter’s end, or at the part’s end', () => {
    expect(startSleep({ minutes: 15 }, { now, positionMs: 0 })).toEqual({ mode: 'minutes', endsAt: now + 15 * 60_000 });
    expect(startSleep('chapter', { now, positionMs: 90_000, chapters })).toEqual({ mode: 'chapter', chapter: 1 });
    expect(startSleep('part', { now, positionMs: 90_000, chapters })).toEqual({ mode: 'part' });
  });

  it('treats “end of chapter” as the end of the part when the item has no chapters', () => {
    expect(startSleep('chapter', { now, positionMs: 90_000 })).toEqual({ mode: 'part' });
    expect(startSleep('chapter', { now, positionMs: 90_000, chapters: [] })).toEqual({ mode: 'part' });
  });

  it('stops a timer in minutes when its time comes, playing or not', () => {
    const sleep = startSleep({ minutes: 1 }, { now, positionMs: 0 });
    expect(sleepDue(sleep, { now: now + 59_999, positionMs: 0 })).toBe(false);
    expect(sleepDue(sleep, { now: now + 60_000, positionMs: 0 })).toBe(true);
    // A part ending early doesn't stop it: the next part plays on.
    expect(sleepDue(sleep, { now: now + 1000, positionMs: 0, ended: true })).toBe(false);
  });

  it('stops at the start of the next chapter, or at the end of the last one', () => {
    const sleep = startSleep('chapter', { now, positionMs: 90_000, chapters });
    expect(sleepDue(sleep, { now, positionMs: 299_999, chapters })).toBe(false);
    expect(sleepDue(sleep, { now, positionMs: 300_000, chapters })).toBe(true);
    const last = startSleep('chapter', { now, positionMs: 400_000, chapters });
    expect(sleepDue(last, { now, positionMs: 3_600_000, chapters })).toBe(false);
    expect(sleepDue(last, { now, positionMs: 3_600_000, chapters, ended: true })).toBe(true);
  });

  it('counts the time before the first chapter as a chapter of its own', () => {
    const late: AudioChapter[] = [{ title: 'Uno', startMs: 5000 }, { title: 'Dos', startMs: 60_000 }];
    const sleep = startSleep('chapter', { now, positionMs: 1000, chapters: late });
    expect(sleep).toEqual({ mode: 'chapter', chapter: -1 });
    expect(sleepDue(sleep, { now, positionMs: 4999, chapters: late })).toBe(false);
    expect(sleepDue(sleep, { now, positionMs: 5000, chapters: late })).toBe(true);
  });

  it('stops “end of part” only when the part ends', () => {
    const sleep = startSleep('part', { now, positionMs: 0 });
    expect(sleepDue(sleep, { now: now + 86_400_000, positionMs: 3_600_000, chapters })).toBe(false);
    expect(sleepDue(sleep, { now, positionMs: 3_600_000, chapters, ended: true })).toBe(true);
    expect(sleepDue(null, { now, positionMs: 0, ended: true })).toBe(false);
  });

  it('follows the playhead to the chapter it jumped to', () => {
    const sleep = startSleep('chapter', { now, positionMs: 90_000, chapters });
    expect(sleepAfterSeek(sleep, 100_000, chapters)).toBe(sleep);
    expect(sleepAfterSeek(sleep, 310_000, chapters)).toEqual({ mode: 'chapter', chapter: 2 });
    expect(sleepAfterSeek(sleep, 10_000, chapters)).toEqual({ mode: 'chapter', chapter: 0 });
    const minutes = startSleep({ minutes: 5 }, { now, positionMs: 0 });
    expect(sleepAfterSeek(minutes, 310_000, chapters)).toBe(minutes);
    expect(sleepAfterSeek(null, 310_000, chapters)).toBeNull();
  });

  it('fades out over the last seconds, evenly and down to silence', () => {
    const endsAt = now + 60_000;
    expect(fadeVolume(endsAt, now)).toBe(1);
    expect(fadeVolume(endsAt, endsAt - SLEEP_FADE_MS)).toBe(1);
    expect(fadeVolume(endsAt, endsAt - SLEEP_FADE_MS / 2)).toBeCloseTo(0.25);
    expect(fadeVolume(endsAt, endsAt)).toBe(0);
    expect(fadeVolume(endsAt, endsAt + 5000)).toBe(0);
    const levels = [7000, 5000, 3000, 1000].map((left) => fadeVolume(endsAt, endsAt - left));
    expect(levels).toEqual([...levels].sort((a, b) => b - a));
  });

  it('knows which chapter is playing', () => {
    expect(chapterAt(chapters, 0)).toBe(0);
    expect(chapterAt(chapters, 59_999)).toBe(0);
    expect(chapterAt(chapters, 60_000)).toBe(1);
    expect(chapterAt(chapters, 9_000_000)).toBe(2);
    expect(chapterAt(undefined, 60_000)).toBe(-1);
    expect(chapterAt([], 60_000)).toBe(-1);
  });
});
