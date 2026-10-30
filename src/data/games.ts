// Games (6-21): what they are dealt, what is kept of them. A game never moves a card's schedule; it only leaves a mark in the learner's
// record (6-5) and a best, both private and on the device.
import { useLiveQuery } from 'dexie-react-hooks';
import { afterRound } from '@/core/games/bests';
import type { Best, Bests, RoundResult } from '@/core/games/bests';
import { itemsOfFacts } from '@/core/games/source';
import type { GameItem } from '@/core/games/source';
import { db } from './db';
import type { LinguaDB } from './db';
import { recordEvidence } from './learner';
import { practiceNotes, wordFacts } from './practice';

/** The learner's words with what the dictionary says of them: the same source Practice draws on. */
export async function gameItems(lang: string, database: LinguaDB = db): Promise<GameItem[]> {
  return itemsOfFacts(await wordFacts(lang, await practiceNotes(lang, database), database));
}

const BESTS_KEY = (lang: string) => `games.bests:${lang}`;

export async function loadBests(lang: string, database: LinguaDB = db): Promise<Bests> {
  return ((await database.settings.get(BESTS_KEY(lang)))?.value as Bests | undefined) ?? {};
}

export const useBests = (lang: string): Bests | undefined => useLiveQuery(() => loadBests(lang), [lang]);

/** Keeps a finished round; says whether it beat the best before it. */
export async function saveRound(lang: string, game: string, round: RoundResult, database: LinguaDB = db): Promise<{ best: Best; beat: boolean }> {
  return database.transaction('rw', database.settings, async () => {
    const bests = await loadBests(lang, database);
    const result = afterRound(bests[game], round);
    await database.settings.put({ key: BESTS_KEY(lang), value: { ...bests, [game]: result.best }, updatedAt: Date.now() });
    return result;
  });
}

/** One word of a game, as the learner's record sees it: spelling it from its meaning is recall of the word. */
export function recordGameWord(lang: string, term: string, game: string, won: boolean, assisted: boolean, database: LinguaDB = db): Promise<void> {
  return recordEvidence(
    { lang, at: Date.now(), skill: 'vocabulary', room: 'ludus', item: { type: 'word', wordId: `${lang}:${term.toLocaleLowerCase(lang)}` }, outcome: won ? 'right' : 'wrong', assisted, category: won ? undefined : 'spelling', kind: game, contextId: 'games' },
    database,
  ).then(() => undefined);
}
