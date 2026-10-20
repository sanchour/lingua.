import type { FullDictRow } from '@/core/dictionary/format';
import { getLanguage } from '@/core/lang/languages';
import { askJson } from './client';

/** A dictionary entry put in order by AI: the living meanings, most common first. */
export interface TidiedEntry {
  /** One line: what the word is and how it's used. */
  summary: string;
  senses: Array<{ meaning: string; register?: string; example?: { text: string; translation: string } }>;
  tip?: string;
}

/**
 * Tidies a Wiktionary entry with the learner's own key (Ordo › AI): merges overlapping senses,
 * orders them by how common they are today, and adds a natural example to each. Cached, so each
 * word costs one request once.
 */
export async function tidyEntry(lang: string, row: FullDictRow): Promise<TidiedEntry> {
  const name = getLanguage(lang)?.name ?? lang;
  const system =
    `You are a lexicographer writing a learner's dictionary of ${name} for English speakers. ` +
    'From the raw dictionary data, answer only with JSON: {"summary": string, "senses": [{"meaning": string, "register": string, "example": {"text": string, "translation": string}}], "tip": string}. ' +
    '"senses": at most 6, the meanings a learner meets today, most common first; merge senses that overlap; leave out archaic, rare and technical ones unless the word has no other. ' +
    '"meaning" is a short plain English gloss (a few words). "register" is empty or one word (formal, informal, slang, regional, literary). ' +
    `"example" is one short, natural, modern ${name} sentence using the word, with its English translation. ` +
    '"summary" is one short sentence on what the word is and how it is used. "tip" is one short note a learner should know (a collocation, a false friend, a common mistake), or empty.';
  const user = JSON.stringify({
    word: row.word,
    entries: row.entries.map((e) => ({ pos: e.pos, gender: e.gender, senses: e.senses.map((s) => [s.g.join('; '), ...(s.tags ?? [])].join(' | ')) })),
  });
  const result = await askJson<Partial<TidiedEntry>>({ system, user, kind: 'dictTidy' });
  return {
    summary: typeof result.summary === 'string' ? result.summary : '',
    senses: Array.isArray(result.senses) ? result.senses.filter((s) => s && typeof s.meaning === 'string').slice(0, 6) : [],
    tip: typeof result.tip === 'string' && result.tip.trim() ? result.tip : undefined,
  };
}
