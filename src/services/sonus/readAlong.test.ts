import { afterEach, describe, expect, it, vi } from 'vitest';
import { getBook, saveRemoteBook } from '@/data/books';
import { createDb } from '@/data/db';
import type { LinguaDB } from '@/data/db';
import { addText } from '@/data/library';
import { getTranscript, saveTranscript } from '@/data/media';
import { readAlongBook, stopReadAlong } from './readAlong';

vi.mock('@/services/audio/engine', () => ({ setCues: vi.fn() }));

const open: LinguaDB[] = [];
afterEach(async () => {
  await Promise.all(open.splice(0).map((d) => d.delete()));
});

const BOOK = [
  'El pueblo estaba lejos del mar. Nadie en la familia había visto nunca las olas.',
  'Una mañana de invierno el abuelo decidió hacer el viaje. Preparó una maleta pequeña con pan y queso. Caminó durante tres días por los montes. Al cuarto día oyó un ruido que no conocía.',
  'Cuando volvió a casa contó todo a sus nietos. Desde entonces el mar fue parte de la familia.',
];

// Whisper heard the second paragraph, after a spoken intro, with a word wrong.
const HEARD = ['Esta es una grabación de LibriVox.', 'Una mañana de invierno el abuelo decidió hacer el viaje.', 'Preparó una maleta pequeña con pan y queso.', 'Caminó durante tres días por los mantes.', 'Al cuarto día oyó un ruido que no conocía.'].map((text, i) => ({
  startMs: i * 4000,
  endMs: i * 4000 + 3800,
  text,
}));

async function setUp() {
  const db = createDb(`read-along-${Math.random().toString(36).slice(2)}`);
  open.push(db);
  const textId = await addText({ lang: 'es', title: 'El abuelo y el mar', kind: 'book', source: 'paste', chapters: [{ title: 'Uno', blocks: BOOK.map((text) => ({ t: 'p' as const, text })) }] }, db);
  const bookId = await saveRemoteBook(
    {
      lang: 'es',
      bookId: 'librivox-test',
      title: 'El abuelo y el mar',
      kind: 'audiobook',
      parts: [
        { guid: '01.mp3', title: 'Capítulo 1', remoteUrl: 'https://example.org/01.mp3' },
        { guid: '02.mp3', title: 'Capítulo 2', remoteUrl: 'https://example.org/02.mp3' },
      ],
    },
    db,
  );
  const [first, second] = (await getBook(bookId, db))!.parts;
  await saveTranscript(first.id, 'es', HEARD, 'whisper-groq', undefined, db);
  return { db, textId, bookId, first, second };
}

describe('read along', () => {
  it('times the parts that have a transcript with the book’s own sentences', async () => {
    const { db, textId, bookId, first } = await setUp();
    expect(await readAlongBook(bookId, textId, db)).toEqual({ timed: 1, 'not-found': 0, 'no-transcript': 1 });
    const t = (await getTranscript(first.id, db))!;
    expect(t.source).toBe('book');
    expect(t.cues.map((c) => c.text)).toEqual(BOOK[1].split(/(?<=\.) /));
    expect(t.cues[2].text).toContain('montes');
    expect(t.original?.source).toBe('whisper-groq');
    expect((await getBook(bookId, db))!.readAlongTextId).toBe(textId);
  });

  it('matches again from Whisper’s transcript, and stopping puts it back', async () => {
    const { db, textId, bookId, first } = await setUp();
    await readAlongBook(bookId, textId, db);
    expect(await readAlongBook(bookId, textId, db)).toMatchObject({ timed: 1 });
    expect((await getTranscript(first.id, db))!.original?.cues).toEqual(HEARD);

    await stopReadAlong(bookId, db);
    const t = (await getTranscript(first.id, db))!;
    expect(t.source).toBe('whisper-groq');
    expect(t.cues).toEqual(HEARD);
    expect(t.original).toBeUndefined();
    expect((await getBook(bookId, db))!.readAlongTextId).toBeUndefined();
  });

  it('says so when the text isn’t in the part', async () => {
    const { db, bookId, first } = await setUp();
    const other = await addText({ lang: 'es', title: 'Otro', kind: 'book', source: 'paste', chapters: [{ title: 'Uno', blocks: [{ t: 'p', text: 'Un texto que no tiene nada que ver con lo que se oye en esta grabación de ninguna manera.' }] }] }, db);
    expect(await readAlongBook(bookId, other, db)).toEqual({ timed: 0, 'not-found': 1, 'no-transcript': 1 });
    expect((await getTranscript(first.id, db))!.source).toBe('whisper-groq');
  });
});
