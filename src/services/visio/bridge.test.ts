import { describe, expect, it } from 'vitest';
import { db } from '@/data/db';
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

  it('takes a selection sent from a page as a text, and refuses one that is too short or too long', async () => {
    const text = 'Esta es una frase que alguien eligió en una página web para leerla en Lingua.';
    expect(parseRequest({ type: 'text', title: '  Una página  ', text })).toEqual({ type: 'text', title: 'Una página', text });
    expect(parseRequest({ type: 'text', text })).toMatchObject({ title: 'From the web' });
    expect(parseRequest({ type: 'text', text: 'corto' })).toBeNull();
    expect(parseRequest({ type: 'text', text: 'x'.repeat(100_001) })).toBeNull();

    expect(await handleRequest({ type: 'text', title: 'Una página', text }, 'es')).toEqual({ ok: true });
    const saved = await db.texts.filter((t) => t.title === 'Una página').first();
    expect(saved).toMatchObject({ lang: 'es', source: 'paste' });
    expect(await handleRequest({ type: 'text', title: 'x', text }, '')).toEqual({ ok: false, error: 'no-language' });
  });

  it('keeps only usable caption lines', () => {
    const r = parseRequest({ type: 'captions', youtubeId: 'dQw4w9WgXcQ', lang: 'fr', cues: [{ startMs: 0, endMs: 1, text: 'a' }, { startMs: 'x' }, null] });
    expect(r).toEqual({ type: 'captions', youtubeId: 'dQw4w9WgXcQ', lang: 'fr', cues: [{ startMs: 0, endMs: 1, text: 'a' }] });
  });

  it('tells the extension which language is being learned', async () => {
    expect(await handleRequest({ type: 'hello' }, 'es')).toEqual({ ok: true, lang: 'es', gloss: 'en' });
  });
});
