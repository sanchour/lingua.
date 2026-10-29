// Study sessions: which cards to show (core/srs/queue), recording answers (core/srs/scheduler) with
// review logs, daily statistics and undo, and the bridge back to the reader: a card that matures
// marks its word Known.
import Dexie from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { buriedUntilTomorrow, catchUpPlan, isBuried, isLeech } from '@/core/srs/memory';
import { normalizeWord } from '@/core/text/normalize';
import { buildQueue } from '@/core/srs/queue';
import { dayEnd, MATURE_DAYS, rate } from '@/core/srs/scheduler';
import type { Grade4 } from '@/core/srs/scheduler';
import { bumpDaily } from './activity';
import { db } from './db';
import type { LinguaDB } from './db';
import { forgetEvidenceRow, recordEvidence } from './learner';
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
  // An archived deck is out of the way: it is studied only when asked for by name.
  return (await database.decks.where('lang').equals(lang).toArray()).filter((d) => alive(d) && !d.archived);
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
    range.between([deck.id, Dexie.minKey], [deck.id, dayEnd(now)]).filter((c) => c.state !== 0 && !c.suspended && !c.deletedAt && !isBuried(c, now)).toArray(),
    newLeft ? range.between([deck.id, Dexie.minKey], [deck.id, Dexie.maxKey]).filter((c) => c.state === 0 && !c.suspended && !c.deletedAt && !isBuried(c, now)).limit(newLeft).toArray() : [],
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
  /** The learner's-record row this answer made (6-5), taken back with it. */
  evidenceId?: string;
}

export interface AnswerOptions {
  lang: string;
  mode: ReviewMode;
  durationMs: number;
  /** Ludus practice on a card that isn't due is logged but doesn't move the schedule. */
  affectSchedule?: boolean;
  now?: number;
  /** A hint was used: the answer is logged as assisted (6-3, read by 6-5). */
  hinted?: boolean;
  /** "I guessed" after a right answer: it counts as Hard, and the guess is logged (6-3). */
  guessed?: boolean;
  /** Where it was reviewed: a text, a song, a deck's own session. */
  contextId?: string;
}

/** Records an answer: reschedules the card (FSRS), logs it, counts it for today. */
export async function answerCard(card: Card, answered: Grade4, opts: AnswerOptions, database: LinguaDB = db): Promise<{ card: Card; undo: AnswerUndo; leech: boolean }> {
  const now = opts.now ?? Date.now();
  // A right answer that was a guess is not known: it counts as Hard.
  const grade: Grade4 = opts.guessed && answered > 2 ? 2 : answered;
  const settings = await getSettings(database);
  const deck = await database.decks.get(card.deckId);
  const retention = deck?.config.desiredRetention ?? settings.study.desiredRetention;
  const schedule = opts.affectSchedule ?? true;

  const outcome = schedule ? rate(card, grade, now, retention, deck?.config.learningSteps) : null;
  const updated: Card = outcome ? { ...card, ...outcome.next, updatedAt: now } : card;
  // Forgotten once too often: marked, so the learner can be offered another way in (a picture, their own sentence, a rest).
  const becameLeech = Boolean(outcome && grade === 1 && !card.leech && isLeech(updated));
  if (becameLeech) updated.leech = 1;
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
    ...(opts.hinted ? { hinted: 1 as const } : {}),
    ...(opts.guessed ? { guessed: 1 as const } : {}),
    ...(opts.contextId ? { contextId: opts.contextId } : {}),
  };
  const counted = { reviews: 1, againCount: grade === 1 ? 1 : 0, newCards: schedule && card.state === 0 ? 1 : 0 };

  await database.transaction('rw', database.cards, database.reviewLogs, async () => {
    if (outcome) await database.cards.put(updated);
    await database.reviewLogs.add(log);
  });
  await bumpDaily(opts.lang, counted, database);

  // What the learner did, for their record (6-5): a right answer with a hint or a guess counts as assisted.
  const note = await database.notes.get(card.noteId);
  const evidence = await recordEvidence(
    {
      lang: opts.lang,
      at: now,
      skill: opts.mode === 'listen' ? 'listening' : opts.mode === 'speak' ? 'pronunciation' : 'vocabulary',
      room: opts.mode === 'classic' ? 'thesaurus' : 'ludus',
      item: { type: 'word', wordId: note?.wordId ?? `${opts.lang}:${note ? normalizeWord(note.term, opts.lang) : card.noteId}` },
      outcome: grade === 1 ? 'wrong' : 'right',
      assisted: Boolean(opts.hinted || opts.guessed),
      // A word misheard or mispronounced is a different mistake from one not known.
      ...(grade === 1 && (opts.mode === 'listen' || opts.mode === 'speak') ? { category: opts.mode === 'listen' ? ('mishearing' as const) : ('pronunciation' as const) } : {}),
      kind: opts.mode,
      contextId: opts.contextId ?? card.deckId,
    },
    database,
  ).catch(() => undefined);

  // A card that has matured means the word is known: the reader stops highlighting it.
  if (outcome && settings.study.autoPromoteMature && updated.state === 2 && updated.scheduledDays >= MATURE_DAYS) {
    const word = note?.wordId ? await database.words.get(note.wordId) : undefined;
    if (word && !word.deletedAt && word.state === 2) await setWordState(word.lang, word.norm, 1, {}, database);
  }
  // The other direction of the same word waits until tomorrow, where the deck asks for it.
  if (outcome && deck?.config.burySiblings) await buryNote(card.noteId, now, database, card.id);
  return { card: updated, undo: { before: card, logId: log.id, lang: opts.lang, counted, evidenceId: evidence?.id }, leech: becameLeech };
}

