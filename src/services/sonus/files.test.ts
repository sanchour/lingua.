import { afterEach, describe, expect, it } from 'vitest';
import { createDb } from '@/data/db';
import type { LinguaDB } from '@/data/db';
import { bookTitleFrom, commonFolder, comparePaths, decodeEntities, folderCover, importAudioFiles, importBook, isAudioFile, orderParts, readAudioTags, suggestBookTitle } from './files';

const open: LinguaDB[] = [];
function freshDb(): LinguaDB {
  const db = createDb(`files-${Math.random().toString(36).slice(2)}`);
  open.push(db);
  return db;
}
afterEach(async () => {
  await Promise.all(open.splice(0).map((db) => db.delete()));
});

const enc = new TextEncoder();
const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];

/** An MP3 that is just an ID3v2.3 tag and a few bytes: enough for the importer, which can't probe in tests. */
function mp3(frames: Record<string, string>, cover?: number[]): Uint8Array<ArrayBuffer> {
  const frame = (id: string, body: number[]) => [...enc.encode(id), ...u32(body.length), 0, 0, ...body];
  const bytes = Object.entries(frames).flatMap(([id, value]) => frame(id, [3, ...enc.encode(value)]));
  if (cover) bytes.push(...frame('APIC', [0, ...enc.encode('image/png'), 0, 3, 0, ...cover]));
  const size = bytes.length;
  return new Uint8Array([0x49, 0x44, 0x33, 3, 0, 0, (size >> 21) & 0x7f, (size >> 14) & 0x7f, (size >> 7) & 0x7f, size & 0x7f, ...bytes, 0xff, 0xfb, 0x90, 0x00]);
}

const box = (type: string, ...content: number[][]) => {
  const body = content.flat();
  return [...u32(8 + body.length), ...[...type].map((c) => c.charCodeAt(0)), ...body];
};

/** An M4B with a title, an album, a length and Nero chapters. */
function m4b(title: string, album: string, durationMs: number, chapters: Array<[string, number]>): Uint8Array<ArrayBuffer> {
  const text = (type: string, value: string) => box(type, box('data', u32(1), u32(0), [...enc.encode(value)]));
  const mvhd = box('mvhd', u32(0), u32(0), u32(0), u32(1000), u32(durationMs), new Array(80).fill(0));
  const meta = box('meta', u32(0), box('hdlr', u32(0), u32(0), [...enc.encode('mdir')], new Array(13).fill(0)), box('ilst', text('©nam', title), text('©alb', album)));
  const chpl = box('chpl', [1, 0, 0, 0], u32(0), [chapters.length], ...chapters.map(([name, ms]) => [...u32(0), ...u32(ms * 10_000), name.length, ...enc.encode(name)]));
  const moov = box('moov', mvhd, box('udta', meta, chpl));
  return new Uint8Array([...box('ftyp', [...enc.encode('M4B ')], u32(0), [...enc.encode('M4B mp42')]), ...moov, ...box('mdat', new Array(16).fill(0))]);
}

/** A file as a folder picker gives it: with its place in the folder. */
function file(path: string, bytes: BlobPart = 'x', type = ''): File {
  const f = new File([bytes], path.split('/').pop()!, { type });
  if (path.includes('/')) Object.defineProperty(f, 'webkitRelativePath', { value: path });
  return f;
}

describe('part order', () => {
  const names = (parts: Array<{ path: string }>) => parts.map((p) => p.path);

  it('counts numbers as numbers and ignores case', () => {
    expect(names(orderParts([{ path: 'Part 10.mp3' }, { path: 'part 2.mp3' }, { path: 'Part 1.mp3' }, { path: 'Part 2b.mp3' }]))).toEqual(['Part 1.mp3', 'part 2.mp3', 'Part 2b.mp3', 'Part 10.mp3']);
  });

  it('goes by track number when every part has its own', () => {
    const parts = [
      { path: 'a.mp3', track: 3 },
      { path: 'b.mp3', track: 1 },
      { path: 'c.mp3', track: 2 },
    ];
    expect(names(orderParts(parts))).toEqual(['b.mp3', 'c.mp3', 'a.mp3']);
  });

  it('falls back to names when a track number is missing or repeated', () => {
    expect(names(orderParts([{ path: 'b.mp3', track: 1 }, { path: 'c.mp3' }, { path: 'a.mp3', track: 2 }]))).toEqual(['a.mp3', 'b.mp3', 'c.mp3']);
    // Each disc counts from 1: only the folders know the order.
    const discs = [
      { path: 'Book/CD 2/01.mp3', track: 1 },
      { path: 'Book/CD 1/02.mp3', track: 2 },
      { path: 'Book/CD 10/01.mp3', track: 1 },
      { path: 'Book/CD 1/01.mp3', track: 1 },
    ];
    expect(names(orderParts(discs))).toEqual(['Book/CD 1/01.mp3', 'Book/CD 1/02.mp3', 'Book/CD 2/01.mp3', 'Book/CD 10/01.mp3']);
  });

  it('sorts folder by folder', () => {
    expect(comparePaths('Book/Disc 1/09.mp3', 'Book/Disc 1 Bonus/01.mp3')).toBeLessThan(0);
    expect(comparePaths('Book/Part 9/01.mp3', 'Book/Part 10/01.mp3')).toBeLessThan(0);
    expect(comparePaths('Track 1.mp3', 'Track 1 (encore).mp3')).toBeLessThan(0);
  });
});

