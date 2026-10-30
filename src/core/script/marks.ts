// Marks and shapes (6-23): small multiple-choice drills for what the alphabet chart doesn't teach. Accent marks and
// where they go, diacritics, ligatures, and Russian cursive. Hand-written, one fact per item, checked in marks.test.ts.
export type MarkKind = 'accent' | 'diacritic' | 'ligature' | 'cursive';
export interface MarkItem {
  kind: MarkKind;
  prompt: string;
  /** Options as written; the first is the right one (shuffled when asked). */
  options: [string, ...string[]];
  why: string;
}
export const MARK_LABEL: Record<MarkKind, string> = { accent: 'Accent marks', diacritic: 'Diacritics', ligature: 'Ligatures', cursive: 'Cursive' };

const a = (prompt: string, ok: string, wrong: string, why: string): MarkItem => ({ kind: 'accent', prompt, options: [ok, wrong], why });
const d = (prompt: string, ok: string, wrong: string, why: string): MarkItem => ({ kind: 'diacritic', prompt, options: [ok, wrong], why });

export const MARKS: Record<string, MarkItem[]> = {
  es: [
    a('“he/she is” (the verb estar)', 'está', 'esta', 'esta without a mark is “this”.'),
    a('“you” (subject)', 'tú', 'tu', 'tu without a mark is “your”.'),
    a('“yes”', 'sí', 'si', 'si without a mark is “if”.'),
    a('“song”', 'canción', 'cancion', 'Words ending in a vowel, n or s are stressed on the second-last syllable; a stress elsewhere takes a written accent.'),
    a('“telephone”', 'teléfono', 'telefono', 'Stressed on the third-last syllable: always written.'),
    a('“what” (a question)', 'qué', 'que', 'Question words carry the accent; que alone means “that”.'),
    a('“more”', 'más', 'mas', 'mas without a mark is “but”.'),
    a('“tree”', 'árbol', 'arbol', 'Stress on the first syllable of a word ending in l: written.'),
    d('“Spain”', 'España', 'Espana', 'ñ is its own letter, not n with a mark.'),
    d('“bilingual” (the ü)', 'pingüino', 'pinguino', 'ü makes the u sound after g before e or i.'),
  ],
  fr: [
    a('“where”', 'où', 'ou', 'ou without a mark is “or”.'),
    a('“there”', 'là', 'la', 'la without a mark is “the” (feminine).'),
    a('“school”', 'école', 'ecole', 'The acute é is a closed “ay” sound at the start of many words.'),
    a('“mother”', 'mère', 'mere', 'The grave è is an open sound before a consonant plus a silent e.'),
    a('“forest”', 'forêt', 'foret', 'The circumflex often stands for an s that was lost (Latin forestis).'),
    d('“boy” (the cedilla)', 'garçon', 'garcon', 'ç is a soft s before a, o and u.'),
    d('“Noël”', 'Noël', 'Noel', 'The trema ë says: pronounce the e separately from the o.'),
    d('“heart”', 'cœur', 'coeur', 'œ is one letter, a ligature of o and e.'),
  ],
  pt: [
    a('“mother”', 'mãe', 'mae', 'The tilde nasalises the vowel.'),
    a('“is” (ele ...)', 'é', 'e', 'e without a mark is “and”.'),
    a('“coffee”', 'café', 'cafe', 'Final stressed vowels are written with an accent.'),
    a('“grandmother”', 'avó', 'avo', 'avô (circumflex) is “grandfather”: the mark tells them apart.'),
    d('“heart” (the cedilla)', 'coração', 'coracao', 'ç and the tilde: the ending -ção is always written so.'),
  ],
  it: [
    a('“is”', 'è', 'e', 'e without a mark is “and”.'),
    a('“city”', 'città', 'citta', 'Words stressed on the last syllable carry the accent.'),
    a('“there”', 'là', 'la', 'la without a mark is “the”.'),
    a('“yes”', 'sì', 'si', 'si without a mark is “oneself”.'),
    a('“coffee”', 'caffè', 'caffe', 'Final stressed vowels are written with a grave accent.'),
  ],
  de: [
    d('“beautiful”', 'schön', 'schon', 'schon means “already”: the umlaut changes the word.'),
    d('“to hear”', 'hören', 'horen', 'ö is a rounded e sound, not the same as o.'),
    d('“for”', 'für', 'fur', 'ü is spoken with rounded lips, like French u.'),
    d('“street”', 'Straße', 'Strase', 'ß is a double s after a long vowel (in Switzerland, ss).'),
    d('“to be able” (ich ... )', 'können', 'konnen', 'The umlaut belongs to the infinitive and the plural (wir können); ich kann has none.'),
  ],
  ru: [
    { kind: 'ligature', prompt: 'ё is written as…', options: ['е with two dots', 'е with an acute'], why: 'ё is a separate letter, usually printed without its dots; the acute marks stress.' },
    { kind: 'cursive', prompt: 'A handwritten letter that looks like a Latin “m”', options: ['т', 'м'], why: 'Cursive т is written like a small m, often with a line above it; м has a hook at the start.' },
    { kind: 'cursive', prompt: 'A handwritten letter that looks like a Latin “u”', options: ['и', 'у'], why: 'Cursive и is a u-shape; у has a descending tail like a Latin “y”.' },
    { kind: 'cursive', prompt: 'A handwritten letter that looks like a Latin “g”', options: ['д', 'г'], why: 'Cursive д has a loop and a tail; г looks like a Latin r.' },
    { kind: 'cursive', prompt: 'A handwritten letter that looks like a Latin “r”', options: ['г', 'р'], why: 'Cursive г has a hook at the top; р has a descender.' },
  ],
  ar: [
    { kind: 'ligature', prompt: 'ل followed by ا is always written…', options: ['لا', 'ل ا'], why: 'Lām and alif join in a crossed ligature, the one compulsory ligature of Arabic.' },
    { kind: 'diacritic', prompt: 'The mark that doubles a consonant', options: ['ّ (shadda)', 'ْ (sukūn)'], why: 'Shadda doubles; sukūn says “no vowel here”.' },
  ],
};

/** Which kinds a language has drills for. */
export const marksOf = (lang: string) => MARKS[lang] ?? [];
