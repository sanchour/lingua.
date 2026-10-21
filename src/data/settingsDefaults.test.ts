import { describe, expect, it } from 'vitest';
import { rowsToSettings } from './settings';

const row = (key: string, value: unknown) => ({ key, value, updatedAt: 0 });

describe('the study light on first start', () => {
  it('follows the device on a new install', () => {
    expect(rowsToSettings([]).theme).toBe('system');
  });

  it('keeps paper for an install from before Lingua 5 that never chose', () => {
    expect(rowsToSettings([row('meta', { onboardedAt: 1_700_000_000_000 })]).theme).toBe('paper');
  });

  it('keeps a light the learner chose', () => {
    expect(rowsToSettings([row('meta', { onboardedAt: 1 }), row('theme', 'nocturne')]).theme).toBe('nocturne');
  });
});
