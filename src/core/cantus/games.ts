// Song games (Cantus's part of Ludus): fill in a missing word of a lyric, and put a verse's lines
// back in order. Built from the song itself, so every round is something you've just sung.
import { tokenize } from '@/core/text/tokenizer';
import type { LyricLine } from '@/data/types';
import { sungLines } from './lyrics';

export type SongRound =
  | { kind: 'fill'; line: number; before: string; gap: string; after: string; options: string[]; answer: number }
  | { kind: 'order'; lines: number[]; shuffled: number[] };

/** A small seeded random number generator, so a song's rounds don't jump around while playing. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const shuffle = <T>(list: T[], random: () => number) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/**
 * Up to `count` rounds: mostly fill-in-the-lyric, with an ordering round every fourth turn when the
 * song has a verse of four different lines. Gaps go in words of three letters or more, and the
 * wrong options are other words of the same song of a similar length.
 */
export function planSongRounds(lines: readonly LyricLine[], lang: string, random: () => number, count = 10): SongRound[] {
  const sung = lines.map((l, i) => ({ ...l, i })).filter((l) => sungLines([l]).length);
  const words = new Map<string, string>();
  const perLine = sung.map((l) => {
    const tokens = tokenize(l.text, lang);
    for (const t of tokens) if (t.isWord && t.text.length >= 3) words.set(t.norm!, t.text);
    return { line: l, tokens };
  });
  const vocabulary = [...words.values()];

  const fills: SongRound[] = [];
  const usedLines = new Set<string>();
  for (const { line, tokens } of shuffle(perLine, random)) {
    if (usedLines.has(line.text)) continue;
    const candidates = tokens.filter((t) => t.isWord && t.text.length >= 3);
    if (!candidates.length || tokens.filter((t) => t.isWord).length < 3) continue;
    const pick = candidates[Math.floor(random() * candidates.length)];
    const others = shuffle(
      vocabulary.filter((w) => w.toLocaleLowerCase(lang) !== pick.text.toLocaleLowerCase(lang) && Math.abs(w.length - pick.text.length) <= 3),
      random,
    ).slice(0, 3);
    if (others.length < 2) continue;
    usedLines.add(line.text);
    const options = shuffle([pick.text, ...others], random);
    fills.push({ kind: 'fill', line: line.i, before: line.text.slice(0, pick.start), gap: pick.text, after: line.text.slice(pick.start + pick.text.length), options, answer: options.indexOf(pick.text) });
  }

  const verses: number[][] = [];
  for (let k = 0; k + 4 <= sung.length; k++) {
    const four = sung.slice(k, k + 4);
    const texts = new Set(four.map((l) => l.text));
    // Four different lines in a row, all in the same verse.
    if (texts.size === 4 && four.every((l, j) => j === 0 || l.i === four[j - 1].i + 1)) verses.push(four.map((l) => l.i));
  }
  const orders: SongRound[] = shuffle(verses, random)
    .slice(0, 3)
    .map((v) => {
      let shuffled = shuffle(v, random);
      if (shuffled.every((x, j) => x === v[j])) shuffled = [...v].reverse();
      return { kind: 'order', lines: v, shuffled };
    });

  const out: SongRound[] = [];
  while (out.length < count && (fills.length || orders.length)) {
    if ((out.length + 1) % 4 === 0 && orders.length) out.push(orders.shift()!);
    else if (fills.length) out.push(fills.shift()!);
    else out.push(orders.shift()!);
  }
  return out;
}

// ── Lessons: the language first, the song as the bonus ─────────────────────────────────────────

/** A word of the song, with what the dictionary and the learner know of it. */
export interface SongWord {
  norm: string;
  /** As sung (its first time in the song). */
  text: string;
  line: number;
  /** Where it starts in that line. */
  start: number;
  gloss?: string;
  lemma?: string;
  /** Every word it may be a form of; more than one is ambiguous ("bois": drink, or wood). */
  lemmas?: string[];
  /** The dictionary's note on the form, e.g. "first/third-person singular imperfect indicative of cantar". */
  desc?: string;
  /** How common the word is in the language (1 = the most common). */
  rank?: number;
  /** 0 unseen, 1 known, 2 learning. */
  state: 0 | 1 | 2;
}

