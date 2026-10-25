// Typing practice's data (5.1-4a), from the committed language packs:
//   node scripts/typing/build.ts          → the six core languages
//   node scripts/typing/build.ts ru       → only these
// For each language, its letters in the order they're met in real text (each word counted by how
// common it is) and its 3,000 most common words made only of those letters; for Mandarin, the
// pinyin of its most common characters and words instead (pinyin-pro), for typing pinyin and
// picking characters. Written to src/core/typing/data/<lang>.json.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { pinyin } from 'pinyin-pro';
import type { PackFile } from '../../src/core/packs/format.ts';
import { packFileName } from '../../src/core/packs/format.ts';
import type { TypingData } from '../../src/core/typing/types.ts';
import { PACKS_DIR } from '../lang-data/sources.ts';

const LANGS = process.argv.slice(2).length ? process.argv.slice(2) : ['fr', 'es', 'de', 'ru', 'ar', 'zh'];
const OUT = new URL('../../src/core/typing/data/', import.meta.url);

/** The letters each language types (lowercase): anything else in a word rules the word out. */
const ALPHABET: Record<string, RegExp> = {
  fr: /^[a-zàâæçéèêëîïôœùûüÿ]+$/u,
  es: /^[a-zñáéíóúü]+$/u,
  de: /^[a-zäöüß]+$/u,
  ru: /^[а-яё]+$/u,
  // The letters on the Arabic keyboard, without the short vowels (texts don't write them).
  ar: /^[ءآأؤإئابةتثجحخدذرزسشصضطظعغفقكلمنهوىي]+$/u,
  zh: /^[a-zü]+$/u,
};

const weight = (rank: number) => 1 / (rank + 20);

function build(lang: string) {
  const pack = JSON.parse(gunzipSync(readFileSync(new URL(packFileName(lang), PACKS_DIR))).toString('utf8')) as PackFile;
  const letters = new Map<string, number>();
  const count = (word: string, w: number) => {
    for (const c of word) letters.set(c, (letters.get(c) ?? 0) + w);
  };
  let data: TypingData;
  if (lang === 'zh') {
    // Characters by how common they are in common words; each with its pinyin (tone number) and toneless syllable.
    const chars = new Map<string, number>();
    pack.freq.slice(0, 20_000).forEach((word, rank) => {
      for (const c of word) if (/\p{Script=Han}/u.test(c)) chars.set(c, (chars.get(c) ?? 0) + weight(rank));
    });
    const top = [...chars].sort((a, b) => b[1] - a[1]).slice(0, 1500).map(([c]) => c);
    const syllables: Array<[string, string, string]> = [];
    for (const c of top) {
      const withTone = pinyin(c, { toneType: 'num', type: 'array' })[0] ?? '';
      const plain = withTone.replace(/[0-5]$/, '').replace(/ü/g, 'v');
      if (!/^[a-zv]+$/.test(plain)) continue;
      syllables.push([c, plain, withTone]);
    }
    syllables.forEach(([, plain], i) => count(plain.replace(/v/g, 'ü'), weight(i)));
    const words = pack.freq
      .slice(0, 8000)
      .filter((w) => /^\p{Script=Han}{2,3}$/u.test(w))
      .slice(0, 1500)
      .map((w) => [w, pinyin(w, { toneType: 'none', type: 'array' }).join(' ').replace(/ü/g, 'v')] as [string, string])
      .filter(([, p]) => /^[a-zv ]+$/.test(p));
    data = { lang, letters: [], words: [], chars: syllables, charWords: words };
  } else {
    const words: string[] = [];
    pack.freq.slice(0, 30_000).forEach((raw, rank) => {
      const word = raw.toLocaleLowerCase(lang);
      if (!ALPHABET[lang].test(word)) return;
      count(word, weight(rank));
      if (word.length >= 2 && word.length <= 12 && words.length < 3000 && !words.includes(word)) words.push(word);
    });
    data = { lang, letters: [], words };
  }
  const total = [...letters.values()].reduce((a, b) => a + b, 0);
  data.letters = [...letters]
    .filter(([c]) => ALPHABET[lang].test(c))
    .sort((a, b) => b[1] - a[1])
    .map(([c, n]) => [c, Math.round((n / total) * 10_000) / 10_000] as [string, number]);
  mkdirSync(OUT, { recursive: true });
  writeFileSync(new URL(`${lang}.json`, OUT), `${JSON.stringify(data)}\n`);
  console.log(`✓ ${lang}: ${data.letters.map(([c]) => c).join(' ')} · ${data.words.length || data.chars?.length} ${lang === 'zh' ? 'characters' : 'words'}`);
}

for (const lang of LANGS) build(lang);
