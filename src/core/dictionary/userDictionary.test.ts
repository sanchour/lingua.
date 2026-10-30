import { describe, expect, it } from 'vitest';
import { compareDictionarySources, parsePersonalDictionary, toFullDictRow } from './userDictionary';
import type { FullDictRow } from './format';

describe('userDictionary (6-22 slice 3.3)', () => {
  it('parses JSON array and object personal dictionaries (F1482)', () => {
    const jsonArr = JSON.stringify([
      {
        word: 'sobremesa',
        pos: 'noun',
        definitions: ['time spent lingering at the table after a meal'],
        examples: [['Hicimos una larga sobremesa.', 'We lingered at the table for a long time.']],
      },
    ]);
    const parsedArr = parsePersonalDictionary(jsonArr, 'es', 'My Spanish Dict');
    expect(parsedArr).toHaveLength(1);
    expect(parsedArr[0].word).toBe('sobremesa');
    expect(parsedArr[0].definitions[0]).toContain('lingering at the table');
    expect(parsedArr[0].examples[0][0]).toBe('Hicimos una larga sobremesa.');

    const jsonObj = JSON.stringify({ madrugar: 'to wake up very early' });
    const parsedObj = parsePersonalDictionary(jsonObj, 'es');
    expect(parsedObj).toHaveLength(1);
    expect(parsedObj[0].word).toBe('madrugar');
    expect(parsedObj[0].definitions).toEqual(['to wake up very early']);
  });

  it('parses Markdown and CSV/TSV personal dictionaries (F1287, F1482)', () => {
    const md = [
      '- **estrenar** (verb): to wear or use something for the first time',
      '- **friolero** (adj): sensitive to the cold',
    ].join('\n');
    const parsedMd = parsePersonalDictionary(md, 'es');
    expect(parsedMd).toHaveLength(2);
    expect(parsedMd[0].word).toBe('estrenar');
    expect(parsedMd[0].pos).toBe('verb');

    const tsv = 'word\tmeaning\tpos\texample\nmerienda\tafternoon snack\tnoun\tTomamos la merienda.';
    const parsedTsv = parsePersonalDictionary(tsv, 'es');
    expect(parsedTsv).toHaveLength(1);
    expect(parsedTsv[0].word).toBe('merienda');
    expect(parsedTsv[0].definitions).toEqual(['afternoon snack']);
    expect(parsedTsv[0].examples[0][0]).toBe('Tomamos la merienda.');
  });

  it('merges a custom dictionary entry into a FullDictRow and compares multiple dictionary sources (F1288, F1289)', () => {
    const custom = parsePersonalDictionary(
      JSON.stringify([{ word: 'casa', pos: 'noun', definitions: ['home, household (my note)'] }]),
      'es',
    )[0];
    const baseRow: FullDictRow = {
      lang: 'es',
      key: 'casa',
      fold: 'casa',
      word: 'casa',
      entries: [{ pos: 'noun', senses: [{ g: ['house, building'] }] }],
      mono: [{ pos: 'sustantivo femenino', defs: ['Edificio para habitar.'] }],
    };

    const merged = toFullDictRow(custom, baseRow);
    expect(merged.entries).toHaveLength(2);
    expect(merged.entries[0].senses[0].g[0]).toBe('home, household (my note)');

    const cards = compareDictionarySources({
      langName: 'Spanish',
      fullRow: merged,
      packEntry: { pack: 'pack-es-1', lemma: 'casa', senses: [{ pos: 'n', glosses: ['house', 'home'] }] },
      customEntries: [custom],
    });
    expect(cards.map((c) => c.id)).toEqual(['bilingual', 'monolingual', 'pack', 'personal']);
  });
});
