import type { DictForm } from '@/data/types';

export interface WordGrammarBreakdown {
  index: number;
  surface: string;
  norm: string;
  lemma: string;
  ending?: string;
  formDescription?: string;
  gloss?: string;
  role?: string;
  partOfSpeech?: string;
  clauseId?: number;
  headIndex?: number;
  depRelation?: string;
}

export interface ClauseSegment {
  id: number;
  type: 'main' | 'subordinate' | 'relative' | 'adverbial' | 'coordinate';
  text: string;
  wordIndices: number[];
  explanation?: string;
}

export interface DependencyArc {
  fromIndex: number;
  toIndex: number;
  relation: string;
}

export interface SentenceAlternativeInterpretation {
  reading: string;
  explanation: string;
}

export interface SentenceGrammarAnalysis {
  sentence: string;
  words: WordGrammarBreakdown[];
  clauses: ClauseSegment[];
  arcs: DependencyArc[];
  alternatives?: SentenceAlternativeInterpretation[];
  hasAiAnalysis: boolean;
  requiresMaxNotice?: string;
}

/** Tokenizes a sentence into words while keeping punctuation separate. */
export function tokenizeSentence(sentence: string): string[] {
  // Matches words (including accented/Cyrillic/CJK characters)
  const regex = /[\p{L}\p{N}'-]+/gu;
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(sentence)) !== null) {
    matches.push(m[0]);
  }
  return matches;
}

/** Normalize word for dictionary lookup. */
export function normalizeSurface(word: string): string {
  return word.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

/** Extracts an inflectional ending if surface differs from lemma. */
export function extractEnding(surface: string, lemma: string): string | undefined {
  const normS = surface.toLowerCase();
  const normL = lemma.toLowerCase();
  if (normS === normL) return undefined;

  // Find longest common prefix
  let commonLen = 0;
  while (commonLen < normS.length && commonLen < normL.length && normS[commonLen] === normL[commonLen]) {
    commonLen++;
  }

  if (commonLen > 1) {
    const ending = surface.slice(commonLen);
    return ending ? `-${ending}` : undefined;
  }

  return undefined;
}

/** Performs offline grammatical breakdown using tokenization and local dictionary mappings. */
export function analyzeSentenceOffline(
  sentence: string,
  _lang: string,
  dictFormsMap?: Map<string, DictForm>,
): SentenceGrammarAnalysis {
  const tokens = tokenizeSentence(sentence);
  const words: WordGrammarBreakdown[] = [];

  tokens.forEach((token, idx) => {
    const norm = normalizeSurface(token);
    const dictEntry = dictFormsMap?.get(norm);
    const lemma = dictEntry?.lemmas?.[0] ?? norm;
    const ending = extractEnding(token, lemma);
    const formDescription = dictEntry?.d;
    const gloss = dictEntry?.g;

    words.push({
      index: idx,
      surface: token,
      norm,
      lemma,
      ending,
      formDescription,
      gloss,
      clauseId: 1, // Default single clause offline
    });
  });

  // Basic clause detection based on subordinating conjunctions
  const subConjunctions = new Set([
    'que', 'porque', 'cuando', 'si', 'mientras', 'como', 'aunque', // Spanish
    'que', 'parce', 'quand', 'si', 'pendant', 'comme', 'bien',     // French
    'weil', 'dass', 'wenn', 'als', 'obwohl', 'während', 'damit',   // German
    'che', 'perché', 'quando', 'se', 'mentre', 'come', 'sebbene',  // Italian
    'что', 'потому', 'когда', 'если', 'пока', 'как', 'хотя',       // Russian
    '因为', '如果', '当', '虽然', '所以',                          // Chinese
  ]);

  const clauses: ClauseSegment[] = [];
  let currentWords: number[] = [];
  let currentType: ClauseSegment['type'] = 'main';
  let clauseId = 1;

  words.forEach((w) => {
    if (subConjunctions.has(w.norm) && currentWords.length > 0) {
      clauses.push({
        id: clauseId++,
        type: currentType,
        text: currentWords.map((i) => words[i].surface).join(' '),
        wordIndices: [...currentWords],
      });
      currentWords = [w.index];
      currentType = 'subordinate';
    } else {
      currentWords.push(w.index);
    }
  });

  if (currentWords.length > 0) {
    clauses.push({
      id: clauseId,
      type: currentType,
      text: currentWords.map((i) => words[i].surface).join(' '),
      wordIndices: [...currentWords],
    });
  }

  // Update clauseId on words
  clauses.forEach((c) => {
    c.wordIndices.forEach((i) => {
      words[i].clauseId = c.id;
    });
  });

  return {
    sentence,
    words,
    clauses,
    arcs: [],
    hasAiAnalysis: false,
    requiresMaxNotice: 'Needs Max and an API key in Settings → AI to generate dependency arcs, syntactic roles, and clause explanations.',
  };
}
