import { afterAll, describe, expect, it } from 'vitest';
import { getDailyWordKey, loadDailyWord } from './DailyWordCard';

import { createDb } from '@/data/db';
const database = createDb('daily-word-' + Math.random());
afterAll(() => database.delete());

it('never offers a made-up cross-language word before its pack is ready', async () => {
  for (const lang of ['es', 'fr', 'de', 'ru', 'zh', 'ar']) expect(await loadDailyWord(lang, '2026-10-31', database)).toBeNull();
  await database.frequency.put({ id: 'es:sobremesa', lang: 'es', norm: 'sobremesa', rank: 1, gloss: 'conversation after a meal' });
  expect(await loadDailyWord('fr', '2026-10-31', database)).toBeNull();
  expect(await loadDailyWord('es', '2026-10-31', database)).toMatchObject({ word: 'sobremesa', gloss: 'conversation after a meal' });
});

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
