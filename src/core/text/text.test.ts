import { describe, expect, it } from 'vitest';
import { foldKey, normalizeWord } from './normalize';
import { sentenceAt, sentencesOf, tokenize } from './tokenizer';

describe('normalizeWord', () => {
  it('strips Russian stress marks but keeps й and ё', () => {
    expect(normalizeWord('Чита́ть', 'ru')).toBe('читать');
    expect(normalizeWord('мо́й', 'ru')).toBe('мой');
    expect(normalizeWord('Всё', 'ru')).toBe('всё');
    expect(normalizeWord('всё', 'ru')).not.toBe(normalizeWord('все', 'ru'));
  });

  it('keeps Greek tonos and applies final sigma', () => {
    expect(normalizeWord('Πότε', 'el')).toBe('πότε');
    expect(normalizeWord('ποτέ', 'el')).toBe('ποτέ');
    // ΟΔΟΣ → οδος with a final ς (U+03C2), not a medial σ (U+03C3)
    expect(normalizeWord('ΟΔΟΣ', 'el')).toBe('οδος');
  });

  it('unifies apostrophes and uses locale casing', () => {
    expect(normalizeWord('L’Homme', 'fr')).toBe("l'homme");
    expect(normalizeWord('İSTANBUL', 'tr')).toBe('istanbul');
  });
});

describe('foldKey', () => {
  it('matches Greek ALL-CAPS text without tonos', () => {
    expect(foldKey('ΚΑΛΗΜΕΡΑ', 'el')).toBe(foldKey('καλημέρα', 'el'));
  });
  it('matches Russian е/ё spellings', () => {
    expect(foldKey('ещё', 'ru')).toBe(foldKey('еще', 'ru'));
  });
});

describe('tokenize', () => {
  const words = (text: string, lang: string) => tokenize(text, lang).filter((t) => t.isWord).map((t) => t.norm);

  it('splits Russian and keeps stressed words whole', () => {
    expect(words('Я́ люблю́ чита́ть кни́ги.', 'ru')).toEqual(['я', 'люблю', 'читать', 'книги']);
  });

  it('splits Greek, including the Greek question mark', () => {
    expect(words('Τι κάνεις; Καλά, ευχαριστώ!', 'el')).toEqual(['τι', 'κάνεις', 'καλά', 'ευχαριστώ']);
  });

  it('marks punctuation, spaces and numbers as non-words and keeps offsets', () => {
    const tokens = tokenize('Glad, 2 cats.', 'en');
    expect(tokens.filter((t) => t.isWord).map((t) => t.text)).toEqual(['Glad', 'cats']);
    expect(tokens.map((t) => t.text).join('')).toBe('Glad, 2 cats.');
    const cats = tokens.find((t) => t.text === 'cats')!;
    expect('Glad, 2 cats.'.slice(cats.start, cats.start + 4)).toBe('cats');
  });
});

describe('sentencesOf', () => {
  it('splits a text into the same sentences sentenceAt gives, for translating ahead', () => {
    const text = 'Cada tarde, Ana abre un libro. Algunas palabras son nuevas.  ¿Y qué?';
    const all = sentencesOf(text, 'es');
    expect(all).toEqual(['Cada tarde, Ana abre un libro.', 'Algunas palabras son nuevas.', '¿Y qué?']);
    expect(all[1]).toBe(sentenceAt(text, text.indexOf('palabras'), 'es'));
  });
});
