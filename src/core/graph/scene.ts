// Where things go on the page (6-29 G2, docs/WORD-GRAPH-PLAN.md sections 2.2 and 2.4): the compass of one word and its
// tree, worked out in one pass rather than simulated, so a word's view is the same every time. The canvas draws a Scene.
import type { GraphLayoutRow } from '@/core/contracts/db';
import type { WordState } from '@/data/types';
import { FAMILIES, type Neighbour, type Quarter } from './model';
import type { TreeNode, WordTree } from './tree';

export interface SceneNode {
  id: string;
  x: number;
  y: number;
  label: string;
  /** A second, smaller line: a language's code, "+3 more". */
  note?: string;
  kind: 'centre' | 'word' | 'hub' | 'phrase' | 'foreign' | 'place' | 'more';
  ring: 0 | 1 | 2;
  state?: WordState;
  ghost?: boolean;
  weak?: boolean;
  /** A word of the language that can be opened. */
  key?: string;
  /** A foreign word's language. */
  lang?: string;
  /** Which side of its dot the label sits on. */
  anchor: 'start' | 'end' | 'middle' | 'above' | 'below';
  /** The atlas: how common (dot size), how well remembered (0 to 1, the dot's ink), which region (an index into `regions`). */
  rank?: number;
  memory?: number;
  region?: number;
}

export type EdgeStyle = 'meaning' | 'form' | 'origin' | 'use' | 'yours' | 'member' | 'elbow';
export interface SceneEdge {
  a: number;
  b: number;
  style: EdgeStyle;
  ring: 1 | 2;
}

export interface Scene {
  kind: 'compass' | 'tree' | 'atlas';
  /** A new key draws the scene out afresh; the same key with new data (the worker's update) only redraws. */
  key: string;
  /** The atlas's regions, as discs for their washes and names. */
  regions?: Array<{ id: string; label: string; x: number; y: number; r: number }>;
  nodes: SceneNode[];
  edges: SceneEdge[];
  /** The area the scene covers, for fitting it in the window. */
  box: { x0: number; y0: number; x1: number; y1: number };
}

export const RING_1 = 170;
export const RING_2 = 290;
/** At most this many a quarter on the first ring; the rest is "+N more" (all of them are in the side panel's list). */
export const QUARTER_MAX = 7;
const SPAN = 40;
export const QUARTER_ANGLE: Record<Quarter, number> = { meaning: 180, form: 0, origin: 270, use: 90 };
const STYLE: Record<Quarter, EdgeStyle> = { meaning: 'meaning', form: 'form', origin: 'origin', use: 'use' };

const KIND: Partial<Record<Neighbour['kind'], SceneNode['kind']>> = { theme: 'hub', affix: 'hub', char: 'hub', ancestor: 'foreign', cognate: 'foreign', phrase: 'phrase', text: 'place', deck: 'place', sentence: 'place' };
const anchorAt = (x: number, y: number): SceneNode['anchor'] => (x > 4 ? 'start' : x < -4 ? 'end' : y < 0 ? 'above' : 'below');
const polar = (deg: number, r: number) => [r * Math.cos((deg * Math.PI) / 180), r * Math.sin((deg * Math.PI) / 180)] as const;
const fan = (n: number, centre: number, span: number) => Array.from({ length: n }, (_, i) => (n === 1 ? centre : centre - span + (2 * span * i) / (n - 1)));

export interface CompassInput {
  word: { key: string; label: string; state?: WordState; weak?: boolean };
  neighbours: readonly Neighbour[];
  /** A theme's other words of yours, by the theme's label, for the second ring. */
  members?: ReadonlyMap<string, readonly Neighbour[]>;
  weak?: ReadonlySet<string>;
  /** Look-alikes are behind a switch (they are spelling neighbours, not relations). */
  lookalikes?: boolean;
}

