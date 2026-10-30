import { describe, expect, it } from 'vitest';
import type { FullDictRow } from './format';
import { editDistance, phoneticKey, rhymeTail, searchDictionaryRows } from './searchTools';

const FIXTURE_ROWS: FullDictRow[] = [
  {
    lang: 'es',
    key: 'casa',
    fold: 'casa',
    word: 'casa',
    rank: 120,
    entries: [
      {
        pos: 'noun',
        ipa: ['/ˈka.sa/'],
        senses: [{ g: ['house, home, dwelling where a family lives'] }],
        phrases: [['en casa', 'at home']],
        hom: ['caza'],
      },
    ],
  },
  {
    lang: 'es',
    key: 'caza',
    fold: 'caza',
    word: 'caza',
    rank: 2400,
    entries: [
      {
        pos: 'noun',
        ipa: ['/ˈka.sa/'],
        senses: [{ g: ['hunting, chase'] }],
        hom: ['casa'],
      },
    ],
  },
  {
    lang: 'es',
    key: 'tasa',
    fold: 'tasa',
    word: 'tasa',
    rank: 1800,
    entries: [
      {
        pos: 'noun',
        ipa: ['/ˈta.sa/'],
        senses: [{ g: ['rate, fee, valuation'] }],
      },
    ],
  },
  {
    lang: 'es',
    key: 'deshacer',
    fold: 'deshacer',
    word: 'deshacer',
    rank: 1500,
    entries: [
      {
        pos: 'verb',
        ipa: ['/des.aˈθeɾ/'],
        parts: ['des-', 'hacer'],
        senses: [{ g: ['to undo, to unpack, to take apart'] }],
      },
    ],
  },
  {
    lang: 'es',
    key: 'rapidamente',
    fold: 'rapidamente',
    word: 'rápidamente',
    rank: 950,
    entries: [
      {
        pos: 'adv',
        parts: ['rápida', '-mente'],
        senses: [{ g: ['quickly, rapidly, in a fast manner'] }],
      },
    ],
  },
];

describe('core/dictionary/searchTools (6-22)', () => {
  it('computes Damerau-Levenshtein edit distance for spelling mistakes (F1248, F1249)', () => {
    expect(editDistance('casa', 'casa')).toBe(0);
    expect(editDistance('kasa', 'casa')).toBe(1);
    expect(editDistance('csaa', 'casa')).toBe(1); // transposition
    expect(editDistance('xyz', 'casa', 2)).toBeGreaterThan(2);

    const fuzzy = searchDictionaryRows(FIXTURE_ROWS, 'kasa', { mode: 'fuzzy' });
    expect(fuzzy[0]?.row.word).toBe('casa');
  });

  it('finds words by meaning / reverse dictionary concept search (F1247, F1275, F1276)', () => {
    const res = searchDictionaryRows(FIXTURE_ROWS, 'dwelling where a family lives', { mode: 'meaning' });
    expect(res[0]?.row.word).toBe('casa');

    const undo = searchDictionaryRows(FIXTURE_ROWS, 'unpack take apart', { mode: 'meaning' });
    expect(undo[0]?.row.word).toBe('deshacer');
  });

  it('finds words by prefix and suffix (F1279) and filters by POS (F1280)', () => {
    const pref = searchDictionaryRows(FIXTURE_ROWS, 'des-', { mode: 'prefix' });
    expect(pref.map((r) => r.row.word)).toContain('deshacer');

    const suf = searchDictionaryRows(FIXTURE_ROWS, '-mente', { mode: 'suffix' });
    expect(suf.map((r) => r.row.word)).toContain('rápidamente');

    const verbsOnly = searchDictionaryRows(FIXTURE_ROWS, '', { mode: 'word', pos: 'verb' });
    expect(verbsOnly.map((r) => r.row.word)).toEqual(['deshacer']);
  });

  it('finds rhymes and similar-sounding words (F1277, F1278)', () => {
    expect(rhymeTail(FIXTURE_ROWS[0])).toBe('asa');
    const rhymes = searchDictionaryRows(FIXTURE_ROWS, 'casa', { mode: 'rhyme' });
    expect(rhymes.map((r) => r.row.word)).toContain('tasa');

    expect(phoneticKey('kasa')).toBe(phoneticKey('casa'));
    const sounds = searchDictionaryRows(FIXTURE_ROWS, 'caza', { mode: 'sound' });
    expect(sounds.map((r) => r.row.word)).toContain('casa');
  });
});
