// Which common words have a real person saying them (5.1-3c), for the speaker button without a key:
//   node scripts/lang-data/recordings.ts          → the six core languages
//   node scripts/lang-data/recordings.ts fr de    → only these
// For the pack's 10,000 most common forms and its theme words, keeps up to three recordings on
// Wikimedia Commons, as public/sounds/<lang>.v1.json.gz, from two places:
// 1. The English Wiktionary's entries (kaikki.org; the cached kaikki-<lang>.jsonl.gz when fetch.ts
//    has downloaded it), with the region each was recorded in. Rich for French and German only:
//    kaikki doesn't read the Spanish, Russian, Mandarin and Arabic pronunciation templates.
// 2. Commons' own categories: every Lingua Libre recording of the language, and the Wiktionary
//    speakers' "Ru-слово.ogg" files (a few minutes of API requests; French has 440,000 files).
// Prints how many of the 10,000 have one.
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { gunzipSync, gzipSync, createGunzip } from 'node:zlib';
import { SOUNDS_FORMAT, soundsFileName, type SoundsFile, type SoundsRecording } from '../../src/core/audio/recordings.ts';
import type { PackFile } from '../../src/core/packs/format.ts';
import { packFileName } from '../../src/core/packs/format.ts';
import { normalizeWord } from '../../src/core/text/normalize.ts';
import { kaikkiFile, kaikkiUrl, PACK_SOURCES, PACKS_DIR } from './sources.ts';

const LANGS = process.argv.slice(2).length ? process.argv.slice(2) : ['fr', 'es', 'de', 'ru', 'zh', 'ar'];
const OUT_DIR = new URL('../../public/sounds/', import.meta.url);
const COMMON = 10_000;
const PER_WORD = 3;

/** Other Chinese languages' recordings sit in the same entries: Mandarin only. */
const NOT_MANDARIN = /^(cantonese|hokkien|min-nan|hakka|wu|shanghainese|teochew|jin|xiang|gan|taishanese)$/i;

/** Commons' categories per language: Lingua Libre's (by ISO 639-3) and the Wiktionary speakers' file prefix. */
const COMMONS: Record<string, { ll: string; wiktionary?: { category: string; prefix: string } }> = {
  fr: { ll: 'fra', wiktionary: { category: 'French pronunciation', prefix: 'Fr' } },
  es: { ll: 'spa', wiktionary: { category: 'Spanish pronunciation', prefix: 'Es' } },
  de: { ll: 'deu', wiktionary: { category: 'German pronunciation', prefix: 'De' } },
  ru: { ll: 'rus', wiktionary: { category: 'Russian pronunciation', prefix: 'Ru' } },
  // Mandarin's Wiktionary files are named in pinyin (zh-mǎ.ogg), which can't say which character.
  zh: { ll: 'cmn' },
  ar: { ll: 'ara', wiktionary: { category: 'Arabic pronunciation', prefix: 'Ar' } },
};
const UA = 'LinguaBuild/1.0 (https://sanchour.github.io/lingua./; recordings index)';

/** Every file in a Commons category, 500 a request. */
async function* categoryFiles(category: string): AsyncGenerator<string> {
  let next: string | undefined;
  do {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&list=categorymembers&cmtype=file&cmlimit=500&cmtitle=${encodeURIComponent(`Category:${category}`)}${next ? `&cmcontinue=${encodeURIComponent(next)}` : ''}`;
    let json: { continue?: { cmcontinue?: string }; query?: { categorymembers?: Array<{ title: string }> } } | undefined;
    for (let attempt = 0; attempt < 5 && !json; attempt++) {
      try {
        const res = await fetch(url, { headers: { 'User-Agent': UA } });
        if (res.ok) json = await res.json();
        else await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      } catch {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      }
    }
    if (!json) throw new Error(`Commons didn't answer for ${category}`);
    for (const m of json.query?.categorymembers ?? []) yield m.title.replace(/^File:/, '');
    next = json.continue?.cmcontinue;
  } while (next);
}

/** Commons keeps a file under the MD5 of its name (spaces as underscores): "c/cc". */
function hashPath(name: string): string {
  const h = createHash('md5').update(name.replace(/ /g, '_')).digest('hex');
  return `${h[0]}/${h.slice(0, 2)}`;
}

