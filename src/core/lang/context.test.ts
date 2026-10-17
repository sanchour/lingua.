import { describe, expect, it } from 'vitest';
import { posFromContext, senseInContext, shortGloss } from './context';
import type { SenseOption } from './context';

const tarde: SenseOption[] = [
  { lemma: 'tarde', pos: 'adv', glosses: ['late (after a specified deadline)', 'late in the day'] },
  { lemma: 'tarde', pos: 'noun', glosses: ['afternoon', 'evening (after sunset)'] },
  { lemma: 'tardar', pos: 'verb', glosses: ['to take some amount of time'] },
];

describe('meaning from context', () => {
  it('reads the word before', () => {
    expect(posFromContext('es', 'cada')).toBe('noun');
    expect(posFromContext('es', 'La')).toBe('noun');
    expect(posFromContext('es', 'nosotros')).toBe('verb');
    expect(posFromContext('el', 'θα')).toBe('verb');
    expect(posFromContext('de', 'sehr')).toBe('adj');
    expect(posFromContext('es', 'perro')).toBeNull();
    expect(posFromContext('es', undefined)).toBeNull();
  });

  it('picks the sense the sentence needs', () => {
    expect(senseInContext(tarde, posFromContext('es', 'cada'))?.glosses[0]).toBe('afternoon');
    expect(senseInContext(tarde, posFromContext('es', 'muy'))?.pos).toBe('adv');
    expect(senseInContext(tarde, posFromContext('es', 'se'))?.lemma).toBe('tardar');
    expect(senseInContext(tarde, null)).toBeNull();
    expect(senseInContext([tarde[1]], 'noun')).toBeNull(); // nothing to choose between
  });

  it('keeps glosses short', () => {
    expect(shortGloss(['afternoon', 'evening (after sunset)'])).toBe('afternoon; evening');
    expect(shortGloss(['dog (the species Canis familiaris (sometimes designated Canis lupus familiaris), domesticated)', 'clothes peg'])).toBe('dog; clothes peg');
    expect(shortGloss(['a'.repeat(70)]).length).toBe(60);
  });
});