describe('book titles', () => {
  it('prefers the given title, then the album the parts share', () => {
    const parts = [
      { path: 'Libro/01.mp3', title: 'Capítulo 1', album: 'El Principito' },
      { path: 'Libro/02.mp3', title: 'Capítulo 2', album: 'el principito ' },
      { path: 'Libro/03.mp3', title: 'Capítulo 3' },
    ];
    expect(bookTitleFrom(parts, '  Mi libro ')).toBe('Mi libro');
    expect(bookTitleFrom(parts, '  ')).toBe('El Principito');
  });

  it('falls back to the folder, then the first part', () => {
    const parts = [
      { path: 'Audio/El_Principito/CD 1/01.mp3', title: 'Uno', album: 'CD 1' },
      { path: 'Audio/El_Principito/CD 2/01.mp3', title: 'Dos', album: 'CD 2' },
    ];
    expect(bookTitleFrom(parts)).toBe('El Principito');
    expect(bookTitleFrom([{ path: 'Uno.mp3', title: 'Uno' }, { path: 'Dos.mp3', title: 'Dos' }])).toBe('Uno');
    expect(commonFolder(['Book/01.mp3'])).toBe('Book');
    expect(commonFolder(['01.mp3', 'Book/02.mp3'])).toBeUndefined();
  });
});

describe('folder contents', () => {
  it('keeps audio and leaves out pictures, texts, playlists and hidden files', () => {
    const kept = [file('B/01.mp3'), file('B/02.M4B'), file('B/03.ogg'), file('B/04', 'x', 'audio/mpeg')];
    const left = [file('B/cover.jpg', 'x', 'image/jpeg'), file('B/notes.txt'), file('B/book.cue'), file('B/list.m3u', 'x', 'audio/x-mpegurl'), file('B/._01.mp3'), file('__MACOSX/B/01.mp3'), file('B/.DS_Store')];
    expect(kept.every(isAudioFile)).toBe(true);
    expect(left.filter(isAudioFile)).toEqual([]);
  });

  it('finds the folder’s cover picture', () => {
    const cover = file('B/CD 1/Folder.jpg');
    expect(folderCover([file('B/01.mp3'), file('B/scan.png'), cover, file('B/back.jpg')])).toBe(cover);
    const only = file('B/art.webp');
    expect(folderCover([file('B/01.mp3'), only])).toBe(only);
    expect(folderCover([file('B/scan.png'), file('B/back.jpg')])).toBeUndefined();
  });
});

describe('tags', () => {
  it('reads an MP4 by its first bytes, whatever its name', async () => {
    const tags = await readAudioTags(file('book.aac', m4b('Uno', 'Libro', 90_000, [['A', 0], ['B', 45_000]])));
    expect(tags).toMatchObject({ mp4: true, title: 'Uno', album: 'Libro', durationMs: 90_000 });
    expect(tags.chapters).toEqual([
      { title: 'A', startMs: 0 },
      { title: 'B', startMs: 45_000 },
    ]);
  });

  it('reads ID3 with its track number, and nothing from other files', async () => {
    expect(await readAudioTags(file('a.mp3', mp3({ TIT2: 'Uno', TRCK: '4/12' })))).toMatchObject({ mp4: false, title: 'Uno', track: 4, chapters: [] });
    expect(await readAudioTags(file('a.wav', 'RIFF....WAVE'))).toEqual({ chapters: [], mp4: false });
  });

  it('decodes the HTML entities some tags keep (LibriVox’s 64 kbps files)', async () => {
    const tags = await readAudioTags(file('001.mp3', mp3({ TIT2: '001 El &aacute;guila', TALB: 'Las F&aacute;bulas de Esopo' })));
    expect(tags).toMatchObject({ title: '001 El águila', album: 'Las Fábulas de Esopo' });
    expect(decodeEntities('&Ntilde;o&ntilde;o &amp; m&uuml;de &laquo;x&raquo; &#8212; &#xe7;a, AT&T &bogus;')).toBe('Ñoño & müde «x» — ça, AT&T &bogus;');
  });

  it('suggests a title from the album, else the folder', async () => {
    expect(await suggestBookTitle([file('Libro/02.mp3', mp3({ TALB: 'Niebla' })), file('Libro/01.mp3', mp3({ TALB: 'Niebla' })), file('Libro/cover.jpg')])).toBe('Niebla');
    expect(await suggestBookTitle([file('Curso_de_español/01.mp3', mp3({ TIT2: 'Uno' })), file('Curso_de_español/02.mp3')])).toBe('Curso de español');
    expect(await suggestBookTitle([file('notes.txt')])).toBeUndefined();
  });
});

