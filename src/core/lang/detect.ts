// Which of Lingua's languages a text is in: by its alphabet first, then by the little words every
// sentence is full of. Good enough to sort song lyrics and titles; not for a line or two of text.

/** Common function words, most frequent first. Words shared between languages count for each. */
const STOPWORDS: Record<string, string[]> = {
  en: ['the', 'you', 'and', 'i', 'to', 'a', 'it', 'me', 'my', 'is', 'in', 'that', 'of', 'your', 'on', 'be', 'all', 'know', 'what', 'don’t', "don't", 'with', 'for', 'this', 'love', 'just', 'like', 'when', 'oh', 'baby', 'can', 'are', 'we', 'so', 'now', 'never', 'got'],
  es: ['que', 'de', 'la', 'y', 'el', 'me', 'te', 'en', 'no', 'mi', 'tu', 'yo', 'lo', 'se', 'es', 'un', 'una', 'los', 'por', 'con', 'las', 'si', 'más', 'pero', 'como', 'quiero', 'para', 'amor', 'corazón', 'cuando', 'ya', 'nada', 'eres', 'contigo', 'tú', 'qué', 'porque', 'del', 'está', 'sin', 'vida'],
  pt: ['que', 'de', 'e', 'o', 'a', 'eu', 'não', 'você', 'me', 'um', 'é', 'do', 'da', 'em', 'meu', 'minha', 'com', 'se', 'pra', 'mais', 'mas', 'uma', 'te', 'no', 'na', 'tudo', 'quando', 'coração', 'vou', 'amor', 'sem', 'só', 'tô', 'ela', 'nós', 'também', 'agora', 'aqui', 'isso', 'vai'],
  fr: ['je', 'de', 'la', 'le', 'et', 'que', 'tu', 'pas', 'les', 'un', 'à', 'ne', 'est', 'une', 'des', 'il', 'mon', 'moi', 'qui', 'en', 'on', 'dans', 'pour', 'toi', 'ma', 'me', 'elle', 'plus', 'mais', 'nous', 'avec', 'sur', 'ce', 'tout', 'comme', 'c’est', "c'est", 'j’ai', "j'ai", 'suis', 'vous', 'au'],
  de: ['ich', 'die', 'und', 'du', 'der', 'das', 'nicht', 'ist', 'es', 'in', 'mich', 'mir', 'ein', 'zu', 'wir', 'sie', 'den', 'dich', 'mit', 'auf', 'dir', 'eine', 'so', 'noch', 'was', 'auch', 'hab', 'bin', 'nur', 'dem', 'wenn', 'kein', 'wie', 'mein', 'für', 'alles', 'immer', 'doch', 'schon', 'nie'],
  it: ['che', 'e', 'di', 'non', 'il', 'la', 'mi', 'un', 'ti', 'io', 'è', 'a', 'per', 'tu', 'una', 'ma', 'si', 'lo', 'sono', 'me', 'con', 'come', 'più', 'se', 'del', 'te', 'della', 'nel', 'cuore', 'amore', 'sei', 'anche', 'tutto', 'ho', 'gli', 'questo', 'quando', 'ancora', 'perché', 'niente'],
  sv: ['och', 'jag', 'du', 'det', 'att', 'är', 'en', 'som', 'inte', 'på', 'i', 'med', 'mig', 'dig', 'för', 'vi', 'den', 'har', 'så', 'om', 'kan', 'vill', 'när', 'ett', 'min', 'av', 'men', 'bara', 'till', 'ska', 'här', 'aldrig', 'mitt', 'allt', 'var', 'nu', 'hon', 'han', 'hur'],
  hu: ['a', 'az', 'és', 'hogy', 'nem', 'egy', 'én', 'te', 'is', 'de', 'van', 'meg', 'csak', 'már', 'mint', 'még', 'ha', 'mert', 'vagy', 'el', 'ki', 'be', 'fel', 'minden', 'nekem', 'neked', 'engem', 'téged', 'szeretlek', 'ez', 'azt', 'volt', 'lesz', 'így', 'mi', 'most', 'sem', 'nincs', 'itt', 'ott'],
};

/** Letters only some languages use, each a gentle hint. */
const LETTER_HINTS: Array<[RegExp, string[]]> = [
  [/[őű]/, ['hu']],
  [/ñ/, ['es']],
  [/[ãõ]/, ['pt']],
  [/ç/, ['pt', 'fr']],
  [/å/, ['sv']],
  [/ß/, ['de']],
  [/[ìò]/, ['it']],
  [/[êœ]/, ['fr', 'pt']],
];

const WORD = /[\p{L}’']+/gu;
const sets = Object.fromEntries(Object.entries(STOPWORDS).map(([l, words]) => [l, new Set(words)]));

export interface Detected {
  lang: string;
  /** 0–1: how clearly the text belongs to it. */
  confidence: number;
}

/** The language of a text, or null when it's too short or unclear. */
export function detectLanguage(text: string): Detected | null {
  const letters = text.match(/\p{L}/gu) ?? [];
  if (letters.length < 12) return null;
  const cyr = letters.filter((c) => /\p{Script=Cyrillic}/u.test(c)).length;
  const grk = letters.filter((c) => /\p{Script=Greek}/u.test(c)).length;
  if (cyr / letters.length > 0.5) return { lang: 'ru', confidence: Math.min(1, cyr / letters.length) };
  if (grk / letters.length > 0.5) return { lang: 'el', confidence: Math.min(1, grk / letters.length) };

  const words = (text.toLocaleLowerCase().match(WORD) ?? []).map((w) => w.replace(/'/g, '’').replace(/^’|’$/g, ''));
  if (words.length < 4) return null;
  const score: Record<string, number> = {};
  for (const [lang, set] of Object.entries(sets)) {
    let hits = 0;
    for (const w of words) if (set.has(w) || set.has(w.replace(/’/g, "'"))) hits++;
    score[lang] = hits / words.length;
  }
  const lower = text.toLocaleLowerCase();
  for (const [re, langs] of LETTER_HINTS) if (re.test(lower)) for (const l of langs) score[l] += 0.04;

  const ranked = Object.entries(score).sort((a, b) => b[1] - a[1]);
  const [[best, top], [, second]] = ranked;
  if (top < 0.12) return null;
  return { lang: best, confidence: Math.min(1, (top - second) / top) };
}

/** True when the text is clearly in `lang` (or can't be told apart from it). */
export function looksLike(text: string, lang: string): boolean {
  const found = detectLanguage(text);
  return found?.lang === lang;
}
