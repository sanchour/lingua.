// Grammatica's progress (Lingua 3.0-8): each topic's step, and an FSRS schedule per drill item.
import { useLiveQuery } from 'dexie-react-hooks';
import { loadGrammar } from '@/core/grammar/load';
import { nextTopic } from '@/core/grammar/progress';
import type { Grammar, Topic } from '@/core/grammar/types';
import { db } from './db';
import type { LinguaDB } from './db';
import type { GrammarItemRow, GrammarProgressRow } from './types';

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
