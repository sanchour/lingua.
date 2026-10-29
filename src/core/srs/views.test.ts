import { describe, expect, it } from 'vitest';
import type { Card } from '@/data/types';
import { describeStability, dueCounts, estimateMinutes, fadingCurve, isDifficult, isRusty, studyDayKey } from './views';
import { DAY, dayEnd } from './scheduler';

const NOW = new Date(2026, 9, 29, 12).getTime();
const TODAY_END = dayEnd(NOW);
const c = (patch: Partial<Card>): Card => ({ id: 'c', noteId: 'n', deckId: 'd', direction: 'recognition', due: NOW, stability: 20, difficulty: 5, elapsedDays: 1, scheduledDays: 20, learningSteps: 0, reps: 5, lapses: 0, state: 2, suspended: 0, lastReview: NOW - 10 * DAY, createdAt: 1, updatedAt: 1, ...patch }) as Card;

describe('the due calendar', () => {
  it('counts reviews by day, with what is overdue on today, and leaves out new and suspended cards', () => {
    const cards = [c({ due: NOW - 5 * DAY }), c({ due: NOW }), c({ due: TODAY_END + 1000 }), c({ due: TODAY_END + DAY + 1000 }), c({ due: TODAY_END + DAY + 2000 }), c({ due: TODAY_END + 3 * DAY, suspended: 1 }), c({ due: TODAY_END + 3 * DAY, state: 0 }), c({ due: TODAY_END + 90 * DAY })];
    const days = dueCounts(cards, NOW, 35);
    expect(days).toHaveLength(35);
    expect(days.slice(0, 4).map((d) => d.count)).toEqual([2, 1, 2, 0]);
    expect(days.reduce((n, d) => n + d.count, 0)).toBe(5);
    expect(days[0].day).toBe(studyDayKey(NOW));
    expect(new Set(days.map((d) => d.day)).size).toBe(35);
  });
});

describe('how long today takes', () => {
  it('uses how long the learner takes per card, kept sensible, and eight seconds when nobody knows', () => {
    expect(estimateMinutes(0)).toBe(0);
    expect(estimateMinutes(1)).toBe(1);
    expect(estimateMinutes(60)).toBe(8);
    expect(estimateMinutes(60, 15_000)).toBe(15);
    expect(estimateMinutes(60, 500)).toBe(2);
    expect(estimateMinutes(60, 999_999)).toBe(60);
  });
});

describe('how a memory lasts', () => {
  it('says its stability in plain words', () => {
    expect(describeStability(0)).toBe('not yet formed');
    expect(describeStability(0.4)).toBe('a few hours');
    expect(describeStability(1)).toBe('about 1 day');
    expect(describeStability(9)).toBe('about 9 days');
    expect(describeStability(21)).toBe('about 3 weeks');
    expect(describeStability(120)).toBe('about 4 months');
    expect(describeStability(800)).toBe('about 2.2 years');
  });

  it('fades along a curve that only goes down, from how likely it is now', () => {
    const curve = fadingCurve(c({ lastReview: NOW, due: NOW + 20 * DAY }), NOW, 60);
    expect(curve[0].day).toBe(0);
    expect(curve.at(-1)!.day).toBeGreaterThanOrEqual(58);
    for (let i = 1; i < curve.length; i++) expect(curve[i].r).toBeLessThanOrEqual(curve[i - 1].r);
    expect(curve[0].r).toBeGreaterThan(0.95);
    expect(fadingCurve(c({ state: 0 }), NOW)).toEqual([]);
  });
});

describe('difficult and rusty cards', () => {
  it('a card forgotten often, a leech, or barely remembered is difficult; a new one never is', () => {
    expect(isDifficult(c({ lapses: 3 }), 0.9)).toBe(true);
    expect(isDifficult(c({ leech: 1 }), 0.95)).toBe(true);
    expect(isDifficult(c({}), 0.6)).toBe(true);
    expect(isDifficult(c({}), 0.9)).toBe(false);
    expect(isDifficult(c({ lapses: 9, state: 0 }), null)).toBe(false);
  });

  it('a card left a long while is rusty', () => {
    expect(isRusty(c({ lastReview: NOW - 60 * DAY }), NOW)).toBe(true);
    expect(isRusty(c({ lastReview: NOW - 10 * DAY }), NOW)).toBe(false);
    expect(isRusty(c({ lastReview: NOW - 60 * DAY, state: 0 }), NOW)).toBe(false);
    expect(isRusty(c({ lastReview: undefined }), NOW)).toBe(false);
  });
});