export function compassScene({ word, neighbours, members, weak, lookalikes = false }: CompassInput): Scene {
  const nodes: SceneNode[] = [{ id: `w:${word.key}`, x: 0, y: 0, label: word.label, kind: 'centre', ring: 0, state: word.state, key: word.key, weak: word.weak, anchor: 'below' }];
  const edges: SceneEdge[] = [];
  const asNode = (n: Neighbour, x: number, y: number, ring: 1 | 2): SceneNode => ({
    id: `${n.kind}:${n.lang ?? ''}:${n.key ?? n.label}`, x, y, label: n.label, note: n.lang, kind: KIND[n.kind] ?? 'word', ring, state: n.state, ghost: n.ghost, key: n.key, lang: n.lang,
    weak: n.key ? weak?.has(n.key) : undefined, anchor: anchorAt(x, y),
  });
  for (const quarter of ['meaning', 'form', 'origin', 'use'] as const) {
    const items = neighbours.filter((n) => n.quarter === quarter && (lookalikes || !n.optional));
    const shown = items.slice(0, QUARTER_MAX);
    const angles = fan(shown.length, QUARTER_ANGLE[quarter], SPAN);
    const hubs: number[] = [];
    shown.forEach((n, i) => {
      // Alternate the radius a little when a quarter is full, so neighbouring labels don't touch.
      const [x, y] = polar(angles[i], RING_1 + (shown.length > 3 ? (i % 2 ? 22 : -10) : 0));
      nodes.push(asNode(n, x, y, 1));
      edges.push({ a: 0, b: nodes.length - 1, style: n.kind === 'link' ? 'yours' : STYLE[quarter], ring: 1 });
      if (n.kind === 'theme') hubs.push(nodes.length - 1);
    });
    if (items.length > shown.length) {
      const [x, y] = polar(QUARTER_ANGLE[quarter], RING_2 + 52);
      nodes.push({ id: `more:${quarter}`, x, y, label: `+${items.length - shown.length}`, kind: 'more', ring: 2, anchor: anchorAt(x, y) });
    }
    // The second ring: the other words of the themes this word is in, each drawn once, joined to every theme it shares.
    const outer = [...new Map(hubs.flatMap((h) => members?.get(nodes[h].label) ?? []).filter((m) => m.key !== word.key).map((m) => [m.key, m])).values()];
    if (!outer.length) continue;
    const hubAngles = hubs.map((h) => (Math.atan2(nodes[h].y, nodes[h].x) * 180) / Math.PI);
    const centre = hubAngles.reduce((a, b) => a + (b < 0 && quarter === 'meaning' ? b + 360 : b), 0) / hubAngles.length;
    fan(outer.length, centre, Math.min(SPAN + 8, outer.length * 6)).forEach((deg, i) => {
      const [x, y] = polar(deg, RING_2 + (i % 2 ? 16 : -6));
      nodes.push(asNode(outer[i], x, y, 2));
      const m = nodes.length - 1;
      for (const h of hubs) if (members?.get(nodes[h].label)?.some((n) => n.key === outer[i].key)) edges.push({ a: h, b: m, style: 'member', ring: 2 });
    });
  }
  return { kind: 'compass', key: `compass:${word.key}`, nodes, edges, box: { x0: -RING_2 - 110, y0: -RING_2 - 50, x1: RING_2 + 110, y1: RING_2 + 50 } };
}

/** The tree, top down: leaves side by side, each parent over the middle of its children; the ancestor above the top word
 *  and the same word in other languages beside the ancestor. */
