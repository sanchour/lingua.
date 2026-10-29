// Checking an answer against its rule (contracts/exercise.ts `AnswerRule`). Offline and free: case, punctuation,
// stress marks and a leading article never count against the learner (core/srs/answer.ts); the 'ai' and 'self' rules
// can't be judged here, so they come back 'ungraded' for the screen to settle with Max or a self-rating.
import type { AnswerRule, ExerciseSpec } from '@/core/contracts/exercise';
import type { Outcome } from '@/core/contracts/learner';
import { checkAnswer, normalizeAnswer } from '@/core/srs/answer';
import type { AnswerCheck } from '@/core/srs/answer';

export type Given = string | string[] | number;

export interface Judgement {
  verdict: AnswerCheck['verdict'] | 'ungraded';
  outcome: Outcome;
  /** The model answer to show; empty when the rule has none to type (a choice's options are the screen's). */
  expected: string;
  note?: AnswerCheck['note'];
  /** What to say about a near miss or a wrong answer, when there is something useful to say. */
  message?: string;
}

const OUTCOME: Record<Judgement['verdict'], Outcome> = { exact: 'right', close: 'close', wrong: 'wrong', ungraded: 'ungraded' };

const text = (given: Given) => (Array.isArray(given) ? given.join(' ') : String(given));

/** How many letters two answers share from the start, for "right stem, wrong ending". */
function commonStart(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

function made(verdict: Judgement['verdict'], expected: string, note?: AnswerCheck['note']): Judgement {
  return { verdict, outcome: OUTCOME[verdict], expected, note };
}

/** Judges `given` by the rule. Typed answers are compared the way every typing exercise already does. */
export function judge(rule: AnswerRule, given: Given, lang: string): Judgement {
  switch (rule.rule) {
    case 'exact': {
      const same = normalizeAnswer(text(given), lang) === normalizeAnswer(rule.expected, lang);
      return made(same ? 'exact' : 'wrong', rule.expected);
    }
    case 'accent-blind': {
      const typed = normalizeAnswer(text(given), lang);
      // A real form that only looks like a slip (habló / hablo) is the wrong answer, not a near miss.
      if (rule.rejects?.some((r) => normalizeAnswer(r, lang) === typed)) return withMessage(made('wrong', rule.expected), typed, lang);
      const check = checkAnswer(text(given), rule.expected, lang);
      return withMessage(made(check.verdict, check.expected, check.note), typed, lang);
    }
    case 'accepted': {
      let best: Judgement = made('wrong', rule.accepted[0] ?? '');
      for (const accepted of rule.accepted) {
        const check = checkAnswer(text(given), accepted, lang);
        if (check.verdict === 'exact') return made('exact', check.expected);
        if (check.verdict === 'close' && best.verdict === 'wrong') best = made('close', check.expected, check.note);
      }
      return withMessage(best, normalizeAnswer(text(given), lang), lang);
    }
    case 'choice':
      return made(given === rule.answer ? 'exact' : 'wrong', '');
    case 'order': {
      const norm = (list: string[]) => list.map((t) => normalizeAnswer(t, lang)).join(' ');
      return made(Array.isArray(given) && norm(given) === norm(rule.answer) ? 'exact' : 'wrong', rule.answer.join(' '));
    }
    case 'ai':
      return made('ungraded', rule.modelAnswer);
    case 'self':
      return made('ungraded', rule.modelAnswer);
  }
}

/** The line under a typed answer: what was nearly right, or which part was wrong. */
function withMessage(j: Judgement, typed: string, lang: string): Judgement {
  if (j.verdict === 'close') return { ...j, message: j.note === 'accent' ? 'Right form: mind the accent.' : 'Nearly: one letter is off.' };
  if (j.verdict === 'wrong' && typed) {
    const target = normalizeAnswer(j.expected, lang);
    // Most of the word is there: the stem is right and the ending is not.
    if (target.length >= 4 && commonStart(typed, target) >= Math.ceil(target.length / 2)) return { ...j, message: 'Right stem, wrong ending.' };
  }
  return j;
}

/** The model answer, written out, for the feedback bar. */
export function solutionOf(spec: ExerciseSpec): string {
  const rule = spec.check;
  switch (rule.rule) {
    case 'exact':
    case 'accent-blind':
      return rule.expected;
    case 'accepted':
      return rule.accepted[0] ?? '';
    case 'order':
      return rule.answer.join(' ');
    case 'ai':
    case 'self':
      return rule.modelAnswer;
    case 'choice':
      return '';
  }
}
