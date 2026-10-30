import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isKanji, medianLength, medianPath, strokeCount } from './strokes';
import type { HanziStrokes, KanjiStrokes } from './strokes';

describe('stroke data (6-23)', () => {
  const data = JSON.parse(readFileSync('public/strokes/zh.json', 'utf8')) as Record<string, HanziStrokes>;
  it('measures and draws a centre line', () => {
    expect(medianLength([[0, 0], [3, 4], [3, 10]])).toBe(11);
    expect(medianPath([[1, 2], [3, 4]])).toBe('M 1 2 L 3 4');
  });
  it('has an outline and a centre line for every stroke, and the strokes of well-known characters', () => {
    for (const [c, d] of Object.entries(data)) expect([c, d.s.length]).toEqual([c, d.m.length]);
    expect(data['一'].s).toHaveLength(1);
    expect(data['好'].s).toHaveLength(6);
    expect(data['好'].c).toBe('女子');
  });
  it('holds the Mandarin alphabet’s own characters', () => {
    for (const c of '一二三人大小口日月山水火木中上下') expect(data[c]).toBeDefined();
  });

  it('holds Japanese kanji with their strokes and parts', () => {
    const ja = JSON.parse(readFileSync('public/strokes/ja.json', 'utf8')) as Record<string, KanjiStrokes>;
    expect(ja['日'].p).toHaveLength(4);
    expect(ja['語'].p).toHaveLength(14);
    expect(ja['好'].c).toBe('女子');
    expect(isKanji(ja['日'])).toBe(true);
    expect(strokeCount(ja['日'])).toBe(4);
    expect(isKanji(data['日'])).toBe(false);
  });
});
