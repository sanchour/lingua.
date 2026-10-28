import { describe, expect, it } from 'vitest';
import { handleRequest, parseRequest } from './bridge';

describe('the extension bridge', () => {
  it('accepts well-formed requests and drops the rest', () => {
    expect(parseRequest({ type: 'hello' })).toEqual({ type: 'hello' });
    expect(parseRequest({ type: 'lookup', lang: 'fr', word: 'bonjour' })).toEqual({ type: 'lookup', lang: 'fr', word: 'bonjour' });
    expect(parseRequest({ type: 'lookup', lang: 'fr' })).toBeNull();
    expect(parseRequest({ type: 'lookup', lang: 'fr', word: 'x'.repeat(200) })).toBeNull();
    expect(parseRequest({ type: 'delete-everything' })).toBeNull();
    expect(parseRequest('hello')).toBeNull();
    expect(parseRequest(null)).toBeNull();
  });

  it('keeps only usable caption lines', () => {
    const r = parseRequest({ type: 'captions', youtubeId: 'dQw4w9WgXcQ', lang: 'fr', cues: [{ startMs: 0, endMs: 1, text: 'a' }, { startMs: 'x' }, null] });
    expect(r).toEqual({ type: 'captions', youtubeId: 'dQw4w9WgXcQ', lang: 'fr', cues: [{ startMs: 0, endMs: 1, text: 'a' }] });
  });

  it('tells the extension which language is being learned', async () => {
    expect(await handleRequest({ type: 'hello' }, 'es')).toEqual({ ok: true, lang: 'es', gloss: 'en' });
  });
});
