import { describe, expect, it } from 'vitest';
import { readSay } from './mundus';

describe('readSay', () => {
  it('turns the AI’s answer into replies', () => {
    expect(readSay({ lane: 'listen', short: true })).toEqual([{ kind: 'lane', lane: 'listen' }, { kind: 'short' }]);
    expect(readSay({ lane: null, short: true })).toEqual([{ kind: 'short' }]);
  });
  it('ignores anything it doesn’t know', () => {
    expect(readSay({ lane: 'sleep', short: 'yes' })).toEqual([]);
    expect(readSay('nope')).toEqual([]);
    expect(readSay(null)).toEqual([]);
  });
});
