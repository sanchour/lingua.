import { describe, expect, it } from 'vitest';
import { seededRandom } from '@/core/srs/ludus';
import * as anagram from './anagram';
import * as clues from './clues';
import { makeHunts, huntStars } from './hunt';
import * as ladder from './ladder';
import * as missing from './missing';
import * as search from './wordsearch';
import { canPlay } from './source';
import { GAMES } from './defs';

const es = { lang: 'es' };
const item = (term: string, extra: Partial<{ meaning: string; example: string; synonyms: string[]; antonyms: string[]; image: string; lemma: string }> = {}) => ({ term, meaning: 'x', synonyms: [], antonyms: [], ...extra });

describe('anagram', () => {
  it('mixes the letters into something that is not the word, the same letters', () => {
    for (let seed = 1; seed < 40; seed++) {
      const s = anagram.startAnagram('sacacorchos', es, seededRandom(seed))!;
      expect(s.tiles.join('')).not.toBe('sacacorchos');
      expect([...s.tiles].sort().join('')).toBe([...'sacacorchos'].sort().join(''));
    }
    expect(anagram.startAnagram('aaa', es, seededRandom(1))).toBeNull();
  });
  it('wins when the tiles are put in order, in any order of picking by letter', () => {
    let s = anagram.startAnagram('gato', es, seededRandom(3))!;
    for (const k of 'gato') s = anagram.placeKey(s, k);
    expect(s.status).toBe('won');
    expect(anagram.slotsOf(s).join('')).toBe('gato');
    expect(anagram.starsOf(s)).toBe(3);
  });
  it('a full wrong try clears the tiles and counts; the third loses', () => {
    let s = anagram.startAnagram('gato', es, seededRandom(3))!;
    const wrongOrder = [...s.tileKeys.keys()].sort((a, b) => (s.tileKeys[b] < s.tileKeys[a] ? -1 : 1));
    const fill = (st: anagram.AnagramState) => wrongOrder.reduce((x, t) => anagram.place(x, t), st);
    const word = [...'gato'];
    const reversed = [...word].reverse();
    expect(reversed.join('')).not.toBe('gato');
    for (let i = 0; i < 3; i++) {
      for (const k of reversed) s = anagram.placeKey(s, k);
      expect(s.wrong).toBe(i + 1);
      if (i < 2) expect(s.placed).toEqual([]);
    }
    expect(s.status).toBe('lost');
    expect(fill(s)).toBe(s);
  });
  it('takes a tile back, and a hint puts right what is wrong before placing the next letter', () => {
    let s = anagram.startAnagram('gato', es, seededRandom(5))!;
    s = anagram.placeKey(anagram.placeKey(s, 'o'), 't');
    expect(anagram.unplace(s).placed).toHaveLength(1);
    const h = anagram.hint(s);
    expect(h.hints).toBe(1);
    expect(h.placed.map((t) => h.tileKeys[t]).join('')).toBe('g');
    expect(anagram.starsOf({ ...h, status: 'won' })).toBe(2);
  });
});

describe('missing letters', () => {
  it('leaves out a third of the letters, never the first of a long word, and fills them in order', () => {
    for (let seed = 1; seed < 30; seed++) {
      const s = missing.startMissing('sacacorchos', es, seededRandom(seed))!;
      expect(s.blanks).toHaveLength(4);
      expect(s.blanks).not.toContain(0);
    }
    expect(missing.startMissing('sol', es, seededRandom(1))!.blanks).toHaveLength(1);
    let s = missing.startMissing('gato', es, seededRandom(2))!;
    for (const b of s.blanks) s = missing.fill(s, s.keys[b]!);
    expect(s.status).toBe('won');
  });
  it('a wrong letter is a slip, the fourth loses; a hint fills the chosen blank', () => {
    let s = missing.startMissing('gato', es, seededRandom(2))!;
    const wrong = [...'zzzz'];
    s = missing.fill(s, wrong[0]);
    expect(s.slips).toBe(1);
    for (const k of wrong.slice(1)) s = missing.fill(s, k);
    expect(s.status).toBe('lost');
    expect(missing.isShown(s, s.blanks[0])).toBe(true);
    const h = missing.hint(missing.startMissing('gato', es, seededRandom(2))!);
    expect(h.filled).toHaveLength(1);
    expect(h.hints).toBe(1);
  });
  it('can choose which blank to fill', () => {
    const s = missing.startMissing('sacacorchos', es, seededRandom(4))!;
    const last = s.blanks[s.blanks.length - 1];
    expect(missing.select(s, last).selected).toBe(last);
    expect(missing.select(s, 0).selected).toBe(s.blanks[0]);
  });
});

