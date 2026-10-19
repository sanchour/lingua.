// Song lyrics as lines: LRC (timed, from LRCLIB) or plain text. A line with no words is a break
// between verses; it stays in the list so the sheet can leave a space there.
import type { Cue, LyricLine } from '@/data/types';

export type { LyricLine };

const STAMP = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

/** Parses LRC: "[01:02.34] words", several stamps for a repeated line, and an [offset:±ms] tag. */
export function parseLrc(lrc: string): LyricLine[] {
  const out: LyricLine[] = [];
  let offset = 0;
  for (const raw of lrc.split(/\r?\n/)) {
    const tag = /^\[offset:\s*([+-]?\d+)\]/i.exec(raw.trim());
    if (tag) {
      offset = Number(tag[1]);
      continue;
    }
    const stamps: number[] = [];
    let rest = raw;
    STAMP.lastIndex = 0;
    let m: RegExpExecArray | null;
    let end = 0;
    while ((m = STAMP.exec(raw)) && m.index === end) {
      const frac = m[3] ? Number(m[3].padEnd(3, '0').slice(0, 3)) : 0;
      stamps.push(Number(m[1]) * 60_000 + Number(m[2]) * 1000 + frac);
      end = STAMP.lastIndex;
    }
    if (!stamps.length) continue; // metadata like [ar:…] or a stray line
    rest = raw.slice(end);
    // Word-timed (enhanced) LRC: drop the <mm:ss.xx> marks inside the line.
    const text = rest.replace(/<\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?>/g, '').replace(/\s+/g, ' ').trim();
    for (const s of stamps) out.push({ startMs: Math.max(0, s - offset), text });
  }
  out.sort((a, b) => a.startMs! - b.startMs!);
  return tidy(out);
}

/** Plain lyrics: one line each, blank lines as breaks between verses. */
export function parsePlain(text: string): LyricLine[] {
  return tidy(text.split(/\r?\n/).map((l) => ({ text: l.replace(/\s+/g, ' ').trim() })));
}

/** No break at the start or end, and never two in a row. */
function tidy(lines: LyricLine[]): LyricLine[] {
  const out: LyricLine[] = [];
  for (const line of lines) {
    if (!line.text && (!out.length || !out[out.length - 1].text)) continue;
    out.push(line);
  }
  while (out.length && !out[out.length - 1].text) out.pop();
  return out;
}

export const isTimed = (lines: readonly LyricLine[]) => lines.length > 0 && lines.every((l) => l.startMs !== undefined);

/**
 * Timed lines as cues for the player: each lasts until the next one starts (the last until the
 * song's end, or a few seconds). Breaks are kept so the highlight leaves a verse during a solo.
 */
export function linesToCues(lines: readonly LyricLine[], durationMs?: number): Cue[] {
  return lines.map((l, i) => {
    const start = l.startMs ?? 0;
    const next = lines[i + 1]?.startMs;
    const end = next ?? Math.max(start + 4000, durationMs ?? 0);
    return { startMs: start, endMs: Math.max(start + 200, end), text: l.text };
  });
}

/** Lines with words in them (for exercises and counting). */
export const sungLines = (lines: readonly LyricLine[]) => lines.filter((l) => /\p{L}/u.test(l.text));

/** A line the learner placed by tapping it while it was sung: [line index, time in the song]. */
export type LyricAnchor = [line: number, ms: number];

/**
 * Times for lyrics that have none, so they can follow the music gently: the sung lines spread over
 * the song by their length (a break counts as a short pause), after an intro and before an outro.
 * Lines the learner tapped while they were sung (`anchors`) are fixed points; the lines between
 * are spread between them.
 */
export function estimateTimes(lines: readonly LyricLine[], durationMs: number, anchors: readonly LyricAnchor[] = []): LyricLine[] {
  const weights = lines.map((l) => (l.text ? Math.max(12, l.text.length) : 20));
  const before: number[] = [];
  let total = 0;
  for (const w of weights) {
    before.push(total);
    total += w;
  }
  const intro = Math.min(15_000, durationMs * 0.08);
  const outro = Math.min(12_000, durationMs * 0.06);
  // Fixed points in order of the lines; a tap that contradicts a later line's is dropped.
  const points: Array<[weight: number, ms: number]> = [[0, intro]];
  for (const [line, ms] of [...anchors].sort((a, b) => a[0] - b[0])) {
    if (line < 0 || line >= lines.length) continue;
    const last = points[points.length - 1];
    if (before[line] > last[0] && ms > last[1]) points.push([before[line], ms]);
    else if (before[line] === last[0] && points.length > 1) points[points.length - 1] = [before[line], ms];
  }
  const end = Math.max(points[points.length - 1][1] + 1000, durationMs - outro);
  if (total > points[points.length - 1][0]) points.push([total, end]);
  let k = 0;
  return lines.map((l, i) => {
    const w = before[i];
    while (k < points.length - 2 && points[k + 1][0] <= w) k++;
    const [w0, t0] = points[k];
    const [w1, t1] = points[Math.min(k + 1, points.length - 1)];
    const at = w1 > w0 ? t0 + ((w - w0) / (w1 - w0)) * (t1 - t0) : t0;
    return { ...l, startMs: Math.round(at) };
  });
}
