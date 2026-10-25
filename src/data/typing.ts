// Typing practice (5.1-4a): each language's progress, its letters and words, and the time typed
// counted as writing in Ratio and Home.
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { DEFAULT_TARGET, START_LETTERS } from '@/core/typing/lesson';
import type { TypingData } from '@/core/typing/types';
import { recordSession } from './activity';
import { db } from './db';
import type { TypingRow } from './types';

const DATA = import.meta.glob<{ default: TypingData }>('../core/typing/data/*.json');

/** The language's letters and words for typing, or null when it has none (only the core languages do). */
export function useTypingData(lang: string): TypingData | null | undefined {
  const [state, setState] = useState<{ lang: string; data: TypingData | null }>();
  useEffect(() => {
    let alive = true;
    const load = DATA[`../core/typing/data/${lang}.json`];
    void (load ? load().then((m) => m.default) : Promise.resolve(null)).then((data) => alive && setState({ lang, data }));
    return () => {
      alive = false;
    };
  }, [lang]);
  return state?.lang === lang ? state.data : undefined;
}

export const freshTyping = (lang: string): TypingRow => ({ id: lang, lang, unlocked: START_LETTERS, stats: {}, target: DEFAULT_TARGET, ownLayout: false, createdAt: Date.now(), updatedAt: Date.now() });

/** The language's typing progress (a fresh one before the first line). */
export function useTypingRow(lang: string): TypingRow | undefined {
  return useLiveQuery(async () => (await db.typing.get(lang)) ?? freshTyping(lang), [lang]);
}

export async function saveTyping(row: TypingRow): Promise<void> {
  await db.typing.put({ ...row, updatedAt: Date.now() });
}

/** A finished line's typing time, as writing practice (short ones are left out by recordSession). */
export function recordTyping(lang: string, startedAt: number, activeMs: number): Promise<void> {
  return recordSession({ lang, type: 'write', refId: 'typing', startedAt, endedAt: Date.now(), activeMs });
}
