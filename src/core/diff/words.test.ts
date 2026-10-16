import { describe, expect, it } from 'vitest';
import { changeCount, wordDiff, wordTokens } from './words';

const rebuild = (parts: ReturnType<typeof wordDiff>, side: 'before' | 'after') =>
  parts
    .map((p) => (p.type === 'same' ? p.text : p.type === 'change' ? (side === 'before' ? p.from : p.to) : p.type === 'del' ? (side === 'before' ? p.text : '') : side === 'after' ? p.text : ''))
    .join('');

describe('word diff', () => {
  it('keeps unchanged text and groups replacements', () => {
    const before = 'Ayer yo fui a la playa con mis amigo.';
    const after = 'Ayer fui a la playa con mis amigos.';
    const parts = wordDiff(before, after);
    expect(parts).toContainEqual({ type: 'del', text: 'yo ' });
    expect(parts).toContainEqual({ type: 'change', from: 'amigo', to: 'amigos' });
    expect(rebuild(parts, 'before')).toBe(before);
    expect(rebuild(parts, 'after')).toBe(after);
    expect(changeCount(parts)).toBe(2);
  });

  it('handles punctuation and other scripts', () => {
    const parts = wordDiff('Я читаю книга', 'Я читаю книгу.');
    expect(parts).toEqual([
      { type: 'same', text: 'Я читаю ' },
      { type: 'change', from: 'книга', to: 'книгу.' },
    ]);
    expect(wordTokens('l’ami, très-bien!')).toEqual(['l’ami', ', ', 'très-bien', '!']);
  });

  it('returns a single same part for identical texts', () => {
    expect(wordDiff('Hallo Welt', 'Hallo Welt')).toEqual([{ type: 'same', text: 'Hallo Welt' }]);
    expect(wordDiff('', 'Neu')).toEqual([{ type: 'ins', text: 'Neu' }]);
  });
});
