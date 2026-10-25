// Typing practice the keybr way (5.1-4a): start with the six most common letters, type made-up
// but pronounceable words of only those letters (and real ones once there are enough), and unlock
// the next letter when every letter so far is typed at the target speed with 95% accuracy. The
// weakest letter is the focus and turns up more.
import type { TypingData } from './types';

export const START_LETTERS = 6;
/** Correct presses of a letter before its speed counts. */
export const MIN_HITS = 12;
export const ACCURACY = 0.95;
export const DEFAULT_TARGET = 30;
/** How much one press moves a letter's running speed and accuracy. */
const ALPHA = 0.12;

export interface LetterStat {
  hits: number;
  misses: number;
  /** Running average of the time to press it (ms), on correct presses. */
  ms: number;
  /** Running accuracy, 0–1. */
  acc: number;
}

export interface TypingProgress {
  /** How many of the language's letters (in order) are unlocked. */
  unlocked: number;
  stats: Record<string, LetterStat>;
  /** Words a minute every letter must reach. */
  target: number;
}

/** Words a minute from the time per key (a word is five keys). */
export const wpmOf = (ms: number) => (ms > 0 ? 12_000 / ms : 0);

/** One press of `letter`: right or wrong, and how long after the press before it (null for the first of a line, or a long pause). */
export function recordPress(stat: LetterStat | undefined, correct: boolean, ms: number | null): LetterStat {
  const s = stat ?? { hits: 0, misses: 0, ms: 0, acc: 1 };
  const acc = s.hits + s.misses === 0 ? (correct ? 1 : 0) : s.acc + ALPHA * ((correct ? 1 : 0) - s.acc);
  if (!correct) return { ...s, misses: s.misses + 1, acc };
  const timed = ms !== null && ms >= 30 && ms <= 2500;
  return { hits: s.hits + 1, misses: s.misses, acc, ms: timed ? (s.ms ? s.ms + ALPHA * (ms - s.ms) : ms) : s.ms };
}

export const letterReady = (stat: LetterStat | undefined, target: number) => Boolean(stat && stat.hits >= MIN_HITS && stat.ms > 0 && wpmOf(stat.ms) >= target && stat.acc >= ACCURACY);

/** The letters to practise now, in order. */
export const unlockedLetters = (data: TypingData, p: TypingProgress) => data.letters.slice(0, Math.max(START_LETTERS, p.unlocked)).map(([c]) => c);

/** The next letter joins when every letter so far is ready. Returns it, or null. */
export function nextUnlock(data: TypingData, p: TypingProgress): string | null {
  const have = unlockedLetters(data, p);
  if (have.length >= data.letters.length) return null;
  return have.every((c) => letterReady(p.stats[c], p.target)) ? data.letters[have.length][0] : null;
}

/** The letter to practise most: one still short of presses (the newest first), else the slowest or least accurate. */
export function focusLetter(data: TypingData, p: TypingProgress): string {
  const have = unlockedLetters(data, p);
  const young = [...have].reverse().find((c) => (p.stats[c]?.hits ?? 0) < MIN_HITS);
  if (young) return young;
  const score = (c: string) => {
    const s = p.stats[c];
    return s ? Math.min(1, wpmOf(s.ms) / p.target) * Math.min(1, s.acc / ACCURACY) : 0;
  };
  return have.reduce((a, b) => (score(b) < score(a) ? b : a));
}

// ── Words to type ──────────────────────────────────────────────────────────────

/** How often each letter follows each two letters in the language's words ("^" starts a word, "$" ends it). */
export function trigrams(words: readonly string[]): Map<string, Map<string, number>> {
  const model = new Map<string, Map<string, number>>();
  const add = (key: string, next: string, n: number) => {
    const row = model.get(key) ?? new Map<string, number>();
    row.set(next, (row.get(next) ?? 0) + n);
    model.set(key, row);
  };
  words.forEach((word, rank) => {
    const n = 1 / Math.sqrt(rank + 1);
    const chars = ['^', '^', ...word, '$'];
    for (let i = 2; i < chars.length; i++) {
      add(chars[i - 2] + chars[i - 1], chars[i], n);
      add(chars[i - 1], chars[i], n);
    }
  });
  return model;
}

