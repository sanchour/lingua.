// One sentence per level, A1 to C1, for every language that can be chosen (Lingua 5.1-2b): the
// onboarding's "How much can you read already?". Taken from each pack's example sentences and graded
// by their rarest word in the pack's frequency list (cefrForRank), so A1's sentence only uses the
// ~800 most common words. Writes src/data/levelSentences.json; run after the packs change:
//   node scripts/lang-data/levels.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { AVAILABLE_LANGUAGES } from '../../src/core/lang/languages.ts';
import { cefrForRank } from '../../src/core/lang/levels.ts';
import { packFileName } from '../../src/core/packs/format.ts';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;
type Example = [number, string, string, number, number];
interface Pack {
  version: number;
  freq: string[];
  examples: Example[];
}

const packFile = (lang: string) => new URL(`../../public/packs/${packFileName(lang)}`, import.meta.url);

/** A whole sentence: ends like one (scripts without full stops excepted) and starts with a capital where the script has them. */
function isSentence(text: string, script: string): boolean {
  if (/[+…[\]()/;=]|\.\.\.|\s{2}/.test(text)) return false;
  if (!['Thai', 'Khmr', 'Mymr'].includes(script) && !/[.!?。！？।]$/.test(text)) return false;
  // Georgian's capitals (Mtavruli) aren't used to start sentences.
  const first = script === 'Geor' ? undefined : /\p{L}/u.exec(text)?.[0];
  return !first || first.toUpperCase() === first.toLowerCase() || first === first.toUpperCase();
}

/** A first impression of the language: nothing rude or violent. */
const UNKIND = /\b(bastard|damn|hell|heck|dumb|stupid|idiot|shit|fuck|crap|kill\w*|punch\w*|box you|sex|violence|war|dead|die|blasted|crazy|mad at|beer|drunk)\b/i;

/** For looking words up only: vowel marks the frequency lists don't write (Arabic harakat, Latin macrons). */
const bare = (word: string) => word.normalize('NFD').replace(/[\u064B-\u0652\u0670\u0304]/g, '').normalize('NFC');

/**
 * Chosen by hand from the pack where grading can't tell: Wiktionary files traditional, Cantonese and
 * Hokkien sentences under Chinese too, and the harder ones are mostly those.
 */
const BY_HAND: Record<string, Partial<Record<(typeof LEVELS)[number], { text: string; en: string }>>> = {
  zh: {
    B1: { text: '我喜欢跟我弟弟一起去图书馆。', en: 'I like to go to the library with my little brother.' },
    B2: { text: '你今天出去的话，记得锁上前门。', en: 'If you go out today remember to lock the front door.' },
    C1: { text: '这种情况很少见，但也不是不会发生。', en: 'This type of situation is rare, but it may still happen.' },
  },
};

const out: Record<string, Array<{ level: (typeof LEVELS)[number]; text: string; en: string; parts: Array<[string, number]> }>> = {};
for (const { code, script } of AVAILABLE_LANGUAGES) {
  const pack = JSON.parse(gunzipSync(readFileSync(packFile(code))).toString('utf8')) as Pack;
  const rank = new Map(pack.freq.map((w, i) => [bare(w.toLocaleLowerCase(code)), i + 1]));
  const words = new Intl.Segmenter(code, { granularity: 'word' });
  const graded = pack.examples
    // Dictionary stress marks (Russian она́) aren't written in ordinary text.
    .map(([, text, en]): [string, string] => [script === 'Cyrl' ? text.replace(/\u0301/g, '') : text, en])
    .filter(([text, en]) => isSentence(text, script) && !UNKIND.test(en || text))
    .map(([text, en]) => {
      const tokens = [...words.segment(text)].filter((s) => s.isWordLike).map((s) => bare(s.segment.toLocaleLowerCase(code)));
      // Unknown words (names, rare forms) count as rare.
      const hardest = Math.max(...tokens.map((t) => rank.get(t) ?? 30_000));
      return { text, en, size: tokens.length, level: LEVELS.indexOf(cefrForRank(hardest) === 'C2' ? 'C1' : (cefrForRank(hardest) as (typeof LEVELS)[number])) };
    })
    // Short enough to read at a glance, long enough to say something; no line breaks or quotes of quotes.
    .filter((s) => s.size >= 3 && s.size <= 12 && s.text.length <= 90 && !/[\n«»“”"]/.test(s.text) && s.en.length <= 100);
  const used = new Set<string>();
  const picks = LEVELS.map((level, i) => {
    // The sentence of that level closest to five words (a word longer each level up), else the nearest level's.
    const want = 5 + i;
    const near = graded.filter((s) => !used.has(s.text)).sort((a, b) => Math.abs(a.level - i) - Math.abs(b.level - i) || Math.abs(a.size - want) - Math.abs(b.size - want) || a.text.length - b.text.length);
    const best = near[0];
    if (!best) return null;
    used.add(best.text);
    return { level, text: best.text, en: best.en };
  });
  if (picks.some((p) => !p)) console.warn(`${code}: only ${picks.filter(Boolean).length} of 5 levels have a sentence`);
  // Each sentence also in parts with each word's rank (0 between words), for the "mark words as known" preview.
  const parts = (text: string) => [...words.segment(text)].map((s): [string, number] => [s.segment, s.isWordLike ? (rank.get(bare(s.segment.toLocaleLowerCase(code))) ?? 30_000) : 0]);
  out[code] = picks
    .filter((p) => p !== null)
    .map((p) => ({ ...p, ...BY_HAND[code]?.[p.level] }))
    .map((p) => ({ ...p, parts: parts(p.text) }));
}

// One language a line: small, and a rebuild's diff shows which languages changed.
const lines = Object.entries(out).map(([code, list]) => `${JSON.stringify(code)}:${JSON.stringify(list)}`);
writeFileSync(new URL('../../src/data/levelSentences.json', import.meta.url), `{\n${lines.join(',\n')}\n}\n`);
console.log(`levelSentences.json: ${Object.keys(out).length} languages.`);
