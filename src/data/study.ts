// Study sessions: which cards to show (core/srs/queue), recording answers (core/srs/scheduler) with
// review logs, daily statistics and undo, and the bridge back to the reader: a card that matures
// marks its word Known.
import Dexie from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { buildQueue } from '@/core/srs/queue';
import { dayEnd, MATURE_DAYS, rate } from '@/core/srs/scheduler';
import type { Grade4 } from '@/core/srs/scheduler';
import { bumpDaily } from './activity';
import { db } from './db';
import type { LinguaDB } from './db';
import { getSettings } from './settings';
import type { Card, Deck, Note, ReviewLog, ReviewMode } from './types';
import { setWordState } from './words';

const DAY = 86_400_000;
const alive = <T extends { deletedAt?: number }>(row: T | undefined): row is T => Boolean(row && !row.deletedAt);

async function studyDecks(lang: string, deckId: string | null, database: LinguaDB): Promise<Deck[]> {
  if (deckId) {
    const deck = await database.decks.get(deckId);
    return alive(deck) ? [deck] : [];
  }
  return (await database.decks.where('lang').equals(lang).toArray()).filter(alive);
}

/** New cards introduced and reviews done today in a deck (scheduling answers only). */
async function doneToday(deckId: string, now: number, database: LinguaDB): Promise<{ introduced: number; reviewed: number }> {
  const start = dayEnd(now) - DAY;
  const logs = await database.reviewLogs.where('[deckId+reviewedAt]').between([deckId, start], [deckId, Dexie.maxKey]).toArray();
  let introduced = 0;
  let reviewed = 0;
  for (const log of logs) {
    if (!log.affectedSchedule) continue;
    if (log.stateBefore === 0) introduced++;
    else if (log.stateBefore === 2) reviewed++;
  }
  return { introduced, reviewed };
}

/** Cards that may be studied today in a deck, within its daily limits. */
async function dueCards(deck: Deck, now: number, database: LinguaDB): Promise<Card[]> {
  const { introduced, reviewed } = await doneToday(deck.id, now, database);
  const newLeft = Math.max(0, deck.config.newPerDay - introduced);
  const reviewsLeft = Math.max(0, deck.config.maxReviews - reviewed);
  const range = database.cards.where('[deckId+due]');
  const [scheduled, fresh] = await Promise.all([
    range.between([deck.id, Dexie.minKey], [deck.id, dayEnd(now)]).filter((c) => c.state !== 0 && !c.suspended && !c.deletedAt).toArray(),
    newLeft ? range.between([deck.id, Dexie.minKey], [deck.id, Dexie.maxKey]).filter((c) => c.state === 0 && !c.suspended && !c.deletedAt).limit(newLeft).toArray() : [],
  ]);
  const reviews = scheduled.filter((c) => c.state === 2).sort((a, b) => a.due - b.due).slice(0, reviewsLeft);
  return [...scheduled.filter((c) => c.state !== 2), ...reviews, ...fresh];
}

export interface StudySession {
  queue: Card[];
  notes: Map<string, Note>;
  decks: Map<string, Deck>;
}

/** Today's queue for one deck, or for every deck of the language (deckId null). */
export async function loadStudySession(lang: string, deckId: string | null, now = Date.now(), database: LinguaDB = db): Promise<StudySession> {
  const decks = await studyDecks(lang, deckId, database);
  const cards = (await Promise.all(decks.map((d) => dueCards(d, now, database)))).flat();
  const queue = buildQueue(cards, { newLeft: Infinity, reviewsLeft: Infinity }, now);
  const notes = await database.notes.bulkGet([...new Set(queue.map((c) => c.noteId))]);
  const noteMap = new Map(notes.filter(alive).map((n) => [n.id, n]));
  return { queue: queue.filter((c) => noteMap.has(c.noteId)), notes: noteMap, decks: new Map(decks.map((d) => [d.id, d])) };
}

/**
 * Cards for free practice (Ludus on a deck with nothing due, or "study more"): the least recently
 * reviewed first, never new cards beyond today's allowance.
 */
