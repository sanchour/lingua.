import { describe, expect, it } from 'vitest';
import type { Cue } from '@/data/types';
import { lineAt, matchingLine, nextLineStart, previousLineStart } from '@/features/visio/player/lines';
import { splitAtPauses, wav } from '@/services/transcribe/audio';
import { roleFor, subtitleName } from './files';
import { subtitleSized, toSrt, toVtt } from './subtitles';

const cue = (startMs: number, endMs: number, text: string): Cue => ({ startMs, endMs, text });

describe('subtitle files', () => {
  it('reads language tags from names', () => {
    expect(subtitleName('Show.S01E02.es.srt')).toEqual({ base: 'show s01e02', lang: 'es' });
    expect(subtitleName('Film (2019).eng.forced.srt')).toEqual({ base: 'film (2019)', lang: 'en' });
    expect(subtitleName('Episode 3.pt-BR.vtt')).toEqual({ base: 'episode 3', lang: 'pt' });
    expect(subtitleName('Episode_3.srt')).toEqual({ base: 'episode 3', lang: undefined });
    expect(subtitleName('Movie.The.srt').lang).toBeUndefined();
  });

  it('assigns the target and English tracks', () => {
    const taken = new Set<'target' | 'native'>();
    expect(roleFor('en', 'es', taken)).toBe('native');
    taken.add('native');
    expect(roleFor(undefined, 'es', taken)).toBe('target');
    taken.add('target');
    expect(roleFor('es', 'es', taken)).toBeNull();
  });
});

describe('subtitle lines', () => {
  it('splits long Whisper sentences at punctuation with their word timings', () => {
    const words = 'Esta es una frase bastante larga, que sigue y sigue durante mucho tiempo, hasta que por fin termina aquí mismo.'
      .split(' ')
      .map((w, i) => ({ w, startMs: i * 400, endMs: i * 400 + 350 }));
    const long: Cue = { startMs: 0, endMs: words.at(-1)!.endMs, text: words.map((w) => w.w).join(' '), words };
    const out = subtitleSized([long], 60);
    expect(out.length).toBeGreaterThan(1);
    expect(out.map((c) => c.text).join(' ')).toBe(long.text);
    expect(out[0].text.endsWith(',')).toBe(true);
    expect(out[1].startMs).toBe(out[1].words![0].startMs);
    expect(out.every((c) => c.text.length <= 60)).toBe(true);
  });

  it('writes WebVTT and SRT', () => {
    const cues = [cue(1500, 3200, 'Hola.'), cue(3_723_004, 3_725_000, 'Adiós --> ya')];
    expect(toVtt(cues)).toBe('WEBVTT\n\n00:00:01.500 --> 00:00:03.200\nHola.\n\n01:02:03.004 --> 01:02:05.000\nAdiós → ya\n');
    expect(toSrt(cues).split('\n').slice(0, 3)).toEqual(['1', '00:00:01,500 --> 00:00:03,200', 'Hola.']);
  });

  it('finds the line on screen and steps between lines', () => {
    const lines = [cue(1000, 2000, 'a'), cue(3000, 4000, 'b'), cue(6000, 7000, 'c')];
    expect(lineAt(lines, 500)).toBe(-1);
    expect(lineAt(lines, 2200)).toBe(0); // lingers a moment
    expect(lineAt(lines, 2600)).toBe(-1);
    expect(previousLineStart(lines, 3500)).toBe(1000); // just started: the one before
    expect(previousLineStart(lines, 3900)).toBe(1000);
    expect(previousLineStart(lines, 4500)).toBe(3000); // well into it: its own start
    expect(nextLineStart(lines, 3500)).toBe(6000);
    expect(nextLineStart(lines, 6500)).toBeNull();
  });

  it('matches the English line that overlaps most', () => {
    const native = [cue(900, 1800, 'A'), cue(1800, 3300, 'B'), cue(3300, 5000, 'C')];
    expect(matchingLine(native, cue(2000, 3600, 'x'))?.text).toBe('B');
    expect(matchingLine(native, cue(9000, 9500, 'x'))).toBeUndefined();
    expect(matchingLine(null, cue(0, 1, 'x'))).toBeUndefined();
  });
});

describe('audio for Whisper', () => {
  it('cuts long audio at the quietest moment near each boundary', () => {
    const rate = 1000;
    const samples = new Float32Array(25 * rate).fill(0.5);
    samples.fill(0, 8200, 8400); // a pause just before the 10 s mark
    const parts = splitAtPauses(samples, 10, rate);
    expect(parts.length).toBe(3);
    expect(parts[1].offsetMs).toBeGreaterThan(8150);
    expect(parts[1].offsetMs).toBeLessThan(8450);
    expect(parts.reduce((n, p) => n + p.samples.length, 0)).toBe(samples.length);
  });

  it('writes a 16-bit mono WAV header', async () => {
    const blob = wav(new Float32Array([0, 1, -1]), 16_000);
    const view = new DataView(await blob.arrayBuffer());
    expect(blob.size).toBe(44 + 6);
    expect(view.getUint32(24, true)).toBe(16_000);
    expect(view.getInt16(46, true)).toBe(0x7fff);
    expect(view.getInt16(48, true)).toBe(-0x8000);
  });
});
