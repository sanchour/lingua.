/// <reference lib="webworker" />
// The word graph's worker (6-29 G4, docs/WORD-GRAPH-PLAN.md section 10.4): it reads the tables itself (as dict.worker
// does), builds the whole web, lays the atlas out and writes the cached scene, so the main thread only draws. It also keeps
// the dictionary's made-from index for the tree, built once per session by reading every row of the language.
import type { GraphLayoutRow } from '@/core/contracts/db';
import { DICT_VERSION } from '@/core/dictionary/format';
import { layoutAtlas } from '@/core/graph/layout';
import { buildWeb, FAMILIES } from '@/core/graph/model';
import { regionsOf } from '@/core/graph/regions';
import { addMadeFrom } from '@/core/graph/tree';
import { PACK_VERSION } from '@/core/packs/format';
import { retrievability } from '@/core/srs/scheduler';
import { normalizeWord } from '@/core/text/normalize';
import { createDb } from '@/data/db';

export type GraphWorkerRequest = { id: number; type: 'atlas'; lang: string } | { id: number; type: 'madeFrom'; lang: string; keys: string[] };
export type GraphWorkerReply =
  | { id: number; type: 'atlas'; built: boolean; memory: Record<string, number>; ms: number }
  | { id: number; type: 'madeFrom'; made: Record<string, string[]> }
  | { id: number; type: 'error'; message: string };

const db = createDb();
const madeFrom = new Map<string, Promise<Map<string, string[]>>>();
const post = (reply: GraphWorkerReply) => (self as DedicatedWorkerGlobalScope).postMessage(reply);

async function atlas(lang: string): Promise<Omit<Extract<GraphWorkerReply, { type: 'atlas' }>, 'id' | 'type'>> {
  const started = performance.now();
  const words = (await db.words.where('[lang+state]').anyOf([[lang, 1], [lang, 2]]).toArray()).filter((w) => !w.deletedAt);
  const keyOf = (w: (typeof words)[number]) => normalizeWord(w.lemma ?? w.norm, lang);
  // How well each word is known: its best card's chance of being remembered now; a word with no card has no number.
  const notes = (await db.notes.where('lang').equals(lang).toArray()).filter((n) => !n.deletedAt && n.wordId);
  const cards = notes.length ? await db.cards.where('noteId').anyOf(notes.map((n) => n.id)).toArray() : [];
  const wordOfNote = new Map(notes.map((n) => [n.id, n.wordId!.slice(lang.length + 1)]));
  const memory: Record<string, number> = {};
  const now = Date.now();
  for (const c of cards) {
    if (c.deletedAt || c.suspended) continue;
    const key = wordOfNote.get(c.noteId), r = retrievability(c, now);
    if (key && r !== null) memory[key] = Math.max(memory[key] ?? 0, r);
  }
  // The scene is built again only when the words, the dictionary or the pack changed; a review changes only the memory.
  const version = await db.fullDict.get([lang, '#version']);
  const list = await db.starterLists.get(lang);
  const latest = words.reduce((a, w) => Math.max(a, w.updatedAt ?? 0), 0);
  const stamp = `${words.length}:${latest}:${DICT_VERSION}:${version?.rank ?? 0}:${PACK_VERSION}:${list ? Object.keys(list.themes).length : 0}`;
  const cached = await db.graphLayouts.get([lang, 'atlas']);
  if (cached?.stamp === stamp) return { built: false, memory, ms: performance.now() - started };

  const keys = [...new Set(words.map(keyOf))];
  const rows = version ? await db.fullDict.bulkGet(keys.map((k) => [lang, k] as [string, string])) : [];
  const dict = new Map(rows.flatMap((r) => (r ? [[r.key, r] as const] : [])));
  const web = buildWeb({ lang, dict, themes: list?.themes, words: words.map((w) => ({ key: keyOf(w), state: w.state, tags: w.tags, relatedWordIds: w.relatedWordIds })) });
  const regions = regionsOf(web);
  const { x, y } = layoutAtlas(web, regions, cached && { ids: cached.nodes.map((n) => n.id), x: cached.x, y: cached.y });
  const threads = new Uint32Array(web.threads.length * 2);
  const families = new Uint8Array(web.threads.length);
  web.threads.forEach((t, i) => {
    threads[i * 2] = t.a;
    threads[i * 2 + 1] = t.b;
    families[i] = FAMILIES.indexOf(t.family);
  });
  const row: GraphLayoutRow = {
    lang, lens: 'atlas', stamp, builtAt: Date.now(),
    nodes: web.nodes.map((n, i) => ({ id: n.id, kind: n.kind, label: n.label, rank: n.rank, region: regions.of[i] ?? undefined })),
    x, y, threads, families,
    regions: regions.regions.map((r) => ({ id: r.id, label: r.label })),
  };
  await db.graphLayouts.put(row);
  return { built: true, memory, ms: performance.now() - started };
}

/** Base word → the words whose `parts` name it, over the whole dictionary: `derived` lists only some of them. */
function made(lang: string): Promise<Map<string, string[]>> {
  if (!madeFrom.has(lang)) {
    const index = new Map<string, string[]>();
    madeFrom.set(lang, db.fullDict.where('lang').equals(lang).each((row) => addMadeFrom(index, row, lang)).then(() => index));
  }
  return madeFrom.get(lang)!;
}

self.onmessage = (event: MessageEvent<GraphWorkerRequest>) => {
  const req = event.data;
  const job = req.type === 'atlas'
    ? atlas(req.lang).then((r) => post({ id: req.id, type: 'atlas', ...r }))
    : made(req.lang).then((index) => post({ id: req.id, type: 'madeFrom', made: Object.fromEntries(req.keys.map((k) => [k, index.get(k) ?? []])) }));
  job.catch((error: unknown) => post({ id: req.id, type: 'error', message: error instanceof Error ? error.message : 'The word graph could not be built.' }));
};
