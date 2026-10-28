// Mundus's own-words box (5.2-7, with Max): "20 minutes, and I'm tired" becomes the same replies the buttons make.
import { LANES } from '@/core/mundus/guide';
import type { Lane, Say } from '@/core/mundus/guide';
import { askJson } from './client';

/** What the AI's answer means as replies: a lane the learner asked for and whether they want it short. Anything else is ignored. */
export function readSay(raw: unknown): Say[] {
  if (!raw || typeof raw !== 'object') return [];
  const { lane, short } = raw as { lane?: unknown; short?: unknown };
  const out: Say[] = [];
  if (typeof lane === 'string' && (LANES as string[]).includes(lane)) out.push({ kind: 'lane', lane: lane as Lane });
  if (short === true) out.push({ kind: 'short' });
  return out;
}

/** Turns what the learner wrote into replies. */
export async function sayInWords(text: string): Promise<Say[]> {
  const system =
    'A language-learning guide asks what the learner feels like doing today. Read their note. Answer only with JSON: ' +
    '{"lane": "read" | "listen" | "watch" | "words" | "write" | "speak" | null, "short": boolean}. ' +
    '"lane" is the kind of activity they ask for (null if none); "short" is true if they are tired, busy or have only a few minutes.';
  return readSay(await askJson<unknown>({ system, user: text.slice(0, 200), kind: 'mundusReply' }));
}
