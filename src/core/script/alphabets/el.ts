// The Greek alphabet: 24 letters as Modern Greek says them, then the letter pairs that make one
// sound. Names and sounds checked against Wikipedia's "Greek alphabet" and "Modern Greek
// phonology", and Holton, Mackridge & Philippaki-Warburton, Greek: A Comprehensive Grammar;
// romanization is ELOT 743.
import type { Letter, Script, ScriptGroup } from '../types.ts';
import words from '../words/el.ts';

type Row = [upper: string, lower: string, name: string, latin: string, sound: string];
const group = (id: string, title: string, note: string, rows: Row[], writable = true): ScriptGroup => ({
  id,
  title,
  note,
  reading: words.byGroup[id] ?? [],
  writable,
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
  lang: 'el',
  name: 'Greek',
  summary: 'Twenty-four letters, many of them familiar from maths and science, and a few pairs of letters that make one sound.',
  groups: [
    group('friends', 'Old friends', 'They look and sound much as in English.', [
      ['Α', 'α', 'άλφα', 'a', 'a as in "father"'],
      ['Ε', 'ε', 'έψιλον', 'e', 'e as in "met"'],
      ['Ι', 'ι', 'γιώτα', 'i', 'ee as in "meet"'],
      ['Κ', 'κ', 'κάππα', 'k', 'k as in "skin" (no puff of air)'],
      ['Μ', 'μ', 'μι', 'm', 'm as in "map"'],
      ['Ο', 'ο', 'όμικρον', 'o', 'o as in "more", short'],
      ['Τ', 'τ', 'ταυ', 't', 't as in "stop"'],
      ['Ζ', 'ζ', 'ζήτα', 'z', 'z as in "zoo"'],
    ]),
    group('false', 'False friends', 'They look like English letters but sound different.', [
      ['Β', 'β', 'βήτα', 'v', 'v as in "van"'],
      ['Η', 'η', 'ήτα', 'i', 'ee as in "meet", like ι'],
      ['Ν', 'ν', 'νι', 'n', 'n as in "net"'],
      ['Ρ', 'ρ', 'ρο', 'r', 'a tapped r, as in Spanish "pero"'],
      ['Υ', 'υ', 'ύψιλον', 'y', 'ee as in "meet", like ι and η'],
      ['Χ', 'χ', 'χι', 'ch', 'ch as in Scottish "loch"; before e and i sounds, as in German "ich"'],
    ]),
    group('new1', 'New shapes', 'Letters you may know from maths.', [
      ['Γ', 'γ', 'γάμμα', 'g', 'a soft, breathy g; before e and i sounds, y as in "yes"'],
      ['Δ', 'δ', 'δέλτα', 'd', 'th as in "this"'],
      ['Θ', 'θ', 'θήτα', 'th', 'th as in "thin"'],
      ['Λ', 'λ', 'λάμδα', 'l', 'l as in "let"'],
    ]),
    group('new2', 'More new shapes', 'The rest of the alphabet, with the sigma that ends words.', [
      ['Ξ', 'ξ', 'ξι', 'x', 'x as in "fox" (ks)'],
      ['Π', 'π', 'πι', 'p', 'p as in "spin"'],
      ['Σ', 'σ', 'σίγμα', 's', 's as in "sun"; written ς at the end of a word'],
      ['Φ', 'φ', 'φι', 'f', 'f as in "fun"'],
      ['Ψ', 'ψ', 'ψι', 'ps', 'ps as in "lips"'],
      ['Ω', 'ω', 'ωμέγα', 'o', 'o as in "more", like ο'],
    ]),
    group(
      'pairs',
      'Letter pairs',
      'Two letters, one sound. A diaeresis (ϊ, ϋ) splits a pair.',
      [
        ['ΑΙ', 'αι', 'άλφα γιώτα', 'ai', 'e as in "met", like ε'],
        ['ΕΙ', 'ει', 'έψιλον γιώτα', 'ei', 'ee as in "meet"'],
        ['ΟΙ', 'οι', 'όμικρον γιώτα', 'oi', 'ee as in "meet"'],
        ['ΟΥ', 'ου', 'όμικρον ύψιλον', 'ou', 'oo as in "food"'],
        ['ΑΥ', 'αυ', 'άλφα ύψιλον', 'av / af', 'av before a vowel or a voiced consonant, af before a voiceless one'],
        ['ΕΥ', 'ευ', 'έψιλον ύψιλον', 'ev / ef', 'ev before a vowel or a voiced consonant, ef before a voiceless one'],
        ['ΜΠ', 'μπ', 'μι πι', 'mp', 'b at the start of a word; mb inside one'],
        ['ΝΤ', 'ντ', 'νι ταυ', 'nt', 'd at the start of a word; nd inside one'],
        ['ΓΚ', 'γκ', 'γάμμα κάππα', 'gk', 'g as in "go" at the start of a word; ng as in "finger" inside one'],
        ['ΓΓ', 'γγ', 'γάμμα γάμμα', 'ng', 'ng as in "finger"'],
      ],
      false,
    ),
  ],
  sources: [
    {
      name: 'Wikipedia, Greek alphabet',
      url: 'https://en.wikipedia.org/wiki/Greek_alphabet',
    },
    {
      name: 'Wikipedia, Modern Greek phonology',
      url: 'https://en.wikipedia.org/wiki/Modern_Greek_phonology',
    },
    {
      name: 'Holton, Mackridge & Philippaki-Warburton, Greek: A Comprehensive Grammar',
    },
  ],
  notes: ['The stress mark (τόνος) is shown in words but not drilled on its own.'],
};

export default script;
