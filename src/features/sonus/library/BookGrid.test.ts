import { describe, expect, it } from 'vitest';
import type { Book } from '@/data/books';
import type { Media, PlaybackProgress } from '@/data/types';
import { bookShare, bookWhere } from './BookGrid';

const part = (id: string, durationMs: number, lastPlayedAt?: number) => ({ id, durationMs, lastPlayedAt }) as Media;
const book = (over: Partial<Book>): Book => ({ id: 'b', lang: 'es', title: 'Marianela', kind: 'audiobook', parts: [], done: 0, createdAt: 0, ...over });
const progress = (rows: Array<[string, number, boolean?]>) => new Map(rows.map(([id, positionMs, completed]) => [id, { positionMs, completed: Boolean(completed) } as unknown as PlaybackProgress]));

describe('bookWhere', () => {
  it('names the part last played', () => {
    expect(bookWhere(book({ parts: [part('a', 10, 5), part('b', 10, 9)], lastPlayedAt: 9 }), undefined)).toBe('Part 2 of 2');
  });

  it('counts the parts of a book not started', () => {
    expect(bookWhere(book({ parts: [part('a', 10), part('b', 10)] }), undefined)).toBe('2 parts');
  });

  it('counts lessons done in a course', () => {
    expect(bookWhere(book({ kind: 'course', parts: [part('a', 10), part('b', 10), part('c', 10)], done: 1 }), undefined)).toBe('1 of 3 lessons done');
  });

  it('says a one-part book is finished, or who wrote it', () => {
    const one = book({ parts: [part('a', 10)], author: 'Galdós' });
    expect(bookWhere(one, progress([['a', 10, true]]))).toBe('Finished');
    expect(bookWhere(one, undefined)).toBe('Galdós');
  });
});

describe('bookShare', () => {
  it('adds finished parts and the place in the current one', () => {
    const b = book({ parts: [part('a', 100), part('b', 100), part('c', 200)], durationMs: 400 });
    expect(bookShare(b, progress([['a', 0, true], ['b', 100]]))).toBe(0.5);
  });

  it('is nothing when the length is unknown', () => {
    expect(bookShare(book({ parts: [part('a', 100)] }), progress([['a', 50]]))).toBe(0);
  });

  it('follows the lessons done in a course', () => {
    expect(bookShare(book({ kind: 'course', parts: [part('a', 1), part('b', 1), part('c', 1), part('d', 1)], done: 1 }), undefined)).toBe(0.25);
  });
});
