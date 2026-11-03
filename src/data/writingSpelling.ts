import { tokenize } from '@/core/text/tokenizer';
import { packId } from '@/core/packs/format';
import { foldKey, normalizeWord } from '@/core/text/normalize';
import { db } from './db';
import type { LinguaDB } from './db';

/** Dictionary absence is a possible spelling issue, never proof that a name or inflected form is wrong. */
export async function writingSpelling(lang: string, text: string, database: LinguaDB = db) {
  const norms = [...new Set(tokenize(text, lang).filter((t) => t.isWord).map((t) => t.norm!))];
  const checked = norms.slice(0, 500);
  const pack = packId(lang);
  const [forms, entries, full, installed] = await Promise.all([
    database.dictForms.bulkGet(checked.map((n) => [pack, n] as [string, string])),
    database.dictEntries.bulkGet(checked.map((n) => [pack, n] as [string, string])),
    Promise.all(checked.map((n) => database.fullDict.where('[lang+fold]').equals([lang, foldKey(n, lang)]).filter((r) => normalizeWord(r.word, lang) === n).first())),
    Promise.all([database.dictEntries.where('[pack+lemma]').between([pack, ''], [pack, '\uffff']).first(), database.fullDict.where('lang').equals(lang).first()]),
  ]);
  if (!installed.some(Boolean)) throw new Error('Install this language’s dictionary before checking spelling.');
  return { checked: checked.length, total: norms.length, missing: checked.filter((_n, i) => !forms[i] && !entries[i] && !full[i]) };
}
