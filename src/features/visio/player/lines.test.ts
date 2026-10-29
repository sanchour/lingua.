import { describe, expect, it } from 'vitest';
import { adaptiveMode } from './lines';

describe('adaptiveMode', () => {
  it('takes help away one step per full watch, and stops at hidden', () => {
    expect([0, 1, 2, 3, 9].map(adaptiveMode)).toEqual(['show', 'blur', 'after', 'hide', 'hide']);
    expect(adaptiveMode(-1)).toBe('show');
  });
});
