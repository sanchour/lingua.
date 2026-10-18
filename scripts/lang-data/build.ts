// Builds one offline language pack per language from Kaikki (Wiktionary) + FrequencyWords.
//   node scripts/lang-data/build.ts          → all ten languages
//   node scripts/lang-data/build.ts ru el    → only these
//
// A pack keeps what the reader needs, pruned to words people actually meet:
// - the top 20k forms by frequency (ranks for seeding, decks and coverage stats)
// - every form among the top 50k that Wiktionary can map to a lemma, with a short English gloss
// - all inflections of the ~15k most frequent lemmas (helps highly inflected languages)
// - entries (headword, IPA, gender, senses) for every lemma referenced
// - since v2: lemmas ranked by frequency (Top-N decks), short usage examples with their translation,
//   and the themed starter lists made by themes.ts (run that first)
// - since v6: inflection tables (conjugations, declensions) for the most frequent lemmas
// - since v7: meanings in order of use (translations.ts evidence), plain short glosses, contractions
//   and forms with the meaning their own entry states, forms of forms, and the reading a form
//   belongs to; run translations.ts once before building. src/core/packs/glosses.test.ts checks
//   the result for everyday words.
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createGunzip, gzipSync } from 'node:zlib';
import { foldKey, normalizeWord } from '../../src/core/text/normalize.ts';
import { baseCandidates } from '../../src/core/lang/inflect.ts';
import { deinflect, hasKanji, JAPANESE_CHAR, readingOf, segmentJapanese, toHiragana } from '../../src/core/lang/japanese.ts';
import type { JapaneseLexicon } from '../../src/core/lang/japanese.ts';
import { PACK_FORMAT, PACK_VERSION, packFileName } from '../../src/core/packs/format.ts';
import type { PackExample, PackFile, PackForm, PackLemma, PackParadigm, PackSense, PackThemeItem } from '../../src/core/packs/format.ts';
import { GLOSS_FIXES, READING_FIXES } from './fixes.ts';
import { CACHE_DIR, countedFile, frequencyFile, kaikkiFile, PACK_SOURCES, PACKS_DIR, unihanVariants } from './sources.ts';
import type { PackSource } from './sources.ts';

const FREQ_KEEP = 20_000;
const FREQ_LOOKUP = 50_000;
const TABLE_FORMS_LEMMA_RANK = 15_000;
const MAX_TABLE_FORMS = 80;
const MAX_SENSES = 6;
const MAX_GLOSSES = 3;
const SHORT_GLOSS = 60;
const LEMMA_FREQ_KEEP = 10_000;
/** Examples per lemma: two for the most frequent lemmas, one for the rest of the top 10k. */
const EXAMPLES_RICH_RANK = 2000;

const SKIP_POS = new Set(['name', 'character', 'symbol', 'punct', 'prefix', 'suffix', 'infix', 'interfix', 'circumfix', 'affix', 'romanization', 'soft-redirect', 'syllable']);
/** Mandarin and Cantonese (both from kaikki's "Chinese"; Cantonese keeps Traditional characters). */
const CHINESE = new Set(['zh', 'yue']);
/** Chinese single characters carry their meanings as "character" entries: words of their own. */
const KEEP_CHARACTERS = CHINESE;
/** Written without spaces between words (Thai puts them only between phrases). */
const UNSPACED = new Set(['zh', 'yue', 'ja', 'th']);
/** Related words listed in Wiktionary form tables that are not inflections of the headword. */
const NOT_INFLECTION = new Set([
  'romanization', 'canonical', 'table-tags', 'inflection-template', 'class', 'relational', 'diminutive', 'augmentative',
  'pejorative', 'hypocorism', 'expressive', 'noun-from-verb', 'adjective', 'adverb', 'abbreviation', 'alternative', 'error-unrecognized-form',
]);
const GENDER: Record<string, string> = { masculine: 'm', feminine: 'f', neuter: 'n', common: 'c' };

interface KaikkiForm { form?: string; tags?: string[]; ruby?: Array<[string, string]> }
interface KaikkiExample { text?: string; english?: string; translation?: string; type?: string; ref?: string }
interface KaikkiSense { glosses?: string[]; tags?: string[]; form_of?: { word: string }[]; alt_of?: { word: string }[]; examples?: KaikkiExample[] }
interface KaikkiEntry {
  word: string;
  pos: string;
  tags?: string[];
  forms?: KaikkiForm[];
  senses?: KaikkiSense[];
  /** Japanese kana in `other`, Mandarin pinyin in `zh_pron` (tagged Mandarin, Standard, Pinyin). */
  sounds?: { ipa?: string; other?: string; zh_pron?: string; tags?: string[] }[];
  /** Soft redirects: a Simplified Mandarin spelling → its Traditional entry; a kanji spelling → its kana entries. */
  redirects?: string[];
}

// ── Readings (Mandarin pinyin, Japanese kana) ───────────────────────────────

const JAPANESE_RUN = new RegExp(`${JAPANESE_CHAR.source}+`, 'gu');

