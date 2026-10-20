// Downloads the full dictionary's extras (4.0-2) into scripts/.cache, before dictionary.ts:
//   node scripts/lang-data/dictionary-fetch.ts          → the six core languages
//   node scripts/lang-data/dictionary-fetch.ts fr de    → only these
// 1. The language's own Wiktionary (kaikki.org, every edition but the Arabic one). An edition has
//    every language in it (100–740 MB), so it is streamed and only the language's own words are kept,
//    as small [word, part of speech, definitions] lines in mono-<lang>.jsonl.gz.
// 2. Tatoeba's sentences in the language, their links to English and the English sentences,
//    decompressed with bunzip2 (Git Bash and every Linux and macOS have it).
import { execFileSync } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, renameSync, statSync } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { createGunzip, createGzip } from 'node:zlib';
import { DICT_LANGS } from '../../src/core/dictionary/format.ts';
import { CACHE_DIR, MONO_LANGS, monoFile, monoUrl, TATOEBA_CODES, tatoebaFile, tatoebaUrl } from './sources.ts';

const DAY = 24 * 60 * 60 * 1000;
const fresh = (file: URL) => existsSync(file) && statSync(file).size > 0 && Date.now() - statSync(file).mtimeMs < 30 * DAY;

interface Sense { glosses?: string[]; form_of?: unknown; alt_of?: unknown; tags?: string[] }

async function mono(lang: string) {
  const target = monoFile(lang);
  if (fresh(target)) return console.log(`✓ mono-${lang} (cached)`);
  const res = await fetch(monoUrl(lang));
  if (!res.ok || !res.body) throw new Error(`${monoUrl(lang)} → HTTP ${res.status}`);
  const marker = `"lang_code": "${lang}"`;
  const out = createGzip({ level: 6 });
  const partial = new URL(`mono-${lang}.jsonl.gz.part`, CACHE_DIR);
  const written = pipeline(out, createWriteStream(partial));
  const input = Readable.fromWeb(res.body as import('node:stream/web').ReadableStream).pipe(createGunzip());
  input.setEncoding('utf8');
  let buffer = '';
  let kept = 0;
  let lines = 0;
  const take = (line: string) => {
    lines++;
    if (lines % 500_000 === 0) console.log(`  ${lang}: ${lines.toLocaleString()} lines, ${kept.toLocaleString()} kept`);
    if (!line.includes(marker)) return;
    let e: { word?: string; lang_code?: string; pos?: string; senses?: Sense[] };
    try {
      e = JSON.parse(line);
    } catch {
      return;
    }
    if (e.lang_code !== lang || !e.word || !e.senses) return;
    const defs = e.senses
      .filter((s) => !s.form_of && !s.alt_of && !s.tags?.includes('form-of'))
      .map((s) => s.glosses?.at(-1)?.replace(/\s+/g, ' ').trim())
      .filter((g): g is string => Boolean(g));
    if (!defs.length) return;
    kept++;
    out.write(`${JSON.stringify([e.word, e.pos ?? '', defs.slice(0, 12)])}\n`);
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
  out.end();
  await written;
  renameSync(partial, target);
  console.log(`✓ mono-${lang}: ${kept.toLocaleString()} entries of ${lines.toLocaleString()}`);
}

async function tatoeba(file: string) {
  const target = tatoebaFile(file);
  if (fresh(target)) return console.log(`✓ ${file} (cached)`);
  mkdirSync(new URL('tatoeba/', CACHE_DIR), { recursive: true });
  const res = await fetch(tatoebaUrl(file));
  if (!res.ok || !res.body) throw new Error(`${tatoebaUrl(file)} → HTTP ${res.status}`);
  const packed = fileURLToPath(target) + '.bz2';
  await pipeline(Readable.fromWeb(res.body as import('node:stream/web').ReadableStream), createWriteStream(packed));
  execFileSync('bunzip2', ['-f', packed]);
  console.log(`✓ ${file}`);
}

const wanted = process.argv.slice(2);
const langs = wanted.length ? wanted : DICT_LANGS;
await tatoeba('eng_sentences.tsv');
for (const lang of langs) {
  const code = TATOEBA_CODES[lang];
  if (code) {
    await tatoeba(`${code}_sentences.tsv`);
    await tatoeba(`${code}-eng_links.tsv`);
  }
  if (MONO_LANGS.includes(lang)) await mono(lang);
}
