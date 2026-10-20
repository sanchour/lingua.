// Builds the full dictionary of a core language (4.0-2) from its Wiktionary extract (kaikki.org):
// every headword with a meaning of its own (not only a form of another word), ranked by frequency.
//   node scripts/lang-data/dictionary.ts            → the six core languages
//   node scripts/lang-data/dictionary.ts ru de      → only these
// Needs scripts/.cache/kaikki-<lang>.jsonl.gz (fetch.ts) and the language's pack in public/packs
// (for frequency ranks). Writes public/dict/<lang>.v<N>.json.gz.
//
// An entry keeps what the pack leaves out: every sense with its labels and examples, synonyms and
// antonyms, set phrases (Wiktionary's multi-word entries that contain the word, and its derived
// terms), the other half of aspect and gender pairs, the etymology, a recording, and words that
// are easily confused with it (one letter apart, or for Mandarin the same syllables in other tones).
import { createReadStream, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createGunzip, gunzipSync, gzipSync } from 'node:zlib';
import { normalizeWord } from '../../src/core/text/normalize.ts';
import { DICT_LANGS, DICT_VERSION, dictFileName } from '../../src/core/dictionary/format.ts';
import type { FullDictFile, FullEntry, FullSense } from '../../src/core/dictionary/format.ts';
import { packFileName } from '../../src/core/packs/format.ts';
import type { PackFile } from '../../src/core/packs/format.ts';
import { frequencyFile, kaikkiFile, PACK_SOURCES, unihanVariants } from './sources.ts';

/** Mandarin: Lingua keys words by their Simplified spelling (as the pack does); Wiktionary by the Traditional. */
function simplifiedChars(): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of readFileSync(unihanVariants, 'utf8').split('\n')) {
    const [from, field, to] = line.split('\t');
    if (field !== 'kSimplifiedVariant' || !to) continue;
    const char = (code: string) => String.fromCodePoint(parseInt(code.slice(2), 16));
    const target = to.split(' ')[0];
    if (from !== target) map.set(char(from), char(target));
  }
  return map;
}
const BAD_SIMPLIFIED = new Set(['alternative', 'obsolete', 'Second-Round-Simplified-Chinese']);

const MAX_SENSES = 14;
const MAX_EXAMPLES = 2;
const EXAMPLE_LEN = 180;
const MAX_LIST = 8;
const MAX_PHRASES = 14;
const ETYMOLOGY_LEN = 480;
const CONFUSED_RANK = 20_000;

/** Labels worth showing on a sense (Wiktionary has many more, mostly grammatical). */
const LABELS = new Set([
  'formal', 'informal', 'colloquial', 'slang', 'vulgar', 'derogatory', 'offensive', 'pejorative', 'literary', 'poetic', 'archaic', 'dated',
  'obsolete', 'rare', 'regional', 'dialectal', 'figuratively', 'idiomatic', 'humorous', 'euphemistic', 'endearing', 'childish', 'ironic',
  'diminutive', 'augmentative', 'transitive', 'intransitive', 'reflexive', 'impersonal', 'perfective', 'imperfective', 'uncountable',
  'Spain', 'Latin-America', 'Mexico', 'Argentina', 'Rioplatense', 'Caribbean', 'Chile', 'Colombia', 'Peru', 'Cuba', 'Austria', 'Switzerland',
  'Southern-Germany', 'Northern-Germany', 'Canada', 'Quebec', 'Belgium', 'Africa', 'Taiwan', 'Mainland-China', 'Hong-Kong', 'Cantonese',
  'Egypt', 'Gulf', 'Levantine', 'Maghreb', 'Classical', 'Internet', 'neologism', 'nonstandard', 'proscribed', 'Soviet', 'prison-slang',
]);
/** A sense only pointing at another form is the pack's business, not the dictionary's. */
const FORM_TAGS = new Set(['form-of', 'alt-of', 'abbreviation-of', 'misspelling']);
const PAIR_TAGS = new Set(['perfective', 'imperfective', 'feminine', 'masculine', 'plural', 'comparative', 'superlative']);
const STORY = /^(From|Inherited|Borrowed|Derived|Learned|Semi-learned|Compound|Calque|Clipping|Back-formation|Uncertain|Unknown|Probably|Possibly|Perhaps|Univerbation|Ideogrammic|Phono-semantic|Pictogram|Onomatopoeic|Coined|Blend|Short for|Abbreviation|Partial calque|Named after|Ultimately)\b/;
const IGNORED_FORM_TAGS = new Set(['canonical', 'romanization', 'error-unknown-tag', 'table-tags', 'inflection-template', 'class']);

