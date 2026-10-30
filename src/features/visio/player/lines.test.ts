import { describe, expect, it } from 'vitest';
import { adaptiveMode, heardMore } from './lines';

describe('heardMore', () => {
  it('counts a short step forward, and not a seek or a step back', () => {
    expect(heardMore(10, 20, 20.25)).toBeCloseTo(10.25);
    expect(heardMore(10, 20, 300)).toBe(10);
    expect(heardMore(10, 20, 5)).toBe(10);
  });
});

describe('adaptiveMode', () => {
  it('takes help away one step per full watch, and stops at hidden', () => {
    expect([0, 1, 2, 3, 9].map(adaptiveMode)).toEqual(['show', 'blur', 'after', 'hide', 'hide']);
    expect(adaptiveMode(-1)).toBe('show');
  });
});
