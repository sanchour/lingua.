import { describe, expect, it } from 'vitest';
import { cacheKey, labelFor, levelReport, readGenerated, readSentences, readStory, readWordlist, textOf, unknownWords, wordsOf } from './generate';

describe('reading what the model answered', () => {
  it('accepts a story only with its title, text and translation', () => {
    expect(readStory({ title: 'Le chat', text: 'Le chat dort.', translation: 'The cat sleeps.' })).toEqual({ title: 'Le chat', text: 'Le chat dort.', translation: 'The cat sleeps.' });
    expect(readStory({ title: 'Le chat', text: 'Le chat dort.' })).toBeNull();
    expect(readStory({ title: '', text: 'x', translation: 'y' })).toBeNull();
    expect(readStory({ title: 't', text: 5, translation: 'y' })).toBeNull();
    expect(readStory(null)).toBeNull();
    expect(readStory('a story')).toBeNull();
  });

  it('accepts sentences when at least three have both halves, and drops the rest', () => {
    const ok = { sentences: [{ text: 'Uno.', translation: 'One.' }, { text: 'Dos.', translation: 'Two.' }, { text: 'Tres.', translation: 'Three.' }, { text: 'Cuatro.' }, 7] };
    expect(readSentences(ok)?.sentences).toHaveLength(3);
    expect(readSentences({ sentences: [{ text: 'Uno.', translation: 'One.' }] })).toBeNull();
    expect(readSentences({ sentences: 'none' })).toBeNull();
    expect(readGenerated('sentences', ok)).not.toBeNull();
    expect(readGenerated('story', ok)).toBeNull();
  });

  it('reads the text of either kind', () => {
    expect(textOf('story', { title: 't', text: 'Hola.', translation: 'Hi.' })).toBe('Hola.');
    expect(textOf('sentences', { sentences: [{ text: 'A.', translation: 'a' }, { text: 'B.', translation: 'b' }] })).toBe('A.\nB.');
  });
});

describe('the words of a text', () => {
  it('counts each form, in the dictionary’s spelling, without numbers or punctuation', () => {
    const words = wordsOf('El gato ve al gato. ¡Son 3 gatos!', 'es');
    expect(words.get('gato')).toBe(2);
    expect(words.get('el')).toBe(1);
    expect(words.has('3')).toBe(false);
    expect(words.has('!')).toBe(false);
  });

  it('flags the forms the dictionary does not know', () => {
    const words = wordsOf('El gato de Zorglub', 'es');
    expect(unknownWords(words, new Set(['el', 'gato', 'de']))).toEqual(['zorglub']);
  });
});

describe('how far a text goes beyond its level', () => {
  const words = new Map([['casa', 4], ['perro', 3], ['efímero', 1], ['zorglub', 2]]);
  const ranks = new Map([['casa', 120], ['perro', 900], ['efímero', 9000]]);

  it('is the share of the running words rarer than the level; names with no rank are left out', () => {
    const a2 = levelReport(words, ranks, 'A2');
    // casa (A1) and perro (A2) are at the level, efímero (C1) is beyond; zorglub has no rank.
    expect(a2).toEqual({ beyond: 1 / 8, hard: ['efímero'], unranked: 2 });
    expect(levelReport(words, ranks, 'A1').hard).toEqual(['perro', 'efímero'].sort((a, b) => (words.get(b) ?? 0) - (words.get(a) ?? 0)));
    expect(levelReport(words, ranks, 'C1').beyond).toBe(0);
    expect(levelReport(new Map(), ranks, 'A2').beyond).toBe(0);
  });
});

