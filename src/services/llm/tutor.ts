// 6-15: The tutor, in context (everywhere, with Max).
// Provides contextual language tutoring, nuances, explanations, progressive hints, analogies,
// grammar query matching, and custom explanations tailored to the learner's profile.
import { loadGrammar } from '@/core/grammar/load';
import { topicsOf } from '@/core/grammar/types';
import { getLanguage } from '@/core/lang/languages';
import { getLearnerSnapshot } from '@/core/tutor/context';
import type { LearnerContextSnapshot, TutorActionKind, TutorContext, TutorResponse } from '@/core/tutor/types';
import { getSettings } from '@/data/settings';
import type { Settings, TutorSettings } from '@/data/settings';
import { askJson } from './client';

export interface TutorDeps {
  ask?: (system: string, user: string) => Promise<string | unknown>;
  snapshot?: LearnerContextSnapshot;
}

/**
 * Builds the customized system prompt incorporating tutor settings, preset role,
 * target exposure ratio, complexity, and learner memory.
 */
export function buildTutorSystemPrompt(
  lang: string,
  settings: Settings,
  snapshot: LearnerContextSnapshot,
): string {
  const langName = getLanguage(lang)?.name ?? lang;
  const tutor: TutorSettings = settings.tutor;

  let roleVoice = '';
  switch (tutor.preset) {
    case 'editor':
      roleVoice = 'You are a meticulous writing and style editor. Focus on register, precision, collocations, false friends, idioms, and grammatical agreement.';
      break;
    case 'coach':
      roleVoice = 'You are an energetic, pragmatic language coach. Focus on communicative fluency, conversational confidence, high-frequency patterns, and real-world usage.';
      break;
    case 'teacher':
    default:
      roleVoice = 'You are a patient, encouraging language teacher. Break down complex linguistic concepts gently using clear analogies, progressive hints, and memorable explanations without condescension.';
      break;
  }

  let exposureInstruction = '';
  switch (tutor.targetExposure) {
    case 'immersion':
      exposureInstruction = `Write almost all of the explanation in ${langName} (90%+ target language exposure), with only minimal English glosses in parentheses where necessary.`;
      break;
    case 'mostly':
      exposureInstruction = `Write the core explanations and examples in ${langName} (~70% target language exposure), providing translations in English.`;
      break;
    case 'native':
      exposureInstruction = `Explain concepts in English, providing all examples and targeted vocabulary in ${langName}.`;
      break;
    case 'bilingual':
    default:
      exposureInstruction = `Provide clear bilingual explanations: explain grammar and nuances in English, while providing authentic expressions and examples in ${langName} with translations.`;
      break;
  }

  let complexityInstruction = '';
  switch (tutor.complexity) {
    case 'simple':
      complexityInstruction = 'Use simple, plain language. Avoid dense academic linguistic terminology. Explain like the learner is a beginner/intermediate.';
      break;
    case 'technical':
      complexityInstruction = 'Provide deep morphological, syntactic, and etymological precision. Use standard grammatical terms (e.g. subjunctive, declension, aspect, case).';
      break;
    case 'balanced':
    default:
      complexityInstruction = 'Balance clear everyday explanations with essential grammatical terms.';
      break;
  }

  let lengthInstruction = '';
  switch (tutor.sentenceLength) {
    case 'short':
      lengthInstruction = 'Keep sentences short, clear, and punchy.';
      break;
    case 'detailed':
      lengthInstruction = 'Provide thorough, detailed explanations with rich context.';
      break;
    case 'medium':
    default:
      lengthInstruction = 'Use moderate sentence lengths with clear structure.';
      break;
  }

  const interestsText = snapshot.interests.length > 0 ? snapshot.interests.join(', ') : 'everyday life, travel, literature';

  return (
    `You are Lingua's contextual language tutor for ${langName}. ${roleVoice}\n\n` +
    `Tone: Encouraging, grounded, calm, never gushing or overly dramatic. Follow the Lingua handbook style.\n` +
    `Style & Exposure: ${exposureInstruction} ${complexityInstruction} ${lengthInstruction}\n\n` +
    `Learner Context (from their study memory):\n` +
    `- Known vocabulary in ${langName}: approx ${snapshot.knownWordsCount} words.\n` +
    `- Studied topics: ${snapshot.studiedTopicTitles.join(', ') || 'foundation lessons'}.\n` +
    `- Recent recurring error categories: ${snapshot.recentMistakeCategories.join(', ') || 'none noted'}.\n` +
    `- Learner interests (adapt example sentences to these topics): ${interestsText}.\n\n` +
    `Answer ONLY with JSON matching the following schema:\n` +
    `{\n` +
    `  "title": string,\n` +
    `  "summary": string,\n` +
    `  "explanation": string,\n` +
    `  "analogy": string | null,\n` +
    `  "nuances": string[] | null,\n` +
    `  "examples": [{"target": string, "translation": string, "note": string | null}],\n` +
    `  "comparison": {"itemA": string, "itemB": string, "difference": string, "table": [{"feature": string, "a": string, "b": string}]} | null,\n` +
    `  "pronunciation": {"ipa": string, "tips": string, "stressPattern": string | null} | null,\n` +
    `  "culturalNote": string | null,\n` +
    `  "regionalNote": string | null,\n` +
    `  "matchedGrammarTopicIds": string[] | null,\n` +
    `  "hint": {"level1": string, "level2": string} | null,\n` +
    `  "whyIncorrect": string | null,\n` +
    `  "encouragement": string\n` +
    `}`
  );
}

