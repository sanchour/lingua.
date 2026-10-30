import { describe, expect, it } from 'vitest';
import { convertScript, serbianToCyrillic, serbianToLatin } from './convert';
import { MARKS } from './marks';

describe('script conversion (6-23)', () => {
  it('converts Serbian both ways, digraphs and case included', () => {
    expect(serbianToLatin('Љубав, њушка, џак')).toBe('Ljubav, njuška, džak');
    expect(serbianToLatin('ЉУБАВ')).toBe('LJUBAV');
    expect(serbianToCyrillic('Ljubav, njuška, džak, Šuma')).toBe('Љубав, њушка, џак, Шума');
    expect(serbianToCyrillic(serbianToLatin('Ђорђе и Ћирило'))).toBe('Ђорђе и Ћирило');
  });
  it('converts Chinese character by character and leaves the rest', async () => {
    expect(await convertScript('我们学习汉语 abc 1', 'hans-hant')).toBe('我們學習漢語 abc 1');
    expect(await convertScript('我們學習漢語', 'hant-hans')).toBe('我们学习汉语');
  });
});

describe('marks drills', () => {
  it('every item has a right answer first, a different wrong one, and a reason', () => {
    for (const items of Object.values(MARKS)) for (const it of items) {
      expect(new Set(it.options).size).toBe(it.options.length);
      expect(it.why.length).toBeGreaterThan(10);
    }
  });
});