/** The reading Wiktionary gives an entry as written: pinyin for Mandarin, kana for Japanese words with kanji. */
function entryReading(entry: KaikkiEntry, lang: string): string {
  if (lang === 'zh') {
    const sound =
      entry.sounds?.find((s) => s.zh_pron && s.tags?.includes('Mandarin') && s.tags.includes('Pinyin') && s.tags.includes('Standard')) ??
      entry.sounds?.find((s) => s.zh_pron && s.tags?.includes('Mandarin') && s.tags.includes('Pinyin'));
    // "ě (wo³, e³)" → ě
    return sound?.zh_pron?.replace(/\s*\(.*$/, '').trim() ?? '';
  }
  if (lang === 'yue') {
    // Jyutping: "nei5" for 你.
    const sound = entry.sounds?.find((s) => s.zh_pron && s.tags?.includes('Cantonese') && s.tags.includes('Jyutping'));
    return sound?.zh_pron?.replace(/\s*\(.*$/, '').trim() ?? '';
  }
  if (lang === 'ja') {
    if (!hasKanji(entry.word)) return '';
    const canonical = entry.forms?.find((f) => f.tags?.includes('canonical') && f.ruby?.length);
    if (canonical?.ruby && canonical.form) {
      // 食べる with [[食, た]] → たべる: each ruby base replaced by its kana, in order.
      let rest = canonical.form.replace(/\s.*$/, '');
      let out = '';
      for (const [base, kana] of canonical.ruby) {
        const at = rest.indexOf(base);
        if (at < 0) break;
        out += rest.slice(0, at) + kana;
        rest = rest.slice(at + base.length);
      }
      out += rest;
      if (!hasKanji(out)) return toHiragana(out);
    }
    const other = entry.sounds?.find((s) => s.other && !hasKanji(s.other))?.other;
    return other ? toHiragana(other) : '';
  }
  return '';
}

/**
 * What a first read of the whole dictionary tells about spellings:
 * - Mandarin: each Traditional entry's Simplified spelling (the pack is keyed by Simplified, since
 *   texts and the frequency list are).
 * - Japanese: the kana entries a kanji spelling belongs to (今日 → きょう), from soft redirects and
 *   from kana entries listing their kanji; and the kanji entries a kana word may be (たべる → 食べる).
 */
interface Spellings {
  simplified: Map<string, string>;
  /** From soft redirects: what Wiktionary says a kanji spelling is (今日 → きょう, こんにち). */
  kanaOfKanji: Map<string, string[]>;
  /** From kana entries listing their kanji: looser (きょう lists 京 too), used only for kanji without an entry. */
  listedKana: Map<string, string[]>;
  kanjiOfKana: Map<string, string[]>;
}

async function readSpellings(source: PackSource): Promise<Spellings> {
  const lang = source.code;
  const out: Spellings = { simplified: new Map(), kanaOfKanji: new Map(), listedKana: new Map(), kanjiOfKana: new Map() };
  if (lang !== 'zh' && lang !== 'ja') return out;
  const add = (map: Map<string, string[]>, key: string, value: string) => {
    const list = map.get(key) ?? [];
    if (!list.includes(value)) map.set(key, [...list, value]);
  };
  if (lang === 'zh') unihan = readUnihan();
  for await (const line of readLines(source)) {
    if (!line.includes('"redirects"') && !(lang === 'ja' && line.includes('"kanji"')) && !(lang === 'zh' && line.includes('Simplified-Chinese'))) continue;
    let entry: KaikkiEntry;
    try {
      entry = JSON.parse(line) as KaikkiEntry;
    } catch {
      continue;
    }
    if (lang === 'zh') {
      // 學校 names its Simplified spelling, 学校. (Wiktionary's redirects mix in old variants, 㦱 →
      // 我, so single characters go by Unihan instead: see toSimplified.) Not the abandoned second
      // round of simplification, nor a character described by its parts (⿱占一).
      for (const f of entry.forms ?? []) {
        if (!f.form || f.form === entry.word || !f.tags?.includes('Simplified-Chinese')) continue;
        if (f.tags.some((t) => t === 'alternative' || t === 'obsolete' || t === 'Second-Round-Simplified-Chinese') || /[⿰-⿿]/.test(f.form)) continue;
        if (!out.simplified.has(entry.word)) out.simplified.set(entry.word, f.form);
      }
      continue;
    }
    if (entry.redirects?.length) {
      if (hasKanji(entry.word)) for (const kana of entry.redirects) if (!hasKanji(kana)) add(out.kanaOfKanji, entry.word, kana);
      if (!hasKanji(entry.word)) for (const kanji of entry.redirects) if (hasKanji(kanji)) add(out.kanjiOfKana, entry.word, kanji);
    }
    if (!hasKanji(entry.word) && entry.pos !== 'name' && entry.pos !== 'soft-redirect') {
      for (const f of entry.forms ?? []) {
        if (f.form && f.tags?.includes('kanji') && hasKanji(f.form) && !f.tags.includes('rare') && !f.tags.includes('obsolete')) add(out.listedKana, f.form, entry.word);
      }
    }
  }
  // A Simplified word is never itself renamed (发 stays 发, though it is also a Traditional spelling).
  for (const simp of new Set(out.simplified.values())) out.simplified.delete(simp);
  return out;
}

/**
 * From Unihan: a Traditional character's Simplified one (還 → 还), leaving out characters that may stay
 * as they are (乾); and a Simplified character's Traditional one where it differs (着 → 著).
 */
let unihan = { simplified: new Map<string, string>(), traditional: new Map<string, string>() };

function readUnihan(): typeof unihan {
  const out = { simplified: new Map<string, string>(), traditional: new Map<string, string>() };
  if (!existsSync(unihanVariants)) {
    console.warn('  zh: no Unihan_Variants.txt (run fetch.ts zh): Traditional spellings come only from Wiktionary');
    return out;
  }
  const char = (u: string) => String.fromCodePoint(parseInt(u.slice(2), 16));
  for (const line of readFileSync(unihanVariants, 'utf8').split('\n')) {
    const [code, field, values] = line.split('\t');
    if (!values || (field !== 'kSimplifiedVariant' && field !== 'kTraditionalVariant')) continue;
    const c = char(code);
    const variants = values.trim().split(/\s+/).map(char);
    if (field === 'kSimplifiedVariant' && !variants.includes(c)) out.simplified.set(c, variants[0]);
    const other = variants.find((v) => v !== c);
    if (field === 'kTraditionalVariant' && other) out.traditional.set(c, other);
  }
  return out;
}

/**
 * A Mandarin word as Simplified texts write it: a single character by Unihan (Wiktionary names rare
 * variants: 買 lists 𧹒), a longer word by Wiktionary's own pairing, else character by character.
 */
function toSimplified(word: string): string | undefined {
  const chars = [...word];
  if (chars.length === 1) return unihan.simplified.get(word) ?? spellings.simplified.get(word);
  const named = spellings.simplified.get(word);
  if (named) return named;
  const out = chars.map((c) => unihan.simplified.get(c) ?? c).join('');
  return out !== word ? out : undefined;
}

/** Japanese split the reader's way, for finding a word in an example sentence; set while building Japanese. */
let japaneseLexicon: JapaneseLexicon | null = null;
/** The language being built's spellings (readSpellings), and Mandarin lemmas' Traditional spellings. */
let spellings: Spellings = { simplified: new Map(), kanaOfKanji: new Map(), listedKana: new Map(), kanjiOfKana: new Map() };
const traditionalOf = new Map<string, Set<string>>();

/** Paradigms (inflection tables) are kept for this many of the most frequent lemmas. */
const PARADIGM_KEEP = 6000;
const PARADIGM_POS = new Set(['verb', 'noun', 'adj', 'pron', 'det']);
const MAX_PARADIGM_FORMS = 72;
/** Grammatical tags that place a form in a table; everything else is left out of its label. */
const PARADIGM_TAGS = new Set([
  'first-person', 'second-person', 'third-person', 'singular', 'plural', 'dual', 'masculine', 'feminine', 'neuter',
  'nominative', 'genitive', 'dative', 'accusative', 'instrumental', 'prepositional', 'locative', 'vocative', 'ablative',
  'partitive', 'essive', 'translative', 'inessive', 'elative', 'illative', 'adessive', 'allative', 'superessive',
  'sublative', 'delative', 'terminative', 'causal-final', 'comitative', 'definite', 'indefinite',
  'present', 'past', 'future', 'imperfect', 'preterite', 'perfect', 'pluperfect', 'historic', 'conditional',
  'subjunctive', 'imperative', 'indicative', 'infinitive', 'participle', 'gerund', 'supine', 'adverbial', 'passive',
  'perfective', 'imperfective', 'dependent', 'comparative', 'superlative', 'short-form',
]);
/** Forms left out of tables: unreliable, rare, regional or descriptive rows ("avoir + past participle"). */
const PARADIGM_SKIP = new Set([
  'error-unrecognized-form', 'rare', 'archaic', 'dated', 'obsolete', 'dialectal', 'nonstandard', 'colloquial', 'poetic',
  'multiword-construction', 'vos-form', 'imperfect-se', 'negative', 'second-person-semantically', 'alternative',
  'misspelling', 'possessive', 'animate', 'inanimate', 'romanization', 'table-tags', 'inflection-template', 'class',
  'canonical', 'diminutive', 'augmentative', 'abbreviation', 'noun-from-verb', 'causative', 'auxiliary',
]);

/** An entry's inflection table as [form as written, tags] rows, one per tag set. */
function paradigmOf(entry: KaikkiEntry): Array<[string, string]> {
  if (!PARADIGM_POS.has(entry.pos)) return [];
  const rows = new Map<string, string>();
  for (const f of entry.forms ?? []) {
    if (!f.form || !f.tags?.length || f.tags.some((t) => PARADIGM_SKIP.has(t))) continue;
    const form = f.form.replace(/\([^)]*\)|\[[^\]]*\]|[*^]/g, '').replace(/\s+/g, ' ').trim();
    // Real forms only: up to three words (бу́ду чита́ть, θα γράψω), no notes, placeholders or IPA (paʁl).
    if (!hasLetter.test(form) || form.length > 32 || form.split(' ').length > 3 || /[+:;]|[ɐ-ʯˈˌː]/.test(form)) continue;
    const tags = f.tags.filter((t) => PARADIGM_TAGS.has(t)).sort();
    // Aspect partners (прочита́ть for чита́ть) are other verbs, not forms of this one.
    if (!tags.length || tags.every((t) => t === 'perfective' || t === 'imperfective')) continue;
    const key = tags.join(' ');
    const existing = rows.get(key);
    if (!existing) rows.set(key, form);
    else if (existing !== form && !existing.includes(' / ') && !existing.split(' / ').includes(form)) rows.set(key, `${existing} / ${form}`);
    if (rows.size >= MAX_PARADIGM_FORMS) break;
  }
  // Nouns often list only their plural (casa → case); the headword is the singular.
  if (entry.pos === 'noun' && [...rows.keys()].some((k) => k === 'plural') && ![...rows.keys()].some((k) => k.includes('singular'))) {
    const head = entry.forms?.find((f) => f.tags?.includes('canonical'))?.form ?? entry.word;
    rows.set('singular', head.replace(/\([^)]*\)|[*^]/g, '').trim());
  }
  // Summary rows repeat a fuller one ("до́ма [genitive]" beside "до́ма [genitive singular]"): drop them.
  const sets = [...rows].map(([key, form]) => ({ key, form, tags: new Set(key.split(' ')) }));
  const kept = sets.filter((a) => !sets.some((b) => b !== a && b.form === a.form && b.tags.size > a.tags.size && [...a.tags].every((t) => b.tags.has(t))));
  return kept.map(({ key, form }) => [form, key]);
}

interface LexicalData {
  head: string;
  /** Inflection table of the entry that speaks for the word, and its part of speech. */
  paradigm: Array<[string, string]>;
  paradigmPos: string;
  ipa: string;
  /** Mandarin pinyin or Japanese kana for the word as written (entryReading). */
  reading: string;
  gender: string;
  senses: PackSense[];
  /** Each sense's reading, from the entry it came from: 还 is hái as "still", huán as "to return". */
  senseReadings: string[];
  tableForms: Set<string>;
  /** Candidate usage examples: [sentence, translation]. */
  examples: [string, string][];
  /** 0 the word itself · 1 a capitalised entry · 2 an abbreviation (see entryPriority). */
  priority: number;
}

/** themes.ts output: [candidates as [word, gender tag, 0 · 1 regional · -1 hand-picked], meaning, pos] */
type ThemeCandidates = [Array<[string, string, number]>, string, string];

const hasLetter = /\p{L}/u;

// ── Which meaning is the common one ─────────────────────────────────────────
// Wiktionary lists meanings by history, not by use. English Wiktionary's translation tables say
// which words are the usual translation of common English words (translations.ts), so a meaning
// that is the first translation of a frequent English word comes first: "obrigado" is "thank you"
// before "obligatory", "tempo" is "time" before "time out".

/** `share`: of the English word's translation tables, how many list the word (1 = all of them). */
interface Evidence { en: string; pos: string; position: number; share: number; rank: number }
/** Evidence for the language being built: lemma key → English words it translates. */
let evidence = new Map<string, Evidence[]>();
let evidenceLang = '';

type TranslationData = { rank: Record<string, number>; translations: Record<string, Record<string, Array<[string, string, number, number]>>> };
/** Read once for all languages; null when translations.ts hasn't been run. */
let translationData: TranslationData | null | undefined;

function loadEvidence(lang: string): void {
  evidence = new Map();
  evidenceLang = lang;
  if (translationData === undefined) {
    const file = new URL('en-translations.json', CACHE_DIR);
    translationData = existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as TranslationData) : null;
  }
  const data = translationData;
  if (!data) {
    console.warn(`  ${lang}: no translation evidence (run translations.ts first)`);
    return;
  }
  const rankOf = (en: string) => Math.max(...en.split(' ').map((w) => data.rank[w] ?? Infinity));
  for (const [word, list] of Object.entries(data.translations[lang] ?? {})) {
    // Mandarin tables write both spellings, "現在／现在": each half is the word.
    for (const part of word.split(/\s*[/／]\s*/).filter(Boolean)) {
      const key = normalizeWord(part, lang);
      const items = evidence.get(key) ?? [];
      for (const [en, pos, position, share] of list) {
        const rank = rankOf(en);
        if (Number.isFinite(rank) && !items.some((e) => e.en === en && e.pos === pos)) items.push({ en, pos, position, share: share ?? 1, rank });
      }
      if (items.length) evidence.set(key, items);
    }
  }
}

/** A gloss as plain words: notes in brackets go, and a leading grammar note gives way to what follows it. */
function plainGloss(gloss: string): string {
  // Brackets go first, so that what they say ("(in some implied group, often all people); one, you")
  // isn't taken for the gloss's own wording.
  let g =
    gloss
      .replace(/\s*\([^()]*\)/g, '')
      .replace(/\s*\([^()]*\)/g, '')
      // A bracket left open ("yes, yeah, (used to respond…") ends the gloss.
      .replace(/\s*\([^)]*$/, '')
      .replace(/\s+/g, ' ')
      .trim() || gloss;
  const semi = g.indexOf('; ');
  if (semi > 0 && LEAD_NOTE.test(g)) g = g.slice(semi + 2);
  // "third-person feminine singular nominative pronoun she; it" → "she; it"; "…personal pronoun, formal in Portugal; you" → "you"
  let rest = g.replace(NOTE_PREFIX, '');
  if (rest !== g) {
    if (/^\s*,/.test(rest)) rest = rest.includes('; ') ? rest.slice(rest.indexOf('; ') + 2) : '';
    rest = rest.replace(/^[\s,;:.]+/, '');
    if (rest && /\p{L}/u.test(rest)) g = rest;
  }
  // "to, introduces the indirect object" → "to"
  g = g.replace(/,\s*(?:introduces|indicates|used|denotes|expresses|especially|usually|often|typically|generally|chiefly|mainly)\b.*$/i, '');
  // "he, him, masculine personal third person subject and object pronoun" → "he, him"
  g = g.replace(/,\s*(?:(?:masculine|feminine|neuter|personal|possessive|reflexive)\s+)*(?:first|second|third)[- ]person\b.*$/i, '');
  // "the definite masculine singular article. the" → "the"
  g = g.replace(/^[^.;]*\barticle\.\s+(?=\S)/i, '');
  // "to her, for her; dative of ella" → "to her, for her"; "to have; forms the perfect aspect" → "to have"
  g = g
    .split('; ')
    .filter((p, i) => i === 0 || (!FORM_DESCRIPTION.test(p) && !LEAD_NOTE.test(p)))
    .join('; ');
  const plain = g
    .replace(/\s+/g, ' ')
    .replace(/[\s,;:]+$/, '')
    .trim();
  return plain || g;
}

