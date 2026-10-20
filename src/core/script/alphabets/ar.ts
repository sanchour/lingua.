// The Arabic alphabet: 28 letters in families that share a shape, told apart by their dots, then
// hamza, tāʾ marbūṭa, alif maqṣūra and the vowel marks. Names and sounds checked against
// Wikipedia's "Arabic alphabet" and "Arabic phonology", and Ryding, A Reference Grammar of Modern
// Standard Arabic; romanization is a common scholarly scheme (ḥ ṣ ḍ ṭ ẓ, ʿ for ʿayn, ʾ for hamza).
import type { Letter, Script, ScriptGroup } from '../types.ts';
import words from '../words/ar.ts';

type Row = [glyph: string, name: string, latin: string, sound: string];
const group = (id: string, title: string, note: string, rows: Row[], writable = true): ScriptGroup => ({
  id,
  title,
  note,
  reading: words.byGroup[id] ?? [],
  writable,
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
  lang: 'ar',
  name: 'Arabic',
  summary: 'Twenty-eight letters, written right to left. Most join the next letter and change shape with their place in a word; short vowels are small marks above and below.',
  rtl: true,
  joins: true,
  groups: [
    group('dots', 'One shape, many dots', 'The same tooth, told apart by its dots, and alif.', [
      ['ا', 'ألف', 'ā', 'alif: a long a as in "father"; it also carries hamza'],
      ['ب', 'باء', 'b', 'b as in "bed"; one dot below'],
      ['ت', 'تاء', 't', 't as in "ten"; two dots above'],
      ['ث', 'ثاء', 'th', 'th as in "thin"; three dots above'],
      ['ن', 'نون', 'n', 'n as in "net"; one dot above'],
      ['ي', 'ياء', 'y / ī', 'y as in "yes", or a long ee as in "meet"; two dots below'],
    ]),
    group(
      'vowels',
      'Short vowels',
      'Short vowels are small marks above and below a letter, shown here on ب. Most printed texts leave them out.',
      [
        ['بَ', 'فتحة', 'a', 'fatḥa, a short a: a stroke above'],
        ['بِ', 'كسرة', 'i', 'kasra, a short i: a stroke below'],
        ['بُ', 'ضمة', 'u', 'ḍamma, a short u: a small wāw above'],
        ['بْ', 'سكون', 'no vowel', 'sukūn: a small circle, the consonant has no vowel after it'],
        ['بّ', 'شدة', 'double', 'shadda: the consonant is doubled, held a little longer'],
      ],
      false,
    ),
    group('cups', 'Cups and hooks', 'ج ح خ share a shape, and so do د ذ.', [
      ['ج', 'جيم', 'j', 'j as in "jam"'],
      ['ح', 'حاء', 'ḥ', 'a breathy h from deep in the throat, like a whispered sigh'],
      ['خ', 'خاء', 'kh', 'ch as in Scottish "loch"'],
      ['د', 'دال', 'd', 'd as in "dog"; never joins the letter after it'],
      ['ذ', 'ذال', 'dh', 'th as in "this"; never joins the letter after it'],
    ]),
    group('tails', 'Tails and teeth', 'ر ز drop below the line; س ش have three teeth.', [
      ['ر', 'راء', 'r', 'a tapped or rolled r; never joins the letter after it'],
      ['ز', 'زاي', 'z', 'z as in "zoo"; never joins the letter after it'],
      ['س', 'سين', 's', 's as in "sun"'],
      ['ش', 'شين', 'sh', 'sh as in "shop"'],
    ]),
    group('emphatic', 'The heavy letters', 'Said with the back of the tongue raised, so the vowels around them sound deeper.', [
      ['ص', 'صاد', 'ṣ', 'a heavy s'],
      ['ض', 'ضاد', 'ḍ', 'a heavy d'],
      ['ط', 'طاء', 'ṭ', 'a heavy t'],
      ['ظ', 'ظاء', 'ẓ', 'a heavy th as in "this"'],
    ]),
    group('throat', 'Throat and loops', 'ع غ share a shape; ف ق have loops.', [
      ['ع', 'عين', 'ʿ', 'ʿayn: a voiced squeeze deep in the throat; no English sound is like it'],
      ['غ', 'غين', 'gh', 'a gargled r, as in French "Paris"'],
      ['ف', 'فاء', 'f', 'f as in "fun"; one dot above'],
      ['ق', 'قاف', 'q', 'a k said far back in the throat; two dots above'],
    ]),
    group('last', 'The last five', 'Tall ك and ل, round م, and ه and و.', [
      ['ك', 'كاف', 'k', 'k as in "kit"'],
      ['ل', 'لام', 'l', 'l as in "let"'],
      ['م', 'ميم', 'm', 'm as in "map"'],
      ['ه', 'هاء', 'h', 'h as in "hat", also at the end of a syllable'],
      ['و', 'واو', 'w / ū', 'w as in "wet", or a long oo as in "food"; never joins the letter after it'],
    ]),
    group(
      'extras',
      'Hamza and word endings',
      'The glottal stop, and two letters found only at the end of a word.',
      [
        ['ء', 'همزة', 'ʾ', 'hamza: the catch in the throat in "uh-oh"; often sits on ا و ي'],
        ['ة', 'تاء مربوطة', 'a / at', 'tāʾ marbūṭa: an a at the end of a word, often feminine; t when more follows'],
        ['ى', 'ألف مقصورة', 'ā', 'alif maqṣūra: a long a at the end of a word, written like ي without dots'],
      ],
      false,
    ),
  ],
  sources: [
    {
      name: 'Wikipedia, Arabic alphabet',
      url: 'https://en.wikipedia.org/wiki/Arabic_alphabet',
    },
    {
      name: 'Wikipedia, Arabic phonology',
      url: 'https://en.wikipedia.org/wiki/Arabic_phonology',
    },
    { name: 'Ryding, A Reference Grammar of Modern Standard Arabic' },
  ],
  notes: ['Words are shown fully vowelled, as in a first reader; most printed Arabic leaves the short vowels out.', 'Writing practice uses the isolated shape of each letter.'],
};

export default script;
