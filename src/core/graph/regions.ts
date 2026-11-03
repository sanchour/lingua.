// The atlas's regions (6-29, docs/WORD-GRAPH-PLAN.md section 2.1): the little words, then each word's most specific
// theme, then the region most of its threads go to; what is left is a region "Around x" when five or more words hold
// together, otherwise loose threads for the margin. Deterministic for a seed, so the map is the same on every visit.
import { seeded } from '@/core/cantus/games';
import { hashString } from '@/core/hash';
import { isLittle } from './langs';
import type { Web } from './model';

export const LITTLE = 'little';
/** A leftover group this big is a region of its own; a smaller one is a loose thread. */
export const AROUND_MIN = 5;
const ROUNDS = 8;

export interface Region {
  id: string;
  label: string;
  members: number[];
}

export interface Regions {
  /** Node index → region id (hubs take the region most of their words are in); null for loose threads. */
  of: Array<string | null>;
  regions: Region[];
  /** Small groups joined only to each other, and words joined to nothing: the margin's list (F1092). */
  loose: number[][];
}

export const seedOf = (lang: string) => Number.parseInt(hashString(lang), 36) >>> 0;

export function regionsOf(web: Web, seed = seedOf(web.lang)): Regions {
  const { nodes, threads } = web;
  const of: Array<string | null> = nodes.map(() => null);
  const words = nodes.flatMap((n, i) => (n.kind === 'word' ? [i] : []));
  const near = nodes.map(() => [] as number[]);
  const themeSize = new Map<number, number>();
  const themesOf = nodes.map(() => [] as number[]);
  for (const t of threads) {
    const [a, b] = [nodes[t.a], nodes[t.b]];
    if (a.kind === 'word' && b.kind === 'word') near[t.a].push(t.b), near[t.b].push(t.a);
    if (t.kind === 'member' && a.kind === 'theme') themesOf[t.b].push(t.a), themeSize.set(t.a, (themeSize.get(t.a) ?? 0) + 1);
  }
  // Words that share a small affix, root, character or tag hold together too: without this, 700 of 3,000 Spanish words were
  // left alone (measured in G1). A theme decides a region outright instead.
  const hubWords = new Map<number, number[]>();
  for (const t of threads) if (t.kind === 'member' && nodes[t.a].kind !== 'theme' && nodes[t.a].kind !== 'word') hubWords.set(t.a, [...(hubWords.get(t.a) ?? []), t.b]);
  for (const ms of hubWords.values()) for (const a of ms) for (const b of ms) if (a !== b) near[a].push(b);

  const fixed = new Set<number>();
  for (const i of words) {
    if (isLittle(nodes[i].pos, nodes[i].rank)) of[i] = LITTLE;
    else if (themesOf[i].length) of[i] = nodes[themesOf[i].sort((x, y) => themeSize.get(x)! - themeSize.get(y)! || x - y)[0]].id;
    if (of[i]) fixed.add(i);
  }
  // Label propagation, in a seeded order: an unthemed word joins the region most of its neighbours are in.
  const order = [...words];
  const random = seeded(seed);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  for (let round = 0; round < ROUNDS; round++) {
    for (const i of order) {
      if (fixed.has(i)) continue;
      const votes = new Map<string, number>();
      for (const j of near[i]) if (of[j] && of[j] !== LITTLE) votes.set(of[j]!, (votes.get(of[j]!) ?? 0) + 1);
      const best = [...votes].sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1))[0];
      if (best) of[i] = best[0];
    }
  }
  // What is still alone joins by its own threads.
  const loose: number[][] = [];
  const walked = new Set<number>();
  for (const i of words) {
    if (of[i] || walked.has(i)) continue;
    const group = [i];
    walked.add(i);
    for (let k = 0; k < group.length; k++) for (const j of near[group[k]]) if (!of[j] && !walked.has(j)) walked.add(j), group.push(j);
    if (group.length < AROUND_MIN) { loose.push(group.sort((x, y) => x - y)); continue; }
    const centre = group.reduce((best, j) => ((nodes[j].rank ?? Infinity) < (nodes[best].rank ?? Infinity) ? j : best));
    for (const j of group) of[j] = `around:${nodes[centre].key}`;
  }
  // A hub sits in the region most of its words are in.
  const members = nodes.map(() => [] as number[]);
  for (const t of threads) if (t.kind === 'member') members[t.a].push(t.b);
  nodes.forEach((n, i) => {
    if (n.kind === 'word') return;
    const count = new Map<string, number>();
    for (const m of members[i]) if (of[m]) count.set(of[m]!, (count.get(of[m]!) ?? 0) + 1);
    of[i] = [...count].sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1))[0]?.[0] ?? null;
  });

  const byId = new Map<string, Region>();
  of.forEach((id, i) => {
    if (!id || nodes[i].kind !== 'word') return;
    if (!byId.has(id)) byId.set(id, { id, label: labelOf(web, id), members: [] });
    byId.get(id)!.members.push(i);
  });
  return { of, regions: [...byId.values()], loose };
}

function labelOf(web: Web, id: string): string {
  if (id === LITTLE) return 'The little words';
  if (id.startsWith('around:')) return `Around ${web.nodes[web.byKey.get(id.slice(7))!].label}`;
  return web.nodes.find((n) => n.id === id)?.label ?? id;
}