export const TREE_LEVEL = 96;
export function treeScene(tree: WordTree, weak?: ReadonlySet<string>): Scene {
  const nodes: SceneNode[] = [];
  const edges: SceneEdge[] = [];
  const slot = (n: TreeNode) => Math.max(96, n.label.length * 10 + 30);
  let x = 0;
  const top = tree.ancestor ? 1 : 0;
  const place = (n: TreeNode, depth: number): number => {
    const kids = n.children.map((c) => place(c, depth + 1));
    let cx: number;
    if (kids.length) cx = (nodes[kids[0]].x + nodes[kids[kids.length - 1]].x) / 2;
    else {
      cx = x + slot(n) / 2;
      x += slot(n);
    }
    nodes.push({ id: `w:${n.key}`, x: cx, y: (depth + top) * TREE_LEVEL, label: n.label, kind: n.focus ? 'centre' : 'word', ring: depth === 0 ? 0 : 1, state: n.state, ghost: n.ghost, key: n.key, weak: weak?.has(n.key), anchor: 'below' });
    const self = nodes.length - 1;
    for (const k of kids) edges.push({ a: self, b: k, style: 'elbow', ring: depth === 0 ? 1 : 2 });
    return self;
  };
  const roots = tree.roots.map((r) => {
    const i = place(r, 0);
    x += 48;
    return i;
  });
  if (tree.ancestor) {
    const ax = roots.reduce((a, i) => a + nodes[i].x, 0) / roots.length;
    nodes.push({ id: `ancestor:${tree.ancestor.lang}:${tree.ancestor.word}`, x: ax, y: 0, label: tree.ancestor.word, note: tree.ancestor.lang, lang: tree.ancestor.lang, kind: 'foreign', ring: 0, anchor: 'above' });
    const a = nodes.length - 1;
    for (const r of roots) edges.push({ a, b: r, style: 'origin', ring: 1 });
    tree.cognates.slice(0, 4).forEach((c, i) => {
      nodes.push({ id: `cognate:${c.lang}:${c.word}`, x: ax + (i + 1) * 120, y: 0, label: c.word, note: c.lang, lang: c.lang, kind: 'foreign', ring: 1, anchor: 'above' });
      edges.push({ a, b: nodes.length - 1, style: 'origin', ring: 1 });
    });
  }
  const xs = nodes.map((n) => n.x), ys = nodes.map((n) => n.y);
  return { kind: 'tree', key: `tree:${tree.roots.map((r) => r.key).join(',')}`, nodes, edges, box: { x0: Math.min(...xs) - 80, y0: Math.min(...ys) - 60, x1: Math.max(...xs) + 80, y1: Math.max(...ys) + 50 } };
}

/** The cached scene the worker writes (`graphLayouts`), as the canvas draws it: positions as laid out, states and memory as
 *  they are now, each region a disc around its words. */
export interface AtlasInput {
  row: Pick<GraphLayoutRow, 'nodes' | 'x' | 'y' | 'threads' | 'families' | 'regions'>;
  states: ReadonlyMap<string, WordState>;
  memory?: Readonly<Record<string, number>>;
  weak?: ReadonlySet<string>;
  /** A region's name in the interface's language. */
  regionLabel?: (id: string, label: string) => string;
}

export function atlasScene({ row, states, memory, weak, regionLabel = (_, l) => l }: AtlasInput): Scene {
  const regionIndex = new Map(row.regions.map((r, i) => [r.id, i]));
  const nodes: SceneNode[] = row.nodes.map((n, i) => {
    const key = n.kind === 'word' ? n.id.slice(2) : undefined;
    return {
      id: n.id, x: row.x[i], y: row.y[i], label: n.label, kind: n.kind === 'word' ? 'word' : 'hub', ring: 1, anchor: 'start',
      key, state: key ? states.get(key) : undefined, rank: n.rank, memory: key ? memory?.[key] : undefined, weak: key ? weak?.has(key) : undefined,
      region: n.region === undefined ? undefined : regionIndex.get(n.region),
    };
  });
  const edges: SceneEdge[] = [];
  for (let i = 0; i < row.families.length; i++) {
    const a = row.threads[i * 2], b = row.threads[i * 2 + 1];
    edges.push({ a, b, style: nodes[a].kind === 'hub' || nodes[b].kind === 'hub' ? 'member' : FAMILIES[row.families[i]] ?? 'meaning', ring: 1 });
  }
  const regions = row.regions.map((r, i) => {
    const ms = nodes.filter((n) => n.region === i && n.kind === 'word');
    const cx = ms.reduce((a, n) => a + n.x, 0) / (ms.length || 1), cy = ms.reduce((a, n) => a + n.y, 0) / (ms.length || 1);
    const r95 = ms.map((n) => Math.hypot(n.x - cx, n.y - cy)).sort((p, q) => p - q)[Math.floor(ms.length * 0.95)] ?? 0;
    return { id: r.id, label: regionLabel(r.id, r.label), x: cx, y: cy, r: r95 + 14 };
  });
  const xs = nodes.map((n) => n.x), ys = nodes.map((n) => n.y);
  const box = nodes.length ? { x0: Math.min(...xs) - 40, y0: Math.min(...ys) - 40, x1: Math.max(...xs) + 120, y1: Math.max(...ys) + 40 } : { x0: -100, y0: -100, x1: 100, y1: 100 };
  return { kind: 'atlas', key: 'atlas', nodes, edges, regions, box };
}

