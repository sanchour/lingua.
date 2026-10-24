import { describe, expect, it } from 'vitest';
import type { PackFile, PackLemma, PackParadigm } from '../packs/format';
import { irregularVerbs, looksAlike, lookalikes, shortGloss } from './computedDecks';

type Part = Pick<PackFile, 'lang' | 'lemmas' | 'lemmaFreq' | 'paradigms' | 'forms'>;
const verb = (key: string, gloss: string): PackLemma => [key, '', '', '', [['verb', [gloss]]]];
const table = (i: number, forms: string[]): PackParadigm => [i, 'verb', forms.map((f, n) => [f, n])];

describe('decks worked out from a pack (5.1-3b)', () => {
  it('finds the verbs whose forms leave the regular stem', () => {
    const many = Array.from({ length: 8 }, (_, n) => verb(`irr${n}ar`, `to do ${n}`));
    const pack: Part = {
      lang: 'es',
      lemmas: [verb('hablar', 'to speak'), verb('ser', 'to be (essentially)'), verb('tener', 'to have'), verb('comer', 'to eat'), ...many],
      lemmaFreq: [1, 0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      paradigms: [
        table(0, ['hablar', 'hablando', 'hablado', 'hablo', 'hablas', 'habla', 'hablé']),
        table(1, ['ser', 'siendo', 'sido', 'soy', 'eres', 'es', 'fui']),
        table(2, ['tener', 'teniendo', 'tenido', 'tengo', 'tienes', 'tiene', 'tuve']),
        table(3, ['comer', 'comiendo', 'comido', 'como', 'comes', 'come', 'comí']),
        ...many.map((_, n) => table(4 + n, [`irr${n}ar`, 'xa', 'xb', 'xc', 'xd', 'xe'])),
      ],
      forms: [],
    };
    const out = irregularVerbs(pack);
    // In frequency order, regular hablar and comer left out, meanings kept short.
    expect(out.slice(0, 2)).toEqual([
      ['ser', 'to be', 'verb', ''],
      ['tener', 'to have', 'verb', ''],
    ]);
    expect(out.map((r) => r[0])).not.toContain('hablar');
    expect(out.map((r) => r[0])).not.toContain('comer');
    // Too few to be worth a deck, and a language that doesn't study them: none.
    expect(irregularVerbs({ ...pack, lemmaFreq: [1, 2] })).toEqual([]);
    expect(irregularVerbs({ ...pack, lang: 'id' })).toEqual([]);
  });

  it('reads French tables that give the reflexive beside the plain form', () => {
    const lemmas = Array.from({ length: 8 }, (_, n) => verb(n ? `v${n}re` : 'être', 'to be'));
    const pack: Part = {
      lang: 'fr',
      lemmas,
      lemmaFreq: lemmas.map((_, i) => i),
      paradigms: lemmas.map((l, i) => table(i, [`${l[0]} / s'${l[0]}`, 'été', 'suis / me suis', 'es / t’es', 'est / s’est', 'sommes / nous sommes'])),
      forms: [],
    };
    expect(irregularVerbs(pack)[0][0]).toBe('être');
  });

  it('says which words look like English', () => {
    expect(looksAlike('telefono', 'telephone')).toBe(true);
    expect(looksAlike('familie', 'family')).toBe(true);
    expect(looksAlike('importante', 'important')).toBe(true);
    expect(looksAlike('wasser', 'water')).toBe(true);
    expect(looksAlike('mesa', 'table')).toBe(false);
    expect(looksAlike('perro', 'dog')).toBe(false);
    expect(looksAlike('sopa', 'soap')).toBe(false);
  });

  it('collects look-alikes by their first meaning, Russian in Latin letters, shared spellings left out', () => {
    const noun = (key: string, glosses: string[], pos = 'noun'): PackLemma => [key, '', '', 'm', [[pos, glosses]]];
    const fill = Array.from({ length: 12 }, (_, n) => noun(`problema${'x'.repeat(n)}`, [`problem${'x'.repeat(n)}`]));
    const pack: Part = {
      lang: 'ru',
      lemmas: [noun('телефон', ['telephone (device)']), noun('собака', ['dog']), noun('смог', ['smog']), noun('мы', ['we'], 'pron'), ...fill],
      lemmaFreq: Array.from({ length: 16 }, (_, i) => i),
      paradigms: [],
      forms: [['смог', [2, 99], 'could', '']],
    };
    const out = lookalikes(pack);
    expect(out[0]).toEqual(['телефон', 'telephone', 'noun', 'm']);
    expect(out.map((r) => r[0])).not.toContain('собака');
    expect(out.map((r) => r[0])).not.toContain('смог');
    expect(lookalikes({ ...pack, lang: 'en' })).toEqual([]);
  });

  it('keeps a meaning to its first two senses', () => {
    expect(shortGloss(['to be (essentially or identified as)', 'to be (in the passive voice sense)', 'to exist; to occur'])).toBe('to be; to exist');
    expect(shortGloss(['to come; to arrive; to orgasm'])).toBe('to come; to arrive');
  });
});