export type LessonRound =
  | { kind: 'meaning'; word: SongWord; options: string[]; answer: number }
  | { kind: 'fill'; word: SongWord; before: string; after: string; options: string[]; answer: number }
  | { kind: 'form'; word: SongWord; options: string[]; answer: number }
  | { kind: 'translate'; line: number; options: string[]; answer: number }
  | { kind: 'order'; lines: number[]; shuffled: number[] };

/** How far down the frequency list a learner at each level is ready to go. */
export const LEVEL_REACH: Record<'A0' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1', number> = { A0: 800, A1: 1600, A2: 3200, B1: 6000, B2: 12_000, C1: 40_000 };

/** Every word of the song once, where it's first sung. */
export function songWords(lines: readonly LyricLine[], lang: string): Array<Pick<SongWord, 'norm' | 'text' | 'line' | 'start'>> {
  const seen = new Map<string, Pick<SongWord, 'norm' | 'text' | 'line' | 'start'>>();
  lines.forEach((l, line) => {
    if (!sungLines([l]).length) return;
    for (const t of tokenize(l.text, lang)) if (t.isWord && t.norm && !seen.has(t.norm)) seen.set(t.norm, { norm: t.norm, text: t.text, line, start: t.start });
  });
  return [...seen.values()];
}

/** A plain word, fit to be a wrong option: no apostrophes ("j'veux"), hyphens or digits. */
const plainWord = (t: string) => t.length >= 2 && /^[\p{L}\p{M}]+$/u.test(t);

/** A gloss short enough for a button: its first sense. */
export const firstSense = (gloss: string) => gloss.split(/;\s*/)[0].replace(/\s*\([^)]*\)\s*$/, '').trim();

/**
 * A lesson from a song, in the order that teaches: its words at the learner's level that they
 * don't know yet (what does it mean?), those words back in their lines with the meaning as the hint,
 * a form from the grammar (which word is it a form of?), a line to translate, and last, as the
 * bonus, the lines of a verse in order. `focus` are the words worth keeping as cards.
 */
