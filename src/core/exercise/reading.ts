// Reading uses the shared typed, ordering and matching screens; evidence keeps the source text id.
import type { ExerciseSpec, MatchBody, TaskBody } from '@/core/contracts/exercise';
import { shuffle } from '@/core/text/checks';

export const READING_KINDS = ['main-idea', 'true-false', 'events', 'title', 'context', 'headings', 'odd-sentence', 'short-answer'] as const;
export type ReadingKind = typeof READING_KINDS[number];
export const READING_LABELS: Record<ReadingKind, string> = { 'main-idea': 'Main idea', 'true-false': 'True or false', events: 'Order of events', title: 'A suitable title', context: 'Meaning from context', headings: 'Headings and paragraphs', 'odd-sentence': 'The sentence that does not belong', 'short-answer': 'Short answer' };
export interface ReadingQuestion { kind: ReadingKind; question: string; answer: string; quote: string; why: string; options?: string[]; items?: string[]; pairs?: MatchBody['pairs'] }
const str = (x: unknown, max = 2000): x is string => typeof x === 'string' && Boolean(x.trim()) && x.length <= max;
const unique = (xs: string[]) => new Set(xs.map((x) => x.trim().toLocaleLowerCase())).size === xs.length;

/** Shape and exact source quotes are checked, not the truth of the model's interpretation. */
export function readReadingQuestions(raw: unknown, source: string): ReadingQuestion[] {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as { questions?: unknown }).questions)) return [];
  const out: ReadingQuestion[] = [];
  for (const value of (raw as { questions: unknown[] }).questions.slice(0, 16)) {
    if (!value || typeof value !== 'object') continue;
    const q = value as Record<string, unknown>;
    if (!READING_KINDS.includes(q.kind as ReadingKind) || !str(q.question, 600) || !str(q.answer) || !str(q.quote) || !source.includes(q.quote) || !str(q.why, 600)) continue;
    const item: ReadingQuestion = { kind: q.kind as ReadingKind, question: q.question.trim(), answer: q.answer.trim(), quote: q.quote, why: q.why.trim() };
    if (item.kind === 'true-false' || item.kind === 'odd-sentence') {
      if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 5 || !q.options.every((o) => str(o, 600)) || !unique(q.options) || !/^[1-5]$/.test(item.answer) || Number(item.answer) > q.options.length) continue;
      if (item.kind === 'true-false' && (q.options.length !== 2 || q.options[0] !== 'True' || q.options[1] !== 'False')) continue;
      if (item.kind === 'odd-sentence' && !q.options.every((o, i) => i === Number(item.answer) - 1 || source.includes(o))) continue;
      item.options = q.options;
    }
    if (item.kind === 'events') {
      if (!Array.isArray(q.items) || q.items.length < 3 || q.items.length > 6 || !q.items.every((s) => str(s, 600) && source.includes(s)) || !unique(q.items)) continue;
      item.items = q.items;
    }
    if (item.kind === 'headings') {
      if (!Array.isArray(q.pairs) || q.pairs.length < 2 || q.pairs.length > 5) continue;
      const pairs: MatchBody['pairs'] = [];
      for (const p of q.pairs) {
        if (p && typeof p === 'object' && str(p.left, 1200) && source.includes(p.left) && str(p.right, 200)) pairs.push({ left: p.left, right: p.right });
      }
      if (pairs.length !== q.pairs.length || !unique(pairs.map((p) => p.left)) || !unique(pairs.map((p) => p.right))) continue;
      item.pairs = pairs;
    }
    out.push(item);
  }
  return out;
}

export function readingSpec(lang: string, textId: string, question: ReadingQuestion, index: number, rating: 'self' | 'ai' = 'self', random: () => number = Math.random): ExerciseSpec {
  const base = { key: `reading:${textId}:${index}`, lang, instruction: `${READING_LABELS[question.kind]} · ${question.question}`, trains: { skill: 'reading' as const, item: { type: 'text' as const, textId } }, feedback: { why: `${question.why}\nSource: ${question.quote}` } };
  if (question.kind === 'events' && question.items) return { ...base, kind: 'drag-drop', body: { prompt: question.question, tiles: shuffle(question.items, random) }, check: { rule: 'order', answer: question.items } };
  if (question.kind === 'headings' && question.pairs) return { ...base, kind: 'match-definition', body: { what: 'definition', pairs: question.pairs }, check: { rule: 'self', modelAnswer: question.pairs.map((p) => `${p.left} → ${p.right}`).join('\n') } };
  const options = question.options?.map((o, i) => `${i + 1}. ${o}`) ?? [];
  const body: TaskBody = { task: 'question', given: [question.question, ...options], prompt: question.question };
  return { ...base, instruction: base.instruction + (options.length ? ' · Type the option number' : ''), kind: 'rewrite', body, check: options.length ? { rule: 'exact', expected: question.answer } : rating === 'ai' ? { rule: 'ai', modelAnswer: question.answer, criteria: 'Answer from the source passage alone; equivalent wording is accepted.' } : { rule: 'self', modelAnswer: question.answer } };
}

/** Offline free answers have a self-check guide, never a fabricated model interpretation. */
export function selfReadingSpecs(lang: string, textId: string): ExerciseSpec[] {
  return [
    ['Main idea: explain the passage in one or two sentences.', 'Does your answer name the central subject and what the passage says about it, without adding facts?'],
    ['A suitable title: suggest a title and explain your choice.', 'Does the title fit the whole passage, and does your reason refer to something actually in it?'],
    ['Meaning from context: pick a word and explain what it means here.', 'Quote the word and the clues around it. Does your explanation fit this passage? A dictionary can help you check.'],
    ['Short answer: what did you learn from this passage? Give two details.', 'Can you point to both details in the passage? Separate what it says from your own inference.'],
  ].map(([prompt, guide], index) => ({ key: `self-reading:${textId}:${index}`, kind: 'rewrite', lang, instruction: prompt, body: { task: 'question', given: [prompt], prompt } satisfies TaskBody, check: { rule: 'self', modelAnswer: guide }, trains: { skill: 'reading', item: { type: 'text', textId } } }));
}
