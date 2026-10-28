import { describe, expect, it } from 'vitest';
import { estimateLevel } from './estimate';

describe('the estimated level', () => {
  it('starts at A0 and climbs with the words known', () => {
    expect(estimateLevel(0)).toEqual({ level: 'A0', next: { level: 'A1', remaining: 500 }, progress: 0 });
    expect(estimateLevel(1500)).toEqual({ level: 'A2', next: { level: 'B1', remaining: 500 }, progress: 0.5 });
    expect(estimateLevel(4000).level).toBe('B2');
  });

  it('has no next level at the top', () => {
    expect(estimateLevel(20000)).toEqual({ level: 'C2', progress: 1 });
  });
});
