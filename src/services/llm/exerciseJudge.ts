// A free sentence judged by meaning (6-4b), with the learner's own key: did it do what was asked, and say it correctly?
import type { ExerciseSpec } from '@/core/contracts/exercise';
import { getLanguage } from '@/core/lang/languages';
import { askJson } from './client';

export interface Judged {
  verdict: 'good' | 'partly' | 'not';
  explanation: string;
}

/** What the model answered, if it has the shape it must. */
export function readJudged(raw: unknown): Judged | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r.verdict !== 'good' && r.verdict !== 'partly' && r.verdict !== 'not') return null;
  return { verdict: r.verdict, explanation: typeof r.explanation === 'string' ? r.explanation.trim().slice(0, 400) : '' };
}

export async function judgeFree(spec: ExerciseSpec, given: string): Promise<Judged> {
  const name = getLanguage(spec.lang)?.name ?? spec.lang;
  const model = spec.check.rule === 'ai' || spec.check.rule === 'self' ? spec.check.modelAnswer : '';
  const system =
    `You check a learner's ${name} sentence. They were asked: "${spec.instruction}". Answer only with JSON: {"verdict": "good" | "partly" | "not", "explanation": string}. ` +
    '"good": it does what was asked and is correct (it need not match the model answer word for word). "partly": it does what was asked but has a small mistake, or is correct but only partly does it. "not": it does not do what was asked, or is wrong. ' +
    '"explanation" is one short, kind sentence in English saying what is right or what to change.';
  const raw = await askJson<unknown>({ system, user: JSON.stringify({ task: spec.body, modelAnswer: model, learnerAnswer: given }), kind: 'exerciseJudge' });
  const judged = readJudged(raw);
  if (!judged) throw new Error('The AI answer could not be read.');
  return judged;
}
