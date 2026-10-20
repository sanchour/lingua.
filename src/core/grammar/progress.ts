// How far a learner has come in each grammar topic. Pure: the rows come from data/grammar.ts.
import { hashString } from '@/core/hash';
import { MATURE_DAYS } from '@/core/srs/scheduler';
import type { GrammarItemRow, GrammarProgressRow } from '@/data/types';
import { GRAMMAR_LEVELS, plain, topicsOf } from './types';
import type { Grammar, GrammarLevel, Item, Topic } from './types';

/** The five steps every topic climbs (GRAMMAR-PLAN, "How a lesson progresses"). */
export const STEPS = [
  { n: 1, name: 'Recognise', hint: 'Which sentence is right?' },
  { n: 2, name: 'Pick', hint: 'Fill the gap' },
  { n: 3, name: 'Build', hint: 'Type the form' },
  { n: 4, name: 'Use', hint: 'Order the words, spot the mistake' },
  { n: 5, name: 'Say it', hint: 'Build it from English' },
] as const;

export type Step = 1 | 2 | 3 | 4 | 5;
/** A step is passed at this share of first-try answers right. */
export const PASS = 0.8;
/** A topic counts as mastered once this share of its items is mature. */
export const MASTERED_SHARE = 0.5;

/** An item's stable key within its topic: its sentence, hashed. */
export const itemKey = (item: Item) => hashString(plain(item.s));
export const itemId = (lang: string, topic: string, key: string) => `${lang}:${topic}:${key}`;
export const progressId = (lang: string, topic: string) => `${lang}:${topic}`;

export interface TopicState {
  /** The step being worked on (1–5); 6 when learned. */
  step: number;
  learned: boolean;
  mastered: boolean;
  /** 0–1 for the ring: steps passed, then full. */
  ring: number;
  /** Items seen at least once. */
  seen: number;
  /** Items due for review now. */
  due: number;
  started: boolean;
}

export function topicState(topic: Topic, progress: GrammarProgressRow | undefined, items: GrammarItemRow[], now: number): TopicState {
  const step = Math.min(6, Math.max(1, progress?.step ?? 1));
  const learned = step >= 6;
  const mine = items.filter((i) => i.topic === topic.id && !i.deletedAt);
  const mature = mine.filter((i) => i.state === 2 && i.scheduledDays >= MATURE_DAYS).length;
  const mastered = learned && topic.items.length > 0 && mature / topic.items.length >= MASTERED_SHARE;
  return {
    step,
    learned,
    mastered,
    ring: learned ? 1 : (step - 1) / 5,
    seen: mine.filter((i) => i.state !== 0).length,
    due: mine.filter((i) => i.state !== 0 && i.due <= now).length,
    started: Boolean(progress && (progress.lessons > 0 || progress.step > 1)),
  };
}

const levelRank = (level: string) => {
  const i = GRAMMAR_LEVELS.indexOf(level as GrammarLevel);
  return i < 0 ? 0 : i;
};

/**
 * "Next up": the first topic not yet learned at or below the learner's level (A0 counts as A1),
 * else the first not learned at all. Nothing is locked; this is only a suggestion.
 */
export function nextTopic(grammar: Grammar, progress: Map<string, GrammarProgressRow>, learnerLevel: string): Topic | undefined {
  const reach = Math.max(levelRank(learnerLevel === 'A0' ? 'A1' : learnerLevel), 0);
  const open = topicsOf(grammar).filter((t) => (progress.get(t.id)?.step ?? 1) < 6);
  return open.find((t) => levelRank(t.level) <= reach) ?? open[0];
}

/** The topic whose paradigm tags fit a form's tags best ("Why this form?"). */
export function topicForTags(grammar: Grammar, formTags: string): Topic | undefined {
  const have = new Set(formTags.split(/\s+/).filter(Boolean));
  let best: { topic: Topic; size: number } | undefined;
  for (const topic of topicsOf(grammar)) {
    for (const entry of topic.tags ?? []) {
      const need = entry.split(/\s+/).filter(Boolean);
      if (need.length && need.every((t) => have.has(t)) && (!best || need.length > best.size)) best = { topic, size: need.length };
    }
  }
  return best?.topic;
}
