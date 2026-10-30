import { describe, expect, it } from 'vitest';
import { beatsOf, nPVI, strongestWord, syllablesIn } from './rhythm';

const RATE = 16000;
/** Bursts of a tone, one per syllable: [start ms, loudness, hz]. */
function speech(bursts: Array<[number, number, number?]>, totalMs = 2000): Float32Array {
  const out = new Float32Array((RATE * totalMs) / 1000);
  for (const [at, amp, hz = 150] of bursts) {
    const n = Math.floor(RATE * 0.12);
    for (let i = 0; i < n; i++) out[Math.floor((RATE * at) / 1000) + i] += amp * Math.sin(Math.PI * (i / n)) ** 2 * Math.sin((2 * Math.PI * hz * i) / RATE);
  }
  return out;
}

describe('beatsOf', () => {
  it('finds one beat for each burst, in place', () => {
    const b = beatsOf(speech([[100, 0.5], [350, 0.5], [600, 0.5], [850, 0.5]]), RATE);
    expect(b).toHaveLength(4);
    expect(b[1].ms).toBeGreaterThan(380);
    expect(b[1].ms).toBeLessThan(440);
  });
  it('ignores near-silence, and gives nothing for silence', () => {
    expect(beatsOf(speech([[100, 0.5], [350, 0.03], [600, 0.5]]), RATE)).toHaveLength(2);
    expect(beatsOf(new Float32Array(16000), RATE)).toEqual([]);
  });
});

describe('nPVI', () => {
  it('is low for even beats and high where long and short alternate', () => {
    const at = (...ms: number[]) => ms.map((m) => ({ ms: m, level: 1, hz: null }));
    expect(nPVI(at(0, 250, 500, 750, 1000))).toBeCloseTo(0);
    expect(nPVI(at(0, 100, 400, 500, 800))!).toBeGreaterThan(60);
    expect(nPVI(at(0, 250, 500))).toBeNull();
  });
});

describe('syllablesIn', () => {
  it('counts by each language’s spelling', () => {
    expect(syllablesIn('compró', 'es')).toBe(2);
    expect(syllablesIn('Juan', 'es')).toBe(1);
    expect(syllablesIn('ayer', 'es')).toBe(2);
    expect(syllablesIn('país', 'es')).toBe(2);
    expect(syllablesIn('que', 'es')).toBe(1);
    expect(syllablesIn('Anne', 'fr')).toBe(1);
    expect(syllablesIn('arrivée', 'fr')).toBe(3);
    expect(syllablesIn('gestern', 'de')).toBe(2);
    expect(syllablesIn('Павел', 'ru')).toBe(2);
    expect(syllablesIn('小王', 'zh')).toBe(2);
    expect(syllablesIn('أحمد', 'ar')).toBeNull();
  });
});

describe('strongestWord', () => {
  // "Juan compró el pan": four words, five syllables (Juan, com-pró, el, pan).
  const words = ['Juan', 'compró', 'el', 'pan'];
  it('finds the word that carries the loudest, highest syllable', () => {
    const loudFirst = beatsOf(speech([[100, 0.9, 220], [350, 0.4], [600, 0.4], [850, 0.3], [1100, 0.3]]), RATE, []);
    expect(strongestWord(words, 'es', loudFirst)).toBe(0);
    const loudLast = beatsOf(speech([[100, 0.3], [350, 0.3], [600, 0.4], [850, 0.3], [1100, 0.9]]), RATE, []);
    expect(strongestWord(words, 'es', loudLast)).toBe(3);
  });
  it('does not guess when the beats do not fit the sentence or the language cannot be counted', () => {
    const two = beatsOf(speech([[100, 0.5], [350, 0.9]]), RATE, []);
    expect(strongestWord(words, 'es', two)).toBeNull();
    expect(strongestWord(['أحمد'], 'ar', two)).toBeNull();
  });
});
