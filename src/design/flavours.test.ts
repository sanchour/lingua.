import { describe, expect, it } from 'vitest';
import { allLeanedAccents, contrast, FLAVOURS, flavourCss, flavourOf, lean, quote, toOklab } from './flavours';

describe('language touches (5.1-4b)', () => {
  it('has one for each core language and none for the rest', () => {
    expect(Object.keys(FLAVOURS).sort()).toEqual(['ar', 'de', 'es', 'fr', 'ru', 'zh']);
    expect(flavourOf('ja')).toBeNull();
    expect(flavourOf(undefined)).toBeNull();
  });

  it('leans the colour but keeps its lightness', () => {
    const before = toOklab('#c86d51');
    const after = toOklab(lean('#c86d51', '#2f6db5', 0.22));
    expect(Math.abs(after[0] - before[0])).toBeLessThan(0.01);
    expect(lean('#c86d51', '#2f6db5', 0)).toBe('#c86d51');
    expect(lean('#c86d51', '#2f6db5', 0.22)).not.toBe('#c86d51');
  });

  it('never makes accent text or fills harder to read, in any palette', () => {
    for (const { before, after } of allLeanedAccents()) {
      expect(contrast(after.text, after.bg)).toBeGreaterThanOrEqual(Math.min(4.5, contrast(before.text, before.bg)) - 1e-9);
      expect(contrast(after.fill, after.on)).toBeGreaterThanOrEqual(Math.min(4.5, contrast(before.fill, before.on)) - 1e-9);
    }
  });

  it('writes a rule per palette for each language that leans', () => {
    const css = flavourCss();
    expect(css).toContain("[data-theme='paper'][data-palette='cream'][data-flavour='fr']");
    expect(css).toContain("[data-theme='nocturne'][data-flavour='zh']{--flavour:");
    expect(css).not.toContain("[data-palette='cream'][data-flavour='de']");
  });

  it('quotes in the language’s own marks', () => {
    expect(quote('fr', 'Bonjour')).toBe('« Bonjour »');
    expect(quote('de', 'Hallo')).toBe('„Hallo“');
    expect(quote('ru', 'Привет')).toBe('«Привет»');
    expect(quote('ja', 'こんにちは')).toBe('「こんにちは」');
    expect(quote('en', 'Hello')).toBe('“Hello”');
    expect(quote(undefined, 'Hello')).toBe('“Hello”');
  });
});
