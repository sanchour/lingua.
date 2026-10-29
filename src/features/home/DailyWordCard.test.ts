import { describe, expect, it } from 'vitest';
import { getDailyWordKey } from './DailyWordCard';

describe('DailyWordCard (6-25 slice 2.6)', () => {
  it('deterministically hashes the date and language to a stable index within count (F1524)', () => {
    const idx1 = getDailyWordKey('es', '2026-10-29', 100);
    const idx2 = getDailyWordKey('es', '2026-10-29', 100);
    expect(idx1).toBe(idx2);
    expect(idx1).toBeGreaterThanOrEqual(0);
    expect(idx1).toBeLessThan(100);

    const idxTomorrow = getDailyWordKey('es', '2026-10-30', 100);
    expect(idxTomorrow).toBeGreaterThanOrEqual(0);
    expect(idxTomorrow).toBeLessThan(100);

    const idxFr = getDailyWordKey('fr', '2026-10-29', 100);
    expect(idxFr).toBeGreaterThanOrEqual(0);
    expect(idxFr).toBeLessThan(100);
  });
});
