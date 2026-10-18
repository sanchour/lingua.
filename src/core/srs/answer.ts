// Checking typed answers kindly: case, punctuation, stress marks and a leading article never count
// against the learner; a missing accent or a one-letter slip is "close" (accepted, with a note).
import { normalizeWord } from '@/core/text/normalize';

export type Verdict = 'exact' | 'close' | 'wrong';
export interface AnswerCheck {
  verdict: Verdict;
  /** The accepted form closest to what was typed. */
  expected: string;
  /** Why a close answer wasn't exact. */
  note?: 'accent' | 'typo';
}

const ARTICLES: Record<string, string[]> = {
  en: ['the', 'a', 'an', 'to'],
  es: ['el', 'la', 'los', 'las', 'un', 'una'],
  pt: ['o', 'a', 'os', 'as', 'um', 'uma'],
  fr: ['le', 'la', 'les', "l'", 'un', 'une'],
  it: ['il', 'lo', 'la', 'i', 'gli', 'le', "l'", 'un', 'una', 'uno'],
  de: ['der', 'die', 'das', 'ein', 'eine'],
  sv: ['en', 'ett'],
  el: ['ο', 'η', 'το', 'οι', 'τα', 'ένας', 'μια', 'ένα'],
  hu: ['a', 'az', 'egy'],
  nl: ['de', 'het', 'een', "'t"],
  nb: ['en', 'ei', 'et'],
  ru: [],
  tr: [],
  id: [],
  sw: [],
  la: [],
  zh: [],
  ja: [],
  ko: [],
};

/** Lower-case, no stress marks or punctuation, single spaces, no leading article. */
export function normalizeAnswer(text: string, lang: string): string {
  // normalizeWord lower-cases by locale and drops Russian stress marks.
  let s = text
    .normalize('NFC')
    .split(/\s+/)
    .map((w) => normalizeWord(w.replace(/^[¿¡"'«»„“”‚‘(]+|[.,;:!?"'«»“”’)…]+$/g, ''), lang))
    .filter(Boolean)
    .join(' ');
  for (const article of ARTICLES[lang] ?? []) {
    if (article.endsWith("'") && s.startsWith(article)) {
      s = s.slice(article.length);
      break;
    }
    if (s.startsWith(`${article} `) && s.length > article.length + 1) {
      s = s.slice(article.length + 1);
      break;
    }
  }
  // Arabic writes its article onto the word: "الكتاب" and "كتاب" are both the book.
  if (lang === 'ar') s = s.replace(/(^|\s)ال(?=\S{2})/g, '$1');
  return s;
}

/** Languages where one character is a whole syllable or word: a "slip" is another word. */
const NO_TYPOS = new Set(['zh', 'ja']);

/** Without any diacritics (é → e, ё → е, ά → α), for accent-insensitive comparison. */
export function foldAccents(text: string, lang?: string): string {
  // Japanese voicing marks (が, ぱ) make another letter, not an accent.
  if (lang === 'ja') return text;
  return text.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC');
}

function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** Accepted spellings of an answer: "кот / ко́шка", "colour; color". */
export function alternatives(expected: string): string[] {
  return expected
    .split(/\s*[;/]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function checkAnswer(typed: string, expected: string, lang: string): AnswerCheck {
  const input = normalizeAnswer(typed, lang);
  const options = alternatives(expected);
  if (!input) return { verdict: 'wrong', expected: options[0] ?? expected };
  let best: AnswerCheck = { verdict: 'wrong', expected: options[0] ?? expected };
  for (const option of options) {
    const target = normalizeAnswer(option, lang);
    if (input === target) return { verdict: 'exact', expected: option };
    if (foldAccents(input, lang) === foldAccents(target, lang)) {
      best = { verdict: 'close', expected: option, note: 'accent' };
      continue;
    }
    const allowed = NO_TYPOS.has(lang) ? 0 : target.length >= 10 ? 2 : target.length >= 4 ? 1 : 0;
    if (allowed && best.verdict === 'wrong' && editDistance(foldAccents(input, lang), foldAccents(target, lang), allowed) <= allowed) {
      best = { verdict: 'close', expected: option, note: 'typo' };
    }
  }
  return best;
}
