// Diarium's AI: today's writing prompt, and a careful reading of an entry (corrections, scores, CEFR).
import { getLanguage } from '@/core/lang/languages';
import type { Level } from '@/core/lang/levels';
import { getSettings } from '@/data/settings';
import type { CorrectionCategory, JournalCorrection, JournalReview } from '@/data/types';
import { localDateKey } from '@/lib/format';
import { askJson } from './client';
import { FEEDBACK_KINDS, WRITING_RUBRIC, parseWritingFeedback } from '@/core/journal/feedback';

export interface JournalModel {
  name: string;
  complete: (request: { system: string; user: string; kind: 'journalCheck' }) => Promise<unknown>;
}

export const CATEGORIES: CorrectionCategory[] = ['grammar', 'spelling', 'word choice', 'word order', 'agreement', 'tense/aspect', 'case', 'punctuation', 'style'];

const clampScore = (n: unknown) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
const CEFR = /^(A1|A2|B1|B2|C1|C2)$/;

/** A fresh prompt for today, suited to the level (cached for the day). */
export async function aiPrompt(lang: string, level: Level): Promise<{ text: string; en: string }> {
  const name = getLanguage(lang)?.name ?? lang;
  const system =
    `You write short daily journal prompts for a ${name} learner at CEFR ${level === 'A0' ? 'A1' : level}. ` +
    'Answer only with JSON: {"prompt": string, "english": string}. The prompt is one or two sentences in ' +
    `${name}, warm and concrete, about everyday life, memories, opinions or plans, using vocabulary that fits the level. ` +
    '"english" is its translation.';
  const result = await askJson<{ prompt?: string; english?: string }>({ system, user: `Date: ${localDateKey()}`, kind: 'journalPrompt' });
  if (!result.prompt) throw new Error('No prompt came back.');
  return { text: result.prompt.trim(), en: (result.english ?? '').trim() };
}

/** Reads an entry like a kind teacher: what to fix, why, how a native would say it, and a grade. */
export async function checkEntry(lang: string, level: Level, text: string, prompt?: string, injected?: JournalModel): Promise<JournalReview> {
  const name = getLanguage(lang)?.name ?? lang;
  const system =
    `You are a warm, exact ${name} writing teacher. The learner (about CEFR ${level === 'A0' ? 'A1' : level}) wrote a journal entry. ` +
    'Answer only with JSON matching: {"corrected": string, "natural": string, "corrections": [{"original": string, ' +
    '"suggestion": string, "category": string, "explanation": string, "severity": "minor" | "major"}], ' +
    '"scores": {"grammar": number, "vocabulary": number, "coherence": number, "overall": number}, "cefr": string, ' +
    '"strengths": string[], "tip": string, "writingFeedback": {"suggestions": [{"kind": string, "original": string, "suggestion": string, "why": string}], "rubric": [{"criterion": string, "score": number, "reason": string}]}}. ' +
    `Suggestions are optional alternatives, preserving the writer's voice; never rewrite automatically. Kinds: ${FEEDBACK_KINDS.join(', ')}. ` +
    'Discuss register and formality for the task, an option one level higher, idioms, precise words, unnatural expressions and possible literal translations (label uncertainty). Quote original words exactly. Offer several alternatives when useful. ' +
    `Assess these criteria against the task brief and length, with reasons and scores 0 (not shown) to 4 (fully met): ${WRITING_RUBRIC.join('; ')}. Without a task assess the journal as free writing. ` +
    '"corrected" is the entry with only the necessary fixes, keeping the learner\'s words, sentences and line breaks wherever they are correct. ' +
    `"natural" is how a native speaker would write the same content (natural, not fancy). ` +
    `Each correction quotes the exact "original" words from the entry and the "suggestion" replacing them; category is one of: ${CATEGORIES.join(', ')}. ` +
    'Explanations are one short sentence in English, specific to this mistake. Severity "major" means it hinders understanding or is a basic-level error. ' +
    'Scores are 0–100 for the stated level of ability shown (be honest and consistent: 90+ only for near-flawless writing). ' +
    '"cefr" is your estimate (A1–C2) of the level this text shows. Give exactly two "strengths" and one focused "tip", all in English, short.';
  const user = (prompt ? `Prompt: ${prompt}\n\n` : '') + `Entry:\n${text}`;
  const model = injected ?? { name: (await getSettings()).llm.model, complete: (request: Parameters<JournalModel['complete']>[0]) => askJson<unknown>(request) };
  const response = await model.complete({ system, user, kind: 'journalCheck' });
  if (!response || typeof response !== 'object' || Array.isArray(response)) throw new Error('The writing review did not have the expected format. Try again.');
  const raw = response as Partial<Omit<JournalReview, 'scores'>> & { scores?: Record<string, unknown> };

  const corrections: JournalCorrection[] = (Array.isArray(raw.corrections) ? raw.corrections : [])
    .filter((c) => c && typeof c.original === 'string' && Boolean(c.original.trim()) && text.includes(c.original) && typeof c.suggestion === 'string' && c.original !== c.suggestion)
    .map((c) => ({
      original: c.original,
      suggestion: c.suggestion,
      category: CATEGORIES.includes(c.category as CorrectionCategory) ? (c.category as CorrectionCategory) : 'grammar',
      explanation: String(c.explanation ?? ''),
      severity: c.severity === 'major' ? 'major' : 'minor',
    }));
  const s = raw.scores ?? {};
  return {
    text,
    corrected: typeof raw.corrected === 'string' && raw.corrected.trim() ? raw.corrected : text,
    natural: typeof raw.natural === 'string' ? raw.natural : '',
    corrections,
    scores: { grammar: clampScore(s.grammar), vocabulary: clampScore(s.vocabulary), coherence: clampScore(s.coherence), overall: clampScore(s.overall) },
    cefr: CEFR.test(String(raw.cefr)) ? String(raw.cefr) : '',
    strengths: (Array.isArray(raw.strengths) ? raw.strengths : []).map(String).slice(0, 2),
    tip: String(raw.tip ?? ''),
    writingFeedback: parseWritingFeedback(raw.writingFeedback, text),
    model: model.name,
    reviewedAt: Date.now(),
  };
}
