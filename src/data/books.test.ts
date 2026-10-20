import { afterEach, describe, expect, it } from 'vitest';
import { continuePart, deleteBook, getBook, groupBooks, nextPart, saveRemoteBook, setLessonDone, updateBook } from './books';
import type { Book, RemoteBook } from './books';
import { createDb } from './db';
import type { LinguaDB } from './db';
import type { Media, PlaybackProgress } from './types';

const open: LinguaDB[] = [];
function freshDb(): LinguaDB {
  const db = createDb(`books-${Math.random().toString(36).slice(2)}`);
  open.push(db);
  return db;
}
afterEach(async () => {
  await Promise.all(open.splice(0).map((db) => db.delete()));
});

/** A book's part, added a little after the one before. */
let clock = 1_000;
function part(bookId: string, episode: number, extra: Partial<Media> = {}): Media {
  clock += 10;
  return { id: `${bookId}-${episode}`, lang: 'es', kind: 'audio', title: `Parte ${episode}`, bookId, episode, createdAt: clock, updatedAt: clock, ...extra };
}

const bookOf = (parts: Media[]): Book => groupBooks(parts)[0];
const progress = (mediaId: string, completed: 0 | 1): [string, PlaybackProgress] => [mediaId, { mediaId, positionMs: 1000, rate: 1, completed, updatedAt: 1 }];

describe('groupBooks', () => {
  it('gathers each book’s parts in order, with its title, author, kind, length and cover', () => {
    const platero = [
      part('platero', 3, { collection: 'Platero y yo', durationMs: 300_000, coverUrl: 'https://example.org/3.jpg' }),
      part('platero', 1, { collection: 'Platero y yo', durationMs: 100_000 }),
      part('platero', 2, { collection: 'Platero y yo', artist: 'Juan Ramón Jiménez', durationMs: 200_000, coverUrl: 'https://example.org/2.jpg' }),
      part('platero', 4, { collection: 'Platero y yo', durationMs: 999_000, deletedAt: 5 }),
    ];
    const course = [part('curso', 1, { bookKind: 'course', doneAt: 50 }), part('curso', 2, { bookKind: 'course', doneAt: 60 }), part('curso', 3, { bookKind: 'course' })];
    const loose: Media = { id: 'song', lang: 'es', kind: 'audio', title: 'Canción', createdAt: 1, updatedAt: 1 };
    const books = groupBooks([...platero, loose, ...course]);

    expect(books.map((b) => b.id).sort()).toEqual(['curso', 'platero']);
    const book = books.find((b) => b.id === 'platero')!;
    expect(book.parts.map((p) => p.episode)).toEqual([1, 2, 3]);
    expect(book).toMatchObject({ title: 'Platero y yo', author: 'Juan Ramón Jiménez', kind: 'audiobook', durationMs: 600_000, coverUrl: 'https://example.org/2.jpg', done: 0, lang: 'es' });
    expect(book.createdAt).toBe(platero[0].createdAt);

    const lessons = books.find((b) => b.id === 'curso')!;
    expect(lessons).toMatchObject({ kind: 'course', done: 2, title: 'Parte 1' });
    expect(lessons.author).toBeUndefined();
    expect(lessons.durationMs).toBeUndefined();
  });

  it('gives a length only when every part’s is known, and orders parts of the same number by when they were added', () => {
    const parts = [part('b', 2, { durationMs: 1000, id: 'later' }), part('b', 1, { durationMs: 1000 }), part('b', 2, { id: 'sooner' })];
    parts[2].createdAt = 1;
    const book = bookOf(parts);
    expect(book.durationMs).toBeUndefined();
    expect(book.parts.map((p) => p.id)).toEqual(['b-1', 'sooner', 'later']);
  });

  it('puts the book played (or added) last first, and leaves out a book whose parts are all removed', () => {
    const books = groupBooks([
      part('old', 1, { createdAt: 100 }),
      part('played', 1, { createdAt: 50, lastPlayedAt: 9_000 }),
      part('played', 2, { createdAt: 50, lastPlayedAt: 4_000 }),
      part('new', 1, { createdAt: 5_000 }),
      part('gone', 1, { createdAt: 10_000, deletedAt: 10_001 }),
    ]);
    expect(books.map((b) => b.id)).toEqual(['played', 'new', 'old']);
    expect(books[0].lastPlayedAt).toBe(9_000);
    expect(books[1].lastPlayedAt).toBeUndefined();
  });

  it('takes the cover stored on the device from the first part that has one', () => {
    const book = bookOf([part('b', 1), part('b', 2, { coverBlobId: 'cover-2' }), part('b', 3, { coverBlobId: 'cover-3' })]);
    expect(book.coverBlobId).toBe('cover-2');
    expect(bookOf([part('c', 1), part('c', 2)]).coverBlobId).toBeUndefined();
  });
});

