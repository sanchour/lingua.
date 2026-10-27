import { describe as group, expect, it } from 'vitest';
import { notesOn, roomFor, toMarkdown } from './notes';
import type { DesignNote } from './notes';
import { cssPath, describe } from './selector';
import type { NodeLike } from './selector';

function node(tagName: string, attrs: Record<string, string> = {}, children: NodeLike[] = [], text = ''): NodeLike {
  const el: NodeLike = {
    tagName: tagName.toUpperCase(),
    id: attrs.id ?? '',
    parentElement: null,
    children,
    getAttribute: (name) => attrs[name] ?? null,
    textContent: text || children.map((c) => c.textContent).join(' '),
  };
  for (const child of children) child.parentElement = el;
  return el;
}

const note = (over: Partial<DesignNote>): DesignNote => ({
  id: 'a',
  path: '/',
  room: 'Home',
  selector: 'main > button',
  element: 'button “Continue”',
  text: 'Make it calmer.',
  rect: { x: 10.4, y: 20.6, w: 100, h: 40 },
  window: { w: 1440, h: 900 },
  light: 'Paper, Cream',
  language: 'Spanish',
  version: '0.5.2-alpha.7',
  createdAt: 1,
  updatedAt: 1,
  done: false,
  ...over,
});

group('design notes', () => {
  it('names the room of a path', () => {
    expect(roomFor('/')).toBe('Home');
    expect(roomFor('/codex/read/abc?x=1')).toBe('Codex');
    expect(roomFor('/settings/lab')).toBe('Settings');
    expect(roomFor('/ratio?tab=iter')).toBe('Ratio');
    expect(roomFor('/cantus/song/1')).toBe('Cantus');
  });

  it('keeps a page’s notes in the order they were made', () => {
    const list = [note({ id: 'b', createdAt: 5 }), note({ id: 'c', path: '/codex' }), note({ id: 'a', createdAt: 2 })];
    expect(notesOn(list, '/').map((n) => n.id)).toEqual(['a', 'b']);
    expect(notesOn([...list, note({ id: 'f', room: 'First start' })], '/', 'First start').map((n) => n.id)).toEqual(['f']);
  });

  it('writes Markdown grouped by room and page', () => {
    const md = toMarkdown([note({}), note({ id: 'b', path: '/codex', room: 'Codex', text: 'Two\nlines', done: true, createdAt: 2 })], { version: '0.5.2-alpha.7', at: Date.UTC(2026, 9, 27) });
    expect(md).toContain('# Lingua · design notes');
    expect(md).toContain('2 notes (1 open)');
    expect(md).toContain('## Home · `/`');
    expect(md).toContain('1. **button “Continue”** · `main > button`');
    expect(md).toContain('   Make it calmer.');
    expect(md).toContain('*at 10, 21 · 100 × 40 · window 1440 × 900 · Paper, Cream · Spanish*');
    expect(md).toContain('## Codex · `/codex`');
    expect(md).toContain('1. (done) **button “Continue”**');
    expect(md).toContain('   Two\n   lines');
  });

  it('finds an element by a short CSS path', () => {
    const target = node('button', { 'aria-label': 'Next "page"' });
    const other = node('button');
    const list = node('div', {}, [other, target]);
    node('main', {}, [node('h1'), list]);
    expect(cssPath(target)).toBe('main > div > button[aria-label="Next \\"page\\""]:nth-of-type(2)');
    const withId = node('section', { id: 'today' }, [node('p'), node('p')]);
    expect(cssPath(withId.children[1] as NodeLike)).toBe('#today > p:nth-of-type(2)');
  });

  it('names an element as a person would', () => {
    expect(describe(node('button', {}, [], 'Continue  reading'))).toBe('button “Continue reading”');
    expect(describe(node('div', { role: 'radio', 'aria-label': 'A2' }))).toBe('radio “A2”');
    expect(describe(node('div'))).toBe('block');
  });
});
