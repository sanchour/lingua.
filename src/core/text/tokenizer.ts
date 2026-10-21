import { JAPANESE_CHAR, segmentJapanese } from '../lang/japanese';
import type { JapaneseLexicon } from '../lang/japanese';
import { normalizeWord } from './normalize';

export interface Token {
  text: string;
  /** UTF-16 offset in the source string. */
  start: number;
  /** True for words we track (contain at least one letter). Punctuation, spaces and numbers are false. */
  isWord: boolean;
  /** Normalised form (only for words). */
  norm?: string;
  /** Japanese: the dictionary form of a conjugated word (食べました → 食べる). */
  base?: string;
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

// ── Dictionaries for word splitting ─────────────────────────────────────────
// Browsers split Japanese poorly (食|べ|ま|した). Once the Japanese pack is read into memory
// (services/packs/lexicon.ts), its words decide instead.

const lexicons = new Map<string, JapaneseLexicon>();
let lexiconVersion = 0;
const listeners = new Set<() => void>();

/** Gives the tokenizer a language's word list (or takes it away). */
export function setLexicon(lang: string, lexicon: JapaneseLexicon | null): void {
  if (lexicon) lexicons.set(lang, lexicon);
  else lexicons.delete(lang);
  lexiconVersion++;
  for (const l of listeners) l();
}

export const hasLexicon = (lang: string) => lexicons.has(lang);
/** Changes whenever a word list arrives, so splits made without it can be redone. */
export const getLexiconVersion = () => lexiconVersion;
export function subscribeLexicon(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const isJapaneseRun = (s: string) => [...s].every((c) => JAPANESE_CHAR.test(c));

/** Number of words (letter-bearing word segments) in a text. */
export function countWords(text: string, lang: string): number {
  if (lexicons.has(lang)) return tokenize(text, lang).filter((t) => t.isWord).length;
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

/** Every sentence of a text, each as `sentenceAt` gives it. */
export function sentencesOf(text: string, lang: string): string[] {
  let seg = sentenceSegmenters.get(lang);
  if (!seg) sentenceSegmenters.set(lang, (seg = new Intl.Segmenter(lang, { granularity: 'sentence' })));
  return [...seg.segment(text)].map((s) => s.segment.trim()).filter(Boolean);
}

/**
 * Splits text into tokens with Intl.Segmenter (UAX #29 word boundaries, dictionary-based for
 * languages without spaces). Combining stress marks stay inside their word. Japanese is split
 * again by its pack's words once they are loaded.
 */
export function tokenize(text: string, lang: string): Token[] {
  const tokens: Token[] = [];
  const lexicon = lexicons.get(lang);
  let run: { start: number; text: string } | null = null;
  const flush = () => {
    if (!run || !lexicon) return;
    for (const w of segmentJapanese(run.text, lexicon)) {
      const segment = run.text.slice(w.start, w.end);
      const token: Token = { text: segment, start: run.start + w.start, isWord: true, norm: normalizeWord(segment, lang) };
      if (w.base) token.base = w.base;
      tokens.push(token);
    }
    run = null;
  };
  for (const { segment, index, isWordLike } of segmenterFor(lang).segment(text)) {
    // A stretch of kanji and kana goes to the dictionary whole.
    if (lexicon && isJapaneseRun(segment)) {
      if (run && run.start + run.text.length === index) run.text += segment;
      else {
        flush();
        run = { start: index, text: segment };
      }
      continue;
    }
    flush();
    const isWord = Boolean(isWordLike) && HAS_LETTER.test(segment);
    tokens.push(isWord ? { text: segment, start: index, isWord, norm: normalizeWord(segment, lang) } : { text: segment, start: index, isWord });
  }
  flush();
  return tokens;
}
