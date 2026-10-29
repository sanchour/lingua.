import { describe, expect, it } from 'vitest';
import { db } from './db';
import { recordEvidence } from './learner';
import { mistakesText } from './mistakesText';

describe('the mistakes as text', () => {
  it('says each weak spot in words, with what was written where it is known, and is empty with none', async () => {
    // The record is read through the app's own database, so the rows go there.
    const at = Date.now();
    await db.evidence.clear();
    expect(await mistakesText('es')).toBe('');
    for (let i = 0; i < 3; i++) await recordEvidence({ lang: 'es', at: at - i * 86_400_000, skill: 'vocabulary', room: 'ludus', item: { type: 'word', wordId: 'es:casa' }, outcome: 'wrong', assisted: false, given: 'cassa', expected: 'casa' }, db);
    expect(await mistakesText('es')).toContain('word casa: wrote "cassa", should be "casa" (wrong 3 times)');
    await db.evidence.clear();
  });
});
