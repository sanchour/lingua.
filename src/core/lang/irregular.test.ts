import { describe, expect, it } from 'vitest';
import { irregularRows, regularSpanish } from './irregular';
import type { FormTable } from './paradigm';

const table = (title: string, forms: string[]): FormTable => ({ title, rows: forms.map((f, i) => ({ label: String(i), cells: [f] })) });

describe('irregular Spanish verbs', () => {
  it('knows the regular forms of a plain verb and none for a reflexive one', () => {
    expect(regularSpanish('hablar')?.[0]).toEqual(['hablo', 'hablas', 'habla', 'hablamos', 'habláis', 'hablan']);
    expect(regularSpanish('comer')?.[3]).toEqual(['comeré', 'comerás', 'comerá', 'comeremos', 'comeréis', 'comerán']);
    expect(regularSpanish('lavarse')).toBeNull();
  });
  it('flags the forms that are not the regular ones, in the tense the table’s title names', () => {
    const tener = table('Present', ['tengo', 'tienes', 'tiene', 'tenemos', 'tenéis', 'tienen']);
    expect([...(irregularRows('es', 'tener', [tener]).get('Present') ?? [])]).toEqual([0, 1, 2, 5]);
    const preterite = table('Preterite', ['tuve', 'tuviste', 'tuvo', 'tuvimos', 'tuvisteis', 'tuvieron']);
    expect(irregularRows('es', 'tener', [preterite]).get('Preterite')?.size).toBe(6);
  });
  it('flags nothing in a regular verb, and nothing outside Spanish or in a table whose title is no simple tense', () => {
    expect(irregularRows('es', 'hablar', [table('Present', ['hablo', 'hablas', 'habla', 'hablamos', 'habláis', 'hablan'])]).size).toBe(0);
    expect(irregularRows('fr', 'parler', [table('Present', ['parle', 'parles', 'parle', 'parlons', 'parlez', 'parlent'])]).size).toBe(0);
    expect(irregularRows('es', 'hablar', [table('Present subjunctive', ['hable', 'hables', 'hable', 'hablemos', 'habléis', 'hablen'])]).size).toBe(0);
  });
});
