// Grammatica's progress (Lingua 3.0-8): each topic's step, and an FSRS schedule per drill item.
import { useLiveQuery } from 'dexie-react-hooks';
import { createEmptyCard } from 'ts-fsrs';
import { loadGrammar } from '@/core/grammar/load';
import { itemId, itemKey, nextTopic, PASS, progressId } from '@/core/grammar/progress';
import { topicsOf } from '@/core/grammar/types';
import type { Grammar, Item, Topic } from '@/core/grammar/types';
import { rate } from '@/core/srs/scheduler';
import type { Grade4 } from '@/core/srs/scheduler';
import { bumpDaily } from './activity';
import { db } from './db';
import type { LinguaDB } from './db';
import { getSettings } from './settings';
import type { GrammarItemRow, GrammarProgressRow, ReviewLog } from './types';

export async function grammarProgress(lang: string, database: LinguaDB = db): Promise<Map<string, GrammarProgressRow>> {
  const rows = await database.grammarProgress.where('lang').equals(lang).toArray();
  return new Map(rows.filter((r) => !r.deletedAt).map((r) => [r.topic, r]));
}

export async function grammarItems(lang: string, database: LinguaDB = db): Promise<GrammarItemRow[]> {
  return (await database.grammarItems.where('[lang+topic]').between([lang, ''], [lang, '￿']).toArray()).filter((r) => !r.deletedAt);
}

/** Each topic's progress row in a language, live; `undefined` while loading. */
export function useGrammarProgress(lang: string): Map<string, GrammarProgressRow> | undefined {
  return useLiveQuery(() => grammarProgress(lang), [lang]);
}

/** Every drill item scheduled in a language, live. */
export function useGrammarItems(lang: string): GrammarItemRow[] | undefined {
  return useLiveQuery(() => grammarItems(lang), [lang]);
}

/** The topic to suggest next in a language (for Home and the rest of the app), or null. */
export async function currentGrammarTopic(lang: string, learnerLevel: string, database: LinguaDB = db): Promise<{ grammar: Grammar; topic: Topic } | null> {
  const grammar = await loadGrammar(lang);
  if (!grammar) return null;
  const topic = nextTopic(grammar, await grammarProgress(lang, database), learnerLevel);
  return topic ? { grammar, topic } : null;
}

// ── Answering ───────────────────────────────────────────────────────────────

/** A new FSRS schedule for a drill item, as the first answer finds it. */
function newItemRow(lang: string, topic: string, key: string, now: number): GrammarItemRow {
  const empty = createEmptyCard(new Date(now));
  return {
    id: itemId(lang, topic, key),
    lang,
    topic,
    key,
    due: empty.due.getTime(),
    stability: empty.stability,
    difficulty: empty.difficulty,
    elapsedDays: empty.elapsed_days,
    scheduledDays: empty.scheduled_days,
    learningSteps: empty.learning_steps,
    reps: empty.reps,
    lapses: empty.lapses,
    state: empty.state as GrammarItemRow['state'],
    createdAt: now,
    updatedAt: now,
  };
}

export interface GrammarAnswer {
  lang: string;
  topic: string;
  item: Item;
  grade: Grade4;
  durationMs: number;
  /** Practice (Lightning) is logged but leaves the schedule alone. */
  practice?: boolean;
  now?: number;
}

/**
 * Records an item's result in a lesson: schedules it (FSRS) when it is new or due, logs the review
 * under the hidden deck `grammar:<lang>`, and counts it in the day's reviews.
 */
export async function answerGrammarItem(a: GrammarAnswer, database: LinguaDB = db): Promise<GrammarItemRow> {
  const now = a.now ?? Date.now();
  const key = itemKey(a.item);
  const id = itemId(a.lang, a.topic, key);
  const settings = await getSettings(database);
  const before = (await database.grammarItems.get(id)) ?? newItemRow(a.lang, a.topic, key, now);
  const schedule = !a.practice && (before.state === 0 || before.due <= now || Boolean(before.deletedAt));
  const outcome = schedule ? rate(before, a.grade, now, settings.study.desiredRetention) : null;
  const row: GrammarItemRow = outcome ? { ...before, ...outcome.next, deletedAt: undefined, updatedAt: now } : before;
  const log: ReviewLog = {
    id: crypto.randomUUID(),
    cardId: id,
    deckId: `grammar:${a.lang}`,
    reviewedAt: now,
    durationMs: Math.min(a.durationMs, 120_000),
    rating: a.grade,
    mode: 'grammar',
    affectedSchedule: schedule ? 1 : 0,
    stateBefore: before.state,
    stabilityAfter: row.stability,
    difficultyAfter: row.difficulty,
    elapsedDays: outcome?.elapsedDays ?? 0,
    scheduledDays: row.scheduledDays,
  };
  await database.transaction('rw', database.grammarItems, database.reviewLogs, async () => {
    if (outcome) await database.grammarItems.put(row);
    await database.reviewLogs.add(log);
  });
  await bumpDaily(a.lang, { reviews: 1, againCount: a.grade === 1 ? 1 : 0 }, database);
  return row;
}

/**
 * A lesson on a topic's step is over: with `PASS` of first tries right the topic moves to the next
 * step (6 = learned). A practice or review lesson only counts as studied.
 */
export async function finishGrammarLesson(lang: string, topic: string, step: number | null, score: number, database: LinguaDB = db, now = Date.now()): Promise<{ passed: boolean; step: number }> {
  const id = progressId(lang, topic);
  const before = await database.grammarProgress.get(id);
  const current = before && !before.deletedAt ? before.step : 1;
  const passed = step !== null && step === current && score >= PASS;
  const next = passed ? Math.min(6, current + 1) : current;
  await database.grammarProgress.put({
    id,
    lang,
    topic,
    step: next,
    lessons: (before && !before.deletedAt ? before.lessons : 0) + 1,
    lastScore: step !== null ? score : before?.lastScore,
    lastStudied: now,
    placed: before?.placed,
    createdAt: before?.createdAt ?? now,
    updatedAt: now,
  });
  return { passed, step: next };
}

/** Items due now in a language, with their topics, oldest due first. */
export async function dueGrammarItems(grammar: Grammar, now = Date.now(), database: LinguaDB = db): Promise<Array<{ topic: Topic; item: Item; row: GrammarItemRow }>> {
  const rows = (await grammarItems(grammar.lang, database)).filter((r) => r.state !== 0 && r.due <= now).sort((a, b) => a.due - b.due);
  const byKey = new Map<string, { topic: Topic; item: Item }>();
  for (const topic of topicsOf(grammar)) for (const item of topic.items) byKey.set(itemId(grammar.lang, topic.id, itemKey(item)), { topic, item });
  return rows.flatMap((row) => {
    const hit = byKey.get(row.id);
    return hit ? [{ ...hit, row }] : [];
  });
}
