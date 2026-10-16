// Source data for the offline language packs. Run with Node 24 (native TypeScript):
//   node scripts/lang-data/fetch.ts      → downloads into scripts/.cache (git-ignored)
//   node scripts/lang-data/build.ts ru   → writes public/packs/ru.v1.json.gz

export interface PackSource {
  code: string;
  /** Language name as used by kaikki.org URLs. */
  kaikki: string;
  /** FrequencyWords (OpenSubtitles 2018) list code. */
  frequency: string;
}

export const PACK_SOURCES: PackSource[] = [
  { code: 'en', kaikki: 'English', frequency: 'en' },
  { code: 'es', kaikki: 'Spanish', frequency: 'es' },
  { code: 'ru', kaikki: 'Russian', frequency: 'ru' },
  { code: 'pt', kaikki: 'Portuguese', frequency: 'pt_br' },
  { code: 'fr', kaikki: 'French', frequency: 'fr' },
  { code: 'el', kaikki: 'Greek', frequency: 'el' },
  { code: 'de', kaikki: 'German', frequency: 'de' },
  { code: 'it', kaikki: 'Italian', frequency: 'it' },
  { code: 'sv', kaikki: 'Swedish', frequency: 'sv' },
  { code: 'hu', kaikki: 'Hungarian', frequency: 'hu' },
];

export const CACHE_DIR = new URL('../.cache/', import.meta.url);
export const PACKS_DIR = new URL('../../public/packs/', import.meta.url);

export const kaikkiUrl = (s: PackSource) => `https://kaikki.org/dictionary/${s.kaikki}/kaikki.org-dictionary-${s.kaikki}.jsonl.gz`;
export const kaikkiFile = (s: PackSource) => new URL(`kaikki-${s.code}.jsonl.gz`, CACHE_DIR);
export const frequencyUrl = (s: PackSource) =>
  `https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/${s.frequency}/${s.frequency}_50k.txt`;
export const frequencyFile = (s: PackSource) => new URL(`freq-${s.code}.txt`, CACHE_DIR);
