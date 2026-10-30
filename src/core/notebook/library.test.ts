import { describe, expect, it } from 'vitest';
import { fillTemplate, noteLinkPath, tagsOf, templateSlots, notebookConnections, filterLibrary, sourcePath } from './library';
describe('phrase templates and notebook links', () => {
  it('keeps replacements literal and requires every distinct slot', () => {
    expect(templateSlots('Hola {nombre}, {nombre}: {lugar}')).toEqual(['nombre', 'lugar']);
    expect(fillTemplate('Hola {nombre}', { nombre: '$& <script>' })).toBe('Hola $& <script>');
    expect(() => fillTemplate('{nombre}', {})).toThrow();
    expect(() => fillTemplate('{constructor}', {})).toThrow();
  });
  it('deduplicates tags and builds internal encoded links', () => {
    expect(tagsOf('trip, trip, food')).toEqual(['trip', 'food']);
    expect(noteLinkPath({ kind: 'word', target: 'a&b', label: '' })).toBe('/thesaurus?tab=dictionary&word=a%26b');
    expect(noteLinkPath({ kind: 'note', target: 'https://evil.test', label: '' })).toContain('/mentis/notebook?note=https%3A');
  });
});

it('bounds and deduplicates the personal note graph without inventing relationships', () => {
  const n = { id: 'n', lang: 'es', title: 'Gender', body: '', kind: 'Grammar' as const, folder: '', tags: [], createdAt: 1, updatedAt: 1, links: [{ kind: 'word' as const, target: 'casa', label: 'casa' }] };
  const graph = notebookConnections([n, { ...n, id: 'n2' }]);
  expect(graph.targets).toHaveLength(1); expect(graph.edges).toEqual([{ from: 0, to: 0 }, { from: 1, to: 0 }]);
  expect(notebookConnections(Array.from({ length: 60 }, (_, i) => ({ ...n, id: String(i) }))).notes).toHaveLength(40);
});

it('searches note text, tags and attached links within a folder without deleted items', () => {
  const n = { id: 'n', lang: 'es', title: 'Gender', body: 'Feminine nouns', kind: 'Grammar' as const, folder: 'Grammar', tags: ['articles'], createdAt: 1, updatedAt: 1, links: [{ kind: 'word' as const, target: 'casa', label: 'house' }] };
  expect(filterLibrary([n, { ...n, id: 'gone', deletedAt: 2 }], 'articles house', 'Grammar')).toEqual([n]);
  expect(filterLibrary([n], 'feminine', 'Travel')).toEqual([]);
});

it('keeps captured source links inside the app at a GitHub Pages base path', () => {
  expect(sourcePath('/lingua./mentis/notebook', '?note=one', '/lingua./')).toBe('/mentis/notebook?note=one');
  expect(sourcePath('/thesaurus', '', '/')).toBe('/thesaurus');
  expect(() => fillTemplate(Array.from({ length: 21 }, (_, i) => '{slot' + i + '}').join(' '), {})).toThrow();
});
