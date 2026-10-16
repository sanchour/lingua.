// Whisper's verbose JSON (segments + word timestamps) → one cue per sentence, with word timings.
import type { Cue } from '@/data/types';
import { sentences } from './subtitles';

export interface WhisperResult {
  duration?: number;
  segments?: Array<{ start: number; end: number; text: string }>;
  words?: Array<{ word: string; start: number; end: number }>;
}

const ms = (seconds: number) => Math.round(seconds * 1000);

/**
 * Builds cues from one transcription. `offsetMs` shifts everything (for long files sent in parts).
 * Whisper segments can hold several sentences; they are split so each cue is one sentence, and the
 * segment's words are shared out in order.
 */
export function cuesFromWhisper(result: WhisperResult, lang: string, offsetMs = 0): Cue[] {
  const words = (result.words ?? []).map((w) => ({ w: w.word.trim(), startMs: ms(w.start) + offsetMs, endMs: ms(w.end) + offsetMs })).filter((w) => w.w);
  const segments = result.segments?.length
    ? result.segments
    : words.length
      ? [{ start: (words[0].startMs - offsetMs) / 1000, end: (words.at(-1)!.endMs - offsetMs) / 1000, text: words.map((w) => w.w).join(' ') }]
      : [];

  const cues: Cue[] = [];
  let next = 0; // first word not yet used
  for (const seg of segments) {
    const start = ms(seg.start) + offsetMs;
    const end = ms(seg.end) + offsetMs;
    const own: typeof words = [];
    while (next < words.length && words[next].startMs < end - 20) own.push(words[next++]);

    const parts = sentences(seg.text, lang);
    if (!parts.length) continue;
    const counts = parts.map((p) => p.split(/\s+/).filter(Boolean).length);
    const totalCount = counts.reduce((a, b) => a + b, 0) || 1;
    const totalChars = parts.reduce((a, p) => a + p.length, 0) || 1;
    let used = 0;
    let chars = 0;
    parts.forEach((text, i) => {
      // Share the segment's words out by word count; fall back to time by text length.
      const take = i === parts.length - 1 ? own.length - used : Math.round((counts[i] / totalCount) * own.length);
      const mine = own.slice(used, used + take);
      used += mine.length;
      const fallbackStart = start + ((end - start) * chars) / totalChars;
      chars += text.length;
      const fallbackEnd = start + ((end - start) * chars) / totalChars;
      cues.push({
        startMs: Math.round(mine[0]?.startMs ?? fallbackStart),
        endMs: Math.round(mine.at(-1)?.endMs ?? fallbackEnd),
        text,
        words: mine.length ? mine : undefined,
      });
    });
  }
  return cues;
}