describe('nextPart', () => {
  it('steps forward and back through a book, null at either end and past removed parts', async () => {
    const db = freshDb();
    const [one, two, three] = [part('b', 1), part('b', 2), part('b', 3)];
    await db.media.bulkAdd([three, one, two, part('other', 1)]);
    expect((await nextPart(one, 1, db))?.id).toBe('b-2');
    expect((await nextPart(two, 1, db))?.id).toBe('b-3');
    expect((await nextPart(two, -1, db))?.id).toBe('b-1');
    expect(await nextPart(three, 1, db)).toBeNull();
    expect(await nextPart(one, -1, db)).toBeNull();
    await db.media.update('b-2', { deletedAt: 5 });
    expect((await nextPart(one, 1, db))?.id).toBe('b-3');
    expect((await nextPart(three, -1, db))?.id).toBe('b-1');
    expect(await nextPart({ id: 'song', bookId: undefined }, 1, db)).toBeNull();
    expect(await nextPart({ id: 'nope', bookId: 'b' }, 1, db)).toBeNull();
  });
});

describe('continuePart', () => {
  it('a course carries on at its first lesson not done', () => {
    const course = bookOf([part('c', 1, { bookKind: 'course', doneAt: 1 }), part('c', 2, { bookKind: 'course' }), part('c', 3, { bookKind: 'course', lastPlayedAt: 900 })]);
    expect(continuePart(course).id).toBe('c-2');
  });

  it('a course with every lesson done goes after the one played last', () => {
    const done = { bookKind: 'course' as const, doneAt: 1 };
    const course = bookOf([part('c', 1, done), part('c', 2, { ...done, lastPlayedAt: 900 }), part('c', 3, { ...done, lastPlayedAt: 100 })]);
    expect(continuePart(course).id).toBe('c-3');
  });

  it('an audiobook starts at the first part, then keeps to the part played last until it is finished', () => {
    const fresh = bookOf([part('a', 1), part('a', 2), part('a', 3)]);
    expect(continuePart(fresh).id).toBe('a-1');

    const book = bookOf([part('a', 1, { lastPlayedAt: 100 }), part('a', 2, { lastPlayedAt: 900 }), part('a', 3)]);
    expect(continuePart(book).id).toBe('a-2');
    expect(continuePart(book, new Map([progress('a-2', 0)])).id).toBe('a-2');
    expect(continuePart(book, new Map([progress('a-2', 1)])).id).toBe('a-3');
    // Finishing a part that was played earlier changes nothing.
    expect(continuePart(book, new Map([progress('a-1', 1)])).id).toBe('a-2');
  });

  it('stays on the last part once it is finished', () => {
    const book = bookOf([part('a', 1, { lastPlayedAt: 100 }), part('a', 2, { lastPlayedAt: 900 })]);
    expect(continuePart(book, new Map([progress('a-2', 1)])).id).toBe('a-2');
  });
});

