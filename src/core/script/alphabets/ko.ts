// Korean Hangul: 40 letters (jamo), vowels first, then the consonants in their plain, aspirated
// and tense series, then the combined vowels. Names and sounds checked against Wikipedia's
// "Hangul" and "Korean phonology", and Sohn, The Korean Language; romanization is the Revised
// Romanization of Korean.
import type { Letter, Script, ScriptGroup } from '../types.ts';
import words from '../words/ko.ts';

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
  lang: 'ko',
  name: 'Hangul',
  summary: 'Forty letters, built into syllable blocks: a consonant, a vowel and sometimes a final consonant. ㅇ holds the place when a syllable starts with a vowel.',
  groups: [
    group('vowels', 'Basic vowels, and ㅇ', 'Lines and short strokes: the stroke’s side tells the vowel. A syllable starting with a vowel is written with a silent ㅇ first: 아, 이.', [
      ['ㅇ', '이응', '– / ng', 'silent at the start of a syllable; ng as in "sing" at the end'],
      ['ㅏ', '아', 'a', 'a as in "father"'],
      ['ㅓ', '어', 'eo', 'aw as in "awful", with unrounded lips (like the u in "up", said longer)'],
      ['ㅗ', '오', 'o', 'o as in "more", lips rounded'],
      ['ㅜ', '우', 'u', 'oo as in "food"'],
      ['ㅡ', '으', 'eu', 'oo as in "good", with the lips spread flat'],
      ['ㅣ', '이', 'i', 'ee as in "meet"'],
    ]),
    group('yvowels', 'Y vowels', 'A second stroke adds a y sound.', [
      ['ㅑ', '야', 'ya', 'ya as in "yard"'],
      ['ㅕ', '여', 'yeo', 'yaw, as in "yawn" with unrounded lips'],
      ['ㅛ', '요', 'yo', 'yo as in "yoga"'],
      ['ㅠ', '유', 'yu', 'you as in "youth"'],
    ]),
    group('cons1', 'First consonants', 'Their shapes picture the mouth saying them.', [
      ['ㄱ', '기역', 'g / k', 'between g and k; k at the end of a syllable'],
      ['ㄴ', '니은', 'n', 'n as in "net"'],
      ['ㄷ', '디귿', 'd / t', 'between d and t; t at the end of a syllable'],
      ['ㄹ', '리을', 'r / l', 'a light tap like r between vowels; l at the end of a syllable'],
      ['ㅁ', '미음', 'm', 'm as in "map"'],
    ]),
    group('cons2', 'More consonants', 'ㅅ is s, and sh before ㅣ.', [
      ['ㅂ', '비읍', 'b / p', 'between b and p; p at the end of a syllable'],
      ['ㅅ', '시옷', 's', 's as in "sun"; sh before ㅣ; t at the end of a syllable'],
      ['ㅈ', '지읒', 'j', 'between j as in "jam" and ch; t at the end of a syllable'],
      ['ㅎ', '히읗', 'h', 'h as in "hat"'],
    ]),
    group('aspirated', 'With a puff of air', 'One more stroke adds a strong puff of air.', [
      ['ㅋ', '키읔', 'k', 'k as in "kite", with a strong puff of air'],
      ['ㅌ', '티읕', 't', 't as in "top", with a strong puff of air'],
      ['ㅍ', '피읖', 'p', 'p as in "pot", with a strong puff of air'],
      ['ㅊ', '치읓', 'ch', 'ch as in "church", with a strong puff of air'],
    ]),
    group('tense', 'Doubled consonants', 'Written twice, said tense and sharp, with no puff of air.', [
      ['ㄲ', '쌍기역', 'kk', 'a tight k as in "skin"'],
      ['ㄸ', '쌍디귿', 'tt', 'a tight t as in "stop"'],
      ['ㅃ', '쌍비읍', 'pp', 'a tight p as in "spin"'],
      ['ㅆ', '쌍시옷', 'ss', 'a tight, hissed s'],
      ['ㅉ', '쌍지읒', 'jj', 'a tight j, between "j" and "ch"'],
    ]),
    group('evowels', 'E vowels', 'In today’s Seoul speech ㅐ and ㅔ sound alike.', [
      ['ㅐ', '애', 'ae', 'e as in "met", a little more open'],
      ['ㅔ', '에', 'e', 'e as in "met"'],
      ['ㅒ', '얘', 'yae', 'ye as in "yes"'],
      ['ㅖ', '예', 'ye', 'ye as in "yes"'],
    ]),
    group('wvowels', 'Combined vowels', 'Two vowels joined: ㅗ or ㅜ first makes a w sound.', [
      ['ㅘ', '와', 'wa', 'wa as in "wander"'],
      ['ㅙ', '왜', 'wae', 'we as in "wet"'],
      ['ㅚ', '외', 'oe', 'we as in "wet" in most speech'],
      ['ㅝ', '워', 'wo', 'wo as in "wonder"'],
      ['ㅞ', '웨', 'we', 'we as in "wet"'],
      ['ㅟ', '위', 'wi', 'wee as in "week"'],
      ['ㅢ', '의', 'ui', 'eu then ee, run together; often just ee inside a word'],
    ]),
  ],
  sources: [
    { name: 'Wikipedia, Hangul', url: 'https://en.wikipedia.org/wiki/Hangul' },
    {
      name: 'Wikipedia, Korean phonology',
      url: 'https://en.wikipedia.org/wiki/Korean_phonology',
    },
    { name: 'Sohn, The Korean Language' },
  ],
  notes: [
    'Reading words are ones whose syllables have no final consonant except the last, so the letters read exactly as they are spelled; sound changes between syllables are left for later.',
    'The final consonant clusters (ㄳ, ㄺ and so on) are left out.',
    'Writing practice checks a letter’s shape, not its stroke order.',
  ],
};

export default script;
