import { describe, expect, it } from 'vitest';
import { ipaFileNames } from './ipaAudio';
import { SOUND_SYSTEMS } from './index';
import type { Consonant, Vowel } from './types';

const consonant = (ipa: string, place: Consonant['place'], manner: Consonant['manner'], voiced: boolean): Consonant => ({ kind: 'consonant', ipa, place, manner, voiced, words: [], note: '' });

describe('ipaFileNames', () => {
  it('names a sound by voicing, place and manner, best first', () => {
    expect(ipaFileNames(consonant('s', 'alveolar', 'fricative', false))[0]).toBe('Voiceless alveolar fricative.ogg');
    expect(ipaFileNames(consonant('b', 'bilabial', 'stop', true))).toEqual(['Voiced bilabial plosive.ogg']);
    expect(ipaFileNames(consonant('n', 'alveolar', 'nasal', true))[0]).toBe('Alveolar nasal.ogg');
    expect(ipaFileNames(consonant('ɾ', 'alveolar', 'flap', true))[0]).toBe('Alveolar tap.ogg');
    expect(ipaFileNames(consonant('ʔ', 'glottal', 'stop', false))).toEqual(['Glottal stop.ogg']);
  });
  it('lets a dental sound fall back to the alveolar recording, and says retroflex for the curled-back ones', () => {
    expect(ipaFileNames(consonant('t', 'dental', 'stop', false))).toEqual(['Voiceless dental plosive.ogg', 'Voiceless alveolar plosive.ogg']);
    expect(ipaFileNames(consonant('ʂ', 'postalveolar', 'fricative', false))[0]).toBe('Voiceless retroflex fricative.ogg');
  });
  it('names a vowel by height, backness and rounding', () => {
    const v = (frontness: Vowel['frontness'], height: Vowel['height'], rounded?: boolean): Vowel => ({ kind: 'vowel', ipa: 'x', frontness, height, rounded, words: [], note: '' });
    expect(ipaFileNames(v(0, 0))).toEqual(['Close front unrounded vowel.ogg']);
    expect(ipaFileNames(v(2, 1, true))).toEqual(['Close-mid back rounded vowel.ogg']);
  });
  it('gives nothing where the plain recording would be another sound', () => {
    expect(ipaFileNames({ kind: 'vowel', ipa: 'ɑ̃', frontness: 2, height: 3, nasal: true, words: [], note: '' })).toEqual([]);
    expect(ipaFileNames(consonant('pʰ', 'bilabial', 'stop', false))).toEqual([]);
    expect(ipaFileNames(consonant('sˤ', 'alveolar', 'fricative', false))).toEqual([]);
    expect(ipaFileNames({ kind: 'tone', ipa: 'á', contour: [3, 5], words: [], note: '' })).toEqual([]);
  });
  it('has a name to look for in most sounds of the six languages', () => {
    const all = Object.values(SOUND_SYSTEMS).flatMap((s) => s.sounds);
    expect(all.filter((s) => ipaFileNames(s).length).length).toBeGreaterThan(all.length * 0.8);
  });
});
