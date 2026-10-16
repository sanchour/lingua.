import { describe, expect, it } from 'vitest';
import { codeForLanguage, parseLooseDate, parseNotionLanguages } from './notion';

describe('Notion languages import', () => {
  it('reads a Dutch export', () => {
    const csv = [
      '﻿Taal,CEFR Niveau,Status,Methode,Begin Datum',
      'Nederlands,C2,Moedertaal,Natuurlijk,"June 27, 2005"',
      'Engels,C2,Natuurlijk,"School, Internet","September 1, 2016"',
      'Fries,B1,Natuurlijk,Natuurlijk,27 juni 2005',
      'Russisch,A2,Aan het leren,Zelfstudie,2023/04/17',
      'Duits,A2,Niet begonnen,Zelfstudie,',
      'Chinees,A0,Niet begonnen,,',
    ].join('\n');
    const rows = parseNotionLanguages(csv);
    expect(rows.map((r) => r.id)).toEqual(['nl', 'en', 'fy', 'ru', 'de', 'zh']);
    expect(rows[0]).toEqual({ id: 'nl', name: 'Dutch', level: 'C2', status: 'native', methods: ['Natural'], started: '2005-06-27' });
    expect(rows[1].methods).toEqual(['School', 'Internet']);
    expect(rows[2].started).toBe('2005-06-27');
    expect(rows[3]).toMatchObject({ status: 'learning', methods: ['Self-study'], started: '2023-04-17' });
    expect(rows[4]).toMatchObject({ status: 'not-started', started: undefined });
    expect(rows[5]).toMatchObject({ level: 'A0', methods: [] });
  });

  it('reads English headers and unknown languages', () => {
    const rows = parseNotionLanguages('Language,Level,Status,Method,Started\nBasque,A1,Learning,Self-study,2024-02-03');
    expect(rows[0]).toEqual({ id: 'x-basque', name: 'Basque', level: 'A1', status: 'learning', methods: ['Self-study'], started: '2024-02-03' });
    expect(() => parseNotionLanguages('Foo,Bar\n1,2')).toThrow();
  });

  it('parses loose dates', () => {
    expect(parseLooseDate('12/09/2022')).toBe('2022-09-12');
    expect(parseLooseDate('')).toBeUndefined();
    expect(codeForLanguage('Português')).toBe('pt');
  });
});
