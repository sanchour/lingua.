// Games (6-21): what they are dealt, what is kept of them. A game never moves a card's schedule; it only leaves a mark in the learner's
// record (6-5) and a best, both private and on the device.
import { useLiveQuery } from 'dexie-react-hooks';
import { afterRound } from '@/core/games/bests';
import type { Best, Bests, RoundResult } from '@/core/games/bests';
import { letterWord } from '@/core/games/letters';
import { itemsOfFacts } from '@/core/games/source';
import type { GameItem, GameSource } from '@/core/games/source';
import { db } from './db';
import type { LinguaDB } from './db';
import { recordEvidence } from './learner';
import { practiceNotes, wordFacts } from './practice';

/** The learner's words with what the dictionary says of them: the same source Practice draws on. */
export async function gameItems(lang: string, database: LinguaDB = db): Promise<GameItem[]> {
  const notes = await practiceNotes(lang, database);
  return itemsOfFacts(await wordFacts(lang, notes, database)).map((item, i) => ({ ...item, lemma: notes[i]?.lemma }));
}

/** The commonest words of a language's list: a ladder is made of these, not of the learner's words. */
const LIST_RANKS = 12_000;

const listRows = (database: LinguaDB, lang: string) => database.frequency.where('[lang+rank]').between([lang, 0], [lang, LIST_RANKS], true, true);

/** What the shelf needs to know, cheaply: the words, how many texts, how long the language's word list is. */
export async function gameSource(lang: string, database: LinguaDB = db): Promise<GameSource> {
  const [items, texts, listWords] = await Promise.all([gameItems(lang, database), database.texts.where('lang').equals(lang).filter((t) => !t.deletedAt).count(), listRows(database, lang).count()]);
  return { items, texts, listWords };
}

/** Words of 3 to 6 letters from the commonest of the language's list (a ladder's rungs), with their glosses where the list has them. */
export async function ladderWords(lang: string, database: LinguaDB = db): Promise<Array<{ word: string; gloss?: string }>> {
  const rows = await listRows(database, lang).toArray();
  return rows.flatMap((r) => {
    const w = letterWord(r.norm, { lang, exact: true });
    const n = w?.keys.filter((k) => k !== null).length ?? 0;
    return w && w.marks.length === n && n >= 3 && n <= 6 ? [{ word: r.norm, gloss: r.gloss }] : [];
  });
}

/** Passages of the learner's texts: runs of paragraphs of 40 to 200 words, from the first chapters of the ones opened lately. */
export async function passagesOf(lang: string, database: LinguaDB = db): Promise<string[]> {
  const texts = (await database.texts.where('lang').equals(lang).filter((t) => !t.deletedAt).toArray()).sort((a, b) => (b.lastOpenedAt ?? b.updatedAt ?? 0) - (a.lastOpenedAt ?? a.updatedAt ?? 0)).slice(0, 8);
  const out: string[] = [];
  for (const text of texts) {
    const chapters = (await database.chapters.where('[textId+index]').between([text.id, 0], [text.id, 6], true, false).toArray()).filter((c) => !c.deletedAt);
    for (const chapter of chapters) {
      let run = '';
      for (const b of chapter.blocks) {
        if (b.t !== 'p') continue;
        run = run ? `${run}\n\n${b.text}` : b.text;
        if (run.length > 280) (out.push(run), (run = ''));
      }
      if (run.length > 120) out.push(run);
    }
  }
  return out.slice(0, 300);
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
