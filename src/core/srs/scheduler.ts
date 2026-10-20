// Spaced repetition on top of ts-fsrs. Our Card rows store the FSRS fields camelCased with epoch-ms
// dates; this module converts both ways and adds the small pieces the UI needs (interval labels,
// maturity). Pure: no database, no DOM.
import { fsrs, Rating, State } from 'ts-fsrs';
import type { Card as FsrsCard, FSRS, Grade } from 'ts-fsrs';
import type { Card } from '@/data/types';

export type Grade4 = 1 | 2 | 3 | 4;
export const GRADES: Grade4[] = [1, 2, 3, 4];
export const GRADE_NAMES: Record<Grade4, string> = { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' };

/** A card counts as mature (and its word as Known) once its interval reaches three weeks. */
export const MATURE_DAYS = 21;
const DAY = 86_400_000;

const schedulers = new Map<number, FSRS>();
function scheduler(retention: number): FSRS {
  const key = Math.round(retention * 100) / 100;
  let f = schedulers.get(key);
  if (!f) {
    f = fsrs({ request_retention: key, enable_fuzz: true, enable_short_term: true, maximum_interval: 36500 });
    schedulers.set(key, f);
  }
  return f;
}

/** The scheduling fields of a card, or of any row scheduled like one (a grammar item). */
export type Schedulable = Pick<Card, 'due' | 'stability' | 'difficulty' | 'elapsedDays' | 'scheduledDays' | 'learningSteps' | 'reps' | 'lapses' | 'state' | 'lastReview'>;

export function toFsrs(card: Schedulable): FsrsCard {
  return {
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsedDays,
    scheduled_days: card.scheduledDays,
    learning_steps: card.learningSteps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as State,
    last_review: card.lastReview ? new Date(card.lastReview) : undefined,
  };
}

type Scheduled = Schedulable;

function fromFsrs(c: FsrsCard): Scheduled {
  return {
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsedDays: c.elapsed_days,
    scheduledDays: c.scheduled_days,
    learningSteps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state as Card['state'],
    lastReview: c.last_review?.getTime(),
  };
}

export interface ReviewOutcome {
  /** The card's new scheduling fields. */
  next: Scheduled;
  elapsedDays: number;
}

/** Schedules a card after an answer. */
export function rate(card: Schedulable, grade: Grade4, now: number, retention = 0.9): ReviewOutcome {
  const { card: next, log } = scheduler(retention).next(toFsrs(card), new Date(now), grade as Grade);
  return { next: fromFsrs(next), elapsedDays: log.elapsed_days };
}

/** When each answer would bring the card back, in ms from now. */
export function previewIntervals(card: Schedulable, now: number, retention = 0.9): Record<Grade4, number> {
  const preview = scheduler(retention).repeat(toFsrs(card), new Date(now));
  const out = {} as Record<Grade4, number>;
  for (const g of GRADES) out[g] = Math.max(0, preview[g as Grade].card.due.getTime() - now);
  return out;
}

/** "<1m", "10m", "3h", "4d", "2mo", "1.5y" */
export function formatInterval(ms: number): string {
  const min = ms / 60_000;
  if (min < 1) return '<1m';
  if (min < 60) return `${Math.round(min)}m`;
  const h = min / 60;
  if (h < 24) return `${Math.round(h)}h`;
  const d = h / 24;
  if (d < 30) return `${Math.round(d)}d`;
  const mo = d / 30.44;
  if (mo < 12) return `${Math.round(mo)}mo`;
  const y = d / 365.25;
  return `${y < 10 ? y.toFixed(1).replace(/\.0$/, '') : Math.round(y)}y`;
}

export type Maturity = 'new' | 'learning' | 'young' | 'mature';

export function maturityOf(card: Pick<Card, 'state' | 'scheduledDays'>): Maturity {
  if (card.state === State.New) return 'new';
  if (card.state === State.Learning || card.state === State.Relearning) return 'learning';
  return card.scheduledDays >= MATURE_DAYS ? 'mature' : 'young';
}

/** Probability of recalling the card right now (0–1), or null for new cards. */
export function retrievability(card: Schedulable, now: number, retention = 0.9): number | null {
  if (card.state === State.New) return null;
  return scheduler(retention).get_retrievability(toFsrs(card), new Date(now), false);
}

/** The start of the learner's next day (4 am local), Anki's day boundary. Reviews due before it count as today's. */
export function dayEnd(now: number): number {
  const d = new Date(now);
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 4);
  if (end.getTime() <= now) end.setDate(end.getDate() + 1);
  return end.getTime();
}

export const isDueToday = (card: Pick<Card, 'state' | 'due' | 'suspended'>, now: number) =>
  !card.suspended && card.state !== State.New && card.due < dayEnd(now);

export { Rating, State, DAY };
