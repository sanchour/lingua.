import { afterEach, describe, expect, it, vi } from 'vitest';
import { getBook } from '@/data/books';
import { createDb } from '@/data/db';
import type { LinguaDB } from '@/data/db';
import {
  decodeEntities,
  lengthMs,
  librivoxBook,
  librivoxQuery,
  openLibrivoxBook,
  parseLibrivoxBook,
  plainDescription,
  runtimeMs,
  searchLibrivox,
  searchWords,
} from './librivox';

const open: LinguaDB[] = [];
function freshDb(): LinguaDB {
  const db = createDb(`librivox-${Math.random().toString(36).slice(2)}`);
  open.push(db);
  return db;
}
afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all(open.splice(0).map((db) => db.delete()));
});

/** A fetch that answers JSON, so tests never reach the network. */
function answering(body: unknown, status = 200) {
  const fetch = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

// Trimmed from https://archive.org/metadata/fabulas_esopo_01_librivox (2026-10-19): the 64 kbps
// copies have their titles in HTML entities, the VBR originals have them clean. Shuffled a little.
const FABULAS = {
  metadata: {
    identifier: 'fabulas_esopo_01_librivox',
    title: 'Las Fábulas de Esopo, vol. 01',
    creator: 'Townsend, George Fyler; tr. Jorge R. Rodríguez',
    description:
      'The classic Aesop\'s Fables have been translated to every language for hundreds of years. \n\nLas clásicas Fábulas de Esopo han sido traducidas a todos idiomas por cientos de años.\n\n(Summary by Fedra)\n\nFor further information, including links to online text, reader information, RSS feeds, CD cover or other formats (if available), please go to the LibriVox <a href="http://librivox.org/las-fabulas-de-esopo-vol-01/" rel="ugc nofollow">catalog page</a> for this recording.',
    language: 'spa',
    runtime: '41:37',
  },
  files: [
    { name: 'fabula_01_002_esopo_64kb.mp3', source: 'derivative', format: '64Kbps MP3', title: '002 El &aacute;guila y el escarabajo', track: '2/30', length: '02:31', size: '1209646', original: 'fabula_01_002_esopo.mp3' },
    { name: 'fabula_01_001_esopo.mp3', source: 'original', format: 'VBR MP3', title: '001 El águila, el cuervo y el pastor', track: '1/30', length: '106.62', size: '1705984' },
    { name: 'fabula_01_001_esopo_64kb.mp3', source: 'derivative', format: '64Kbps MP3', title: '001 El &aacute;guila, el cuervo y el pastor', track: '1/30', length: '01:46', size: '853343', original: 'fabula_01_001_esopo.mp3' },
    { name: 'fabula_01_002_esopo.mp3', source: 'original', format: 'VBR MP3', title: '002 El águila y el escarabajo', track: '2/30', length: '151.16', size: '2418688' },
    { name: 'fabula_01_001_esopo.ogg', source: 'derivative', format: 'Ogg Vorbis', title: '001 El águila, el cuervo y el pastor', length: '106.62', size: '1000000' },
    { name: 'fabula_01_003_esopo.mp3', source: 'original', format: 'VBR MP3', title: '003 El águila de ala cortada y la zorra', track: '3/30', length: '118.78', size: '1900544' },
    { name: 'fabula_01_003_esopo_64kb.mp3', source: 'derivative', format: '64Kbps MP3', title: '003 El &aacute;guila de ala cortada y la zorra', track: '3/30', length: '01:58', size: '950522', original: 'fabula_01_003_esopo.mp3' },
    { name: 'fabula_01_001_esopo_spectrogram.png', source: 'derivative', format: 'Spectrogram' },
    { name: 'fabulas_esopo_01_librivox.m4b', source: 'original', format: 'Audiobook' },
  ],
};

// Trimmed from https://archive.org/metadata/don_quijote_vol1_0706_librivox: here only the VBR
// files have a track number, and the 64 kbps ones must borrow it.
const QUIJOTE = {
  metadata: { title: 'Don Quijote, Volume 1', creator: 'Miguel de Cervantes Saavedra', description: '<i>Don Quijote de la Mancha</i> es una de las obras cumbre de la literatura española.' },
  files: [
    { name: 'quijote_vol1_02_cervantes.mp3', format: 'VBR MP3', title: '02: Dedication: Al Duque de Bejar & Prologo', track: '2/37', length: '1670.78', size: '26732576' },
    { name: 'quijote_vol1_02_cervantes_64kb.mp3', format: '64Kbps MP3', title: '02: Dedication: Al Duque de Bejar & Prologo', length: '27:50', size: '13366200', original: 'quijote_vol1_02_cervantes.mp3' },
    { name: 'quijote_vol1_19_cervantes.mp3', format: 'VBR MP3', title: '19: Capitulo L', track: '36/37', length: '922.88', size: '14766080' },
    { name: 'quijote_vol1_19_cervantes_64kb.mp3', format: '64Kbps MP3', title: '19: Capitulo L', length: '15:22', size: '7382958' },
    { name: 'quijote_vol1_01_cervantes.mp3', format: 'VBR MP3', title: '01: Tasa & El Rey', track: '1/37', length: '420.36', size: '6725838' },
    { name: 'quijote_vol1_01_cervantes_64kb.mp3', format: '64Kbps MP3', title: '01: Tasa & El Rey', length: '07:00', size: '3363026', original: 'quijote_vol1_01_cervantes.mp3' },
  ],
};

describe('searching LibriVox', () => {
  it('asks for the language by all its codes', () => {
    expect(librivoxQuery('es')).toBe('collection:librivoxaudio AND language:(spa)');
    expect(librivoxQuery('de')).toBe('collection:librivoxaudio AND language:(deu OR ger)');
    expect(librivoxQuery('zh')).toBe('collection:librivoxaudio AND language:(zho OR chi)');
    expect(librivoxQuery('xx')).toBeNull();
  });

  it('looks for every word in the title or the author', () => {
    expect(librivoxQuery('es', '  Cervantes  Quijote ')).toBe(
      'collection:librivoxaudio AND language:(spa) AND (title:(cervantes) OR creator:(cervantes)) AND (title:(quijote) OR creator:(quijote))',
    );
  });

  it('keeps Lucene syntax out of the words', () => {
    expect(searchWords('Pride AND (prejudice) "Austen" a+b & c:d')).toEqual(['pride', 'and', 'prejudice', 'austen', 'a', 'b', 'c', 'd']);
    expect(searchWords('\\ title:* -x~2 [y TO z]^3 {w}?/')).toEqual(['title', 'x', '2', 'y', 'to', 'z', '3', 'w']);
    expect(searchWords('one two three four five six seven eight nine')).toHaveLength(8);
    expect(searchWords('L’Avare, Molière')).toEqual(["l'avare", 'molière']);
    expect(searchWords('紅樓夢')).toEqual(['紅樓夢']);
    expect(searchWords('&& || !')).toEqual([]);
    const q = librivoxQuery('fr', 'NOT (x) OR y')!;
    expect(q).not.toMatch(/ NOT |\(x\) OR y/);
    expect(q).toContain('(title:(not) OR creator:(not))');
  });

  it('fetches the most downloaded first, 24 to a page, and reads the answer', async () => {
    // Trimmed from a real answer (language:(spa), 2026-10-19), with a creator list and the odd runtime.
    const fetch = answering({
      response: {
        numFound: 564,
        start: 24,
        docs: [
          { creator: 'Miguel de Cervantes Saavedra', downloads: 3471565, identifier: 'don_quijote_vol1_0706_librivox', runtime: '21:10:20', title: 'Don Quijote, Volume 1' },
          { creator: ['Townsend, George Fyler', 'tr. Jorge R. Rodríguez'], downloads: 3469647, identifier: 'fabulas_esopo_01_librivox', runtime: '41:37', title: 'Las Fábulas de Esopo, vol. 01' },
          { creator: 'Fujiwara no Teika (ed.)', identifier: 'hyakunin_isshu_librivox', runtime: '00:32.47', title: 'Ogura Hyakunin Isshu' },
          { identifier: 'no_title_librivox' },
        ],
      },
    });
    const { hits, total } = await searchLibrivox('es', { query: 'esopo', page: 2 });
    const url = new URL(fetch.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe('https://archive.org/advancedsearch.php');
    expect(url.searchParams.get('q')).toBe('collection:librivoxaudio AND language:(spa) AND (title:(esopo) OR creator:(esopo))');
    expect(url.searchParams.getAll('fl[]')).toEqual(['identifier', 'title', 'creator', 'downloads', 'runtime']);
    expect(url.searchParams.get('sort[]')).toBe('downloads desc');
    expect(url.searchParams.get('rows')).toBe('24');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('output')).toBe('json');
    expect(fetch.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);

    expect(total).toBe(564);
    expect(hits[0]).toEqual({
      identifier: 'don_quijote_vol1_0706_librivox',
      title: 'Don Quijote, Volume 1',
      author: 'Miguel de Cervantes Saavedra',
      downloads: 3471565,
      runtimeMs: (21 * 3600 + 10 * 60 + 20) * 1000,
      coverUrl: 'https://archive.org/services/img/don_quijote_vol1_0706_librivox',
    });
    expect(hits[1].author).toBe('Townsend, George Fyler, tr. Jorge R. Rodríguez');
    expect(hits[2].runtimeMs).toBe((32 * 60 + 47) * 1000);
    expect(hits[3]).toMatchObject({ title: 'no_title_librivox', author: undefined, runtimeMs: undefined });
  });

  it('gives an empty list for a language without a code, without asking', async () => {
    const fetch = answering({});
    expect(await searchLibrivox('xx')).toEqual({ hits: [], total: 0 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('says so when archive.org doesn’t answer', async () => {
    answering({ error: 'busy' }, 503);
    await expect(searchLibrivox('es')).rejects.toThrow('LibriVox didn’t answer.');
    answering({ error: '[BACKEND_ERROR] Invalid or no response from Elasticsearch' });
    await expect(searchLibrivox('es')).rejects.toThrow('LibriVox didn’t answer.');
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    await expect(searchLibrivox('es')).rejects.toThrow('LibriVox didn’t answer.');
  });
});

describe('text and lengths', () => {
  it('decodes HTML entities', () => {
    expect(decodeEntities('001 El &aacute;guila')).toBe('001 El águila');
    expect(decodeEntities('Espa&ntilde;a, &Uuml;ber, gar&ccedil;on, &Aring;')).toBe('España, Über, garçon, Å');
    expect(decodeEntities('caf&#233; caf&#xE9; &amp; &rsquo;s &laquo;x&raquo; Stra&szlig;e')).toBe('café café & ’s «x» Straße');
    expect(decodeEntities('Tasa & El Rey &bogus;')).toBe('Tasa & El Rey &bogus;');
    expect(decodeEntities('&aacute;').normalize('NFC')).toHaveLength(1);
  });

  it('reads lengths in seconds, mm:ss and h:mm:ss', () => {
    expect(lengthMs('106.62')).toBe(106620);
    expect(lengthMs('01:46')).toBe(106000);
    expect(lengthMs('1:02:03')).toBe(3723000);
    expect(lengthMs(undefined)).toBeUndefined();
    expect(lengthMs('')).toBeUndefined();
    expect(lengthMs('soon')).toBeUndefined();
    expect(runtimeMs('41:37')).toBe(2497000);
    expect(runtimeMs('00:32.47')).toBe(1967000);
  });

  it('makes the description plain and drops LibriVox’s footer', () => {
    const text = plainDescription(
      '<a href="https://librivox.org/">LibriVox</a> recording of Ο γάμος της Λίτσας. <br />Read in Greek by Rapunzelina.<br /><br /><div>Η Θαλίτσα είναι μια πολύ όμορφη κοπέλα.<br /></div>For further information, please go to the <a href="x">LibriVox catalog page</a>.<br /><div>For more free audio books visit librivox.org.</div>',
    );
    expect(text).toBe('LibriVox recording of Ο γάμος της Λίτσας.\nRead in Greek by Rapunzelina.\nΗ Θαλίτσα είναι μια πολύ όμορφη κοπέλα.');
    expect(plainDescription('word '.repeat(200), 40)).toMatch(/^(word ){7}word…$/);
    expect(plainDescription('<p></p>')).toBeUndefined();
  });
});

describe('a LibriVox book', () => {
  it('reads the parts from the 64 kbps copies, in track order, with the clean titles', () => {
    const book = parseLibrivoxBook('fabulas_esopo_01_librivox', FABULAS);
    expect(book.title).toBe('Las Fábulas de Esopo, vol. 01');
    expect(book.author).toBe('Townsend, George Fyler; tr. Jorge R. Rodríguez');
    expect(book.coverUrl).toBe('https://archive.org/services/img/fabulas_esopo_01_librivox');
    expect(book.description).toBe(
      'The classic Aesop\'s Fables have been translated to every language for hundreds of years.\nLas clásicas Fábulas de Esopo han sido traducidas a todos idiomas por cientos de años.\n(Summary by Fedra)',
    );
    expect(book.parts.map((p) => p.title)).toEqual(['El águila, el cuervo y el pastor', 'El águila y el escarabajo', 'El águila de ala cortada y la zorra']);
    expect(book.parts[0]).toEqual({
      guid: 'fabula_01_001_esopo_64kb.mp3',
      title: 'El águila, el cuervo y el pastor',
      remoteUrl: 'https://archive.org/download/fabulas_esopo_01_librivox/fabula_01_001_esopo_64kb.mp3',
      mime: 'audio/mpeg',
      durationMs: 106000,
      sizeBytes: 853343,
    });
  });

  it('keeps a plain & in a title and the 64 kbps copy’s own length', () => {
    const book = parseLibrivoxBook('don_quijote_vol1_0706_librivox', QUIJOTE);
    expect(book.parts.map((p) => p.guid)).toEqual(['quijote_vol1_01_cervantes_64kb.mp3', 'quijote_vol1_02_cervantes_64kb.mp3', 'quijote_vol1_19_cervantes_64kb.mp3']);
    expect(book.parts[0].title).toBe('Tasa & El Rey');
    expect(book.parts[2].durationMs).toBe((15 * 60 + 22) * 1000);
    expect(book.description).toBe('Don Quijote de la Mancha es una de las obras cumbre de la literatura española.');
  });

  it('borrows the track number from the VBR file when the 64 kbps copy has none', () => {
    // As in Don Quijote, where only the VBR files have tracks; here the names sort the other way.
    const book = parseLibrivoxBook('x', {
      metadata: { title: 'X' },
      files: [
        { name: 'epilogo.mp3', source: 'original', format: 'VBR MP3', title: 'Epílogo', track: '2/2' },
        { name: 'epilogo_64kb.mp3', source: 'derivative', format: '64Kbps MP3', title: 'Ep&iacute;logo' },
        { name: 'prologo.mp3', source: 'original', format: 'VBR MP3', title: 'Prólogo', track: '1/2' },
        { name: 'prologo_64kb.mp3', source: 'derivative', format: '64Kbps MP3', title: 'Pr&oacute;logo' },
      ],
    });
    expect(book.parts.map((p) => p.title)).toEqual(['Prólogo', 'Epílogo']);
  });

  it('takes the title from the uploaded original when the copies have it garbled', () => {
    // Trimmed from https://archive.org/metadata/art_of_war_chinese_1506_librivox: the third part's
    // copies have its title as UTF-16 read with the bytes swapped; the 128 kbps original has it right.
    const garbled = String.fromCodePoint(0xfe30, 0x33, 0x20, 0x2f, 0xff8b, 0x3b65, 0x2c7b, 0x94e);
    const book = parseLibrivoxBook('art_of_war_chinese_1506_librivox', {
      metadata: { title: '孫子兵法 (The Art of War)', creator: 'Sun Tzu 孙武' },
      files: [
        { name: 'artofwar_03_sun.mp3', source: 'derivative', format: 'VBR MP3', title: garbled, track: '3' },
        { name: 'artofwar_03_sun_128kb.mp3', source: 'original', format: '128Kbps MP3', title: '03 謀攻第三', track: '3' },
        { name: 'artofwar_03_sun_64kb.mp3', source: 'derivative', format: '64Kbps MP3', title: garbled, track: '3' },
        { name: 'artofwar_02_sun_64kb.mp3', source: 'derivative', format: '64Kbps MP3', title: '02 作戰第二', track: '2' },
      ],
    });
    expect(book.parts.map((p) => [p.title, p.guid])).toEqual([
      ['作戰第二', 'artofwar_02_sun_64kb.mp3'],
      ['謀攻第三', 'artofwar_03_sun_64kb.mp3'],
    ]);
  });

  it('falls back to the VBR files when there are no 64 kbps copies', () => {
    const vbrOnly = { ...FABULAS, files: FABULAS.files.filter((f) => f.format !== '64Kbps MP3') };
    const book = parseLibrivoxBook('fabulas_esopo_01_librivox', vbrOnly);
    expect(book.parts.map((p) => p.guid)).toEqual(['fabula_01_001_esopo.mp3', 'fabula_01_002_esopo.mp3', 'fabula_01_003_esopo.mp3']);
    expect(book.parts[0]).toMatchObject({ durationMs: 106620, sizeBytes: 1705984 });
  });

  it('orders by track when every part has its own, and decodes a title no copy has clean', () => {
    const book = parseLibrivoxBook('x', {
      metadata: { title: ['Cuentos', 'Cuentos (otra)'], creator: ['Horacio Quiroga', 'Rubén Darío'] },
      files: [
        { name: 'extra_10_64kb.mp3', format: '64Kbps MP3', title: 'Diez', track: '5/5' },
        { name: 'extra_9_64kb.mp3', format: '64Kbps MP3', title: 'Nueve', track: '4/5' },
        { name: 'z_intro_64kb.mp3', format: '64Kbps MP3', title: 'Introducci&oacute;n', track: '1' },
        { name: 'z_intro.mp3', format: 'VBR MP3', title: 'IntroducciÃ³n', track: '1' },
        { name: 'a_cap_64kb.mp3', format: '64Kbps MP3', title: 'Cap&iacute;tulo', track: '02' },
        { name: 'folder/with space_64kb.mp3', format: '64Kbps MP3', title: '', track: '3/5' },
      ],
    });
    expect(book.parts.map((p) => p.title)).toEqual(['Introducción', 'Capítulo', '', 'Nueve', 'Diez']);
    expect(book.parts[2].remoteUrl).toBe('https://archive.org/download/x/folder/with%20space_64kb.mp3');
    expect(book.title).toBe('Cuentos');
    expect(book.author).toBe('Horacio Quiroga, Rubén Darío');
    expect(book.description).toBeUndefined();
  });

  it('orders by name, numbers in natural order, when tracks are missing or repeated', () => {
    // Trimmed from https://archive.org/metadata/divina_commedia_librivox: only some 64 kbps copies
    // have a track, and the original of part 12 says 6, like part 6. Part 8's name lost its 0 here,
    // to check that numbers sort as numbers.
    const book = parseLibrivoxBook('divina_commedia_librivox', {
      metadata: { title: 'Divina Commedia', creator: 'Dante Alighieri' },
      files: [
        { name: 'divina_commedia_06_alighieri.mp3', source: 'original', format: 'VBR MP3', title: '06 - Inferno: Canti XXVI-XXX', track: '06' },
        { name: 'divina_commedia_06_alighieri_64kb.mp3', source: 'derivative', format: '64Kbps MP3', title: '06 - Inferno: Canti XXVI-XXX', track: '06', length: '41:59' },
        { name: 'divina_commedia_07_alighieri_64kb.mp3', source: 'derivative', format: '64Kbps MP3', title: '07 - Inferno: Canti XXXI-XXXIV', length: '29:50' },
        { name: 'divina_commedia_12_alighieri.mp3', source: 'original', format: 'VBR MP3', title: '12 - Purgatorio: Canti XXII-XXVII', track: '6' },
        { name: 'divina_commedia_12_alighieri_64kb.mp3', source: 'derivative', format: '64Kbps MP3', title: '12 - Purgatorio: Canti XXII-XXVII', track: '6', length: '45:35' },
        { name: 'divina_commedia_8_alighieri_64kb.mp3', source: 'derivative', format: '64Kbps MP3', title: '08 - Purgatorio: Canti I-V', track: '8', length: '47:36' },
      ],
    });
    expect(book.parts.map((p) => p.guid.split('_')[2])).toEqual(['06', '07', '8', '12']);
  });

  it('orders by name when a track number is out of range', () => {
    // Trimmed from https://archive.org/metadata/novelas_cortas_krs_librivox (tracks numbered for
    // three parts here): the VBR copy of part 13 says track 25.
    const book = parseLibrivoxBook('novelas_cortas_krs_librivox', {
      metadata: { title: 'Novelas Cortas', creator: 'Pedro Antonio de Alarcón' },
      files: [
        { name: 'novelascortas_12_alarcon.mp3', source: 'original', format: 'VBR MP3', title: '12 - Moros y Cristianos, pt. 1', track: '1/3' },
        { name: 'novelascortas_12_alarcon_64kb.mp3', source: 'derivative', format: '64Kbps MP3', title: '12 - Moros y Cristianos, pt. 1' },
        { name: 'novelascortas_13_alarcon.mp3', source: 'original', format: 'VBR MP3', title: '13 - Moros y Cristianos, pt. 2', track: '25' },
        { name: 'novelascortas_13_alarcon_64kb.mp3', source: 'derivative', format: '64Kbps MP3', title: '13 - Moros y Cristianos, pt. 2' },
        { name: 'novelascortas_14_alarcon.mp3', source: 'original', format: 'VBR MP3', title: '14 - Moros y Cristianos, pt. 3', track: '2/3' },
        { name: 'novelascortas_14_alarcon_64kb.mp3', source: 'derivative', format: '64Kbps MP3', title: '14 - Moros y Cristianos, pt. 3' },
      ],
    });
    expect(book.parts.map((p) => p.title.slice(-5))).toEqual(['pt. 1', 'pt. 2', 'pt. 3']);
  });

  it('says so when the book is missing or has no MP3s', () => {
    expect(() => parseLibrivoxBook('nope', {})).toThrow('That audiobook isn’t on archive.org.');
    expect(() => parseLibrivoxBook('x', { metadata: { title: 'X' }, files: [{ name: 'x.ogg', format: 'Ogg Vorbis' }] })).toThrow('That audiobook has no MP3 files to play.');
  });

  it('fetches the file list from archive.org’s metadata', async () => {
    const fetch = answering(FABULAS);
    const book = await librivoxBook('fabulas_esopo_01_librivox');
    expect(fetch.mock.calls[0][0]).toBe('https://archive.org/metadata/fabulas_esopo_01_librivox');
    expect(book.parts).toHaveLength(3);
  });
});

describe('opening a LibriVox book', () => {
  it('saves it as an audiobook, its parts in order, and opens it again without fetching', async () => {
    const db = freshDb();
    const fetch = answering(FABULAS);
    const bookId = await openLibrivoxBook('es', 'fabulas_esopo_01_librivox', db);
    expect(bookId).toBe('librivox-fabulas_esopo_01_librivox');

    const book = (await getBook(bookId, db))!;
    expect(book).toMatchObject({ lang: 'es', kind: 'audiobook', title: 'Las Fábulas de Esopo, vol. 01', author: 'Townsend, George Fyler; tr. Jorge R. Rodríguez' });
    expect(book.coverUrl).toBe('https://archive.org/services/img/fabulas_esopo_01_librivox');
    expect(book.parts.map((p) => [p.episode, p.title, p.guid])).toEqual([
      [1, 'El águila, el cuervo y el pastor', 'fabula_01_001_esopo_64kb.mp3'],
      [2, 'El águila y el escarabajo', 'fabula_01_002_esopo_64kb.mp3'],
      [3, 'El águila de ala cortada y la zorra', 'fabula_01_003_esopo_64kb.mp3'],
    ]);
    expect(book.parts[0]).toMatchObject({ kind: 'audio', remoteUrl: 'https://archive.org/download/fabulas_esopo_01_librivox/fabula_01_001_esopo_64kb.mp3', mime: 'audio/mpeg', durationMs: 106000 });
    expect(book.durationMs).toBe(106000 + 151000 + 118000);

    expect(await openLibrivoxBook('es', 'fabulas_esopo_01_librivox', db)).toBe(bookId);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(await db.media.count()).toBe(3);
  });

  it('saves nothing when archive.org doesn’t answer', async () => {
    const db = freshDb();
    answering({}, 500);
    await expect(openLibrivoxBook('es', 'fabulas_esopo_01_librivox', db)).rejects.toThrow('LibriVox didn’t answer.');
    expect(await db.media.count()).toBe(0);
  });
});
