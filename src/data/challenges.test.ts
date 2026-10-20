import { afterEach, describe, expect, it } from 'vitest';
import { exportBackup, readBackup, restoreBackup } from './backup';
import { challengesDone, toggleChallenge } from './challenges';
import { createDb } from './db';
import type { LinguaDB } from './db';

const open: LinguaDB[] = [];
const freshDb = () => {
  const db = createDb(`challenges-${Math.random().toString(36).slice(2)}`);
  open.push(db);
  return db;
};
afterEach(async () => {
  await Promise.all(open.splice(0).map((db) => db.delete()));
});

describe('challenges', () => {
  it('marks a challenge done for a day, undoes it, and keeps days apart', async () => {
    const db = freshDb();
    expect(await toggleChallenge('es', 'phone', '2026-10-19', db)).toBe(true);
    expect(await toggleChallenge('es', 'walk', '2026-10-19', db)).toBe(true);
    expect(await toggleChallenge('es', 'walk', '2026-10-20', db)).toBe(true);
    expect((await challengesDone('es', db)).map((r) => r.id).sort()).toEqual(['es:phone:2026-10-19', 'es:walk:2026-10-19', 'es:walk:2026-10-20']);
    expect(await toggleChallenge('es', 'phone', '2026-10-19', db)).toBe(false);
    expect((await challengesDone('es', db)).map((r) => r.tipId).sort()).toEqual(['walk', 'walk']);
    expect(await challengesDone('fr', db)).toEqual([]);
  });

  it('travel in backups and merge between devices', async () => {
    const phone = freshDb();
    const desk = freshDb();
    await toggleChallenge('es', 'cafe', '2026-10-19', phone);
    await toggleChallenge('es', 'labels', '2026-10-18', desk);
    await restoreBackup(await readBackup(await exportBackup({ includeMedia: false, includeApiKeys: false, markBackup: false }, phone)), 'merge', desk);
    expect((await challengesDone('es', desk)).map((r) => r.tipId).sort()).toEqual(['cafe', 'labels']);
  });
});