describe('word search', () => {
  const words = ['gato', 'perro', 'casa', 'libro', 'mesa', 'ventana'].map((t) => ({ term: t, marks: [...t] }));
  const filler = [...'abcdefghijklmnopqrstuvwxyz'];
  it('places every word where its own letters are, inside the grid, crossing only where letters agree', () => {
    for (let seed = 1; seed < 25; seed++) {
      const ws = search.makeWordSearch(words, 10, seededRandom(seed), {}, filler);
      expect(ws.words).toHaveLength(6);
      for (const w of ws.words) {
        expect(w.cells.every(([r, c]) => r >= 0 && r < 10 && c >= 0 && c < 10)).toBe(true);
        expect(w.cells.map(([r, c]) => ws.grid[r][c])).toEqual(w.marks);
      }
      expect(ws.grid.flat().every((m) => m.length > 0)).toBe(true);
    }
  });
  it('is the same grid for the same seed', () => {
    const a = search.makeWordSearch(words, 10, seededRandom(9), {}, filler);
    expect(search.makeWordSearch(words, 10, seededRandom(9), {}, filler)).toEqual(a);
  });
  it('runs right to left in a right-to-left script, and only backwards when asked', () => {
    const ar = ['كتاب', 'بيت', 'قلم'].map((t) => ({ term: t, marks: [...t] }));
    const ws = search.makeWordSearch(ar, 8, seededRandom(2), { rtl: true }, [...'ابتث']);
    for (const w of ws.words) {
      const [[r0, c0], [r1, c1]] = [w.cells[0], w.cells[1]];
      expect([r1 - r0, c1 - c0]).toSatisfy(([dr, dc]: number[]) => (dr === 0 && dc === -1) || (dr === 1 && dc === 0) || (dr === 1 && dc === -1));
    }
    const fwd = search.makeWordSearch(words, 10, seededRandom(3), {}, filler);
    expect(fwd.words.every((w) => w.cells[1][0] - w.cells[0][0] >= 0 && (w.cells[1][0] !== w.cells[0][0] || w.cells[1][1] > w.cells[0][1]))).toBe(true);
  });
  it('leaves out a word that does not fit', () => {
    const ws = search.makeWordSearch([{ term: 'enormous', marks: [...'enormous'] }, ...words.slice(0, 2)], 5, seededRandom(1), {}, filler);
    expect(ws.words.map((w) => w.term)).not.toContain('enormous');
  });
  it('selects along a line and finds a word by the letters it spells, either way round', () => {
    expect(search.lineBetween([0, 0], [0, 3])).toEqual([[0, 0], [0, 1], [0, 2], [0, 3]]);
    expect(search.lineBetween([2, 2], [0, 0])).toEqual([[2, 2], [1, 1], [0, 0]]);
    expect(search.lineBetween([0, 0], [1, 2])).toBeNull();
    const ws = search.makeWordSearch(words, 10, seededRandom(4), {}, filler);
    const w = ws.words[0];
    expect(search.wordSpelled(ws, w.cells, new Set())).toBe(0);
    expect(search.wordSpelled(ws, [...w.cells].reverse(), new Set())).toBe(0);
    expect(search.wordSpelled(ws, w.cells, new Set([0]))).toBe(-1);
    expect(search.searchStars(true, 2)).toBe(1);
    expect(search.searchStars(false, 0)).toBe(0);
  });
});

