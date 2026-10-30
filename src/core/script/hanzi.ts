// What Cursus › Marks asks about characters (6-23): tones, radicals, parts, meanings, readings, Traditional forms, and
// whether handwriting follows the strokes. Pure; the questions come from the stroke and reading data.
import type { MarkItem } from './marks';
import { isKanji } from './strokes';
import type { StrokeData } from './strokes';
import { romajiToKana } from './kana';

export interface CharReadings {
  d?: string;
  on?: string[];
  kun?: string[];
  ko?: string[];
}
export interface CharData {
  strokes: Record<string, StrokeData>;
  readings: Record<string, CharReadings>;
}
export type QuizMode = 'radical' | 'parts' | 'meaning' | 'reading' | 'kana' | 'hanja' | 'trad';
export const QUIZ_LABEL: Record<QuizMode, string> = {
  radical: 'Radical of a character', parts: 'What it is built from', meaning: 'Character for a meaning', reading: 'Kanji readings', kana: 'Kana to kanji', hanja: 'Hanja to hangul', trad: 'Traditional forms',
};
export const QUIZ_MODES: Record<string, QuizMode[]> = { zh: ['meaning', 'radical', 'parts', 'trad'], ja: ['reading', 'kana', 'parts'], ko: ['hanja'] };

const pick = <T>(list: T[], random: () => number) => list[Math.floor(random() * list.length)];
const distinct = <T>(list: T[], n: number, not: T, random: () => number): T[] => {
  const pool = [...new Set(list)].filter((x) => x !== not);
  const out: T[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  return out;
};

/** The first clause of a definition, short enough for a prompt. */
const gloss = (d?: string) => d?.split(/[;,(]/)[0].trim();

/** One question of a mode, or null when the data can't make one. The first option is the right one. */
export function charQuestion(mode: QuizMode, data: CharData, random: () => number, trad?: Array<[string, string]>): MarkItem | null {
  const { strokes, readings } = data;
  const chars = Object.keys(strokes);
  if (mode === 'radical') {
    const c = pick(chars.filter((x) => !isKanji(strokes[x]) && strokes[x].r), random);
    const d = c ? (strokes[c] as { r?: string }) : undefined;
    if (!c || !d?.r) return null;
    const wrong = distinct(chars.map((x) => (strokes[x] as { r?: string }).r ?? ''), 2, d.r, random).filter(Boolean);
    return { kind: 'chars', prompt: `Which is the radical of ${c}?${readings[c]?.d ? ` (${gloss(readings[c].d)})` : ''}`, options: [d.r, ...wrong], why: `${c} is sorted under ${d.r} in dictionaries.` };
  }
  if (mode === 'parts') {
    const c = pick(chars.filter((x) => strokes[x].c && [...strokes[x].c!].length >= 2), random);
    if (!c) return null;
    const right = strokes[c].c!;
    const wrong = distinct(chars.map((x) => strokes[x].c ?? '').filter((x) => [...x].length >= 2), 2, right, random);
    return { kind: 'chars', prompt: `What is ${c} built from?`, options: [right, ...wrong], why: `${c} is made of ${[...right].join(' and ')}.` };
  }
  if (mode === 'meaning') {
    const c = pick(chars.filter((x) => gloss(readings[x]?.d)), random);
    if (!c) return null;
    const wrong = distinct(chars.filter((x) => gloss(readings[x]?.d)), 3, c, random);
    return { kind: 'chars', prompt: `Which character means “${gloss(readings[c].d)}”?`, options: [c, ...wrong], why: `${c}: ${readings[c].d}.` };
  }
  if (mode === 'reading') {
    const c = pick(chars.filter((x) => isKanji(strokes[x]) && readings[x]?.on?.length), random);
    if (!c) return null;
    const right = readings[c].on![0];
    const wrong = distinct(Object.values(readings).flatMap((r) => r.on?.slice(0, 1) ?? []), 3, right, random);
    return { kind: 'chars', prompt: `An on’yomi (Chinese-derived reading) of ${c}${readings[c].d ? ` (${gloss(readings[c].d)})` : ''}:`, options: [right, ...wrong], why: `${c} is read ${readings[c].on!.join(' or ')} in compounds${readings[c].kun?.length ? `, and ${readings[c].kun!.join(', ')} on its own` : ''}.` };
  }
  if (mode === 'kana') {
    const withKun = chars.filter((x) => isKanji(strokes[x]) && readings[x]?.kun?.some((k) => romajiToKana(k)));
    const c = pick(withKun, random);
    if (!c) return null;
    const kun = readings[c].kun!.find((k) => romajiToKana(k))!;
    const wrong = distinct(withKun, 3, c, random);
    return { kind: 'chars', prompt: `Which kanji is read ${romajiToKana(kun)}${gloss(readings[c].d) ? ` (${gloss(readings[c].d)})` : ''}?`, options: [c, ...wrong], why: `${c}: ${readings[c].d ?? ''}, kun reading ${romajiToKana(kun)}.` };
  }
  if (mode === 'hanja') {
    const c = pick(chars.filter((x) => readings[x]?.ko?.length), random);
    if (!c) return null;
    const right = readings[c].ko![0];
    const wrong = distinct(Object.values(readings).flatMap((r) => r.ko?.slice(0, 1) ?? []), 3, right, random);
    return { kind: 'chars', prompt: `How is the hanja ${c} (${gloss(readings[c].d) ?? ''}) read in Korean?`, options: [right, ...wrong], why: `${c} is read ${readings[c].ko!.join(' or ')}.` };
  }
  if (mode === 'trad' && trad?.length) {
    const [simp, tr] = pick(trad, random);
    const wrong = distinct(trad.map((p) => p[1]), 3, tr, random);
    return { kind: 'chars', prompt: `The Traditional form of ${simp}:`, options: [tr, ...wrong], why: `${simp} is the Simplified form of ${tr}.` };
  }
  return null;
}

/** A round of questions of one mode. */
export function charRound(mode: QuizMode, data: CharData, random: () => number, size = 8, trad?: Array<[string, string]>): MarkItem[] {
  const out: MarkItem[] = [];
  for (let i = 0; i < size * 4 && out.length < size; i++) {
    const q = charQuestion(mode, data, random, trad);
    if (q && !out.some((o) => o.prompt === q.prompt)) out.push(q);
  }
  return out;
}

// ── tones ──
const TONE_MARKS: Record<string, string> = { a: 'āáǎà', e: 'ēéěè', i: 'īíǐì', o: 'ōóǒò', u: 'ūúǔù', ü: 'ǖǘǚǜ' };
/** A pinyin syllable with its tone mark: the mark goes on a or e, on the o of ou, else on the last vowel. */
export function markTone(syllable: string, tone: 1 | 2 | 3 | 4): string {
  const v = syllable.match(/[aeiouü]/g);
  if (!v) return syllable;
  const target = syllable.includes('a') ? 'a' : syllable.includes('e') ? 'e' : syllable.includes('ou') ? 'o' : v[v.length - 1];
  const at = syllable.lastIndexOf(target);
  return syllable.slice(0, at) + TONE_MARKS[target][tone - 1] + syllable.slice(at + 1);
}
export const TONE_NAMES = ['1st: high and level', '2nd: rising', '3rd: falling then rising', '4th: falling'];
const TONE_SYLLABLES = ['ma', 'ba', 'shu', 'xi', 'di', 'hao', 'lei', 'gou', 'mei', 'wen', 'yu', 'zhong', 'ren', 'shan', 'lü'];
/** Questions asking which tone a marked syllable has. */
export function toneRound(random: () => number, size = 8): MarkItem[] {
  const out: MarkItem[] = [];
  while (out.length < size) {
    const syl = pick(TONE_SYLLABLES, random);
    const tone = (1 + Math.floor(random() * 4)) as 1 | 2 | 3 | 4;
    const prompt = `Which tone is ${markTone(syl, tone)}?`;
    if (out.some((o) => o.prompt === prompt)) continue;
    out.push({ kind: 'tones', prompt, options: [TONE_NAMES[tone - 1], ...TONE_NAMES.filter((_, i) => i !== tone - 1)], why: `${markTone(syl, tone)} is the ${TONE_NAMES[tone - 1]} tone.` });
  }
  return out;
}

// ── handwriting ──
export type Pt = [number, number];
const arc = (pts: Pt[]) => pts.reduce((n, p, i) => (i ? n + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);
/** `n` points spread evenly along a polyline. */
export function resample(pts: Pt[], n: number): Pt[] {
  const total = arc(pts);
  if (!pts.length) return [];
  if (!total) return Array.from({ length: n }, () => pts[0]);
  const out: Pt[] = [];
  let seg = 1;
  let done = 0;
  for (let k = 0; k < n; k++) {
    const at = (total * k) / (n - 1);
    while (seg < pts.length - 1 && done + Math.hypot(pts[seg][0] - pts[seg - 1][0], pts[seg][1] - pts[seg - 1][1]) < at) {
      done += Math.hypot(pts[seg][0] - pts[seg - 1][0], pts[seg][1] - pts[seg - 1][1]);
      seg += 1;
    }
    const a = pts[seg - 1];
    const b = pts[seg];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const t = Math.min(1, Math.max(0, (at - done) / len));
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}
export interface StrokeCheck {
  /** One entry per expected stroke: whether the stroke drawn in that place follows it (same path, same direction). */
  ok: boolean[];
  /** How many strokes were drawn against how many there are. */
  drawn: number;
  total: number;
}
/** Compares drawn strokes with a character's centre lines, both in a unit square (y down), stroke by stroke in order. */
export function checkStrokes(drawn: Pt[][], expected: Pt[][], tolerance = 0.16): StrokeCheck {
  const ok = expected.map((e, i) => {
    const d = drawn[i];
    if (!d || d.length < 2) return false;
    const a = resample(d, 6);
    const b = resample(e, 6);
    return a.reduce((n, p, k) => n + Math.hypot(p[0] - b[k][0], p[1] - b[k][1]), 0) / 6 < tolerance;
  });
  return { ok, drawn: drawn.length, total: expected.length };
}
/** Mandarin's centre lines as a unit square, y down (the data is a 1024 box, y up, drawn from 900 down). */
export const hanziLines = (medians: number[][][]): Pt[][] => medians.map((m) => m.map(([x, y]) => [x / 1024, (900 - y) / 1024] as Pt));
