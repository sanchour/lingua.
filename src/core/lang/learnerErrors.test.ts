import { describe, expect, it } from 'vitest';
import { LEARNER_ERRORS, learnerErrorOf } from './learnerErrors';

describe('learner mistakes', () => {
  it('are keyed in lower case, one note each, and found by headword in any case and in their own language', () => {
    for (const [lang, words] of Object.entries(LEARNER_ERRORS)) {
      expect(lang).toMatch(/^[a-z]{2}$/);
      for (const [word, note] of Object.entries(words)) {
        expect(word).toBe(word.toLocaleLowerCase());
        expect(note.length).toBeGreaterThan(20);
      }
    }
    expect(learnerErrorOf('es', 'Hecho')).toContain('echo');
    expect(learnerErrorOf('fr', 'hecho')).toBeUndefined();
  });
});
