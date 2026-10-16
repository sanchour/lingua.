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
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createGunzip, gzipSync } from 'node:zlib';
import { foldKey, normalizeWord } from '../../src/core/text/normalize.ts';
import { PACK_FORMAT, PACK_VERSION, packFileName } from '../../src/core/packs/format.ts';
import type { PackExample, PackFile, PackForm, PackLemma, PackSense, PackThemeItem } from '../../src/core/packs/format.ts';
import { CACHE_DIR, frequencyFile, kaikkiFile, PACK_SOURCES, PACKS_DIR } from './sources.ts';
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

const SKIP_POS = new Set(['name', 'character', 'symbol', 'punct', 'prefix', 'suffix', 'infix', 'interfix', 'circumfix', 'affix', 'romanization']);
/** Related words listed in Wiktionary form tables that are not inflections of the headword. */
const NOT_INFLECTION = new Set([
  'romanization', 'canonical', 'table-tags', 'inflection-template', 'class', 'relational', 'diminutive', 'augmentative',
  'pejorative', 'hypocorism', 'expressive', 'noun-from-verb', 'adjective', 'adverb', 'abbreviation', 'alternative', 'error-unrecognized-form',
]);
const GENDER: Record<string, string> = { masculine: 'm', feminine: 'f', neuter: 'n', common: 'c' };

interface KaikkiForm { form?: string; tags?: string[] }
interface KaikkiExample { text?: string; english?: string; translation?: string; type?: string; ref?: string }
interface KaikkiSense { glosses?: string[]; tags?: string[]; form_of?: { word: string }[]; alt_of?: { word: string }[]; examples?: KaikkiExample[] }
interface KaikkiEntry {
  word: string;
  pos: string;
  tags?: string[];
  forms?: KaikkiForm[];
  senses?: KaikkiSense[];
  sounds?: { ipa?: string }[];
}

interface LexicalData {
  head: string;
  ipa: string;
  gender: string;
  senses: PackSense[];
  tableForms: Set<string>;
  /** Candidate usage examples: [sentence, translation]. */
  examples: [string, string][];
  /** 0 the word itself · 1 a capitalised entry · 2 an abbreviation (see entryPriority). */
  priority: number;
}

/** themes.ts output: [candidates as [word, gender tag, 0 · 1 regional · -1 hand-picked], meaning, pos] */
type ThemeCandidates = [Array<[string, string, number]>, string, string];

const hasLetter = /\p{L}/u;

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
    if (!entry.word || SKIP_POS.has(entry.pos) || /\s/.test(entry.word)) continue;
    yield entry;
  }
}

