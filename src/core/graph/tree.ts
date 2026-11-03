// The tree (6-29, docs/WORD-GRAPH-PLAN.md section 2.4): one word's family drawn as a tree. Climb from the word to what it
// is made from (deshacer → hacer), then branch down through what each is made into; the ancestor in another language
// sits above the top and the same word in other languages beside it. Chinese and Japanese grow one tree per character.
import { normalizeWord } from '@/core/text/normalize';
import type { FullDictRow } from '@/core/dictionary/format';
import type { WordState } from '@/data/types';
import { hanCharacters, isAffix } from './langs';
import { ancestorOf, type Web, type WebInput } from './model';

/** Branches under one word, the yours and most common first; the way to the chosen word is always kept. */
export const TREE_CHILDREN = 8;
/** Levels drawn below the top (deeper only on the way to the chosen word). */
export const TREE_DEPTH = 2;
const CLIMB_MAX = 3;

export interface TreeNode {
  key: string;
  label: string;
  rank?: number;
  state?: WordState;
  /** Not yours yet: a word to discover. */
  ghost?: boolean;
  /** The word the tree was opened on. */
  focus?: boolean;
  children: TreeNode[];
}

export interface WordTree {
  roots: TreeNode[];
  ancestor?: { lang: string; word: string };
  cognates: Array<{ lang: string; word: string }>;
}

/** Base word → the words made from it (whose `parts` name it). Built once per dictionary: `derived` lists only some of them. */
export function madeFromIndex(dict: ReadonlyMap<string, FullDictRow>, lang: string): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const row of dict.values()) addMadeFrom(index, row, lang);
  return index;
}

/** One row into a made-from index: the worker builds it a row at a time over the whole dictionary (G4). */
export function addMadeFrom(index: Map<string, string[]>, row: Pick<FullDictRow, 'key' | 'entries'>, lang: string): void {
  for (const e of row.entries) for (const p of e.parts ?? []) {
    if (isAffix(p)) continue;
    const base = normalizeWord(p, lang);
    if (base === row.key) continue;
    if (!index.has(base)) index.set(base, []);
    if (!index.get(base)!.includes(row.key)) index.get(base)!.push(row.key);
  }
}

export function wordTree(input: WebInput, web: Web, word: string, madeFrom = madeFromIndex(input.dict, input.lang)): WordTree | null {
  const { lang, dict } = input;
  const focus = normalizeWord(word, lang);
  const yours = (key: string) => web.byKey.get(key);
  const label = (key: string) => dict.get(key)?.word ?? (yours(key) !== undefined ? web.nodes[yours(key)!].label : key);
  if (!dict.has(focus) && yours(focus) === undefined) return null;
  const leaf = (key: string, ghost: boolean): TreeNode => {
    const i = yours(key);
    return { key, label: label(key), rank: dict.get(key)?.rank ?? (i === undefined ? undefined : web.nodes[i].rank), state: i === undefined ? undefined : web.nodes[i].state, ghost, focus: key === focus || undefined, children: [] };
  };
  const order = (path: ReadonlySet<string>) => (a: string, b: string) =>
    Number(path.has(b)) - Number(path.has(a)) || Number(yours(b) !== undefined) - Number(yours(a) !== undefined) || (dict.get(a)?.rank ?? Infinity) - (dict.get(b)?.rank ?? Infinity);

  // Chinese and Japanese: one tree per character, its branches your words written with it.
  const chars = hanCharacters(lang, label(focus));
  if (chars.length) {
    const roots = chars.map((c) => {
      const key = normalizeWord(c, lang);
      const node = leaf(key, yours(key) === undefined && dict.get(key)?.rank === undefined);
      const path = new Set([focus]);
      const kids = web.nodes.filter((n) => n.kind === 'word' && n.key !== key && n.label.includes(c)).map((n) => n.key);
      node.children = kids.sort(order(path)).filter((k, i) => i < TREE_CHILDREN || path.has(k)).map((k) => leaf(k, false));
      return node;
    });
    return { roots, cognates: [] };
  }

  // Climb to the top: what the word is made from, and what that is made from.
  const path = [focus];
  for (let i = 0; i < CLIMB_MAX; i++) {
    const base = dict.get(path[0])?.entries.flatMap((e) => (e.parts ?? []).filter((p) => !isAffix(p))).map((p) => normalizeWord(p, lang)).find((k) => dict.has(k) && !path.includes(k));
    if (!base) break;
    path.unshift(base);
  }
  const onPath = new Set(path);
  const seen = new Set<string>();
  const grow = (key: string, depth: number): TreeNode => {
    seen.add(key);
    const node = leaf(key, yours(key) === undefined);
    const kids = [...new Set([...(dict.get(key)?.entries.flatMap((e) => e.derived ?? []).map((d) => normalizeWord(d, lang)) ?? []), ...(madeFrom.get(key) ?? [])])];
    // A branch is yours, or a ranked dictionary word (never an archaic unranked one), or on the way to the chosen word.
    const keep = kids.filter((k) => !seen.has(k) && (onPath.has(k) || yours(k) !== undefined || dict.get(k)?.rank !== undefined)).sort(order(onPath));
    node.children = keep.filter((k, i) => (i < TREE_CHILDREN && depth < TREE_DEPTH) || onPath.has(k)).map((k) => grow(k, depth + 1));
    return node;
  };
  const top = path[0];
  const root = grow(top, 0);
  const entries = dict.get(top)?.entries ?? [];
  const ancestor = entries.map((e) => ancestorOf(e, top, lang)).find(Boolean);
  const cognates = [...new Map(entries.flatMap((e) => e.cog ?? []).map(([l, w]) => [`${l}:${w}`, { lang: l, word: w }])).values()];
  return { roots: [root], ancestor: ancestor ? { lang: ancestor.slice(0, ancestor.indexOf(':')), word: ancestor.slice(ancestor.indexOf(':') + 1) } : undefined, cognates };
}
