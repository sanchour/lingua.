// A reference recording of each sound (6-10, F0704): the IPA recordings on Wikimedia Commons, one file for each sound, named for how it is made
// ("Voiceless alveolar fricative.ogg"). This only works out the names to look for, best first; the service asks Commons which exist.
// None for tones, nasal vowels, aspirated or heavy (emphatic) consonants: Commons' plain recording would be a different sound.
import type { Sound } from './types';

const MANNER: Record<string, string[]> = { stop: ['plosive'], nasal: ['nasal'], fricative: ['fricative', 'sibilant'], affricate: ['affricate'], trill: ['trill'], flap: ['tap', 'flap'], approximant: ['approximant'], lateral: ['lateral approximant'] };
const HEIGHT = ['Close', 'Close-mid', 'Open-mid', 'Open'];
const FRONT = ['front', 'central', 'back'];

export function ipaFileNames(s: Sound): string[] {
  if (s.kind === 'tone' || (s.kind === 'vowel' && s.nasal)) return [];
  if (s.kind === 'vowel') return [`${HEIGHT[s.height]} ${FRONT[s.frontness]} ${s.rounded ? 'rounded' : 'unrounded'} vowel.ogg`];
  if (/[ˤʰ]/.test(s.ipa)) return [];
  if (s.place === 'glottal' && s.manner === 'stop') return ['Glottal stop.ogg'];
  const retroflex = /[ʂʐʈ]/.test(s.ipa);
  const places = retroflex ? ['retroflex'] : s.place === 'postalveolar' ? ['palato-alveolar', 'postalveolar'] : s.place === 'dental' ? ['dental', 'alveolar'] : [s.place];
  const sonorant = ['nasal', 'trill', 'flap', 'approximant', 'lateral'].includes(s.manner);
  const voicing = sonorant ? ['', s.voiced ? 'Voiced ' : 'Voiceless '] : [s.voiced ? 'Voiced ' : 'Voiceless '];
  const out: string[] = [];
  for (const place of places) for (const manner of MANNER[s.manner]) for (const v of voicing) out.push(`${v}${place} ${manner}.ogg`.replace(/^./, (c) => c.toUpperCase()));
  return out;
}
