import { describe, expect, it } from 'vitest';
import type { Cue } from '@/data/types';
import { applySpeakers, speakerChanges } from './speakers';

const cues: Cue[] = [0, 1, 2].map((i) => ({ startMs: i * 1000, endMs: i * 1000 + 900, text: `line ${i}` }));

describe('speakers', () => {
  it('puts a label on every line, and shows only the changes', () => {
    const out = applySpeakers(cues, { speakers: ['A', 'A', 'B'] });
    expect(out?.map((c) => c.speaker)).toEqual(['A', 'A', 'B']);
    expect(speakerChanges(out!)).toEqual([true, false, true]);
  });

  it('refuses an answer that does not fit', () => {
    expect(applySpeakers(cues, { speakers: ['A', 'B'] })).toBeNull();
    expect(applySpeakers(cues, { speakers: ['A', '', 'B'] })).toBeNull();
    expect(applySpeakers(cues, null)).toBeNull();
    expect(applySpeakers(Array.from({ length: 5 }, () => cues[0]), { speakers: ['A', 'B', 'C', 'D', 'E'] })).toBeNull();
  });
});
