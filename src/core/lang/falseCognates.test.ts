import { describe, expect, it } from 'vitest';
import { FALSE_COGNATES, falseCognateOf } from './falseCognates';

describe('false cognates', () => {
  it('are keyed in lower case, each with the English word and where they really come from', () => {
    for (const words of Object.values(FALSE_COGNATES))
      for (const [word, f] of Object.entries(words)) {
        expect(word).toBe(word.toLocaleLowerCase());
        expect(f.looks && f.note.length > 30).toBeTruthy();
      }
    expect(falseCognateOf('es', 'Mucho')?.looks).toBe('much');
    expect(falseCognateOf('fr', 'mucho')).toBeUndefined();
  });
});
