// Minimal pairs (6-10): two words that differ in one sound and so in meaning. The learner hears one and says which; a pair they miss
// comes back. Hand-made for the six core languages, with what makes the difference said in words.
export interface MinimalPair {
  a: string;
  b: string;
  /** Meanings, in the same order. */
  gloss: [string, string];
  /** What differs, and where to listen. */
  contrast: string;
  /** The sounds, as sound ids (the IPA of the chart) for the learner's record. */
  sounds: [string, string];
}

export const MINIMAL_PAIRS: Record<string, MinimalPair[]> = {
  es: [
    { a: 'pero', b: 'perro', gloss: ['but', 'dog'], contrast: 'one tap of the tongue, or a roll', sounds: ['ɾ', 'r'] },
    { a: 'caro', b: 'carro', gloss: ['expensive', 'car, cart'], contrast: 'one tap of the tongue, or a roll', sounds: ['ɾ', 'r'] },
    { a: 'pino', b: 'pillo', gloss: ['pine', 'rascal'], contrast: 'n against the y/ll sound', sounds: ['n', 'ʝ'] },
    { a: 'cana', b: 'caña', gloss: ['grey hair', 'cane'], contrast: 'n against ñ', sounds: ['n', 'ɲ'] },
    { a: 'toro', b: 'todo', gloss: ['bull', 'all'], contrast: 'a tap against the soft d', sounds: ['ɾ', 'd'] },
    { a: 'mesa', b: 'misa', gloss: ['table', 'mass'], contrast: 'e against i', sounds: ['e', 'i'] },
    { a: 'poco', b: 'pico', gloss: ['little', 'peak'], contrast: 'o against i', sounds: ['o', 'i'] },
    { a: 'casa', b: 'caza', gloss: ['house', 'hunt'], contrast: 's against the Spanish “th” (in Spain)', sounds: ['s', 'θ'] },
  ],
  fr: [
    { a: 'tu', b: 'tout', gloss: ['you', 'all'], contrast: 'ü against ou', sounds: ['y', 'u'] },
    { a: 'bon', b: 'beau', gloss: ['good', 'beautiful'], contrast: 'a nasal vowel against an oral one', sounds: ['ɔ̃', 'o'] },
    { a: 'vin', b: 'vent', gloss: ['wine', 'wind'], contrast: 'two different nasal vowels', sounds: ['ɛ̃', 'ɑ̃'] },
    { a: 'dessus', b: 'dessous', gloss: ['above', 'below'], contrast: 'ü against ou', sounds: ['y', 'u'] },
    { a: 'poisson', b: 'poison', gloss: ['fish', 'poison'], contrast: 's against z', sounds: ['s', 'z'] },
    { a: 'chou', b: 'joue', gloss: ['cabbage', 'cheek'], contrast: 'ch against j', sounds: ['ʃ', 'ʒ'] },
    { a: 'peu', b: 'peur', gloss: ['little', 'fear'], contrast: 'a closed vowel against an open one', sounds: ['ø', 'œ'] },
    { a: 'thé', b: 'terre', gloss: ['tea', 'earth'], contrast: 'é against the open è', sounds: ['e', 'ɛ'] },
  ],
  de: [
    { a: 'Miete', b: 'Mitte', gloss: ['rent', 'middle'], contrast: 'a long i against a short one', sounds: ['iː', 'ɪ'] },
    { a: 'Ofen', b: 'offen', gloss: ['oven', 'open'], contrast: 'a long o against a short one', sounds: ['oː', 'ɔ'] },
    { a: 'schon', b: 'schön', gloss: ['already', 'beautiful'], contrast: 'o against ö', sounds: ['oː', 'øː'] },
    { a: 'Mutter', b: 'Mütter', gloss: ['mother', 'mothers'], contrast: 'u against ü', sounds: ['ʊ', 'ʏ'] },
    { a: 'Bahn', b: 'Bann', gloss: ['railway', 'ban'], contrast: 'a long a against a short one', sounds: ['aː', 'a'] },
    { a: 'ich', b: 'ach', gloss: ['I', 'oh'], contrast: 'the front ch against the back ch', sounds: ['ç', 'x'] },
    { a: 'Bett', b: 'Beet', gloss: ['bed', 'bed (of flowers)'], contrast: 'a short e against a long one', sounds: ['ɛ', 'eː'] },
    { a: 'Zeit', b: 'seit', gloss: ['time', 'since'], contrast: 'ts against s', sounds: ['ts', 's'] },
  ],
  ru: [
    { a: 'мат', b: 'мать', gloss: ['checkmate', 'mother'], contrast: 'a hard т against a soft ть', sounds: ['t', 't'] },
    { a: 'угол', b: 'уголь', gloss: ['corner', 'coal'], contrast: 'a hard л against a soft ль', sounds: ['ɫ', 'l'] },
    { a: 'брат', b: 'брать', gloss: ['brother', 'to take'], contrast: 'a hard т against a soft ть', sounds: ['t', 't'] },
    { a: 'быть', b: 'бить', gloss: ['to be', 'to hit'], contrast: 'ы against и', sounds: ['ɨ', 'i'] },
    { a: 'мыл', b: 'мил', gloss: ['washed', 'dear'], contrast: 'ы against и', sounds: ['ɨ', 'i'] },
    { a: 'ток', b: 'тук', gloss: ['current', 'a knock'], contrast: 'o against у', sounds: ['o', 'u'] },
    { a: 'жар', b: 'шар', gloss: ['heat', 'ball'], contrast: 'voiced ж against unvoiced ш', sounds: ['ʐ', 'ʂ'] },
    { a: 'дом', b: 'том', gloss: ['house', 'volume'], contrast: 'д against т', sounds: ['d', 't'] },
  ],
  ar: [
    { a: 'سيف', b: 'صيف', gloss: ['sword', 'summer'], contrast: 'a light s against a heavy ص', sounds: ['s', 'sˤ'] },
    { a: 'تين', b: 'طين', gloss: ['figs', 'mud'], contrast: 'a light t against a heavy ط', sounds: ['t', 'tˤ'] },
    { a: 'كلب', b: 'قلب', gloss: ['dog', 'heart'], contrast: 'k against the back q', sounds: ['k', 'q'] },
    { a: 'عين', b: 'أين', gloss: ['eye', 'where'], contrast: 'the throat sound ع against the hamza', sounds: ['ʕ', 'ʔ'] },
    { a: 'حرب', b: 'هرب', gloss: ['war', 'escape'], contrast: 'the deep ح against the light ه', sounds: ['ħ', 'h'] },
    { a: 'ثور', b: 'سور', gloss: ['bull', 'wall'], contrast: 'ث (th) against س (s)', sounds: ['θ', 's'] },
    { a: 'كتب', b: 'كاتب', gloss: ['he wrote', 'writer'], contrast: 'a short vowel against a long one', sounds: ['a(ː)', 'a(ː)'] },
    { a: 'غرب', b: 'خرب', gloss: ['west', 'ruined'], contrast: 'voiced غ against unvoiced خ', sounds: ['ɣ', 'x'] },
  ],
  zh: [
    { a: 'mā', b: 'má', gloss: ['mum', 'hemp'], contrast: 'tone 1 against tone 2', sounds: ['ā', 'á'] },
    { a: 'mǎ', b: 'mà', gloss: ['horse', 'to scold'], contrast: 'tone 3 against tone 4', sounds: ['ǎ', 'à'] },
    { a: 'shì', b: 'sì', gloss: ['to be', 'four'], contrast: 'sh against s', sounds: ['ʂ', 's'] },
    { a: 'qī', b: 'chī', gloss: ['seven', 'to eat'], contrast: 'q against ch', sounds: ['tɕʰ', 'ʈʂʰ'] },
    { a: 'bà', b: 'pà', gloss: ['dad', 'to fear'], contrast: 'unaspirated against aspirated', sounds: ['p', 'pʰ'] },
    { a: 'dà', b: 'tà', gloss: ['big', 'to tread'], contrast: 'unaspirated against aspirated', sounds: ['t', 'tʰ'] },
    { a: 'lǜ', b: 'lù', gloss: ['green', 'road'], contrast: 'ü against u', sounds: ['y', 'u'] },
    { a: 'shēn', b: 'shēng', gloss: ['deep', 'to be born'], contrast: '-n against -ng', sounds: ['n', 'ŋ'] },
  ],
};

export const pairsOf = (lang: string): MinimalPair[] => MINIMAL_PAIRS[lang] ?? [];
