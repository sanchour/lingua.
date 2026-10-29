import { createEmptyCard } from 'ts-fsrs';
import { describe, expect, it } from 'vitest';
import type { Card } from '@/data/types';
import { parseSteps, previewIntervals, rate } from './scheduler';

const NOW = new Date(2026, 9, 29, 12).getTime();
const fresh = (): Card => {
  const e = createEmptyCard(new Date(NOW));
  return { id: 'c', noteId: 'n', deckId: 'd', direction: 'recognition', due: NOW, stability: e.stability, difficulty: e.difficulty, elapsedDays: 0, scheduledDays: 0, learningSteps: 0, reps: 0, lapses: 0, state: 0, suspended: 0, createdAt: 1, updatedAt: 1 } as Card;
};
const MIN = 60_000;

describe('learning steps', () => {
  it('reads what the learner types, and nothing odd', () => {
    expect(parseSteps('1m 10m')).toEqual(['1m', '10m']);
    expect(parseSteps(' 5m, 1h ,1d ')).toEqual(['5m', '1h', '1d']);
    expect(parseSteps('')).toBeUndefined();
    expect(parseSteps(undefined)).toBeUndefined();
    // Each longer than the one before, at most four, only m, h and d.
    expect(parseSteps('10m 1m')).toBeUndefined();
    expect(parseSteps('1m 2m 3m 4m 5m')).toBeUndefined();
    expect(parseSteps('1x')).toBeUndefined();
    expect(parseSteps('0m')).toBeUndefined();
    expect(parseSteps('1h 30m')).toBeUndefined();
  });

  it('a deck’s own steps change when a new card comes back', () => {
    const asked = previewIntervals(fresh(), NOW, 0.9);
    const own = previewIntervals(fresh(), NOW, 0.9, ['5m', '1h']);
    expect(asked[1]).toBe(1 * MIN);
    expect(own[1]).toBe(5 * MIN);
    expect(own[3]).toBeGreaterThan(asked[3]);
    expect(rate(fresh(), 1, NOW, 0.9, ['5m', '1h']).next.due - NOW).toBe(5 * MIN);
    // No steps given is the default again.
    expect(rate(fresh(), 1, NOW, 0.9, undefined).next.due - NOW).toBe(1 * MIN);
  });
});
