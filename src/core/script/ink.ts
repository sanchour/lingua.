// Checking a letter drawn with a finger or the mouse (Lingua 3.0-8, part 5). Both the letter (drawn
// by the font) and the learner's ink are boolean masks on the same grid. The ink should cover the
// letter (coverage) and stay on it (precision), each within a few pixels. Tracing compares them
// where they are; writing from memory first scales both to the same box, so a letter written
// smaller or off to one side still counts. Shape only: stroke order and direction aren't checked.

export interface Mask {
  w: number;
  h: number;
  /** 1 where there is ink, row by row. */
  data: Uint8Array;
}

export interface InkScore {
  /** Share of the letter's pixels the ink came near. */
  coverage: number;
  /** Share of the ink that lies near the letter. */
  precision: number;
  pass: boolean;
}

/** Thresholds: tracing has the letter to follow, so it asks more than writing from memory. */
export const INK_PASS = {
  trace: { coverage: 0.7, precision: 0.75 },
  write: { coverage: 0.6, precision: 0.65 },
} as const;

const count = (m: Mask) => m.data.reduce((n, v) => n + v, 0);

/** Every pixel within `r` (a square) of an inked one. Two passes of a running window, so it is O(w·h). */
export function dilate(m: Mask, r: number): Mask {
  const { w, h, data } = m;
  const rows = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    let run = 0;
    for (let x = -r; x < w + r; x++) {
      const add = x + r;
      if (add < w && data[y * w + add]) run++;
      const drop = x - r - 1;
      if (drop >= 0 && drop < w && data[y * w + drop]) run--;
      if (x >= 0 && x < w) rows[y * w + x] = run > 0 ? 1 : 0;
    }
  }
  const out = new Uint8Array(w * h);
  for (let x = 0; x < w; x++) {
    let run = 0;
    for (let y = -r; y < h + r; y++) {
      const add = y + r;
      if (add < h && rows[add * w + x]) run++;
      const drop = y - r - 1;
      if (drop >= 0 && drop < h && rows[drop * w + x]) run--;
      if (y >= 0 && y < h) out[y * w + x] = run > 0 ? 1 : 0;
    }
  }
  return { w, h, data: out };
}

function overlap(a: Mask, near: Mask): number {
  let n = 0;
  for (let i = 0; i < a.data.length; i++) if (a.data[i] && near.data[i]) n++;
  return n;
}

/** The inked area's bounding box, or null for an empty mask. */
export function bounds(m: Mask): { x: number; y: number; w: number; h: number } | null {
  let x0 = m.w;
  let y0 = m.h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < m.h; y++)
    for (let x = 0; x < m.w; x++)
      if (m.data[y * m.w + x]) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/**
 * The mask's ink scaled to fit a `size` box, centred and keeping its proportions. Letters as thin
 * as 一 or ı keep their flatness instead of being stretched into a square.
 */
export function normalize(m: Mask, size: number): Mask {
  const b = bounds(m);
  const out = new Uint8Array(size * size);
  if (!b) return { w: size, h: size, data: out };
  const scale = (size - 1) / Math.max(b.w, b.h);
  const ox = (size - b.w * scale) / 2;
  const oy = (size - b.h * scale) / 2;
  // Sample back from the target grid, and also splat source pixels forward so thin lines survive shrinking.
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const sx = Math.floor(b.x + (x - ox) / scale);
      const sy = Math.floor(b.y + (y - oy) / scale);
      if (sx >= b.x && sy >= b.y && sx < b.x + b.w && sy < b.y + b.h && m.data[sy * m.w + sx]) out[y * size + x] = 1;
    }
  for (let y = b.y; y < b.y + b.h; y++)
    for (let x = b.x; x < b.x + b.w; x++)
      if (m.data[y * m.w + x]) {
        const tx = Math.min(size - 1, Math.round(ox + (x - b.x) * scale));
        const ty = Math.min(size - 1, Math.round(oy + (y - b.y) * scale));
        out[ty * size + tx] = 1;
      }
  return { w: size, h: size, data: out };
}

/**
 * How well `ink` matches `letter`. `slack` is how far (in grid pixels) the ink may stray. Write
 * mode scales both into a common box first.
 */
export function scoreInk(letter: Mask, ink: Mask, mode: 'trace' | 'write', slack: number): InkScore {
  let a = letter;
  let b = ink;
  if (mode === 'write') {
    const size = Math.min(letter.w, letter.h);
    a = normalize(letter, size);
    b = normalize(ink, size);
  }
  const letterPixels = count(a);
  const inkPixels = count(b);
  if (!letterPixels || !inkPixels) return { coverage: 0, precision: 0, pass: false };
  const coverage = overlap(a, dilate(b, slack)) / letterPixels;
  const precision = overlap(b, dilate(a, slack)) / inkPixels;
  const need = INK_PASS[mode];
  return {
    coverage,
    precision,
    pass: coverage >= need.coverage && precision >= need.precision,
  };
}
