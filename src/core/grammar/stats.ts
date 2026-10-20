// Grammar in the numbers (Ratio and Tabula): pure, from a grammar, its progress rows, its items'
// schedules and its review logs.
import type { GrammarItemRow, GrammarProgressRow, ReviewLog } from '@/data/types';
import { topicState } from './progress';
import { GRAMMAR_LEVELS, topicsOf } from './types';
import type { Grammar, GrammarLevel, Topic } from './types';

export interface TopicStat {
  topic: Topic;
  answers: number;
  /** Share answered without a mistake (Good or Easy). */
  accuracy: number;
  ms: number;
}

export interface GrammarStats {
  total: number;
  learned: number;
  mastered: number;
  /** The grammar level reached (see grammarLevel), or null. */
  level: GrammarLevel | null;
  /** Topics with answers, in teaching order. */
  topics: TopicStat[];
  /** The three topics answered least well (at least five answers each). */
  weakest: TopicStat[];
  /** Topics learned in each of the last six months, oldest first ("2026-10"). */
  perMonth: Array<{ month: string; learned: number }>;
}

/** The topic a log belongs to: its card id is `<lang>:<topic>:<key>`. */
const topicOfLog = (log: ReviewLog) => log.cardId.split(':')[1] ?? '';

/**
 * The highest CEFR level whose topics, and every topic below it, are all learned; null when not
 * even every A1 topic is.
 */
export function grammarLevel(grammar: Grammar, progress: Map<string, GrammarProgressRow>): GrammarLevel | null {
  const topics = topicsOf(grammar);
  let reached: GrammarLevel | null = null;
  for (const level of GRAMMAR_LEVELS) {
    const at = topics.filter((t) => t.level === level);
    if (!at.length) continue;
    if (!at.every((t) => (progress.get(t.id)?.step ?? 1) >= 6)) break;
    reached = level;
  }
  return reached;
}

const monthKey = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export function grammarStats(grammar: Grammar, progress: Map<string, GrammarProgressRow>, items: GrammarItemRow[], logs: ReviewLog[], now: number): GrammarStats {
  const topics = topicsOf(grammar);
  const byTopic = new Map<string, { answers: number; right: number; ms: number }>();
  for (const log of logs) {
    const id = topicOfLog(log);
    const s = byTopic.get(id) ?? { answers: 0, right: 0, ms: 0 };
    s.answers++;
    if (log.rating >= 3) s.right++;
    s.ms += log.durationMs;
    byTopic.set(id, s);
  }
  const stats: TopicStat[] = topics.flatMap((topic) => {
    const s = byTopic.get(topic.id);
    return s ? [{ topic, answers: s.answers, accuracy: s.right / s.answers, ms: s.ms }] : [];
  });
  const states = topics.map((t) => topicState(t, progress.get(t.id), items, now));

  const months: string[] = [];
  const d = new Date(now);
  for (let i = 5; i >= 0; i--) months.push(monthKey(new Date(d.getFullYear(), d.getMonth() - i, 1).getTime()));
  const perMonth = months.map((month) => ({ month, learned: [...progress.values()].filter((p) => p.learnedAt && monthKey(p.learnedAt) === month).length }));

  return {
    total: topics.length,
    learned: states.filter((s) => s.learned).length,
    mastered: states.filter((s) => s.mastered).length,
    level: grammarLevel(grammar, progress),
    topics: stats,
    weakest: stats
      .filter((s) => s.answers >= 5)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3),
    perMonth,
  };
}
