// Builds public/strokes/ja.json, stroke order for the most used kanji, from KanjiVG (CC BY-SA 3.0,
// scripts/.cache/kanjivg.xml.gz from https://github.com/KanjiVG/kanjivg/releases). The kanji are the first
// ones met in the Japanese pack's words (which are in frequency order). Each has its stroke centre lines
// (a 109 box, y down) and its parts.
//   node scripts/script/kanji.ts [count]      (default 1000)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const count = Number(process.argv[2] ?? 1000);
const pack = JSON.parse(gunzipSync(readFileSync(join(root, 'public/packs/ja.v8.json.gz'))).toString()) as { lemmas: string[][] };
const wanted: string[] = [];
for (const l of pack.lemmas) for (const c of l[0]) if (/\p{Script=Han}/u.test(c) && !wanted.includes(c)) wanted.push(c);
const keep = new Set(wanted.slice(0, count));

const xml = gunzipSync(readFileSync(join(root, 'scripts/.cache/kanjivg.xml.gz'))).toString();
const out: Record<string, { p: string[]; c?: string }> = {};
for (const m of xml.matchAll(/<kanji id="kvg:kanji_([0-9a-f]{5})">([\s\S]*?)<\/kanji>/g)) {
  const ch = String.fromCodePoint(parseInt(m[1], 16));
  if (!keep.has(ch)) continue;
  const body = m[2];
  const p = [...body.matchAll(/<path id="[^"]*-s\d+"[^>]* d="([^"]+)"/g)].map((x) => x[1]);
  // Parts: the elements of the groups directly inside the kanji's own group.
  const parts: string[] = [];
  let depth = 0;
  for (const t of body.matchAll(/<(\/?)g\b([^>]*?)(\/?)>/g)) {
    if (t[1]) { depth -= 1; continue; }
    depth += 1;
    const el = /kvg:element="([^"]+)"/.exec(t[2])?.[1];
    if (depth === 2 && el) parts.push(el);
    if (t[3]) depth -= 1;
  }
  out[ch] = { p, ...(parts.length ? { c: parts.join('') } : {}) };
}
writeFileSync(join(root, 'public/strokes/ja.json'), JSON.stringify(out));
console.log(Object.keys(out).length, 'of', keep.size);