/** "(American Spanish) casa" → Latin America; "(European Spanish) casa" → Spain. */
const VARIANTS: Array<[RegExp, string]> = [
  [/^\((?:American|Latin American) Spanish\)\s*/i, 'Latin-America'],
  [/^\((?:European|Peninsular) Spanish\)\s*/i, 'Spain'],
];

/** The word in a Lingua Libre file name, "LL-Q1321 (spa)-Speaker Name-casa.wav": the speaker may have hyphens too, so the split that names a wanted word wins. */
function lingualibre(name: string, wanted: Set<string>, lang: string): [string, string] | null {
  const m = /^LL-Q\d+ \([a-z]{3}\)-(.+)\.(?:wav|ogg|oga|flac|mp3)$/i.exec(name);
  if (!m) return null;
  const rest = m[1];
  for (let at = rest.indexOf('-'); at >= 0; at = rest.indexOf('-', at + 1)) {
    let word = rest.slice(at + 1);
    let region = '';
    for (const [re, r] of VARIANTS) if (re.test(word)) [word, region] = [word.replace(re, ''), r];
    const key = normalizeWord(word, lang);
    if (wanted.has(key)) return [key, region];
  }
  return null;
}

/** The word in a Wiktionary speaker's file name, "Ru-вода.ogg" (sometimes "Es-am-lat-casa.ogg" or "Fr-Paris--chat.ogg"). */
function wiktionaryFile(name: string, prefix: string, wanted: Set<string>, lang: string): [string, string] | null {
  const m = new RegExp(`^${prefix}-(.+)\\.(?:ogg|oga|wav|flac|mp3)$`, 'i').exec(name);
  if (!m) return null;
  let word = m[1].replace(/\s*\(\d+\)$/, '');
  let region = '';
  const lat = /^am-lat-/i.exec(word);
  if (lat) [word, region] = [word.slice(lat[0].length), 'Latin-America'];
  const city = /^([A-Z][\w]+)--/.exec(word);
  if (city) [word, region] = [word.slice(city[0].length), city[1]];
  const key = normalizeWord(word, lang);
  return wanted.has(key) ? [key, region] : null;
}

async function fromCommons(lang: string, wanted: Set<string>, found: Map<string, SoundsRecording[]>) {
  const where = COMMONS[lang];
  if (!where) return;
  const add = (key: string, r: SoundsRecording) => {
    const list = found.get(key) ?? [];
    if (!list.some((x) => x[1].replace(/ /g, '_') === r[1].replace(/ /g, '_'))) list.push(r);
    found.set(key, list);
  };
  let files = 0;
  for await (const name of categoryFiles(`Lingua Libre pronunciation-${where.ll}`)) {
    if (++files % 20_000 === 0) console.log(`  ${lang}: ${files.toLocaleString()} Lingua Libre files read`);
    const hit = lingualibre(name, wanted, lang);
    if (hit) add(hit[0], [hashPath(name), name.replace(/ /g, '_'), hit[1]]);
  }
  if (where.wiktionary) {
    for await (const name of categoryFiles(where.wiktionary.category)) {
      const hit = wiktionaryFile(name, where.wiktionary.prefix, wanted, lang);
      if (hit) add(hit[0], [hashPath(name), name.replace(/ /g, '_'), hit[1]]);
    }
  }
}

interface Sound { audio?: string; mp3_url?: string; ogg_url?: string; tags?: string[]; raw_tags?: string[] }

/** Commons keeps a file under its name's MD5 (`c/cc/Name.ogg`); the mp3 is a transcode beside it. */
function recording(s: Sound, lang: string): SoundsRecording | null {
  const url = s.mp3_url ?? s.ogg_url ?? '';
  const at = /\/commons\/(?:transcoded\/)?([0-9a-f]\/[0-9a-f]{2})\/([^/]+)/.exec(url);
  if (!s.audio || !at) return null;
  const tags = [...(s.tags ?? []), ...(s.raw_tags ?? [])];
  if (lang === 'zh' && (!tags.some((t) => /mandarin/i.test(t)) || tags.some((t) => NOT_MANDARIN.test(t)))) return null;
  const region = tags.filter((t) => /^[A-Z]/.test(t) && !/^(Mandarin|Standard|Pinyin|Jyutping|IPA|Received-Pronunciation)$/i.test(t)).join(' ');
  return [at[1], decodeURIComponent(at[2]), region];
}

