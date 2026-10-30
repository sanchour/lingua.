// Builds public/dict/ar-roots.json, the Arabic root explorer's data: each three- or four-letter root with the words
// of Lingua's Arabic dictionary that Wiktionary says come from it (its etymology's root template).
// Sources: scripts/.cache/kaikki-ar.jsonl.gz (Wiktionary via kaikki.org, CC BY-SA) and public/dict/ar.v3.json.gz (word ranks).
//   node scripts/script/roots.ts
import { createReadStream, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGunzip, gunzipSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const dict = JSON.parse(gunzipSync(readFileSync(join(root, 'public/dict/ar.v3.json.gz'))).toString()) as { words: Array<{ w: string; r: number }> };
const rank = new Map(dict.words.map((w) => [w.w, w.r]));
const strip = (s: string) => s.replace(/[ً-ْٰـ]/g, '');

type Row = [word: string, pos: string, gloss: string, rank: number];
const roots = new Map<string, Map<string, Row>>();
for await (const line of createInterface({ input: createReadStream(join(root, 'scripts/.cache/kaikki-ar.jsonl.gz')).pipe(createGunzip()) })) {
  if (!line) continue;
  const e = JSON.parse(line) as { word: string; pos: string; senses?: Array<{ glosses?: string[] }>; etymology_templates?: Array<{ name: string; args: Record<string, string> }> };
  const t = e.etymology_templates?.find((x) => x.name === 'ar-root' || x.name === 'root');
  const raw = t?.args['1'] === 'ar' ? t.args['3'] : t?.args['1'];
  if (!raw || !/^[ء-ي](?: [ء-ي]){2,3}$/.test(raw)) continue;
  const gloss = e.senses?.[0]?.glosses?.[0];
  if (!gloss || !rank.has(strip(e.word)) && !rank.has(e.word)) continue;
  const w = strip(e.word);
  const map = roots.get(raw) ?? new Map<string, Row>();
  const key = `${w}|${e.pos}`;
  if (!map.has(key)) map.set(key, [w, e.pos, gloss.slice(0, 80), rank.get(w) ?? rank.get(e.word) ?? 99999]);
  roots.set(raw, map);
}
const out: Record<string, Row[]> = {};
for (const [r, m] of [...roots].sort()) if (m.size >= 3) out[r] = [...m.values()].sort((a, b) => a[3] - b[3]).slice(0, 24);
writeFileSync(join(root, 'public/dict/ar-roots.json'), JSON.stringify(out));
console.log(Object.keys(out).length, 'roots');
