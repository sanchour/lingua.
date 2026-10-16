import { normalizeWord } from './normalize';

export interface Token {
  text: string;
  /** UTF-16 offset in the source string. */
  start: number;
  /** True for words we track (contain at least one letter). Punctuation, spaces and numbers are false. */
  isWord: boolean;
  /** Normalised form (only for words). */
  norm?: string;
}

const HAS_LETTER = /\p{L}/u;
const segmenters = new Map<string, Intl.Segmenter>();

function segmenterFor(lang: string): Intl.Segmenter {
  let seg = segmenters.get(lang);
  if (!seg) {
    seg = new Intl.Segmenter(lang, { granularity: 'word' });
    segmenters.set(lang, seg);
  }
  return seg;
}

export function isSegmenterSupported(): boolean {
  return typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function';
}

/** Number of words (letter-bearing word segments) in a text. */
export function countWords(text: string, lang: string): number {
  let n = 0;
  for (const { segment, isWordLike } of segmenterFor(lang).segment(text)) if (isWordLike && HAS_LETTER.test(segment)) n++;
  return n;
}

const sentenceSegmenters = new Map<string, Intl.Segmenter>();

/** The sentence around a UTF-16 offset (used as flashcard and AI context). */
export function sentenceAt(text: string, offset: number, lang: string): string {
  let seg = sentenceSegmenters.get(lang);
  if (!seg) sentenceSegmenters.set(lang, (seg = new Intl.Segmenter(lang, { granularity: 'sentence' })));
  return (seg.segment(text).containing(offset)?.segment ?? text).trim();
}

/**
 * Splits text into tokens with Intl.Segmenter (UAX #29 word boundaries, dictionary-based for
 * languages without spaces). Combining stress marks stay inside their word.
 */
export function tokenize(text: string, lang: string): Token[] {
  const tokens: Token[] = [];
  for (const { segment, index, isWordLike } of segmenterFor(lang).segment(text)) {
    const isWord = Boolean(isWordLike) && HAS_LETTER.test(segment);
    tokens.push(isWord ? { text: segment, start: index, isWord, norm: normalizeWord(segment, lang) } : { text: segment, start: index, isWord });
  }
  return tokens;
}
