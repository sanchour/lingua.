// Builds src/core/script/variants.data.ts, the one-to-one Simplified ⇄ Traditional character table, from
// the Unicode Unihan variants file (scripts/.cache/Unihan_Variants.txt: kSimplifiedVariant, kTraditionalVariant).
// A character with several variants takes the first listed. Character by character, no phrase rules.
//
//   node scripts/script/variants.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const toSimp = new Map<string, string>();
const toTrad = new Map<string, string>();
for (const line of readFileSync(join(root, 'scripts/.cache/Unihan_Variants.txt'), 'utf8').split('\n')) {
  const m = /^U\+([0-9A-F]+)\t(kSimplifiedVariant|kTraditionalVariant)\t(.+)$/.exec(line);
  if (!m) continue;
  const from = String.fromCodePoint(parseInt(m[1], 16));
  const first = [...m[3].matchAll(/U\+([0-9A-F]+)/g)].map((x) => String.fromCodePoint(parseInt(x[1], 16))).find((c) => c !== from);
  if (first) (m[2] === 'kSimplifiedVariant' ? toSimp : toTrad).set(from, first);
}
// Simplified → Traditional comes from kTraditionalVariant of the simplified form; Traditional → Simplified from kSimplifiedVariant.
const pair = (map: Map<string, string>) => [[...map.keys()].join(''), [...map.values()].join('')];
const [hant, hans] = pair(toSimp);
const [hans2, hant2] = pair(toTrad);
const out = `// Made by scripts/script/variants.ts from Unicode's Unihan variants (Unicode License). Do not edit.
/** Traditional characters and, at the same index, their Simplified form. */
export const HANT_TO_HANS: [string, string] = [${JSON.stringify(hant)}, ${JSON.stringify(hans)}];
/** Simplified characters and, at the same index, their Traditional form. */
export const HANS_TO_HANT: [string, string] = [${JSON.stringify(hans2)}, ${JSON.stringify(hant2)}];
`;
writeFileSync(join(root, 'src/core/script/variants.data.ts'), out);
console.log(toSimp.size, toTrad.size);
