// Which locale a natural voice speaks for a language: the accent follows the flag the learner chose
// (Castilian for Spain, Mexican for Mexico, Brazilian for Brazil), never a default American voice.
import { getLanguage } from './languages';

/** Flags whose locale isn't simply language-COUNTRY. */
const SPECIAL: Record<string, Record<string, string>> = {
  sh: { hr: 'hr-HR', rs: 'sr-RS', ba: 'bs-BA', me: 'sr-ME' },
  tl: { ph: 'fil-PH' },
};

/** The BCP-47 locale a voice should speak `lang` in under `flag`; null when there's none (Latin). */
export function voiceLocale(lang: string, flag?: string): string | null {
  const info = getLanguage(lang);
  if (!info) return null;
  // Emblems and script badges (Catalan's Senyera, Serbo-Croatian's Š / Ћ) have no accent: the first country's.
  const country = (f: string) => /^[a-z]{2}$/.test(f);
  const f = flag && info.flags.includes(flag) && country(flag) ? flag : info.flags.find(country);
  if (!f) return null;
  return SPECIAL[lang]?.[f] ?? `${lang}-${f.toUpperCase()}`;
}

/** The other accents of a language, from its other flags (for choosing a voice). */
export function otherLocales(lang: string, flag?: string): string[] {
  const own = voiceLocale(lang, flag);
  return (getLanguage(lang)?.flags ?? []).map((f) => voiceLocale(lang, f)).filter((l): l is string => Boolean(l) && l !== own);
}

/** Two locales are the same however they're written: es-ES, es_es. */
export const sameLocale = (a: string, b: string) => a.replace('_', '-').toLowerCase() === b.replace('_', '-').toLowerCase();

/** "Spanish as spoken in Mexico". */
export function accentName(locale: string): string {
  const [code, region] = locale.split('-');
  let language = code;
  let place: string | undefined = region;
  try {
    language = new Intl.DisplayNames(['en'], { type: 'language' }).of(code) ?? code;
    place = region ? new Intl.DisplayNames(['en'], { type: 'region' }).of(region) : undefined;
  } catch {
    // Older engines: the codes themselves.
  }
  return place ? `${language} as spoken in ${place}` : language;
}
