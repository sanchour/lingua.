import { afterEach, describe, expect, it } from 'vitest';
import { createDb } from './db';
import type { LinguaDB } from './db';
import { daysSince, deleteReading, readings, saveReading } from './diary';

const open: LinguaDB[] = [];
afterEach(async () => {
  await Promise.all(open.splice(0).map((d) => d.delete()));
});

describe('the pronunciation diary', () => {
  it('keeps the readings of a language in time order, deletes one, and leaves other languages and other blobs alone', async () => {
    const db = createDb(`diary-${Math.random().toString(36).slice(2)}`);
    open.push(db);
    const day = 86_400_000;
    const a = await saveReading('es', new Blob(['aaaa'], { type: 'audio/webm' }), 10 * day, db);
    await saveReading('es', new Blob(['bb'], { type: 'audio/webm' }), 20 * day, db);
    await saveReading('fr', new Blob(['c']), 15 * day, db);
    await db.blobs.put({ id: 'other', kind: 'audio', mime: 'audio/mp3', size: 1, blob: new Blob(['x']), createdAt: 1 });
    expect((await readings('es', db)).map((r) => [r.at / day, r.size])).toEqual([[10, 4], [20, 2]]);
    expect(daysSince(await readings('es', db), 27 * day)).toBe(7);
    await deleteReading(a, db);
    expect((await readings('es', db)).map((r) => r.at / day)).toEqual([20]);
    expect(await readings('fr', db)).toHaveLength(1);
    expect(daysSince([], 1)).toBeNull();
  });
});
