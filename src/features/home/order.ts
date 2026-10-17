// The order of Home's "Next up": what you enjoy most comes first (onboarding, Ordo), the rest keeps
// its usual order. Cards due never drop below second place, because reviews are the one thing that
// piles up when skipped.
import type { Enjoyment } from '@/data/settings';

const KIND: Record<string, Enjoyment> = {
  review: 'cards',
  read: 'reading',
  find: 'reading',
  listen: 'listening',
  'find-listen': 'listening',
  song: 'music',
  'find-song': 'music',
  watch: 'watching',
  'find-watch': 'watching',
  write: 'writing',
};

export const stepKind = (key: string): Enjoyment | undefined => KIND[key];

export function orderSteps<T extends { key: string }>(steps: T[], enjoys: Enjoyment[]): T[] {
  if (!enjoys.length) return steps;
  const rank = (s: T) => {
    const kind = stepKind(s.key);
    const i = kind ? enjoys.indexOf(kind) : -1;
    return i < 0 ? enjoys.length : i;
  };
  const sorted = steps
    .map((s, i) => ({ s, i }))
    .sort((a, b) => rank(a.s) - rank(b.s) || a.i - b.i)
    .map((x) => x.s);
  const review = sorted.findIndex((s) => s.key === 'review');
  if (review > 1) sorted.splice(1, 0, ...sorted.splice(review, 1));
  return sorted;
}
