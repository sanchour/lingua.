// Building notes and cards (no React, no settings): shared by the app and the import workers.
import { createEmptyCard } from 'ts-fsrs';
import type { Card, Deck, Note } from './types';

export const DEFAULT_DECK_CONFIG: Deck['config'] = {
  newPerDay: 15,
  maxReviews: 200,
  desiredRetention: 0.9,
  directions: ['recognition'],
  defaultMode: 'classic',
};

export function newCard(noteId: string, deckId: string, now: number, direction: Card['direction'] = 'recognition'): Card {
  const empty = createEmptyCard(new Date(now));
  return {
    id: crypto.randomUUID(),
    noteId,
    deckId,
    direction,
    due: empty.due.getTime(),
    stability: empty.stability,
    difficulty: empty.difficulty,
    elapsedDays: empty.elapsed_days,
    scheduledDays: empty.scheduled_days,
    learningSteps: empty.learning_steps,
    reps: empty.reps,
    lapses: empty.lapses,
    state: empty.state as Card['state'],
    suspended: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export type NoteInput = Pick<Note, 'term' | 'meaning'> & Partial<Pick<Note, 'example' | 'tags' | 'pos' | 'gender' | 'ipa' | 'lemma' | 'wordId' | 'source' | 'freqRank' | 'context' | 'extra' | 'audioBlobId' | 'imageBlobId'>>;

/** Builds a note and its cards (one per study direction of the deck) without saving them. */
export function makeNote(deck: Deck, input: NoteInput, now: number): { note: Note; cards: Card[] } {
  const note: Note = {
    id: crypto.randomUUID(),
    deckId: deck.id,
    lang: deck.lang,
    tags: [],
    source: 'manual',
    ...input,
    term: input.term.trim(),
    meaning: input.meaning.trim(),
    createdAt: now,
    updatedAt: now,
  };
  const cards = deck.config.directions.map((direction) => newCard(note.id, deck.id, now, direction));
  return { note, cards };
}

