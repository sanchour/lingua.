import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

// The Lingua extension's subtitle reader is plain JavaScript in extension/parse.js; it is tested here.
const parse = createRequire(import.meta.url)('../../../extension/parse.js') as {
  parseAny: (body: string) => Array<{ startMs: number; endMs: number; text: string }>;
  detect: (body: string) => string | null;
  lineAt: (cues: Array<{ startMs: number; endMs: number }>, ms: number) => number;
  stepTo: (cues: Array<{ startMs: number; endMs: number }>, ms: number, dir: number) => number | null;
};

describe('the extension’s subtitle reader', () => {
  it('reads YouTube’s json3', () => {
    const body = JSON.stringify({ events: [{ tStartMs: 0, dDurationMs: 1000 }, { tStartMs: 1500, dDurationMs: 2000, segs: [{ utf8: 'Bonjour ' }, { utf8: 'à tous' }] }, { tStartMs: 4000, segs: [{ utf8: '\n' }] }] });
    expect(parse.detect(body)).toBe('json3');
    expect(parse.parseAny(body)).toEqual([{ startMs: 1500, endMs: 3500, text: 'Bonjour à tous' }]);
  });

  it('reads WebVTT with tags, entities and short times', () => {
    const body = 'WEBVTT\n\n1\n00:00:01.000 --> 00:00:03.500 align:start\n<i>Qu&apos;est-ce que</i>\nc’est ?\n\n00:04.000 --> 00:05.000\nOui.\n';
    expect(parse.parseAny(body)).toEqual([
      { startMs: 1000, endMs: 3500, text: "Qu'est-ce que c’est ?" },
      { startMs: 4000, endMs: 5000, text: 'Oui.' },
    ]);
  });

  it('reads TTML with clock times, seconds and ticks', () => {
    const clock = '<?xml version="1.0"?><tt xmlns="http://www.w3.org/ns/ttml"><body><div><p begin="00:00:02.000" end="00:00:04.500">Hola<br/>amigos</p><p begin="6s" dur="2s">Adiós</p></div></body></tt>';
    expect(parse.parseAny(clock)).toEqual([
      { startMs: 2000, endMs: 4500, text: 'Hola amigos' },
      { startMs: 6000, endMs: 8000, text: 'Adiós' },
    ]);
    const ticks = '<tt ttp:tickRate="10000000"><body><p begin="20000000t" end="45000000t">Ciao</p></body></tt>';
    expect(parse.parseAny(ticks)).toEqual([{ startMs: 2000, endMs: 4500, text: 'Ciao' }]);
  });

  it('says nothing for what is not subtitles', () => {
    expect(parse.detect('<html><body>hello</body></html>')).toBeNull();
    expect(parse.parseAny('{"a":1}')).toEqual([]);
  });

  it('finds and steps between lines', () => {
    const cues = [
      { startMs: 1000, endMs: 3000 },
      { startMs: 4000, endMs: 6000 },
      { startMs: 8000, endMs: 9000 },
    ];
    expect(parse.lineAt(cues, 500)).toBe(-1);
    expect(parse.lineAt(cues, 4500)).toBe(1);
    expect(parse.stepTo(cues, 4500, 1)).toBe(8000);
    expect(parse.stepTo(cues, 9500, 1)).toBeNull();
    expect(parse.stepTo(cues, 4500, -1)).toBe(1000);
    expect(parse.stepTo(cues, 1500, -1)).toBeNull();
  });
});
