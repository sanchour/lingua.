// The atlas's layout (6-29 G4, docs/WORD-GRAPH-PLAN.md sections 2.1 and 10.4): regions first, as discs that never overlap
// and lean toward the regions they share threads with; then each region's words inside it, the most common in the middle,
// settled a little by their threads; loose threads on a ring around the map. Deterministic, so the map is the same on every
// visit, and incremental: a new word goes beside its neighbours and nothing else moves. No physics library: the sketch in
// docs/graph/atlas-es.svg showed this is enough.
import type { Regions } from './regions';
import type { Web } from './model';

/** Reuse the last positions while this share of the words is still there; otherwise lay it all out again. */
export const REUSE_SHARE = 0.8;
const REGION_ROUNDS = 600;
const GAP = 16;

export interface Placed {
  x: Float32Array;
  y: Float32Array;
}
export interface Previous {
  ids: readonly string[];
  x: ArrayLike<number>;
  y: ArrayLike<number>;
}

export const discRadius = (words: number) => 15 * Math.sqrt(words) + 10;

export function layoutAtlas(web: Web, regions: Regions, previous?: Previous): Placed {
  const n = web.nodes.length;
  const x = new Float32Array(n), y = new Float32Array(n);
  const reused = previous && reuse(web, regions, previous, x, y);
  if (!reused) {
    placeRegions(web, regions, x, y);
    placeLoose(regions, x, y);
  }
  placeHubs(web, x, y);
  return { x, y };
}

function placeRegions(web: Web, regions: Regions, x: Float32Array, y: Float32Array) {
  const discs = regions.regions.map((r) => ({ id: r.id, members: r.members, r: discRadius(r.members.length), x: 0, y: 0 }));
  const index = new Map(discs.map((d, i) => [d.id, i]));
  const ties = new Map<string, [number, number, number]>();
  for (const t of web.threads) {
    const a = index.get(regions.of[t.a] ?? ''), b = index.get(regions.of[t.b] ?? '');
    if (a === undefined || b === undefined || a === b) continue;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    const tie = ties.get(key) ?? [Math.min(a, b), Math.max(a, b), 0];
    tie[2]++;
    ties.set(key, tie);
  }
  // A spiral, the biggest region in the middle; then pull tied regions together and never let two touch.
  [...discs].sort((a, b) => b.members.length - a.members.length || (a.id < b.id ? -1 : 1)).forEach((d, i) => {
    d.x = Math.cos(i * 2.4) * 26 * Math.sqrt(i) * (1 + d.r / 100);
    d.y = Math.sin(i * 2.4) * 22 * Math.sqrt(i) * (1 + d.r / 100);
  });
  for (let round = 0; round < REGION_ROUNDS; round++) {
    for (const [a, b, w] of ties.values()) {
      const A = discs[a], B = discs[b], dx = B.x - A.x, dy = B.y - A.y, pull = Math.min(0.02, 0.0008 * w);
      A.x += dx * pull; A.y += dy * pull; B.x -= dx * pull; B.y -= dy * pull;
    }
    for (let a = 0; a < discs.length; a++) for (let b = a + 1; b < discs.length; b++) {
      const A = discs[a], B = discs[b], dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 0.01, min = A.r + B.r + GAP;
      if (d >= min) continue;
      const push = (min - d) / 2, ux = dx / d, uy = dy / d;
      A.x -= ux * push; A.y -= uy * push; B.x += ux * push; B.y += uy * push;
    }
    for (const d of discs) (d.x *= 0.99), (d.y *= 0.99);
  }
  // Inside each region: a sunflower, then a nudge from its own threads, held in the disc.
  const near = web.nodes.map(() => [] as number[]);
  for (const t of web.threads) if (web.nodes[t.a].kind === 'word' && web.nodes[t.b].kind === 'word') near[t.a].push(t.b), near[t.b].push(t.a);
  for (const d of discs) {
    const ms = [...d.members].sort((a, b) => (web.nodes[a].rank ?? Infinity) - (web.nodes[b].rank ?? Infinity) || a - b);
    ms.forEach((m, i) => {
      const t = i * 2.39996, rr = d.r * 0.92 * Math.sqrt((i + 0.5) / ms.length);
      x[m] = d.x + Math.cos(t) * rr;
      y[m] = d.y + Math.sin(t) * rr;
    });
    settle(ms, near, d, x, y);
  }
}

