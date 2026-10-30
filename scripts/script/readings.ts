// Builds public/chars/readings.json: what a character is called in Japanese (on and kun readings), in Korean (hangul
// readings, for hanja) and means, from Unihan (scripts/.cache/Unihan_Readings.txt; Unicode License), for the characters
// that have stroke data (public/strokes/zh.json and ja.json). Unihan's Japanese readings are in capital romaji.
//   node scripts/script/readings.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const keys = (f: string) => Object.keys(JSON.parse(readFileSync(join(root, 'public/strokes', f), 'utf8')) as object);
const wanted = new Set([...keys('zh.json'), ...keys('ja.json')]);
const rows: Record<string, { d?: string; on?: string[]; kun?: string[]; ko?: string[] }> = {};
for (const line of readFileSync(join(root, 'scripts/.cache/Unihan_Readings.txt'), 'utf8').split('\n')) {
  const m = /^U\+([0-9A-F]+)\t(kDefinition|kJapaneseOn|kJapaneseKun|kHangul)\t(.+)$/.exec(line);
  if (!m) continue;
  const ch = String.fromCodePoint(parseInt(m[1], 16));
  if (!wanted.has(ch)) continue;
  const row = (rows[ch] ??= {});
  if (m[2] === 'kDefinition') row.d = m[3].split(/[;,]/)[0].trim();
  else if (m[2] === 'kJapaneseOn') row.on = m[3].toLowerCase().split(' ');
  else if (m[2] === 'kJapaneseKun') row.kun = m[3].toLowerCase().split(' ');
  else row.ko = m[3].split(' ').map((x) => x.split(':')[0]);
}
writeFileSync(join(root, 'public/chars/readings.json'), JSON.stringify(rows));
console.log(Object.keys(rows).length, 'characters of', wanted.size);
