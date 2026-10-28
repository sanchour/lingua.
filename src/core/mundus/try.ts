// Things to try (5.2-7): how long each challenge takes, where it happens, and how the page deals, filters and orders them.
// Pure: features/mundus/TipsView.tsx gathers what was done and draws this.
import type { Tip, TipIcon } from '@/core/mundus/tips';

/** The minutes a challenge takes, as the filter's buckets: a moment, a few minutes, a longer one. */
export type Minutes = 2 | 5 | 15;
export const MINUTES: Minutes[] = [2, 5, 15];

/** Challenges that take two minutes or fifteen; everything else is five. */
const TWO = ['app', 'cafe', 'meal', 'count', 'lock', 'keyboard', 'siri', 'es-time', 'ru-name', 'nl-stay', 'tr-kolay', 'id-selamat', 'sw-shikamoo', 'la-date', 'ja-date', 'ko-date'];
const FIFTEEN = ['game', 'labels', 'cook', 'walk', 'dub', 'wiki', 'trip', 'radio', 'partner', 'fr-bd', 'sv-fika', 'la-around'];

export const tipMinutes = (tip: Pick<Tip, 'id'>): Minutes => (TWO.includes(tip.id) ? 2 : FIFTEEN.includes(tip.id) ? 15 : 5);

/** Where a challenge happens, by the picture it carries. */
export type Where = 'phone' | 'listen' | 'watch' | 'read' | 'out' | 'play';
export const WHERES: Array<{ id: Where; label: string }> = [
  { id: 'phone', label: 'On your phone' },
  { id: 'listen', label: 'Listen' },
  { id: 'watch', label: 'Watch' },
  { id: 'read', label: 'Read and write' },
  { id: 'out', label: 'Out and about' },
  { id: 'play', label: 'Play' },
];

const WHERE: Record<TipIcon, Where> = {
  phone: 'phone', apps: 'phone', keyboard: 'phone', lock: 'phone', voice: 'phone',
  song: 'listen', spotify: 'listen', radio: 'listen', mic: 'listen',
  film: 'watch',
  wiki: 'read', pen: 'read', list: 'read', labels: 'read',
  walk: 'out', cafe: 'out', meal: 'out', people: 'out', cook: 'out', trip: 'out', count: 'out', sun: 'out', smile: 'out',
  game: 'play',
};
export const tipWhere = (tip: Pick<Tip, 'icon'>): Where => WHERE[tip.icon];

export interface TryFilter {
  show: 'all' | 'open' | 'done';
  minutes: Minutes | 'any';
  where: Where | 'any';
}

/** What has been done, by challenge: the days it was done on (YYYY-MM-DD). */
export type DoneDates = ReadonlyMap<string, readonly string[]>;

/** Whether a challenge can be done now: not done yet, or a habit not done today. */
export const isOpen = (tip: Tip, done: DoneDates, today: string): boolean => !done.has(tip.id) || Boolean(tip.habit && !done.get(tip.id)?.includes(today));

/** The challenges that pass the filters, those still to do first and those done at the back (each in its own order). */
export function visibleTips(tips: readonly Tip[], done: DoneDates, today: string, f: TryFilter): Tip[] {
  const pass = tips.filter(
    (t) =>
      (f.show === 'all' ? true : f.show === 'done' ? done.has(t.id) : isOpen(t, done, today)) &&
      (f.minutes === 'any' || tipMinutes(t) === f.minutes) &&
      (f.where === 'any' || tipWhere(t) === f.where),
  );
  const finished = (t: Tip) => done.has(t.id) && !isOpen(t, done, today);
  return [...pass.filter((t) => !finished(t)), ...pass.filter(finished)];
}

/** One challenge to turn over at random: an open one that passes the filters, never the one just dealt. */
export function dealOne(tips: readonly Tip[], done: DoneDates, today: string, f: TryFilter, not: string | undefined, random: () => number = Math.random): Tip | undefined {
  const pool = visibleTips(tips, done, today, { ...f, show: 'open' });
  const others = pool.filter((t) => t.id !== not);
  const from = others.length ? others : pool;
  return from.length ? from[Math.min(from.length - 1, Math.floor(random() * from.length))] : undefined;
}

const DAY = 86_400_000;

/** Challenges done in the last seven days (today and the six before), each day a habit was done counted. */
export function doneThisWeek(done: DoneDates, today: string): number {
  const [y, m, d] = today.split('-').map(Number);
  const noon = new Date(y, m - 1, d, 12).getTime();
  let n = 0;
  for (const dates of done.values()) {
    for (const date of dates) {
      const [yy, mm, dd] = date.split('-').map(Number);
      const age = Math.round((noon - new Date(yy, mm - 1, dd, 12).getTime()) / DAY);
      if (age >= 0 && age < 7) n++;
    }
  }
  return n;
}
