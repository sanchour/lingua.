import { readdirSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { plain, splitFocus, topicsOf } from './types';
import type { Grammar } from './types';

// Listed from disk (not import.meta.glob): Vitest's transform cache would freeze a glob's file list.
const TOPICS = join(process.cwd(), 'src', 'core', 'grammar', 'topics');
const MODULES: Record<string, { default: Grammar }> = {};
for (const file of readdirSync(TOPICS).filter((f) => f.endsWith('.ts'))) {
  MODULES[`./topics/${file}`] = (await import(/* @vite-ignore */ pathToFileURL(join(TOPICS, file)).href)) as { default: Grammar };
}

/** The pack's example sentences, read without parsing the whole pack. */
function packSentences(lang: string): Set<string> {
  const text = gunzipSync(readFileSync(join(process.cwd(), 'public', 'packs', `${lang}.v7.json.gz`))).toString('utf8');
  const start = text.indexOf('"examples":') + '"examples":'.length;
  const end = text.indexOf(',"themes":', start);
  const examples = JSON.parse(text.slice(start, end)) as Array<[number, string, string]>;
  return new Set(examples.map((e) => squash(e[1])));
}

const squash = (s: string) => s.normalize('NFC').replace(/\s+/g, ' ').trim();

describe('grammar modules', () => {
  for (const [path, mod] of Object.entries(MODULES)) {
    const g = mod.default;
    const lang = path.slice('./topics/'.length, -3);
    describe(lang, () => {
      const topics = topicsOf(g);

      it('names its language and its sources', () => {
        expect(g.lang).toBe(lang);
        expect(g.sources.length).toBeGreaterThan(0);
      });

      it('has unique topic ids and resolvable links', () => {
        const ids = topics.map((t) => t.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const t of topics) for (const r of t.related ?? []) expect(ids, `${t.id} → ${r}`).toContain(r);
      });

      it('gives every topic a rule, a reminder and at least four items', () => {
        for (const t of topics) {
          expect(t.rule.length, t.id).toBeGreaterThan(0);
          expect(t.why.length, t.id).toBeGreaterThan(0);
          expect(t.items.length, t.id).toBeGreaterThanOrEqual(4);
        }
      });

      it('marks one form per item, with three distinct wrong forms', () => {
        for (const t of topics) {
          for (const item of t.items) {
            const where = `${t.id}: ${item.s}`;
            expect(item.s.split('[').length - 1, where).toBe(1);
            const { focus } = splitFocus(item.s);
            expect(focus.trim().length, where).toBeGreaterThan(0);
            const options = [focus, ...item.wrong].map((o) => o.toLocaleLowerCase(lang));
            expect(new Set(options).size, where).toBe(4);
            for (const w of item.wrong) expect(w.trim().length, where).toBeGreaterThan(0);
          }
        }
      });

      it('takes every sentence from the language pack', () => {
        const real = packSentences(lang);
        for (const t of topics) {
          for (const ex of [...(t.examples ?? []), ...t.items, ...(t.compare?.sides.flatMap((s) => (s.example ? [s.example] : [])) ?? [])]) {
            expect(real.has(squash(plain(ex.s))), `${t.id}: ${plain(ex.s)}`).toBe(true);
          }
        }
      });

      it('has no repeated sentence within a topic', () => {
        for (const t of topics) {
          const seen = t.items.map((i) => plain(i.s));
          expect(new Set(seen).size, t.id).toBe(seen.length);
        }
      });
    });
  }
});
