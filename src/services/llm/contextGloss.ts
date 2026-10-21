// Words in their sentence: the AI reads one sentence and gives each word the short English meaning
// it has there (not a translation of the sentence). Cached like every AI answer, so a sentence is
// asked about once.
import { getLanguage } from '@/core/lang/languages';
import { getAiSettings } from '@/data/plan';
import { askJson } from './client';

/** Context glosses are used when they're switched on and an AI key and model are set. */
export async function contextGlossesEnabled(): Promise<boolean> {
  const { reader, llm, apiKeys } = await getAiSettings();
  return reader.contextGlosses && Boolean(apiKeys[llm.provider] && llm.model);
}

/** One gloss per word, in order ('' where the AI gave none). */
export async function contextGlosses(lang: string, sentence: string, words: string[]): Promise<string[]> {
  const name = getLanguage(lang)?.name ?? lang;
  const system =
    `You are a precise ${name}–English dictionary for a learner reading a text. ` +
    'For each numbered word, give the English meaning it has in this sentence: 1 to 4 words, the sense the context needs ' +
    '(for example Spanish "cada tarde" → tarde: "evening"), in the form that fits (a verb as "goes", "went", "to go"). ' +
    'Give a short gloss for small words too. Never translate the whole sentence into one entry. ' +
    'Answer only with JSON: {"g": [string, ...]} with exactly one entry per numbered word, in order.';
  const user = JSON.stringify({ sentence, words: words.map((w, i) => `${i + 1}. ${w}`) });
  const result = await askJson<{ g?: unknown }>({ system, user, kind: 'wordInContext' });
  const list = Array.isArray(result.g) ? result.g.map((x) => String(x ?? '').trim()) : [];
  return words.map((_, i) => list[i] ?? '');
}
