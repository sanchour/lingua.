import { describe, expect, it } from 'vitest';
import { FREE_ROOMS, hasPlus, PLUS_ROOMS } from './plus';
import { DEFAULT_SETTINGS } from './settings';

describe('Lingua+ (placeholder)', () => {
  it('is not had until it is "bought", and Ordo can take it away', () => {
    expect(hasPlus(DEFAULT_SETTINGS.meta)).toBe(false);
    expect(hasPlus({ ...DEFAULT_SETTINGS.meta, plusAt: Date.now() })).toBe(true);
    expect(hasPlus({ ...DEFAULT_SETTINGS.meta, plusAt: null })).toBe(false);
  });

  it('keeps Codex and Thesaurus free, and never lists a room twice', () => {
    expect(FREE_ROOMS).toEqual(['Codex', 'Thesaurus']);
    expect(new Set([...FREE_ROOMS, ...PLUS_ROOMS]).size).toBe(FREE_ROOMS.length + PLUS_ROOMS.length);
  });
});
