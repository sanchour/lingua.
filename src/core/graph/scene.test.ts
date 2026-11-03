import { describe, expect, it } from 'vitest';
import { bendOf, cutQuad, nibOutline } from './curves';
import type { Neighbour } from './model';
import { atlasScene, compassScene, QUARTER_MAX, RING_1, treeScene } from './scene';

const word = (label: string, quarter: Neighbour['quarter'] = 'form', extra: Partial<Neighbour> = {}): Neighbour => ({ quarter, kind: 'family', label, key: label, state: 1, ...extra });

describe('the compass', () => {
  it('puts each quarter on its own side, the word in the middle', () => {
    const s = compassScene({ word: { key: 'mar', label: 'mar' }, neighbours: [word('marina', 'form'), word('ola', 'meaning'), { quarter: 'origin', kind: 'cognate', label: 'mer', lang: 'fr' }, { quarter: 'use', kind: 'phrase', label: 'alta mar' }] });
    const at = (label: string) => s.nodes.find((n) => n.label === label)!;
    expect([at('mar').x, at('mar').y]).toEqual([0, 0]);
    expect(at('marina').x).toBeGreaterThan(0); // form: east
    expect(at('ola').x).toBeLessThan(0); // meaning: west
    expect(at('mer').y).toBeLessThan(0); // origin: north
    expect(at('alta mar').y).toBeGreaterThan(0); // use: south
    expect(Math.round(Math.hypot(at('marina').x, at('marina').y))).toBe(RING_1);
  });

  it('shows seven a quarter and says how many more; look-alikes only when asked', () => {
    const many = Array.from({ length: 10 }, (_, i) => word(`w${i}`));
    const lookalike: Neighbour = { quarter: 'form', kind: 'lookalike', label: 'pero', optional: true };
    const s = compassScene({ word: { key: 'perro', label: 'perro' }, neighbours: [...many, lookalike] });
    expect(s.nodes.filter((n) => n.ring === 1)).toHaveLength(QUARTER_MAX);
    expect(s.nodes.find((n) => n.kind === 'more')?.label).toBe('+3');
    expect(compassScene({ word: { key: 'perro', label: 'perro' }, neighbours: [lookalike] }).nodes).toHaveLength(1);
    expect(compassScene({ word: { key: 'perro', label: 'perro' }, neighbours: [lookalike], lookalikes: true }).nodes).toHaveLength(2);
  });

  it('draws a theme’s other words once on the outer ring, joined to every theme they share', () => {
    const themes: Neighbour[] = [{ quarter: 'meaning', kind: 'theme', label: 'The sea' }, { quarter: 'meaning', kind: 'theme', label: 'Travel' }];
    const members = new Map([['The sea', [word('playa', 'meaning'), word('costa', 'meaning')]], ['Travel', [word('playa', 'meaning')]]]);
    const s = compassScene({ word: { key: 'mar', label: 'mar' }, neighbours: themes, members });
    expect(s.nodes.filter((n) => n.label === 'playa')).toHaveLength(1);
    expect(s.edges.filter((e) => e.style === 'member')).toHaveLength(3);
  });
});

describe('the tree scene', () => {
  it('puts a parent over the middle of its children and the ancestor above', () => {
    const s = treeScene({
      roots: [{ key: 'hacer', label: 'hacer', children: [{ key: 'deshacer', label: 'deshacer', focus: true, children: [] }, { key: 'rehacer', label: 'rehacer', children: [] }] }],
      ancestor: { lang: 'osp', word: 'fazer' },
      cognates: [],
    });
    const at = (label: string) => s.nodes.find((n) => n.label === label)!;
    expect(at('hacer').x).toBe((at('deshacer').x + at('rehacer').x) / 2);
    expect(at('fazer').y).toBeLessThan(at('hacer').y);
    expect(at('deshacer').kind).toBe('centre');
    expect(s.edges.filter((e) => e.style === 'elbow')).toHaveLength(2);
  });
});

describe('curves', () => {
  it('cuts a curve so it ends at its end when whole, and bends to one side', () => {
    const a = [0, 0] as const, b = [100, 0] as const, c = bendOf(a, b);
    expect(c[1]).toBeGreaterThan(0);
    expect(cutQuad(a, c, b, 1)[1]).toEqual([100, 0]);
    expect(cutQuad(a, c, b, 0)[1]).toEqual([0, 0]);
    expect(nibOutline(a, c, b, 3, 8)).toHaveLength(18);
  });
});

describe('the atlas scene', () => {
  const row = {
    nodes: [{ id: 'w:mar', kind: 'word', label: 'mar', rank: 850, region: 'theme:sea' }, { id: 'w:playa', kind: 'word', label: 'playa', rank: 900, region: 'theme:sea' }, { id: 'w:se', kind: 'word', label: 'se', rank: 20, region: 'little' }, { id: 'affix:des-', kind: 'affix', label: 'des-' }],
    x: new Float32Array([0, 10, 200, 5]),
    y: new Float32Array([0, 0, 0, 5]),
    threads: new Uint32Array([0, 1, 0, 2, 3, 0]),
    families: new Uint8Array([1, 0, 1]),
    regions: [{ id: 'theme:sea', label: 'The sea' }, { id: 'little', label: 'The little words' }],
  };
  it('lays states over the cached positions, gives each region a disc, and marks threads to hubs', () => {
    const s = atlasScene({ row, states: new Map([['mar', 1], ['playa', 2]]), memory: { mar: 0.5 }, regionLabel: (id, l) => (id === 'little' ? 'Las palabras pequeñas' : l) });
    expect(s.nodes.map((n) => [n.label, n.state, n.region])).toEqual([['mar', 1, 0], ['playa', 2, 0], ['se', undefined, 1], ['des-', undefined, undefined]]);
    expect(s.nodes[0].memory).toBe(0.5);
    expect(s.edges.map((e) => e.style)).toEqual(['form', 'meaning', 'member']);
    expect(s.regions?.map((r) => [r.label, r.x])).toEqual([['The sea', 5], ['Las palabras pequeñas', 200]]);
    expect(s.key).toBe('atlas');
  });
});
