// Which stations are really in the language (Lingua 5.2-2). radio-browser files a station under
// every language its owner typed, so a station in the USA tagged "english,spanish,french", or a
// music station tagged with its owner's language, showed under Spanish. A station stays when:
//  1. the language is its only or first language (three or more languages, with this one not
//     first, is a music or multi-language station);
//  2. it is in a country where the language is official, regional or widely spoken, or the language
//     is its only one (real stations abroad, a Russian station in Israel, stay);
//  3. it isn't on the hand-kept list of wrong stations (corrections.ts);
//  4. its name doesn't speak against it: abroad, a name with letters but none in the language's
//     script or in Latin (which stations everywhere use) is another language's station.
import type { Script } from '@/core/lang/languages';
import { WRONG_STATIONS } from './corrections';

export interface FilterContext {
  lang: string;
  /** The language's names in the directory (several for Mandarin, Portuguese…). */
  names: string[];
  /** Countries (ISO, upper case) where the language is official, regional or widely spoken. */
  home: ReadonlySet<string>;
  script?: Script;
}

const SCRIPT_RE: Partial<Record<Script, RegExp>> = {
  Latn: /\p{Script=Latin}/u,
  Cyrl: /\p{Script=Cyrillic}/u,
  Arab: /\p{Script=Arabic}/u,
  Hans: /\p{Script=Han}/u,
  Hant: /\p{Script=Han}/u,
  Jpan: /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u,
  Kore: /\p{Script=Hangul}/u,
  Grek: /\p{Script=Greek}/u,
  Hebr: /\p{Script=Hebrew}/u,
  Deva: /\p{Script=Devanagari}/u,
  Thai: /\p{Script=Thai}/u,
  Geor: /\p{Script=Georgian}/u,
};

/** The languages a station gives, in its own order, lower case. */
export const languagesOf = (language: string | undefined) =>
  (language ?? '')
    .split(',')
    .map((l) => l.trim().toLowerCase())
    .filter(Boolean);

/** Other ways owners write the language ("castellano", "русский"), counted as the language itself. */
const ALIASES: Record<string, string[]> = {
  es: ['castellano', 'español', 'espanol', 'castilian'],
  fr: ['français', 'francais'],
  de: ['deutsch'],
  ru: ['rus', 'русский', 'ру', 'язык: ру', 'язык: русский'],
  ar: ['ar', 'arabe', 'arapça', 'عربي', 'العربية'],
  zh: ['中文', '普通话', '国语', '國語'],
};

/** Common languages, so "american english", "english uk" and "english" count as one. */
const BASES = ['english', 'french', 'german', 'spanish', 'arabic', 'russian', 'chinese', 'portuguese', 'italian', 'turkish', 'japanese', 'korean', 'hindi', 'urdu', 'dutch', 'persian', 'kurdish'];
const baseOf = (tag: string) => BASES.find((b) => tag.split(/[\s.]+/).includes(b)) ?? tag;

export function inLanguage(station: { stationuuid: string; name: string; language?: string; countrycode?: string }, ctx: FilterContext): boolean {
  if (WRONG_STATIONS[ctx.lang]?.includes(station.stationuuid)) return false;
  const langs = languagesOf(station.language);
  const country = station.countrycode?.trim().toUpperCase();
  // Mandarin is "chinese" and "mandarin", and "swiss german" is German: all the language here.
  const aliases = ALIASES[ctx.lang] ?? [];
  const own = (l: string) => ctx.names.includes(l) || aliases.some((a) => l === a || l.includes(a) && a.length > 3) || ctx.names.some((n) => l.split(/[\s.]+/).includes(n));
  const others = new Set(langs.filter((l) => !own(l)).map(baseOf));
  if (!others.size) return nameFits(station.name, ctx, country);
  if (others.size >= 2 && !own(langs[0])) return false;
  return Boolean(country && ctx.home.has(country));
}

/** Abroad, a name in another script needs the language as the station's only one (rule 4). */
export function nameFits(name: string, ctx: FilterContext, country: string | undefined): boolean {
  if (country && ctx.home.has(country.toUpperCase())) return true;
  const re = ctx.script ? SCRIPT_RE[ctx.script] : undefined;
  if (!re || !/\p{L}/u.test(name)) return true;
  return re.test(name) || /\p{Script=Latin}/u.test(name);
}
