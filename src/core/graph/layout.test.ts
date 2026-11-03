import { describe, expect, it } from 'vitest';
import type { FullDictRow, FullEntry } from '@/core/dictionary/format';
import { normalizeWord } from '@/core/text/normalize';
import es from './fixtures/es.json';
import { layoutAtlas } from './layout';
import { buildWeb, type WebInput } from './model';
import { regionsOf } from './regions';

type Fixture = { lang: string; words: Array<{ w: string; r?: number; c?: string[]; e: unknown[] }>; themes?: Record<string, string[][]> };
const f = es as Fixture;
const dict = new Map(f.words.map((w): [string, FullDictRow] => { const key = normalizeWord(w.w, 'es'); return [key, { lang: 'es', key, fold: key, word: w.w, rank: w.r, entries: w.e as FullEntry[] }]; }));
const input = (words: string[]): WebInput => ({ lang: 'es', words: words.map((w) => ({ key: w, state: 1 })), dict, themes: f.themes });
const WORDS = ['mar', 'playa', 'barco', 'costa', 'isla', 'marina', 'marino', 'se', 'de', 'el', 'perro', 'perra', 'can', 'agua', 'lluvia', 'bebida', 'hacer', 'deshacer'];

describe('the atlas’s layout', () => {
  it('is the same every time and puts every word somewhere on the page', () => {
    const web = buildWeb(input(WORDS));
    const a = layoutAtlas(web, regionsOf(web)), b = layoutAtlas(web, regionsOf(web));
    expect([...a.x]).toEqual([...b.x]);
    expect([...a.x, ...a.y].every(Number.isFinite)).toBe(true);
    // No two words on top of each other.
    const words = web.nodes.flatMap((n, i) => (n.kind === 'word' ? [i] : []));
    for (const i of words) for (const j of words) if (i < j) expect(Math.hypot(a.x[i] - a.x[j], a.y[i] - a.y[j])).toBeGreaterThan(1);
  });

  it('keeps regions apart: a word is nearer its own region’s words than another region’s middle', () => {
    const web = buildWeb(input(WORDS));
    const regions = regionsOf(web);
    const { x, y } = layoutAtlas(web, regions);
    const middle = (ms: number[]) => [ms.reduce((s, m) => s + x[m], 0) / ms.length, ms.reduce((s, m) => s + y[m], 0) / ms.length];
    const sea = regions.regions.find((r) => r.id === 'theme:sea')!, little = regions.regions.find((r) => r.id === 'little')!;
    const [sx, sy] = middle(sea.members), [lx, ly] = middle(little.members);
    for (const m of sea.members) expect(Math.hypot(x[m] - sx, y[m] - sy)).toBeLessThan(Math.hypot(x[m] - lx, y[m] - ly));
  });

  it('adds a new word beside its neighbours and moves nothing else', () => {
    const first = buildWeb(input(WORDS.filter((w) => w !== 'marina')));
    const placed = layoutAtlas(first, regionsOf(first));
    const next = buildWeb(input(WORDS));
    const again = layoutAtlas(next, regionsOf(next), { ids: first.nodes.map((n) => n.id), x: placed.x, y: placed.y });
    for (const [i, n] of first.nodes.entries()) if (n.kind === 'word') {
      const j = next.byKey.get(n.key)!;
      expect([again.x[j], again.y[j]]).toEqual([placed.x[i], placed.y[i]]);
    }
    const m = next.byKey.get('marina')!, mar = next.byKey.get('mar')!;
    expect(Math.hypot(again.x[m] - again.x[mar], again.y[m] - again.y[mar])).toBeLessThan(30);
  });
});