/**
 * Builds the user prompt specifying the contextual material and the requested action.
 */
export function buildTutorUserPrompt(
  context: TutorContext,
  action: TutorActionKind,
  customQuestion?: string,
): string {
  const parts: string[] = [];
  parts.push(`Context Kind: ${context.kind}`);
  if (context.word) parts.push(`Target Word/Phrase: "${context.word}"`);
  if (context.sentence) parts.push(`Sentence on screen: "${context.sentence}"`);
  if (context.translation) parts.push(`Translation: "${context.translation}"`);
  if (context.topicTitle) parts.push(`Grammar Topic: "${context.topicTitle}" (${context.topicId ?? ''})`);
  if (context.userAnswer !== undefined) parts.push(`Learner's Submitted Answer: "${context.userAnswer}"`);
  if (context.correctAnswer !== undefined) parts.push(`Expected Correct Answer: "${context.correctAnswer}"`);
  if (context.room) parts.push(`Room: ${context.room}`);

  parts.push(`\nAction Requested: ${action}`);
  if (customQuestion) {
    parts.push(`Learner's Question: "${customQuestion}"`);
  }

  switch (action) {
    case 'give_hint':
      parts.push(
        'Instruction: The learner needs a hint without giving away the exact answer! ' +
        'In "hint", supply level1 (a gentle conceptual clue) and level2 (a closer grammatical or structural clue). ' +
        'Do NOT reveal the exact solution in either hint.'
      );
      break;
    case 'why_incorrect':
      parts.push(
        'Instruction: The learner made a mistake or had their writing corrected. ' +
        'In "whyIncorrect", explain specifically why their answer was incorrect or unnatural, ' +
        'contrast it with the correct phrasing, and explain the grammatical or semantic rule.'
      );
      break;
    case 'analogy':
      parts.push(
        'Instruction: Provide a memorable real-world analogy in "analogy" that makes this grammar pattern or linguistic concept click.'
      );
      break;
    case 'compare_words':
      parts.push(
        'Instruction: Compare this word or concept with its closest confusable counterpart. ' +
        'Fill "comparison" with itemA, itemB, a summary difference, and a comparison table of key features.'
      );
      break;
    case 'pronunciation':
      parts.push(
        'Instruction: Explain the pronunciation, phonetic nuance, and stress pattern. ' +
        'Fill "pronunciation" with standard IPA, mouth/tongue tips, and stress notes.'
      );
      break;
    case 'idiom_slang':
      parts.push(
        'Instruction: Explain whether this word or sentence contains an idiom, colloquialism, or slang. ' +
        'Describe the literal vs figurative meaning and where/when it is used.'
      );
      break;
    case 'regional_cultural':
      parts.push(
        'Instruction: Explain any regional variations (e.g. Spain vs Latin America, France vs Quebec) ' +
        'and cultural connotations or etiquette around this expression.'
      );
      break;
    case 'connections':
      parts.push(
        'Instruction: Explain how this rule or phrase connects to other lessons or foundational grammar patterns in this language.'
      );
      break;
    case 'simplify':
      parts.push(
        'Instruction: Break down and simplify this material into its simplest possible building blocks, easiest vocabulary, and shortest sentences.'
      );
      break;
    case 'custom_question':
    default:
      if (customQuestion) {
        parts.push(`Instruction: Answer the learner's question directly, clearly, and concisely.`);
      }
      break;
  }

  return parts.join('\n');
}

