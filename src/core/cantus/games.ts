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
