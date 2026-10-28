// Explore's "Save": what the learner wants to try later, kept on this device per language (5.2-7).
import { useSyncExternalStore } from 'react';

const key = (lang: string) => `lingua-explore-saved:${lang}`;
const CHANGED = 'lingua-explore-saved-changed';

function read(lang: string): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(key(lang)) ?? '[]') as unknown;
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

const cache = new Map<string, { text: string; list: string[] }>();
function snapshot(lang: string): string[] {
  const list = read(lang);
  const text = list.join('\n');
  const hit = cache.get(lang);
  if (hit?.text === text) return hit.list;
  cache.set(lang, { text, list });
  return list;
}

const subscribe = (onChange: () => void) => {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener('storage', onChange);
  };
};

/** The ids saved for a language. */
export const useSaved = (lang: string): string[] => useSyncExternalStore(subscribe, () => snapshot(lang));

/** Saves an item, or takes it off the list. */
export function toggleSaved(lang: string, id: string): void {
  const list = read(lang);
  const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  try {
    localStorage.setItem(key(lang), JSON.stringify(next));
  } catch {
    // Not kept past this visit.
  }
  window.dispatchEvent(new Event(CHANGED));
}