export async function loadPracticeCards(deckId: string, limit: number, database: LinguaDB = db): Promise<{ cards: Card[]; notes: Map<string, Note> }> {
  const cards = (await database.cards.where('[deckId+due]').between([deckId, Dexie.minKey], [deckId, Dexie.maxKey]).toArray())
    .filter((c) => c.state !== 0 && !c.suspended && !c.deletedAt)
    .sort((a, b) => (a.lastReview ?? 0) - (b.lastReview ?? 0))
    .slice(0, limit);
  const notes = await database.notes.bulkGet([...new Set(cards.map((c) => c.noteId))]);
  return { cards, notes: new Map(notes.filter(alive).map((n) => [n.id, n])) };
}

/** Everything needed to take an answer back. */
export interface AnswerUndo {
  before: Card;
  logId: string;
  lang: string;
  counted: { reviews: number; againCount: number; newCards: number };
}

export interface AnswerOptions {
  lang: string;
  mode: ReviewMode;
  durationMs: number;
  /** Ludus practice on a card that isn't due is logged but doesn't move the schedule. */
  affectSchedule?: boolean;
  now?: number;
}

/** Records an answer: reschedules the card (FSRS), logs it, counts it for today. */
export async function answerCard(card: Card, grade: Grade4, opts: AnswerOptions, database: LinguaDB = db): Promise<{ card: Card; undo: AnswerUndo }> {
  const now = opts.now ?? Date.now();
  const settings = await getSettings(database);
  const deck = await database.decks.get(card.deckId);
  const retention = deck?.config.desiredRetention ?? settings.study.desiredRetention;
  const schedule = opts.affectSchedule ?? true;

  const outcome = schedule ? rate(card, grade, now, retention) : null;
  const updated: Card = outcome ? { ...card, ...outcome.next, updatedAt: now } : card;
  const log: ReviewLog = {
    id: crypto.randomUUID(),
    cardId: card.id,
    deckId: card.deckId,
    reviewedAt: now,
    durationMs: Math.min(opts.durationMs, 120_000),
    rating: grade,
    mode: opts.mode,
    affectedSchedule: schedule ? 1 : 0,
    stateBefore: card.state,
    stabilityAfter: updated.stability,
    difficultyAfter: updated.difficulty,
    elapsedDays: outcome?.elapsedDays ?? 0,
    scheduledDays: updated.scheduledDays,
  };
  const counted = { reviews: 1, againCount: grade === 1 ? 1 : 0, newCards: schedule && card.state === 0 ? 1 : 0 };

  await database.transaction('rw', database.cards, database.reviewLogs, async () => {
    if (outcome) await database.cards.put(updated);
    await database.reviewLogs.add(log);
  });
  await bumpDaily(opts.lang, counted, database);

  // A card that has matured means the word is known: the reader stops highlighting it.
  if (outcome && settings.study.autoPromoteMature && updated.state === 2 && updated.scheduledDays >= MATURE_DAYS) {
    const note = await database.notes.get(card.noteId);
    const word = note?.wordId ? await database.words.get(note.wordId) : undefined;
    if (word && !word.deletedAt && word.state === 2) await setWordState(word.lang, word.norm, 1, {}, database);
  }
  return { card: updated, undo: { before: card, logId: log.id, lang: opts.lang, counted } };
}

export async function undoAnswer(undo: AnswerUndo, database: LinguaDB = db): Promise<void> {
  await database.transaction('rw', database.cards, database.reviewLogs, async () => {
    await database.cards.put({ ...undo.before, updatedAt: Date.now() });
    await database.reviewLogs.delete(undo.logId);
  });
  await bumpDaily(undo.lang, { reviews: -undo.counted.reviews, againCount: -undo.counted.againCount, newCards: -undo.counted.newCards }, database);
}

// ── Summaries for Home and the Thesaurus overview ───────────────────────────

export interface DueSummary {
  /** Reviews and learning steps waiting today. */
  due: number;
  /** New cards available today (within deck limits). */
  fresh: number;
  decks: number;
}

export async function dueSummary(lang: string, now = Date.now(), database: LinguaDB = db): Promise<DueSummary> {
  const decks = await studyDecks(lang, null, database);
  const lists = await Promise.all(decks.map((d) => dueCards(d, now, database)));
  let due = 0;
  let fresh = 0;
  for (const list of lists) for (const c of list) c.state === 0 ? fresh++ : due++;
  return { due, fresh, decks: decks.length };
}

export function useDueSummary(lang: string): DueSummary | undefined {
  return useLiveQuery(() => dueSummary(lang), [lang]);
}
