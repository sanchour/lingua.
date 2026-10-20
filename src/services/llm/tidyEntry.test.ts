import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FullDictRow } from '@/core/dictionary/format';

const askJson = vi.fn();
vi.mock('./client', () => ({ askJson: (...args: unknown[]) => askJson(...args) }));
const { tidyEntry } = await import('./tidyEntry');

const row = {
  lang: 'fr',
  key: 'maison',
  fold: 'maison',
  word: 'maison',
  entries: [{ pos: 'noun', gender: 'f', senses: [{ g: ['house'] }, { g: ['home'], tags: ['figuratively'] }, { g: ['company, firm'] }] }],
} as unknown as FullDictRow;

describe('tidyEntry', () => {
  beforeEach(() => askJson.mockReset());

  it('sends the raw senses and keeps a clean answer', async () => {
    askJson.mockResolvedValue({
      summary: 'A house, a home, or a firm.',
      senses: [{ meaning: 'house', example: { text: 'Une maison bleue.', translation: 'A blue house.' } }, { meaning: 'firm', register: 'formal' }, null, { meaning: 3 }],
      tip: '  ',
    });
    const out = await tidyEntry('fr', row);
    const call = askJson.mock.calls[0][0] as { system: string; user: string; kind: string };
    expect(call.kind).toBe('dictTidy');
    expect(call.system).toContain('French');
    expect(JSON.parse(call.user).entries[0].senses).toEqual(['house', 'home | figuratively', 'company, firm']);
    expect(out.senses.map((s) => s.meaning)).toEqual(['house', 'firm']);
    expect(out.tip).toBeUndefined();
  });

  it('copes with an answer of the wrong shape', async () => {
    askJson.mockResolvedValue({ senses: 'none' });
    expect(await tidyEntry('fr', row)).toEqual({ summary: '', senses: [], tip: undefined });
  });

  it('caps the senses at six', async () => {
    askJson.mockResolvedValue({ summary: 's', senses: Array.from({ length: 9 }, (_, i) => ({ meaning: `m${i}` })) });
    expect((await tidyEntry('fr', row)).senses).toHaveLength(6);
  });
});