interface Sound { ipa?: string; zh_pron?: string; mp3_url?: string; tags?: string[] }
interface Example { text?: string; english?: string; translation?: string; type?: string; bold_text_offsets?: Array<[number, number]> }
interface Sense { glosses?: string[]; tags?: string[]; qualifier?: string; examples?: Example[]; synonyms?: Array<{ word?: string }>; antonyms?: Array<{ word?: string }>; form_of?: unknown; alt_of?: unknown }
interface Entry {
  word?: string;
  pos?: string;
  senses?: Sense[];
  sounds?: Sound[];
  forms?: Array<{ form?: string; tags?: string[] }>;
  synonyms?: Array<{ word?: string }>;
  antonyms?: Array<{ word?: string }>;
  derived?: Array<{ word?: string }>;
  related?: Array<{ word?: string }>;
  etymology_text?: string;
}

async function* readLines(file: URL): AsyncGenerator<string> {
  const stream = createReadStream(file).pipe(createGunzip());
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

const words = (list: Array<{ word?: string }> | undefined, max = MAX_LIST) => [...new Set((list ?? []).map((x) => x.word?.trim()).filter((w): w is string => Boolean(w) && w!.length < 40))].slice(0, max);
const cap = (text: string, max: number) => (text.length <= max ? text : `${text.slice(0, max).replace(/[^.;]*$/, '').trim() || text.slice(0, max).trim()}…`);

/** Wiktionary's etymology without the "Etymology tree" lines that come first. */
function etymology(text: string | undefined): string | undefined {
  if (!text) return undefined;
  let lines = text.split('\n');
  if (lines[0].startsWith('Etymology tree')) {
    // The tree is a list of short "Language word" lines; the prose starts with how the word came about.
    const at = lines.findIndex((l, i) => i > 0 && (STORY.test(l) || l.length > 70));
    lines = at > 0 ? lines.slice(at) : [];
  }
  const out = lines.join(' ').replace(/\s+/g, ' ').trim();
  return out ? cap(out, ETYMOLOGY_LEN) : undefined;
}

function sense(s: Sense): FullSense | null {
  if (s.form_of || s.alt_of || s.tags?.some((t) => FORM_TAGS.has(t))) return null;
  const gloss = s.glosses?.at(-1)?.trim();
  if (!gloss) return null;
  const tags = [...new Set([...(s.tags ?? []).filter((t) => LABELS.has(t)), ...(s.qualifier ? [s.qualifier] : [])])].map((t) => t.replace(/-/g, ' '));
  const ex = (s.examples ?? [])
    .filter((x) => x.text && x.text.length <= EXAMPLE_LEN && (x.english || x.translation))
    .sort((a, b) => Number(a.type === 'quotation') - Number(b.type === 'quotation') || a.text!.length - b.text!.length)
    .slice(0, MAX_EXAMPLES)
    .map((x): [string, string?, number?, number?] => {
      const at = x.bold_text_offsets?.[0];
      return at ? [x.text!, x.english ?? x.translation, at[0], at[1]] : [x.text!, x.english ?? x.translation];
    });
  const out: FullSense = { g: [gloss] };
  if (tags.length) out.tags = tags;
  if (ex.length) out.ex = ex;
  const syn = words(s.synonyms, 6);
  const ant = words(s.antonyms, 4);
  if (syn.length) out.syn = syn;
  if (ant.length) out.ant = ant;
  return out;
}

function toEntry(e: Entry, lang: string): FullEntry | null {
  const senses = (e.senses ?? []).map(sense).filter((s): s is FullSense => s !== null);
  if (!senses.length) return null;
  // Old, rare and dated meanings go after the living ones; otherwise Wiktionary's order (main sense first).
  const late = (s: FullSense) => Number(Boolean(s.tags?.some((t) => t === 'archaic' || t === 'obsolete' || t === 'dated' || t === 'rare')));
  senses.sort((a, b) => late(a) - late(b));
  const entry: FullEntry = { pos: e.pos ?? '', senses: senses.slice(0, MAX_SENSES) };

  const canonical = e.forms?.find((f) => f.tags?.includes('canonical'))?.form;
  if (canonical && canonical !== e.word) entry.head = canonical;
  const sounds = e.sounds ?? [];
  const pinyin = lang === 'zh' ? (sounds.find((s) => s.zh_pron && s.tags?.includes('Mandarin') && s.tags.includes('Pinyin') && s.tags.includes('Standard')) ?? sounds.find((s) => s.zh_pron && s.tags?.includes('Mandarin') && s.tags.includes('Pinyin')))?.zh_pron : undefined;
  const ipa = [...new Set(sounds.filter((s) => s.ipa && (lang !== 'zh' || s.tags?.includes('Mandarin'))).map((s) => s.ipa!))].slice(0, 2);
  const pron = pinyin ? [pinyin, ...ipa.slice(0, 1)] : ipa;
  if (pron.length) entry.ipa = pron;
  const audio = sounds.find((s) => s.mp3_url)?.mp3_url;
  if (audio) entry.audio = audio;
  const tags = new Set([...(e.senses?.[0]?.tags ?? []), ...(e.forms?.find((f) => f.tags?.includes('canonical'))?.tags ?? [])]);
  const gender = tags.has('masculine') && tags.has('feminine') ? 'mf' : tags.has('masculine') ? 'm' : tags.has('feminine') ? 'f' : tags.has('neuter') ? 'n' : undefined;
  if (gender && (e.pos === 'noun' || e.pos === 'name')) entry.gender = gender;

  const pairs: Array<[string, string]> = [];
  for (const f of e.forms ?? []) {
    const t = (f.tags ?? []).filter((x) => !IGNORED_FORM_TAGS.has(x));
    if (!f.form || t.length !== 1 || !PAIR_TAGS.has(t[0]) || f.form === e.word || f.form === canonical) continue;
    if (t[0] === 'plural' && e.pos !== 'noun') continue;
    if (!pairs.some(([label]) => label === t[0])) pairs.push([t[0], f.form]);
  }
  if (pairs.length) entry.pair = pairs.slice(0, 4);

  const syn = words(e.synonyms);
  const ant = words(e.antonyms);
  const derived = words(e.derived, 40);
  const related = words(e.related);
  if (syn.length) entry.syn = syn;
  if (ant.length) entry.ant = ant;
  if (derived.length) entry.derived = derived.filter((w) => !/\s/.test(w)).slice(0, MAX_LIST);
  if (related.length) entry.related = related;
  // Derived terms of more than one word are set phrases.
  const phrases = derived.filter((w) => /\s/.test(w)).slice(0, MAX_PHRASES);
  if (phrases.length) entry.phrases = phrases.map((p) => [p]);
  const ety = etymology(e.etymology_text);
  if (ety) entry.ety = ety;
  return entry;
}

const firstGloss = (e: Entry) => e.senses?.map(sense).find((s) => s)?.g[0];

/** Words one letter apart (a deletion apart, which covers swaps of one letter too). */
function confusedOf(keys: string[]): Map<string, string[]> {
  const byVariant = new Map<string, string[]>();
  for (const k of keys) {
    const chars = [...k];
    const variants = new Set([k, ...chars.map((_, i) => [...chars.slice(0, i), ...chars.slice(i + 1)].join(''))]);
    for (const v of variants) byVariant.set(v, [...(byVariant.get(v) ?? []), k]);
  }
  const out = new Map<string, string[]>();
  for (const k of keys) {
    const chars = [...k];
    const near = new Set<string>();
    for (const v of [k, ...chars.map((_, i) => [...chars.slice(0, i), ...chars.slice(i + 1)].join(''))]) for (const other of byVariant.get(v) ?? []) if (other !== k) near.add(other);
    if (near.size) out.set(k, [...near]);
  }
  return out;
}

const toneless = (pinyin: string) => pinyin.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '').toLowerCase();
/** Arabic is compared without its vowel marks. */
const bare = (w: string, lang: string) => (lang === 'ar' ? w.replace(/[ً-ْٰ]/g, '') : w);