/** "second-person singular personal pronoun", "masculine third-person plural nominative personal pronoun", "Third-person singular possessive determiner." */
const NOTE_PREFIX =
  /^(?:(?:masculine|feminine|neuter|common|plural|singular|formal|informal|polite|familiar|nominative|objective|accusative|dative|tonic|stressed|unstressed|emphatic)\s+)*(?:(?:first|second|third)[- ]person\b[^;]*?\b(?:pronoun|determiner|article|formal|informal)|(?:definite|indefinite) article|(?:personal|reflexive|possessive|relative|demonstrative|interrogative) (?:pronoun|determiner))\b\.?/i;
/** A gloss that only names its grammar. */
const isGrammarNote = (g: string) => {
  if (!NOTE_PREFIX.test(g) || g.includes(';')) return false;
  const rest = g.replace(NOTE_PREFIX, '').trim();
  return !rest || /^[,(]/.test(rest);
};

/** "used to form the comparative…; more", "indicates…; to", "An expression of intensity; hey": a description before the word itself. */
const LEAD_NOTE =
  /^(?:used (?:to|as|in|with|for)|forms?|makes|indicates?|denotes?|introduces?|expresses|an? (?:expression|filler)\b|in the (?:nominative|accusative|dative|genitive) case)\b/i;

/** Parts of speech whose commonest members are glossed by their usual English equivalent. */
const FUNCTION_POS = new Set(['pron', 'det', 'article', 'prep', 'conj', 'contraction', 'particle', 'adv', 'intj', 'num']);

const POSITION_WEIGHT = [1, 0.7, 0.5, 0.35];
/** A small head start for the order Wiktionary gives (first meaning ×1.5, second ×1.25, …). */
const listedFirst = (i: number) => 1 + 0.5 / (1 + i);
const POS_KIN = [
  ['det', 'article', 'pron'],
  ['intj', 'particle'],
  ['prep', 'contraction'],
];
const sameishPos = (a: string, b: string) => a === b || POS_KIN.some((kin) => kin.includes(a) && kin.includes(b));

/** How strongly a gloss is the common meaning of the word `key` (0 when nothing says so), and the part of it that says so. */
function glossMatch(key: string, pos: string, gloss: string, accept?: (e: Evidence) => boolean): { score: number; part: string } {
  let best = { score: 0, part: '' };
  const items = evidence.get(key);
  if (!items) return best;
  const parts = plainGloss(gloss)
    .split(/[;,]\s*|\s+or\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  for (const e of items) {
    if (accept && !accept(e)) continue;
    const en = e.en.replace(/^to\s+/, '');
    const article = ['a', 'an', 'the'].includes(en);
    // English articles say nothing about meanings ("per; a; each").
    if (article && !['article', 'det'].includes(pos)) continue;
    // "to go" is "go" and the pronoun "to her" (le) is "her", but "his, to her" (su) is not "her".
    const lead = e.pos === 'verb' || pos === 'pron' ? /^(?:to|a|an)\s+/ : /^(?:a|an)\s+/;
    const part = parts.find((p) => {
      const q = p.toLowerCase().replace(lead, '').replace(/[?!.]+$/, '');
      return q === en || q === `${en} the` || q === `${en} a`;
    });
    if (!part) continue;
    // The first translation of a common English word, across most of its senses, counts most. A
    // word spelled like the English one ("lá" for the note "la", "era" for "era") counts for less,
    // unless it is a function word ("me" is "me").
    // "the" lists every article of a language (el, la, los, las), so there its order says nothing.
    const lookalike = !FUNCTION_POS.has(pos) && foldKey(e.en, 'en') === foldKey(key, evidenceLang) ? 0.3 : 1;
    const [position, share] = article ? [0, 1] : [e.position, e.share];
    // A phrase ("go with") has few senses and common words, so its table looks surer than it is:
    // "megy" is "to go" before "to go with".
    const phrase = e.en.includes(' ') ? 0.35 : 1;
    const score = ((POSITION_WEIGHT[position] ?? 0.25) * (sameishPos(pos, e.pos) ? 1 : 0.6) * Math.sqrt(share) * lookalike * phrase) / Math.log2(e.rank + 50);
    if (score > best.score) best = { score, part };
  }
  return best;
}

const glossScore = (key: string, pos: string, gloss: string) => glossMatch(key, pos, gloss).score;

/** For a sense that only describes its grammar ("first-person singular prepositional pronoun"): the usual English word. */
function plainWordFor(key: string, pos: string): string | undefined {
  return (evidence.get(key) ?? [])
    .filter((e) => sameishPos(pos, e.pos) && e.position <= 1 && e.rank <= 2000)
    .sort((a, b) => a.position - b.position || b.share - a.share || a.rank - b.rank)[0]?.en;
}

function cleanForm(raw: string): string | null {
  const t = raw.replace(/\^\*|\*|\([^)]*\)|\[[^\]]*\]/g, '').trim();
  if (!t || /\s/.test(t) || !hasLetter.test(t)) return null;
  return t;
}

function isInflection(tags: string[] | undefined): boolean {
  if (!tags?.length || tags.some((t) => NOT_INFLECTION.has(t))) return false;
  // Aspect partners (Russian perfective/imperfective) are separate verbs.
  if (tags.length === 1 && (tags[0] === 'perfective' || tags[0] === 'imperfective')) return false;
  return true;
}

function shorten(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const at = Math.max(cut.lastIndexOf('; '), cut.lastIndexOf(', '));
  return (at > max * 0.5 ? cut.slice(0, at) : cut.replace(/\s+\S*$/, '')) + '…';
}

/** JSON lines split on "\n" only (Wiktionary text can contain stray carriage returns). */
async function* readLines(source: PackSource): AsyncGenerator<string> {
  const stream = createReadStream(kaikkiFile(source)).pipe(createGunzip());
  stream.setEncoding('utf8');
  let buffer = '';
  for await (const chunk of stream as AsyncIterable<string>) {
    buffer += chunk;
    let at: number;
    while ((at = buffer.indexOf('\n')) >= 0) {
      yield buffer.slice(0, at);
      buffer = buffer.slice(at + 1);
    }
  }
  if (buffer) yield buffer;
}

let malformed = 0;
async function* readEntries(source: PackSource): AsyncGenerator<KaikkiEntry> {
  for await (const line of readLines(source)) {
    if (!line.trim()) continue;
    let entry: KaikkiEntry;
    try {
      entry = JSON.parse(line) as KaikkiEntry;
    } catch {
      malformed++;
      continue;
    }
    if (!entry.word || /\s/.test(entry.word)) continue;
    // Japanese keeps names that texts use often (日本, 東京): the reader splits by the pack's words.
    const kept = (entry.pos === 'character' && KEEP_CHARACTERS.has(source.code)) || (entry.pos === 'name' && source.code === 'ja');
    if (SKIP_POS.has(entry.pos) && !kept) continue;
    // Left-overs of links in Swahili glosses: "]/] inflected form of -ake".
    for (const s of entry.senses ?? []) if (s.glosses) s.glosses = s.glosses.map((g) => g.replace(/^[\]/\s]+(?=\S)/, ''));
    // Mandarin: the entry speaks for its Simplified spelling; the Traditional one becomes a form.
    const simplified = source.code === 'zh' ? toSimplified(entry.word) : undefined;
    if (simplified) {
      traditionalOf.set(simplified, (traditionalOf.get(simplified) ?? new Set()).add(entry.word));
      entry.word = simplified;
    }
    yield entry;
  }
}

function readFrequency(source: PackSource): { forms: string[]; counts: Map<string, number> } {
  const counts = new Map<string, number>();
  const out: string[] = [];
  // Japanese and Mandarin: words counted the way the reader splits them; Latin and Swahili: blended
  // with everyday text (count.ts).
  let file = frequencyFile(source);
  if (source.opus || source.corpora) {
    if (existsSync(countedFile(source))) file = countedFile(source);
    else console.warn(`  ${source.code}: no counted-${source.code}.txt (run count.ts first); using FrequencyWords' list`);
  }
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const [word, n] = line.trim().split(' ');
    if (!word || !hasLetter.test(word) || /\d/.test(word)) continue;
    const norm = normalizeWord(word, source.code);
    // Spellings that normalise alike (Капитан / капитан) share one count.
    if (counts.has(norm)) {
      counts.set(norm, counts.get(norm)! + (Number(n) || 0));
      continue;
    }
    if (out.length >= FREQ_LOOKUP) continue;
    counts.set(norm, Number(n) || 0);
    out.push(norm);
  }
  return { forms: out, counts };
}

/** Short, self-contained usage examples (not literary quotations), with a translation unless English. */
function usableExamples(senses: KaikkiSense[], lang: string): [string, string][] {
  const out: [string, string][] = [];
  for (const sense of senses) {
    for (const ex of sense.examples ?? []) {
      const text = ex.text?.replace(/\s+/g, ' ').trim();
      const translation = (ex.translation ?? ex.english ?? '').replace(/\s+/g, ' ').trim();
      if (!text || ex.ref || ex.type === 'quotation' || /[―|[\]{}]/.test(text)) continue;
      if (translation.length > 140) continue;
      // Mandarin and Japanese have no spaces: a sentence of 5 to 40 characters is about as long.
      if (UNSPACED.has(lang)) {
        if (text.length < 5 || text.length > 40) continue;
      } else {
        if (text.length < 12 || text.length > 110) continue;
        const words = text.split(' ').length;
        if (words < 3 || words > 14) continue;
      }
      if (lang !== 'en' && !translation) continue;
      out.push([text, lang === 'en' ? '' : translation]);
      if (out.length >= 4) return out;
    }
  }
  return out;
}

const segmenters = new Map<string, Intl.Segmenter>();
/** Word segments of a sentence with their offsets and normalised forms. */
function wordsOf(text: string, lang: string): { start: number; end: number; norm: string }[] {
  let seg = segmenters.get(lang);
  if (!seg) segmenters.set(lang, (seg = new Intl.Segmenter(lang, { granularity: 'word' })));
  const out: { start: number; end: number; norm: string }[] = [];
  // Japanese runs are split by the pack's own words, as the reader splits them (core/text/tokenizer.ts).
  const lex = lang === 'ja' ? japaneseLexicon : null;
  const runs = lex ? [...text.matchAll(JAPANESE_RUN)].map((m) => [m.index, m.index + m[0].length] as const) : [];
  for (const [start, end] of runs) {
    for (const w of segmentJapanese(text.slice(start, end), lex!)) {
      out.push({ start: start + w.start, end: start + w.end, norm: normalizeWord(text.slice(start + w.start, start + w.end), lang) });
    }
  }
  for (const s of seg.segment(text)) {
    if (runs.some(([a, b]) => s.index >= a && s.index < b)) continue;
    if (s.isWordLike && hasLetter.test(s.segment)) out.push({ start: s.index, end: s.index + s.segment.length, norm: normalizeWord(s.segment, lang) });
  }
  return runs.length ? out.sort((a, b) => a.start - b.start) : out;
}

