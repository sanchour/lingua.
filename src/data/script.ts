// Alphabet progress (Lingua 3.0-8, part 5). Letters are FSRS items in Grammatica's tables, under
// topic `script` with the letter as key; a group is a progress row `script:<group>`, at step 6
// once its lesson is passed. Logs go to the same hidden deck `grammar:<lang>`, so vocabulary
// statistics leave them out, and resetting or removing a language clears them with its grammar.
import { useLiveQuery } from 'dexie-react-hooks';
import { PASS, progressId } from '@/core/grammar/progress';
import type { Grade4 } from '@/core/srs/scheduler';
import { lettersOf } from '@/core/script/types';
import type { Letter, Script } from '@/core/script/types';
import { answerGrammarItem } from './grammar';
import { db } from './db';
import type { LinguaDB } from './db';
import type { GrammarItemRow, GrammarProgressRow } from './types';

const LETTERS = 'script';
const groupTopic = (group: string) => `script:${group}`;

/** Each group's progress row in a language, by group id. */
export async function scriptProgress(lang: string, database: LinguaDB = db): Promise<Map<string, GrammarProgressRow>> {
  const rows = await database.grammarProgress.where('lang').equals(lang).toArray();
  return new Map(rows.filter((r) => !r.deletedAt && r.topic.startsWith('script:')).map((r) => [r.topic.slice('script:'.length), r]));
}

/** Every letter scheduled in a language. */
export async function scriptItems(lang: string, database: LinguaDB = db): Promise<GrammarItemRow[]> {
  return (await database.grammarItems.where('[lang+topic]').equals([lang, LETTERS]).toArray()).filter((r) => !r.deletedAt);
}

export function useScriptProgress(lang: string): Map<string, GrammarProgressRow> | undefined {
  return useLiveQuery(() => scriptProgress(lang), [lang]);
}

export function useScriptItems(lang: string): GrammarItemRow[] | undefined {
  return useLiveQuery(() => scriptItems(lang), [lang]);
}

/** A letter's result in a lesson: scheduled when new or due, always logged. */
export function answerLetter(lang: string, letter: string, grade: Grade4, durationMs: number, practice = false, database: LinguaDB = db): Promise<GrammarItemRow> {
  return answerGrammarItem({ lang, topic: LETTERS, key: letter, grade, durationMs, practice }, database);
}

/** A group's lesson is over: passed (`PASS` right first time) marks it learned. */
export async function finishLettersLesson(lang: string, group: string | null, score: number, database: LinguaDB = db, now = Date.now()): Promise<{ passed: boolean }> {
  if (!group) return { passed: false };
  const id = progressId(lang, groupTopic(group));
  const before = await database.grammarProgress.get(id);
  const live = before && !before.deletedAt ? before : undefined;
  const passed = score >= PASS;
  const learned = passed || (live?.step ?? 1) >= 6;
  await database.grammarProgress.put({
    id,
    lang,
    topic: groupTopic(group),
    step: learned ? 6 : 1,
    lessons: (live?.lessons ?? 0) + 1,
    lastScore: score,
    lastStudied: now,
    learnedAt: live?.learnedAt ?? (learned ? now : undefined),
    createdAt: before?.createdAt ?? now,
    updatedAt: now,
  });
  return { passed };
}

/** The letters due for review, oldest first. */
export function dueLetters(script: Script, items: GrammarItemRow[], now = Date.now()): Letter[] {
  const byId = new Map(lettersOf(script).map((l) => [l.id, l]));
  return items
    .filter((r) => r.state !== 0 && r.due <= now)
    .sort((a, b) => a.due - b.due)
    .flatMap((r) => {
      const l = byId.get(r.key);
      return l ? [l] : [];
    });
}

/** The first group not learned yet, or undefined when the whole alphabet is. */
export const nextGroup = (script: Script, progress: Map<string, GrammarProgressRow>) => script.groups.find((g) => (progress.get(g.id)?.step ?? 1) < 6);
