import { describe, expect, it } from 'vitest';
import { groupBooks } from '@/data/books';
import type { Media } from '@/data/types';
import { endOf, hasBookBar, minutesLeft, partLabel, sleepStatus } from './labels';

let clock = 1_000;
function part(bookId: string, episode: number, extra: Partial<Media> = {}): Media {
  clock += 10;
  return { id: `${bookId}-${episode}`, lang: 'fr', kind: 'audio', title: `Partie ${episode}`, bookId, episode, createdAt: clock, updatedAt: clock, ...extra };
}
const loose: Media = { id: 'loose', lang: 'fr', kind: 'audio', title: 'Un fichier', createdAt: 1, updatedAt: 1 };
const chapters = [
  { title: 'Un', startMs: 0 },
  { title: 'Deux', startMs: 60_000 },
];

describe('partLabel', () => {
  it('counts the part within its book, in part order, leaving out removed parts', () => {
    const parts = [part('tour', 3), part('tour', 1), part('tour', 2, { deletedAt: 5 }), part('tour', 4)];
    const [book] = groupBooks(parts);
    expect(partLabel(parts[0], book)).toBe('Part 2 of 3');
    expect(partLabel(parts[1], book)).toBe('Part 1 of 3');
    expect(partLabel(parts[3], book)).toBe('Part 3 of 3');
  });

  it('says “Lesson” for a course', () => {
    const parts = [part('cours', 1, { bookKind: 'course' }), part('cours', 2, { bookKind: 'course' })];
    expect(partLabel(parts[1], groupBooks(parts)[0])).toBe('Lesson 2 of 2');
  });

  it('says nothing for a book of one part, an item outside the book, or while the book loads', () => {
    const one = [part('m4b', 1)];
    expect(partLabel(one[0], groupBooks(one)[0])).toBeNull();
    const two = [part('tour', 1), part('tour', 2)];
    expect(partLabel(loose, groupBooks(two)[0])).toBeNull();
    expect(partLabel(two[0], undefined)).toBeNull();
    expect(partLabel(two[0], null)).toBeNull();
  });
});

describe('hasBookBar', () => {
  it('shows for several parts, any course, or two chapters or more', () => {
    const two = [part('tour', 1), part('tour', 2)];
    expect(hasBookBar(two[0], groupBooks(two)[0])).toBe(true);
    const lesson = [part('cours', 1, { bookKind: 'course' })];
    expect(hasBookBar(lesson[0], groupBooks(lesson)[0])).toBe(true);
    const m4b = [part('m4b', 1, { chapters })];
    expect(hasBookBar(m4b[0], groupBooks(m4b)[0])).toBe(true);
    expect(hasBookBar({ ...loose, chapters }, null)).toBe(true);
  });

  it('stays hidden for one part without chapters, one chapter, or a loose item', () => {
    const one = [part('m4b', 1, { chapters: chapters.slice(0, 1) })];
    expect(hasBookBar(one[0], groupBooks(one)[0])).toBe(false);
    expect(hasBookBar(loose, null)).toBe(false);
  });
});

describe('the sleep timer’s words', () => {
  it('names the end of a part, a lesson or an episode', () => {
    expect(endOf(part('tour', 1))).toBe('part');
    expect(endOf(part('cours', 1, { bookKind: 'course' }))).toBe('lesson');
    expect(endOf(loose)).toBe('episode');
  });

  it('counts minutes left up, so the last minute still shows 1', () => {
    expect(minutesLeft(30 * 60_000, 0)).toBe(30);
    expect(minutesLeft(30 * 60_000, 1)).toBe(30);
    expect(minutesLeft(30 * 60_000, 60_001)).toBe(29);
    expect(minutesLeft(10_000, 0)).toBe(1);
    expect(minutesLeft(10_000, 20_000)).toBe(1);
  });

  it('describes each kind of timer', () => {
    expect(sleepStatus(null, null, 'part')).toBe('Off');
    expect(sleepStatus({ mode: 'minutes', endsAt: 0 }, 12, 'part')).toBe('Stops in 12 min');
    expect(sleepStatus({ mode: 'chapter', chapter: 2 }, null, 'part')).toBe('Stops at the end of this chapter');
    expect(sleepStatus({ mode: 'part' }, null, 'lesson')).toBe('Stops at the end of this lesson');
    expect(sleepStatus({ mode: 'part' }, null, 'episode')).toBe('Stops at the end of this episode');
  });
});