describe('word ladder', () => {
  const words = ['gato', 'pato', 'palo', 'pelo', 'pila', 'mato', 'mano', 'cama', 'casa', 'masa', 'mesa', 'misa'];
  const graph = ladder.buildGraph(words);
  it('joins words one letter apart, of the same length only', () => {
    expect(graph.get('gato')).toEqual(expect.arrayContaining(['pato', 'mato']));
    expect(graph.get('gato')).not.toContain('palo');
    const mixed = ladder.buildGraph(['gato', 'gatos', 'pato']);
    expect(mixed.get('gato')).toEqual(['pato']);
  });
  it('makes a ladder exactly as long as asked, and the hint walks a shortest way', () => {
    const made = ladder.makeLadder(graph, 3, seededRandom(1));
    expect(made).not.toBeNull();
    const dist = ladder.distancesTo(graph, made!.end);
    expect(dist.get(made!.start)).toBe(3);
    let s = ladder.startLadder(made!.start, made!.end, 3);
    s = ladder.hint(ladder.hint(s, graph, dist), graph, dist);
    expect(s.hints).toBe(2);
    expect(ladder.hint(s, graph, dist)).toBe(s);
    expect(s.path).toHaveLength(3);
  });
  it('accepts any real chain, and says why a try is wrong', () => {
    let s = ladder.startLadder('gato', 'mano', 2);
    expect(ladder.step(s, graph, 'zzzz').last).toBe('notword');
    expect(ladder.step(s, graph, 'palo').last).toBe('notone');
    expect(ladder.step(s, graph, 'gato').last).toBe('used');
    s = ladder.step(s, graph, 'mato');
    expect(s.last).toBe('ok');
    s = ladder.step(s, graph, 'mano');
    expect(s.status).toBe('won');
    expect(ladder.starsOf(s)).toBe(3);
  });
  it('loses after five wrong tries or too long a way, and undo is free', () => {
    let s = ladder.startLadder('gato', 'mano', 2);
    for (let i = 0; i < 5; i++) s = ladder.step(s, graph, 'zzzz');
    expect(s.status).toBe('lost');
    let t = ladder.step(ladder.startLadder('gato', 'mesa', 3), graph, 'pato');
    expect(ladder.undo(t).path).toEqual(['gato']);
    expect(ladder.undo(t).wrong).toBe(0);
    t = ladder.startLadder('gato', 'misa', 1);
    for (const w of ['pato', 'palo', 'pelo', 'pila']) t = ladder.step(t, graph, w);
    expect(t.status).toBe('playing');
  });
});

describe('clues', () => {
  const word = item('ventana', { meaning: 'window', example: 'Abre la ventana, por favor.', synonyms: ['abertura', 'ventana'], antonyms: ['pared'], image: 'blob:x' });
  it('gives the hardest clues first and always the last three', () => {
    expect(clues.cluesOf(word, 'es').map((c) => c.kind)).toEqual(['example', 'synonyms', 'antonyms', 'picture', 'length', 'first', 'meaning']);
    expect(clues.cluesOf(item('gato'), 'es').map((c) => c.kind)).toEqual(['length', 'first', 'meaning']);
    expect(clues.cluesOf(word, 'es')[0].text).toBe('Abre la _______, por favor.');
    expect(clues.cluesOf(word, 'es')[1].text).toBe('abertura');
    expect(clues.cluesOf(item('日本'), 'ja').find((c) => c.kind === 'length')?.text).toBe('2 characters');
    expect(clues.cluesOf(item('gato'), 'es').find((c) => c.kind === 'first')).toMatchObject({ text: 'Starts with', value: 'g' });
  });
  it('a wrong guess gives the next clue, the last wrong guess loses, a near guess wins', () => {
    let s = clues.startClues(item('gato'), 'es');
    expect(s.shown).toBe(1);
    s = clues.guess(s, 'perro', 'gato', 'es');
    expect(s.shown).toBe(2);
    s = clues.guess(s, 'pato', 'gato', 'es');
    s = clues.guess(s, 'zzz', 'gato', 'es');
    expect(s.status).toBe('lost');
    expect(clues.starsOf(s)).toBe(0);
    expect(clues.guess(clues.startClues(item('canción'), 'es'), 'Cancion', 'canción', 'es').status).toBe('won');
    expect(clues.guess(s, 'gato', 'gato', 'es')).toBe(s);
  });
  it('stars fall as clues are needed', () => {
    const base = clues.startClues(word, 'es');
    const won = (shown: number) => clues.starsOf({ ...base, shown, status: 'won' });
    expect([won(1), won(2), won(3), won(4), won(5)]).toEqual([3, 3, 2, 2, 1]);
    expect(clues.another({ ...base, shown: 7 }).shown).toBe(7);
    expect(clues.giveUp(base).status).toBe('lost');
  });
});

