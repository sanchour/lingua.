export interface TokenLink {
  sourceIndices: number[];
  targetIndices: number[];
  label?: string;
  note?: string;
}

export interface AlignmentPair {
  id: string;
  fromLang: string;
  toLang: string;
  sourceText: string;
  targetText: string;
  sourceTokens: string[];
  targetTokens: string[];
  links: TokenLink[];
  shiftNote?: string;
}

export const ALIGNMENT_PAIRS: AlignmentPair[] = [
  // Spanish: Subject inversion / Subjunctive clause
  {
    id: 'align-es-1',
    fromLang: 'en',
    toLang: 'es',
    sourceText: 'I want you to come early.',
    targetText: 'Quiero que vengas temprano.',
    sourceTokens: ['I', 'want', 'you', 'to come', 'early'],
    targetTokens: ['Quiero', 'que', 'vengas', 'temprano'],
    links: [
      { sourceIndices: [0, 1], targetIndices: [0], label: 'verb: querer', note: '"Quiero" absorbs the pronoun "I" (pro-drop).' },
      { sourceIndices: [2, 3], targetIndices: [1, 2], label: 'subjunctive clause', note: '"you to come" becomes a subordinate subjunctive clause "que vengas".' },
      { sourceIndices: [4], targetIndices: [3], label: 'adverb' },
    ],
    shiftNote: 'English uses an accusative + infinitive construction ("want you to come"), while Spanish requires a subordinate subjunctive clause ("que vengas").',
  },
  // French: Devoir + Infinitive
  {
    id: 'align-fr-1',
    fromLang: 'en',
    toLang: 'fr',
    sourceText: 'I need to leave now.',
    targetText: 'Je dois partir maintenant.',
    sourceTokens: ['I', 'need', 'to leave', 'now'],
    targetTokens: ['Je', 'dois', 'partir', 'maintenant'],
    links: [
      { sourceIndices: [0], targetIndices: [0], label: 'subject pronoun' },
      { sourceIndices: [1], targetIndices: [1], label: 'modal verb: devoir' },
      { sourceIndices: [2], targetIndices: [2], label: 'infinitive' },
      { sourceIndices: [3], targetIndices: [3], label: 'temporal adverb' },
    ],
    shiftNote: 'French expresses English "need to" cleanly with the modal verb "devoir" followed by an infinitive.',
  },
  // German: V2 Word Order Inversion
  {
    id: 'align-de-1',
    fromLang: 'en',
    toLang: 'de',
    sourceText: 'Tomorrow I am going to school.',
    targetText: 'Morgen gehe ich zur Schule.',
    sourceTokens: ['Tomorrow', 'I', 'am going', 'to', 'school'],
    targetTokens: ['Morgen', 'gehe', 'ich', 'zur', 'Schule'],
    links: [
      { sourceIndices: [0], targetIndices: [0], label: 'Position 1: adverb' },
      { sourceIndices: [2], targetIndices: [1], label: 'Position 2: finite verb (V2 rule)', note: 'German forces the finite verb into second position.' },
      { sourceIndices: [1], targetIndices: [2], label: 'Position 3: inverted subject', note: 'Subject inverts immediately after the verb.' },
      { sourceIndices: [3, 4], targetIndices: [3, 4], label: 'prepositional phrase' },
    ],
    shiftNote: 'Crucial word order inversion: English keeps Subject-Verb order ("Tomorrow I go"), while German strictly enforces the V2 rule ("Morgen gehe ich").',
  },
  // Italian: Piacere Indirect Construction + Adjective Order
  {
    id: 'align-it-1',
    fromLang: 'en',
    toLang: 'it',
    sourceText: 'I like Italian food very much.',
    targetText: 'Mi piace molto il cibo italiano.',
    sourceTokens: ['I', 'like', 'Italian', 'food', 'very much'],
    targetTokens: ['Mi', 'piace', 'molto', 'il cibo', 'italiano'],
    links: [
      { sourceIndices: [0], targetIndices: [0], label: 'indirect object pronoun', note: '"Mi" = to me.' },
      { sourceIndices: [1], targetIndices: [1], label: 'verb: piacere', note: '"piace" = is pleasing.' },
      { sourceIndices: [4], targetIndices: [2], label: 'degree adverb' },
      { sourceIndices: [3], targetIndices: [3], label: 'grammatical subject', note: '"il cibo" is the subject that pleases.' },
      { sourceIndices: [2], targetIndices: [4], label: 'post-nominal adjective', note: 'In Italian, adjectives typically follow the noun.' },
    ],
    shiftNote: 'Two major structural shifts: (1) Syntactic inversion where the English object becomes the Italian subject ("il cibo piace a me"); (2) Postpositive adjective placement ("cibo italiano").',
  },
  // Russian: Dative/Genitive Possession & Zero Copula
  {
    id: 'align-ru-1',
    fromLang: 'en',
    toLang: 'ru',
    sourceText: 'I have a new car.',
    targetText: 'У меня есть новая машина.',
    sourceTokens: ['I', 'have', 'a new', 'car'],
    targetTokens: ['У меня', 'есть', 'новая', 'машина'],
    links: [
      { sourceIndices: [0], targetIndices: [0], label: 'prepositional possessor', note: '"У меня" = at me.' },
      { sourceIndices: [1], targetIndices: [1], label: 'existential verb', note: '"есть" = there is.' },
      { sourceIndices: [2], targetIndices: [2], label: 'feminine adjective' },
      { sourceIndices: [3], targetIndices: [3], label: 'nominative subject', note: 'The possessed object is the grammatical subject.' },
    ],
    shiftNote: 'Russian expresses possession with an existential construction ("У [кого] есть [что]") rather than a transitive verb "to have".',
  },
  // Chinese: Pre-verbal Time Adverbial & Measure/Verb sequencing
  {
    id: 'align-zh-1',
    fromLang: 'en',
    toLang: 'zh',
    sourceText: 'I take the subway to work every day.',
    targetText: '我每天坐地铁去上班。',
    sourceTokens: ['I', 'take the subway', 'to work', 'every day'],
    targetTokens: ['我', '每天', '坐地铁', '去上班'],
    links: [
      { sourceIndices: [0], targetIndices: [0], label: 'subject pronoun' },
      { sourceIndices: [3], targetIndices: [1], label: 'pre-verbal temporal adverbial', note: 'Chinese places time words before the verb phrase.' },
      { sourceIndices: [1], targetIndices: [2], label: 'manner/transport predicate' },
      { sourceIndices: [2], targetIndices: [3], label: 'purpose/destination predicate' },
    ],
    shiftNote: 'Word order shift: In English, "every day" appears at the end of the sentence; in Chinese, time and manner expressions strictly precede the main action verbs.',
  },
];

