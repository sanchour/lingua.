// Transcripts from files: SubRip (.srt), WebVTT (.vtt, including karaoke-style word timestamps)
// and plain text (no timings: spread over the audio by length).
import type { Cue } from '@/data/types';

const TIME = /(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})/;

/** "01:02:03,456" / "02:03.456" → milliseconds. */
export function parseTimestamp(value: string): number | null {
  const m = TIME.exec(value);
  if (!m) return null;
  const [, h, min, s, frac] = m;
  return ((Number(h ?? 0) * 60 + Number(min)) * 60 + Number(s)) * 1000 + Number(frac.padEnd(3, '0'));
}

const cleanLine = (line: string) =>
  line
    .replace(/\{\\[^}]*\}/g, '') // ASS overrides like {\an8}
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

/** VTT karaoke text: "<00:00:01.000><c>Hello</c><00:00:01.400><c> world</c>". */
function inlineWords(raw: string, startMs: number, endMs: number): Cue['words'] {
  if (!/<\d+:\d{2}[:.]/.test(raw)) return undefined;
  const parts = raw.split(/<((?:\d+:)?\d{1,2}:\d{2}\.\d{3})>/);
  const words: NonNullable<Cue['words']> = [];
  let at = startMs;
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) {
      at = parseTimestamp(parts[i]) ?? at;
      continue;
    }
    for (const w of cleanLine(parts[i]).split(' ').filter(Boolean)) words.push({ w, startMs: at, endMs: at });
  }
  words.forEach((w, i) => (w.endMs = words[i + 1]?.startMs ?? endMs));
  return words.length ? words : undefined;
}

/** Parses SRT or WebVTT text into cues (sorted, duplicates from rolling captions merged). */
export function parseSubtitles(source: string): Cue[] {
  const text = source.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const blocks = text.split(/\n{2,}/);
  const cues: Cue[] = [];
  for (const block of blocks) {
    const lines = block.split('\n').filter((l) => l.trim() !== '');
    const timing = lines.findIndex((l) => l.includes('-->'));
    if (timing < 0) continue; // WEBVTT header, NOTE, STYLE, stray numbers
    const [from, to] = lines[timing].split('-->');
    const startMs = parseTimestamp(from);
    const endMs = parseTimestamp(to);
    if (startMs === null || endMs === null) continue;
    const rawLines = lines.slice(timing + 1);
    const cueText = rawLines.map(cleanLine).filter(Boolean).join(' ');
    if (!cueText) continue;
    cues.push({ startMs, endMs: Math.max(endMs, startMs), text: cueText, words: inlineWords(rawLines.join(' '), startMs, endMs) });
  }
  cues.sort((a, b) => a.startMs - b.startMs);

  // Rolling captions repeat the same line in consecutive cues: keep one, spanning both.
  const merged: Cue[] = [];
  for (const cue of cues) {
    const last = merged.at(-1);
    if (last && last.text === cue.text) last.endMs = Math.max(last.endMs, cue.endMs);
    else merged.push(cue);
  }
  return merged;
}

/** Splits text into sentences (Intl.Segmenter where available). */
export function sentences(text: string, lang: string): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  if (typeof Intl.Segmenter === 'function') {
    return [...new Intl.Segmenter(lang, { granularity: 'sentence' }).segment(clean)].map((s) => s.segment.trim()).filter(Boolean);
  }
  return clean.match(/[^.!?…]+[.!?…]+["»”’)\]]*|[^.!?…]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [clean];
}

/**
 * A transcript without timings: one cue per sentence (short ones joined), with times spread over
 * the audio by length. Approximate, but enough to follow along and jump around.
 */
export function textToCues(text: string, durationMs: number, lang: string): Cue[] {
  const parts: string[] = [];
  for (const paragraph of text.replace(/\r\n?/g, '\n').split(/\n\s*\n/)) {
    for (const s of sentences(paragraph, lang)) {
      const last = parts.at(-1);
      if (last && last.length < 40 && !/[.!?…]["»”’)\]]*$/.test(last)) parts[parts.length - 1] = `${last} ${s}`;
      else parts.push(s);
    }
  }
  const total = parts.reduce((n, p) => n + p.length, 0) || 1;
  let at = 0;
  return parts.map((p) => {
    const startMs = Math.round((at / total) * durationMs);
    at += p.length;
    return { startMs, endMs: Math.round((at / total) * durationMs), text: p };
  });
}

/** Decides by content (and file name) whether a file is SRT/VTT or plain text. */
export function looksTimed(source: string): boolean {
  return /\d{1,2}:\d{2}[.,]\d{1,3}\s*-->/.test(source.slice(0, 4000));
}
