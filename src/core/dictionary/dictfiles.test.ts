import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { etymonName } from '@/features/thesaurus/dictionary/WordOrigin';
import { DICT_LANGS, DICT_VERSION, dictFileName } from './format';
import type { FullDictFile } from './format';

const DIR = join(process.cwd(), 'public', 'dict');
const read = (lang: string) => JSON.parse(gunzipSync(readFileSync(join(DIR, dictFileName(lang)))).toString('utf8')) as FullDictFile;

describe('the shipped dictionaries', () => {
  it('has a file for each of the six core languages at the current version, and none from an older one', () => {
    expect(DICT_VERSION).toBe(3);
    for (const lang of DICT_LANGS) {
      expect(existsSync(join(DIR, dictFileName(lang))), lang).toBe(true);
      expect(existsSync(join(DIR, `${lang}.v${DICT_VERSION - 1}.json.gz`)), `${lang} old`).toBe(false);
    }
  });

  it('Spanish carries the language’s half of a word: syllables, what it is made of, where it comes from', () => {
    const file = read('es');
    expect(file.version).toBe(DICT_VERSION);
    const entry = (w: string) => file.words.find((x) => x.w === w)?.e[0];
    expect(entry('desdecir')).toMatchObject({ syl: ['des', 'de', 'cir'], parts: ['des-', 'decir'] });
    expect(entry('casa')?.syl).toEqual(['ca', 'sa']);
    expect(entry('hacer')?.root).toEqual(['osp', 'fazer']);
    // Cognates only name languages Lingua has, never a stray dialect code.
    const codes = new Set(file.words.flatMap((w) => w.e.flatMap((e) => (e.cog ?? []).map(([l]) => l))));
    expect(codes.has('en')).toBe(true);
    expect(codes.has('roa-ang')).toBe(false);
    // Nothing the build adds is a placeholder.
    for (const w of file.words.slice(0, 5000)) for (const e of w.e) {
      expect(e.root?.[1]).not.toBe('-');
      expect(e.parts?.some((p) => p.includes('<'))).not.toBe(true);
    }
  });

  it('names an older stage of a language, and falls back to its code', () => {
    expect(etymonName('fr')).toBe('French');
    expect(etymonName('gem-pro')).toBe('Proto-Germanic');
    expect(etymonName('xx-unknown')).toBe('xx-unknown');
  });
});