/**
 * Searches local grammar topics for any natural language query matches (F0222).
 */
export async function findMatchingGrammarTopics(lang: string, query: string): Promise<string[]> {
  try {
    const grammar = await loadGrammar(lang);
    if (!grammar) return [];
    const topics = topicsOf(grammar);
    const q = query.toLowerCase();
    const matches: string[] = [];
    for (const t of topics) {
      const title = t.title.toLowerCase();
      const desc = (t.summary ?? '').toLowerCase();
      if (title.includes(q) || desc.includes(q)) {
        matches.push(t.id);
      }
    }
    return matches.slice(0, 3);
  } catch {
    return [];
  }
}

/**
 * Main entry point: asks the contextual tutor for guidance, explanation, hints, or answers.
 */
export async function askTutor(
  lang: string,
  context: TutorContext,
  action: TutorActionKind,
  customQuestion?: string,
  deps?: TutorDeps,
): Promise<TutorResponse> {
  const settings = await getSettings();
  const snapshot = deps?.snapshot ?? (await getLearnerSnapshot(lang, settings));

  const system = buildTutorSystemPrompt(lang, settings, snapshot);
  const user = buildTutorUserPrompt(context, action, customQuestion);

  let raw: Partial<TutorResponse>;
  if (deps?.ask) {
    const response = await deps.ask(system, user);
    raw = typeof response === 'string' ? JSON.parse(response) : (response as Partial<TutorResponse>);
  } else {
    raw = await askJson<Partial<TutorResponse>>({
      system,
      user,
      kind: 'tutor' as any,
    });
  }

  // Also check if any local grammar topics match natural language search (F0222)
  let matchedIds = raw.matchedGrammarTopicIds ?? [];
  if (matchedIds.length === 0 && (customQuestion || context.topicTitle || context.word)) {
    const q = customQuestion ?? context.topicTitle ?? context.word ?? '';
    if (q.length > 2) {
      matchedIds = await findMatchingGrammarTopics(lang, q);
    }
  }

  return {
    title: raw.title ?? context.word ?? context.topicTitle ?? 'Tutor Explanation',
    summary: raw.summary ?? '',
    explanation: raw.explanation ?? 'Here is what you need to know about this pattern.',
    analogy: raw.analogy ?? undefined,
    nuances: Array.isArray(raw.nuances) ? raw.nuances : undefined,
    examples: Array.isArray(raw.examples) ? raw.examples : [],
    comparison: raw.comparison ?? undefined,
    pronunciation: raw.pronunciation ?? undefined,
    culturalNote: raw.culturalNote ?? undefined,
    regionalNote: raw.regionalNote ?? undefined,
    matchedGrammarTopicIds: matchedIds.length > 0 ? matchedIds : undefined,
    hint: raw.hint ?? undefined,
    whyIncorrect: raw.whyIncorrect ?? undefined,
    encouragement: raw.encouragement ?? 'Keep practicing: noticing these patterns is how fluency builds.',
  };
}
