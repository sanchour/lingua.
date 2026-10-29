import { describe, expect, it } from 'vitest';
import { placeTile } from './DragView';

describe('putting a word into the line', () => {
  it('adds one from the bank at the place asked, or at the end', () => {
    expect(placeTile([], 3, 0)).toEqual([3]);
    expect(placeTile([1, 2], 5, 0)).toEqual([5, 1, 2]);
    expect(placeTile([1, 2], 5, 1)).toEqual([1, 5, 2]);
    expect(placeTile([1, 2], 5, 2)).toEqual([1, 2, 5]);
    expect(placeTile([1, 2], 5, 99)).toEqual([1, 2, 5]);
  });

  it('moves one along the line without losing or doubling a word', () => {
    // Dropped on the word after it, it goes in front of that word; on the one before, in front of that.
    expect(placeTile([1, 2, 3], 1, 3)).toEqual([2, 3, 1]);
    expect(placeTile([1, 2, 3], 3, 0)).toEqual([3, 1, 2]);
    expect(placeTile([1, 2, 3], 1, 2)).toEqual([2, 1, 3]);
    expect(placeTile([1, 2, 3], 2, 2)).toEqual([1, 2, 3]);
    for (const [i, at] of [[1, 0], [2, 3], [3, 1]]) expect([...placeTile([1, 2, 3], i, at)].sort()).toEqual([1, 2, 3]);
  });
});
