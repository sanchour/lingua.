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
