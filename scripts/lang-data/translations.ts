// Which common English words translate to which words of each language, from the translation tables
// of English Wiktionary (kaikki-en). The pack builder uses it to put a word's common meaning first:
// "obrigado" is first "thank you" (the table of "thank you" lists it) before "obligatory".
//   node scripts/lang-data/translations.ts   → scripts/.cache/en-translations.json
import { createReadStream, readFileSync, writeFileSync } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { CACHE_DIR, frequencyFile, kaikkiFile, PACK_SOURCES } from './sources.ts';

/** English words beyond this frequency rank are too rare to say what is common. */
const EN_KEEP = 30_000;
/** Translation-table codes per pack language (Mandarin and Norwegian appear under two codes). */
const CODES: Record<string, string[]> = {
  es: ['es'], pt: ['pt'], fr: ['fr'], it: ['it'], de: ['de'], sv: ['sv'], el: ['el'], hu: ['hu'], ru: ['ru'],
  ar: ['ar'], zh: ['cmn', 'zh'], nl: ['nl'], nb: ['nb', 'no'], tr: ['tr'], ja: ['ja'], ko: ['ko'], la: ['la'], sw: ['sw'], id: ['id'],
};

interface Translation { code?: string; word?: string; sense?: string; tags?: string[] }
interface Entry { word: string; pos: string; lang_code?: string; translations?: Translation[]; senses?: Array<{ translations?: Translation[] }> }

const en = PACK_SOURCES.find((s) => s.code === 'en')!;
const rank = new Map<string, number>();
for (const line of readFileSync(frequencyFile(en), 'utf8').split('\n')) {
  const word = line.trim().split(' ')[0];
  if (word && !rank.has(word) && rank.size < EN_KEEP) rank.set(word, rank.size + 1);
}

const byCode = new Map<string, string>();
for (const [lang, codes] of Object.entries(CODES)) for (const c of codes) byCode.set(c, lang);

/**
 * lang → target word → [English word, its part of speech, best position in a table (0 = first), share
 * of the English word's translation tables (its senses) that list the target word]. The share tells
 * a main translation from a side one: "ir" is in most tables of "go" but in one of "do" ("to fare").
 */
// Prototype-free maps: target words like "constructor" must not hit Object's own properties.
const out: Record<string, Record<string, Array<[string, string, number, number]>>> = Object.fromEntries(Object.keys(CODES).map((l) => [l, Object.create(null)]));

const stream = createReadStream(kaikkiFile(en)).pipe(createGunzip());
stream.setEncoding('utf8');
let buffer = '';
let entries = 0;
let kept = 0;
const take = (line: string) => {
  if (!line.includes('"translations"')) return;
  let entry: Entry;
  try {
    entry = JSON.parse(line) as Entry;
  } catch {
    return;
  }
  if (entry.lang_code && entry.lang_code !== 'en') return;
  const head = entry.word.toLowerCase();
  // Multi-word headwords count when common ("thank you", "of course"): rank of their rarest word.
  const r = Math.max(...head.split(' ').map((w) => rank.get(w) ?? Infinity));
  if (!Number.isFinite(r)) return;
  const all = [...(entry.translations ?? []), ...(entry.senses ?? []).flatMap((s) => s.translations ?? [])];
  // Per language: the tables (one per English sense) and, per target word, its best position and how
  // many tables list it.
  const tables = new Map<string, Map<string, number>>();
  const words = new Map<string, Map<string, { best: number; tables: Set<string> }>>();
  for (const t of all) {
    const sense = t.sense ?? '';
    const lang = t.code ? byCode.get(t.code) : undefined;
    if (!lang || !t.word) continue;
    const word = t.word.trim().toLowerCase();
    if (!word || word.length > 40) continue;
    let langTables = tables.get(lang);
    if (!langTables) tables.set(lang, (langTables = new Map()));
    const p = langTables.get(sense) ?? 0;
    langTables.set(sense, p + 1);
    let langWords = words.get(lang);
    if (!langWords) words.set(lang, (langWords = new Map()));
    const w = langWords.get(word) ?? { best: p, tables: new Set<string>() };
    w.best = Math.min(w.best, p);
    w.tables.add(sense);
    langWords.set(word, w);
  }
  for (const [lang, langWords] of words) {
    const total = tables.get(lang)!.size;
    for (const [word, w] of langWords) {
      const list = (out[lang][word] ??= []);
      if (list.some(([e, pos]) => e === head && pos === entry.pos)) continue;
      list.push([head, entry.pos, w.best, Math.round((w.tables.size / total) * 100) / 100]);
      kept++;
    }
  }
};
for await (const chunk of stream as AsyncIterable<string>) {
  buffer += chunk;
  let at: number;
  while ((at = buffer.indexOf('\n')) >= 0) {
    take(buffer.slice(0, at));
    buffer = buffer.slice(at + 1);
    if (++entries % 500_000 === 0) console.log(`  ${entries.toLocaleString()} English entries…`);
  }
}
take(buffer);

writeFileSync(new URL('en-translations.json', CACHE_DIR), JSON.stringify({ rank: Object.fromEntries(rank), translations: out }));
console.log(`✓ ${kept.toLocaleString()} translations for ${Object.keys(out).length} languages`);