function lexicalOf(entry: KaikkiEntry, lang: string, key: string, senses: KaikkiSense[]): LexicalData {
  const canonical = entry.forms?.find((f) => f.tags?.includes('canonical'))?.form;
  const display = canonical && cleanForm(canonical) ? cleanForm(canonical)! : entry.word;
  const tagPool = [...(entry.tags ?? []), ...(senses[0]?.tags ?? []), ...(entry.forms?.find((f) => f.tags?.includes('canonical'))?.tags ?? [])];
  const gender = tagPool.map((t) => GENDER[t]).find(Boolean) ?? '';
  const tableForms = new Set<string>();
  for (const f of entry.forms ?? []) {
    if (!f.form || !isInflection(f.tags)) continue;
    const clean = cleanForm(f.form);
    if (clean) tableForms.add(normalizeWord(clean, lang));
    if (tableForms.size >= MAX_TABLE_FORMS) break;
  }
  // A headword must spell the same word (stress marks and German capitals are fine; "CE" for ce,
  // "¿no" for no or Italian dictionary accents like "èssere" are not).
  const sameWord = display !== key && normalizeWord(display, lang) === key;
  const paradigm = paradigmOf(entry);
  // Meanings marked rare, archaic or regional go last; then the common meaning first.
  const usual = [...senses].sort((a, b) => Number(marginal(a)) - Number(marginal(b)));
  // A meaning that only names its grammar ("first-person singular prepositional pronoun") gets the
  // English word translators use for it: "me (first-person singular prepositional pronoun)".
  // Only when no usual meaning says it in words ("seu" has "his", "her" beside its grammar note).
  const onlyNotes = usual.filter((s) => !marginal(s)).every((s) => (s.glosses ?? []).every((g) => isGrammarNote(tidyGloss(g))));
  const word = onlyNotes ? plainWordFor(key, entry.pos) : undefined;
  const raw = usual.flatMap((s) => s.glosses ?? []).map((g) => (word && isGrammarNote(tidyGloss(g)) ? `${word} (${tidyGloss(g)})` : g));
  const glosses = cleanGlosses(raw, entry.pos);
  // Evidence doesn't lift a rare or regional meaning over the usual ones ("le" is "to her" before
  // the Spanish "her").
  const glossesOf = (list: KaikkiSense[]) => new Set(list.flatMap((s) => s.glosses ?? []).map(tidyGloss));
  const usualGlosses = glossesOf(usual.filter((s) => !marginal(s)));
  const rareGlosses = glossesOf(usual.filter(marginal));
  // What a form's own entry says it means counts extra ("dich": "accusative of du; you, thee" before
  // the reflexive "yourself").
  const saidGlosses = glossesOf(usual.filter((s) => s.tags?.includes(SAID)));
  const rarity = (g: string) => (rareGlosses.has(g) && !usualGlosses.has(g) ? 0.3 : 1) * (saidGlosses.has(g) ? 1.5 : 1);
  const ranked = glosses.map((g, i) => ({ g, i, s: glossScore(key, entry.pos, g) * listedFirst(i) * rarity(g) })).sort((a, b) => b.s - a.s || a.i - b.i);
  const reading: [string, string[]] = [entry.pos, ranked.map((r) => r.g).slice(0, MAX_GLOSSES)];
  if (senses.every(marginal)) marginalReadings.add(reading);
  const said = entryReading(entry, lang);
  return {
    head: sameWord ? display : '',
    paradigm,
    paradigmPos: paradigm.length ? entry.pos : '',
    ipa: entry.sounds?.find((s) => s.ipa)?.ipa ?? '',
    reading: said,
    gender: entry.pos === 'noun' ? gender : '',
    senses: [reading],
    senseReadings: [said],
    tableForms,
    examples: usableExamples(senses, lang),
    priority: entryPriority(entry, key, senses),
  };
}

/**
 * Which of several entries spelled alike speaks for the word: the lower-case entry (sein, verb)
 * before capitalised ones (das Sein), and abbreviations (CE, A, NO) last.
 */
function entryPriority(entry: KaikkiEntry, key: string, senses: KaikkiSense[]): number {
  // A name comes after a word spelled alike (森 is a forest before it is Mori).
  if (entry.pos === 'name') return 1;
  const abbreviation = entry.word !== key && entry.word === entry.word.toUpperCase();
  if (abbreviation || senses.every((s) => s.tags?.some((t) => t === 'abbreviation' || t === 'initialism' || t === 'acronym'))) return 2;
  // "я" is first the pronoun "I", not "the name of the Cyrillic letter Я".
  if (senses.every((s) => LETTER_NAME.test(s.glosses?.[0] ?? ''))) return 2;
  return entry.word === key ? 0 : 1;
}

/** "name of the letter Я", "nu; the Greek letter Ν, ν", "he; the Hebrew letter ה". */
const LETTER_NAME = /^(?:the )?name of the\b.*\bletter\b|^[^\s;,]+[;,] the (?:name of the )?(?:[\p{L}-]+ )*letter\b/iu;
/** Languages whose free-standing articles are mostly pronouns. */
const PRONOUN_ARTICLES = new Set(['sv', 'nb', 'no', 'da']);
/** Languages whose article forms are entered as pronouns, with the article only as their lemma. */
const ARTICLE_FORMS_AS_PRONOUNS = new Set(['el']);
/** A dictionary line that describes grammar or a form instead of saying the word. */
const isDescription = (g: string) => LEAD_NOTE.test(g) || FORM_DESCRIPTION.test(g) || /\bform of\b/i.test(g) || isGrammarNote(g);
/** A personal or question pronoun's English. */
const PERSONAL = /^(?:I|you|he|she|it|we|they|who|me|him|her|us|them|whom|thou|ye)\b/i;
/** Tag on the meaning a form-of entry states outright (see formMeaning). */
const SAID = 'lingua-said';

/** A part of a form-of gloss that names another form ("…; first-person singular preterite indicative of ser"). */
const FORM_DESCRIPTION =
  /\b(?:form|inflection|plural|singular|participle|gerund|infinitive|indicative|subjunctive|imperative|conditional|preterite|imperfect|[a-z]+-person|nominative|accusative|dative|genitive|apocopic|contraction|diminutive|augmentative|superlative|masculine|feminine|neuter|possessive) of\b|^representing\b/i;

/**
 * What a form-of or contraction sense says the word means: "accusative of ellos; them" → them,
 * "plural of él (“they, them”)" → they, them, "contraction of de + o, literally “of the, from the,
 * -'s”" → of the, from the. Verb forms ("first-person singular present indicative of ser") say nothing.
 */
const isContraction = (sense: KaikkiSense) => Boolean(sense.tags?.includes('contraction') || /^contraction of\b/i.test(sense.glosses?.[0] ?? ''));

