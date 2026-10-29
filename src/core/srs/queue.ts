// Which cards to study now, in which order. Pure: callers pass the cards and today's counts.
import type { Card } from '@/data/types';
import { DAY, dayEnd } from './scheduler';

/** Learning cards due within this window are shown now rather than making the learner wait. */
export const LEARN_AHEAD_MS = 20 * 60_000;
/** One new card after every few reviews keeps a session from front-loading the hard part. */
const NEW_SPACING = 4;

export interface QueueLimits {
  /** New cards still allowed today (per deck limit minus those already introduced). */
  newLeft: number;
  /** Reviews still allowed today. */
  reviewsLeft: number;
}

export interface StudyCounts {
  new: number;
  learning: number;
  review: number;
}

/**
 * Orders a study session: (re)learning steps that are due, then reviews due today with new cards
 * interleaved. Suspended cards never appear.
 */
export function buildQueue(cards: Card[], limits: QueueLimits, now: number): Card[] {
  const learning: Card[] = [];
  const reviews: Card[] = [];
  const fresh: Card[] = [];
  const end = dayEnd(now);
  for (const c of cards) {
    if (c.suspended || c.deletedAt) continue;
    if (c.state === 0) fresh.push(c);
    else if (c.state === 1 || c.state === 3) {
      if (c.due <= now + LEARN_AHEAD_MS) learning.push(c);
    } else if (c.due < end) reviews.push(c);
  }
  learning.sort((a, b) => a.due - b.due);
  // Most overdue first: they are the likeliest to be forgotten. Among those due the same day, the ones forgotten most often come first.
  reviews.sort((a, b) => Math.floor(a.due / DAY) - Math.floor(b.due / DAY) || b.lapses - a.lapses || a.due - b.due);
  // New cards in the order they were added (frequency decks are added most-common first).
  fresh.sort((a, b) => a.due - b.due || a.createdAt - b.createdAt);

  const due = reviews.slice(0, Math.max(0, limits.reviewsLeft));
  const added = fresh.slice(0, Math.max(0, limits.newLeft));
  const mixed: Card[] = [];
  let r = 0;
  let n = 0;
  while (r < due.length || n < added.length) {
    for (let k = 0; k < NEW_SPACING && r < due.length; k++) mixed.push(due[r++]);
    if (n < added.length) mixed.push(added[n++]);
  }
  return spreadSiblings([...learning, ...mixed]);
}

/**
 * Cards of one note (its two directions) never come close together: when one has just been shown, the next card from another note goes
 * first, as long as there is one. Order is otherwise kept.
 */
export function spreadSiblings(queue: Card[], gap = 3): Card[] {
  const left = [...queue];
  const out: Card[] = [];
  while (left.length) {
    const recent = new Set(out.slice(-gap + 1).map((c) => c.noteId));
    const at = left.findIndex((c) => !recent.has(c.noteId));
    out.push(...left.splice(at < 0 ? 0 : at, 1));
  }
  return out;
}

export function countQueue(queue: Card[]): StudyCounts {
  const counts: StudyCounts = { new: 0, learning: 0, review: 0 };
  for (const c of queue) {
    if (c.state === 0) counts.new++;
    else if (c.state === 2) counts.review++;
    else counts.learning++;
  }
  return counts;
}

/** Rough time per card, used to place learning steps in the session. */
const SECONDS_PER_CARD = 10;

/**
 * Where a card answered during the session goes next: back into the queue if it is due again
 * within the learn-ahead window (a learning step), about as many cards later as its step lasts
 * (1 minute ≈ 6 cards), and never sooner than a few cards so it doesn't repeat immediately.
 */
export function requeue(queue: Card[], card: Card, now: number, minGap = 3): Card[] {
  const rest = queue.filter((c) => c.id !== card.id);
  if (card.due > now + LEARN_AHEAD_MS) return rest;
  const byTime = Math.round((card.due - now) / 1000 / SECONDS_PER_CARD);
  const at = Math.min(rest.length, Math.max(minGap, byTime));
  return [...rest.slice(0, at), card, ...rest.slice(at)];
}
