// New ready-made decks for the packs already built, without the 2 GB rebuild (5.1-3b): each pack is
// read, given the themed lists it doesn't have yet (picked from themes.ts' candidates the way
// build.ts picks them, by the pack's own words) and the decks worked out from it (irregular verbs,
// words that look like English), and written as the current PACK_VERSION; the older file goes.
// The 14 lists of the full build stay as built, each word once.
//   node scripts/lang-data/themes.ts            → scripts/.cache/themes.json
//   node scripts/lang-data/retheme.ts [codes]   → public/packs/<code>.v<PACK_VERSION>.json.gz
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';
import { computedThemes } from '../../src/core/lang/computedDecks.ts';
import { JAPANESE_CHAR, segmentJapanese } from '../../src/core/lang/japanese.ts';
import type { JapaneseLexicon } from '../../src/core/lang/japanese.ts';
import { PACK_VERSION, packFileName } from '../../src/core/packs/format.ts';
import type { PackFile } from '../../src/core/packs/format.ts';
import { normalizeWord } from '../../src/core/text/normalize.ts';
import { CACHE_DIR, PACKS_DIR } from './sources.ts';
import { dedupe, pickThemes } from './themePicks.ts';
import type { ThemeCandidates } from './themePicks.ts';

const themesFile = new URL('themes.json', CACHE_DIR);
if (!existsSync(themesFile)) throw new Error('Run node scripts/lang-data/themes.ts first.');
const allThemes = JSON.parse(readFileSync(themesFile, 'utf8')) as Record<string, Record<string, ThemeCandidates[]>>;
const JAPANESE_RUN = new RegExp(`${JAPANESE_CHAR.source}+`, 'gu');
/** The lists build.ts made from the full word data: kept. Every other list is picked here, so a second run replaces them. */
const BUILT = new Set(['basics', 'verbs', 'connectors', 'animals', 'food', 'people', 'home', 'time', 'describe', 'body', 'travel', 'nature', 'feelings', 'work']);
const hasLetter = /\p{L}/u;
const TRADITIONAL_OF = /^Traditional spelling of (.+)$/;

/** The word segments of a phrase, normalised, as build.ts splits them (Japanese by the pack's own words). */
function wordsOf(text: string, lang: string, lex: JapaneseLexicon | null): string[] {
  const out: Array<[number, string]> = [];
  const runs = lex ? [...text.matchAll(JAPANESE_RUN)].map((m) => [m.index, m.index + m[0].length] as const) : [];
  for (const [start, end] of runs) {
    for (const w of segmentJapanese(text.slice(start, end), lex!)) out.push([start + w.start, normalizeWord(text.slice(start + w.start, start + w.end), lang)]);
  }
  for (const s of new Intl.Segmenter(lang, { granularity: 'word' }).segment(text)) {
    if (runs.some(([a, b]) => s.index >= a && s.index < b)) continue;
    if (s.isWordLike && hasLetter.test(s.segment)) out.push([s.index, normalizeWord(s.segment, lang)]);
  }
  return out.sort((a, b) => a[0] - b[0]).map(([, norm]) => norm);
}

const wanted = process.argv.slice(2);
const files = readdirSync(PACKS_DIR).filter((f) => /^[a-z]+\.v\d+\.json\.gz$/.test(f));
for (const file of files) {
  const lang = file.split('.')[0];
  if (wanted.length && !wanted.includes(lang)) continue;
  const started = Date.now();
  const pack = JSON.parse(gunzipSync(readFileSync(new URL(file, PACKS_DIR))).toString('utf8')) as PackFile;

  const forms = new Set(pack.forms.map((f) => f[0]));
  const lemmaByKey = new Map(pack.lemmas.map((l) => [l[0], l]));
  const freqRank = new Map(pack.freq.map((f, i) => [f, i + 1]));
  const lex: JapaneseLexicon | null =
    lang === 'ja'
      ? {
          has: (w) => forms.has(w) || lemmaByKey.has(w),
          cost: (w) => {
            const rank = freqRank.get(w);
            return rank ? Math.log(rank + 20) : 11.5;
          },
        }
      : null;
  const words = (phrase: string) => wordsOf(phrase, lang, lex);

  const built = Object.fromEntries(Object.entries(pack.themes ?? {}).filter(([theme]) => BUILT.has(theme)));
  const raw = Object.fromEntries(Object.entries(allThemes[lang] ?? {}).filter(([theme]) => !built[theme]));
  // Mandarin packs keep Traditional spellings as forms of the Simplified word: a Traditional pick is respelled.
  const simplified = new Map<string, string>();
  for (const f of lang === 'zh' ? pack.forms : []) {
    const simp = TRADITIONAL_OF.exec(f[3])?.[1];
    if (simp) simplified.set(f[0], simp);
  }
  const added = pickThemes(raw, {
    known: (phrase) => words(phrase).every((w) => forms.has(w) || lemmaByKey.has(w)),
    rankOf: (phrase) => Math.max(...words(phrase).map((w) => freqRank.get(w) ?? Infinity)),
    nounGender: (term) => {
      const single = words(term);
      const own = single.length === 1 ? lemmaByKey.get(single[0]) : undefined;
      return (own?.[4][0]?.[0] === 'noun' && own[3]) || undefined;
    },
    respell: (term) => simplified.get(term) ?? term,
  });
  const computed = computedThemes(pack);
  pack.themes = { ...Object.fromEntries(Object.entries(built).map(([theme, items]) => [theme, dedupe(items)])), ...added, ...computed };
  const oldVersion = pack.version;
  pack.version = PACK_VERSION;

  const gz = gzipSync(JSON.stringify(pack), { level: 9 });
  writeFileSync(new URL(packFileName(lang), PACKS_DIR), gz);
  if (oldVersion !== PACK_VERSION) rmSync(new URL(file, PACKS_DIR));
  const count = (t: Record<string, unknown[]>) => Object.values(t).reduce((n, list) => n + list.length, 0);
  console.log(
    `✓ ${lang}: ${Object.keys(added).length} new lists (${count(added)} words) · irregular ${computed.irregular?.length ?? 0} · look-alikes ${computed.cognates?.length ?? 0} · ` +
      `${(gz.length / 1e6).toFixed(1)} MB · ${((Date.now() - started) / 1000).toFixed(0)} s`,
  );
}
console.log(`Packs written to ${fileURLToPath(PACKS_DIR)}`);
