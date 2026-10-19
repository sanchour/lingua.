// Times an audiobook's own text from a transcript of it, so the book's sentences (not Whisper's
// guesses at them) light up as they are read. Whisper's words and the book's are matched: runs of
// words found exactly once in both are anchors, kept in order; the book's words between anchors get
// times in proportion; each of the book's sentences becomes a cue. Where the part sits in the book
// comes out of the same matching: the anchors gather there. Words the reader adds ("This is a
// LibriVox recording…") simply match nothing.
import { sentences } from '@/core/parsers/subtitles';
import type { Cue } from '@/data/types';

/** Written without spaces between words: matched character by character. */
const UNSPACED = new Set(['ja', 'zh', 'yue', 'th']);
const WORD = /[\p{L}\p{N}][\p{L}\p{M}\p{N}'’-]*/gu;
const CHAR = /[\p{L}\p{N}]/gu;

const fold = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[\p{M}'’-]/gu, '')
    .toLocaleLowerCase();

interface Piece {
  key: string;
  raw: string;
}

function pieces(text: string, unspaced: boolean): Piece[] {
  return [...text.matchAll(unspaced ? CHAR : WORD)].map((m) => ({ key: fold(m[0]), raw: m[0] })).filter((p) => p.key);
}

/** Whisper's words with their start times (spread over the cue by length where it gave none). */
function heard(cues: readonly Cue[], unspaced: boolean): Array<{ key: string; ms: number }> {
  const out: Array<{ key: string; ms: number }> = [];
  for (const cue of cues) {
    const spans = cue.words?.length ? cue.words.map((w) => ({ text: w.w, start: w.startMs, end: w.endMs })) : [{ text: cue.text, start: cue.startMs, end: cue.endMs }];
    for (const span of spans) {
      const found = pieces(span.text, unspaced);
      const length = found.reduce((n, p) => n + p.key.length, 0) || 1;
      let at = 0;
      for (const p of found) {
        out.push({ key: p.key, ms: span.start + ((span.end - span.start) * at) / length });
        at += p.key.length;
      }
    }
  }
  return out;
}

/** Longest run of anchors increasing in both sequences (they arrive sorted by Whisper's order). */
function increasing(anchors: Array<[number, number]>): Array<[number, number]> {
  const tails: number[] = [];
  const prev = new Array<number>(anchors.length).fill(-1);
  for (let k = 0; k < anchors.length; k++) {
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (anchors[tails[mid]][1] < anchors[k][1]) lo = mid + 1;
      else hi = mid;
    }
    if (lo > 0) prev[k] = tails[lo - 1];
    tails[lo] = k;
  }
  const out: Array<[number, number]> = [];
  for (let k = tails.at(-1) ?? -1; k >= 0; k = prev[k]) out.push(anchors[k]);
  return out.reverse();
}

/**
 * The book's sentences that the part reads, timed. `paragraphs` is the book's text in order.
 * Null when too little of the transcript is found in the book (a different book, or a part
 * that isn't in it).
 */
export function alignToBook(cues: readonly Cue[], paragraphs: readonly string[], lang: string): Cue[] | null {
  const unspaced = UNSPACED.has(lang);
  const n = unspaced ? 6 : 4;
  const said = heard(cues, unspaced);
  if (said.length < n * 3) return null;

  // The book as sentences, and as one run of words that remembers each word's sentence.
  const book: Array<{ key: string; raw: string; sentence: number }> = [];
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    for (const s of sentences(paragraph, lang)) {
      for (const p of pieces(s, unspaced)) book.push({ ...p, sentence: lines.length });
      lines.push(s);
    }
  }
  if (book.length < n) return null;

  const gram = (keys: (i: number) => string, i: number) => {
    let g = keys(i);
    for (let d = 1; d < n; d++) g += ` ${keys(i + d)}`;
    return g;
  };
  // Runs of n words found exactly once in the book and once in the transcript.
  const inBook = new Map<string, number>();
  for (let j = 0; j + n <= book.length; j++) {
    const g = gram((x) => book[x].key, j);
    inBook.set(g, inBook.has(g) ? -1 : j);
  }
  const inSaid = new Map<string, number>();
  for (let i = 0; i + n <= said.length; i++) {
    const g = gram((x) => said[x].key, i);
    inSaid.set(g, inSaid.has(g) ? -1 : i);
  }
  const anchors: Array<[number, number]> = [];
  for (const [g, i] of inSaid) {
    const j = inBook.get(g);
    if (i >= 0 && j !== undefined && j >= 0) anchors.push([i, j]);
  }
  anchors.sort((a, b) => a[0] - b[0]);
  const kept = increasing(anchors);
  if (kept.length < Math.max(3, said.length * 0.04)) return null;

  // Each anchored book word gets the time Whisper heard it; the others are filled in between.
  const time = new Map<number, number>();
  for (const [i, j] of kept) for (let d = 0; d < n; d++) if (!time.has(j + d)) time.set(j + d, said[i + d].ms);
  const known = [...time.keys()].sort((a, b) => a - b);
  // Times must not run backwards (a word heard twice, a repeated phrase).
  for (let k = 1; k < known.length; k++) time.set(known[k], Math.max(time.get(known[k])!, time.get(known[k - 1])!));
  const first = known[0];
  const last = known[known.length - 1];
  const pace = (time.get(last)! - time.get(first)!) / Math.max(1, last - first);
  const firstSentence = book[first].sentence;
  const lastSentence = book[last].sentence;
  const from = book.findIndex((w) => w.sentence === firstSentence);
  let to = last;
  while (to + 1 < book.length && book[to + 1].sentence === lastSentence) to++;

  const at: number[] = [];
  let k = 0;
  for (let j = from; j <= to; j++) {
    while (k + 1 < known.length && known[k + 1] <= j) k++;
    const a = known[k];
    const b = known[k + 1];
    if (j < first) at.push(Math.max(0, time.get(first)! - (first - j) * pace));
    else if (time.has(j)) at.push(time.get(j)!);
    else if (b === undefined) at.push(time.get(a)! + (j - a) * pace);
    else at.push(time.get(a)! + ((time.get(b)! - time.get(a)!) * (j - a)) / (b - a));
  }
  const endOf = said[said.length - 1].ms + Math.max(400, pace);

  const out: Cue[] = [];
  for (let s = firstSentence; s <= lastSentence; s++) {
    const idx: number[] = [];
    for (let j = from; j <= to; j++) if (book[j].sentence === s) idx.push(j);
    if (!idx.length) continue;
    const next = to + 1 > idx[idx.length - 1] + 1 ? at[idx[idx.length - 1] + 1 - from] : endOf;
    const startMs = Math.round(at[idx[0] - from]);
    const endMs = Math.round(Math.max(startMs + 200, next ?? endOf));
    const words = unspaced
      ? undefined
      : idx.map((j, w) => ({ w: book[j].raw, startMs: Math.round(at[j - from]), endMs: Math.round(w + 1 < idx.length ? at[idx[w + 1] - from] : endMs) }));
    out.push({ startMs, endMs, text: lines[s], ...(words ? { words } : {}) });
  }
  return out.length ? out : null;
}
