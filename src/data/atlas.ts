// Thesaurus › Atlas (6-29 G2): one word's compass and tree, read from the device. Only the rows one word needs are read
// (its own, its neighbours', its family's), so this runs on the main thread; the whole atlas waits for G4's worker.
import type { FullDictRow } from '@/core/dictionary/format';
import { buildWeb, neighbourhood, type Neighbour, type Web, type WebInput } from '@/core/graph/model';
import { isAffix } from '@/core/graph/langs';
import { wordTree, type WordTree } from '@/core/graph/tree';
import { itemKeyOf, wordIdOfKey } from '@/core/learner/learner';
import { normalizeWord } from '@/core/text/normalize';
import { db, type LinguaDB } from './db';
import { learnerRecord } from './learner';
import { sightingsOf } from './memory';

export interface AtlasWord {
  key: string;
  label: string;
  web: Web;
  neighbours: Neighbour[];
  /** A theme's other words of yours, by the theme's label (the compass's second ring). */
  members: Map<string, Neighbour[]>;
  tree: WordTree | null;
  /** Words with a persistent mistake (6-5's rule), by key. */
  weak: Set<string>;
}

const PLACES_MAX = 4;
const SENTENCES_MAX = 3;
/** How many branches' own branches are read for the tree. */
const BRANCHES_READ = 24;

const referenced = (row: FullDictRow | undefined) =>
  (row?.entries ?? []).flatMap((e) => [...(e.syn ?? []), ...(e.ant ?? []), ...(e.derived ?? []), ...(e.related ?? []), ...(e.parts ?? []).filter((p) => !isAffix(p)), ...(e.hom ?? []), ...(e.pair ?? []).map((p) => p[1]), ...e.senses.flatMap((s) => [...(s.syn ?? []), ...(s.ant ?? [])])]).concat(row?.confused ?? []);

/** `made` gives the words made from each key (the worker's made-from index, G4); without it the tree branches through each
 *  word's `derived` list only. */
export async function loadAtlasWord(lang: string, word: string, database: LinguaDB = db, made?: (keys: readonly string[]) => Promise<Record<string, string[]>>): Promise<AtlasWord | null> {
  const key = normalizeWord(word, lang);
  const [rows, list, weakSpots] = await Promise.all([
    database.words.where('[lang+state]').anyOf([[lang, 1], [lang, 2]]).toArray(),
    database.starterLists.get(lang),
    learnerRecord(database).weakSpots(lang).catch(() => []),
  ]);
  const dict = new Map<string, FullDictRow>();
  const read = async (words: readonly string[]) => {
    const keys = [...new Set(words.map((w) => normalizeWord(w, lang)))].filter((k) => !dict.has(k));
    if (!keys.length) return;
    for (const row of await database.fullDict.bulkGet(keys.map((k) => [lang, k] as [string, string]))) if (row) dict.set(row.key, row);
  };
  await read([key]);
  const own = rows.filter((r) => !r.deletedAt);
  if (!dict.has(key) && !own.some((r) => normalizeWord(r.lemma ?? r.norm, lang) === key)) return null;
  // The tree climbs through what each word is made from, then reads the branches' own branches.
  const path = [key];
  for (let i = 0; i < 3; i++) {
    const base = dict.get(path[0])?.entries.flatMap((e) => (e.parts ?? []).filter((p) => !isAffix(p)))[0];
    if (!base || path.includes(normalizeWord(base, lang))) break;
    await read([base]);
    path.unshift(normalizeWord(base, lang));
  }
  await read(path.flatMap((k) => referenced(dict.get(k))));
  const madeFrom = new Map<string, string[]>();
  const ask = async (keys: readonly string[]) => {
    const found: Record<string, string[]> = made ? await made(keys).catch(() => ({})) : {};
    for (const [k, v] of Object.entries(found)) madeFrom.set(k, v);
  };
  await ask(path);
  const branches = [...new Set([...path.flatMap((k) => dict.get(k)?.entries.flatMap((e) => e.derived ?? []).map((d) => normalizeWord(d, lang)) ?? []), ...path.flatMap((k) => madeFrom.get(k) ?? [])])].slice(0, BRANCHES_READ);
  await read(branches);
  await ask(branches);
  await read(branches.flatMap((b) => [...(dict.get(b)?.entries.flatMap((e) => e.derived ?? []) ?? []), ...(madeFrom.get(b) ?? [])]));

  const input: WebInput = { lang, dict, themes: list?.themes, words: own.map((r) => ({ key: normalizeWord(r.lemma ?? r.norm, lang), state: r.state, tags: r.tags })) };
  const web = buildWeb(input);
  const neighbours = neighbourhood(input, web, key);
  const self = web.byKey.get(key);
  const label = dict.get(key)?.word ?? (self === undefined ? word : web.nodes[self].label);

  // The second ring: each theme's other words of yours, the most common first.
  const members = new Map<string, Neighbour[]>();
  for (const t of web.threads) {
    if (t.kind !== 'member' || t.b !== self || web.nodes[t.a].kind !== 'theme') continue;
    const words = web.threads.filter((u) => u.kind === 'member' && u.a === t.a && u.b !== self).map((u) => web.nodes[u.b]);
    members.set(web.nodes[t.a].label, words.sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity)).slice(0, 5).map((n) => ({ quarter: 'meaning', kind: 'syn', label: n.label, key: n.key, state: n.state, rank: n.rank })));
  }

  // Use: where you met it, the sentences that join it to another of your words, its decks.
  const sightings = await sightingsOf(lang, key, key, database);
  const places = [...new Map(sightings.map((s) => [s.sourceId, s])).values()].slice(0, PLACES_MAX);
  for (const s of places) neighbours.push({ quarter: 'use', kind: 'text', label: s.title });
  const yours = (sentence: string) => sentence.split(/[\s,.;:!?¿¡«»"“”()]+/).some((t) => { const k = normalizeWord(t, lang); return k !== key && web.byKey.has(k); });
  for (const s of sightings.filter((s) => s.sentence && yours(s.sentence)).slice(0, SENTENCES_MAX)) neighbours.push({ quarter: 'use', kind: 'sentence', label: s.sentence! });
  const notes = await database.notes.where('wordId').equals(`${lang}:${key}`).toArray();
  const decks = await database.decks.bulkGet([...new Set(notes.filter((n) => !n.deletedAt).map((n) => n.deckId))]);
  for (const d of decks) if (d && !d.deletedAt) neighbours.push({ quarter: 'use', kind: 'deck', label: d.name });

  const weak = new Set(weakSpots.filter((w) => w.persistent).map((w) => wordIdOfKey(itemKeyOf(w.item))).filter((id): id is string => Boolean(id?.startsWith(`${lang}:`))).map((id) => id.slice(lang.length + 1)));
  return { key, label, web, neighbours, members, tree: wordTree(input, web, key, madeFrom), weak };
}
