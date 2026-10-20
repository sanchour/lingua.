// Finds real example sentences for Grammatica's topics in a language pack (Wiktionary examples with
// their translations), so every drill sentence comes from the language's own data.
//
//   node scripts/grammar/mine.ts <lang> tags <tag,tag,-tag>   sentences with a form carrying these tags
//   node scripts/grammar/mine.ts <lang> words <w,w,…>         sentences containing one of these words
//   node scripts/grammar/mine.ts <lang> re <regex>            sentences matching a regular expression
//   node scripts/grammar/mine.ts <lang> para <lemma>          a lemma's whole paradigm (for distractors)
//
// Options: --all keeps fragments (by default only whole sentences are listed), --max N (default 80).
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

type Example = [number, string, string, number, number];
type Pack = {
  lemmas: Array<[string, string, string, string, unknown]>;
  examples: Example[];
  paradigms: Array<[number, string, Array<[string, number]>]>;
  tagSets: string[];
};

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const [lang, mode, arg = '', ...rest] = process.argv.slice(2);
const all = rest.includes('--all');
const maxAt = rest.indexOf('--max');
const max = maxAt >= 0 ? Number(rest[maxAt + 1]) : 80;
if (!lang || !mode) {
  console.log('usage: mine.ts <lang> tags|words|re|para <arg> [--all] [--max N]');
  process.exit(1);
}

export function loadPack(code: string): Pack {
  return JSON.parse(gunzipSync(readFileSync(join(root, 'public', 'packs', `${code}.v7.json.gz`))).toString('utf8'));
}

/** Word identity: no stress marks (Russian), no vowel marks (Arabic), lower case. */
export function norm(word: string, code: string): string {
  let w = word.normalize('NFD');
  if (code === 'ru') w = w.replace(/[́̀]/g, '');
  if (code === 'ar') w = w.replace(/[ً-ْٰـ]/g, '').replace(/ٱ/g, 'ا');
  return w.normalize('NFC').toLocaleLowerCase(code);
}

const SPLIT = /[^\p{L}\p{M}'’-]+/u;
const CANTONESE = /[嘅咗喺唔佢哋冇嘢啲睇乜嚟咁]/;

function wholeSentence(text: string, code: string): boolean {
  if (code === 'zh' || code === 'ja') return /[。？！?!]$/.test(text);
  return /[.?!…。؟]$/.test(text.trim()) && text.trim().split(/\s+/).length >= 3;
}

const pack = loadPack(lang);
const formTags = new Map<string, Array<{ lemma: string; tags: string }>>();
const paradigmOf = new Map<string, Array<[string, string]>>();
for (const [li, , rows] of pack.paradigms) {
  const lemma = pack.lemmas[li][0];
  const list: Array<[string, string]> = [];
  for (const [form, ti] of rows) {
    const tags = pack.tagSets[ti] ?? '';
    list.push([form, tags]);
    const key = norm(form, lang);
    const at = formTags.get(key) ?? [];
    at.push({ lemma, tags });
    formTags.set(key, at);
  }
  paradigmOf.set(lemma, [...(paradigmOf.get(lemma) ?? []), ...list]);
}

if (mode === 'para') {
  const rows = paradigmOf.get(arg) ?? [];
  if (!rows.length) console.log('no paradigm for', arg);
  for (const [form, tags] of rows) console.log(`${form}\t${tags}`);
  process.exit(0);
}

// Mandarin examples come in pairs (Traditional, then Simplified): keep the second of each pair.
const examples = pack.examples.filter((ex, i, list) => {
  if (lang === 'zh') {
    if (CANTONESE.test(ex[1])) return false;
    const next = list[i + 1];
    if (next && next[2] === ex[2] && next[1].length === ex[1].length && next[1] !== ex[1]) return false;
  }
  return all || wholeSentence(ex[1], lang);
});

let shown = 0;
const want = arg.split(',').map((s) => s.trim()).filter(Boolean);
const need = want.filter((t) => !t.startsWith('-'));
const avoid = want.filter((t) => t.startsWith('-')).map((t) => t.slice(1));
const words = new Set(want.map((w) => norm(w, lang)));
const re = mode === 're' ? new RegExp(arg, 'u') : null;

for (const [, text, en] of examples) {
  if (shown >= max) break;
  const tokens = lang === 'zh' || lang === 'ja' ? [...new Intl.Segmenter(lang, { granularity: 'word' }).segment(text)].map((s) => s.segment) : text.split(SPLIT).filter(Boolean);
  const hits: string[] = [];
  if (mode === 'tags') {
    for (const t of tokens) {
      for (const { lemma, tags } of formTags.get(norm(t, lang)) ?? []) {
        const set = new Set(tags.split(' '));
        if (need.every((n) => set.has(n)) && !avoid.some((a) => set.has(a))) hits.push(`${t}=${lemma}[${tags}]`);
      }
    }
  } else if (mode === 'words') {
    for (const t of tokens) if (words.has(norm(t, lang))) hits.push(t);
    if (lang === 'zh' || lang === 'ja') for (const w of want) if (text.includes(w) && !hits.includes(w)) hits.push(w);
  } else if (re?.test(text)) hits.push(re.exec(text)![0]);
  if (!hits.length) continue;
  shown++;
  console.log(`${text}  |  ${en}  |  ${[...new Set(hits)].join(' ; ')}`);
}
console.log(`-- ${shown} shown of ${examples.length} sentences`);
