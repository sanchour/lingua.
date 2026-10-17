// Subtitle work for Visio: lines short enough to read over a picture, English subtitles made by
// the AI from the target track, and WebVTT for the phone's own full-screen player.
import { getLanguage, GLOSS_LANG } from '@/core/lang/languages';
import type { Cue, Media } from '@/data/types';
import { saveTrack } from '@/data/video';
import { askJson } from '@/services/llm/client';

/** About two lines of subtitles. */
const MAX_CHARS = 84;

/**
 * Splits long cues (Whisper sentences can run for half a minute) into subtitle-sized lines, at
 * punctuation where possible, using the word timings for the new start and end times.
 */
export function subtitleSized(cues: Cue[], maxChars = MAX_CHARS): Cue[] {
  const out: Cue[] = [];
  for (const cue of cues) {
    const words = cue.words;
    if (cue.text.length <= maxChars || !words?.length || words.length < 4) {
      out.push(cue);
      continue;
    }
    let group: NonNullable<Cue['words']> = [];
    let length = 0;
    const flush = () => {
      if (!group.length) return;
      out.push({ startMs: group[0].startMs, endMs: group.at(-1)!.endMs, text: group.map((w) => w.w).join(' '), words: group });
      group = [];
      length = 0;
    };
    words.forEach((w, i) => {
      group.push(w);
      length += w.w.length + 1;
      const left = words.length - i - 1;
      const soft = /[,;:—–]$/.test(w.w) && length > maxChars * 0.45;
      if (left > 1 && (length >= maxChars || soft)) flush();
    });
    flush();
  }
  return out;
}

const pad = (n: number, size = 2) => String(n).padStart(size, '0');
const vttTime = (ms: number) => {
  const t = Math.max(0, Math.round(ms));
  return `${pad(Math.floor(t / 3_600_000))}:${pad(Math.floor(t / 60_000) % 60)}:${pad(Math.floor(t / 1000) % 60)}.${pad(t % 1000, 3)}`;
};

/** WebVTT text for a <track> element (iPhone full screen draws these itself). */
export function toVtt(cues: Cue[]): string {
  return `WEBVTT\n\n${cues.map((c) => `${vttTime(c.startMs)} --> ${vttTime(Math.max(c.endMs, c.startMs + 400))}\n${c.text.replace(/-->/g, '→')}`).join('\n\n')}\n`;
}

/** SRT text, for "Export subtitles". */
export function toSrt(cues: Cue[]): string {
  const time = (ms: number) => vttTime(ms).replace('.', ',');
  return cues.map((c, i) => `${i + 1}\n${time(c.startMs)} --> ${time(c.endMs)}\n${c.text}`).join('\n\n') + '\n';
}


const BATCH = 40;

/**
 * English subtitles for a target track, translated by the AI in batches with the neighbouring
 * lines as context; timings are kept. `onProgress` gets 0–1.
 */
export async function translateTrack(media: Media, cues: Cue[], onProgress?: (fraction: number) => void): Promise<Cue[]> {
  const name = getLanguage(media.lang)?.name ?? media.lang;
  const system =
    `You translate ${name} film and TV subtitles into natural, idiomatic English subtitles. ` +
    'Answer only with JSON: {"lines": string[]}, exactly one English line for each input line, in the same order. ' +
    'Translate meaning in context (idioms, tone, register), keep each line about as short as the original, and never merge or split lines.';
  const out: Cue[] = [];
  for (let start = 0; start < cues.length; start += BATCH) {
    onProgress?.(start / cues.length);
    const batch = cues.slice(start, start + BATCH);
    const before = cues.slice(Math.max(0, start - 3), start).map((c) => c.text);
    const user = JSON.stringify({ title: media.title, context_before: before, lines: batch.map((c) => c.text) });
    const result = await askJson<{ lines?: unknown }>({ system, user, kind: 'subtitleLine' });
    const lines = Array.isArray(result.lines) ? result.lines.map((l) => String(l ?? '').trim()) : [];
    batch.forEach((c, i) => out.push({ startMs: c.startMs, endMs: c.endMs, text: lines[i] || '' }));
  }
  onProgress?.(1);
  return out.filter((c) => c.text);
}

/** Translates the target track and saves it as the English track. */
export async function makeNativeTrack(media: Media, cues: Cue[], onProgress?: (fraction: number) => void): Promise<number> {
  const native = await translateTrack(media, cues, onProgress);
  if (!native.length) throw new Error('No translation came back.');
  await saveTrack(media.id, GLOSS_LANG, 'native', native, 'machine');
  return native.length;
}