function pick(row: Array<[string, number]>, random: () => number): string {
  const total = row.reduce((a, [, n]) => a + n, 0);
  let r = random() * total;
  for (const [c, n] of row) if ((r -= n) <= 0) return c;
  return row[row.length - 1][0];
}

/** A made-up word in the language's patterns, of allowed letters only. */
export function madeUpWord(model: Map<string, Map<string, number>>, allowed: Set<string>, focus: string, random: () => number): string {
  let word = '';
  let prev = '^^';
  for (let guard = 0; guard < 24; guard++) {
    const options = (key: string) => [...(model.get(key) ?? [])].filter(([c]) => (c === '$' ? word.length >= 3 : allowed.has(c))).map(([c, n]) => [c, c === focus ? n * 3 : n] as [string, number]);
    let row = options(prev);
    if (!row.length) row = options(prev.slice(-1));
    if (!row.length) row = [...allowed].map((c) => [c, c === focus ? 3 : 1] as [string, number]);
    if (word.length >= 8) row = row.filter(([c]) => c === '$').length ? [['$', 1]] : row;
    const c = pick(row, random);
    if (c === '$') break;
    word += c;
    prev = prev.slice(-1) + c;
    if (word.length >= 9) break;
  }
  return word;
}

/** A line of words to type: real words once at least 15 can be made of the letters, made-up ones too, about half with the focus letter. */
export function lineOfWords(data: TypingData, model: Map<string, Map<string, number>>, letters: readonly string[], focus: string, count: number, random: () => number = Math.random): string[] {
  const allowed = new Set(letters);
  const real = data.words.filter((w) => [...w].every((c) => allowed.has(c)));
  const out: string[] = [];
  for (let i = 0; out.length < count && i < count * 8; i++) {
    const wantFocus = out.length % 2 === 0;
    const useReal = real.length >= 15 && random() < 0.5;
    const pool = useReal ? (wantFocus ? real.filter((w) => w.includes(focus)) : real) : null;
    const word = pool?.length ? pool[Math.floor(Math.pow(random(), 2) * Math.min(pool.length, 400))] : madeUpWord(model, allowed, focus, random);
    if (!word || (wantFocus && !word.includes(focus) && i < count * 6) || out.at(-1) === word) continue;
    out.push(word);
  }
  return out;
}

/** Mandarin: syllables of common characters typed only with the unlocked letters, each with its character. */
export function lineOfSyllables(data: TypingData, letters: readonly string[], focus: string, count: number, random: () => number = Math.random): Array<{ text: string; hint: string }> {
  const allowed = new Set(letters);
  const ok = (data.chars ?? []).filter(([, plain]) => [...plain.replace(/v/g, 'ü')].every((c) => allowed.has(c)));
  const out: Array<{ text: string; hint: string }> = [];
  for (let i = 0; out.length < count && ok.length && i < count * 8; i++) {
    const pool = out.length % 2 === 0 ? ok.filter(([, p]) => p.replace(/v/g, 'ü').includes(focus)) : ok;
    const [char, plain] = (pool.length ? pool : ok)[Math.floor(Math.pow(random(), 2) * Math.min((pool.length ? pool : ok).length, 300))];
    if (out.at(-1)?.hint === char) continue;
    out.push({ text: plain.replace(/v/g, 'ü'), hint: char });
  }
  return out;
}

/** Mandarin's practice input method: the characters that toneless syllable can be, most common first (up to five). */
export function candidates(data: TypingData, syllable: string): string[] {
  const plain = syllable.replace(/ü/g, 'v');
  return (data.chars ?? []).filter(([, p]) => p === plain).slice(0, 5).map(([c]) => c);
}

/** A seeded random number generator, for tests and repeatable lines. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
