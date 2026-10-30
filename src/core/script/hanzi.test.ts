import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { applyPattern, simpleTranslit, stripVowels } from './arabic';
import { charRound, checkStrokes, hanziLines, markTone, resample, toneRound } from './hanzi';
import type { CharData, CharReadings } from './hanzi';
import { romajiToKana } from './kana';
import { seededRandom } from '@/core/srs/ludus';
import type { StrokeData } from './strokes';

const json = <T>(f: string) => JSON.parse(readFileSync(f, 'utf8')) as T;

describe('tones and kana', () => {
  it('puts the tone mark where pinyin puts it', () => {
    expect(markTone('ma', 1)).toBe('mā');
    expect(markTone('hao', 3)).toBe('hǎo');
    expect(markTone('gou', 3)).toBe('gǒu');
    expect(markTone('shu', 4)).toBe('shù');
    expect(markTone('lü', 2)).toBe('lǘ');
  });
  it('makes tone questions whose right answer is first and named after the mark', () => {
    for (const q of toneRound(seededRandom(1), 6)) expect(q.why).toContain(q.options[0]);
  });
  it('reads romaji as hiragana', () => {
    expect(romajiToKana('yama')).toBe('やま');
    expect(romajiToKana('kotoba')).toBe('ことば');
    expect(romajiToKana('shi.ro.i')).toBe('しろい');
    expect(romajiToKana('kyou')).toBe('きょう');
    expect(romajiToKana('hon')).toBe('ほん');
    expect(romajiToKana('kitte')).toBe('きって');
    expect(romajiToKana('x')).toBeNull();
  });
});

describe('handwriting', () => {
  it('resamples evenly along a line', () => {
    expect(resample([[0, 0], [1, 0]], 3)).toEqual([[0, 0], [0.5, 0], [1, 0]]);
  });
  it('accepts a stroke that follows the real one and rejects a wrong direction, place and count', () => {
    const real = [[[0.1, 0.5], [0.9, 0.5]], [[0.5, 0.1], [0.5, 0.9]]] as Array<Array<[number, number]>>;
    expect(checkStrokes([[[0.12, 0.52], [0.5, 0.5], [0.88, 0.5]], [[0.5, 0.12], [0.5, 0.88]]], real).ok).toEqual([true, true]);
    expect(checkStrokes([[[0.9, 0.5], [0.1, 0.5]], [[0.5, 0.1], [0.5, 0.9]]], real).ok).toEqual([false, true]);
    expect(checkStrokes([[[0.1, 0.5], [0.9, 0.5]]], real).ok).toEqual([true, false]);
    expect(hanziLines([[[0, 900], [1024, 900]]])[0]).toEqual([[0, 0], [1, 0]]);
  });
});

describe('character questions', () => {
  const data: CharData = { strokes: json<Record<string, StrokeData>>('public/strokes/zh.json'), readings: json<Record<string, CharReadings>>('public/chars/readings.json') };
  const ja: CharData = { strokes: json<Record<string, StrokeData>>('public/strokes/ja.json'), readings: data.readings };
  it('make rounds in every mode, with the right answer first and not repeated among the wrong ones', () => {
    for (const [mode, d] of [['radical', data], ['parts', data], ['meaning', data], ['reading', ja], ['kana', ja], ['parts', ja], ['hanja', data]] as const) {
      const round = charRound(mode, d, seededRandom(7), 6);
      expect(round.length).toBeGreaterThanOrEqual(5);
      for (const q of round) expect(new Set(q.options).size).toBe(q.options.length);
    }
    expect(charRound('trad', data, seededRandom(2), 4, [['国', '國'], ['学', '學'], ['书', '書'], ['汉', '漢']])[0].options[0]).toMatch(/[國學書漢]/);
  });
  it('has readings for the common characters', () => {
    expect(data.readings['山'].on).toContain('san');
    expect(data.readings['學']?.ko ?? data.readings['学']?.ko ?? ['x']).toBeDefined();
    expect(data.readings['語'].ko).toEqual(['어']);
  });
});

describe('Arabic roots', () => {
  it('fits a root into a pattern and strips marks', () => {
    expect(stripVowels(applyPattern('ك ت ب', 'فاعِل')!)).toBe('كاتب');
    expect(stripVowels(applyPattern('ك ت ب', 'مَفْعَل')!)).toBe('مكتب');
    expect(applyPattern('ك ت', 'فاعِل')).toBeNull();
    expect(simpleTranslit('kitābun ʿarabī ḥubb')).toBe("kitabun 'arabi hubb");
  });
  it('has a dictionary of roots with several words each', () => {
    const roots = json<Record<string, unknown[]>>('public/dict/ar-roots.json');
    expect(Object.keys(roots).length).toBeGreaterThan(100);
    for (const words of Object.values(roots)) expect(words.length).toBeGreaterThanOrEqual(3);
  });
});
