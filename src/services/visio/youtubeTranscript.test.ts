import { describe, expect, it, vi } from 'vitest';
import { fetchYouTubeCaptions, geminiBody, parseGeminiCues, parseJson3, parseStamp, transcribeWithGemini, TranscriptError } from './youtubeTranscript';

const KEY = 'test-not-a-real-key';
const answer = (text: string, status = 200) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status });

describe('timestamps', () => {
  it('reads minutes and seconds, hours, seconds and numbers', () => {
    expect(parseStamp('1:05')).toBe(65_000);
    expect(parseStamp('01:02:03')).toBe(3_723_000);
    expect(parseStamp('12.5')).toBe(12_500);
    expect(parseStamp('0:07,250')).toBe(7250);
    expect(parseStamp(7.5)).toBe(7500);
    expect(parseStamp('soon')).toBeNull();
    expect(parseStamp(-1)).toBeNull();
    expect(parseStamp('1:2:3:4')).toBeNull();
  });
});

describe('Gemini’s lines', () => {
  it('reads cues, sorts them and keeps them from running into each other', () => {
    const cues = parseGeminiCues(JSON.stringify({ cues: [{ start: '0:10', end: '0:20', text: 'Deux.' }, { start: '0:02', end: '0:06', text: ' Un  \n bonjour. ' }, { start: '0:15', text: '' }] }));
    expect(cues.map((c) => c.text)).toEqual(['Un bonjour.', 'Deux.']);
    expect(cues[0]).toMatchObject({ startMs: 2000, endMs: 6000 });
    expect(cues[1]).toMatchObject({ startMs: 10_000, endMs: 20_000 });
  });

  it('gives a missing or backwards end a short length, and trims an overlap', () => {
    const cues = parseGeminiCues(JSON.stringify([{ start: 1, end: 0, text: 'Salut' }, { start: 3, end: 4, text: 'Oui' }]));
    expect(cues[0].endMs).toBeGreaterThan(1000);
    expect(cues[0].endMs).toBeLessThanOrEqual(3000);
  });

  it('reads an answer wrapped in a code fence, and refuses what is not subtitles', () => {
    expect(parseGeminiCues('```json\n{"cues":[{"start":"0:01","end":"0:02","text":"Oui"}]}\n```')).toHaveLength(1);
    expect(() => parseGeminiCues('not json')).toThrow(TranscriptError);
    expect(() => parseGeminiCues('{"lines":[]}')).toThrow(TranscriptError);
  });
});

describe('asking Gemini', () => {
  it('sends the video’s address and the key in a header, never in the address', async () => {
    const fetchImpl = vi.fn(async () => answer('{"cues":[{"start":"0:01","end":"0:03","text":"Bonjour"}]}'));
    const cues = await transcribeWithGemini({ youtubeId: 'jNQXAC9IVRw', lang: 'fr', key: KEY, model: 'gemini-flash-latest' }, fetchImpl as unknown as typeof fetch);
    expect(cues).toEqual([{ startMs: 1000, endMs: 3000, text: 'Bonjour' }]);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent');
    expect(url).not.toContain(KEY);
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe(KEY);
    expect(String(init.body)).toContain('https://www.youtube.com/watch?v=jNQXAC9IVRw');
    expect(String(init.body)).not.toContain(KEY);
  });

  it('asks for the language by name', () => {
    expect(JSON.stringify(geminiBody('abc', 'fr'))).toContain('in French');
  });

  it('says what went wrong', async () => {
    const reply = (status: number) => vi.fn(async () => new Response('{}', { status })) as unknown as typeof fetch;
    const ask = (f: typeof fetch) => transcribeWithGemini({ youtubeId: 'x', lang: 'fr', key: KEY, model: 'm' }, f);
    await expect(ask(reply(403))).rejects.toMatchObject({ kind: 'auth' });
    await expect(ask(reply(429))).rejects.toMatchObject({ kind: 'rate' });
    await expect(ask(reply(400))).rejects.toMatchObject({ kind: 'unavailable' });
    await expect(ask(reply(500))).rejects.toMatchObject({ kind: 'bad-response' });
    await expect(ask(vi.fn(async () => answer('{"cues":[]}')) as unknown as typeof fetch)).rejects.toMatchObject({ kind: 'empty' });
    await expect(ask(vi.fn(async () => Promise.reject(new Error('offline'))) as unknown as typeof fetch)).rejects.toMatchObject({ kind: 'network' });
    await expect(transcribeWithGemini({ youtubeId: 'x', lang: 'fr', key: '', model: 'm' })).rejects.toMatchObject({ kind: 'no-key' });
  });
});

describe('YouTube’s own captions', () => {
  const json3 = JSON.stringify({ events: [{ tStartMs: 0, dDurationMs: 1000 }, { tStartMs: 1500, dDurationMs: 2000, segs: [{ utf8: 'Bonjour ' }, { utf8: 'à tous' }] }] });

  it('reads json3', () => {
    expect(parseJson3(json3)).toEqual([{ startMs: 1500, endMs: 3500, text: 'Bonjour à tous' }]);
    expect(parseJson3('')).toEqual([]);
  });

  it('tries the captions, then the automatic ones', async () => {
    const calls: string[] = [];
    const fetchImpl = vi.fn(async (url: string) => {
      calls.push(url);
      return new Response(url.includes('kind=asr') ? json3 : '', { status: 200 });
    });
    const cues = await fetchYouTubeCaptions('jNQXAC9IVRw', 'fr', fetchImpl as unknown as typeof fetch);
    expect(cues).toHaveLength(1);
    expect(calls).toHaveLength(2);
    expect(calls[1]).toContain('kind=asr');
  });

  it('says nothing, rather than failing, when YouTube hands over nothing or the network is down', async () => {
    expect(await fetchYouTubeCaptions('x', 'fr', vi.fn(async () => new Response('', { status: 200 })) as unknown as typeof fetch)).toEqual([]);
    expect(await fetchYouTubeCaptions('x', 'fr', vi.fn(async () => Promise.reject(new Error('offline'))) as unknown as typeof fetch)).toEqual([]);
  });
});
