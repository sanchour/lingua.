// Grammatica's guided path (5.2-8): why a topic is next, the level ladder, the learner's level as a path, and weak spots.
// Pure: features/grammatica/GrammaticaPage.tsx gathers the states and draws this.
import type { GrammarItemRow } from '@/data/types';
import type { TopicState } from './progress';
import { GRAMMAR_LEVELS, topicsOf } from './types';
import type { Grammar, GrammarLevel, Topic } from './types';

const rank = (level: string) => Math.max(0, GRAMMAR_LEVELS.indexOf(level as GrammarLevel));

/** The learner's level as a grammar level: A0 counts as A1, and levels beyond the grammar stop at its last. */
export const grammarLevel = (level: string): GrammarLevel => (level === 'C2' ? GRAMMAR_LEVELS[GRAMMAR_LEVELS.length - 1] : GRAMMAR_LEVELS[rank(level === 'A0' ? 'A1' : level)]);

/** One sentence on why this is the next step: carrying on, the topic after one just learned, or a first. */
export function whyNext(grammar: Grammar, topic: Topic, state: TopicState | undefined, learnerLevel: string, learnedIds: ReadonlySet<string>): string {
  const all = topicsOf(grammar);
  if (state?.started) return `You are on step ${Math.min(state.step, 5)} of 5 here. Finish it while it is fresh.`;
  const before = all.slice(0, all.indexOf(topic)).filter((t) => learnedIds.has(t.id));
  const previous = before[before.length - 1];
  if (rank(topic.level) > rank(grammarLevel(learnerLevel))) return `You have learned every topic up to ${grammarLevel(learnerLevel)}. This is the first one beyond it.`;
  if (previous) return `You have learned ${previous.title}. This is the next ${topic.level} topic.`;
  return `It is the first ${topic.level} topic, a good place to start.`;
}

export interface LadderRung {
  level: GrammarLevel;
  total: number;
  learned: number;
}

/** The levels the grammar has, each with how many topics are learned. */
export function ladder(grammar: Grammar, learnedIds: ReadonlySet<string>): LadderRung[] {
  const topics = topicsOf(grammar);
  return GRAMMAR_LEVELS.map((level) => {
    const mine = topics.filter((t) => t.level === level);
    return { level, total: mine.length, learned: mine.filter((t) => learnedIds.has(t.id)).length };
  }).filter((r) => r.total > 0);
}

export type PathStatus = 'done' | 'current' | 'next' | 'later';
export interface PathStop {
  topic: Topic;
  status: PathStatus;
}

/** A level's topics as a path: learned ones, the topic to do now, the next two, then the rest. */
export function levelPath(grammar: Grammar, level: GrammarLevel, learnedIds: ReadonlySet<string>, nextId: string | undefined): PathStop[] {
  const all = topicsOf(grammar);
  const from = nextId ? all.findIndex((t) => t.id === nextId) : -1;
  const ahead = new Set(all.slice(from < 0 ? all.length : from + 1).filter((t) => !learnedIds.has(t.id)).slice(0, 2).map((t) => t.id));
  return all
    .filter((t) => t.level === level)
    .map((topic) => ({ topic, status: learnedIds.has(topic.id) ? 'done' : topic.id === nextId ? 'current' : ahead.has(topic.id) ? 'next' : 'later' }));
}

export interface WeakSpot {
  topic: Topic;
  lapses: number;
  due: number;
}

/** Topics whose items have been forgotten most, or are overdue: where a review helps. */
export function weakSpots(grammar: Grammar, items: readonly GrammarItemRow[], now: number, limit = 4): WeakSpot[] {
  const byTopic = new Map<string, { lapses: number; due: number }>();
  for (const i of items) {
    if (i.deletedAt || i.state === 0) continue;
    const row = byTopic.get(i.topic) ?? { lapses: 0, due: 0 };
    row.lapses += i.lapses;
    if (i.due <= now) row.due++;
    byTopic.set(i.topic, row);
  }
  return topicsOf(grammar)
    .map((topic) => ({ topic, ...(byTopic.get(topic.id) ?? { lapses: 0, due: 0 }) }))
    .filter((w) => w.lapses > 0)
    .sort((a, b) => b.lapses * 2 + b.due - (a.lapses * 2 + a.due))
    .slice(0, limit);
}
