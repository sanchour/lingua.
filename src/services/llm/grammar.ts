// Grammatica's AI (with a key): a sentence of the learner's own, checked against the topic.
import { getLanguage } from '@/core/lang/languages';
import { askJson } from './client';

export interface OwnSentenceCheck {
  /** The sentence is correct (small slips of punctuation or a missing accent aside). */
  correct: boolean;
  /** It uses the structure the topic is about. */
  usesTopic: boolean;
  /** The sentence with only the necessary fixes (the same as the learner's when correct). */
  corrected: string;
  /** Its meaning in English. */
  english: string;
  /** One or two short sentences in English: what was right, or what to fix and why. */
  explanation: string;
}

/** Reads one sentence like a kind teacher: is it right, does it use the topic, and why. */
export async function checkOwnSentence(lang: string, topic: { title: string; summary: string }, sentence: string): Promise<OwnSentenceCheck> {
  const name = getLanguage(lang)?.name ?? lang;
  const system =
    `You are a warm, exact ${name} grammar teacher for an English-speaking learner. The learner is practising "${topic.title}" ` +
    `(${topic.summary}) and wrote one sentence of their own. Answer only with JSON matching: {"correct": boolean, "usesTopic": boolean, ` +
    '"corrected": string, "english": string, "explanation": string}. "correct" is true when the sentence is grammatical and natural; ' +
    'ignore capitals and final punctuation. "usesTopic" is true when it uses the structure being practised. "corrected" keeps the ' +
    "learner's words and changes only what must change. \"explanation\" is one or two short sentences in English: say what is good, or " +
    'name the mistake and the rule that fixes it. Never invent rules; if unsure, say the sentence is fine.';
  const r = await askJson<Partial<OwnSentenceCheck>>({ system, user: sentence.trim(), kind: 'grammarSentence' });
  return {
    correct: Boolean(r.correct),
    usesTopic: r.usesTopic !== false,
    corrected: (r.corrected ?? sentence).trim(),
    english: (r.english ?? '').trim(),
    explanation: (r.explanation ?? '').trim(),
  };
}
