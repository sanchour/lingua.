import { afterEach, describe, expect, it } from 'vitest';
import { createDb } from './db';
import type { LinguaDB } from './db';
import { addBookmark, playlistNames, removeBookmark, setMediaPlaylists } from './media';
import type { Media } from './types';

const open: LinguaDB[] = [];
afterEach(async () => {
  await Promise.all(open.splice(0).map((d) => d.delete()));
});

describe('bookmarks in an item', () => {
  it('are kept in time order, a second one within two seconds replaces the first, and they can be removed', async () => {
    const db = createDb(`bookmarks-${Math.random().toString(36).slice(2)}`);
    open.push(db);
    await db.media.add({ id: 'm', lang: 'es', kind: 'audio', title: 'T', createdAt: 1, updatedAt: 1 } as Media);
    await addBookmark('m', 30_000, {}, db);
    await addBookmark('m', 10_000, { hard: true }, db);
    await addBookmark('m', 31_000, { note: 'again' }, db);
    expect((await db.media.get('m'))?.bookmarks).toEqual([{ at: 10_000, hard: true }, { at: 31_000, note: 'again' }]);
    await removeBookmark('m', 10_000, db);
    expect((await db.media.get('m'))?.bookmarks).toEqual([{ at: 31_000, note: 'again' }]);
  });

  it('playlists keep each name once, trim it, and are listed across items', async () => {
    const db = createDb(`playlists-${Math.random().toString(36).slice(2)}`);
    open.push(db);
    await db.media.bulkAdd([{ id: 'a', lang: 'es', kind: 'audio', title: 'A', createdAt: 1, updatedAt: 1 }, { id: 'b', lang: 'es', kind: 'audio', title: 'B', createdAt: 1, updatedAt: 1 }] as Media[]);
    await setMediaPlaylists('a', ['  Commute ', 'commute', 'Slow  songs'], db);
    await setMediaPlaylists('b', ['Commute'], db);
    expect((await db.media.get('a'))?.playlists).toEqual(['Commute', 'Slow songs']);
    expect(playlistNames(await db.media.toArray())).toEqual(['Commute', 'Slow songs']);
    await setMediaPlaylists('a', [], db);
    expect((await db.media.get('a'))?.playlists).toBeUndefined();
  });
});
