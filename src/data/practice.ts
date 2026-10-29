// What the practice sets are made from (6-4b): the learner's own words with what the dictionary says of them, and grammar topics.
import { gridOfFormTable } from '@/core/exercise';
import type { FormGrid, WordFacts } from '@/core/exercise';
import { loadGrammar } from '@/core/grammar/load';
import { topicsOf } from '@/core/grammar/types';
import type { Item, Topic } from '@/core/grammar/types';
import { formTables } from '@/core/lang/paradigm';
import { packId } from '@/core/packs/format';
import { lookUpFull } from '@/services/dictionary/fullDict';
import { db } from './db';
import type { LinguaDB } from './db';
import type { Note } from './types';

/** How many of the learner's words a practice set draws on. */
const WORDS = 60;

/** The learner's words with a meaning: notes of their decks (not archived), most recently added first. */
export async function practiceNotes(lang: string, database: LinguaDB = db): Promise<Note[]> {
  const decks = (await database.decks.where('lang').equals(lang).toArray()).filter((d) => !d.deletedAt && !d.archived);
  const notes = (await database.notes.where('lang').equals(lang).toArray()).filter((n) => !n.deletedAt && n.meaning && decks.some((d) => d.id === n.deckId));
  return notes.sort((a, b) => b.createdAt - a.createdAt).slice(0, WORDS);
}

/** Each word with what the dictionary (if installed) and its own card say of it. A word with less simply makes fewer kinds of game. */
export async function wordFacts(lang: string, notes: Note[], database: LinguaDB = db): Promise<WordFacts[]> {
  const out: WordFacts[] = [];
  for (const n of notes) {
    const row = await lookUpFull(lang, n.lemma ?? n.term).catch(() => undefined);
    const entries = row?.entries ?? [];
    const sense = entries[0]?.senses[0];
    const short = (words: string[]) => [...new Set(words)].filter((w) => w.length < 30 && !/\s/.test(w));
    const sentence = n.example?.text ?? sense?.ex?.[0]?.[0] ?? row?.tatoeba?.[0]?.[0] ?? (n.context?.sentence !== n.term ? n.context?.sentence : undefined);
    const blob = n.imageBlobId ? (await database.blobs.get(n.imageBlobId))?.blob : undefined;
    out.push({
      word: n.term,
      gloss: n.meaning,
      synonyms: short(entries.flatMap((e) => [...(e.syn ?? []), ...e.senses.flatMap((x) => x.syn ?? [])])),
      antonyms: short(entries.flatMap((e) => [...(e.ant ?? []), ...e.senses.flatMap((x) => x.ant ?? [])])),
      pos: n.pos ?? entries[0]?.pos,
      sentence,
      image: blob?.size ? URL.createObjectURL(blob) : undefined,
    });
  }
  return out;
}

/** Beginnings and endings met in the learner's words, with what the dictionary says each does. */
export async function affixesOfWords(lang: string, notes: Note[]): Promise<Array<{ affix: string; meaning: string }>> {
  const seen = new Map<string, string>();
  for (const n of notes) {
    const row = await lookUpFull(lang, n.lemma ?? n.term).catch(() => undefined);
    for (const p of row?.entries.find((e) => e.parts)?.parts ?? []) {
      if (!/^-|-$/.test(p) || seen.has(p)) continue;
      // The affix is its own entry, hyphen and all (des-, -mente): looked up without it, "des" would be another word.
      const entry = await lookUpFull(lang, p).catch(() => undefined);
      const gloss = entry?.entries.filter((e) => /^(prefix|suffix|infix|circumfix|confix)$/.test(e.pos)).flatMap((e) => e.senses).find((x) => x.g[0] && x.g[0].length < 110)?.g[0];
      if (gloss) seen.set(p, gloss);
    }
  }
  return [...seen.entries()].map(([affix, meaning]) => ({ affix, meaning }));
}

/** The grammar topics worth practising: with sentences to make exercises from, a few at random. */
export async function practiceTopics(lang: string, random: () => number, count = 4): Promise<Topic[]> {
  const grammar = await loadGrammar(lang);
  if (!grammar) return [];
  const usable = topicsOf(grammar).filter((t) => t.items.length >= 5);
  return [...usable].sort(() => random() - 0.5).slice(0, count);
}

export const itemsOf = (topics: Topic[]): Array<{ item: Item; topic: string }> => topics.flatMap((t) => t.items.map((item) => ({ item, topic: t.id })));

/** The inflection tables of the learner's verbs (their dictionary paradigms), for changing a form from one tense to another. */
export async function verbGrids(lang: string, notes: Note[], database: LinguaDB = db): Promise<Array<{ lemma: string; grids: FormGrid[] }>> {
  const verbs = notes.filter((n) => n.pos === 'verb' || (!n.pos && n.lemma)).slice(0, 25);
  const paradigms = await database.dictParadigms.bulkGet(verbs.map((n) => [packId(lang), n.lemma ?? n.term] as [string, string]));
  return paradigms.flatMap((p, i) => (p && p.pos === 'verb' ? [{ lemma: verbs[i].lemma ?? verbs[i].term, grids: formTables(lang, p.forms, p.pos).tables.map(gridOfFormTable) }] : []));
}
