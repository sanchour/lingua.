// Seeds for Games (6-21): a puzzle is fully decided by its seed, so the same seed gives the same puzzle, and the daily puzzle and the
// weekly theme (G5) are the same for everyone learning a language: they are made from the language and the date, nothing else.
import { hashString } from '@/core/hash';

/** A seed `seededRandom` takes, from any text. */
export const seedOf = (text: string): number => parseInt(hashString(text), 36) % 2 ** 31;

/** Today's seed for a language; `day` is a local date, 'YYYY-MM-DD'. */
export const dailySeed = (lang: string, day: string): number => seedOf(`daily:${lang}:${day}`);

/** The ISO 8601 week a local date falls in (weeks start on Monday; the first has the year's first Thursday). */
export function isoWeek(day: string): { year: number; week: number } {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const year = date.getUTCFullYear();
  return { year, week: Math.ceil(((date.getTime() - Date.UTC(year, 0, 1)) / 86_400_000 + 1) / 7) };
}

/** 'YYYY-Www', the same on every day of the week. */
export function weekKey(day: string): string {
  const { year, week } = isoWeek(day);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** This week's seed for a language: it picks the week's theme and puzzles. */
export const weekSeed = (lang: string, day: string): number => seedOf(`week:${lang}:${weekKey(day)}`);
