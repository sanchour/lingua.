// Source data for the offline language packs. Run with Node 24 (native TypeScript):
//   node scripts/lang-data/fetch.ts      → downloads into scripts/.cache (git-ignored)
//   node scripts/lang-data/build.ts ru   → writes public/packs/ru.v1.json.gz

export interface PackSource {
  code: string;
  /** Language name as used by kaikki.org URLs. */
  kaikki: string;
  /** FrequencyWords (OpenSubtitles) list code, or a Leipzig corpus for languages without subtitles. */
  frequency: string;
  /** FrequencyWords edition when 2018 has none (Japanese). */
  frequencyYear?: 2016 | 2018;
  /** Leipzig Corpora Collection word list (CC BY), e.g. `lat_wikipedia_2021_100K`. */
  leipzig?: string;
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
  // Lingua 2.0: ten more.
  { code: 'ar', kaikki: 'Arabic', frequency: 'ar' },
  { code: 'zh', kaikki: 'Chinese', frequency: 'zh_cn' },
  { code: 'nl', kaikki: 'Dutch', frequency: 'nl' },
  { code: 'nb', kaikki: 'Norwegian Bokmål', frequency: 'no' },
  { code: 'tr', kaikki: 'Turkish', frequency: 'tr' },
  { code: 'ja', kaikki: 'Japanese', frequency: 'ja', frequencyYear: 2016 },
  { code: 'ko', kaikki: 'Korean', frequency: 'ko' },
  { code: 'la', kaikki: 'Latin', frequency: 'la', leipzig: 'lat_wikipedia_2021_100K' },
  { code: 'sw', kaikki: 'Swahili', frequency: 'sw', leipzig: 'swa_wikipedia_2021_100K' },
  { code: 'id', kaikki: 'Indonesian', frequency: 'id' },
];

export const CACHE_DIR = new URL('../.cache/', import.meta.url);
export const PACKS_DIR = new URL('../../public/packs/', import.meta.url);

/** kaikki.org keeps a language in a folder by its name; the file name drops the spaces. */
export const kaikkiUrl = (s: PackSource) =>
  `https://kaikki.org/dictionary/${encodeURIComponent(s.kaikki)}/kaikki.org-dictionary-${encodeURIComponent(s.kaikki.replace(/ /g, ''))}.jsonl.gz`;
export const kaikkiFile = (s: PackSource) => new URL(`kaikki-${s.code}.jsonl.gz`, CACHE_DIR);
export const frequencyUrl = (s: PackSource) =>
  s.leipzig
    ? `https://downloads.wortschatz-leipzig.de/corpora/${s.leipzig}.tar.gz`
    : `https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/${s.frequencyYear ?? 2018}/${s.frequency}/${s.frequency}_50k.txt`;
/** A Leipzig corpus is downloaded whole; its word list becomes the frequency file. */
export const leipzigFile = (s: PackSource) => new URL(`leipzig-${s.code}.tar.gz`, CACHE_DIR);
export const frequencyFile = (s: PackSource) => new URL(`freq-${s.code}.txt`, CACHE_DIR);
