import { getLanguage } from '@/core/lang/languages';
import { shuffle } from '@/core/text/checks';
import type { CheckItem } from '@/core/text/checks';
import { askJson } from './client';

type StoryItem = Extract<CheckItem, { kind: 'story' }>;

/** The AI's answer, checked: two questions at most, each with its answer and three different wrong ones. */
export function readStoryQuestions(raw: unknown, random: () => number = Math.random): StoryItem[] {
  const list = raw && typeof raw === 'object' && Array.isArray((raw as { questions?: unknown }).questions) ? (raw as { questions: unknown[] }).questions : [];
  const out: StoryItem[] = [];
  for (const q of list) {
    if (!q || typeof q !== 'object') continue;
    const { question, en, answer, wrong } = q as Record<string, unknown>;
    if (typeof question !== 'string' || typeof answer !== 'string' || !question.trim() || !answer.trim() || !Array.isArray(wrong)) continue;
    const others = [...new Set(wrong.filter((w): w is string => typeof w === 'string' && Boolean(w.trim()) && w.trim() !== answer.trim()).map((w) => w.trim()))].slice(0, 3);
    if (others.length < 2) continue;
    out.push({ kind: 'story', question: question.trim(), en: typeof en === 'string' && en.trim() ? en.trim() : undefined, answer: answer.trim(), options: shuffle([answer.trim(), ...others], random) });
    if (out.length === 2) break;
  }
  return out;
}

/** With Max and a key: two questions about what happens in the text, for "Check yourself" (5.1-3a). */
export async function storyQuestions(lang: string, text: string): Promise<StoryItem[]> {
  const name = getLanguage(lang)?.name ?? lang;
  const system =
    `You write reading questions for a learner of ${name} who has just read the text below. ` +
    'Answer only with JSON matching: {"questions": [{"question": string, "en": string, "answer": string, "wrong": [string, string, string]}]}. ' +
    `Write exactly 2 questions about what happens or what is said in the text, not about single words, in simple ${name}; ` +
    '"en" is the question in English. "answer" is the right answer and "wrong" three wrong but believable ones, ' +
    `each at most 8 words, in ${name}, about as long as each other. The answer must follow from the text alone.`;
  return readStoryQuestions(await askJson<unknown>({ system, user: text.slice(0, 6000), kind: 'storyQuestions' }));
}