describe('changing a book', () => {
  it('writes every part: title, author, kind and the read-along text, and null stops reading along', async () => {
    const db = freshDb();
    await db.media.bulkAdd([part('b', 1, { collection: 'Viejo', artist: 'Nadie' }), part('b', 2, { collection: 'Viejo' }), part('b', 3, { deletedAt: 5 }), part('other', 1, { collection: 'Otro' })]);
    await updateBook('b', { title: '  Marianela ', author: 'Benito Pérez Galdós', kind: 'course', readAlongTextId: 'text-1' }, db);
    for (const id of ['b-1', 'b-2']) {
      const row = (await db.media.get(id))!;
      expect(row).toMatchObject({ collection: 'Marianela', artist: 'Benito Pérez Galdós', bookKind: 'course', readAlongTextId: 'text-1' });
      expect(row.updatedAt).toBeGreaterThan(row.createdAt);
    }
    expect((await db.media.get('b-3'))?.collection).toBeUndefined();
    expect((await db.media.get('other-1'))?.collection).toBe('Otro');
    expect(await getBook('b', db)).toMatchObject({ title: 'Marianela', author: 'Benito Pérez Galdós', kind: 'course', readAlongTextId: 'text-1' });

    await updateBook('b', { readAlongTextId: null }, db);
    for (const row of await db.media.bulkGet(['b-1', 'b-2'])) {
      expect(row).not.toHaveProperty('readAlongTextId');
      expect(row?.collection).toBe('Marianela');
    }

    await updateBook('b', { title: ' ', author: '' }, db);
    const book = (await getBook('b', db))!;
    expect(book.title).toBe('Untitled');
    expect(book.author).toBeUndefined();
  });

  it('marks a lesson done and not done again', async () => {
    const db = freshDb();
    await db.media.add(part('c', 1, { bookKind: 'course' }));
    await setLessonDone('c-1', true, db);
    expect((await db.media.get('c-1'))?.doneAt).toBeGreaterThan(0);
    expect((await getBook('c', db))?.done).toBe(1);
    await setLessonDone('c-1', false, db);
    expect((await db.media.get('c-1'))?.doneAt).toBeUndefined();
    expect((await getBook('c', db))?.done).toBe(0);
  });

  it('removes a book: every part with its audio, transcript and position', async () => {
    const db = freshDb();
    await db.media.bulkAdd([part('b', 1, { blobId: 'audio-1' }), part('b', 2), part('other', 1)]);
    await db.blobs.add({ id: 'audio-1', kind: 'audio', mime: 'audio/mp4', size: 3, blob: new Blob(['abc']), createdAt: 1 });
    await db.transcripts.add({ id: 'b-1:target', mediaId: 'b-1', lang: 'es', role: 'target', source: 'whisper-groq', offsetMs: 0, cues: [], createdAt: 1, updatedAt: 1 });
    await db.playbackProgress.put({ mediaId: 'b-2', positionMs: 5000, rate: 1, completed: 0, updatedAt: 1 });
    await deleteBook('b', db);

    for (const row of await db.media.bulkGet(['b-1', 'b-2'])) expect(row?.deletedAt).toBeGreaterThan(0);
    expect(await getBook('b', db)).toBeNull();
    expect(await db.blobs.get('audio-1')).toBeUndefined();
    expect((await db.transcripts.get('b-1:target'))?.deletedAt).toBeGreaterThan(0);
    expect(await db.playbackProgress.get('b-2')).toBeUndefined();
    expect((await db.media.get('other-1'))?.deletedAt).toBeUndefined();
  });
});

describe('saveRemoteBook', () => {
  const input: RemoteBook = {
    lang: 'es',
    bookId: 'librivox-marianela',
    title: 'Marianela',
    author: 'Benito Pérez Galdós',
    kind: 'audiobook',
    coverUrl: 'https://archive.org/services/img/marianela',
    description: 'Una novela.',
    parts: [
      { guid: 'marianela_01.mp3', title: 'Capítulo 1', remoteUrl: 'https://archive.org/download/marianela/marianela_01.mp3', mime: 'audio/mpeg', durationMs: 600_000, sizeBytes: 4_800_000 },
      { guid: 'marianela_02.mp3', title: ' ', remoteUrl: 'https://archive.org/download/marianela/marianela_02.mp3', durationMs: 700_000 },
    ],
  };

  it('adds the parts as streaming items of one book', async () => {
    const db = freshDb();
    expect(await saveRemoteBook(input, db)).toBe('librivox-marianela');
    const book = (await getBook('librivox-marianela', db))!;
    expect(book).toMatchObject({ title: 'Marianela', author: 'Benito Pérez Galdós', kind: 'audiobook', coverUrl: input.coverUrl, durationMs: 1_300_000, lang: 'es' });
    expect(book.parts.map((p) => [p.episode, p.title, p.guid])).toEqual([
      [1, 'Capítulo 1', 'marianela_01.mp3'],
      [2, 'Part 2', 'marianela_02.mp3'],
    ]);
    expect(book.parts[0]).toMatchObject({ kind: 'audio', remoteUrl: input.parts[0].remoteUrl, mime: 'audio/mpeg', sizeBytes: 4_800_000, bookKind: 'audiobook', description: 'Una novela.' });
    expect(book.parts[0].blobId).toBeUndefined();
  });

  it('adds nothing the second time, and only the new parts when there are more', async () => {
    const db = freshDb();
    await saveRemoteBook(input, db);
    const before = await db.media.toArray();
    await saveRemoteBook(input, db);
    expect(await db.media.toArray()).toEqual(before);

    const third = { guid: 'marianela_03.mp3', title: 'Capítulo 3', remoteUrl: 'https://archive.org/download/marianela/marianela_03.mp3' };
    await saveRemoteBook({ ...input, parts: [...input.parts, third] }, db);
    const book = (await getBook('librivox-marianela', db))!;
    expect(book.parts.map((p) => p.guid)).toEqual(['marianela_01.mp3', 'marianela_02.mp3', 'marianela_03.mp3']);
    expect(book.parts[2].episode).toBe(3);
    expect(book.parts.slice(0, 2)).toEqual(before.sort((a, b) => (a.episode ?? 0) - (b.episode ?? 0)));
    expect(book.durationMs).toBeUndefined();
  });
});