function readFrequency(source: PackSource): { forms: string[]; counts: Map<string, number> } {
  const counts = new Map<string, number>();
  const out: string[] = [];
  for (const line of readFileSync(frequencyFile(source), 'utf8').split('\n')) {
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
      if (text.length < 12 || text.length > 110 || translation.length > 140) continue;
      const words = text.split(' ').length;
      if (words < 3 || words > 14) continue;
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
  for (const s of seg.segment(text)) {
    if (s.isWordLike && hasLetter.test(s.segment)) out.push({ start: s.index, end: s.index + s.segment.length, norm: normalizeWord(s.segment, lang) });
  }
  return out;
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
  return {
    head: sameWord ? display : '',
    ipa: entry.sounds?.find((s) => s.ipa)?.ipa ?? '',
    gender: entry.pos === 'noun' ? gender : '',
    senses: [[entry.pos, cleanGlosses(senses.flatMap((s) => s.glosses ?? []), entry.pos).slice(0, MAX_GLOSSES)]],
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
  const abbreviation = entry.word !== key && entry.word === entry.word.toUpperCase();
  if (abbreviation || senses.every((s) => s.tags?.some((t) => t === 'abbreviation' || t === 'initialism' || t === 'acronym'))) return 2;
  // "я" is first the pronoun "I", not "the name of the Cyrillic letter Я".
  if (senses.every((s) => LETTER_NAME.test(s.glosses?.[0] ?? ''))) return 2;
  return entry.word === key ? 0 : 1;
}

const LETTER_NAME = /^(?:the )?name of the\b.*\bletter\b/i;

/**
 * One gloss made short and plain: grammar tags ("[with prepositional] in, at") go, descriptions that
 * name their translation ("Translated as "this" or "that"") become it, and "to know: to be familiar
 * with…" keeps its head while "nominative case: you, thou" keeps its tail.
 */
function tidyGloss(raw: string): string {
  let s = raw.replace(/\[[^\]]*\]\s*/g, '').replace(/\s+/g, ' ').trim();
  const quoted = [...s.matchAll(/["“]([^"”]{1,30})["”]/g)].map((m) => m[1]);
  if (s.length > 40 && quoted.length && /translat|rendered|equivalent/i.test(s)) s = quoted.join(', ');
  const colon = s.indexOf(': ');
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
        .filter((g) => !/:\s*$/.test(g) && !LETTER_NAME.test(g))
        .map((g) => tidyGloss(g.replace(/^(?:Used|Denotes)\b[^.]*\.\s+(?=\S)/, '')))
        .filter(Boolean),
    ),
  ];
  return pos === 'verb' ? [...out.filter((g) => g.startsWith('to ')), ...out.filter((g) => !g.startsWith('to '))] : out;
}

function mergeLexical(into: LexicalData, add: LexicalData): void {
  const [first, second] = add.priority < into.priority ? [add, into] : [into, add];
  into.senses = [...first.senses, ...second.senses].slice(0, MAX_SENSES);
  into.ipa = first.ipa || second.ipa;
  // Gender belongs to the first (main) sense only, e.g. "весь" (all) must not inherit "весь" (village, f).
  into.gender = into.senses[0][0] === 'noun' ? first.gender || second.gender : '';
  // A headword comes from the entry that speaks for the word ("sein", not "Sein").
  into.head = first.head || (second.priority === first.priority ? second.head : '');
  for (const f of add.tableForms) into.tableForms.add(f);
  into.examples = [...first.examples, ...second.examples].slice(0, 4);
  into.priority = first.priority;
}

async function build(source: PackSource): Promise<void> {
  const lang = source.code;
  const started = Date.now();
  const { forms: freq, counts: freqCount } = readFrequency(source);
  const freqRank = new Map(freq.map((f, i) => [f, i + 1]));

  const lexical = new Map<string, LexicalData>();
  const formLinks = new Map<string, Set<string>>(); // form → lemmas (from form-of entries)
  const formDesc = new Map<string, string>();
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
    for (const s of formOf) {
      for (const target of [...(s.form_of ?? []), ...(s.alt_of ?? [])]) {
        const lemma = normalizeWord(target.word, lang);
        if (lemma !== key) link(formLinks, key, lemma);
      }
      if (!formDesc.has(key) && s.glosses?.[0]) {
        // "plural past of чита́ть (čitátʹ)." → "plural past of чита́ть" (romanisations and trailing punctuation removed)
        const desc = s.glosses[0].replace(/\s*\([^)]*\)/g, '').replace(/[\s:.]+$/, '');
        formDesc.set(key, shorten(desc, 80));
      }
    }
    if (!real.length || !keep(key)) return;
    const data = lexicalOf(entry, lang, key, real);
    const existing = lexical.get(key);
    if (existing) mergeLexical(existing, data);
    else lexical.set(key, data);
    for (const f of data.tableForms) if (freqRank.has(f) && f !== key) link(tableLinks, f, key);
  };

  // Pass 1: lexical data for frequent words, plus every form → lemma link.
  let count = 0;
  for await (const entry of readEntries(source)) {
    absorb(entry, (key) => freqRank.has(key));
    if (++count % 200_000 === 0) console.log(`  ${lang}: ${count.toLocaleString()} entries…`);
  }

  // Pass 2 (only if needed): lemmas reached through frequent forms but not frequent themselves.
  const needed = new Set<string>();
  for (const form of freq) {
    for (const map of [formLinks, tableLinks]) for (const l of map.get(form) ?? []) if (!lexical.has(l)) needed.add(l);
  }
  if (needed.size) {
    for await (const entry of readEntries(source)) {
      const key = normalizeWord(entry.word, lang);
      if (needed.has(key)) absorb(entry, (k) => needed.has(k));
    }
  }

  // The most common words are mostly function words: there, "у" is "at, by" before the noun "Wu" and
  // "о" is "about" before the interjection "oh".
  const weight = (pos: string) => (pos === 'noun' ? 2 : pos === 'intj' ? 1 : 0);
  for (const [key, data] of lexical) {
    if ((freqRank.get(key) ?? Infinity) > 500) continue;
    const sorted = [...data.senses].sort((a, b) => weight(a[0]) - weight(b[0]));
    if (sorted[0] === data.senses[0]) continue;
    data.senses = sorted;
    if (data.senses[0][0] !== 'noun') data.gender = '';
  }

  // Assemble forms and lemmas.
  const lemmaIndex = new Map<string, number>();
  const lemmas: PackLemma[] = [];
  const indexOf = (key: string) => {
    let i = lemmaIndex.get(key);
    if (i === undefined) {
      const d = lexical.get(key)!;
      i = lemmas.push([key, d.head, d.ipa, d.gender, d.senses]) - 1;
      lemmaIndex.set(key, i);
    }
    return i;
  };
  const glossOf = (key: string) => lexical.get(key)?.senses[0]?.[1][0] ?? '';

  const forms = new Map<string, PackForm>();
  const addForm = (form: string, lemmaKeys: string[], desc = formDesc.get(form) ?? '') => {
    const keys = [...new Set(lemmaKeys)].filter((k) => lexical.has(k)).slice(0, 3);
    if (!keys.length || forms.has(form)) return;
    // A word that is itself the first lemma speaks for itself ("как" → how, not also "poo" from кака).
    const shown = keys[0] === form ? keys.slice(0, 1) : keys.slice(0, 2);
    const glosses = [...new Set(shown.map(glossOf).filter(Boolean))];
    forms.set(form, [form, keys.map(indexOf), shorten(glosses.join('; '), SHORT_GLOSS), desc]);
  };
  // Lemma order: a word's own meaning first ("весь" → all, "дома" → at home), except nouns/adjectives that
  // are also forms of a very common verb ("είναι" → to be, not "being"). Inflection tables only count when
  // Wiktionary has no direct link (pronoun tables list every pronoun).
  const lemmasFor = (form: string) => {
    const direct = [...(formLinks.get(form) ?? [])];
    const own = lexical.get(form);
    if (!own) return direct.length ? direct : [...(tableLinks.get(form) ?? [])];
    const ownPos = own.senses[0]?.[0];
    const commonVerb = direct.some((l) => lexical.get(l)?.senses[0]?.[0] === 'verb' && (freqRank.get(l) ?? Infinity) <= 2000);
    return commonVerb && ['noun', 'adj', 'intj', 'particle'].includes(ownPos) ? [...direct, form] : [form, ...direct];
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
    if (lang === 'el') return foldKey(form, lang);
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
    source: 'Wiktionary via kaikki.org (CC BY-SA 4.0) · FrequencyWords, OpenSubtitles 2018 (CC BY-SA 4.0)',
    freq: freq.slice(0, FREQ_KEEP),
    lemmas,
    forms: [...forms.values()],
    lemmaFreq,
    examples,
    themes,
  };

  mkdirSync(PACKS_DIR, { recursive: true });
  const gz = gzipSync(JSON.stringify(pack), { level: 9 });
  writeFileSync(new URL(packFileName(lang), PACKS_DIR), gz);

  const covered = (n: number) => (freq.slice(0, n).filter((f) => forms.has(f)).length / Math.min(n, freq.length)) * 100;
  console.log(
    `✓ ${lang}: ${lemmas.length.toLocaleString()} lemmas, ${forms.size.toLocaleString()} forms, ` +
      `${(gz.length / 1e6).toFixed(1)} MB · glossed: top 1k ${covered(1000).toFixed(1)}%, top 10k ${covered(10_000).toFixed(1)}% · ` +
      `${lemmaFreq.length.toLocaleString()} ranked lemmas, ${examples.length.toLocaleString()} examples, ` +
      `${Object.values(themes ?? {}).reduce((n, list) => n + list.length, 0)} themed words · ` +
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
