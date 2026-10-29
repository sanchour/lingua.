import { expect, it } from 'vitest';
import { endingStart, markMatches } from './aids';

it('only paints a saved quote when its original offsets still match', () => {
  const mark = { id: 'm', chapterIndex: 0, blockIndex: 0, start: 4, end: 8, quote: 'casa', colour: 'sage' as const, note: '' };
  expect(markMatches(mark, 'Una casa grande.')).toBe(true);
  expect(markMatches(mark, 'Otra casa grande.')).toBe(false);
  expect(markMatches({ ...mark, start: -1 }, 'Una casa grande.')).toBe(false);
});
it('marks only the differing suffix of a form with a shared stem', () => {
  expect(endingStart('hablamos', 'hablar')).toBe(5);
  expect(endingStart('casas', 'casa')).toBe(4);
  expect(endingStart('𐐀𐐁x', '𐐀𐐁y')).toBe(4);
  expect(endingStart('fui', 'ir')).toBeUndefined();
  expect(endingStart('casa', 'casa')).toBeUndefined();
});
