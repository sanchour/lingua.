import { getLanguage } from '@/core/lang/languages';
import { askJson } from './client';

export interface WordExplanation {
  translation: string;
  lemma: string;
  partOfSpeech: string;
  /** e.g. "genitive singular, masculine" */
  form: string;
  explanation: string;
  notes: string[];
  examples: { text: string; translation: string }[];
}

/** Deep, in-context explanation of one word (Tier 2). */
export async function explainWord(lang: string, word: string, sentence: string): Promise<WordExplanation> {
  const name = getLanguage(lang)?.name ?? lang;
  const system =
    `You are a precise, friendly ${name} tutor for an English-speaking learner. ` +
    'Answer only with JSON matching: {"translation": string, "lemma": string, "partOfSpeech": string, "form": string, ' +
    '"explanation": string, "notes": string[], "examples": [{"text": string, "translation": string}]}. ' +
    '"translation" is the meaning in this sentence (a few words). "form" names the grammatical form briefly. ' +
    '"explanation" is 1–2 short sentences on why this form is used here. "notes" holds at most 3 short, useful points ' +
    '(idioms, collocations, aspect pairs, false friends, register). Give 2 simple example sentences in ' +
    `${name} with English translations. Write dictionary forms with stress marks where ${name} learners expect them.`;
  const user = `Sentence: ${sentence}\nWord: ${word}`;
  const result = await askJson<Partial<WordExplanation>>({ system, user, kind: 'wordInContext' });
  return {
    translation: result.translation ?? '',
    lemma: result.lemma ?? word,
    partOfSpeech: result.partOfSpeech ?? '',
    form: result.form ?? '',
    explanation: result.explanation ?? '',
    notes: Array.isArray(result.notes) ? result.notes.slice(0, 3) : [],
    examples: Array.isArray(result.examples) ? result.examples.slice(0, 3) : [],
  };
}
