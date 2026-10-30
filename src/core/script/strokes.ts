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

/** A kanji from KanjiVG: each stroke is a centre line (a path in a 109 box, y down), drawn with a pen, and its parts. */
export interface KanjiStrokes {
  p: string[];
  c?: string;
}
export type StrokeSet = 'zh' | 'ja';
export type StrokeData = HanziStrokes | KanjiStrokes;
export const isKanji = (d: StrokeData): d is KanjiStrokes => 'p' in d;
/** How many strokes a character has. */
export const strokeCount = (d: StrokeData) => (isKanji(d) ? d.p.length : d.s.length);

const loading: Partial<Record<StrokeSet, Promise<Record<string, StrokeData>>>> = {};

/** A set's stroke data, fetched once (about 1 MB compressed for Mandarin, 0.35 MB for Japanese) the first time a character is opened. */
export function loadStrokes(set: StrokeSet = 'zh'): Promise<Record<string, StrokeData>> {
  const hit = (loading[set] ??= fetch(`${import.meta.env.BASE_URL}strokes/${set}.json`).then((r) => {
    if (!r.ok) throw new Error('Stroke data is not available');
    return r.json() as Promise<Record<string, StrokeData>>;
  }));
  hit.catch(() => delete loading[set]);
  return hit;
}

/** How long a stroke's centre line is, to draw it along its length. */
export function medianLength(median: number[][]): number {
  let n = 0;
  for (let i = 1; i < median.length; i++) n += Math.hypot(median[i][0] - median[i - 1][0], median[i][1] - median[i - 1][1]);
  return n;
}

/** The path of a stroke's centre line. */
export const medianPath = (median: number[][]) => median.map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' ');

import type { CharReadings } from './hanzi';
let readingsLoad: Promise<Record<string, CharReadings>> | undefined;
/** What the characters are called in Japanese and Korean and what they mean (public/chars/readings.json, 0.1 MB), fetched once. */
export function loadReadings(): Promise<Record<string, CharReadings>> {
  readingsLoad ??= fetch(`${import.meta.env.BASE_URL}chars/readings.json`).then((r) => {
    if (!r.ok) throw new Error('Readings are not available');
    return r.json() as Promise<Record<string, CharReadings>>;
  });
  readingsLoad.catch(() => (readingsLoad = undefined));
  return readingsLoad;
}
