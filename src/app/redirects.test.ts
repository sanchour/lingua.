import { describe, expect, it } from 'vitest';
import { movedPath, roomKey } from './redirects';
import { PRIMARY_SECTIONS, SECTIONS, SHORTCUT_SECTIONS, TOOL_SECTIONS, sectionKey } from './sections';

describe('movedPath', () => {
  it.each([
    ['/grammatica', '', '/cursus/grammatica'],
    ['/grammatica/', '', '/cursus/grammatica'],
    ['/grammatica/review', '?mode=lightning', '/cursus/grammatica/review?mode=lightning'],
    ['/grammatica/placement', '', '/cursus/grammatica/placement'],
    ['/grammatica/es-ser-estar', '', '/cursus/grammatica/es-ser-estar'],
    ['/grammatica/es-ser-estar/lesson', '?mode=practice', '/cursus/grammatica/es-ser-estar/lesson?mode=practice'],
    ['/grammatica/letters', '', '/cursus/alphabets'],
    ['/grammatica/letters/review', '', '/cursus/alphabets/review'],
    ['/grammatica/letters/ru-vowels/lesson', '?mode=practice', '/cursus/alphabets/ru-vowels/lesson?mode=practice'],
    ['/mundus', '', '/mentis'],
    ['/mundus', '?kind=games', '/mentis?kind=games'],
    ['/mundus/explore', '?shelf=watch', '/explora?kind=series'],
    ['/mundus/explore', '', '/explora'],
    ['/mundus/picks', '?kind=series', '/explora?kind=series'],
    ['/mentis/picks', '?kind=music', '/explora?kind=music'],
    ['/mentis/explore', '?shelf=words', '/explora?tab=words'],
    ['/mentis/explore', '?shelf=beyond', '/mentis/try'],
    ['/mundus/try', '', '/mentis/try'],
    ['/colloquium', '', '/mentis/sermo'],
    ['/colloquium', '?scene=cafe', '/mentis/sermo?scene=cafe'],
    ['/colloquium/chat/abc', '', '/mentis/sermo/chat/abc'],
    ['/codex', '?tab=diarium', '/mentis/diarium'],
    ['/codex/diarium/e1', '', '/mentis/diarium/e1'],
    ['/ordo', '', '/settings'],
    ['/ordo/ai', '', '/settings/ai'],
    ['/ordo/lab', '', '/settings/lab'],
  ])('%s%s → %s', (path, search, to) => {
    expect(movedPath(path, search)).toBe(to);
  });

  it.each([
    ['/'],
    ['/cursus'],
    ['/explora'],
    ['/bibliotheca'],
    ['/codex'],
    ['/sonus'],
    ['/visio'],
    ['/visio/watch/v1'],
    ['/sonus/play/m1'],
    ['/cantus/music'],
    ['/cursus/grammatica'],
    ['/mentis/sermo'],
    ['/settings/ai'],
  ])('%s stays', (path) => {
    expect(movedPath(path)).toBeNull();
  });
});

describe('rooms', () => {
  it('lists the primary sections, tools (with Sonus and Visio separate), and bottom links', () => {
    expect(PRIMARY_SECTIONS.map((s) => s.id)).toEqual(['home', 'cursus', 'explora', 'bibliotheca']);
    expect(TOOL_SECTIONS.map((s) => s.id)).toEqual(['codex', 'thesaurus', 'ludus', 'sonus', 'visio', 'mentis']);
    expect(SECTIONS.map((s) => s.name)).toEqual([
      'Home',
      'Cursus',
      'Explora',
      'Bibliotheca',
      'Codex',
      'Thesaurus',
      'Ludus',
      'Sonus',
      'Visio',
      'Mentis',
      'Ratio',
      'Settings',
    ]);
    expect(SHORTCUT_SECTIONS.slice(0, 10).map((_, i) => sectionKey(i))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
    // Ludus came later and has no Alt-number; the others keep theirs: Mentis Alt 9, Ratio Alt 0.
    expect(SHORTCUT_SECTIONS.slice(0, 10).map((s) => s.id).slice(4)).toEqual(['codex', 'thesaurus', 'sonus', 'visio', 'mentis', 'ratio']);
  });

  it('gives a room’s tabs one page key, and its detail pages their own', () => {
    expect(roomKey('/cursus')).toBe('/cursus');
    expect(roomKey('/cursus/grammatica')).toBe('/cursus');
    expect(roomKey('/cursus/alphabets/')).toBe('/cursus');
    expect(roomKey('/mentis/sermo')).toBe('/mentis');
    expect(roomKey('/cursus/grammatica/es-ser-estar')).toBeNull();
    expect(roomKey('/mentis/diarium/e1')).toBeNull();
    expect(roomKey('/codex')).toBeNull();
  });
});
