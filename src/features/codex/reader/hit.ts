// Finding the word a click or hover means. Words are inline text, so the space between words and
// the leading between lines belong to the paragraph; a point there picks the nearest word instead.

const NEAR: Array<[number, number]> = [
  [0, -7],
  [0, 7],
  [-6, 0],
  [6, 0],
  [-6, -7],
  [6, -7],
  [-6, 7],
  [6, 7],
];

/** The word span at (x, y) inside `root`, or the closest one within a few pixels. */
export function wordAt(target: EventTarget | null, x: number, y: number, root: HTMLElement | null): HTMLElement | null {
  const direct = (target as Element | null)?.closest?.<HTMLElement>('.w');
  if (direct && root?.contains(direct)) return direct;
  if (!root || !(target instanceof Node) || !root.contains(target)) return null;
  for (const [dx, dy] of NEAR) {
    const el = document.elementFromPoint(x + dx, y + dy)?.closest<HTMLElement>('.w');
    if (el && root.contains(el)) return el;
  }
  return null;
}

/** How far the pointer may move between press and release and still count as a click. */
export const CLICK_SLOP_PX = 10;