function formMeaning(sense: KaikkiSense, pos: string): string[] {
  const gloss = sense.glosses?.[0] ?? '';
  const form = isContraction(sense) || Boolean(sense.form_of?.length);
  if (!form && !sense.alt_of?.length) return [];
  // What follows a semicolon or colon says it outright ("dative of nosotros: to us, for us"); a
  // bracket after the lemma can be the lemma's own meaning ("accusative of én (“I”): me").
  // (Outside brackets: "apocopic form of que (“that, which; only; etc.”)" says nothing outright.)
  const said = gloss
    .replace(/\s*\([^()]*\)/g, '')
    .split(/;\s*|:\s+/)
    .slice(1)
    .filter((p) => p.trim() && !FORM_DESCRIPTION.test(p));
  // A spelling variant counts only when it says so outright (Italian "ad": "…for euphony; to, at,
  // in"); its bracket is its word's meaning ("tête" for note de tête, “top note”).
  if (!form && !said.length) return [];
  const literal = /literally [“"]([^”"]+)[”"]/.exec(gloss)?.[1] ?? /\(\s*[“"]([^”"]+)[”"]\s*\)/.exec(gloss)?.[1];
  // A function word can say it after a comma too: "neuter singular of din, your, yours".
  const listed = FUNCTION_POS.has(pos) ? /\bof [^\s,]+, ([\p{L}' ]+(?:, [\p{L}' ]+)*)$/u.exec(gloss.replace(/\s*\([^()]*\)/g, ''))?.[1] : undefined;
  const parts = said.length ? said : literal ? literal.split(/,\s*/) : listed ? listed.split(/,\s*/) : [];
  return parts
    .map((p) => p.replace(/\s*\([^()]*\)/g, '').replace(/\s*\([^()]*\)/g, '').replace(/[“”"]/g, '').trim())
    .filter((p) => p && !p.startsWith('-') && p.length <= 30);
}

/** Meanings few readers will meet. Regional labels (Brazil, Portugal) are not among them. */
const MARGINAL = new Set(['rare', 'archaic', 'obsolete', 'dated', 'dialectal', 'proscribed', 'nonstandard', 'historical', 'uncommon', 'obsolete-form', 'poetic', 'neologism']);
const marginal = (sense: KaikkiSense) => Boolean(sense.tags?.some((t) => MARGINAL.has(t)));
/** Readings made only of such meanings ("les" as a neologism article) go after the word's usual ones. */
const marginalReadings = new WeakSet<object>();

/**
 * One gloss made short and plain: grammar tags ("[with prepositional] in, at") go, descriptions that
 * name their translation ("Translated as "this" or "that"") become it, and "to know: to be familiar
 * with…" keeps its head while "nominative case: you, thou" keeps its tail.
 */
function tidyGloss(raw: string): string {
  let s = raw.replace(/\[[^\]]*\]\s*/g, '').replace(/\s+/g, ' ').trim();
  const quoted = [...s.matchAll(/["“]([^"”]{1,30})["”]/g)].map((m) => m[1]);
  if (s.length > 40 && quoted.length && /translat|rendered|equivalent/i.test(s)) s = quoted.join(', ');
  // "The most common adverb of negation in French, typically translating into English as not, don't…" → not, don't
  const translating = /\btranslat\w* (?:into English )?as ([^.;()]+)/i.exec(s)?.[1];
  if (s.length > 40 && translating) s = translating.replace(/,?\s*etc\.?$/i, '').trim();
  // A colon inside brackets ("other (from something: -tól/-től)") is not the gloss's own.
  let depth = 0;
  let colon = -1;
  for (let i = 0; i < s.length - 1 && colon < 0; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') depth = Math.max(0, depth - 1);
    else if (!depth && s[i] === ':' && s[i + 1] === ' ') colon = i;
  }
  if (colon > 0) {
    const head = s.slice(0, colon);
    s = /^to\s/.test(head) || head.split(' ').length <= 2 ? head : s.slice(colon + 2);
  }
  return s.replace(/[\s.;,]+$/, '').trim();
}

/** Drops grammar labels ("As a copulative verb:") and letter names, tidies, de-duplicates, and puts "to …" first for verbs. */
function cleanGlosses(glosses: string[], pos: string): string[] {
  const out = [
    ...new Set(
      glosses
        .filter((g) => !/:\s*$/.test(g) && !LETTER_NAME.test(g) && !/^(?:same as|see)\b/i.test(g))
        .map((g) => tidyGloss(g.replace(/^(?:Used|Denotes)\b[^.]*\.\s+(?=\S)/, '')))
        .filter(Boolean),
    ),
  ];
  // "Third-person singular possessive determiner." beside "his", "her", "its": keep the words.
  if (out.some((g) => !isGrammarNote(g))) out.splice(0, out.length, ...out.filter((g) => !isGrammarNote(g)));
  return pos === 'verb' ? [...out.filter((g) => g.startsWith('to ')), ...out.filter((g) => !g.startsWith('to '))] : out;
}

function mergeLexical(into: LexicalData, add: LexicalData): void {
  const [first, second] = add.priority < into.priority ? [add, into] : [into, add];
  into.senses = [...first.senses, ...second.senses].slice(0, MAX_SENSES);
  into.senseReadings = [...first.senseReadings, ...second.senseReadings].slice(0, MAX_SENSES);
  into.ipa = first.ipa || second.ipa;
  into.reading = first.reading || second.reading;
  // Gender belongs to the first (main) sense only, e.g. "весь" (all) must not inherit "весь" (village, f).
  into.gender = into.senses[0][0] === 'noun' ? first.gender || second.gender : '';
  // A headword comes from the entry that speaks for the word ("sein", not "Sein").
  into.head = first.head || (second.priority === first.priority ? second.head : '');
  for (const f of add.tableForms) into.tableForms.add(f);
  // The table follows the main sense: the entry that speaks for the word, else whichever has one.
  const table = first.paradigm.length >= 2 ? first : second.paradigm.length >= 2 ? second : first;
  into.paradigm = table.paradigm;
  into.paradigmPos = table.paradigmPos;
  into.examples = [...first.examples, ...second.examples].slice(0, 4);
  into.priority = first.priority;
}

async function build(source: PackSource): Promise<void> {
  const lang = source.code;
  const started = Date.now();
  loadEvidence(lang);
  const { forms: freq, counts: freqCount } = readFrequency(source);
  spellings = await readSpellings(source);
  traditionalOf.clear();
  japaneseLexicon = null;
  const freqRank = new Map(freq.map((f, i) => [f, i + 1]));

  const lexical = new Map<string, LexicalData>();
  const formLinks = new Map<string, Set<string>>(); // form → lemmas (from form-of entries)
  const formDesc = new Map<string, string>();
  const formGloss = new Map<string, string>(); // verb form → what it means ("estoy" → am)
  const articleForms = new Set<string>(); // Greek article forms shown as "the" first (see lemmasFor)
  const linkPos = new Map<string, Set<string>>(); // "form|lemma" → the parts of speech it is a form of
  const notePos = (form: string, lemma: string, pos: string) => {
    const k = `${form}|${lemma}`;
    linkPos.set(k, (linkPos.get(k) ?? new Set()).add(pos));
  };
  /** Whether a form belongs to its lemma's main reading ("hittar" is the plural of the noun hit, not of the adverb). */
  const ofMainReading = (form: string, lemma: string) => {
    const pos = linkPos.get(`${form}|${lemma}`);
    return !pos || pos.has(lexical.get(lemma)?.senses[0]?.[0] ?? '');
  };
  const tableLinks = new Map<string, Set<string>>(); // form → lemmas (from inflection tables)
  const link = (map: Map<string, Set<string>>, form: string, lemma: string) => {
    let set = map.get(form);
    if (!set) map.set(form, (set = new Set()));
    set.add(lemma);
  };

  const absorb = (entry: KaikkiEntry, keep: (key: string) => boolean) => {
    const key = normalizeWord(entry.word, lang);
    const formOf = (entry.senses ?? []).filter((s) => s.form_of?.length || s.alt_of?.length);
    const real = (entry.senses ?? []).filter((s) => !s.form_of?.length && !s.alt_of?.length && s.glosses?.length);
    // Contractions and some forms mean something of their own: "do" (de + o) is "of the", "pelo" is
    // "by the", "ellos" (plural of él) is "they, them". That meaning comes first ("al" is "to the"
    // before "upon").
    let at = 0;
    for (const s of entry.senses ?? []) {
      const meaning = formMeaning(s, entry.pos);
      if (!meaning.length) continue;
      // A verb form's meaning ("estoy": am) glosses the form, while the verb stays its word.
      if (entry.pos === 'verb' && !isContraction(s)) {
        if (!formGloss.has(key)) formGloss.set(key, meaning.join(', '));
        continue;
      }
      // Only rarity labels carry over: contractions are tagged "abbreviation" too.
      real.splice(at++, 0, { glosses: meaning, tags: [...(s.tags ?? []).filter((t) => MARGINAL.has(t)), SAID] });
    }
    for (const s of formOf) {
      // Targets are words; Wiktionary sometimes leaves a note among them ("sometimes used when…").
      const targets = [...(s.form_of ?? []), ...(s.alt_of ?? [])].map((t) => normalizeWord(t.word, lang)).filter((t) => t && !/\s/.test(t) && t.length <= 30);
      for (const lemma of targets) {
        if (lemma === key) continue;
        link(formLinks, key, lemma);
        notePos(key, lemma, entry.pos);
      }
      // "Honorific alternative letter-case form of eu" describes "Eu", not "eu".
      if (!formDesc.has(key) && s.glosses?.[0] && targets.some((t) => t !== key)) {
        // "plural past of чита́ть (čitátʹ)." → "plural past of чита́ть" (romanisations and trailing punctuation removed)
        const desc = s.glosses[0].replace(/\s*\([^)]*\)/g, '').replace(/[\s:.]+$/, '');
        formDesc.set(key, shorten(desc, 80));
      }
    }
    if (!real.length || !keep(key)) return;
    const data = lexicalOf(entry, lang, key, real);
    // Nothing left once letter names and labels are gone ("ni" as the Greek letter nu).
    if (!data.senses[0][1].length) return;
    const existing = lexical.get(key);
    if (existing) mergeLexical(existing, data);
    else lexical.set(key, data);
    for (const f of data.tableForms) {
      if (!freqRank.has(f) || f === key) continue;
      link(tableLinks, f, key);
      notePos(f, key, entry.pos);
    }
  };

  // Pass 1: lexical data for frequent words, plus every form → lemma link.
  let count = 0;
  const headwords = new Set<string>(); // Japanese: every spelling with an entry of its own
  for await (const entry of readEntries(source)) {
    absorb(entry, (key) => freqRank.has(key));
    if (lang === 'ja') headwords.add(normalizeWord(entry.word, lang));
    if (++count % 200_000 === 0) console.log(`  ${lang}: ${count.toLocaleString()} entries…`);
  }

  // Japanese: a kanji spelling without an entry of its own is its kana entries (今日 → きょう,
  // こんにち, in Wiktionary's order). Kana entries' own lists of kanji are looser, so they count
  // only for kanji nothing else speaks for.
  const kanaTargets = new Map<string, string[]>();
  if (lang === 'ja') {
    const n = (w: string) => normalizeWord(w, lang);
    for (const [kanji, kanas] of spellings.kanaOfKanji) kanaTargets.set(n(kanji), kanas.map(n));
    for (const [kanji, kanas] of spellings.listedKana) {
      if (!kanaTargets.has(n(kanji)) && !headwords.has(n(kanji))) kanaTargets.set(n(kanji), kanas.map(n));
    }
    for (const [kanji, kanas] of kanaTargets) {
      if (headwords.has(kanji)) continue;
      for (const kana of kanas) link(formLinks, kanji, kana);
    }
  }
  headwords.clear();

  // Forms nothing links to: the language's own rules guess the word they come from (a Turkish
  // case ending, a Japanese conjugation), and the dictionary decides. For a kana word, also the
  // kanji entries that read so (たべました → たべる → 食べる).
  const ruleCandidates = new Map<string, Array<[word: string, reading: string]>>();
  for (const form of freq) {
    if (lexical.has(form) || formLinks.has(form) || tableLinks.has(form)) continue;
    const bases = baseCandidates(form, lang).map((b) => normalizeWord(b, lang));
    // A Simplified character with no entry of its own is its Traditional one's (着 → 著).
    if (lang === 'zh') bases.push([...form].map((c) => unihan.traditional.get(c) ?? c).join(''));
    const candidates: Array<[string, string]> = bases.map((b) => [b, '']);
    if (lang === 'ja') {
      for (const b of [form, ...bases]) {
        // A kana word's own redirect is enough (まだ → 未だ, though 未だ reads いまだ first); a
        // conjugation's base must also read that way.
        if (!hasKanji(b)) for (const k of spellings.kanjiOfKana.get(b) ?? []) candidates.push([normalizeWord(k, lang), b === form ? '' : toHiragana(b)]);
        else for (const kana of kanaTargets.get(b) ?? []) candidates.push([kana, '']);
      }
    }
    const unique = candidates.filter(([w], i) => w !== form && candidates.findIndex(([x]) => x === w) === i);
    if (unique.length) ruleCandidates.set(form, unique);
  }

  // Pass 2 (only if needed): lemmas reached through frequent forms but not frequent themselves.
  const needed = new Set<string>();
  for (const form of freq) {
    for (const map of [formLinks, tableLinks]) for (const l of map.get(form) ?? []) if (!lexical.has(l)) needed.add(l);
  }
  for (const list of ruleCandidates.values()) for (const [w] of list) if (!lexical.has(w)) needed.add(w);
  if (needed.size) {
    for await (const entry of readEntries(source)) {
      const key = normalizeWord(entry.word, lang);
      if (needed.has(key)) absorb(entry, (k) => needed.has(k));
    }
  }
  // Mandarin: a character with meanings of its own is not also an old variant's "alternative form"
  // (了 is not 嫽, 这 not 遮). Cantonese likewise.
  if (CHINESE.has(lang)) {
    for (const key of [...formLinks.keys()]) {
      if (!lexical.has(key)) continue;
      formLinks.delete(key);
      formDesc.delete(key);
    }
  }
  let ruleLinked = 0;
  for (const [form, list] of ruleCandidates) {
    // A kanji entry found through its kana must read that way.
    const hit = list.find(([w, reading]) => lexical.has(w) && (!reading || !lexical.get(w)!.reading || toHiragana(lexical.get(w)!.reading) === reading));
    if (!hit) continue;
    link(tableLinks, form, hit[0]);
    ruleLinked++;
  }

  // Wiktionary sometimes lacks a common word's main reading (Swedish "i" has only the archaic "ye",
  // not the preposition "in"): for the commonest words, a sure translation table fills it in.
  for (const [key, data] of lexical) {
    if ((freqRank.get(key) ?? Infinity) > 300) continue;
    // Only where nothing supports the readings it has ("ma" is "today", whatever "this" lists it).
    if (data.senses.some(([pos, gl]) => gl.some((g) => glossScore(key, pos, g) > 0))) continue;
    const sure = (evidence.get(key) ?? []).filter((e) => ['prep', 'conj', 'pron', 'det', 'article'].includes(e.pos) && e.position === 0 && e.share >= 0.5 && e.rank <= 100);
    for (const e of sure) {
      if (data.senses.some(([pos]) => sameishPos(pos, e.pos))) continue;
      data.senses.unshift([e.pos, [e.en]]);
      data.senseReadings.unshift(data.reading);
    }
  }

  // The most common words are mostly function words: there, "у" is "at, by" before the noun "Wu" and
  // "о" is "about" before the interjection "oh".
  // Beyond that, the common meaning first (translation evidence), with nouns and interjections
  // among the top 500 words counting for less.
  const weight = (pos: string) => (pos === 'noun' ? 2 : pos === 'intj' ? 1 : 0);
  for (const [key, data] of lexical) {
    const top = (freqRank.get(key) ?? Infinity) <= 500;
    // A noun counts for less only beside a reading that translates a common English word ("vilja" is
    // "to want" before "will"; "amigo" stays a friend before "friendly").
    const commonOther = top && data.senses.some(([pos, gl]) => pos !== 'noun' && gl.some((g) => glossMatch(key, pos, g, (e) => e.rank <= 1000).score > 0));
    const scored = data.senses.map((s, i) => {
      const score = Math.max(0, ...s[1].map((g) => glossScore(key, s[0], g))) * listedFirst(i);
      const damp = (top ? (s[0] === 'noun' ? (commonOther ? 0.5 : 1) : s[0] === 'intj' ? 0.75 : 1) : 1) * (marginalReadings.has(s) ? 0.3 : 1);
      return { s, i, score: score * damp, rare: Number(marginalReadings.has(s)) };
    });
    // Among the 50 commonest words an article is first an article (Greek "το" is "the" before "it",
    // German "dem" before "to whom"), when its dictionary line says the word, not only its grammar
    // ("Forms the partitive article"). Not in the Scandinavian languages, whose den, det and de are
    // mostly "it", "that" and "they".
    const articleFirst = (freqRank.get(key) ?? Infinity) <= 50 && !PRONOUN_ARTICLES.has(lang);
    const article = (s: PackSense) => Number(articleFirst && s[0] === 'article' && !isDescription(s[1][0] ?? ''));
    scored.sort((a, b) => article(b.s) - article(a.s) || b.score - a.score || a.rare - b.rare || (top ? weight(a.s[0]) - weight(b.s[0]) : 0) || a.i - b.i);
    if (scored.every((x, i) => x.i === i)) continue;
    data.senses = scored.map((x) => x.s);
    const readings = data.senseReadings;
    data.senseReadings = scored.map((x) => readings[x.i] ?? '');
    // The word is read the way its first meaning is (听 tīng "to listen", not the rare yǐn).
    data.reading = data.senseReadings[0] || data.reading;
    if (data.senses[0][0] !== 'noun') data.gender = '';
  }

  // Hand-checked meanings of the commonest words (fixes.ts) come first, under the part of speech of
  // the meaning they match.
  const fixes = GLOSS_FIXES[lang] ?? {};
  for (const [form, gloss] of Object.entries(fixes)) {
    let data = lexical.get(form);
    // A common word the dictionary keeps only as a name (日本, Japan) gets an entry of its own.
    const linked = [...(formLinks.get(form) ?? []), ...(tableLinks.get(form) ?? [])];
    if (!data && freqRank.has(form) && !linked.some((l) => lexical.has(l))) {
      const reading = READING_FIXES[lang]?.[form] ?? '';
      data = { head: '', paradigm: [], paradigmPos: '', ipa: '', reading, gender: '', senses: [['name', [gloss]]], senseReadings: [reading], tableForms: new Set(), examples: [], priority: 0 };
      lexical.set(form, data);
      continue;
    }
    if (!data) continue;
    const head = gloss.split(/[;,(]/)[0].trim().toLowerCase();
    const at = data.senses.findIndex(([, gl]) => gl.some((g) => plainGloss(g).toLowerCase().startsWith(head)));
    const pos = (at >= 0 ? data.senses[at] : data.senses[0])?.[0] ?? '';
    const sense: PackSense = [pos, [gloss, ...(at >= 0 ? data.senses[at][1].filter((g) => plainGloss(g).toLowerCase() !== head) : [])].slice(0, MAX_GLOSSES)];
    const reading = (at >= 0 ? data.senseReadings[at] : data.senseReadings[0]) || data.reading;
    const rest = data.senses.map((s, i) => [s, data.senseReadings[i] ?? ''] as const).filter((_, i) => i !== at);
    data.senses = [sense, ...rest.map(([s]) => s)].slice(0, MAX_SENSES);
    data.senseReadings = [reading, ...rest.map(([, r]) => r)].slice(0, MAX_SENSES);
    data.reading = reading;
    if (pos !== 'noun') data.gender = '';
  }
  // …and readings: 的 as a particle is "de" (Wiktionary gives only dì), 中 on its own なか.
  for (const [form, reading] of Object.entries(READING_FIXES[lang] ?? {})) {
    const data = lexical.get(form);
    if (!data) continue;
    data.reading = reading;
    data.senseReadings[0] = reading;
  }

  // Assemble forms and lemmas.
  const lemmaIndex = new Map<string, number>();
  const lemmas: PackLemma[] = [];
  const indexOf = (key: string) => {
    let i = lemmaIndex.get(key);
    if (i === undefined) {
      const d = lexical.get(key)!;
      // Mandarin and Japanese lemmas carry their reading where others carry IPA.
      i = lemmas.push([key, d.head, d.reading || d.ipa, d.gender, d.senses]) - 1;
      lemmaIndex.set(key, i);
    }
    return i;
  };
  const glossOf = (key: string) => plainGloss(lexical.get(key)?.senses[0]?.[1][0] ?? '');
  /** How well a lemma's meanings match what the form itself translates (0 when nothing says). */
  const fit = (form: string, key: string) => Math.max(0, ...(lexical.get(key)?.senses ?? []).flatMap(([pos, gl]) => gl.map((g) => glossScore(form, pos, g))));
  // A form's own translations pick the lemma's meaning that fits it: "mi" (of mío, "mine; of mine;
  // mine, my") is "my", with the matching word first.
  // Only function words and adjectives, and only a first translation or a sure second one of a common
  // English word ("sua" is in the second place of "its" and "you", which say little).
  const sure = (e: Evidence) => e.position === 0 || (e.position === 1 && e.share >= 0.6 && e.rank <= 300);
  // A form reads as the kind of word it is a form of: "azt" (accusative of the pronoun az) is "that", not "the".
  const glossAs = (form: string, key: string) => {
    const pos = linkPos.get(`${form}|${key}`);
    const senses = lexical.get(key)?.senses ?? [];
    const sense = (ofMainReading(form, key) ? senses[0] : senses.find(([p]) => pos?.has(p))) ?? senses[0];
    return plainGloss(sense?.[1][0] ?? '');
  };
  const glossFor = (form: string, key: string) => {
    if (form === key) return glossOf(key);
    if (!evidence.has(form)) return glossAs(form, key);
    let best = { score: 0, part: '', gloss: '' };
    for (const [pos, gl] of lexical.get(key)?.senses ?? []) {
      if (!FUNCTION_POS.has(pos) && pos !== 'adj') continue;
      for (const g of gl) {
        const m = glossMatch(form, pos, g, sure);
        if (m.score > best.score) best = { ...m, gloss: g };
      }
    }
    if (!best.score) return glossAs(form, key);
    const rest = plainGloss(best.gloss)
      .split(/[;,]\s*/)
      .map((p) => p.trim())
      .filter((p) => p && p !== best.part);
    return [best.part, ...rest].join(', ');
  };

  const forms = new Map<string, PackForm>();
  const addForm = (form: string, lemmaKeys: string[], desc = formDesc.get(form) ?? '') => {
    let keys = [...new Set(lemmaKeys)].filter((k) => lexical.has(k));
    // A word of its own stays among its readings ("comida" after comer, comido and comedir).
    keys = keys.length > 3 && keys.indexOf(form) > 2 ? [...keys.slice(0, 2), form] : keys.slice(0, 3);
    if (!keys.length || forms.has(form)) return;
    // A word that is itself the first lemma speaks for itself ("как" → how, not also "poo" from кака),
    // and so does a lemma the form's translations clearly prefer ("mis" → my, not also the note mi).
    const glossed = keys.filter((k) => glossOf(k));
    const fits = glossed.slice(0, 2).map((k) => fit(form, k));
    const alone = glossed[0] === form || (fits[0] > 0 && fits[0] > 2 * (fits[1] ?? 0));
    // A second reading only through a word's side meaning stays in the list, not in the gloss ("es" is "is", not also the letter's plural).
    const shown = alone || !glossed[1] || !ofMainReading(form, glossed[1]) ? glossed.slice(0, 1) : glossed.slice(0, 2);
    let glosses = [...new Set(shown.map((k) => glossFor(form, k)).filter(Boolean))];
    // A Greek article form reads "the", then its pronoun meaning.
    if (articleForms.has(form)) {
      const art = lexical.get(keys[0])?.senses.find(([pos]) => pos === 'article');
      if (art) glosses = [...new Set([plainGloss(art[1][0] ?? ''), ...glosses.slice(1)])].filter(Boolean);
    }
    // What Wiktionary says the verb form itself means ("estoy" → am) reads better than its infinitive.
    const meaning = formGloss.get(form);
    if (meaning && keys[0] !== form && lexical.get(keys[0])?.senses[0]?.[0] === 'verb') glosses = [meaning];
    // A contraction without a meaning of its own reads as its parts: "dela" (de + ela) → "of + she".
    const parts = /^contraction of ([^\s,:;]+) \+ ([^\s,:;]+)/i.exec(desc);
    if (!lexical.has(form) && parts) {
      const first = (k: string) => glossOf(normalizeWord(k, lang)).split(/[;,]/)[0].trim();
      const joined = [first(parts[1]), first(parts[2])].filter(Boolean);
      if (joined.length === 2) glosses = [joined.join(' + ')];
    }
    // The commonest function words: when Wiktionary's wording doesn't lead with the usual English
    // equivalent ("in the nominative case; I", "nu; the Greek letter"), that equivalent is the gloss.
    const lead = (glosses[0] ?? '').split(/[;,]/)[0].toLowerCase();
    // Only where the wording reads like a description, a grammar label or the word itself.
    // (A gloss that is the word itself only describes it when no table says so: French "me" is "me".)
    const itself = lead === form && !(evidence.get(form) ?? []).some((e) => e.en === lead);
    const describes = !lead || itself || /\b(?:form|pronoun|case|person|apocopic|letter|used|makes|auxiliary|plural|singular|masculine|feminine|nominative|dative|accusative|genitive|indicates|denotes)\b/i.test(glosses[0] ?? '');
    // A form of a personal pronoun is what its own table says, not what its lemma says (Russian "нас"
    // is "us", not "we"; Greek "αυτόν" is "him"). Demonstratives don't get this: tables list
    // Portuguese "esses" under "these".
    const lemmaPos = lexical.get(keys[0])?.senses[0]?.[0] ?? '';
    const personal = (lexical.get(keys[0])?.senses ?? []).some(([pos, gl]) => pos === 'pron' && PERSONAL.test(plainGloss(gl[0] ?? '')));
    const inflected = keys[0] !== form && personal && (freqRank.get(form) ?? Infinity) <= 2000;
    if (((freqRank.get(form) ?? Infinity) <= 300 && describes) || inflected) {
      const usual = (evidence.get(form) ?? [])
        .filter((e) => FUNCTION_POS.has(e.pos) && e.position === 0 && e.share >= 0.5 && e.rank <= 2000)
        .filter((e) => !inflected || e.pos === 'pron')
        // English articles only stand for articles.
        .filter((e) => !['a', 'an', 'the'].includes(e.en) || ['article', 'det'].includes(e.pos))
        .sort((a, b) => a.rank - b.rank);
      const cased = (en: string) => (en === 'i' ? 'I' : en === 'ok' ? 'OK' : en);
      if (usual.length && !usual.some((e) => lead.split(/\s+/).includes(e.en) || lead === e.en)) glosses = [[...new Set(usual.map((e) => cased(e.en)))].slice(0, 2).join('; ')];
    }
    // The plural of a demonstrative: "estos" (of este, this) is "these", "esses" (of esse, that) "those".
    if (keys[0] !== form && ['det', 'pron'].includes(lemmaPos) && /\bplural\b/.test(desc)) {
      glosses = glosses.map((g) => g.replace(/^this\b/, 'these').replace(/^that\b/, 'those'));
    }
    // A form of a form reads like the form it comes from ("tus", the plural of tu, is "your" like tu).
    const through = lexical.has(form) ? undefined : [...(formLinks.get(form) ?? [])].find((l) => !lexical.has(l) && forms.get(l)?.[1][0] === indexOf(keys[0]));
    if (through) glosses = [forms.get(through)![2]];
    if (fixes[form]) glosses = [fixes[form]];
    const reading = readingFor(form, keys[0]);
    const entry: PackForm = [form, keys.map(indexOf), shorten(glosses.join('; ').replace(/[\s;,]+$/, ''), SHORT_GLOSS), desc];
    if (reading) entry.push(reading);
    forms.set(form, entry);
  };
  /**
   * The reading over a form: Mandarin, its lemma's pinyin; Japanese, for a spelling with kanji, the
   * kana entry it spells (今日 → きょう) or its dictionary form's reading carried over (食べました →
   * たべました).
   */
  function readingFor(form: string, lemma: string): string {
    if (CHINESE.has(lang)) return lexical.get(lemma)?.reading ?? '';
    if (lang !== 'ja' || !hasKanji(form)) return '';
    if (!hasKanji(lemma)) {
      if (kanaTargets.get(form)?.includes(lemma)) return lemma;
      // A conjugated kanji spelling of a kana entry: 食べました, through 食べる, of たべる.
      for (const base of deinflect(form)) if (kanaTargets.get(base)?.includes(lemma)) return readingOf(form, base, lemma) ?? '';
      return '';
    }
    const lemmaReading = lexical.get(lemma)?.reading;
    return lemmaReading ? (readingOf(form, lemma, lemmaReading) ?? '') : '';
  }
  // Lemma order: a word's own meaning first ("весь" → all, "дома" → at home), except nouns/adjectives that
  // are also forms of a very common verb ("είναι" → to be, not "being"). Inflection tables only count when
  // Wiktionary has no direct link (pronoun tables list every pronoun).
  // How often a word is met through forms that are no other word's: "haber" itself is rarer than
  // "hemos", "han" and "habían".
  const reach = new Map<string, number>();
  for (const form of freq) {
    const links = formLinks.get(form);
    if (lexical.has(form) || links?.size !== 1) continue;
    const [l] = links;
    reach.set(l, (reach.get(l) ?? 0) + (freqCount.get(form) ?? 0));
  }
  const topCount = freqCount.get(freq[149]) ?? Infinity;
  const lemmasFor = (form: string) => {
    // The commonest word a form belongs to first ("são" is a form of ser before it is one of santo).
    // How often a lemma is met: as itself or through its forms ("a" is first a form of avoir, whose
    // infinitive is rarer than "elle", but whose forms are everywhere).
    const met = (l: string) => Math.max(freqCount.get(l) ?? 0, reach.get(l) ?? 0);
    const byRank = (a: string, b: string) => met(b) - met(a) || (freqRank.get(a) ?? Infinity) - (freqRank.get(b) ?? Infinity);
    // A lemma's frequency speaks for the form only through its main reading ("hittar" is "find" before the noun "hit").
    const linked = [...(formLinks.get(form) ?? [])].sort((a, b) => Number(!ofMainReading(form, a)) - Number(!ofMainReading(form, b)) || byRank(a, b));
    // A Japanese kanji spelling's readings in Wiktionary's order (今日 is first きょう, then こんにち).
    const targets = kanaTargets.get(form);
    if (targets) {
      const order = (l: string) => (targets.includes(l) ? targets.indexOf(l) : targets.length);
      linked.sort((a, b) => order(a) - order(b));
    }
    const first = linked.filter((l) => lexical.has(l));
    // A form of a form: "tus" is the plural of "tu", itself the short form of tuyo.
    const further = [...new Set(linked.flatMap((l) => [...(formLinks.get(l) ?? [])]))].filter((l) => l !== form && lexical.has(l) && !first.includes(l)).sort(byRank);
    let direct = first.length ? first : further;
    // …which comes first where the form's own translations say so: "mis" (plural of mi, the note) is "my", of mío.
    const own = lexical.get(form);
    const ahead = own
      ? undefined
      : further
          .filter((l) => !direct.includes(l))
          .map((l) => ({ l, s: fit(form, l) }))
          .sort((a, b) => b.s - a.s)[0];
    if (ahead && ahead.s > 2 * Math.max(0, ...direct.map((l) => fit(form, l)))) direct = [ahead.l, ...direct];
    // Greek article forms double as pronouns and are entered only as pronouns: "το", "την", "του"
    // are first "the" (forms of ο), then "it", "her", "his".
    const theArticle =
      ARTICLE_FORMS_AS_PRONOUNS.has(lang) && (freqRank.get(form) ?? Infinity) <= 100 && !own?.senses.some(([pos]) => pos === 'article')
        ? direct.find((l) => lexical.get(l)?.senses[0]?.[0] === 'article')
        : undefined;
    if (theArticle) {
      articleForms.add(form);
      return [theArticle, ...(own ? [form] : []), ...direct.filter((l) => l !== theArticle)];
    }
    if (!own) return direct.length ? direct : [...(tableLinks.get(form) ?? [])];
    // An abbreviation or a letter (Portuguese "no" as "NO", northwest) gives way to what the form is of,
    // and so does a reading that only describes grammar ("había": "makes pluperfect to verbs…").
    const describesOnly = own.senses.every(([, gl]) => gl.every((g) => isGrammarNote(g) || (LEAD_NOTE.test(g) && !g.includes('; '))));
    if ((own.priority === 2 || describesOnly) && direct.length) return [...direct, form];
    const ownPos = own.senses[0]?.[0];
    // A word translators use for a common English word is itself first ("casa" is a house before it is "he marries").
    const ownIsCommon =
      ['noun', 'adj'].includes(ownPos) &&
      (evidence.get(form) ?? []).some(
        (e) =>
          (e.position === 0 ? e.share >= 0.3 : e.position === 1 && e.share >= 0.9) &&
          e.rank <= 1000 &&
          // …as that kind of word: "seus" is in the table of "their" as a determiner, not as "kin".
          own.senses.some(([pos, gl]) => sameishPos(pos, e.pos) && gl.some((g) => glossMatch(form, pos, g, (x) => x === e).score > 0)),
      );
    const commonVerb = direct.some((l) => lexical.get(l)?.senses[0]?.[0] === 'verb' && (freqRank.get(l) ?? Infinity) <= 2000);
    // Likewise for forms of the commonest words ("essa" is "that" before it is a catafalque, "boa" "good" before the snake).
    const commonWord = direct.some((l) => ['pron', 'det', 'article', 'adj', 'num'].includes(lexical.get(l)?.senses[0]?.[0] ?? '') && (freqRank.get(l) ?? Infinity) <= 300);
    // A form of the very commonest verbs is that verb, whatever else it spells ("era" is "was", not "era").
    const topVerb = direct.some((l) => lexical.get(l)?.senses[0]?.[0] === 'verb' && ((freqRank.get(l) ?? Infinity) <= 150 || (reach.get(l) ?? 0) >= topCount));
    const contentWord = ['noun', 'adj', 'intj', 'particle'].includes(ownPos);
    // So is an adverb or conjunction nothing translates as such ("he" is "I have" before "here is",
    // "quer" "wants" before "whether… or"; "fuera" stays "outside").
    // (Also a pronoun nothing translates: Quebec French "a" for elle is first "has".)
    if ((contentWord || (['adv', 'conj', 'pron', 'prep'].includes(ownPos) && !fit(form, form))) && topVerb) return [...direct, form];
    const list = contentWord && (commonVerb || commonWord) && !ownIsCommon ? [...direct, form] : [form, ...direct];
    // What the form itself translates decides between its readings: Spanish "mi" is "my" (a form of
    // mío) before it is the note mi, "su" is "his, her" before "apocopic form of suyo".
    // Only to move the form's own reading aside, never to put it before a verb chosen above.
    if (list[0] !== form) return list;
    const ownFit = fit(form, form);
    const better = list.slice(1).map((l) => ({ l, s: fit(form, l) })).sort((a, b) => b.s - a.s)[0];
    return better && better.s > 2 * ownFit ? [better.l, ...list.filter((l) => l !== better.l)] : list;
  };

  for (const form of freq) addForm(form, lemmasFor(form));
  const lemmaRank = new Map<string, number>();
  for (const [form, entry] of forms) {
    const rank = freqRank.get(form) ?? Infinity;
    for (const i of entry[1]) {
      const key = lemmas[i][0];
      lemmaRank.set(key, Math.min(lemmaRank.get(key) ?? Infinity, rank));
    }
  }
  for (const key of [...lemmaIndex.keys()]) addForm(key, [key]);
  for (const [key, rank] of lemmaRank) {
    if (rank > TABLE_FORMS_LEMMA_RANK) continue;
    for (const f of lexical.get(key)?.tableForms ?? []) addForm(f, [key]);
  }

  // Spelling variants found in real texts: Russian е for ё (пришел), Greek without accents (ειναι).
  // Added only where the variant isn't a word of its own.
  const variantOf = (form: string): string | null => {
    if (lang === 'ru') return form.includes('ё') ? form.replaceAll('ё', 'е') : null;
    // Arabic texts often leave out the hamza (ان for أن, الى for إلى) and write ى as ي.
    if (lang === 'el' || lang === 'ar') return foldKey(form, lang);
    return null;
  };
  const variants = new Map<string, Set<number>>();
  for (const [form, entry] of forms) {
    const v = variantOf(form);
    if (!v || v === form || forms.has(v)) continue;
    let set = variants.get(v);
    if (!set) variants.set(v, (set = new Set()));
    for (const i of entry[1]) set.add(i);
  }
  for (const [v, idx] of variants) addForm(v, [...idx].map((i) => lemmas[i][0]), formDesc.get(v) ?? '');

  // Mandarin: a word's Traditional spelling finds its Simplified entry (學校 → 学校).
  if (lang === 'zh') {
    for (const key of [...lemmaIndex.keys()]) {
      for (const trad of traditionalOf.get(key) ?? []) addForm(normalizeWord(trad, lang), [key], `Traditional spelling of ${key}`);
    }
  }

  // Mandarin: the browser's splitter joins some words no dictionary lists (我的, 不知道); they read as
  // their parts, "我 + 的", like a contraction.
  let compounds = 0;
  if (CHINESE.has(lang)) {
    const known = (w: string) => Boolean(lexical.get(w)?.senses[0]?.[1].length);
    for (const form of freq) {
      const chars = [...form];
      if (forms.has(form) || chars.length < 2 || chars.length > 8) continue;
      // Fewest parts, each a dictionary word.
      const best: Array<string[] | null> = [[]];
      for (let end = 1; end <= chars.length; end++) {
        best[end] = null;
        for (let len = Math.min(4, end); len >= 1; len--) {
          const prev = best[end - len];
          const part = chars.slice(end - len, end).join('');
          if (prev && known(part) && (!best[end] || prev.length + 1 < best[end]!.length)) best[end] = [...prev, part];
        }
      }
      const parts = best[chars.length];
      if (!parts || parts.length < 2) continue;
      const gloss = parts.map((p) => glossOf(p).split(/[;,]/)[0].trim()).join(' + ');
      const readings = parts.map((p) => lexical.get(p)?.reading ?? '');
      const entry: PackForm = [form, parts.map(indexOf), shorten(gloss, SHORT_GLOSS), parts.join(' + ')];
      // Pinyin joins a word's syllables; Jyutping keeps them apart.
      if (readings.every(Boolean)) entry.push(readings.join(lang === 'yue' ? ' ' : ''));
      forms.set(form, entry);
      compounds++;
    }
    // Traditional spellings met in Simplified texts (這是) read as the Simplified word.
    for (const form of freq) {
      if (forms.has(form)) continue;
      const simp = [...form].map((c) => unihan.simplified.get(c) ?? c).join('');
      const same = simp !== form ? forms.get(simp) : undefined;
      if (!same) continue;
      const entry: PackForm = [form, same[1], same[2], `Traditional spelling of ${simp}`];
      if (same[4]) entry.push(same[4]);
      forms.set(form, entry);
    }
  }

  // Japanese: from here on, example sentences and themed words are split by the pack's own words.
  if (lang === 'ja') {
    japaneseLexicon = {
      has: (w) => forms.has(w) || lexical.has(w),
      cost: (w) => {
        const rank = freqRank.get(w);
        return rank ? Math.log(rank + 20) : 11.5;
      },
    };
  }

  // Lemma frequency: every frequent form counts towards its main lemma (было, были → быть).
  const lemmaCount = new Map<number, number>();
  for (const form of freq) {
    const main = forms.get(form)?.[1][0];
    if (main !== undefined) lemmaCount.set(main, (lemmaCount.get(main) ?? 0) + (freqCount.get(form) ?? 0));
  }
  const lemmaFreq = [...lemmaCount.entries()]
    .filter(([i]) => lemmas[i][4][0]?.[1].length)
    .sort((a, b) => b[1] - a[1])
    .slice(0, LEMMA_FREQ_KEEP)
    .map(([i]) => i);

  // Inflection tables for the most frequent lemmas. Tag sets repeat across words, so each is stored once.
  const tagSets: string[] = [];
  const tagIndex = new Map<string, number>();
  const paradigms: PackParadigm[] = [];
  for (const i of lemmaFreq.slice(0, PARADIGM_KEEP)) {
    const own = lexical.get(lemmas[i][0]);
    if (!own || own.paradigm.length < 2) continue;
    const rows = own.paradigm.map(([form, key]): [string, number] => {
      let t = tagIndex.get(key);
      if (t === undefined) tagIndex.set(key, (t = tagSets.push(key) - 1));
      return [form, t];
    });
    paradigms.push([i, own.paradigmPos, rows]);
  }

  // Examples for those lemmas, each with the span of the lemma's form for cloze exercises.
  const examples: PackExample[] = [];
  lemmaFreq.forEach((i, rank) => {
    const key = lemmas[i][0];
    const own = lexical.get(key);
    let kept = 0;
    for (const [text, translation] of own?.examples ?? []) {
      const hit = wordsOf(text, lang).find((w) => w.norm === key || forms.get(w.norm)?.[1].includes(i) || own?.tableForms.has(w.norm));
      if (!hit) continue;
      examples.push([i, text, translation, hit.start, hit.end]);
      if (++kept >= (rank < EXAMPLES_RICH_RANK ? 2 : 1)) break;
    }
  });

  // Themed lists: of themes.ts' candidates take the first this dictionary knows; a rare first choice
  // gives way to a common, non-regional alternative (chuño → patata). Gender comes from the dictionary.
  const themesFile = new URL('themes.json', CACHE_DIR);
  const rawThemes = existsSync(themesFile) ? (JSON.parse(readFileSync(themesFile, 'utf8')) as Record<string, Record<string, ThemeCandidates[]>>)[lang] : undefined;
  if (!rawThemes) console.warn(`  ${lang}: no themed lists (run themes.ts first)`);
  const known = (phrase: string) => wordsOf(phrase, lang).every((w) => forms.has(w.norm) || lexical.has(w.norm));
  const rankOf = (phrase: string) => Math.max(...wordsOf(phrase, lang).map((w) => freqRank.get(w.norm) ?? Infinity));
  const pickTheme = (candidates: ThemeCandidates[0]) => {
    if (candidates[0]?.[2] === -1) return candidates[0];
    const usable = candidates.filter(([w]) => known(w));
    const list = usable.length ? usable : candidates;
    if (rankOf(list[0][0]) > 20_000) {
      const better = list
        .slice(1)
        .filter((c) => c[2] === 0 && rankOf(c[0]) <= 10_000)
        .sort((a, b) => rankOf(a[0]) - rankOf(b[0]))[0];
      if (better) return better;
    }
    return list[0];
  };
  const themes = rawThemes
    ? Object.fromEntries(
        Object.entries(rawThemes).map(([theme, items]) => [
          theme,
          items.map(([candidates, meaning, pos]): PackThemeItem => {
            const [term, tagGender] = pickTheme(candidates);
            const single = wordsOf(term, lang);
            const own = single.length === 1 ? lexical.get(single[0].norm) : undefined;
            const gender = pos === 'noun' ? (own?.senses[0]?.[0] === 'noun' && own.gender) || tagGender : '';
            return [term, meaning, pos, gender];
          }),
        ]),
      )
    : undefined;

  const pack: PackFile = {
    format: PACK_FORMAT,
    lang,
    gloss: 'en',
    version: PACK_VERSION,
    builtAt: new Date().toISOString(),
    source: `Wiktionary via kaikki.org (CC BY-SA 4.0) · ${
      source.leipzig
        ? `Leipzig Corpora Collection, Wikipedia (CC BY 4.0)${source.corpora ? ` · OPUS ${source.corpora.map((c) => c.split('/')[0]).join(', ')}` : ''}`
        : source.opus
          ? 'OPUS OpenSubtitles 2018, counted for Lingua'
          : 'FrequencyWords, OpenSubtitles 2018 (CC BY-SA 4.0)'
    }`,
    freq: freq.slice(0, FREQ_KEEP),
    lemmas,
    forms: [...forms.values()],
    lemmaFreq,
    examples,
    themes,
    paradigms,
    tagSets,
  };

  mkdirSync(PACKS_DIR, { recursive: true });
  const gz = gzipSync(JSON.stringify(pack), { level: 9 });
  writeFileSync(new URL(packFileName(lang), PACKS_DIR), gz);

  const covered = (n: number) => (freq.slice(0, n).filter((f) => forms.has(f)).length / Math.min(n, freq.length)) * 100;
  console.log(
    `✓ ${lang}: ${lemmas.length.toLocaleString()} lemmas, ${forms.size.toLocaleString()} forms, ` +
      `${(gz.length / 1e6).toFixed(1)} MB · glossed: top 1k ${covered(1000).toFixed(1)}%, top 10k ${covered(10_000).toFixed(1)}% · ` +
      `${lemmaFreq.length.toLocaleString()} ranked lemmas, ${examples.length.toLocaleString()} examples, ` +
      `${paradigms.length.toLocaleString()} tables (${tagSets.length} tag sets), ` +
      `${Object.values(themes ?? {}).reduce((n, list) => n + list.length, 0)} themed words · ` +
      `${ruleLinked.toLocaleString()} forms linked by rule · ` +
      (compounds ? `${compounds.toLocaleString()} read as their parts · ` : '') +
      `${((Date.now() - started) / 1000).toFixed(0)} s` +
      (malformed ? ` · ${malformed} malformed lines skipped` : ''),
  );
  malformed = 0;
}

const wanted = process.argv.slice(2);
for (const source of PACK_SOURCES.filter((s) => !wanted.length || wanted.includes(s.code))) {
  await build(source);
}
console.log(`Packs written to ${fileURLToPath(PACKS_DIR)}`);
