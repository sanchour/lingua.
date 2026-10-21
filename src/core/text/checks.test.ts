import { describe, expect, it } from 'vitest';
import { makeChecks } from './checks';
import { tokenize } from './tokenizer';

const TEXT = [
  'Cada tarde, Ana abre un libro y lee una página. Algunas palabras son nuevas, y eso está bien.',
  'Poco a poco, las páginas se vuelven más fáciles. Un día se da cuenta de que lo entiende casi todo.',
  'Leer un poco cada día es como caminar: cada paso te lleva más lejos.',
  'Hoy lee con su hermana.',
];
const GLOSSES: Record<string, string> = {
  tarde: 'afternoon', libro: 'book', página: 'page', palabras: 'words', nuevas: 'new', páginas: 'pages', vuelven: 'they become',
  fáciles: 'easy', cuenta: 'account', entiende: 'understands', todo: 'everything', leer: 'to read', caminar: 'to walk', paso: 'step',
  lleva: 'carries', lejos: 'far', bien: 'well',
};

/** A fixed sequence instead of Math.random, so the questions are the same each run. */
function seeded(seed = 7) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

describe('Check yourself', () => {
  const blocks = TEXT.map((text) => ({ text, tokens: tokenize(text, 'es') }));
  const checks = makeChecks({ lang: 'es', blocks, gloss: (n) => GLOSSES[n], state: (n) => (n === 'libro' ? 2 : 0), random: seeded() });

  it('makes gaps, meanings and an order question from the text', () => {
    expect(checks.map((c) => c.kind)).toEqual(['gap', 'gap', 'meaning', 'meaning', 'order']);
  });

  it('asks about Learning words first, and every answer is among its options', () => {
    expect(checks.some((c) => c.kind !== 'order' && c.answer === 'libro')).toBe(true);
    for (const c of checks) {
      if (c.kind === 'order') expect([...c.shuffled].sort()).toEqual([...c.answer].sort());
      else expect(c.options).toContain(c.answer);
    }
  });

  it('gives no answer away by a capital letter', () => {
    for (const c of checks) if (c.kind !== 'order') expect(c.options.filter((o) => /^\p{Lu}/u.test(o))).toEqual([]);
  });

  it('cuts the gap out of the sentence exactly', () => {
    const gap = checks.find((c) => c.kind === 'gap')!;
    if (gap.kind !== 'gap') throw new Error('no gap');
    expect(TEXT.join(' ')).toContain(`${gap.before}${gap.answer}${gap.after}`);
  });

  it('asks nothing of a text too short to ask about', () => {
    expect(makeChecks({ lang: 'es', blocks: [{ text: 'Hola.', tokens: tokenize('Hola.', 'es') }], gloss: () => 'hello', state: () => 0 })).toEqual([]);
  });
});
