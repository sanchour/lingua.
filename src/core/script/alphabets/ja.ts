// Japanese kana: hiragana, then katakana, row by row as Japanese children learn them (the gojūon
// order), each with its voiced forms. Readings checked against Wikipedia's "Hiragana",
// "Katakana" and "Hepburn romanization"; romanization is modified Hepburn.
import type { Letter, Script, ScriptGroup } from '../types.ts';
import words from '../words/ja.ts';

/** Sounds that differ from what their romaji suggests to an English speaker. */
const SOUND: Record<string, string> = {
  a: 'a as in "father"',
  i: 'ee as in "meet", short',
  u: 'oo as in "food", short and with unrounded lips',
  e: 'e as in "met"',
  o: 'o as in "more", short',
  shi: 'she, short',
  chi: 'chee as in "cheese", short',
  tsu: 'ts as in "cats", then u',
  fu: 'between f and h: blow gently through rounded lips, then u',
  ji: 'jee as in "jeep", short',
  zu: 'z as in "zoo", then u',
  n: 'n said on its own, a syllable of its own; before b, p, m like m',
  o_wo: 'o, as お; used only to mark the object of a sentence',
  ra: 'a light tap between r, l and d, then a',
};
const CONSONANT: Record<string, string> = {
  k: 'k as in "skin"',
  s: 's as in "sun"',
  t: 't as in "stop"',
  n: 'n as in "net"',
  h: 'h as in "hat"',
  m: 'm as in "map"',
  y: 'y as in "yes"',
  r: 'a light tap between r, l and d',
  w: 'w as in "wet", lips barely rounded',
  g: 'g as in "go"',
  z: 'z as in "zoo"',
  d: 'd as in "dog"',
  b: 'b as in "bed"',
  p: 'p as in "spin"',
};
const soundOf = (latin: string) => SOUND[latin] ?? `${CONSONANT[latin.slice(0, -1)]}, then ${latin.slice(-1)}`;

type Row = [id: string, title: string, kana: string, latin: string[]];

const ROWS: Row[] = [
  ['vowels', 'The five vowels', 'あいうえお', ['a', 'i', 'u', 'e', 'o']],
  ['k', 'K', 'かきくけこ', ['ka', 'ki', 'ku', 'ke', 'ko']],
  ['s', 'S', 'さしすせそ', ['sa', 'shi', 'su', 'se', 'so']],
  ['t', 'T', 'たちつてと', ['ta', 'chi', 'tsu', 'te', 'to']],
  ['n', 'N', 'なにぬねの', ['na', 'ni', 'nu', 'ne', 'no']],
  ['h', 'H', 'はひふへほ', ['ha', 'hi', 'fu', 'he', 'ho']],
  ['m', 'M', 'まみむめも', ['ma', 'mi', 'mu', 'me', 'mo']],
  ['y', 'Y', 'やゆよ', ['ya', 'yu', 'yo']],
  ['r', 'R', 'らりるれろ', ['ra', 'ri', 'ru', 're', 'ro']],
  ['w', 'W, and n', 'わをん', ['wa', 'o', 'n']],
  ['voiced1', 'Voiced: g and z', 'がぎぐげござじずぜぞ', ['ga', 'gi', 'gu', 'ge', 'go', 'za', 'ji', 'zu', 'ze', 'zo']],
  ['voiced2', 'Voiced: d, b and p', 'だぢづでどばびぶべぼぱぴぷぺぽ', ['da', 'ji', 'zu', 'de', 'do', 'ba', 'bi', 'bu', 'be', 'bo', 'pa', 'pi', 'pu', 'pe', 'po']],
];

/** Hiragana to katakana: the blocks are 0x60 apart. */
const toKatakana = (s: string) => [...s].map((c) => String.fromCodePoint(c.codePointAt(0)! + 0x60)).join('');

const NOTES: Record<string, string> = {
  vowels: 'Every kana ends in one of these five vowels, except ん.',
  s: 'し is shi, not si.',
  t: 'ち is chi and つ is tsu.',
  h: 'ふ is fu, between f and h.',
  w: 'を is said o and only marks the object; ん is a syllable on its own.',
  voiced1: 'Two small strokes (dakuten) voice a sound: k becomes g, s becomes z.',
  voiced2: 'Dakuten make t into d and h into b; a small circle (handakuten) makes h into p. ぢ and づ are rare: じ and ず are the usual spellings.',
};

function groups(set: 'Hiragana' | 'Katakana'): ScriptGroup[] {
  return ROWS.map(([id, title, kana, latin]) => {
    const chars = [...(set === 'Katakana' ? toKatakana(kana) : kana)];
    return {
      id: `${set === 'Katakana' ? 'k' : 'h'}-${id}`,
      title: id === 'vowels' || id.startsWith('voiced') || id === 'w' ? title : `The ${title} row`,
      note: NOTES[id],
      set,
      writable: true,
      reading: words.byGroup[`${set === 'Katakana' ? 'k' : 'h'}-${id}`] ?? [],
      letters: chars.map((glyph, i): Letter => {
        const l = latin[i];
        return {
          id: glyph,
          glyph,
          latin: l,
          sound: glyph === 'を' || glyph === 'ヲ' ? SOUND.o_wo : soundOf(l),
          words: words.byLetter[glyph] ?? [],
        };
      }),
    };
  });
}

const script: Script = {
  lang: 'ja',
  name: 'Kana',
  summary: 'Two syllabaries of 46 signs each: hiragana for Japanese words and endings, katakana for words from other languages. Each sign is a whole syllable.',
  groups: [...groups('Hiragana'), ...groups('Katakana')],
  sources: [
    {
      name: 'Wikipedia, Hiragana',
      url: 'https://en.wikipedia.org/wiki/Hiragana',
    },
    {
      name: 'Wikipedia, Katakana',
      url: 'https://en.wikipedia.org/wiki/Katakana',
    },
    {
      name: 'Wikipedia, Hepburn romanization',
      url: 'https://en.wikipedia.org/wiki/Hepburn_romanization',
    },
  ],
  notes: [
    'The small ゃ ゅ ょ (kya, sho…) and the small っ (a doubled consonant) appear in words and their romaji, but are not drilled as signs of their own yet.',
    'Kanji are left out: they need stroke-order data that Lingua doesn’t have yet.',
    'Writing practice checks a sign’s shape, not its stroke order.',
  ],
};

export default script;