async function build(lang: string) {
  const source = PACK_SOURCES.find((s) => s.code === lang);
  if (!source) throw new Error(`No sources for ${lang}`);
  const pack = JSON.parse(gunzipSync(readFileSync(new URL(`../../public/packs/${packFileName(lang)}`, import.meta.url))).toString()) as PackFile;
  const rank = new Map<string, number>();
  (pack.lemmaFreq ?? []).forEach((li, i) => {
    const key = pack.lemmas[li]?.[0];
    if (key && !rank.has(key)) rank.set(key, i + 1);
  });
  const headOf = new Map(pack.lemmas.filter(([, head]) => head).map(([key, head]) => [key, head]));
  // How common each word is as written (50,000 forms), to order the words the pack doesn't rank.
  const formRank = new Map<string, number>();
  readFileSync(frequencyFile(source), 'utf8')
    .split('\n')
    .forEach((line, i) => {
      const form = normalizeWord(line.split(' ')[0] ?? '', lang);
      if (form && !formRank.has(form)) formRank.set(form, i + 1);
    });

  const simplified = lang === 'zh' ? simplifiedChars() : null;
  const found = new Map<string, { w: string; e: FullEntry[] }>();
  const phrases = new Map<string, Array<[string, string]>>();
  let lines = 0;
  for await (const line of readLines(kaikkiFile(source))) {
    lines++;
    if (lines % 200_000 === 0) console.log(`  ${lang}: ${lines.toLocaleString()} lines, ${found.size.toLocaleString()} words`);
    let e: Entry;
    try {
      e = JSON.parse(line) as Entry;
    } catch {
      continue;
    }
    const word = e.word?.trim();
    if (!word || !e.senses?.length || e.pos === 'name' || (e.pos === 'character' && lang !== 'zh')) continue;
    // A phrase of several words: kept with each word in it that the dictionary has.
    if (/\s/.test(word)) {
      if (word.length > 40 || e.pos === 'proverb') continue;
      const gloss = firstGloss(e);
      if (!gloss) continue;
      for (const token of new Set(word.split(/\s+/).map((t) => normalizeWord(t.replace(/[.,;:!?¿¡()«»"]/g, ''), lang)))) {
        if (!token) continue;
        const list = phrases.get(token) ?? [];
        if (list.length < 40) list.push([word, gloss.length > 70 ? cap(gloss, 70) : gloss]);
        phrases.set(token, list);
      }
      continue;
    }
    const entry = toEntry(e, lang);
    if (!entry) continue;
    let spelling = word;
    if (simplified) {
      const named = e.forms?.find((f) => f.form && f.tags?.includes('Simplified-Chinese') && !f.tags.some((t) => BAD_SIMPLIFIED.has(t)))?.form;
      spelling = named ?? ([...word].length === 1 ? (simplified.get(word) ?? word) : word);
      if (spelling !== word) entry.head ??= word;
    }
    const key = normalizeWord(spelling, lang);
    const row = found.get(key) ?? { w: spelling, e: [] };
    // Capitalised and lower-case words (German nouns and the rest) share a key: the form the pack ranks wins the headword.
    if (row.e.length === 0 || (spelling !== row.w && spelling === headOf.get(key))) row.w = spelling;
    row.e.push(entry);
    found.set(key, row);
  }

  // Phrases: shortest and most common first; a phrase already among the derived terms keeps its gloss here.
  for (const [key, row] of found) {
    const own = phrases.get(key) ?? [];
    if (!own.length) continue;
    own.sort((a, b) => a[0].split(' ').length - b[0].split(' ').length || a[0].length - b[0].length);
    const first = row.e[0];
    const listed = new Map((first.phrases ?? []).map(([p]) => [p, undefined as string | undefined]));
    for (const [p, g] of own) listed.set(p, g);
    first.phrases = [...listed].slice(0, MAX_PHRASES).map(([p, g]) => (g ? [p, g] : [p]));
  }

  // Easily confused: among the more common words only.
  const common = [...found.keys()].filter((k) => (rank.get(k) ?? Infinity) <= CONFUSED_RANK);
  const confused = new Map<string, string[]>();
  if (lang === 'zh') {
    const bySound = new Map<string, string[]>();
    for (const k of common) {
      const py = found.get(k)!.e.find((x) => x.ipa)?.ipa?.[0];
      if (!py) continue;
      const s = `${toneless(py)}|${[...k].length}`;
      bySound.set(s, [...(bySound.get(s) ?? []), k]);
    }
    for (const group of bySound.values()) if (group.length > 1 && group.length < 12) for (const k of group) confused.set(k, group.filter((o) => o !== k));
  } else {
    const keyed = new Map(common.filter((k) => [...k].length >= 4).map((k) => [bare(k, lang), k]));
    for (const [variant, others] of confusedOf([...keyed.keys()])) confused.set(keyed.get(variant)!, others.map((o) => keyed.get(o)!));
  }

  const out: FullDictFile = {
    format: 'lingua-dict',
    version: DICT_VERSION,
    lang,
    builtAt: new Date().toISOString().slice(0, 10),
    sources: ['Wiktionary via kaikki.org (CC BY-SA 4.0)', 'FrequencyWords (CC BY-SA 4.0) for ranks'],
    words: [...found]
      .map(([key, row]) => {
        const r = rank.get(key);
        const c = (confused.get(key) ?? []).sort((a, b) => (rank.get(a) ?? Infinity) - (rank.get(b) ?? Infinity)).slice(0, 4).map((k) => found.get(k)!.w);
        return { w: row.w, ...(r ? { r } : {}), ...(c.length ? { c } : {}), e: row.e };
      })
      // By lemma rank, then (for words the pack doesn't rank) by how common the word is as written.
      .sort((a, b) => (a.r ?? Infinity) - (b.r ?? Infinity) || (formRank.get(normalizeWord(a.w, lang)) ?? Infinity) - (formRank.get(normalizeWord(b.w, lang)) ?? Infinity)),
  };
  mkdirSync(new URL('../../public/dict/', import.meta.url), { recursive: true });
  const gz = gzipSync(JSON.stringify(out), { level: 9 });
  writeFileSync(new URL(`../../public/dict/${dictFileName(lang)}`, import.meta.url), gz);
  console.log(`✓ ${lang}: ${out.words.length.toLocaleString()} words, ${(gz.length / 1e6).toFixed(1)} MB`);
}

const wanted = process.argv.slice(2);
for (const lang of wanted.length ? wanted : DICT_LANGS) await build(lang);
