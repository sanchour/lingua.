// Word frequencies for languages written without spaces, counted from OpenSubtitles text split the
// way the reader splits it, so a pack's ranks match the words the reader shows:
// - Mandarin, Cantonese and Thai: Intl.Segmenter (what the reader uses).
// - Japanese: the reader's own dictionary splitter (core/lang/japanese.ts), with Wiktionary's
//   Japanese words as its lexicon. FrequencyWords' Japanese list is counted in morphemes (い, て, た),
//   so it only seeds the first pass; the second pass uses the first pass's own counts.
//
//   node scripts/lang-data/count.ts          → scripts/.cache/counted-ja.txt, counted-zh.txt
//   node scripts/lang-data/count.ts ja       → only Japanese
import { createReadStream, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { createGunzip } from 'node:zlib';
import { JAPANESE_CHAR, segmentJapanese } from '../../src/core/lang/japanese.ts';
import type { JapaneseLexicon } from '../../src/core/lang/japanese.ts';
import { normalizeWord } from '../../src/core/text/normalize.ts';
import { corpusFile, countedFile, frequencyFile, kaikkiFile, opusFile, PACK_SOURCES } from './sources.ts';
import type { PackSource } from './sources.ts';

/** Subtitle lines to count (each corpus has tens of millions; this many give stable ranks). */
const LINES = 3_000_000;
const KEEP = 80_000;
const HAN = /\p{Script=Han}/u;

async function* lines(file: URL, max: number): AsyncGenerator<string> {
  const rl = createInterface({ input: createReadStream(file).pipe(createGunzip()), crlfDelay: Infinity });
  let n = 0;
  for await (const line of rl) {
    if (++n > max) break;
    yield line;
  }
  rl.close();
}

function write(source: PackSource, counts: Map<string, number>): void {
  const top = [...counts].sort((a, b) => b[1] - a[1]).slice(0, KEEP);
  writeFileSync(countedFile(source), top.map(([w, c]) => `${w} ${c}`).join('\n') + '\n');
  console.log(`✓ ${source.code}: ${counts.size.toLocaleString()} words counted, top ${top.length.toLocaleString()} written (${top.slice(0, 12).map(([w]) => w).join(' ')} …)`);
}

/** Languages the browser's own splitter cuts into words, as the reader shows them: locale and script. */
const SEGMENTED: Record<string, [locale: string, script: RegExp]> = {
  zh: ['zh-Hans', HAN],
  yue: ['zh-Hant', HAN],
  th: ['th', /\p{Script=Thai}/u],
};

/** Mandarin, Cantonese and Thai: words as Intl.Segmenter splits them (what the reader uses). */
async function countSegmented(source: PackSource): Promise<void> {
  const [locale, script] = SEGMENTED[source.code];
  const seg = new Intl.Segmenter(locale, { granularity: 'word' });
  const counts = new Map<string, number>();
  let n = 0;
  for await (const line of lines(opusFile(source), LINES)) {
    for (const s of seg.segment(line)) {
      if (!s.isWordLike || !script.test(s.segment)) continue;
      const w = normalizeWord(s.segment, source.code);
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
    if (++n % 500_000 === 0) console.log(`  ${source.code}: ${n.toLocaleString()} lines…`);
  }
  write(source, counts);
}

/** Every Japanese spelling Wiktionary lists: headwords, kanji and kana spellings, conjugated forms. */
async function japaneseWords(source: PackSource): Promise<Set<string>> {
  const words = new Set<string>();
  const rl = createInterface({ input: createReadStream(kaikkiFile(source)).pipe(createGunzip()), crlfDelay: Infinity });
  const isJa = (w: string) => w.length > 0 && w.length <= 12 && [...w].every((c) => JAPANESE_CHAR.test(c));
  for await (const line of rl) {
    if (!line) continue;
    let e: { word?: string; pos?: string; forms?: Array<{ form?: string; tags?: string[] }>; redirects?: string[] };
    try {
      e = JSON.parse(line);
    } catch {
      continue;
    }
    // Names are words too: without them 日本 is cut into 日|本.
    if (!e.word || e.pos === 'character' || e.pos === 'syllable' || e.pos === 'romanization') continue;
    if (isJa(e.word)) words.add(e.word);
    for (const f of e.forms ?? []) {
      const form = f.form?.replace(/\s*\^$/, '').trim();
      if (form && !f.tags?.includes('romanization') && !f.tags?.includes('historical') && isJa(form)) words.add(form);
    }
  }
  return words;
}

async function countJapanese(source: PackSource): Promise<void> {
  const words = await japaneseWords(source);
  console.log(`  ja: lexicon of ${words.size.toLocaleString()} spellings`);
  // First pass costs: FrequencyWords' morpheme ranks, else "rare".
  const seedRank = new Map<string, number>();
  if (existsSync(frequencyFile(source))) {
    for (const line of readFileSync(frequencyFile(source), 'utf8').split('\n')) {
      const w = line.split(' ')[0];
      if (w && !seedRank.has(w)) seedRank.set(w, seedRank.size + 1);
    }
  }
  const lexicon = (rankOf: (w: string) => number | undefined, unseen: number): JapaneseLexicon => ({
    has: (w) => words.has(w),
    cost: (w) => {
      const r = rankOf(w);
      return r ? Math.min(Math.log(r + 20), unseen) : unseen;
    },
  });
  const pass = async (lex: JapaneseLexicon, max: number) => {
    const counts = new Map<string, number>();
    let n = 0;
    for await (const line of lines(opusFile(source), max)) {
      // Runs of Japanese characters, as the tokenizer hands them to the splitter.
      for (const m of line.matchAll(/[々-〇ぁ-ゟ゠-ヿㇰ-ㇿ㐀-䶿一-鿿豈-﫿ｦ-ﾟ]+/g)) {
        const run = m[0];
        for (const w of segmentJapanese(run, lex)) {
          const word = normalizeWord(run.slice(w.start, w.end), 'ja');
          counts.set(word, (counts.get(word) ?? 0) + 1);
        }
      }
      if (++n % 500_000 === 0) console.log(`  ja: ${n.toLocaleString()} lines…`);
    }
    return counts;
  };
  // The seed list lacks most dictionary forms (いる, 言う) while ranking verb stems high (言, 行), so
  // in the first pass a word it doesn't list counts as fairly common, not rare; the second pass
  // ranks by the first one's own counts, where missing does mean rare.
  const first = await pass(lexicon((w) => seedRank.get(w), 8), 600_000);
  const firstRank = new Map([...first].sort((a, b) => b[1] - a[1]).map(([w], i) => [w, i + 1]));
  write(source, await pass(lexicon((w) => firstRank.get(w), 11.5), LINES));
}

/**
 * Latin and Swahili: words counted from everyday text, blended with the Wikipedia list (each source
 * weighed alike, per million words), so "census" sinks and "come" rises.
 */
async function countBlended(source: PackSource): Promise<void> {
  const seg = new Intl.Segmenter(source.code, { granularity: 'word' });
  const perMillion = (counts: Map<string, number>) => {
    const total = [...counts.values()].reduce((a, b) => a + b, 0) || 1;
    return new Map([...counts].map(([w, n]) => [w, (n * 1e6) / total]));
  };
  const blend = new Map<string, number>();
  const add = (counts: Map<string, number>) => {
    for (const [w, n] of perMillion(counts)) blend.set(w, (blend.get(w) ?? 0) + n);
  };
  for (const corpus of source.corpora ?? []) {
    if (!existsSync(corpusFile(source, corpus))) {
      console.warn(`  ${source.code}: ${corpus} is missing (run fetch.ts ${source.code} first)`);
      continue;
    }
    const counts = new Map<string, number>();
    for await (const line of lines(corpusFile(source, corpus), LINES)) {
      for (const s of seg.segment(line)) {
        if (!s.isWordLike || !/\p{L}/u.test(s.segment) || /\d/.test(s.segment)) continue;
        const w = normalizeWord(s.segment, source.code);
        counts.set(w, (counts.get(w) ?? 0) + 1);
      }
    }
    console.log(`  ${source.code}: ${corpus}, ${[...counts.values()].reduce((a, b) => a + b, 0).toLocaleString()} words`);
    add(counts);
  }
  if (existsSync(frequencyFile(source))) {
    const base = new Map<string, number>();
    for (const line of readFileSync(frequencyFile(source), 'utf8').split('\n')) {
      const [w, n] = line.trim().split(' ');
      if (w) base.set(normalizeWord(w, source.code), (base.get(normalizeWord(w, source.code)) ?? 0) + (Number(n) || 0));
    }
    add(base);
  }
  // Whole numbers, as the pack builder reads them.
  write(source, new Map([...blend].map(([w, n]) => [w, Math.round(n * 100)])));
}

const wanted = process.argv.slice(2);
for (const source of PACK_SOURCES.filter((s) => (s.opus || s.corpora) && (!wanted.length || wanted.includes(s.code)))) {
  if (source.corpora) {
    await countBlended(source);
    continue;
  }
  if (!existsSync(opusFile(source))) {
    console.warn(`  ${source.code}: ${opusFile(source).pathname} is missing (run fetch.ts first)`);
    continue;
  }
  if (source.code in SEGMENTED) await countSegmented(source);
  else await countJapanese(source);
}
