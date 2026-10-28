import { describe, expect, it } from 'vitest';
import type { ActivitySession, Media, TypingRow } from '@/data/types';
import { kindOfMedia, listeningByKind, lookupsPer1000, typingSummary } from './kinds';

const media = (o: Partial<Media>): Media => ({ id: 'm', lang: 'fr', kind: 'audio', title: 't', createdAt: 0, updatedAt: 0, ...o }) as Media;
const session = (o: Partial<ActivitySession>): ActivitySession => ({ id: 's', lang: 'fr', type: 'listen', startedAt: 0, endedAt: 0, activeMs: 60_000, ...o });

describe('listening by kind', () => {
  it('sorts media into kinds', () => {
    expect(kindOfMedia(media({ kind: 'video' }))).toBe('video');
    expect(kindOfMedia(media({ bookKind: 'audiobook' }))).toBe('audiobooks');
    expect(kindOfMedia(media({ bookKind: 'course' }))).toBe('courses');
    expect(kindOfMedia(media({ feedId: 'f' }))).toBe('podcasts');
    expect(kindOfMedia(media({}))).toBe('other');
    expect(kindOfMedia(undefined)).toBe('other');
  });
  it('adds up minutes per kind and leaves empty kinds out', () => {
    const map = new Map([['a', media({ id: 'a', bookKind: 'audiobook' })], ['p', media({ id: 'p', feedId: 'f' })]]);
    const out = listeningByKind([session({ refId: 'a' }), session({ refId: 'a', activeMs: 120_000 }), session({ refId: 'p' }), session({ type: 'sing', refId: 's1' }), session({ type: 'watch', refId: 'v' }), session({ type: 'read' })], map);
    expect(out).toEqual([
      { kind: 'songs', minutes: 1 },
      { kind: 'podcasts', minutes: 1 },
      { kind: 'audiobooks', minutes: 3 },
      { kind: 'video', minutes: 1 },
    ]);
  });
});

describe('lookups per 1,000 words', () => {
  it('waits for enough reading', () => {
    expect(lookupsPer1000(10, 100)).toBeNull();
    expect(lookupsPer1000(12, 2000)).toBe(6);
  });
});

describe('typing summary', () => {
  const row = (stats: TypingRow['stats']): TypingRow => ({ id: 'fr', lang: 'fr', unlocked: 12, stats, target: 30, ownLayout: false, createdAt: 0, updatedAt: 0 });
  it('is null before any practice', () => {
    expect(typingSummary(undefined)).toBeNull();
    expect(typingSummary(row({}))).toBeNull();
  });
  it('gives the slowest and the average letter speed and the accuracy', () => {
    // 12_000 / ms = wpm: 400 ms a key is 30 wpm, 200 ms is 60.
    const s = typingSummary(row({ a: { hits: 18, misses: 2, ms: 400, acc: 0.9 }, b: { hits: 20, misses: 0, ms: 200, acc: 1 } }))!;
    expect(s.wpm).toBe(30);
    expect(s.averageWpm).toBe(45);
    expect(s.accuracy).toBeCloseTo(38 / 40);
    expect(s.unlocked).toBe(12);
  });
});
