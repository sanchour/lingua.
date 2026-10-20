// Mandarin: pinyin and tones, then the first characters. Sounds checked against Wikipedia's
// "Pinyin" and "Standard Chinese phonology", and Lin, The Sounds of Chinese; the characters'
// readings and meanings come from the pack (Wiktionary via kaikki.org).
import type { Letter, Script, ScriptGroup } from '../types.ts';
import words from '../words/zh.ts';

type Row = [id: string, glyph: string, latin: string, sound: string];
const group = (id: string, title: string, note: string, rows: Row[], extra: Partial<ScriptGroup> = {}): ScriptGroup => ({
  id,
  title,
  note,
  reading: words.byGroup[id] ?? [],
  writable: false,
  ...extra,
  letters: rows.map(([lid, glyph, latin, sound]): Letter => ({
    id: lid,
    glyph,
    latin,
    sound,
    words: words.byLetter[lid] ?? [],
    ...(extra.writable ? { character: true } : {}),
  })),
});

const script: Script = {
  lang: 'zh',
  name: 'Pinyin',
  summary: 'Pinyin writes Mandarin’s sounds in Latin letters: an initial, a final and a tone. Learn the four tones, the sounds, then your first characters.',
  groups: [
    group('tones', 'The four tones', 'The same syllable means different things in different tones.', [
      ['tone1', 'mā', 'high and level', 'first tone: high and flat, as if singing one note'],
      ['tone2', 'má', 'rising', 'second tone: rising, as in a surprised "what?"'],
      ['tone3', 'mǎ', 'low, dipping', 'third tone: low, dipping down and (alone) back up'],
      ['tone4', 'mà', 'sharp falling', 'fourth tone: falling sharply, as in a firm "no!"'],
      ['tone0', 'ma', 'light, no mark', 'neutral tone: light and short, with no mark'],
    ]),
    group('initials1', 'Lips and tongue tip', 'b d g have no puff of air; p t k have a strong one.', [
      ['b', 'b', 'p, no puff', 'p as in "spin", with no puff of air'],
      ['p', 'p', 'p with a puff', 'p as in "pot", with a strong puff of air'],
      ['m', 'm', 'm', 'm as in "map"'],
      ['f', 'f', 'f', 'f as in "fun"'],
      ['d', 'd', 't, no puff', 't as in "stop", with no puff of air'],
      ['t', 't', 't with a puff', 't as in "top", with a strong puff of air'],
      ['n', 'n', 'n', 'n as in "net"'],
      ['l', 'l', 'l', 'l as in "let"'],
    ]),
    group('initials2', 'Back and front', 'g k h at the back of the mouth; j q x with the tongue flat behind the lower teeth.', [
      ['g', 'g', 'k, no puff', 'k as in "skin", with no puff of air'],
      ['k', 'k', 'k with a puff', 'k as in "kite", with a strong puff of air'],
      ['h', 'h', 'h as in "loch"', 'a rough h, close to ch in Scottish "loch"'],
      ['j', 'j', 'soft j', 'like j in "jeep", with the tongue flat behind the lower teeth'],
      ['q', 'q', 'soft ch, with a puff', 'like ch in "cheap", tongue flat, with a puff of air'],
      ['x', 'x', 'soft sh', 'between s and sh, with the tongue flat behind the lower teeth'],
    ]),
    group('initials3', 'Curled and hissed', 'zh ch sh r with the tongue tip curled back; z c s at the teeth.', [
      ['zh', 'zh', 'j, tongue curled', 'like j in "judge", with the tongue tip curled back'],
      ['ch', 'ch', 'ch, tongue curled', 'like ch in "church", tongue curled back, with a puff of air'],
      ['sh', 'sh', 'sh, tongue curled', 'like sh in "shirt", with the tongue tip curled back'],
      ['r', 'r', 'r, tongue curled', 'like r in "run" with the tongue curled back, close to the s in "pleasure"'],
      ['z', 'z', 'ds', 'ds as in "beds"'],
      ['c', 'c', 'ts with a puff', 'ts as in "cats", with a puff of air'],
      ['s', 's', 's', 's as in "sun"'],
    ]),
    group('finals1', 'Simple finals', 'One vowel, or two run together.', [
      ['a', 'a', 'ah', 'a as in "father"'],
      ['o', 'o', 'aw', 'aw as in "law", sliding from a short w (bo is like "bwo")'],
      ['e', 'e', 'uh', 'uh, said with the tongue back and lips spread'],
      ['i', 'i', 'ee', 'ee as in "see"; after z c s zh ch sh r a buzz that carries the consonant on'],
      ['u', 'u', 'oo', 'oo as in "food"'],
      ['ü', 'ü', 'ü', 'say ee with rounded lips, as in German "über"; written u after j q x and y'],
      ['ai', 'ai', 'eye', 'eye as in "eye"'],
      ['ei', 'ei', 'ay', 'ay as in "day"'],
      ['ao', 'ao', 'ow', 'ow as in "cow"'],
      ['ou', 'ou', 'oh', 'oh as in "go"'],
    ]),
    group('finals2', 'Nasal finals', 'n with the tongue tip; ng at the back, as in "sing".', [
      ['an', 'an', 'ahn', 'an with the a of "father"'],
      ['en', 'en', 'un', 'un as in "under"'],
      ['ang', 'ang', 'ahng', 'ang with the a of "father"'],
      ['eng', 'eng', 'ung', 'ung as in "lung"'],
      ['ong', 'ong', 'oong', 'oong, with rounded lips'],
    ]),
    group('finals3', 'Finals with i', 'An i glide first; written with y when there is no initial (ya, ye, you…).', [
      ['ia', 'ia', 'yah', 'ya as in "yard"'],
      ['ie', 'ie', 'yeh', 'ye as in "yes"'],
      ['iao', 'iao', 'yow', 'yow as in "yowl"'],
      ['iu', 'iu', 'yoh', 'yo as in "yoga" (written iu, said iou)'],
      ['ian', 'ian', 'yen', 'yen, as the Japanese money'],
      ['in', 'in', 'een', 'een as in "seen"'],
      ['iang', 'iang', 'yahng', 'yahng, with the a of "father"'],
      ['ing', 'ing', 'eeng', 'ing as in "sing"'],
      ['iong', 'iong', 'yoong', 'yoong, with rounded lips'],
    ]),
    group('finals4', 'Finals with u and ü', 'A w glide first (written w with no initial), or ü (written yu).', [
      ['ua', 'ua', 'wah', 'wa as in "waft"'],
      ['uo', 'uo', 'waw', 'wo as in "war"'],
      ['uai', 'uai', 'why', 'why'],
      ['ui', 'ui', 'way', 'way (written ui, said uei)'],
      ['uan', 'uan', 'wahn', 'wan, with the a of "father"'],
      ['un', 'un', 'won', 'won as in "wonder" (written un, said uen)'],
      ['uang', 'uang', 'wahng', 'wahng, with the a of "father"'],
      ['üe', 'üe', 'ü-eh', 'ü then e as in "yes"'],
      ['üan', 'üan', 'ü-en', 'ü then en'],
      ['ün', 'ün', 'ün', 'ü then n'],
    ]),
    group(
      'chars',
      'First characters',
      'Simple characters that are words on their own, and parts of many others.',
      [
        ['一', '一', 'yī', 'one'],
        ['二', '二', 'èr', 'two'],
        ['三', '三', 'sān', 'three'],
        ['人', '人', 'rén', 'person'],
        ['大', '大', 'dà', 'big'],
        ['小', '小', 'xiǎo', 'small'],
        ['口', '口', 'kǒu', 'mouth'],
        ['日', '日', 'rì', 'sun, day'],
        ['月', '月', 'yuè', 'moon, month'],
        ['山', '山', 'shān', 'mountain'],
        ['水', '水', 'shuǐ', 'water'],
        ['火', '火', 'huǒ', 'fire'],
        ['木', '木', 'mù', 'tree, wood'],
        ['中', '中', 'zhōng', 'middle'],
        ['上', '上', 'shàng', 'up, on'],
        ['下', '下', 'xià', 'down, under'],
      ],
      { writable: true },
    ),
  ],
  sources: [
    { name: 'Wikipedia, Pinyin', url: 'https://en.wikipedia.org/wiki/Pinyin' },
    {
      name: 'Wikipedia, Standard Chinese phonology',
      url: 'https://en.wikipedia.org/wiki/Standard_Chinese_phonology',
    },
    { name: 'Lin, The Sounds of Chinese' },
  ],
  notes: [
    'Tone changes (a third tone before another becomes a second; 不 and 一 change too) are not drilled yet.',
    'Writing practice checks a character’s shape, not its stroke order: that needs stroke data (Make Me a Hanzi) Lingua doesn’t have yet.',
  ],
};

export default script;
