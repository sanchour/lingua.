import { describe, expect, it } from 'vitest';
import ar from './data/ar.json';
import ru from './data/ru.json';
import fr from './data/fr.json';
import zh from './data/zh.json';
import { fingerFor, keysFor, LANG_LAYOUT, pressKey } from './layouts';
import { candidates, DEFAULT_TARGET, focusLetter, letterReady, lineOfSyllables, lineOfWords, MIN_HITS, nextUnlock, recordPress, seeded, START_LETTERS, trigrams, unlockedLetters, wpmOf } from './lesson';
import type { TypingProgress } from './lesson';
import type { TypingData } from './types';

const RU = ru as TypingData;
const fresh = (): TypingProgress => ({ unlocked: START_LETTERS, stats: {}, target: DEFAULT_TARGET });

describe('the letters, most common first', () => {
  it('starts Russian and Arabic with their commonest letters', () => {
    expect(unlockedLetters(RU, fresh()).sort()).toEqual(['а', 'е', 'и', 'н', 'о', 'т']);
    expect(unlockedLetters(ar as TypingData, fresh())).toContain('ا');
    expect(unlockedLetters(ar as TypingData, fresh())).toContain('ل');
  });

  it('keeps each language to its own letters', () => {
    expect((fr as TypingData).letters.map(([c]) => c)).toContain('é');
    expect(RU.letters.every(([c]) => /[а-яё]/.test(c))).toBe(true);
    expect((zh as unknown as TypingData).letters.every(([c]) => /[a-zü]/.test(c))).toBe(true);
  });
});

describe('words to type', () => {
  it('uses only the unlocked letters, real words and made-up ones', () => {
    const model = trigrams(RU.words);
    const p = fresh();
    const letters = unlockedLetters(RU, p);
    for (let seed = 1; seed < 40; seed++) {
      const line = lineOfWords(RU, model, letters, focusLetter(RU, p), 12, seeded(seed));
      expect(line.length).toBe(12);
      for (const w of line) expect([...w].every((c) => letters.includes(c))).toBe(true);
    }
  });

  it('puts the focus letter in about half the words', () => {
    const letters = unlockedLetters(RU, { ...fresh(), unlocked: 10 });
    const line = lineOfWords(RU, trigrams(RU.words), letters, 'р', 20, seeded(7));
    expect(line.filter((w) => w.includes('р')).length).toBeGreaterThanOrEqual(8);
  });

  it('gives Mandarin syllables with their characters, and characters for a syllable', () => {
    const data = zh as unknown as TypingData;
    const letters = unlockedLetters(data, { ...fresh(), unlocked: 12 });
    const line = lineOfSyllables(data, letters, letters[0], 10, seeded(3));
    expect(line.length).toBe(10);
    for (const { text, hint } of line) {
      expect([...text].every((c) => letters.includes(c))).toBe(true);
      expect(hint).toMatch(/\p{Script=Han}/u);
    }
    expect(candidates(data, 'shi')).toContain('是');
    expect(candidates(data, 'shi').length).toBeLessThanOrEqual(5);
  });
});

describe('unlocking the next letter', () => {
  it('waits until every letter is fast and accurate enough', () => {
    const p = fresh();
    expect(nextUnlock(RU, p)).toBeNull();
    const fast = 12_000 / (DEFAULT_TARGET + 5);
    for (const c of unlockedLetters(RU, p)) {
      let s = undefined;
      for (let i = 0; i < MIN_HITS; i++) s = recordPress(s, true, fast);
      p.stats[c] = s!;
    }
    // The seventh letter joins once all six are at the target speed.
    expect(nextUnlock(RU, p)).toBe(RU.letters[6][0]);
    p.stats[RU.letters[0][0]] = recordPress(recordPress(p.stats[RU.letters[0][0]], false, null), false, null);
    expect(letterReady(p.stats[RU.letters[0][0]], DEFAULT_TARGET)).toBe(false);
    expect(nextUnlock(RU, p)).toBeNull();
    expect(focusLetter(RU, p)).toBe(RU.letters[0][0]);
  });

  it('counts speed from the time between presses', () => {
    expect(Math.round(wpmOf(400))).toBe(30);
    expect(recordPress(undefined, true, 5000).ms).toBe(0);
  });
});

describe('the keyboard', () => {
  it('types Russian on an English keyboard without installing anything', () => {
    expect(pressKey('jcuken', 'KeyJ', false, null).char).toBe('о');
    expect(pressKey('jcuken', 'KeyT', false, null).char).toBe('е');
    expect(keysFor('jcuken', 'н')).toEqual([{ code: 'KeyY', shift: false }]);
    expect(LANG_LAYOUT.ru).toBe('jcuken');
  });

  it('has the dead keys of AZERTY and the Spanish layout', () => {
    const d = pressKey('azerty', 'BracketLeft', false, null);
    expect(d).toEqual({ dead: '^' });
    expect(pressKey('azerty', 'KeyE', false, d.dead).char).toBe('ê');
    expect(pressKey('azerty', 'Digit2', false, null).char).toBe('é');
    expect(keysFor('es', 'á')).toEqual([{ code: 'Quote', shift: false }, { code: 'KeyA', shift: false }]);
    expect(keysFor('qwertz', 'z')).toEqual([{ code: 'KeyY', shift: false }]);
    expect(pressKey('arabic', 'KeyH', false, null).char).toBe('ا');
    expect(pressKey('pinyin', 'KeyV', false, null).char).toBe('ü');
  });

  it('knows each key’s finger', () => {
    expect(fingerFor('KeyF')).toBe('left index');
    expect(fingerFor('KeyJ')).toBe('right index');
    expect(fingerFor('Digit1')).toBe('left pinky');
    expect(fingerFor('KeyZ')).toBe('left pinky');
    expect(fingerFor('Space')).toBe('thumb');
  });
});