/** A few rounds of springs and pushes among one region's words; skipped for the biggest regions, where the sunflower is kept. */
function settle(ms: number[], near: number[][], d: { x: number; y: number; r: number }, x: Float32Array, y: Float32Array) {
  const rounds = ms.length > 600 ? 0 : ms.length > 300 ? 20 : 50;
  const inside = new Set(ms), k = (d.r * 1.5) / Math.sqrt(ms.length + 1);
  const dx = new Float32Array(x.length), dy = new Float32Array(x.length);
  for (let round = 0, heat = k / 4; round < rounds; round++, heat *= 0.96) {
    for (const a of ms) (dx[a] = (d.x - x[a]) * 0.14), (dy[a] = (d.y - y[a]) * 0.14);
    for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) {
      const a = ms[i], b = ms[j], ex = x[a] - x[b], ey = y[a] - y[b], d2 = ex * ex + ey * ey + 0.01;
      // Only near words push: the sunflower is already evenly spaced, and a push from every word drives them to the rim.
      if (d2 > 4 * k * k) continue;
      const f = (k * k) / d2;
      dx[a] += ex * f; dy[a] += ey * f; dx[b] -= ex * f; dy[b] -= ey * f;
    }
    for (const a of ms) for (const b of near[a]) if (a < b && inside.has(b)) {
      const ex = x[a] - x[b], ey = y[a] - y[b], dist = Math.hypot(ex, ey) + 0.01, f = dist / k;
      dx[a] -= ex * f; dy[a] -= ey * f; dx[b] += ex * f; dy[b] += ey * f;
    }
    for (const a of ms) {
      const len = Math.hypot(dx[a], dy[a]) + 0.01, step = Math.min(len, heat);
      x[a] += (dx[a] / len) * step;
      y[a] += (dy[a] / len) * step;
      const ox = x[a] - d.x, oy = y[a] - d.y, od = Math.hypot(ox, oy);
      if (od > d.r) (x[a] = d.x + (ox / od) * d.r), (y[a] = d.y + (oy / od) * d.r);
    }
  }
}

/** Loose threads in a band around the map, spread as evenly as the regions' words are (a sunflower opened into a ring), a
 *  group's words next to each other, so every word is a dot on the page without the band reading as a wall. */
function placeLoose(regions: Regions, x: Float32Array, y: Float32Array) {
  const all = regions.loose.flat();
  if (!all.length) return;
  let reach = 0;
  for (const r of regions.regions) for (const m of r.members) reach = Math.max(reach, Math.hypot(x[m], y[m]));
  const inner = reach + 60, cell = 20;
  const outer = Math.sqrt(inner * inner + (all.length * cell * cell) / Math.PI);
  all.forEach((m, i) => {
    const t = i * 2.39996, rr = Math.sqrt(inner * inner + ((outer * outer - inner * inner) * (i + 0.5)) / all.length);
    x[m] = Math.cos(t) * rr;
    y[m] = Math.sin(t) * rr;
  });
}

/** A hub sits at the middle of its words. */
function placeHubs(web: Web, x: Float32Array, y: Float32Array) {
  const sum = new Map<number, [number, number, number]>();
  for (const t of web.threads) {
    if (t.kind !== 'member' || web.nodes[t.a].kind === 'word') continue;
    const s = sum.get(t.a) ?? [0, 0, 0];
    s[0] += x[t.b]; s[1] += y[t.b]; s[2]++;
    sum.set(t.a, s);
  }
  for (const [h, [sx, sy, c]] of sum) (x[h] = sx / c), (y[h] = sy / c - 4);
}

/** Keeps every word that was already on the map where it was; a new one goes to the middle of its neighbours that are there,
 *  else to its region's middle, then is nudged off anything it lands on. False when too much changed to keep the old map. */
function reuse(web: Web, regions: Regions, previous: Previous, x: Float32Array, y: Float32Array): boolean {
  const before = new Map(previous.ids.map((id, i) => [id, i]));
  const words = web.nodes.flatMap((n, i) => (n.kind === 'word' ? [i] : []));
  const kept = words.filter((i) => before.has(web.nodes[i].id));
  if (!words.length || kept.length < REUSE_SHARE * words.length) return false;
  const placed = new Set<number>();
  for (const i of kept) {
    const j = before.get(web.nodes[i].id)!;
    x[i] = previous.x[j];
    y[i] = previous.y[j];
    placed.add(i);
  }
  const near = web.nodes.map(() => [] as number[]);
  for (const t of web.threads) if (web.nodes[t.a].kind === 'word' && web.nodes[t.b].kind === 'word') near[t.a].push(t.b), near[t.b].push(t.a);
  const centre = new Map<string, [number, number, number]>();
  for (const i of kept) {
    const id = regions.of[i];
    if (!id) continue;
    const c = centre.get(id) ?? [0, 0, 0];
    c[0] += x[i]; c[1] += y[i]; c[2]++;
    centre.set(id, c);
  }
  const fresh = words.filter((i) => !placed.has(i));
  for (let pass = 0; pass < 2; pass++) for (const i of fresh) {
    if (placed.has(i)) continue;
    const ns = near[i].filter((j) => placed.has(j));
    const c = centre.get(regions.of[i] ?? '');
    if (ns.length) (x[i] = ns.reduce((a, j) => a + x[j], 0) / ns.length + 6), (y[i] = ns.reduce((a, j) => a + y[j], 0) / ns.length + 6);
    else if (c && pass === 1) (x[i] = c[0] / c[2]), (y[i] = c[1] / c[2]);
    else if (pass === 1) (x[i] = Math.cos(i * 2.4) * 40), (y[i] = Math.sin(i * 2.4) * 40);
    else continue;
    placed.add(i);
  }
  // Nudge each new word off the words it landed on.
  for (const i of fresh) {
    for (let round = 0; round < 12; round++) {
      let moved = false;
      for (const j of words) {
        if (j === i) continue;
        const ex = x[i] - x[j], ey = y[i] - y[j], d = Math.hypot(ex, ey);
        if (d >= 7) continue;
        const t = d ? 1 / d : 1;
        x[i] += (d ? ex * t : Math.cos(i)) * (7 - d);
        y[i] += (d ? ey * t : Math.sin(i)) * (7 - d);
        moved = true;
      }
      if (!moved) break;
    }
  }
  return true;
}
