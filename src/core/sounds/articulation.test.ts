import { describe, expect, it } from 'vitest';
import { guidance, letterHints, vowelPoint, voicingPartner } from './articulation';
import { SOUND_SYSTEMS } from './index';
import type { Consonant, Vowel } from './types';

describe('how a sound is made', () => {
  const es = SOUND_SYSTEMS.es.sounds;
  const get = (ipa: string) => es.find((s) => s.ipa === ipa)!;
  it('says the place, the manner and the voicing of a consonant', () => {
    const g = guidance(get('b'));
    expect(g).toContain('two lips');
    expect(g).toContain('stopped');
    expect(g).toContain('hum');
    expect(guidance(get('p'))).toContain('voice is off');
  });
  it('says the jaw, tongue and lips of a vowel', () => {
    const g = guidance(get('u'));
    expect(g).toContain('almost closed');
    expect(g).toContain('pulled back');
    expect(g).toContain('rounded');
    expect(guidance(SOUND_SYSTEMS.fr.sounds.find((s) => s.ipa === 'ɑ̃')!)).toContain('nose');
  });
  it('finds the voiced partner of a consonant and none where there is none', () => {
    expect(voicingPartner(get('p') as Consonant, es)?.ipa).toBe('b');
    expect(voicingPartner(get('m') as Consonant, es)).toBeUndefined();
  });
  it('puts a front close vowel by the teeth and high, a back open one by the throat and low', () => {
    const i = vowelPoint(get('i') as Vowel);
    const a = vowelPoint({ ...(get('a') as Vowel), frontness: 2 });
    expect(i.x).toBeLessThan(a.x);
    expect(i.y).toBeLessThan(a.y);
  });
  it('gives a tone as a line', () => {
    expect(guidance(SOUND_SYSTEMS.zh.sounds[0])).toContain('5 → 5 → 5');
  });
});

describe('letterHints', () => {
  it('names what was left out and what came in', () => {
    expect(letterHints('perro', 'pero')).toEqual({ missing: ['r'], extra: [] });
    expect(letterHints('casa', 'caza')).toEqual({ missing: ['s'], extra: ['z'] });
    expect(letterHints('hola', 'Hola!')).toEqual({ missing: [], extra: [] });
  });
});
