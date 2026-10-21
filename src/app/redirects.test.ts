import { describe, expect, it } from 'vitest';
import { movedPath, roomKey } from './redirects';
import { SECTIONS, sectionKey } from './sections';

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
    ['/visio', '', '/sonus?show=watch'],
    ['/visio', '?tab=services', '/sonus?tab=streaming'],
    ['/mundus', '', '/mentis'],
    ['/mundus', '?kind=games', '/mentis?kind=games'],
    ['/mundus/explore', '?shelf=watch', '/mentis/explore?shelf=watch'],
    ['/mundus/picks', '?kind=series', '/mentis/picks?kind=series'],
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

  it.each([['/'], ['/codex'], ['/sonus'], ['/visio/watch/v1'], ['/sonus/play/m1'], ['/cantus/music'], ['/cursus/grammatica'], ['/mentis/sermo'], ['/settings/ai']])('%s stays', (path) => {
    expect(movedPath(path)).toBeNull();
  });
});

describe('rooms', () => {
  it('lists the rooms in the Lingua 5 order, Alt 1…8', () => {
    expect(SECTIONS.map((s) => s.id)).toEqual(['home', 'cursus', 'codex', 'thesaurus', 'sonus', 'mentis', 'ratio', 'ordo']);
    expect(SECTIONS.map((s) => s.name)).toEqual(['Home', 'Cursus', 'Codex', 'Thesaurus', 'Sonus et Visio', 'Mentis', 'Ratio', 'Settings']);
    expect(SECTIONS.map((_, i) => sectionKey(i))).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('gives a room’s tabs one page key, and its detail pages their own', () => {
    expect(roomKey('/cursus')).toBe('/cursus');
    expect(roomKey('/cursus/grammatica')).toBe('/cursus');
    expect(roomKey('/cursus/alphabets/')).toBe('/cursus');
    expect(roomKey('/mentis/sermo')).toBe('/mentis');
    expect(roomKey('/mentis/explore')).toBe('/mentis');
    expect(roomKey('/cursus/grammatica/es-ser-estar')).toBeNull();
    expect(roomKey('/mentis/diarium/e1')).toBeNull();
    expect(roomKey('/codex')).toBeNull();
  });
});
