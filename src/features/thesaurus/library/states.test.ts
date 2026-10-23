import { describe, expect, it } from 'vitest';
import { studiedAgo } from './states';

describe('studiedAgo', () => {
  const now = new Date(2026, 9, 23, 15, 0).getTime();
  const at = (y: number, m: number, d: number, h = 12) => new Date(y, m, d, h).getTime();

  it('says today, yesterday and days ago by the calendar, not by 24 hours', () => {
    expect(studiedAgo(undefined, now)).toBe('Not yet');
    expect(studiedAgo(at(2026, 9, 23, 0), now)).toBe('Today');
    expect(studiedAgo(at(2026, 9, 22, 23), now)).toBe('Yesterday');
    expect(studiedAgo(at(2026, 9, 22, 1), now)).toBe('Yesterday');
    expect(studiedAgo(at(2026, 9, 20), now)).toBe('3 days ago');
  });

  it('counts weeks, then gives the date', () => {
    expect(studiedAgo(at(2026, 9, 14), now)).toBe('A week ago');
    expect(studiedAgo(at(2026, 9, 5), now)).toBe('2 weeks ago');
    expect(studiedAgo(at(2026, 7, 2), now)).toBe('2 Aug');
    expect(studiedAgo(at(2025, 11, 30), now)).toBe('30 Dec 2025');
  });
});
