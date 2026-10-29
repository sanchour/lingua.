// The A–B loop of the player (6-9): press once to mark where it starts, again where it ends, a third time to clear it.
// Pure: the engine hands in the playhead, this says what the loop is and where to jump.
export interface AbLoop {
  a: number;
  b?: number;
}

/** A loop shorter than this is a slip of the finger, not a loop. */
export const MIN_LOOP_MS = 500;

export function nextLoop(loop: AbLoop | null, ms: number): AbLoop | null {
  if (!loop) return { a: ms };
  if (loop.b === undefined) return ms - loop.a >= MIN_LOOP_MS ? { a: loop.a, b: ms } : loop;
  return null;
}

/** Where to jump back to, when the playhead has reached the end of a finished loop. */
export const loopJump = (loop: AbLoop | null, ms: number): number | null => (loop && loop.b !== undefined && ms >= loop.b ? loop.a : null);

/** What the loop button says. */
export const loopLabel = (loop: AbLoop | null): string => (!loop ? 'A–B' : loop.b === undefined ? 'A…' : 'A–B on');
