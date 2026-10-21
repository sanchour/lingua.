// Where each of Lingua's languages is spoken (Lingua 5.1-2b), from Unicode CLDR's territoryInfo
// (the pinned `cldr-core` devDependency): for each country, its languages, their share of speakers
// and their official status. Writes src/data/territories.json, which the language map and the
// onboarding overview read. Run again when cldr-core is updated or a language is added:
//   node scripts/lang-data/territories.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { LANGUAGES } from '../../src/core/lang/languages.ts';

interface CldrLanguage {
  _populationPercent: string;
  _officialStatus?: 'official' | 'de_facto_official' | 'official_regional' | 'official_minority';
}
type TerritoryInfo = Record<string, { _population: string; languagePopulation?: Record<string, CldrLanguage> }>;

/** o official · r regional · m recognised minority · w widely spoken · h historical (hand-added). */
export type Status = 'o' | 'r' | 'm' | 'w' | 'h';

const info = (JSON.parse(readFileSync(new URL('../../node_modules/cldr-core/supplemental/territoryInfo.json', import.meta.url), 'utf8')) as { supplemental: { territoryInfo: TerritoryInfo } }).supplemental
  .territoryInfo;

/** CLDR's codes for a Lingua language where they differ (scripts and standards counted as one language). */
const CLDR_CODES: Record<string, string[]> = {
  nb: ['nb', 'nn'],
  tl: ['fil'],
  zh: ['zh', 'zh_Hant'],
  yue: ['yue', 'yue_Hans'],
  sh: ['sr', 'sr_Latn', 'hr', 'bs'],
  pa: ['pa', 'pa_Arab'],
  uz: ['uz', 'uz_Arab'],
  ms: ['ms', 'ms_Arab'],
};

/** What CLDR can't hold: dead and classical languages, the Holy See's Latin, and Maya's recognition. */
const BY_HAND: Record<string, Array<[string, Status]>> = {
  la: [
    ['VA', 'o'],
    ['IT', 'h'],
  ],
  grc: [
    ['GR', 'h'],
    ['CY', 'h'],
  ],
  non: [
    ['IS', 'h'],
    ['NO', 'h'],
    ['DK', 'h'],
    ['SE', 'h'],
  ],
  sa: [['NP', 'h']],
  // A national language under Mexico's 2003 language law; CLDR gives it no status.
  yua: [['MX', 'm']],
};

const RANK: Record<Status, number> = { o: 0, r: 1, m: 2, h: 3, w: 4 };
const STATUS: Record<NonNullable<CldrLanguage['_officialStatus']>, Status> = { official: 'o', de_facto_official: 'o', official_regional: 'r', official_minority: 'm' };

const out: Record<string, Array<[string, Status]>> = {};
for (const lang of LANGUAGES) {
  const codes = CLDR_CODES[lang.code] ?? [lang.code];
  const places = new Map<string, { status: Status; speakers: number }>();
  for (const [country, territory] of Object.entries(info)) {
    const population = Number(territory._population);
    for (const code of codes) {
      const entry = territory.languagePopulation?.[code];
      if (!entry) continue;
      const share = Number(entry._populationPercent);
      const speakers = (population * share) / 100;
      // No status: only where most people speak it (English in the Netherlands, not German in Hungary).
      const status = entry._officialStatus ? STATUS[entry._officialStatus] : share >= 50 ? 'w' : null;
      if (!status) continue;
      const before = places.get(country);
      if (!before) places.set(country, { status, speakers });
      else places.set(country, { status: RANK[status] < RANK[before.status] ? status : before.status, speakers: before.speakers + speakers });
    }
  }
  for (const [country, status] of BY_HAND[lang.code] ?? []) if (!places.has(country) || RANK[status] < RANK[places.get(country)!.status]) places.set(country, { status, speakers: places.get(country)?.speakers ?? 0 });
  out[lang.code] = [...places.entries()].sort((a, b) => RANK[a[1].status] - RANK[b[1].status] || b[1].speakers - a[1].speakers).map(([country, p]) => [country, p.status]);
}

const file = new URL('../../src/data/territories.json', import.meta.url);
writeFileSync(file, `${JSON.stringify(out).replaceAll('],"', '],\n"').replace('{', '{\n').replace(/}$/, '\n}')}\n`);
const placed = Object.values(out).filter((p) => p.length).length;
console.log(`territories.json: ${placed} of ${LANGUAGES.length} languages placed (cldr-core ${JSON.parse(readFileSync(new URL('../../node_modules/cldr-core/package.json', import.meta.url), 'utf8')).version}).`);
