// What the learner can see and change about the memory (6-3b): the due calendar, how long today takes, a card put on another day or
// forgotten, and the words that are hard or have gone rusty.
import Dexie from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { retrievability } from '@/core/srs/scheduler';
import { dueCounts, estimateMinutes, isDifficult, isRusty } from '@/core/srs/views';
import { db } from './db';
import type { LinguaDB } from './db';
import { newCard } from './decks';
import type { Card, Note } from './types';

/** Every card of a language that can fall due (not new, not suspended, not in an archived or deleted deck). */
async function scheduledCards(lang: string, database: LinguaDB): Promise<Card[]> {
  const decks = (await database.decks.where('lang').equals(lang).toArray()).filter((d) => !d.deletedAt && !d.archived);
  const lists = await Promise.all(decks.map((d) => database.cards.where('[deckId+due]').between([d.id, Dexie.minKey], [d.id, Dexie.maxKey]).filter((c) => c.state !== 0 && !c.suspended && !c.deletedAt).toArray()));
  return lists.flat();
}

/** The next five weeks, a count for each day. */
export async function dueCalendar(lang: string, now = Date.now(), database: LinguaDB = db) {
  return dueCounts(await scheduledCards(lang, database), now, 35);
}

/** How long the learner takes per answer, lately (the last two hundred answers they gave), or undefined before they have any. */
export async function averageReviewMs(lang: string, database: LinguaDB = db): Promise<number | undefined> {
  const logs = await database.reviewLogs.orderBy('reviewedAt').reverse().filter((l) => l.deckId !== `grammar:${lang}` && l.durationMs > 0).limit(200).toArray();
  return logs.length >= 10 ? logs.reduce((n, l) => n + l.durationMs, 0) / logs.length : undefined;
}

/** About how many minutes the cards waiting today will take. */
export async function studyMinutes(lang: string, waiting: number, database: LinguaDB = db): Promise<number> {
  return estimateMinutes(waiting, await averageReviewMs(lang, database));
}

export function useStudyMinutes(lang: string, waiting: number | undefined): number | undefined {
  return useLiveQuery(async () => (waiting === undefined ? undefined : studyMinutes(lang, waiting)), [lang, waiting]);
}

export function useDueCalendar(lang: string) {
  return useLiveQuery(() => dueCalendar(lang), [lang]);
}

/** Puts a card on another day: it is due then, and its memory is left as it is. */
export async function rescheduleCard(cardId: string, due: number, database: LinguaDB = db): Promise<void> {
  const card = await database.cards.get(cardId);
  if (!card || card.state === 0) throw new Error('Only a card that has been studied can be put on another day.');
  await database.cards.update(cardId, { due, buriedUntil: undefined, updatedAt: Date.now() });
}

/** Forgets a card: it is as if it had never been studied (its history of reviews stays in the log). */
export async function forgetCard(cardId: string, database: LinguaDB = db): Promise<void> {
  const card = await database.cards.get(cardId);
  if (!card) return;
  const now = Date.now();
  await database.cards.put({ ...newCard(card.noteId, card.deckId, now, card.direction), id: card.id, createdAt: card.createdAt, suspended: card.suspended, updatedAt: now });
}

/** The notes of a language with a card that is hard, or one not seen for a long while, most pressing first. */
export async function trickyNotes(lang: string, kind: 'difficult' | 'rusty', now = Date.now(), database: LinguaDB = db): Promise<Note[]> {
  const cards = await scheduledCards(lang, database);
  const picked = cards
    .filter((c) => (kind === 'difficult' ? isDifficult(c, retrievability(c, now)) : isRusty(c, now)))
    .sort((a, b) => (kind === 'difficult' ? b.lapses - a.lapses : (a.lastReview ?? 0) - (b.lastReview ?? 0)));
  const ids = [...new Set(picked.map((c) => c.noteId))];
  const notes = await database.notes.bulkGet(ids);
  return notes.filter((n): n is Note => Boolean(n && !n.deletedAt));
}