describe('word hunt', () => {
  const body = 'Ayer la niña vio un gato negro en la casa de su abuela. El gato dormía junto a la ventana, y el perro jugaba en el jardín con la pelota roja. Después comieron pan y fruta en la mesa grande de la cocina, mientras afuera llovía sin parar sobre los techos de toda la ciudad vieja.';
  const items = ['gato', 'casa', 'perro', 'mesa', 'luna'].map((t) => item(t));
  it('finds a passage with three to eight of the words and marks every form of each', () => {
    const hunts = makeHunts([body, 'Muy corto.'], items, 'es', seededRandom(1), 3);
    expect(hunts).toHaveLength(1);
    expect(hunts[0].targets.map((t) => t.term).sort()).toEqual(['casa', 'gato', 'mesa', 'perro']);
    const gato = hunts[0].targets.findIndex((t) => t.term === 'gato');
    expect(hunts[0].tokens.filter((t) => t.target === gato)).toHaveLength(2);
    expect(hunts[0].tokens.map((t) => t.text).join('')).toBe(body);
  });
  it('uses the lemma, so an inflected form counts', () => {
    const hunts = makeHunts([body.replace('gato negro', 'gatos negros')], [item('gato'), item('casa'), item('perro'), item('mesa')].map((i, n) => (n === 0 ? { ...i, lemma: 'gatos' } : i)), 'es', seededRandom(1), 1);
    expect(hunts[0]?.targets.map((t) => t.term)).toContain('gato');
  });
  it('skips a passage with too few of the words, and scores', () => {
    expect(makeHunts([body], [item('gato'), item('luna')], 'es', seededRandom(1), 3)).toEqual([]);
    expect([huntStars(true, 0, 0), huntStars(true, 3, 0), huntStars(true, 6, 1), huntStars(false, 0, 0)]).toEqual([3, 2, 1, 0]);
  });
});

describe('the shelf', () => {
  const by = (id: string) => GAMES.find((g) => g.id === id)!;
  const five = ['gato', 'perro', 'casa', 'libro', 'mesa'].map((t) => item(t));
  it('says what each game still needs', () => {
    expect(canPlay(by('clues'), { items: five, texts: 0, listWords: 0 }, 'ja')).toEqual({ ok: true });
    const hunt = canPlay(by('hunt'), { items: five, texts: 0, listWords: 0 }, 'es');
    expect(hunt.ok === false && hunt.reason).toMatch(/text in Codex/);
    expect(canPlay(by('hunt'), { items: five, texts: 2, listWords: 0 }, 'es')).toEqual({ ok: true });
    const lad = canPlay(by('ladder'), { items: [], texts: 0, listWords: 10 }, 'es');
    expect(lad.ok === false && lad.reason).toMatch(/word list/);
    expect(canPlay(by('ladder'), { items: [], texts: 0, listWords: 5000 }, 'es')).toEqual({ ok: true });
    const long = canPlay(by('wordsearch'), { items: ['abcdefghijkl', 'gato', 'casa', 'mesa', 'libro', 'perro'].map((t) => item(t)), texts: 0, listWords: 0 }, 'es');
    expect(long.ok === false && long.reason).toMatch(/Needs 6 .*3 to 10 letters.*you have 5/);
  });
});
