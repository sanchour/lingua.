import { describe, expect, it } from 'vitest';
import { baseCandidates, compoundHeads } from './inflect';

const has = (word: string, lang: string, base: string) => expect(baseCandidates(word, lang)).toContain(base);

describe('baseCandidates', () => {
  it('takes Hungarian case, possessive and verb endings off', () => {
    has('könyvtárban', 'hu', 'könyvtár');
    has('házaimban', 'hu', 'ház');
    has('almát', 'hu', 'alma');
    has('kézzel', 'hu', 'kéz');
    has('olvasunk', 'hu', 'olvas');
    has('olvastam', 'hu', 'olvas');
  });

  it('finds Swedish words under their definite and plural endings', () => {
    has('bilarna', 'sv', 'bil');
    has('flickorna', 'sv', 'flick');
    has('huset', 'sv', 'hus');
    has('pojken', 'sv', 'pojk');
    has('pojken', 'sv', 'pojke');
  });

  it('takes the pronouns off Spanish and Italian verbs', () => {
    has('dímelo', 'es', 'di');
    has('cómpralo', 'es', 'compra');
    has('hacerlo', 'es', 'hacer');
    has('diciéndome', 'es', 'diciendo');
    has('farlo', 'it', 'fare');
    has('dirmi', 'it', 'dire');
  });

  it('reads Portuguese hyphenated pronouns and plurals', () => {
    has('disse-me', 'pt', 'disse');
    has('fazê-lo', 'pt', 'fazer');
    has('canções', 'pt', 'canção');
    has('casinha', 'pt', 'casa');
  });

  it('never offers the word itself and stays empty where packs list everything', () => {
    expect(baseCandidates('bilarna', 'sv')).not.toContain('bilarna');
    expect(baseCandidates('читали', 'ru')).toEqual([]);
  });
});

describe('compoundHeads', () => {
  it('offers the ends of German and Swedish compounds, longest first', () => {
    const heads = compoundHeads('Kinderzimmerlampe', 'de');
    expect(heads[0]).toBe('derzimmerlampe');
    expect(heads).toContain('zimmerlampe');
    expect(heads).toContain('lampe');
    expect(heads.indexOf('zimmerlampe')).toBeLessThan(heads.indexOf('lampe'));
    expect(compoundHeads('hus', 'sv')).toEqual([]);
    expect(compoundHeads('perro', 'es')).toEqual([]);
  });
});