/** Puts a note's cards away until tomorrow's first lesson (all of them, or all but `except`). */
export async function buryNote(noteId: string, now = Date.now(), database: LinguaDB = db, except?: string): Promise<number> {
  return database.cards.where('noteId').equals(noteId).filter((c) => c.id !== except && !c.deletedAt).modify({ buriedUntil: buriedUntilTomorrow(now), updatedAt: now });
}

export async function unburyNote(noteId: string, database: LinguaDB = db): Promise<void> {
  await database.cards.where('noteId').equals(noteId).modify({ buriedUntil: undefined, updatedAt: Date.now() });
}

/** Cards that have been waiting since before today, across the language's decks. */
export async function overdueCards(lang: string, now = Date.now(), database: LinguaDB = db): Promise<Card[]> {
  const decks = await studyDecks(lang, null, database);
  const start = dayEnd(now) - DAY;
  const lists = await Promise.all(decks.map((d) => database.cards.where('[deckId+due]').between([d.id, Dexie.minKey], [d.id, start]).filter((c) => c.state !== 0 && !c.suspended && !c.deletedAt).toArray()));
  return lists.flat();
}

/** Spreads the overdue cards over some days (core/srs/memory.ts `catchUpPlan`), most overdue first; returns how many moved. */
export async function catchUp(lang: string, days: number, now = Date.now(), database: LinguaDB = db): Promise<number> {
  const cards = await overdueCards(lang, now, database);
  const plan = catchUpPlan(cards, days, now);
  await database.transaction('rw', database.cards, async () => {
    for (const [id, due] of plan) await database.cards.update(id, { due, updatedAt: now });
  });
  return plan.size;
}

export async function undoAnswer(undo: AnswerUndo, database: LinguaDB = db): Promise<void> {
  await database.transaction('rw', database.cards, database.reviewLogs, async () => {
    await database.cards.put({ ...undo.before, updatedAt: Date.now() });
    await database.reviewLogs.delete(undo.logId);
  });
  if (undo.evidenceId) await forgetEvidenceRow(undo.evidenceId, database);
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

/** The words of cards due for review today (not new ones), for a conversation to use them. */
export async function dueTerms(lang: string, limit = 10, now = Date.now(), database: LinguaDB = db): Promise<string[]> {
  const decks = await studyDecks(lang, null, database);
  const due = (await Promise.all(decks.map((d) => dueCards(d, now, database)))).flat().filter((c) => c.state !== 0);
  const notes = await database.notes.bulkGet([...new Set(due.map((c) => c.noteId))]);
  return [...new Set(notes.flatMap((n) => (n && !n.deletedAt ? [n.term] : [])))].slice(0, limit);
}

export function useDueSummary(lang: string): DueSummary | undefined {
  return useLiveQuery(() => dueSummary(lang), [lang]);
}

export interface StudyOutlook {
  /** Reviews falling due on each of the next seven days (index 0 = tomorrow). */
  forecast: number[];
  /** When each deck was last studied (decks never studied are missing). */
  lastStudied: Map<string, number>;
}

/** The week ahead across these decks, and when each was last opened for study. Index ranges only. */
export function useStudyOutlook(decks: Deck[] | undefined): StudyOutlook | undefined {
  const key = decks?.map((d) => d.id).join(',') ?? '';
  return useLiveQuery(async () => {
    if (!decks) return undefined;
    const end = dayEnd(Date.now());
    const forecast = Array.from({ length: 7 }, () => 0);
    const lastStudied = new Map<string, number>();
    await Promise.all(
      decks.map(async (d) => {
        const upcoming = await db.cards.where('[deckId+due]').between([d.id, end], [d.id, end + 7 * DAY]).toArray();
        for (const c of upcoming) if (!c.suspended && c.state !== 0) forecast[Math.min(6, Math.floor((c.due - end) / DAY))]++;
        const last = await db.reviewLogs.where('[deckId+reviewedAt]').between([d.id, Dexie.minKey], [d.id, Dexie.maxKey]).last();
        if (last) lastStudied.set(d.id, last.reviewedAt);
      }),
    );
    return { forecast, lastStudied };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
