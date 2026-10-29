// Contexts for a word (6-3b): the sentences a card can show it in, and which one is its turn.
import type { Note } from '@/data/types';

export interface Context {
  text: string;
  translation?: string;
}

/** The note's own sentence first, then the dictionary's (short ones, different from it), at most six. Empty when the note has no sentence. */
export function contextsOf(note: Pick<Note, 'example' | 'context' | 'term'>, dictionary: ReadonlyArray<readonly [string, string?]>): Context[] {
  const own = note.example?.text ?? (note.context?.sentence !== note.term ? note.context?.sentence : undefined);
  if (!own) return [];
  const pool: Context[] = [{ text: own, translation: note.example?.translation }];
  for (const [text, translation] of dictionary) {
    if (text.length <= 140 && !pool.some((p) => p.text === text)) pool.push({ text, translation });
    if (pool.length >= 6) break;
  }
  return pool;
}

/** Which of them a card shows: in turn, by how many times it has been reviewed (0 is the note's own). */
export const contextFor = (pool: readonly Context[], reviews: number): Context | undefined => (pool.length ? pool[reviews % pool.length] : undefined);
