import { describe, expect, it } from 'vitest';
import { loopJump, loopLabel, nextLoop } from './loop';

describe('the A–B loop', () => {
  it('is set at A, closed at B, and cleared by a third press', () => {
    const a = nextLoop(null, 10_000);
    expect(a).toEqual({ a: 10_000 });
    const ab = nextLoop(a, 14_000);
    expect(ab).toEqual({ a: 10_000, b: 14_000 });
    expect(nextLoop(ab, 20_000)).toBeNull();
  });
  it('ignores a B pressed right after A', () => {
    expect(nextLoop({ a: 10_000 }, 10_200)).toEqual({ a: 10_000 });
  });
  it('jumps back to A only when it has a B and the playhead has reached it', () => {
    expect(loopJump({ a: 1000, b: 4000 }, 3999)).toBeNull();
    expect(loopJump({ a: 1000, b: 4000 }, 4000)).toBe(1000);
    expect(loopJump({ a: 1000 }, 9999)).toBeNull();
    expect(loopJump(null, 9999)).toBeNull();
  });
  it('labels itself', () => {
    expect([null, { a: 1 }, { a: 1, b: 5000 }].map((l) => loopLabel(l))).toEqual(['A–B', 'A…', 'A–B on']);
  });
});
