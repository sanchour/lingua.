// What a game is dealt (6-21): the learner's own words first, as items carrying only what exists of them. A game says what it
// needs, and a set that has too few is told why, never an empty board.
import type { WordFacts } from '@/core/exercise';
import { hasLetters, letterWord, NO_LETTERS } from './letters';
import type { GameDef } from './defs';

export interface GameItem {
  term: string;
  meaning?: string;
  example?: string;
  synonyms: string[];
  antonyms: string[];
  image?: string;
}

export const itemsOfFacts = (facts: WordFacts[]): GameItem[] =>
  facts.map((f) => ({ term: f.word, meaning: f.gloss, example: f.sentence, synonyms: f.synonyms ?? [], antonyms: f.antonyms ?? [], image: f.image }));

/** The items a game can really use. */
export function usable(def: GameDef, items: GameItem[], lang: string): GameItem[] {
  return items.filter((i) => (!def.needs.meaning || !!i.meaning) && (!def.needs.letters || letterWord(i.term, { lang }) !== null));
}

export type CanPlay = { ok: true } | { ok: false; reason: string };

export function canPlay(def: GameDef, items: GameItem[], lang: string): CanPlay {
  if (def.needs.letters && !hasLetters(lang)) return { ok: false, reason: NO_LETTERS };
  const have = usable(def, items, lang).length;
  if (have >= def.needs.count) return { ok: true };
  const what = def.needs.letters ? 'words with 3 to 14 letters' : 'words';
  return { ok: false, reason: `Needs ${def.needs.count} of your ${what}${def.needs.meaning ? ' that have a meaning' : ''}; you have ${have}. Add words to a deck, or look for more in Codex.` };
}
