// The Russian (Cyrillic) alphabet: 33 letters, from the ones that look and sound as in English to
// the two signs. Names and sounds checked against Wikipedia's "Russian alphabet" and Wade,
// A Comprehensive Russian Grammar; romanization is a simple BGN/PCGN style.
import type { Letter, Script, ScriptGroup } from '../types.ts';
import words from '../words/ru.ts';

type Row = [upper: string, lower: string, name: string, latin: string, sound: string];
const group = (id: string, title: string, note: string, rows: Row[]): ScriptGroup => ({
  id,
  title,
  note,
  reading: words.byGroup[id] ?? [],
  writable: true,
  letters: rows.map(([glyph, lower, name, latin, sound]): Letter => ({
    id: lower,
    glyph,
    lower,
    name,
    latin,
    sound,
    words: words.byLetter[lower] ?? [],
  })),
});

const script: Script = {
  lang: 'ru',
  name: 'Cyrillic',
  summary: 'Thirty-three letters. Six look and sound as in English, six look familiar but sound different, and the rest are new.',
  groups: [
    group('friends', 'Old friends', 'They look and sound much as in English.', [
      ['А', 'а', 'а', 'a', 'a as in "father"'],
      ['К', 'к', 'ка', 'k', 'k as in "skin" (no puff of air)'],
      ['М', 'м', 'эм', 'm', 'm as in "map"'],
      ['О', 'о', 'о', 'o', 'o as in "more" when stressed; unstressed it sounds like a'],
      ['Т', 'т', 'тэ', 't', 't as in "stop"'],
      ['Е', 'е', 'е', 'e', 'ye as in "yes"; after a consonant, softens it and sounds like e in "met"'],
    ]),
    group('false', 'False friends', 'They look like English letters but sound different.', [
      ['В', 'в', 'вэ', 'v', 'v as in "van"'],
      ['Н', 'н', 'эн', 'n', 'n as in "net"'],
      ['Р', 'р', 'эр', 'r', 'a rolled r, the tip of the tongue tapping'],
      ['С', 'с', 'эс', 's', 's as in "sun"'],
      ['У', 'у', 'у', 'u', 'oo as in "boot"'],
      ['Х', 'х', 'ха', 'kh', 'ch as in Scottish "loch"'],
    ]),
    group('new1', 'New shapes', 'Letters from the Greek alphabet, mostly.', [
      ['Б', 'б', 'бэ', 'b', 'b as in "bed"'],
      ['Г', 'г', 'гэ', 'g', 'g as in "go"'],
      ['Д', 'д', 'дэ', 'd', 'd as in "dog"'],
      ['З', 'з', 'зэ', 'z', 'z as in "zoo"'],
      ['И', 'и', 'и', 'i', 'ee as in "meet"'],
      ['Й', 'й', 'и краткое', 'y', 'y as in "boy": a short i that ends a sound'],
      ['Л', 'л', 'эль', 'l', 'l as in "full", said further back'],
      ['П', 'п', 'пэ', 'p', 'p as in "spin"'],
    ]),
    group('new2', 'Hissing sounds', 'The letters for sh, ch, ts and their kin.', [
      ['Ж', 'ж', 'жэ', 'zh', 's as in "pleasure", said hard'],
      ['Ф', 'ф', 'эф', 'f', 'f as in "fun"'],
      ['Ц', 'ц', 'цэ', 'ts', 'ts as in "cats"'],
      ['Ч', 'ч', 'че', 'ch', 'ch as in "cheese", always soft'],
      ['Ш', 'ш', 'ша', 'sh', 'sh as in "shop", said hard with the tongue back'],
      ['Щ', 'щ', 'ща', 'shch', 'a long, soft sh, as in "fresh sheets"'],
    ]),
    group('vowels', 'More vowels', 'Four vowels that start with a y sound, and ы.', [
      ['Ё', 'ё', 'ё', 'yo', 'yo as in "yolk"; always stressed'],
      ['Ю', 'ю', 'ю', 'yu', 'you as in "youth"'],
      ['Я', 'я', 'я', 'ya', 'ya as in "yard"'],
      ['Э', 'э', 'э', 'e', 'e as in "met"'],
      ['Ы', 'ы', 'ы', 'y', 'between the i in "bit" and the oo in "good", with the tongue pulled back'],
    ]),
    group('signs', 'The two signs', 'They have no sound of their own.', [
      ['Ь', 'ь', 'мягкий знак', "'", 'the soft sign: makes the consonant before it soft, as if a y were starting'],
      ['Ъ', 'ъ', 'твёрдый знак', '"', 'the hard sign: keeps the consonant before it hard, with a short break'],
    ]),
  ],
  sources: [
    {
      name: 'Wikipedia, Russian alphabet',
      url: 'https://en.wikipedia.org/wiki/Russian_alphabet',
    },
    { name: 'Wade, A Comprehensive Russian Grammar' },
  ],
  notes: ['Handwritten (cursive) shapes differ from print, especially т, д, г and и; writing practice uses the printed shapes.'],
};

export default script;
