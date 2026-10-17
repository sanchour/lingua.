import { describe, expect, it } from 'vitest';
import { estimateLevel } from '@/core/lang/levels';
import type { Block } from '@/data/types';
import { blocksToText, textToBlocks } from './text';

describe('blocksToText / textToBlocks', () => {
  const blocks: Block[] = [
    { t: 'h', text: 'Capítulo 1' },
    { t: 'p', text: 'Cada tarde paseamos por el parque.' },
    { t: 'img', blobId: 'b-123' },
    { t: 'quote', text: '«Ven», dijo.' },
    { t: 'p', text: 'Fin.' },
  ];

  it('round-trips headings, quotes and pictures', () => {
    expect(textToBlocks(blocksToText(blocks))).toEqual(blocks);
  });

  it('joins wrapped lines inside a paragraph', () => {
    expect(textToBlocks('Una línea\nque sigue.\n\nOtra.')).toEqual([
      { t: 'p', text: 'Una línea que sigue.' },
      { t: 'p', text: 'Otra.' },
    ]);
  });
});

describe('estimateLevel', () => {
  it('needs enough words to guess', () => {
    expect(estimateLevel([[10, 5]])).toBeUndefined();
  });

  it('is low for texts made of very common words', () => {
    expect(estimateLevel([[1, 50], [20, 30], [300, 15], [900, 5]])).toBe('A1');
  });

  it('rises with the rare words a text leans on', () => {
    expect(estimateLevel([[1, 40], [50, 30], [4000, 8], [9000, 17], [undefined, 1], [undefined, 2]])).toBe('B2');
  });

  it('ignores repeated words missing from the list, like names', () => {
    expect(estimateLevel([[1, 60], [100, 40], [undefined, 500]])).toBe('A1');
  });
});
