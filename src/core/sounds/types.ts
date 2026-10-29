// The sound system of a language (6-10): each sound with where it is made, real words with it, and a plain note. Hand-made for the
// six core languages; the charts are drawn from these fields, so a sound is written once.
export type Place = 'bilabial' | 'labiodental' | 'dental' | 'alveolar' | 'postalveolar' | 'palatal' | 'velar' | 'uvular' | 'pharyngeal' | 'glottal';
export type Manner = 'stop' | 'nasal' | 'fricative' | 'affricate' | 'trill' | 'flap' | 'approximant' | 'lateral';

export const PLACES: Place[] = ['bilabial', 'labiodental', 'dental', 'alveolar', 'postalveolar', 'palatal', 'velar', 'uvular', 'pharyngeal', 'glottal'];
export const MANNERS: Manner[] = ['stop', 'nasal', 'fricative', 'affricate', 'trill', 'flap', 'approximant', 'lateral'];

interface Base {
  /** The sound as the IPA writes it (or a tone mark). */
  ipa: string;
  /** Words with it, each with its meaning. */
  words: Array<[word: string, meaning: string]>;
  /** What to know about it, in a sentence or two. */
  note: string;
}

export interface Vowel extends Base {
  kind: 'vowel';
  /** 0 front, 1 central, 2 back. */
  frontness: 0 | 1 | 2;
  /** 0 close, 1 close-mid, 2 open-mid, 3 open. */
  height: 0 | 1 | 2 | 3;
  rounded?: boolean;
  nasal?: boolean;
  long?: boolean;
}

export interface Consonant extends Base {
  kind: 'consonant';
  place: Place;
  manner: Manner;
  voiced: boolean;
  /** Said with a push of air, made with the throat tightened, or soft (palatalised): a short label for the chart's footnote. */
  feature?: string;
}

/** A tone (Mandarin): its pitch over the syllable, five levels, 1 lowest. */
export interface Tone extends Base {
  kind: 'tone';
  contour: number[];
}

export type Sound = Vowel | Consonant | Tone;

export interface SoundSystem {
  lang: string;
  sounds: Sound[];
  /** Stress, spelling and sound, connected speech: each a short paragraph. */
  rules: Array<{ title: string; text: string }>;
}
