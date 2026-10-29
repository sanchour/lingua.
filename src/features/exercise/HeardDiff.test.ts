import { describe, expect, it } from 'vitest';
import { wordDiff } from '@/core/diff/words';

describe('what you wrote against what was said', () => {
  it('keeps the words that agree and says which were changed, missed or added', () => {
    const parts = wordDiff('vivo en una casa grande', 'Vivo en una casa pequeña.');
    expect(parts.some((p) => p.type === 'same')).toBe(true);
    expect(parts.some((p) => p.type !== 'same')).toBe(true);
    expect(wordDiff('hola', 'hola').every((p) => p.type === 'same')).toBe(true);
  });
});
