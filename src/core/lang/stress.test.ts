import { describe, expect, it } from 'vitest';
import { spanishStress } from './stress';

describe('Spanish stress', () => {
  it('goes to the written accent first', () => {
    expect(spanishStress(['ca', 'fé'])).toBe(1);
    expect(spanishStress(['án', 'gel'])).toBe(0);
  });
  it('is on the last syllable but one after a vowel, n or s, and on the last after any other letter', () => {
    expect(spanishStress(['ca', 'sa'])).toBe(0);
    expect(spanishStress(['jo', 'ven'])).toBe(0);
    expect(spanishStress(['li', 'bros'])).toBe(0);
    expect(spanishStress(['ha', 'blar'])).toBe(1);
    expect(spanishStress(['ciu', 'dad'])).toBe(1);
  });
  it('has a one-syllable word stressed and gives up on nothing to read', () => {
    expect(spanishStress(['sol'])).toBe(0);
    expect(spanishStress([])).toBeUndefined();
  });
});
