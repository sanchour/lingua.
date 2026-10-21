// Clicking words (5.1-3a): one click known, a double click learning.
import { describe, expect, it } from 'vitest';
import { clickState } from './engine';

describe('clicking a word', () => {
  it('marks an unseen or learning word known with one click, and a known one unseen again', () => {
    expect(clickState(0, false)).toBe(1);
    expect(clickState(2, false)).toBe(1);
    expect(clickState(1, false)).toBe(0);
  });

  it('marks it learning with a double click, or unseen when it was learning before', () => {
    expect(clickState(0, true)).toBe(2);
    expect(clickState(1, true)).toBe(2);
    expect(clickState(2, true)).toBe(0);
  });
});
