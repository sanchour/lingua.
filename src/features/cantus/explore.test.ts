import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { createDb } from '@/data/db';
import type { LinguaDB } from '@/data/db';
import { markSongPlayed, openSong } from '@/data/songs';
import { hashOf, interleave, seeded, shuffled } from './explore';

const open: LinguaDB[] = [];
afterEach(async () => {
  await Promise.all(open.splice(0).map((db) => db.delete()));
});

describe('music to explore', () => {
  it('picks the same songs all day, and others the next', () => {
    const list = Array.from({ length: 20 }, (_, i) => i);
    const today = shuffled(list, seeded(hashOf('es|2026-10-19|0')));
    expect(shuffled(list, seeded(hashOf('es|2026-10-19|0')))).toEqual(today);
    expect(shuffled(list, seeded(hashOf('es|2026-10-20|0')))).not.toEqual(today);
    expect(shuffled(list, seeded(hashOf('es|2026-10-19|1')))).not.toEqual(today);
    expect([...today].sort((a, b) => a - b)).toEqual(list);
  });

  it('mixes the artists, no artist twice in a row while others are left', () => {
    expect(interleave([['a1', 'a2', 'a3'], ['b1'], ['c1', 'c2']], 5)).toEqual(['a1', 'b1', 'c1', 'a2', 'c2']);
    expect(interleave([['a1', 'a2'], []], 9)).toEqual(['a1', 'a2']);
  });

  it('counts a song played once per opening, not twice for a quick reopen', async () => {
    const db = createDb(`explore-${Math.random().toString(36).slice(2)}`);
    open.push(db);
    const id = await openSong('es', { itunesId: 7, title: 'Corre', artist: 'Jesse & Joy' }, {}, db);
    await markSongPlayed(id, db);
    await markSongPlayed(id, db);
    expect((await db.songs.get(id))?.plays).toBe(1);
    await db.songs.update(id, { lastPlayedAt: Date.now() - 120_000 });
    await markSongPlayed(id, db);
    expect((await db.songs.get(id))?.plays).toBe(2);
  });
});
