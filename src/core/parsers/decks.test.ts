import { zstdCompressSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import initSqlJs from 'sql.js';
import { decompress } from 'fzstd';
import { ankiScheduling, mapFields, noteText, parseMediaEntries, readApkg, readCloze } from './apkg';
import { detectDelimiter, guessColumns, readDeckTable, stripHtml, tableToNotes } from './deckCsv';

describe('word lists (CSV)', () => {
  it('detects delimiters, headers and columns', () => {
    expect(detectDelimiter('perro;dog\ngato;cat')).toBe(';');
    expect(detectDelimiter('perro\tdog\ngato\tcat')).toBe('\t');
    const table = readDeckTable('Word,Meaning,Example\nperro,dog,"El perro duerme, tranquilo."\ngato,cat,\n');
    expect(table.header).toBe(true);
    expect(guessColumns(table)).toEqual(['term', 'meaning', 'example']);
    expect(tableToNotes(table, guessColumns(table))).toEqual([
      { term: 'perro', meaning: 'dog', example: { text: 'El perro duerme, tranquilo.', translation: undefined }, tags: [] },
      { term: 'gato', meaning: 'cat', example: undefined, tags: [] },
    ]);
  });

  it('reads Anki plain-text exports and guesses columns without a header', () => {
    const table = readDeckTable('#separator:tab\n#html:true\nсобака\t<b>dog</b>\tУ меня есть собака и кошка.\tI have a dog and a cat.\n');
    expect(table.header).toBe(false);
    const roles = guessColumns(table);
    expect(roles).toEqual(['term', 'meaning', 'example', 'exampleTranslation']);
    expect(tableToNotes(table, roles)[0]).toMatchObject({ term: 'собака', meaning: 'dog', example: { translation: 'I have a dog and a cat.' } });
  });

  it('strips HTML and entities', () => {
    expect(stripHtml('<div>la&nbsp;casa</div><div>[sound:casa.mp3]the house &amp; more&#33;</div>')).toBe('la casa\nthe house & more!');
  });
});

async function makeApkg(modern: boolean): Promise<ArrayBuffer> {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run(`CREATE TABLE col (id integer, crt integer, models text, decks text);
    CREATE TABLE notes (id integer, mid integer, flds text, tags text);
    CREATE TABLE cards (id integer, nid integer, did integer, ord integer, type integer, queue integer, due integer, ivl integer, factor integer, reps integer, lapses integer, data text);`);
  const crt = 1_700_000_000;
  if (modern) {
    db.run(`CREATE TABLE notetypes (id integer, name text); CREATE TABLE fields (ntid integer, ord integer, name text); CREATE TABLE decks (id integer, name text);
      INSERT INTO notetypes VALUES (10, 'Basic (and reversed card)'), (11, 'Cloze');
      INSERT INTO fields VALUES (10, 0, 'Front'), (10, 1, 'Back'), (10, 2, 'Audio'), (11, 0, 'Text'), (11, 1, 'Back Extra');
      INSERT INTO decks VALUES (1, 'Spanish' || char(31) || 'Animals');`);
    db.run('INSERT INTO col VALUES (1, ?, ?, ?)', [crt, '', '']);
  } else {
    const models = { 10: { name: 'Basic (and reversed card)', type: 0, flds: [{ name: 'Front', ord: 0 }, { name: 'Back', ord: 1 }, { name: 'Audio', ord: 2 }] }, 11: { name: 'Cloze', type: 1, flds: [{ name: 'Text', ord: 0 }, { name: 'Back Extra', ord: 1 }] } };
    db.run('INSERT INTO col VALUES (1, ?, ?, ?)', [crt, JSON.stringify(models), JSON.stringify({ 1: { name: 'Spanish::Animals' } })]);
  }
  db.run(`INSERT INTO notes VALUES (100, 10, 'perro' || char(31) || 'dog<br>hound' || char(31) || '[sound:perro.mp3]', ' animals '),
                                  (101, 11, 'El {{c1::gato::animal}} duerme.' || char(31) || 'cat', '')`);
  db.run(`INSERT INTO cards VALUES (1, 100, 1, 0, 2, 2, 400, 30, 2500, 8, 1, '{"s":42.5,"d":4.2}'),
                                  (2, 100, 1, 1, 0, -1, 7, 0, 0, 0, 0, ''),
                                  (3, 101, 1, 0, 0, 0, 3, 0, 0, 0, 0, '')`);
  const sqlite = db.export();
  db.close();

  const zip = new JSZip();
  const audio = new Uint8Array([1, 2, 3]);
  if (modern) {
    zip.file('collection.anki21b', zstdCompressSync(sqlite));
    // MediaEntries { entries: [{ name: "perro.mp3", size: 3 }] }
    const name = new TextEncoder().encode('perro.mp3');
    const entry = [0x0a, name.length, ...name, 0x10, 3];
    zip.file('media', zstdCompressSync(new Uint8Array([0x0a, entry.length, ...entry])));
    zip.file('0', zstdCompressSync(audio));
  } else {
    zip.file('collection.anki2', sqlite);
    zip.file('media', JSON.stringify({ 0: 'perro.mp3' }));
    zip.file('0', audio);
  }
  return zip.generateAsync({ type: 'arraybuffer' });
}

describe('Anki decks (.apkg)', () => {
  for (const modern of [false, true]) {
    it(`reads ${modern ? 'new-format (2.1.50+)' : 'classic'} packages`, async () => {
      const SQL = await initSqlJs();
      const zip = await JSZip.loadAsync(await makeApkg(modern));
      const col = await readApkg(zip, SQL, decompress);
      expect(col.decks.get(1)).toBe('Spanish::Animals');
      expect(col.notes).toHaveLength(2);
      expect(col.media.get('perro.mp3')).toBe('0');
      expect(col.mediaCompressed).toBe(modern);

      const basic = col.notes.find((n) => n.id === 100)!;
      const type = col.types.get(basic.typeId)!;
      expect(mapFields(type)).toMatchObject({ term: 0, meaning: 1 });
      expect(noteText(basic, type, mapFields(type))).toMatchObject({ term: 'perro', meaning: 'dog; hound' });
      expect(basic.tags).toEqual(['animals']);
      expect(basic.cards.map((c) => c.ord)).toEqual([0, 1]);

      const cloze = col.notes.find((n) => n.id === 101)!;
      const ctype = col.types.get(cloze.typeId)!;
      expect(noteText(cloze, ctype, mapFields(ctype))).toMatchObject({ term: 'gato', meaning: 'cat', example: { text: 'El gato duerme.', cloze: [3, 7] } });
    });
  }

  it('carries scheduling over to FSRS', () => {
    const crt = 1_700_000_000;
    const review = ankiScheduling({ ord: 0, deckId: 1, type: 2, queue: 2, due: 400, ivl: 30, factor: 2500, reps: 8, lapses: 1, data: '{"s":42.5,"d":4.2}' }, crt, 0, 0)!;
    expect(review).toMatchObject({ state: 2, stability: 42.5, difficulty: 4.2, scheduledDays: 30, reps: 8, lapses: 1, suspended: 0 });
    expect(review.due).toBe((crt + 400 * 86_400) * 1000);
    const legacy = ankiScheduling({ ord: 0, deckId: 1, type: 2, queue: -1, due: 10, ivl: 12, factor: 1900, reps: 3, lapses: 0, data: '' }, crt, 0, 0)!;
    expect(legacy).toMatchObject({ stability: 12, difficulty: 7, suspended: 1 });
    expect(ankiScheduling({ ord: 0, deckId: 1, type: 0, queue: 0, due: 1, ivl: 0, factor: 0, reps: 0, lapses: 0, data: '' }, crt, 0, 0)).toBeNull();
    expect(readCloze('{{c1::a}} y {{c2::b::hint}}')).toEqual({ answer: 'a', sentence: 'a y b', span: [0, 1] });
    expect(parseMediaEntries(new Uint8Array([]))).toEqual(new Map());
  });
});
