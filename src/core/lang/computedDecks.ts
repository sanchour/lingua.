// Ready-made decks worked out from a language pack instead of a word list (5.1-3b): the most common
// irregular verbs, read from the pack's own verb tables, and words that look like their English
// meaning. Pure and free of `@/` imports, so the pack scripts use it too.
import type { PackFile, PackThemeItem } from '../packs/format.ts';
import { ROMANIZE } from '../script/romanize.ts';
import { foldKey } from '../text/normalize.ts';

type PackPart = Pick<PackFile, 'lang' | 'lemmas' | 'lemmaFreq' | 'paradigms' | 'forms'>;

/**
 * How many letters a regular verb's ending takes off its dictionary form: every form of a regular
 * verb still holds what is left (hablar → habl-o, machen → ge-mach-t). Only languages where
 * irregular verbs are a thing learners study; the others get no deck.
 */
const ENDING: Record<string, number> = { en: 1, sv: 1, nb: 1, de: 2, nl: 2, es: 3, fr: 3, it: 3, pt: 3, ro: 3, ru: 3, pl: 3, cs: 3, el: 3, sh: 3 };
const MAX_ITEMS = 40;
const MIN_ITEMS = 8;

/**
 * "to be (essentially or identified as)", "to exist; to occur" → "to be; to exist": the first two
 * senses at most, so a rarer (or ruder) third one never reaches the card.
 */
export function shortGloss(glosses: string[]): string {
  const senses = glosses.flatMap((g) => {
    let clean = g;
    for (let prev = ''; prev !== clean; ) [prev, clean] = [clean, clean.replace(/\s*\([^()]*\)/g, '')];
    return clean.replace(/[()]/g, '').split(/;\s*/);
  });
  let out = '';
  let kept = 0;
  for (const sense of senses.map((s) => s.trim())) {
    if (!sense || out.split('; ').includes(sense)) continue;
    const next = out ? `${out}; ${sense}` : sense;
    if ((next.length > 48 && out) || kept === 2) break;
    out = next;
    kept++;
  }
  return out.length > 80 ? `${out.slice(0, 78).replace(/\s+\S*$/, '')}…` : out;
}

/** Accents off, doubled letters single (gemaakt → gemakt), so spelling rules don't count as irregular. */
const plain = (w: string, lang: string) => foldKey(w, lang).replace(/(.)\1+/gu, '$1');

/** The most common verbs, in frequency order, with a form that leaves the regular stem behind (ser → soy, gehen → ging). */
export function irregularVerbs(pack: PackPart): PackThemeItem[] {
  const cut = ENDING[pack.lang];
  if (!cut) return [];
  const tables = new Map((pack.paradigms ?? []).filter((p) => p[1] === 'verb').map((p) => [p[0], p[2]]));
  const out: PackThemeItem[] = [];
  for (const i of pack.lemmaFreq ?? []) {
    const rows = tables.get(i);
    const lemma = pack.lemmas[i];
    if (!rows || !lemma || /\s/.test(lemma[0])) continue;
    // French tables give the reflexive beside the plain form ("suis / me suis"): the plain one counts.
    const forms = rows.map(([form]) => form.split(/\s*\/\s*/)[0]).filter((f) => f && !/[\s()]/.test(f) && f !== '-' && f !== '—');
    if (forms.length < 6) continue;
    const base = plain(lemma[0], pack.lang);
    const stem = base.slice(0, Math.max(2, base.length - cut));
    if (forms.every((f) => plain(f, pack.lang).includes(stem))) continue;
    const meaning = shortGloss(lemma[4].find(([pos]) => pos === 'verb')?.[1] ?? []);
    if (!meaning) continue;
    out.push([lemma[1] || lemma[0], meaning, 'verb', '']);
    if (out.length >= MAX_ITEMS) break;
  }
  return out.length >= MIN_ITEMS ? out : [];
}

/** Letters that English spells another way (ph f, th t, k c, z s, w v, y i), and no doubles. */
const squeeze = (w: string) =>
  w
    .toLowerCase()
    .replace(/[^\p{L}]/gu, '')
    .replace(/ph/g, 'f')
    .replace(/th/g, 't')
    .replace(/k/g, 'c')
    .replace(/z/g, 's')
    .replace(/w/g, 'v')
    .replace(/y/g, 'i')
    .replace(/(.)\1+/gu, '$1');

function distance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = row;
  }
  return prev[b.length];
}

/** Whether a word (in Latin letters) reads like an English one: teléfono ~ telephone, Familie ~ family. */
export function looksAlike(word: string, english: string): boolean {
  const a = squeeze(word);
  const b = squeeze(english);
  if (a.length < 3 || b.length < 3) return false;
  const n = Math.max(a.length, b.length);
  return distance(a, b) <= (n <= 5 ? 1 : n <= 8 ? 2 : 3);
}

/** The single English words a gloss starts with: "to organize; to arrange (things)" → organize, arrange. */
function englishHeads(glosses: string[]): string[] {
  return glosses
    .slice(0, 2)
    .flatMap((g) => g.replace(/\([^)]*\)/g, '').split(/[;,]/))
    .map((part) => part.trim().replace(/^(?:to|a|an|the)\s+/i, ''))
    .filter((part) => /^[A-Za-z-]+$/.test(part));
}

const CONTENT = new Set(['noun', 'verb', 'adj', 'adv']);
const LATIN = /^[\p{Script=Latin}'’-]+$/u;
const LOOKALIKE_MAX = 60;
const LOOKALIKE_MIN = 12;

/** Common words that look like their English meaning (in Latin letters, so Russian and Greek count too). */
export function lookalikes(pack: PackPart): PackThemeItem[] {
  if (pack.lang === 'en') return [];
  // A spelling that is also a form of another word is left out: смог is "could" far more often than "smog".
  const shared = new Set(pack.forms.filter((f) => f[1].length > 1).map((f) => f[0]));
  const romanize = pack.lang === 'ru' || pack.lang === 'el' || pack.lang === 'ka' ? ROMANIZE[pack.lang] : undefined;
  const out: PackThemeItem[] = [];
  for (const i of (pack.lemmaFreq ?? []).slice(0, 8000)) {
    const lemma = pack.lemmas[i];
    if (!lemma) continue;
    const [key, display, , gender, senses] = lemma;
    let word = foldKey(key, pack.lang);
    if (!LATIN.test(word)) {
      const latin = romanize?.(key);
      if (!latin) continue;
      word = foldKey(latin, 'en');
    }
    if (word.length < 4 || shared.has(key)) continue;
    // Only by its first meaning: French nous is "we", not the English "nous".
    const sense = senses[0];
    if (!sense || !CONTENT.has(sense[0]) || !englishHeads(sense[1]).some((e) => looksAlike(word, e))) continue;
    const meaning = shortGloss(sense[1]);
    if (!meaning) continue;
    out.push([display || key, meaning, sense[0], sense[0] === 'noun' ? gender : '']);
    if (out.length >= LOOKALIKE_MAX) break;
  }
  return out.length >= LOOKALIKE_MIN ? out : [];
}

/** Both computed decks, as pack themes. */
export function computedThemes(pack: PackPart): Record<string, PackThemeItem[]> {
  const out: Record<string, PackThemeItem[]> = {};
  const irregular = irregularVerbs(pack);
  if (irregular.length) out.irregular = irregular;
  const cognates = lookalikes(pack);
  if (cognates.length) out.cognates = cognates;
  return out;
}
