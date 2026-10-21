// The Georgian alphabet (Mkhedruli): 33 letters, one sound each, and no capital letters. Names
// and sounds checked against Wikipedia's "Georgian scripts" and "Georgian language" (phonology);
// romanization is the national system of 2002, where an apostrophe marks the "popped" ejectives.
import type { Letter, Script, ScriptGroup } from '../types.ts';
import words from '../words/ka.ts';

type Row = [glyph: string, name: string, latin: string, sound: string];
const group = (id: string, title: string, note: string, rows: Row[]): ScriptGroup => ({
  id,
  title,
  note,
  reading: words.byGroup[id] ?? [],
  writable: true,
  letters: rows.map(([glyph, name, latin, sound]): Letter => ({
    id: glyph,
    glyph,
    name,
    latin,
    sound,
    words: words.byLetter[glyph] ?? [],
  })),
});

const script: Script = {
  lang: 'ka',
  name: 'Georgian',
  summary: 'Thirty-three letters, each with one sound, and no capitals. Some consonants come in threes: breathy, plain and "popped".',
  groups: [
    group('vowels', 'The five vowels', 'Pure vowels, as in Spanish or Italian.', [
      ['ა', 'ანი', 'a', 'a as in "father"'],
      ['ე', 'ენი', 'e', 'e as in "met"'],
      ['ი', 'ინი', 'i', 'ee as in "meet", short'],
      ['ო', 'ონი', 'o', 'o as in "more", short'],
      ['უ', 'უნი', 'u', 'oo as in "boot", short'],
    ]),
    group('first', 'First consonants', 'Sounds much as in English.', [
      ['მ', 'მანი', 'm', 'm as in "map"'],
      ['ნ', 'ნარი', 'n', 'n as in "net"'],
      ['ლ', 'ლასი', 'l', 'l as in "lamp"'],
      ['რ', 'რაე', 'r', 'a tapped r, as in Spanish "pero"'],
      ['ს', 'სანი', 's', 's as in "sun"'],
      ['დ', 'დონი', 'd', 'd as in "dog"'],
      ['ბ', 'ბანი', 'b', 'b as in "bed"'],
      ['გ', 'განი', 'g', 'g as in "go"'],
    ]),
    group('pairs', 'Breathy and popped', 'Georgian keeps apart a breathy t, k, p and a "popped" one, said with a catch in the throat and no puff of air.', [
      ['თ', 'თანი', 't', 't with a puff of air, as in "top"'],
      ['ტ', 'ტარი', "t'", 'a popped t: no puff of air, a click from the closed throat'],
      ['ქ', 'ქანი', 'k', 'k with a puff of air, as in "kite"'],
      ['კ', 'კანი', "k'", 'a popped k: no puff of air, a click from the closed throat'],
      ['ფ', 'ფარი', 'p', 'p with a puff of air, as in "pin"'],
      ['პ', 'პარი', "p'", 'a popped p: no puff of air, a click from the closed throat'],
    ]),
    group('hiss', 'Hissing and hushing', 'S, sh, ts and ch sounds, with their popped partners.', [
      ['ვ', 'ვინი', 'v', 'v as in "van", lighter'],
      ['ზ', 'ზენი', 'z', 'z as in "zoo"'],
      ['შ', 'შინი', 'sh', 'sh as in "ship"'],
      ['ჟ', 'ჟანი', 'zh', 's as in "pleasure"'],
      ['ჩ', 'ჩინი', 'ch', 'ch as in "church", with a puff of air'],
      ['ჭ', 'ჭარი', "ch'", 'a popped ch: no puff of air'],
      ['ც', 'ცანი', 'ts', 'ts as in "cats", with a puff of air'],
      ['წ', 'წილი', "ts'", 'a popped ts: no puff of air'],
    ]),
    group('back', 'From the back of the mouth', 'Sounds made deep in the throat, and the last few.', [
      ['ხ', 'ხანი', 'kh', 'ch as in Scottish "loch"'],
      ['ღ', 'ღანი', 'gh', 'a gargled g, like the French r in "Paris"'],
      ['ყ', 'ყარი', "q'", 'a popped k made far back in the throat'],
      ['ძ', 'ძილი', 'dz', 'ds as in "adze"'],
      ['ჯ', 'ჯანი', 'j', 'j as in "jam"'],
      ['ჰ', 'ჰაე', 'h', 'h as in "hat"'],
    ]),
  ],
  sources: [
    { name: 'Wikipedia: Georgian scripts', url: 'https://en.wikipedia.org/wiki/Georgian_scripts' },
    { name: 'Wikipedia: Romanization of Georgian', url: 'https://en.wikipedia.org/wiki/Romanization_of_Georgian' },
  ],
  notes: [
    'Mtavruli, the capital-like forms used only in all-caps titles, and the letters no longer used in modern Georgian are left out.',
    'Georgian piles consonants together (მწვრთნელი, "trainer"); the reading words here are short ones.',
  ],
};

export default script;