export function planLesson(input: { lines: readonly LyricLine[]; lang: string; words: readonly SongWord[]; translation?: readonly string[]; reach: number; random: () => number }): { rounds: LessonRound[]; focus: SongWord[] } {
  const { lines, lang, words, translation, reach, random } = input;
  const glossed = words.filter((w) => w.gloss && w.text.length >= 2 && /\p{L}/u.test(w.text));
  const fresh = glossed.filter((w) => w.state !== 1);
  const byUse = (a: SongWord, b: SongWord) => (a.rank ?? Infinity) - (b.rank ?? Infinity);
  // Words at the learner's level first, the most useful first; then anything else they don't know.
  const inReach = fresh.filter((w) => w.rank !== undefined && w.rank <= reach).sort(byUse);
  const beyond = fresh.filter((w) => !inReach.includes(w) && w.rank !== undefined).sort(byUse);
  // One word per meaning: "le" and "la" are both "the".
  const senses = new Set<string>();
  const focus = [...inReach, ...beyond]
    .filter((w) => {
      const sense = firstSense(w.gloss!);
      if (senses.has(sense)) return false;
      senses.add(sense);
      return true;
    })
    .slice(0, 6);

  const rounds: LessonRound[] = [];
  const meanings = (w: SongWord) => firstSense(w.gloss!);

  // Words: what does it mean? Wrong options are other meanings from the song.
  for (const word of focus.slice(0, 3)) {
    const right = meanings(word);
    const others = shuffle([...new Set(glossed.filter((o) => o.norm !== word.norm).map(meanings))].filter((m) => m && m !== right), random).slice(0, 3);
    if (others.length < 2) continue;
    const options = shuffle([right, ...others], random);
    rounds.push({ kind: 'meaning', word, options, answer: options.indexOf(right) });
  }

  // Meaning: the word back in its line, with what it means as the hint.
  const fillWords = focus.length > 3 ? focus.slice(3, 5) : focus.slice(0, 2);
  // Wrong options: real words of the song (the dictionary knows them), not "pa-pala" or "dapa".
  const pool = (list: readonly SongWord[]) => [...new Set(list.map((w) => w.text).filter(plainWord))];
  const vocabulary = pool(glossed).length >= 4 ? pool(glossed) : pool(words);
  for (const word of fillWords) {
    const text = lines[word.line]?.text ?? '';
    const others = shuffle(
      vocabulary.filter((v) => v.toLocaleLowerCase(lang) !== word.text.toLocaleLowerCase(lang) && Math.abs(v.length - word.text.length) <= 3),
      random,
    ).slice(0, 3);
    if (others.length < 2) continue;
    const options = shuffle([word.text, ...others], random);
    rounds.push({ kind: 'fill', word, before: text.slice(0, word.start), after: text.slice(word.start + word.text.length), options, answer: options.indexOf(word.text) });
  }

  // Grammar: a form spotted in the song. Which word is it a form of?
  // Only forms of one word: "bois" in "langues de bois" is wood, not a form of boire.
  const lemmas = [...new Set(glossed.map((w) => w.lemma ?? w.norm).filter(plainWord))];
  const forms = shuffle(
    words.filter((w) => w.desc && w.lemma && w.lemma !== w.norm && (w.lemmas?.length ?? 1) === 1 && w.text.length >= 2),
    random,
  ).sort((a, b) => Number(focus.includes(b)) - Number(focus.includes(a)));
  for (const word of forms.slice(0, 2)) {
    const others = shuffle(
      lemmas.filter((l) => l !== word.lemma && l !== word.norm),
      random,
    ).slice(0, 3);
    if (others.length < 2) continue;
    const options = shuffle([word.lemma!, ...others], random);
    rounds.push({ kind: 'form', word, options, answer: options.indexOf(word.lemma!) });
  }

  // The line: which English is it? Wrong options are other lines of the song.
  if (translation) {
    const sung = lines
      .map((l, i) => ({ i, text: l.text, tr: translation[i] }))
      // Not a line the translator only gave back.
      .filter((l) => l.tr && l.tr.toLocaleLowerCase(lang) !== l.text.toLocaleLowerCase(lang) && sungLines([lines[l.i]]).length && l.text.split(/\s+/).length >= 3);
    const unique = sung.filter((l, k) => sung.findIndex((o) => o.text === l.text) === k);
    for (const line of shuffle(unique, random).slice(0, 2)) {
      const others = shuffle([...new Set(unique.filter((o) => o.tr !== line.tr).map((o) => o.tr!))], random).slice(0, 2);
      if (others.length < 2) continue;
      const options = shuffle([line.tr!, ...others], random);
      rounds.push({ kind: 'translate', line: line.i, options, answer: options.indexOf(line.tr!) });
    }
  }

  // The bonus: the song itself, its lines in order.
  const order = planSongRounds(lines, lang, random, 12).find((r) => r.kind === 'order');
  if (order) rounds.push(order);
  // Without a dictionary there's little to teach yet: fill in the lyric, as before.
  if (rounds.length < 3) {
    const fills = planSongRounds(lines, lang, random, 6).filter((r) => r.kind === 'fill');
    for (const r of fills.slice(0, 6 - rounds.length)) {
      const word: SongWord = { norm: r.gap.toLocaleLowerCase(lang), text: r.gap, line: r.line, start: r.before.length, state: 0 };
      rounds.unshift({ kind: 'fill', word, before: r.before, after: r.after, options: r.options, answer: r.answer });
    }
  }
  return { rounds, focus };
}
