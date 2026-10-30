// Word search (6-21, F0171 and F1194): the learner's words hidden in a grid of letters. Pure: the grid is made from a seed.
export type Cell = [row: number, col: number];

export interface Placed {
  term: string;
  marks: string[];
  cells: Cell[];
}

export interface WordSearch {
  size: number;
  grid: string[][];
  words: Placed[];
}

export interface SearchOptions {
  /** Words may also run backwards, upwards and up-left. */
  backwards?: boolean;
  /** The script runs right to left: horizontal words start at the right. */
  rtl?: boolean;
}

const directions = ({ backwards, rtl }: SearchOptions): Cell[] => {
  const flip = rtl ? -1 : 1;
  const forward: Cell[] = [[0, flip], [1, 0], [1, flip]];
  return backwards ? [...forward, ...forward.map(([r, c]): Cell => [-r, -c]), [-1, flip], [-1, -flip]] : forward;
};

/**
 * Puts each word (longest first) somewhere it fits, crossing others only where letters agree, and fills the rest from `filler`.
 * A word that finds no room in 300 tries is left out; `words` says which were placed.
 */
export function makeWordSearch(entries: Array<{ term: string; marks: string[] }>, size: number, random: () => number, opts: SearchOptions, filler: string[]): WordSearch {
  const grid: Array<Array<string | null>> = Array.from({ length: size }, () => Array<string | null>(size).fill(null));
  const dirs = directions(opts);
  const words: Placed[] = [];
  for (const { term, marks } of [...entries].sort((a, b) => b.marks.length - a.marks.length)) {
    if (marks.length > size) continue;
    for (let attempt = 0; attempt < 300; attempt++) {
      const [dr, dc] = dirs[Math.floor(random() * dirs.length)];
      const r0 = Math.floor(random() * size);
      const c0 = Math.floor(random() * size);
      const cells: Cell[] = marks.map((_, i) => [r0 + dr * i, c0 + dc * i]);
      const fits = cells.every(([r, c], i) => r >= 0 && r < size && c >= 0 && c < size && (grid[r][c] === null || grid[r][c] === marks[i]));
      if (!fits) continue;
      cells.forEach(([r, c], i) => (grid[r][c] = marks[i]));
      words.push({ term, marks, cells });
      break;
    }
  }
  const pool = filler.length ? filler : entries.flatMap((e) => e.marks);
  return { size, grid: grid.map((row) => row.map((m) => m ?? pool[Math.floor(random() * pool.length)])), words };
}

/** The cells on the straight line (across, down or at 45°) from one to another, or null when they are not on one. */
export function lineBetween([r1, c1]: Cell, [r2, c2]: Cell): Cell[] | null {
  const dr = r2 - r1;
  const dc = c2 - c1;
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;
  const n = Math.max(Math.abs(dr), Math.abs(dc));
  return Array.from({ length: n + 1 }, (_, i): Cell => [r1 + Math.sign(dr) * i, c1 + Math.sign(dc) * i]);
}

/**
 * Which word, not yet found, the selected cells spell (in either direction). It goes by the letters, so a word that turns up
 * by chance in the filler counts as well as the one that was hidden.
 */
export function wordSpelled(ws: WordSearch, cells: Cell[], found: ReadonlySet<number>): number {
  const spelled = cells.map(([r, c]) => ws.grid[r][c]);
  const reversed = [...spelled].reverse();
  return ws.words.findIndex((w, i) => !found.has(i) && w.marks.length === spelled.length && (w.marks.every((m, j) => m === spelled[j]) || w.marks.every((m, j) => m === reversed[j])));
}

/** Stars: three for a grid cleared without help, one less for each word shown. Giving up earns none. */
export const searchStars = (won: boolean, hints: number): number => (won ? Math.max(1, 3 - hints) : 0);