/** Helper to get alignment pairs for a given target language. */
export function getAlignmentPairs(lang: string): AlignmentPair[] {
  return ALIGNMENT_PAIRS.filter((p) => p.toLang === lang || p.fromLang === lang);
}

/** Scrambles a sentence into randomized word tiles for reconstruction practice. */
export function scrambleWords(text: string): { original: string; tiles: string[] } {
  const clean = text.trim();
  const words = clean.split(/\s+/).filter(Boolean);
  // Deterministic shuffle using length/char seeds
  const shuffled = [...words];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  // If shuffle accidentally equals original and length > 1, swap first two
  if (shuffled.length > 1 && shuffled.join(' ') === words.join(' ')) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }
  return { original: clean, tiles: shuffled };
}

/** Checks whether reconstructed tiles match the original text (ignoring trailing punctuation). */
export function checkReconstruction(assembled: string[], original: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[.,!?;:¿¡"']/g, '').trim();
  return norm(assembled.join(' ')) === norm(original);
}

/** Compares back-translation against source sentence to compute similarity and drift notes. */
export function analyzeBackTranslation(original: string, backTranslated: string): {
  verdict: 'preserved' | 'slight_shift' | 'drifted';
  similarity: number;
  note: string;
} {
  const normOrig = original.toLowerCase().replace(/[.,!?;:¿¡"']/g, '').trim();
  const normBack = backTranslated.toLowerCase().replace(/[.,!?;:¿¡"']/g, '').trim();

  if (normOrig === normBack) {
    return {
      verdict: 'preserved',
      similarity: 1.0,
      note: 'Perfect preservation! The meaning and syntactic structure made a full round trip intact.',
    };
  }

  const origWords = new Set(normOrig.split(/\s+/));
  const backWords = normBack.split(/\s+/);
  const common = backWords.filter((w) => origWords.has(w)).length;
  const total = Math.max(origWords.size, backWords.length);
  const similarity = total > 0 ? common / total : 0;

  if (similarity >= 0.7) {
    return {
      verdict: 'slight_shift',
      similarity,
      note: 'High fidelity with slight lexical variation. The core semantic sense is preserved.',
    };
  }

  return {
    verdict: 'drifted',
    similarity,
    note: 'Semantic drift detected. The back-translation differs significantly in vocabulary or clause structure from the original prompt.',
  };
}