describe('the cache key and the label', () => {
  const req = { lang: 'fr', kind: 'story', level: 'A2', topic: ' Le Marché ' } as const;

  it('is the same for the same request whatever the case or spacing of the topic, and differs when anything else does', () => {
    expect(cacheKey(req)).toBe(cacheKey({ ...req, topic: 'le marché' }));
    expect(cacheKey(req)).not.toBe(cacheKey({ ...req, level: 'B1' }));
    expect(cacheKey(req)).not.toBe(cacheKey({ ...req, lang: 'es' }));
    expect(cacheKey(req)).not.toBe(cacheKey({ ...req, kind: 'sentences' }));
    expect(cacheKey(req)).not.toBe(cacheKey({ ...req, native: 'de' }));
  });

  it('says only what was checked', () => {
    expect(labelFor({ checks: ['schema', 'dictionary', 'level'], unknownWords: [], level: 'A2' })).toEqual({
      text: 'Generated',
      detail: 'Made by AI. built to a fixed shape · every word is in the dictionary · checked at A2.',
    });
    expect(labelFor({ checks: ['schema', 'dictionary'], unknownWords: ['zorglub', 'x'], level: 'A2' }).detail).toBe('Made by AI. built to a fixed shape · 2 words the dictionary doesn’t know · level not confirmed.');
    expect(labelFor({ checks: ['schema'], level: 'A2' }).detail).toBe('Made by AI. built to a fixed shape · words not checked · level not confirmed.');
  });
});

describe('dialogues and made-to-order rewrites', () => {
  const line = (speaker: string, text: string) => ({ speaker, text, translation: 't' });

  it('accepts a dialogue of four lines or more between two people', () => {
    const ok = { title: 'Au café', lines: [line('Ana', 'Bonjour.'), line('Luc', 'Salut.'), line('Ana', 'Un café ?'), line('Luc', 'Oui.')] };
    expect(readGenerated('dialogue', ok)).toMatchObject({ title: 'Au café' });
    expect(readGenerated('dialogue', { lines: ok.lines.slice(0, 3) })).toBeNull();
    expect(readGenerated('dialogue', { lines: [...ok.lines, line('Zoé', 'Moi aussi.')] })).toBeNull();
    expect(readGenerated('dialogue', { lines: 'none' })).toBeNull();
    expect(textOf('dialogue', readGenerated('dialogue', ok)!)).toBe('Bonjour.\nSalut.\nUn café ?\nOui.');
  });

  it('accepts rewrites with the right number of sentences to start from, never one that answers itself', () => {
    const one = { items: [{ given: ['El perro come.'], answer: '¿Come el perro?' }, { given: ['Ella canta.'], answer: '¿Canta ella?' }, { given: ['Ellos van.'], answer: '¿Van ellos?' }] };
    expect((readGenerated('rewrites', one, 'question') as { items: unknown[] }).items).toHaveLength(3);
    // A task is needed, "combine" needs two sentences, the others one.
    expect(readGenerated('rewrites', one)).toBeNull();
    expect(readGenerated('rewrites', one, 'combine')).toBeNull();
    expect(readGenerated('rewrites', { items: one.items.map((i) => ({ given: [i.given[0], 'Y.'], answer: i.answer })) }, 'combine')).not.toBeNull();
    expect(readGenerated('rewrites', { items: [{ given: ['A b c.'], answer: 'A b c.' }, ...one.items.slice(0, 2)] }, 'question')).toBeNull();
  });

  it('keeps the tasks apart in the cache', () => {
    const base = { lang: 'es', kind: 'rewrites', level: 'A2' } as const;
    expect(cacheKey({ ...base, task: 'passive' })).not.toBe(cacheKey({ ...base, task: 'question' }));
    expect(cacheKey({ ...base, task: 'passive' })).toBe(cacheKey({ ...base, task: 'passive' }));
  });
});

describe('a word list', () => {
  const w = (term: string) => ({ term, meaning: `the ${term}`, example: `Je vois ${term}.` });
  it('needs five different words, each with a meaning; doubles and half-made ones are left out', () => {
    expect(readWordlist({ words: ['pain', 'lait', 'sel', 'riz', 'thé'].map(w) })?.words).toHaveLength(5);
    expect(readWordlist({ words: ['pain', 'Pain', 'lait', 'sel', 'riz', 'thé'].map(w) })?.words.map((x) => x.term)).toEqual(['pain', 'lait', 'sel', 'riz', 'thé']);
    expect(readWordlist({ words: [...['pain', 'lait', 'sel', 'riz'].map(w), { term: 'thé', meaning: '' }] })).toBeNull();
    expect(readGenerated('wordlist', { words: [] })).toBeNull();
  });
  it('has its words and sentences as the text that is measured', () => {
    const body = readWordlist({ words: ['pain', 'lait', 'sel', 'riz', 'thé'].map(w) })!;
    expect(textOf('wordlist', body)).toContain('pain Je vois pain.');
  });
});