describe('importing', () => {
  it('makes a single M4B a one-part audiobook with its chapters', async () => {
    const db = freshDb();
    const chapters: Array<[string, number]> = [
      ['Uno', 0],
      ['Dos', 60_000],
      ['Tres', 120_000],
    ];
    const { ids, skipped } = await importAudioFiles('es', [file('El Principito.m4b', m4b('El Principito', 'El Principito (íntegro)', 180_000, chapters))], db);
    expect(skipped).toEqual([]);
    const media = (await db.media.get(ids[0]))!;
    expect(media).toMatchObject({ title: 'El Principito', collection: 'El Principito (íntegro)', bookKind: 'audiobook', episode: 1, durationMs: 180_000, mime: 'audio/mp4' });
    expect(media.bookId).toBeTruthy();
    expect(media.chapters?.map((c) => c.startMs)).toEqual([0, 60_000, 120_000]);
    // Stored as audio/mp4, so every browser plays it.
    expect((await db.blobs.get(media.blobId!))!.blob.type).toBe('audio/mp4');
  });

  it('keeps ordinary files as they were, and skips what the device can’t play', async () => {
    const db = freshDb();
    const { ids, skipped } = await importAudioFiles('es', [file('uno.mp3', mp3({ TIT2: 'Uno', TALB: 'Canciones' }), 'audio/mpeg'), file('dos.wma', 'x', 'audio/x-ms-wma')], db);
    expect(skipped).toEqual(['dos.wma']);
    const media = (await db.media.get(ids[0]))!;
    expect(media).toMatchObject({ title: 'Uno', collection: 'Canciones', mime: 'audio/mpeg' });
    expect(media.bookId).toBeUndefined();
    expect(media.episode).toBeUndefined();
  });

  it('makes a folder one book, its parts in natural order, with the folder’s cover', async () => {
    const db = freshDb();
    const files = [
      file('Mi_curso/Lección 10.mp3', mp3({ TPE1: 'Ana' })),
      file('Mi_curso/Lección 2.mp3', mp3({}, [9, 9])),
      file('Mi_curso/Lección 1.mp3'),
      file('Mi_curso/cover.jpg', 'jpeg', 'image/jpeg'),
      file('Mi_curso/notas.txt', 'hola'),
      file('Mi_curso/._Lección 1.mp3'),
      file('Mi_curso/extra.wma', 'x', 'audio/x-ms-wma'),
    ];
    const progress: number[] = [];
    const { bookId, ids, skipped } = await importBook('es', files, { kind: 'course', onProgress: (f) => progress.push(f) }, db);
    expect(skipped).toEqual(['extra.wma']);
    expect(progress.at(-1)).toBe(1);
    const parts = await Promise.all(ids.map(async (id) => (await db.media.get(id))!));
    expect(parts.map((p) => [p.title, p.episode])).toEqual([
      ['Lección 1', 1],
      ['Lección 2', 2],
      ['Lección 10', 3],
    ]);
    expect(parts.every((p) => p.bookId === bookId && p.bookKind === 'course' && p.collection === 'Mi curso')).toBe(true);
    expect(parts.map((p) => p.artist)).toEqual([undefined, undefined, 'Ana']);
    // Embedded art wins; the others get the folder's picture.
    const covers = await Promise.all(parts.map(async (p) => (await db.blobs.get(p.coverBlobId!))!.mime));
    expect(covers).toEqual(['image/jpeg', 'image/png', 'image/jpeg']);
  });

  it('orders by track numbers, names the book after the album, and takes the given author', async () => {
    const db = freshDb();
    const files = [file('a.mp3', mp3({ TIT2: 'Tres', TRCK: '3', TALB: 'Niebla' })), file('b.mp3', mp3({ TIT2: 'Uno', TRCK: '1', TALB: 'Niebla' })), file('c.mp3', mp3({ TIT2: 'Dos', TRCK: '2/3', TALB: 'Niebla' }))];
    const { ids } = await importBook('es', files, { kind: 'audiobook', author: ' Unamuno ' }, db);
    const parts = await Promise.all(ids.map(async (id) => (await db.media.get(id))!));
    expect(parts.map((p) => p.title)).toEqual(['Uno', 'Dos', 'Tres']);
    expect(parts.every((p) => p.collection === 'Niebla' && p.artist === 'Unamuno' && p.bookKind === 'audiobook')).toBe(true);
    expect(parts.every((p) => !p.coverBlobId)).toBe(true);
  });

  it('adds nothing when there is no audio', async () => {
    const db = freshDb();
    const { ids, skipped } = await importBook('es', [file('B/cover.jpg'), file('B/notes.txt')], { kind: 'audiobook', title: 'Nada' }, db);
    expect(ids).toEqual([]);
    expect(skipped).toEqual([]);
    expect(await db.media.count()).toBe(0);
  });
});
