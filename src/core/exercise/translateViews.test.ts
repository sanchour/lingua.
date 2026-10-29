import { describe, expect, it } from 'vitest';
import {
  getAlignmentPairs,
  scrambleWords,
  checkReconstruction,
  analyzeBackTranslation,
} from './translateViews';

describe('Translation Views & Alignment Engine (Step 6-13, Slice T2)', () => {
  it('provides authentic alignment pairs for all six core languages', () => {
    const langs = ['es', 'fr', 'de', 'it', 'ru', 'zh'];
    for (const lang of langs) {
      const pairs = getAlignmentPairs(lang);
      expect(pairs.length).toBeGreaterThan(0);
      const pair = pairs[0];
      expect(pair.sourceTokens.length).toBeGreaterThan(0);
      expect(pair.targetTokens.length).toBeGreaterThan(0);
      expect(pair.links.length).toBeGreaterThan(0);
      expect(pair.shiftNote).toBeDefined();
    }
  });

  it('scrambles words into reconstructible tiles', () => {
    const text = 'Tomorrow I am going to school.';
    const { original, tiles } = scrambleWords(text);
    expect(original).toBe(text);
    expect(tiles.length).toBe(6);
    expect(tiles.sort()).toEqual(text.split(' ').sort());
  });

  it('verifies reconstructed sentence order correctly', () => {
    const original = 'Tomorrow I am going to school.';
    const correctTiles = ['Tomorrow', 'I', 'am', 'going', 'to', 'school.'];
    const wrongTiles = ['I', 'Tomorrow', 'going', 'am', 'to', 'school.'];

    expect(checkReconstruction(correctTiles, original)).toBe(true);
    expect(checkReconstruction(wrongTiles, original)).toBe(false);
  });

  it('analyzes back-translation semantic preservation', () => {
    const orig = 'I want you to come early.';
    // Exact match
    const perfect = analyzeBackTranslation(orig, 'I want you to come early.');
    expect(perfect.verdict).toBe('preserved');
    expect(perfect.similarity).toBe(1.0);

    // Slight shift
    const slight = analyzeBackTranslation(orig, 'I want you to arrive early.');
    expect(slight.verdict).toBe('slight_shift');
    expect(slight.similarity).toBeGreaterThanOrEqual(0.6);

    // Major drift
    const drifted = analyzeBackTranslation(orig, 'The dog ran across the garden yesterday.');
    expect(drifted.verdict).toBe('drifted');
    expect(drifted.similarity).toBeLessThan(0.3);
  });
});
