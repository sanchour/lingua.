import { describe, expect, it } from 'vitest';
import { cueIndexAt, formatClock, wordStarts } from '@/core/audio/cues';
import { frameLength, isMp3, splitMp3 } from '@/core/audio/mp3';
import { readId3 } from './id3';
import { looksTimed, parseSubtitles, parseTimestamp, textToCues } from './subtitles';
import { cuesFromWhisper } from './whisper';

describe('subtitles', () => {
  it('reads timestamps in both notations', () => {
    expect(parseTimestamp('00:01:02,500')).toBe(62_500);
    expect(parseTimestamp('01:02.5')).toBe(62_500);
    expect(parseTimestamp('1:00:00.000')).toBe(3_600_000);
  });

  it('parses SRT, dropping tags and joining lines', () => {
    const srt = '1\r\n00:00:01,000 --> 00:00:03,200\r\n<i>Привет,</i>\r\nмир!\r\n\r\n2\r\n00:00:04,000 --> 00:00:05,000\r\n{\\an8}Как дела?\r\n';
    expect(parseSubtitles(srt)).toEqual([
      { startMs: 1000, endMs: 3200, text: 'Привет, мир!', words: undefined },
      { startMs: 4000, endMs: 5000, text: 'Как дела?', words: undefined },
    ]);
    expect(looksTimed(srt)).toBe(true);
  });

  it('parses WebVTT with notes, cue ids and karaoke word timings, merging rolling repeats', () => {
    const vtt = [
      'WEBVTT',
      '',
      'NOTE made by hand',
      '',
      'intro',
      '00:01.000 --> 00:03.000 align:start',
      '<00:00:01.000><c>Hola</c><00:00:01.600><c> amigo</c>',
      '',
      '00:03.000 --> 00:04.000',
      'Hola amigo',
    ].join('\n');
    const cues = parseSubtitles(vtt);
    expect(cues).toHaveLength(1);
    expect(cues[0]).toMatchObject({ startMs: 1000, endMs: 4000, text: 'Hola amigo' });
    expect(cues[0].words).toEqual([
      { w: 'Hola', startMs: 1000, endMs: 1600 },
      { w: 'amigo', startMs: 1600, endMs: 3000 },
    ]);
  });

  it('spreads a plain transcript over the audio by length', () => {
    const cues = textToCues('Uno dos. Tres cuatro cinco seis siete ocho nueve diez once doce trece catorce.\n\nQuince.', 10_000, 'es');
    expect(cues.length).toBeGreaterThanOrEqual(2);
    expect(cues[0].startMs).toBe(0);
    expect(cues.at(-1)!.endMs).toBe(10_000);
    for (let i = 1; i < cues.length; i++) expect(cues[i].startMs).toBe(cues[i - 1].endMs);
  });
});

describe('whisper cues', () => {
  it('splits a segment into sentences and shares its words out', () => {
    const cues = cuesFromWhisper(
      {
        segments: [{ start: 0, end: 4, text: ' Я дома. Ты где?' }],
        words: [
          { word: 'Я', start: 0, end: 0.4 },
          { word: 'дома', start: 0.5, end: 1.2 },
          { word: 'Ты', start: 2, end: 2.4 },
          { word: 'где', start: 2.5, end: 3.1 },
        ],
      },
      'ru',
      60_000,
    );
    expect(cues.map((c) => [c.text, c.startMs, c.endMs])).toEqual([
      ['Я дома.', 60_000, 61_200],
      ['Ты где?', 62_000, 63_100],
    ]);
    expect(cues[1].words?.map((w) => w.w)).toEqual(['Ты', 'где']);
  });

  it('works with segments only', () => {
    const cues = cuesFromWhisper({ segments: [{ start: 1, end: 3, text: 'Bonjour.' }] }, 'fr');
    expect(cues).toEqual([{ startMs: 1000, endMs: 3000, text: 'Bonjour.', words: undefined }]);
  });
});

describe('cue timing', () => {
  const cues = [
    { startMs: 1000, endMs: 2000, text: 'a' },
    { startMs: 2500, endMs: 4000, text: 'b' },
    { startMs: 5000, endMs: 6000, text: 'c' },
  ];
  it('finds the cue playing, keeping the last one through gaps', () => {
    expect(cueIndexAt(cues, 500)).toBe(-1);
    expect(cueIndexAt(cues, 1000)).toBe(0);
    expect(cueIndexAt(cues, 2200)).toBe(0);
    expect(cueIndexAt(cues, 4500)).toBe(1);
    expect(cueIndexAt(cues, 99_000)).toBe(2);
  });

  it('formats clocks', () => {
    expect(formatClock(65_000)).toBe('1:05');
    expect(formatClock(3_723_000)).toBe('1:02:03');
  });

  it('times words from word timings, or by position', () => {
    const cue = { startMs: 0, endMs: 1000, text: 'ab cd', words: [{ w: 'ab', startMs: 100, endMs: 300 }] };
    const spans = [
      { offset: 0, text: 'ab' },
      { offset: 3, text: 'cd' },
    ];
    expect(wordStarts(cue, spans)).toEqual([100, 600]);
  });
});

/** One MPEG1 Layer III frame header at 128 kbit/s, 44.1 kHz (417 bytes per frame). */
function mp3Frames(count: number): Uint8Array {
  const frame = new Uint8Array(417);
  frame.set([0xff, 0xfb, 0x90, 0x64]);
  const out = new Uint8Array(frame.length * count);
  for (let i = 0; i < count; i++) out.set(frame, i * frame.length);
  return out;
}

describe('mp3', () => {
  it('reads frame lengths and recognises the stream', () => {
    const bytes = mp3Frames(3);
    expect(frameLength(bytes, 0)).toBe(417);
    expect(isMp3(bytes)).toBe(true);
    expect(isMp3(new Uint8Array(100))).toBe(false);
  });

  it('splits on frame boundaries under the size limit', () => {
    const bytes = mp3Frames(100);
    const parts = splitMp3(bytes, 10_000);
    expect(parts.reduce((n, p) => n + p.length, 0)).toBe(bytes.length);
    for (const p of parts) {
      expect(p.length).toBeLessThanOrEqual(10_000);
      expect(frameLength(p, 0)).toBe(417);
    }
  });
});

describe('id3', () => {
  it('reads title, artist and cover from an ID3v2.3 tag', () => {
    const enc = new TextEncoder();
    const frame = (id: string, body: Uint8Array) => {
      const head = new Uint8Array(10);
      head.set(enc.encode(id));
      new DataView(head.buffer).setUint32(4, body.length);
      return [...head, ...body];
    };
    const title = frame('TIT2', new Uint8Array([3, ...enc.encode('Эпизод 1')]));
    const artist = frame('TPE1', new Uint8Array([0, ...enc.encode('Podcast')]));
    const pic = frame('APIC', new Uint8Array([0, ...enc.encode('image/png'), 0, 3, 0, 1, 2, 3]));
    const frames = [...title, ...artist, ...pic];
    const size = frames.length;
    const header = [0x49, 0x44, 0x33, 3, 0, 0, (size >> 21) & 0x7f, (size >> 14) & 0x7f, (size >> 7) & 0x7f, size & 0x7f];
    const tags = readId3(new Uint8Array([...header, ...frames]));
    expect(tags.title).toBe('Эпизод 1');
    expect(tags.artist).toBe('Podcast');
    expect(tags.cover?.mime).toBe('image/png');
    expect([...tags.cover!.data]).toEqual([1, 2, 3]);
  });
});
