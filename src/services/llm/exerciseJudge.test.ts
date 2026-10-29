import { describe, expect, it } from 'vitest';
import { readJudged } from './exerciseJudge';

describe('reading the AI’s judgement of a free sentence', () => {
  it('keeps a verdict it knows, with a short explanation', () => {
    expect(readJudged({ verdict: 'good', explanation: ' Nice. ' })).toEqual({ verdict: 'good', explanation: 'Nice.' });
    expect(readJudged({ verdict: 'partly' })).toEqual({ verdict: 'partly', explanation: '' });
    expect(readJudged({ verdict: 'not', explanation: 'x'.repeat(900) })?.explanation).toHaveLength(400);
  });

  it('reads nothing from a verdict it does not know', () => {
    expect(readJudged({ verdict: 'excellent' })).toBeNull();
    expect(readJudged('good')).toBeNull();
    expect(readJudged(null)).toBeNull();
  });
});
