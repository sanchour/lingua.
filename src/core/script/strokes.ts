// Stroke order and components for Chinese characters (6-23), from Make Me a Hanzi (public/strokes/zh.json, built
// by scripts/script/strokes.ts for the ~1000 most used characters). Coordinates: a 1024 box, y pointing up.
export interface HanziStrokes {
  /** Each stroke's outline, as an SVG path. */
  s: string[];
  /** Each stroke's centre line, as points; the stroke is drawn along it. */
  m: number[][][];
  /** The parts it is built from (女子), as characters. */
  c?: string;
  /** Its radical. */
  r?: string;
  /** What it means. */
  e?: string;
  /** How it was formed, in a line. */
  h?: string;
}

let all: Promise<Record<string, HanziStrokes>> | undefined;

/** The stroke data, fetched once (about 1 MB compressed) the first time a character is opened. */
export function loadStrokes(): Promise<Record<string, HanziStrokes>> {
  all ??= fetch(`${import.meta.env.BASE_URL}strokes/zh.json`).then((r) => {
    if (!r.ok) throw new Error('Stroke data is not available');
    return r.json() as Promise<Record<string, HanziStrokes>>;
  });
  all.catch(() => (all = undefined));
  return all;
}

/** How long a stroke's centre line is, to draw it along its length. */
export function medianLength(median: number[][]): number {
  let n = 0;
  for (let i = 1; i < median.length; i++) n += Math.hypot(median[i][0] - median[i - 1][0], median[i][1] - median[i - 1][1]);
  return n;
}

/** The path of a stroke's centre line. */
export const medianPath = (median: number[][]) => median.map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' ');
