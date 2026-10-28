// What the learner said back to Mundus today (5.2-7), kept on this device for the day: "Something shorter", "I'd rather
// listen", "Why this?" and "Not today". Another day starts clean. No AI: the replies change the steps (core/mundus/guide.ts).
import { useSyncExternalStore } from 'react';
import { noReplies, reply } from '@/core/mundus/guide';
import type { Replies, Say } from '@/core/mundus/guide';
import { localDateKey } from '@/lib/format';

const KEY = 'lingua-mundus-replies';
const CHANGED = 'lingua-mundus-replies-changed';

function read(): Replies {
  const today = localDateKey();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Replies | null;
    if (raw && raw.date === today && typeof raw.skips === 'number') return raw;
  } catch {
    // No replies kept: today starts clean.
  }
  return noReplies(today);
}

// useSyncExternalStore needs the same object until something changes.
let cache = '';
let value: Replies = noReplies('');
function snapshot(): Replies {
  const next = read();
  const text = JSON.stringify(next);
  if (text !== cache) {
    cache = text;
    value = next;
  }
  return value;
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/** What was said today. */
export const useReplies = (): Replies => useSyncExternalStore(subscribe, snapshot);

/** Says something back to Mundus. */
export function say(what: Say): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(reply(read(), what, localDateKey())));
  } catch {
    // Not kept past this visit; the page still answers.
  }
  window.dispatchEvent(new Event(CHANGED));
}