/** Lingua Libre's single words first: one speaker, one clean take. */
const rank = (r: SoundsRecording) => (r[1].startsWith('LL-') ? 0 : 1);

/** Up to PER_WORD recordings, one per region first (France, Quebec, Switzerland…), so every accent finds its own. */
function choose(list: SoundsRecording[]): SoundsRecording[] {
  const sorted = [...list].sort((a, b) => rank(a) - rank(b));
  const seen = new Set<string>();
  const firsts = sorted.filter((r) => {
    const region = r[2].split(' ')[0];
    if (seen.has(region)) return false;
    seen.add(region);
    return true;
  });
  return [...firsts, ...sorted.filter((r) => !firsts.includes(r))].slice(0, PER_WORD);
}

async function build(lang: string) {
  const source = PACK_SOURCES.find((s) => s.code === lang);
  if (!source) throw new Error(`No pack source for ${lang}`);
  const pack = JSON.parse(gunzipSync(readFileSync(new URL(packFileName(lang), PACKS_DIR))).toString('utf8')) as PackFile;
  const wanted = new Set(pack.freq.slice(0, COMMON));
  for (const items of Object.values(pack.themes ?? {})) for (const [term] of items) wanted.add(normalizeWord(term, lang));
  const found = new Map<string, SoundsRecording[]>();

  const cached = kaikkiFile(source);
  let input: Readable;
  if (existsSync(cached)) input = createReadStream(cached).pipe(createGunzip());
  else {
    const res = await fetch(kaikkiUrl(source));
    if (!res.ok || !res.body) throw new Error(`${kaikkiUrl(source)} → HTTP ${res.status}`);
    input = Readable.fromWeb(res.body as import('node:stream/web').ReadableStream).pipe(createGunzip());
  }
  input.setEncoding('utf8');
  const marker = `"lang_code": "${lang}"`;
  let buffer = '';
  let lines = 0;
  const take = (line: string) => {
    lines++;
    if (lines % 200_000 === 0) console.log(`  ${lang}: ${lines.toLocaleString()} entries, ${found.size.toLocaleString()} words with a recording`);
    if (!line.includes(marker) || !line.includes('"audio"')) return;
    let e: { word?: string; lang_code?: string; sounds?: Sound[] };
    try {
      e = JSON.parse(line);
    } catch {
      return;
    }
    if (e.lang_code !== lang || !e.word || !e.sounds) return;
    const key = normalizeWord(e.word, lang);
    if (!wanted.has(key)) return;
    const list = found.get(key) ?? [];
    for (const s of e.sounds) {
      const r = recording(s, lang);
      if (r && !list.some((x) => x[1] === r[1])) list.push(r);
    }
    if (list.length) found.set(key, list);
  };
  for await (const chunk of input as AsyncIterable<string>) {
    buffer += chunk;
    let at: number;
    while ((at = buffer.indexOf('\n')) >= 0) {
      take(buffer.slice(0, at));
      buffer = buffer.slice(at + 1);
    }
  }
  if (buffer) take(buffer);
  const fromKaikki = found.size;
  await fromCommons(lang, wanted, found);
  console.log(`  ${lang}: ${fromKaikki.toLocaleString()} words from Wiktionary's entries, ${found.size.toLocaleString()} with Commons' categories`);

  const words: Record<string, SoundsRecording[]> = {};
  for (const [key, list] of [...found].sort(([a], [b]) => (a < b ? -1 : 1))) words[key] = choose(list);
  const file: SoundsFile = { format: SOUNDS_FORMAT, lang, builtAt: new Date().toISOString(), source: 'English Wiktionary via kaikki.org; recordings on Wikimedia Commons (Lingua Libre and Wiktionary contributors)', words };
  mkdirSync(OUT_DIR, { recursive: true });
  const gz = gzipSync(JSON.stringify(file), { level: 9 });
  writeFileSync(new URL(soundsFileName(lang), OUT_DIR), gz);
  const top = pack.freq.slice(0, COMMON).filter((w) => words[w]).length;
  console.log(`✓ ${lang}: ${Object.keys(words).length.toLocaleString()} words, ${top.toLocaleString()} of the ${COMMON.toLocaleString()} most common (${Math.round((top / COMMON) * 100)}%), ${Math.round(gz.length / 1024)} KB`);
}

for (const lang of LANGS) await build(lang);
