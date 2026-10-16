// Small language helpers for showing vocabulary: articles for nouns, gender names.

const ARTICLES: Record<string, Partial<Record<string, string>>> = {
  de: { m: 'der', f: 'die', n: 'das' },
  es: { m: 'el', f: 'la' },
  pt: { m: 'o', f: 'a' },
  it: { m: 'il', f: 'la' },
  fr: { m: 'le', f: 'la' },
  el: { m: 'ο', f: 'η', n: 'το' },
  sv: { c: 'en', n: 'ett' },
};

const VOWEL_START = /^[aeiouàâäéèêëíìîïóòôöúùûüh]/i;

/** The definite article for a noun ("der" Hund, "la" casa, "l’" eau), or null. */
export function articleFor(lang: string, gender: string | undefined, term: string, pos?: string): string | null {
  if (!gender || (pos && pos !== 'noun') || /\s/.test(term)) return null;
  if ((lang === 'fr' || lang === 'it') && VOWEL_START.test(term)) return 'l’';
  if (lang === 'it' && gender === 'm' && /^(s[^aeiou]|z|gn|ps|x|y)/i.test(term)) return 'lo';
  return ARTICLES[lang]?.[gender] ?? null;
}

const GENDER_NAMES: Record<string, string> = { m: 'masculine', f: 'feminine', n: 'neuter', c: 'common' };
export const genderName = (g?: string) => (g ? GENDER_NAMES[g] : undefined);

const POS_NAMES: Record<string, string> = {
  noun: 'noun',
  verb: 'verb',
  adj: 'adjective',
  adv: 'adverb',
  pron: 'pronoun',
  prep: 'preposition',
  conj: 'conjunction',
  intj: 'interjection',
  num: 'number',
  det: 'determiner',
  particle: 'particle',
  phrase: 'phrase',
  article: 'article',
  name: 'name',
};
export const posName = (pos?: string) => (pos ? (POS_NAMES[pos] ?? pos) : undefined);

/** Splits a sentence around a [start, end) span for highlighting. */
export function splitAt(text: string, span?: [number, number]): [string, string, string] | null {
  if (!span) return null;
  const [s, e] = span;
  if (s < 0 || e > text.length || s >= e) return null;
  return [text.slice(0, s), text.slice(s, e), text.slice(e)];
}

/** The articles to choose from in "Which article?" (Ludus), per language. */
export const ARTICLE_SETS: Record<string, string[]> = {
  de: ['der', 'die', 'das'],
  es: ['el', 'la'],
  pt: ['o', 'a'],
  it: ['il', 'lo', 'la', 'l’'],
  fr: ['le', 'la', 'l’'],
  el: ['ο', 'η', 'το'],
  sv: ['en', 'ett'],
};
