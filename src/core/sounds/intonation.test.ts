import { describe, expect, it } from 'vitest';
import { answerWords, INTONATION, isStressed, STRESS } from './intonation';

describe('intonation and stress data', () => {
  it('every core language has pairs (a statement then a question) and stress items whose stressed word is in the answer', () => {
    for (const lang of ['es', 'fr', 'de', 'ru', 'ar', 'zh']) {
      const { items } = INTONATION[lang];
      expect(items.length % 2, lang).toBe(0);
      items.forEach((it, i) => expect(it.kind, lang).toBe(i % 2 ? 'question' : 'statement'));
      expect(STRESS[lang].length, lang).toBeGreaterThanOrEqual(3);
      for (const s of STRESS[lang]) {
        expect(s.answer, `${lang} ${s.stressed}`).toContain(s.stressed);
        expect(answerWords(s).some((w) => isStressed(w, s)), `${lang} ${s.stressed}`).toBe(true);
      }
    }
  });
  it('only languages whose yes/no questions rise at the end are measured', () => {
    expect(['es', 'fr', 'de', 'ar'].every((l) => INTONATION[l].measurable)).toBe(true);
    expect(INTONATION.ru.measurable || INTONATION.zh.measurable).toBe(false);
  });
});
