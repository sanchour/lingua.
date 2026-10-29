// How a sound is made (6-10), said in words and as a position: the guidance under a sound, and the points the mouth diagram draws.
// Pure, from the fields the sound already has, so a sound is written once.
import type { Consonant, Place, Sound, Vowel } from './types';

/** Where each place of articulation is on the diagram (a 200 × 160 sketch of the mouth from the side, lips at the left). */
export const PLACE_POINT: Record<Place, { x: number; y: number }> = {
  bilabial: { x: 22, y: 78 },
  labiodental: { x: 30, y: 76 },
  dental: { x: 44, y: 72 },
  alveolar: { x: 62, y: 58 },
  postalveolar: { x: 80, y: 50 },
  palatal: { x: 104, y: 44 },
  velar: { x: 132, y: 48 },
  uvular: { x: 150, y: 62 },
  pharyngeal: { x: 164, y: 92 },
  glottal: { x: 164, y: 120 },
};

const PLACE_WORDS: Record<Place, string> = {
  bilabial: 'the two lips',
  labiodental: 'the lower lip against the upper teeth',
  dental: 'the tip of the tongue against the back of the upper teeth',
  alveolar: 'the tip of the tongue at the ridge behind the upper teeth',
  postalveolar: 'the tongue just behind that ridge',
  palatal: 'the middle of the tongue against the hard palate',
  velar: 'the back of the tongue against the soft palate',
  uvular: 'the back of the tongue against the uvula',
  pharyngeal: 'the root of the tongue drawn back towards the throat',
  glottal: 'the vocal folds themselves',
};

const MANNER_WORDS: Record<Consonant['manner'], string> = {
  stop: 'The air is stopped completely, then let go in a small burst.',
  nasal: 'The mouth is closed at that place and the air goes out through the nose.',
  fricative: 'The air is pushed through a narrow gap, which makes the hiss or the rub.',
  affricate: 'A stop that is let go slowly into a hiss, in one movement.',
  trill: 'The tongue is held loosely so that the air makes it tap several times.',
  flap: 'The tongue taps once, quickly.',
  approximant: 'The mouth narrows without making a hiss: it is almost a vowel.',
  lateral: 'The tongue touches in the middle and the air goes out over its sides.',
};

/** What to do with the mouth, in three short sentences at most. */
export function guidance(sound: Sound): string {
  if (sound.kind === 'tone') return `Keep the syllable on one note of the voice, and move it along the line drawn: ${sound.contour.join(' → ')} on a scale of 1 (low) to 5 (high).`;
  if (sound.kind === 'vowel') {
    const height = ['almost closed', 'half closed', 'half open', 'wide open'][sound.height];
    const front = ['pushed forward', 'in the middle', 'pulled back'][sound.frontness];
    return `The jaw is ${height} and the tongue is ${front}. The lips are ${sound.rounded ? 'rounded and pushed forward' : 'relaxed or spread'}.${sound.nasal ? ' The soft palate drops, so the air also goes through the nose.' : ''}${sound.long ? ' Hold it about twice as long as the short one.' : ''}`;
  }
  return `Use ${PLACE_WORDS[sound.place]}. ${MANNER_WORDS[sound.manner]} ${sound.voiced ? 'The voice is on: put a hand on your throat and feel it hum.' : 'The voice is off: nothing hums in your throat.'}${sound.feature ? ` (${sound.feature})` : ''}`;
}

/** The voiced or unvoiced partner of a consonant in the same system: the same place and manner, the other voicing. */
export function voicingPartner(sound: Consonant, all: readonly Sound[]): Consonant | undefined {
  return all.find((s): s is Consonant => s.kind === 'consonant' && s.place === sound.place && s.manner === sound.manner && s.voiced !== sound.voiced);
}

/** The highest point of the tongue for a vowel, on the same sketch: front vowels toward the teeth, back vowels toward the throat. */
export function vowelPoint(v: Vowel): { x: number; y: number } {
  return { x: 84 + v.frontness * 28, y: 54 + v.height * 15 };
}

/** Where the device's reading of a spoken word differs from the word, letter by letter (longest common subsequence): what you left out, and what came in instead. */
export function letterHints(word: string, heard: string): { missing: string[]; extra: string[] } {
  const norm = (s: string) => [...s.toLocaleLowerCase().replace(/[^\p{L}]/gu, '')];
  const a = norm(word);
  const b = norm(heard);
  const t = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) t[i][j] = a[i] === b[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
  const missing: string[] = [];
  const extra: string[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) (i++, j++);
    else if (j >= b.length || (i < a.length && t[i + 1][j] >= t[i][j + 1])) missing.push(a[i++]);
    else extra.push(b[j++]);
  }
  return { missing, extra };
}
