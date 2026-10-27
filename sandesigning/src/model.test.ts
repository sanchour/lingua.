import { describe, expect, it } from 'vitest';
import { toBrief, priorityCount } from './brief';
import { comboOf, capsOf } from './keys';
import { cloneNodes, descendants, domAt, domBox, frameAt, newDoc, normalize } from './model';
import type { FrameNode, ImageNode, PinNode, SNode, TextNode } from './model';

const frame = (id: string, x: number, y: number, w: number, h: number, parent?: string): FrameNode => ({ id, type: 'frame', name: id, x, y, w, h, parent, fill: '#ffffff' });
const rect = (id: string, parent?: string): SNode => ({ id, type: 'rect', x: 10, y: 10, w: 20, h: 20, parent });

describe('normalize', () => {
  it('puts each frame right before its children, keeping sibling order', () => {
    const nodes = [rect('a', 'f'), frame('f', 0, 0, 100, 100), rect('b'), rect('c', 'f')];
    expect(normalize(nodes).map((n) => n.id)).toEqual(['f', 'a', 'c', 'b']);
  });

  it('forgets parents that are gone or point at themselves', () => {
    const nodes = normalize([rect('a', 'missing'), { ...rect('b'), parent: 'b' }]);
    expect(nodes.map((n) => n.parent)).toEqual([undefined, undefined]);
  });

  it('nests frames in frames', () => {
    const nodes = normalize([rect('x', 'inner'), frame('inner', 0, 0, 50, 50, 'outer'), frame('outer', 0, 0, 100, 100)]);
    expect(nodes.map((n) => n.id)).toEqual(['outer', 'inner', 'x']);
    expect(descendants(nodes, 'outer').map((n) => n.id)).toEqual(['inner', 'x']);
  });
});

describe('frames and copies', () => {
  it('finds the innermost frame under a point', () => {
    const nodes = [frame('outer', 0, 0, 200, 200), frame('inner', 50, 50, 50, 50, 'outer')];
    expect(frameAt(nodes, 60, 60, new Set())?.id).toBe('inner');
    expect(frameAt(nodes, 10, 10, new Set())?.id).toBe('outer');
    expect(frameAt(nodes, 60, 60, new Set(['inner']))?.id).toBe('outer');
  });

  it('copies with new ids, children following their copied frame', () => {
    const copy = cloneNodes([frame('f', 0, 0, 100, 100), rect('a', 'f')], 5, 5);
    expect(copy[0].id).not.toBe('f');
    expect(copy[1].parent).toBe(copy[0].id);
    expect(copy[1].x).toBe(15);
  });
});

describe('captured pages', () => {
  // A 200 × 100 window captured at twice the pixels, shown at its CSS size.
  const img: ImageNode = { id: 'i', type: 'image', asset: 'a', nw: 400, nh: 200, x: 1000, y: 500, w: 200, h: 100, scale: 2 };
  const dom = [
    { x: 0, y: 0, w: 200, h: 100, name: 'main', selector: 'main', depth: 1 },
    { x: 20, y: 10, w: 60, h: 30, name: 'button “Go”', selector: 'main > button', depth: 2 },
  ];

  it('finds the smallest element under a point', () => {
    expect(domAt(img, dom, 1030, 520)?.name).toBe('button “Go”');
    expect(domAt(img, dom, 1150, 580)?.name).toBe('main');
  });

  it('places an element on the canvas, through a cut-out too', () => {
    expect(domBox(img, dom[1])).toEqual({ x: 1020, y: 510, w: 60, h: 30 });
    const cut: ImageNode = { ...img, x: 0, y: 0, w: 60, h: 30, crop: { x: 40, y: 20, w: 120, h: 60 } };
    expect(domBox(cut, dom[1])).toEqual({ x: 0, y: 0, w: 60, h: 30 });
  });
});

describe('the brief', () => {
  const doc = newDoc('Shop');
  const f = frame('f', 100, 100, 390, 844);
  f.device = 'phone';
  const title: TextNode = { id: 't', type: 'text', text: 'Welcome', x: 124, y: 140, w: 120, h: 30, font: 'Inter', size: 24, weight: 700, color: '#111111', align: 'left', lineHeight: 1.3, auto: true, parent: 'f' };
  const pin = (n: number, priority?: PinNode['priority'], done = false): PinNode => ({ id: `p${n}`, type: 'pin', n, x: 186, y: 186, w: 28, h: 28, text: `Note ${n}`, kinds: ['Spacing'], priority, done, parent: 'f', target: { name: 'button “Buy”', selector: 'main > .buy' } });
  doc.nodes = [f, title, pin(1, 'Could'), pin(2, 'Must'), pin(3, 'Should', true)];
  const md = toBrief(doc, 'shop.png');

  it('lists open notes by priority, done ones last, with what they are on', () => {
    const order = ['2. **Must', '1. **Could', '3. **Done'].map((s) => md.indexOf(s));
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(md).toContain('At 100, 100 in “f”, on button “Buy” (`main > .buy`)');
  });

  it('writes the layout relative to its frame', () => {
    expect(md).toContain('## Frame “f” · 390 × 844 (Phone)');
    expect(md).toContain('Text “Welcome” · Inter 24/700 · #111111 · left · 24, 40 · 120 × 30');
    expect(md).toContain('`shop.png`');
  });

  it('counts open notes by priority', () => {
    expect(priorityCount(doc.nodes.filter((n): n is PinNode => n.type === 'pin'))).toBe('Must 1 · Could 1');
  });
});

describe('keys', () => {
  const key = (init: KeyboardEventInit) => ({ key: '', code: '', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...init }) as KeyboardEvent;

  it('names combinations by the key’s place', () => {
    expect(comboOf(key({ key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }))).toBe('mod+shift+z');
    expect(comboOf(key({ key: '!', code: 'Digit1', shiftKey: true }))).toBe('shift+1');
    expect(comboOf(key({ key: '[', code: 'BracketLeft' }))).toBe('[');
  });

  it('finds the question mark on any layout', () => {
    expect(comboOf(key({ key: '?', code: 'Minus', shiftKey: true }))).toBe('shift+/');
  });

  it('shows keys as key caps', () => {
    expect(capsOf('shift+arrowup')).toEqual(['⇧', '↑']);
  });
});
