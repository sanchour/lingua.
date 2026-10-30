// Word ladders (6-21, F0169): from one word to another, one letter at a time, every step a real word of the language's own list.
import { MAX_HINTS, MAX_STARS } from './hangman';

export const MAX_TRIES = 5;

export type Graph = Map<string, string[]>;

/** Words of one length are neighbours when they differ in exactly one place. Words of different lengths are never joined. */
export function buildGraph(words: string[]): Graph {
  const buckets = new Map<string, string[]>();
  for (const w of words) {
    const cs = [...w];
    for (let i = 0; i < cs.length; i++) {
      const key = `${cs.length}:${i}:${cs.slice(0, i).join('')}*${cs.slice(i + 1).join('')}`;
      buckets.set(key, [...(buckets.get(key) ?? []), w]);
    }
  }
  const graph: Graph = new Map(words.map((w) => [w, []]));
  for (const group of buckets.values()) for (const a of group) for (const b of group) if (a !== b) graph.get(a)!.push(b);
  return graph;
}

/** Steps to `end` from every word that reaches it. */
export function distancesTo(graph: Graph, end: string): Map<string, number> {
  const dist = new Map([[end, 0]]);
  const queue = [end];
  for (let i = 0; i < queue.length; i++) for (const n of graph.get(queue[i]) ?? []) if (!dist.has(n)) (dist.set(n, dist.get(queue[i])! + 1), queue.push(n));
  return dist;
}

/** A start and an end exactly `steps` apart (at the shortest), or null when this list has none. */
export function makeLadder(graph: Graph, steps: number, random: () => number): { start: string; end: string } | null {
  const starts = [...graph].filter(([, n]) => n.length >= 2).map(([w]) => w);
  for (let attempt = 0; attempt < 60 && starts.length; attempt++) {
    const start = starts[Math.floor(random() * starts.length)];
    const dist = distancesTo(graph, start);
    const ends = [...dist].filter(([, d]) => d === steps).map(([w]) => w);
    if (ends.length) return { start, end: ends[Math.floor(random() * ends.length)] };
  }
  return null;
}

export type Try = 'ok' | 'notword' | 'notone' | 'used';

export interface LadderState {
  start: string;
  end: string;
  /** Shortest number of steps. */
  steps: number;
  path: string[];
  wrong: number;
  hints: number;
  last: Try | null;
  status: 'playing' | 'won' | 'lost';
}

export const startLadder = (start: string, end: string, steps: number): LadderState => ({ start, end, steps, path: [start], wrong: 0, hints: 0, last: null, status: 'playing' });

const tip = (s: LadderState) => s.path[s.path.length - 1];
const moves = (s: LadderState) => s.path.length - 1;

const advance = (s: LadderState, word: string): LadderState => {
  const path = [...s.path, word];
  const next = { ...s, path, last: 'ok' as const };
  if (word === s.end) return { ...next, status: 'won' };
  return moves(next) >= s.steps + 4 ? { ...next, status: 'lost' } : next;
};

/** A word typed as the next step. A word that is not on the list, not one letter away, or already used is a wrong try. */
export function step(s: LadderState, graph: Graph, word: string): LadderState {
  if (s.status !== 'playing') return s;
  const fail = (last: Try): LadderState => ({ ...s, wrong: s.wrong + 1, last, status: s.wrong + 1 >= MAX_TRIES ? 'lost' : 'playing' });
  if (!graph.has(word)) return fail('notword');
  if (s.path.includes(word)) return fail('used');
  if (!graph.get(tip(s))!.includes(word)) return fail('notone');
  return advance(s, word);
}

/** Takes the last word back; no penalty. */
export const undo = (s: LadderState): LadderState => (s.status === 'playing' && s.path.length > 1 ? { ...s, path: s.path.slice(0, -1), last: null } : s);

/** The next word of a shortest way on from the last one. Nothing when the ladder is off every shortest way's reach. */
export function hint(s: LadderState, graph: Graph, dist: Map<string, number>): LadderState {
  if (s.status !== 'playing' || s.hints >= MAX_HINTS) return s;
  const here = dist.get(tip(s));
  const word = here === undefined ? undefined : graph.get(tip(s))!.find((n) => dist.get(n) === here - 1 && !s.path.includes(n));
  return word ? advance({ ...s, hints: s.hints + 1 }, word) : s;
}

export const starsOf = (s: LadderState): number => (s.status !== 'won' ? 0 : Math.max(1, MAX_STARS - s.hints - (moves(s) - s.steps >= 2 ? 1 : 0)));
