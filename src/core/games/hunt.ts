// Word hunt (6-21, F0168): the learner's words, hidden in plain sight in a passage of a text they have. Pure: passages come from Codex.
import { tokenize } from '@/core/text/tokenizer';
import { normalizeWord } from '@/core/text/normalize';
import { MAX_STARS } from './hangman';
import type { GameItem } from './source';

export interface HuntToken {
  text: string;
  isWord: boolean;
  /** Which target word it is a form of. */
  target?: number;
}

export interface Hunt {
  tokens: HuntToken[];
  targets: GameItem[];
}

const WORDS = { min: 30, max: 200 };
const TARGETS = { min: 3, max: 8 };

/** Passages that have three to eight of the learner's words in them, up to `count`, in a random order. */
export function makeHunts(passages: string[], items: GameItem[], lang: string, random: () => number, count: number): Hunt[] {
  const forms = new Map<string, number>();
  items.forEach((it, i) => {
    for (const f of [it.term, it.lemma]) if (f) forms.set(normalizeWord(f, lang), i);
  });
  const hunts: Hunt[] = [];
  for (const text of passages) {
    const tokens = tokenize(text, lang);
    const words = tokens.filter((t) => t.isWord).length;
    if (words < WORDS.min || words > WORDS.max) continue;
    const found = new Map<number, number>();
    const marked: HuntToken[] = tokens.map((t) => {
      const item = t.isWord ? forms.get(t.norm ?? normalizeWord(t.text, lang)) ?? (t.base ? forms.get(normalizeWord(t.base, lang)) : undefined) : undefined;
      if (item === undefined) return { text: t.text, isWord: t.isWord };
      if (!found.has(item)) found.set(item, found.size);
      return { text: t.text, isWord: true, target: found.get(item) };
    });
    if (found.size < TARGETS.min || found.size > TARGETS.max) continue;
    const targets = [...found].map(([item]) => items[item]);
    hunts.push({ tokens: marked, targets });
  }
  for (let i = hunts.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [hunts[i], hunts[j]] = [hunts[j], hunts[i]];
  }
  return hunts.slice(0, count);
}

/** Three stars; one off for each three wrong words clicked and for each word shown. Giving up earns none. */
export const huntStars = (won: boolean, wrong: number, hints: number): number => (won ? Math.max(1, MAX_STARS - hints - Math.floor(wrong / 3)) : 0);
