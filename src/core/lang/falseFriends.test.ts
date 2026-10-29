import { describe, expect, it } from 'vitest';
import { FALSE_FRIENDS, falseFriendOf } from './falseFriends';

describe('false friends', () => {
  it('are keyed in lower case and say what they are mistaken for and what they mean', () => {
    for (const [lang, words] of Object.entries(FALSE_FRIENDS)) {
      expect(lang).toMatch(/^[a-z]{2}$/);
      for (const [word, f] of Object.entries(words)) {
        expect(word).toBe(word.toLocaleLowerCase());
        expect(f.looks && f.means).toBeTruthy();
      }
    }
  });
  it('are found by headword, in any case, and only in their language', () => {
    expect(falseFriendOf('es', 'Embarazado')?.means).toBe('pregnant');
    expect(falseFriendOf('fr', 'embarazado')).toBeUndefined();
  });
});
