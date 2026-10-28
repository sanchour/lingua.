import { describe, expect, it } from 'vitest';
import { inBands, levelIndex } from './explore';
import type { PickLevel } from './types';

const items = (...levels: PickLevel[]) => levels.map((level, i) => ({ level, id: i }));

describe('inBands', () => {
  const all = items('A1', 'A2', 'A2', 'B1', 'B2', 'C1');

  it('puts a level’s items at your level, the next as a stretch and the one below as easier', () => {
    const bands = inBands(all, 'A2', 'mine');
    expect(bands.map((b) => [b.band, b.items.map((i) => i.level)])).toEqual([
      ['at', ['A2', 'A2']],
      ['stretch', ['B1']],
      ['easier', ['A1']],
    ]);
    expect(bands[0].title).toBe('At your level · A2');
  });
  it('keeps every level in the bands for “any level”, the stretch rising and the easier falling', () => {
    const bands = inBands(all, 'B1', 'any');
    expect(bands.find((b) => b.band === 'stretch')!.items.map((i) => i.level)).toEqual(['B2', 'C1']);
    expect(bands.find((b) => b.band === 'easier')!.items.map((i) => i.level)).toEqual(['A2', 'A2', 'A1']);
  });
  it('shows a beginner A1 as their level, with nothing easier', () => {
    expect(levelIndex('A0')).toBe(0);
    expect(inBands(all, 'A0', 'mine').map((b) => b.band)).toEqual(['at', 'stretch']);
  });
  it('makes one list for one level, and nothing when there is none', () => {
    expect(inBands(all, 'A2', 'C1')).toEqual([{ band: 'level', title: 'Level C1', items: items('C1').map((i) => ({ ...i, id: 5 })) }]);
    expect(inBands(items('A1'), 'A2', 'C1')).toEqual([]);
  });
  it('drops empty bands', () => {
    expect(inBands(items('B1'), 'B1', 'mine').map((b) => b.band)).toEqual(['at']);
  });
});
