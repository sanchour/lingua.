// Real people saying common words (5.1-3c): the index scripts/lang-data/recordings.ts builds per
// language, and which recording to play. The sound itself is on Wikimedia Commons.
// Relative import with extension: this module is also run by Node in scripts/lang-data.
import { normalizeWord } from '../text/normalize.ts';

export const SOUNDS_FORMAT = 1;
/** Bump when the indexes are rebuilt in a new shape. */
export const SOUNDS_VERSION = 1;
/** The tier 1 languages have recordings; the rest only voices. */
export const SOUNDS_LANGS = ['fr', 'es', 'de', 'ru', 'zh', 'ar'];
export const soundsFileName = (lang: string, version = SOUNDS_VERSION) => `${lang}.v${version}.json.gz`;

/** [Commons hash path "c/cc", file name, the region it was recorded in ("France Paris") or ""] */
export type SoundsRecording = [string, string, string];

export interface SoundsFile {
  format: number;
  lang: string;
  builtAt: string;
  source: string;
  /** Normalised word → its recordings, Lingua Libre's first. */
  words: Record<string, SoundsRecording[]>;
}

/** The regions Wiktionary writes for each country's accent. */
const REGIONS: Record<string, RegExp> = {
  FR: /France|Paris|Lyon|Marseille|Toulouse/i,
  CA: /Quebec|Québec|Canada/i,
  BE: /Belgium/i,
  CH: /Switzerland|Swiss/i,
  ES: /Spain|Castilian|Madrid|Andalusia|Valencia|Catalonia/i,
  MX: /Mexico|Latin-America/i,
  AR: /Argentina|Rioplatense|Buenos|Latin-America/i,
  CO: /Colombia|Latin-America/i,
  CL: /Chile|Latin-America/i,
  US: /\bUS\b|United-States|General-American/,
  DE: /Germany|Berlin|Bavaria|Hamburg|Saxony/i,
  AT: /Austria|Vienna/i,
  RU: /Russia|Moscow/i,
  CN: /Mainland|Beijing|China/i,
  TW: /Taiwan/i,
  SA: /Saudi|Gulf/i,
  EG: /Egypt|Cairo/i,
};

/** The recording to play for `locale`: its own accent first, then one with no region named, then any. */
export function pickRecording(list: readonly SoundsRecording[] | undefined, locale: string | null): SoundsRecording | undefined {
  if (!list?.length) return undefined;
  const own = REGIONS[(locale ?? '').split(/[-_]/)[1]?.toUpperCase() ?? ''];
  const score = ([, , region]: SoundsRecording) => (own && own.test(region) ? 0 : region ? 2 : 1);
  return [...list].sort((a, b) => score(a) - score(b))[0];
}

/** The index key for what a speaker button says: the word itself, without the punctuation around it. */
export function recordingKey(text: string, lang: string): string {
  return normalizeWord(text.replace(/\s+/g, ' ').trim().replace(/^[\s"'«»„“”‚‘’¡¿([{-]+|[\s"'«»„“”‚‘’.,;:!?…)\]}。，！？、-]+$/gu, ''), lang);
}

/** Commons' mp3 of a recording (every Lingua Libre .wav and Wiktionary .ogg has one). */
export const recordingUrl = ([path, name]: SoundsRecording) => `https://upload.wikimedia.org/wikipedia/commons/transcoded/${path}/${encodeURIComponent(name.replace(/ /g, '_'))}/${encodeURIComponent(name.replace(/ /g, '_'))}.mp3`;
/** The file's page on Commons, where its speaker and licence are. */
export const recordingPage = ([, name]: SoundsRecording) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(name.replace(/ /g, '_'))}`;

/** Lingua Libre names the speaker in the file name: "LL-Q150 (fra)-Lyokoï-gratis.wav". */
export function speakerOf([, name]: SoundsRecording): string | undefined {
  return /^LL-Q\d+(?:[ _]\([a-z]{3}\))?-([^-]+)-/.exec(name)?.[1];
}
