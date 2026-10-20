// What the player says about books and the sleep timer, kept apart from the components so it can
// be tested.
import type { SleepTimer } from '@/core/audio/sleep';
import type { Book } from '@/data/books';
import type { Media } from '@/data/types';

/** "Part 3 of 12" (or "Lesson 3 of 12"); null outside a book of several parts. */
export function partLabel(media: Pick<Media, 'id'>, book: Book | null | undefined): string | null {
  const at = book ? book.parts.findIndex((p) => p.id === media.id) : -1;
  if (!book || at < 0 || book.parts.length < 2) return null;
  return `${book.kind === 'course' ? 'Lesson' : 'Part'} ${at + 1} of ${book.parts.length}`;
}

/** Whether the player shows the book bar: parts to step through, chapters, or a lesson to mark done. */
export function hasBookBar(media: Pick<Media, 'chapters'>, book: Book | null | undefined): boolean {
  return Boolean(book && (book.parts.length > 1 || book.kind === 'course')) || (media.chapters?.length ?? 0) > 1;
}

/** What "the end" is for an item: a book's part or lesson, else the episode. */
export function endOf(media: Pick<Media, 'bookId' | 'bookKind'>): 'part' | 'lesson' | 'episode' {
  if (!media.bookId) return 'episode';
  return media.bookKind === 'course' ? 'lesson' : 'part';
}

/** Whole minutes left on a timer, counted up (the last minute shows as 1). */
export function minutesLeft(endsAt: number, now: number): number {
  return Math.max(1, Math.ceil((endsAt - now) / 60_000));
}

/** The sleep timer's state in words; `left` is the minutes left the button shows. */
export function sleepStatus(sleep: SleepTimer | null, left: number | null, end: string): string {
  if (!sleep) return 'Off';
  if (sleep.mode === 'minutes') return `Stops in ${left ?? minutesLeft(sleep.endsAt, Date.now())} min`;
  return sleep.mode === 'chapter' ? 'Stops at the end of this chapter' : `Stops at the end of this ${end}`;
}
