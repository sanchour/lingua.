import { describe, expect, it } from 'vitest';
import type { Card } from '@/data/types';
import { buildQueue, spreadSiblings } from './queue';
import { DAY, dayEnd } from './scheduler';

const NOW = new Date(2026, 9, 29, 12).getTime();
const TODAY = dayEnd(NOW) - DAY;
const card = (id: string, noteId: string, patch: Partial<Card> = {}): Card =>
  ({ id, noteId, deckId: 'd', direction: 'recognition', due: TODAY + 1000, stability: 5, difficulty: 5, elapsedDays: 1, scheduledDays: 5, learningSteps: 0, reps: 3, lapses: 0, state: 2, suspended: 0, createdAt: 1, updatedAt: 1, ...patch }) as Card;

describe('what comes first', () => {
  it('puts the most overdue first, and among those due the same day the one forgotten most often', () => {
    const cards = [card('a', 'na', { due: TODAY + 100, lapses: 0 }), card('b', 'nb', { due: TODAY + 200, lapses: 6 }), card('old', 'nc', { due: TODAY - 3 * DAY, lapses: 0 }), card('c', 'nd', { due: TODAY + 300, lapses: 2 })];
    const order = buildQueue(cards, { newLeft: 0, reviewsLeft: 99 }, NOW).map((c) => c.id);
    expect(order).toEqual(['old', 'b', 'c', 'a']);
  });
});

describe('the two directions of a word', () => {
  it('do not come one after the other when there is another card to show between', () => {
    const queue = [card('a1', 'a'), card('a2', 'a'), card('b1', 'b'), card('c1', 'c'), card('b2', 'b')];
    const out = spreadSiblings(queue).map((c) => c.id);
    expect(out).toEqual(['a1', 'b1', 'c1', 'a2', 'b2']);
    // Never loses or doubles a card, and never changes the first.
    expect([...out].sort()).toEqual(['a1', 'a2', 'b1', 'b2', 'c1']);
  });

  it('keep their order when there is nothing else to put between them', () => {
    expect(spreadSiblings([card('a1', 'a'), card('a2', 'a')]).map((c) => c.id)).toEqual(['a1', 'a2']);
    expect(spreadSiblings([])).toEqual([]);
  });

  it('spread a whole deck of pairs so that none touch', () => {
    const queue = Array.from({ length: 20 }, (_, i) => [card(`x${i}`, `n${i}`), card(`y${i}`, `n${i}`)]).flat();
    const out = spreadSiblings(queue);
    for (let i = 1; i < out.length; i++) expect(out[i].noteId).not.toBe(out[i - 1].noteId);
  });
});
