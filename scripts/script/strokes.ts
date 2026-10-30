// Builds public/strokes/zh.json, stroke order for the most used Chinese characters, from Make Me a Hanzi
// (scripts/.cache/mmh-graphics.txt and mmh-dictionary.txt, https://github.com/skishore/makemeahanzi; the stroke
// shapes are the Arphic Public License, the dictionary's decomposition and etymology are LGPL). The characters
// are the ones with the most weight in the Mandarin frequency list, plus the alphabet's own.
//   node scripts/script/strokes.ts [count]      (default 1800)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import zh from '../../src/core/script/alphabets/zh.ts';
import { lettersOf } from '../../src/core/script/types.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const cache = (f: string) => readFileSync(join(root, 'scripts/.cache', f), 'utf8');
const count = Number(process.argv[2] ?? 1800);

const weight = new Map<string, number>();
for (const line of cache('freq-zh.txt').split('\n')) {
  const [word, n] = line.split(' ');
  for (const c of word ?? '') if (/\p{Script=Han}/u.test(c)) weight.set(c, (weight.get(c) ?? 0) + Number(n));
}
const wanted = new Set([...weight].sort((a, b) => b[1] - a[1]).slice(0, count).map(([c]) => c));
for (const l of lettersOf(zh)) if (l.character) for (const c of l.glyph) wanted.add(c);

interface Dict { character: string; definition?: string; decomposition?: string; radical?: string; etymology?: { type: string; hint?: string; phonetic?: string; semantic?: string } }
const dict = new Map<string, Dict>();
for (const line of cache('mmh-dictionary.txt').split('\n')) if (line) { const d = JSON.parse(line) as Dict; dict.set(d.character, d); }

const out: Record<string, unknown> = {};
for (const line of cache('mmh-graphics.txt').split('\n')) {
  if (!line) continue;
  const g = JSON.parse(line) as { character: string; strokes: string[]; medians: number[][][] };
  if (!wanted.has(g.character)) continue;
  const d = dict.get(g.character);
  const parts = d?.decomposition && d.decomposition !== '？' ? [...d.decomposition].filter((c) => /\p{Script=Han}/u.test(c) || /[⺀-⿟]/u.test(c)) : [];
  out[g.character] = { s: g.strokes, m: g.medians, ...(parts.length ? { c: parts.join('') } : {}), ...(d?.radical ? { r: d.radical } : {}), ...(d?.definition ? { e: d.definition } : {}), ...(d?.etymology?.hint ? { h: d.etymology.hint } : {}) };
}
writeFileSync(join(root, 'public/strokes/zh.json'), JSON.stringify(out));
console.log(Object.keys(out).length, 'characters of', wanted.size);
