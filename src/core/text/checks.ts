// "Check yourself" at the end of a text (5.1-3a): a few questions made from the text itself, without
// AI. They check words and sentences, not deep understanding: a sentence with a word missing (your
// Learning words first), which word has a meaning, and a short sentence put back in order. With Max,
// the AI adds questions about the story itself (services/llm/storyQuestions).

import type { WordState } from '@/data/types';
import type { Token } from './tokenizer';

export type CheckItem =
  | { kind: 'gap'; before: string; after: string; answer: string; options: string[] }
  | { kind: 'meaning'; meaning: string; answer: string; options: string[] }
  | { kind: 'order'; answer: string[]; shuffled: string[]; joiner: string }
  | { kind: 'story'; question: string; en?: string; answer: string; options: string[] };

export interface CheckSource {
  lang: string;
  /** The text's paragraphs with their tokens (images left out). */
  blocks: Array<{ text: string; tokens: Token[] }>;
  gloss: (norm: string) => string | undefined;
  state: (norm: string) => WordState;
  random?: () => number;
}

interface Sentence {
  text: string;
  words: Token[];
  /** Offset of the sentence in its paragraph, to place the gap. */
  start: number;
}

const segmenters = new Map<string, Intl.Segmenter>();
/** Languages written without spaces between words. */
const UNSPACED = new Set(['zh', 'ja', 'th']);

function sentencesOf(blocks: CheckSource['blocks'], lang: string): Sentence[] {
  let seg = segmenters.get(lang);
  if (!seg) segmenters.set(lang, (seg = new Intl.Segmenter(lang, { granularity: 'sentence' })));
  const out: Sentence[] = [];
  for (const b of blocks) {
    for (const s of seg.segment(b.text)) {
      const end = s.index + s.segment.length;
      const words = b.tokens.filter((t) => t.isWord && t.start >= s.index && t.start < end);
      const text = s.segment.trim();
      if (words.length) out.push({ text, words: words.map((w) => ({ ...w, start: w.start - s.index - (s.segment.length - s.segment.trimStart().length) })), start: s.index });
    }
  }
  return out;
}

export const shuffle = <T>(list: T[], random: () => number = Math.random): T[] => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/** A gloss's first meaning, short enough for a question ("to carry, bear" → "to carry"). */
const firstMeaning = (g: string) => g.split(/[;(]/)[0].split(',')[0].trim();

/** Up to five questions from the text; fewer for a short text, none when it is too short to ask about. */
export function makeChecks({ lang, blocks, gloss, state, random = Math.random }: CheckSource): CheckItem[] {
  const sentences = sentencesOf(blocks, lang);
  // Words worth asking about: with a meaning, long enough not to be a function word, Learning first, then new.
  const weight = (n: string) => (state(n) === 2 ? 0 : state(n) === 0 ? 1 : 2);
  const candidates = new Map<string, Token>();
  // How a word is shown as an option: as written inside a sentence, so a capital doesn't give the
  // answer away ("Toca" among lower-case words); lower case if it only starts sentences (German nouns keep theirs).
  const spelt = new Map<string, string>();
  for (const s of sentences)
    s.words.forEach((w, i) => {
      if (!w.norm || [...w.norm].length < (UNSPACED.has(lang) ? 2 : 4) || !gloss(w.norm)) return;
      if (!candidates.has(w.norm)) candidates.set(w.norm, w);
      if (i > 0 && !spelt.has(w.norm)) spelt.set(w.norm, w.text);
    });
  const shown = (t: Token) => spelt.get(t.norm!) ?? (lang === 'de' ? t.text : t.text.toLocaleLowerCase(lang));
  const pool = shuffle([...candidates.values()], random).sort((a, b) => weight(a.norm!) - weight(b.norm!));
  if (pool.length < 4) return [];
  const used = new Set<string>();
  const others = (answer: Token, fit: (t: Token) => boolean) =>
    shuffle(
      pool.filter((t) => t.norm !== answer.norm && fit(t)),
      random,
    ).slice(0, 3);
  const items: CheckItem[] = [];

  // Two gaps: a sentence of 5 to 20 words with a candidate in it, not its first word.
  for (const s of shuffle(sentences, random)) {
    if (items.length >= 2) break;
    if (s.words.length < 5 || s.words.length > 20) continue;
    const target = s.words.slice(1).filter((w) => candidates.has(w.norm!) && !used.has(w.norm!)).sort((a, b) => weight(a.norm!) - weight(b.norm!))[0];
    if (!target) continue;
    const wrong = others(target, (t) => Math.abs(t.text.length - target.text.length) <= 4);
    if (wrong.length < 3) continue;
    used.add(target.norm!);
    items.push({ kind: 'gap', before: s.text.slice(0, target.start), after: s.text.slice(target.start + target.text.length), answer: target.text, options: shuffle([target.text, ...wrong.map(shown)], random) });
  }

  // Two meanings: "Which word means …?"
  for (const target of pool) {
    if (items.length >= 4) break;
    if (used.has(target.norm!)) continue;
    const meaning = firstMeaning(gloss(target.norm!)!);
    if (!meaning) continue;
    const wrong = others(target, (t) => firstMeaning(gloss(t.norm!)!) !== meaning);
    if (wrong.length < 3) continue;
    used.add(target.norm!);
    items.push({ kind: 'meaning', meaning, answer: shown(target), options: shuffle([shown(target), ...wrong.map(shown)], random) });
  }

  // One sentence back in order: 4 to 7 words.
  const short = shuffle(sentences, random).find((s) => s.words.length >= 4 && s.words.length <= 7 && new Set(s.words.map((w) => w.text)).size === s.words.length);
  if (short) {
    const answer = short.words.map((w) => w.text);
    let shuffled = shuffle(answer, random);
    for (let tries = 0; tries < 5 && shuffled.join() === answer.join(); tries++) shuffled = shuffle(answer, random);
    if (shuffled.join() !== answer.join()) items.push({ kind: 'order', answer, shuffled, joiner: UNSPACED.has(lang) ? '' : ' ' });
  }
  return items.length >= 3 ? items : [];
}
