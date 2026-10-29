// How a deck's cards are ordered on its page (6-2b). Pure: the page hands in the notes and their cards.
import type { Card, Note } from '@/data/types';

export type NoteSort = 'common' | 'alpha' | 'added' | 'due' | 'hardest' | 'pos';

export const NOTE_SORTS: Array<{ value: NoteSort; label: string }> = [
  { value: 'common', label: 'Most common first' },
  { value: 'alpha', label: 'A to Z' },
  { value: 'added', label: 'Newest first' },
  { value: 'due', label: 'Due soonest' },
  { value: 'hardest', label: 'Hardest first' },
  { value: 'pos', label: 'Kind of word' },
];

const first = (cards: Card[] | undefined) => cards?.find((c) => c.direction === 'recognition') ?? cards?.[0];

export function sortNotes(notes: readonly Note[], cardsByNote: ReadonlyMap<string, Card[]>, how: NoteSort): Note[] {
  const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });
  const byAdded = (a: Note, b: Note) => a.createdAt - b.createdAt;
  const key: Record<NoteSort, (a: Note, b: Note) => number> = {
    common: (a, b) => (a.freqRank ?? Infinity) - (b.freqRank ?? Infinity) || byAdded(a, b),
    alpha: (a, b) => collator.compare(a.term, b.term),
    added: (a, b) => b.createdAt - a.createdAt,
    // New cards have no due date worth ordering by: they go last.
    due: (a, b) => (first(cardsByNote.get(a.id))?.state ? first(cardsByNote.get(a.id))!.due : Infinity) - (first(cardsByNote.get(b.id))?.state ? first(cardsByNote.get(b.id))!.due : Infinity) || byAdded(a, b),
    hardest: (a, b) => (first(cardsByNote.get(b.id))?.difficulty ?? 0) - (first(cardsByNote.get(a.id))?.difficulty ?? 0) || byAdded(a, b),
    pos: (a, b) => (a.pos ?? '￿').localeCompare(b.pos ?? '￿') || collator.compare(a.term, b.term),
  };
  return [...notes].sort(key[how]);
}
