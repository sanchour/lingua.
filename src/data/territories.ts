// Where Lingua's languages are spoken (Lingua 5.1-2b): from Unicode CLDR (each country's languages
// and their official status), with dead and classical languages added by hand. Built by
// scripts/lang-data/territories.ts into territories.json; the language map and the onboarding read it.
import { LANGUAGES } from '@/core/lang/languages';
import data from './territories.json';

export type PlaceStatus = 'official' | 'regional' | 'minority' | 'historical' | 'widely';

const STATUS = { o: 'official', r: 'regional', m: 'minority', h: 'historical', w: 'widely' } as const satisfies Record<string, PlaceStatus>;
const TABLE = data as unknown as Record<string, Array<[string, keyof typeof STATUS]>>;

/** How each status is said on the map's country card. */
export const STATUS_NAME: Record<PlaceStatus, string> = {
  official: 'Official',
  regional: 'Regional',
  minority: 'Recognised minority',
  historical: 'Historical',
  widely: 'Widely spoken',
};

export interface Place {
  /** ISO 3166 country code, upper case. */
  country: string;
  status: PlaceStatus;
}

/** Where a language is spoken: official first, then regional, minority, historical and widely spoken, each by speakers. */
export function placesOf(lang: string): Place[] {
  return (TABLE[lang] ?? []).map(([country, s]) => ({ country, status: STATUS[s] }));
}

const RANK: Record<PlaceStatus, number> = { official: 0, regional: 1, minority: 2, historical: 3, widely: 4 };

let byCountry: Map<string, Array<{ lang: string; status: PlaceStatus }>> | null = null;

/** A country's languages in Lingua: official first, then by status; within one, in Lingua's own order. */
export function languagesIn(country: string): Array<{ lang: string; status: PlaceStatus }> {
  if (!byCountry) {
    byCountry = new Map();
    for (const { code } of LANGUAGES) {
      for (const place of placesOf(code)) {
        const list = byCountry.get(place.country) ?? [];
        list.push({ lang: code, status: place.status });
        byCountry.set(place.country, list);
      }
    }
    for (const list of byCountry.values()) list.sort((a, b) => RANK[a.status] - RANK[b.status]);
  }
  return byCountry.get(country) ?? [];
}
