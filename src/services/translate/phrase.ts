// A selected phrase, sentence or paragraph in English: by the AI when a key is set (it reads the
// sentence around it for meaning), otherwise by the free translators.
import { getLanguage } from '@/core/lang/languages';
import { getAiSettings } from '@/data/plan';
import { askJson } from '@/services/llm/client';
import { sentenceKey } from './ahead';
import { translateLine } from './gloss';

export interface PhraseTranslation {
  text: string;
  by: 'ai' | 'online';
}

export async function translatePhrase(lang: string, raw: string, sentence?: string): Promise<PhraseTranslation | null> {
  // One spacing, so a sentence translated ahead (services/translate/ahead) is found in the cache.
  const text = sentenceKey(raw);
  if (sentence && sentenceKey(sentence) === text) sentence = undefined;
  const { llm, apiKeys } = await getAiSettings();
  if (apiKeys[llm.provider] && llm.model) {
    const name = getLanguage(lang)?.name ?? lang;
    const system =
      `Translate ${name} text into natural, faithful English for a learner. When it is only part of a sentence, translate just ` +
      'that part, using the whole sentence to get the meaning right. Answer only with JSON: {"translation": string}.';
    try {
      const out = await askJson<{ translation?: string }>({ system, user: JSON.stringify({ text, sentence: sentence && sentence !== text ? sentence : undefined }), kind: 'sentence' });
      if (out.translation?.trim()) return { text: out.translation.trim(), by: 'ai' };
    } catch {
      // Fall back to the free translators below.
    }
  }
  const online = await translateLine(lang, text).catch(() => null);
  return online ? { text: online, by: 'online' } : null;
}
