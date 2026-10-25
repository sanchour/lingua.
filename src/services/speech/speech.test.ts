import { afterEach, describe, expect, it, vi } from 'vitest';
import { accentName, otherLocales, voiceLocale } from '@/core/lang/voiceLocale';
import { findAudio, listVoices, pcmToWav, readVoice, synthesize } from './gemini';
import { pickDeviceVoice, voiceQuality, voicesForLocale } from './voice';

const KEY = 'test-not-a-real-key';

describe('which accent speaks', () => {
  it('follows the flag the learner chose', () => {
    expect(voiceLocale('es')).toBe('es-ES');
    expect(voiceLocale('es', 'mx')).toBe('es-MX');
    expect(voiceLocale('pt')).toBe('pt-BR');
    expect(voiceLocale('pt', 'pt')).toBe('pt-PT');
    expect(voiceLocale('en', 'gb')).toBe('en-GB');
    expect(voiceLocale('sh', 'rs')).toBe('sr-RS');
    expect(voiceLocale('tl')).toBe('fil-PH');
    expect(voiceLocale('es', 'fr')).toBe('es-ES');
  });

  it('has none for Latin, and names the other accents', () => {
    expect(voiceLocale('la')).toBeNull();
    expect(otherLocales('pt', 'br')).toEqual(['pt-PT']);
    expect(accentName('es-MX')).toBe('Spanish as spoken in Mexico');
  });
});

describe('device voices', () => {
  const voices = [
    { name: 'Microsoft Helena - Spanish (Spain)', voiceURI: 'helena', lang: 'es-ES' },
    { name: 'Google español', voiceURI: 'Google español', lang: 'es-ES' },
    { name: 'Mónica (Premium)', voiceURI: 'com.apple.voice.premium.es-ES.Monica', lang: 'es-ES' },
    { name: 'Paulina (Enhanced)', voiceURI: 'com.apple.voice.enhanced.es-MX.Paulina', lang: 'es_MX' },
    { name: 'Samantha (Premium)', voiceURI: 'com.apple.voice.premium.en-US.Samantha', lang: 'en-US' },
  ];

  it('takes the best voice for exactly that locale', () => {
    expect(pickDeviceVoice(voices, 'es-ES')?.name).toBe('Mónica (Premium)');
    expect(pickDeviceVoice(voices, 'es-MX')?.name).toBe('Paulina (Enhanced)');
  });

  it('ranks Edge’s online natural voices first and the robotic ones last, and keeps the learner’s choice', () => {
    const edge = { name: 'Microsoft Elvira Online (Natural) - Spanish (Spain)', voiceURI: 'Microsoft Elvira Online (Natural) - Spanish (Spain)', lang: 'es-ES' };
    expect(voicesForLocale([...voices, edge], 'es-ES').map((v) => v.voiceURI)).toEqual([edge.voiceURI, 'com.apple.voice.premium.es-ES.Monica', 'Google español', 'helena']);
    expect(voiceQuality(edge)).toBe('natural');
    expect(voiceQuality(voices[1])).toBe('good');
    expect(voiceQuality(voices[0])).toBe('robotic');
    expect(pickDeviceVoice(voices, 'es-ES', 'Google español')?.name).toBe('Google español');
    expect(pickDeviceVoice(voices, 'es-ES', 'gone')?.name).toBe('Mónica (Premium)');
  });

  it('takes a robotic voice only as the last resort, and never another accent’s', () => {
    expect(pickDeviceVoice(voices.slice(0, 1), 'es-ES')?.name).toBe('Microsoft Helena - Spanish (Spain)');
    expect(pickDeviceVoice(voices, 'es-AR')).toBeUndefined();
  });
});

describe('Gemini voices', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reads library voices however their fields are cased', () => {
    expect(readVoice({ id: 'v1', display_name: 'Lucía', language_code: 'es-ES', gender: 'female' }, 'es-ES')).toMatchObject({ id: 'v1', name: 'Lucía', locale: 'es-ES' });
    expect(readVoice({ name: 'voices/abc', displayName: 'Mateo', languageCode: 'es-MX' }, 'es-MX')).toMatchObject({ id: 'voices/abc', name: 'Mateo', locale: 'es-MX' });
  });

  it('asks the library by locale, with the key in a header and never in the URL', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ voices: [{ id: 'v1', display_name: 'Lucía' }] })));
    vi.stubGlobal('fetch', fetch);
    const voices = await listVoices(KEY, 'es-ES');
    expect(voices[0].name).toBe('Lucía');
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('language_code=es-ES');
    expect(url).not.toContain(KEY);
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe(KEY);
  });

  it('finds the audio in an answer, in each shape', () => {
    expect(findAudio({ steps: [{ type: 'model_output', content: [{ type: 'text', text: 'hi' }, { type: 'audio', data: 'QUJD' }] }] })).toBe('QUJD');
    expect(findAudio({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/L16', data: 'REVG' } }] } }] })).toBe('REVG');
    expect(findAudio({ steps: [] })).toBeNull();
  });

  it('wraps bare PCM as a WAV file', () => {
    const wav = pcmToWav(new Uint8Array(100));
    expect(String.fromCharCode(...wav.slice(0, 4))).toBe('RIFF');
    expect(new DataView(wav.buffer).getUint32(24, true)).toBe(24_000);
    expect(wav.length).toBe(144);
  });

  it('tries the next model when one isn’t offered, and returns WAV', async () => {
    const pcm = btoa(String.fromCharCode(...new Uint8Array(8)));
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ steps: [{ content: [{ type: 'audio', data: pcm }] }] })));
    vi.stubGlobal('fetch', fetch);
    const blob = await synthesize(KEY, 'v1', 'hola');
    expect(blob.type).toBe('audio/wav');
    expect(blob.size).toBe(52);
    const bodies = fetch.mock.calls.map((c) => JSON.parse((c[1] as RequestInit).body as string) as { model: string; generation_config: unknown });
    expect(bodies.map((b) => b.model)).toEqual(['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts']);
    expect(bodies[0].generation_config).toEqual({ speech_config: [{ voice: 'v1' }] });
  });
});
