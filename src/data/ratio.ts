// Ratio's numbers, computed from what Lingua records as you go (sessions, daily stats, reviews,
// words, the journal and the study log). One pass per screen; nothing here writes.
import { localDateKey } from '@/lib/format';
import { db } from './db';
import type { LinguaDB } from './db';
import type { ActivitySession, CorrectionCategory, DailyStat, ReviewMode } from './types';

const DAY = 86_400_000;
const HISTORY_DAYS = 371;

export type Activity = 'read' | 'listen' | 'watch' | 'review' | 'ludus' | 'write' | 'logged';
export const ACTIVITIES: Activity[] = ['read', 'listen', 'watch', 'review', 'ludus', 'write', 'logged'];

export interface DayMinutes {
  date: string;
  minutes: Record<Activity, number>;
  total: number;
}

export interface Overview {
  langs: string[];
  vocabulary: {
    known: number;
    learning: number;
    families: number;
    /** Known words over time (carried forward between snapshots). */
    knownSeries: Array<{ x: number; y: number }>;
    learningSeries: Array<{ x: number; y: number }>;
    /** Share of the N most frequent words that are Known (single language only). */
    coverage: Array<{ top: number; share: number }> | null;
    newPerWeek: Array<{ week: string; words: number; current: boolean }>;
  };
  reading: {
    minutes: number;
    words: number;
    wpm: number | null;
    wpmSeries: Array<{ x: number; y: number }>;
    finished: number;
    finishedThisYear: number;
    books: Array<{ id: string; title: string; lang: string; known: number }>;
  };
  listening: { minutes: number; watchMinutes: number; finished: number; withTranscript: number; mined: number; songs: number; songMinutes: number };
  flashcards: {
    reviewsPerDay: Array<{ date: string; reviews: number }>;
    retention30: number | null;
    retention90: number | null;
    forecast: Array<{ date: string; due: number }>;
    maturity: { new: number; learning: number; young: number; mature: number };
    secondsPerCard: number | null;
    ludus: Array<{ mode: ReviewMode; accuracy: number; count: number }>;
  };
  writing: {
    entries: number;
    words: number;
    grades: Array<{ x: number; y: number }>;
    errors: Array<{ category: CorrectionCategory; count: number }>;
  };
  habit: {
    days: DayMinutes[];
    totals: Record<Activity, number>;
    current: number;
    longest: number;
    byHour: number[];
    weekMet: boolean[];
  };
}

const dayMs = (date: string) => new Date(`${date}T12:00:00`).getTime();

/** Monday of the week containing `ms`, as YYYY-MM-DD. */
export function weekKey(ms: number): string {
  const d = new Date(ms);
  const back = (d.getDay() + 6) % 7;
  return localDateKey(ms - back * DAY);
}

function emptyMinutes(): Record<Activity, number> {
  return { read: 0, listen: 0, watch: 0, review: 0, ludus: 0, write: 0, logged: 0 };
}

/** Consecutive goal days: the run ending today (or yesterday) and the longest ever. */
export function streaks(metDates: Set<string>, now = Date.now()): { current: number; longest: number } {
  let current = 0;
  let cursor = metDates.has(localDateKey(now)) ? now : now - DAY;
  while (metDates.has(localDateKey(cursor))) {
    current++;
    cursor -= DAY;
  }
  const sorted = [...metDates].sort();
  let longest = 0;
  let run = 0;
  let prev = 0;
  for (const date of sorted) {
    const ms = dayMs(date);
    run = prev && Math.round((ms - prev) / DAY) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = ms;
  }
  return { current, longest: Math.max(longest, current) };
}

/** Carries each language's snapshot forward and adds the languages up, one point per date. */
function sumSeries(perLang: Array<Array<{ date: string; value: number }>>, today: number[]): Array<{ x: number; y: number }> {
  const dates = [...new Set(perLang.flatMap((rows) => rows.map((r) => r.date)))].sort();
  const last = perLang.map(() => 0);
  const idx = perLang.map(() => 0);
  const out: Array<{ x: number; y: number }> = [];
  for (const date of dates) {
    perLang.forEach((rows, l) => {
      while (idx[l] < rows.length && rows[idx[l]].date <= date) last[l] = rows[idx[l]++].value;
    });
    out.push({ x: dayMs(date), y: last.reduce((a, b) => a + b, 0) });
  }
  const now = today.reduce((a, b) => a + b, 0);
  const todayMs = dayMs(localDateKey());
  if (out.at(-1)?.x === todayMs) out[out.length - 1].y = now;
  else out.push({ x: todayMs, y: now });
  return out;
}

export async function loadOverview(langs: string[], database: LinguaDB = db, now = Date.now()): Promise<Overview> {
  const since = localDateKey(now - HISTORY_DAYS * DAY);
  const sinceMs = now - HISTORY_DAYS * DAY;
  const langSet = new Set(langs);

  const [dailyByLang, sessions, logs, decks, texts, entries, progress, media] = await Promise.all([
    Promise.all(langs.map((l) => database.dailyStats.where('[lang+date]').between([l, ''], [l, '￿']).toArray())),
    Promise.all(langs.map((l) => database.sessions.where('[lang+startedAt]').between([l, sinceMs], [l, Infinity]).toArray())).then((r) => r.flat()),
    database.studyLogs.toArray().then((rows) => rows.filter((r) => langSet.has(r.lang) && !r.deletedAt)),
    database.decks.toArray().then((rows) => rows.filter((d) => langSet.has(d.lang) && !d.deletedAt)),
    database.texts.toArray().then((rows) => rows.filter((t) => langSet.has(t.lang) && !t.deletedAt)),
    database.journalEntries.toArray().then((rows) => rows.filter((e) => langSet.has(e.lang) && !e.deletedAt)),
    database.playbackProgress.toArray(),
    database.media.toArray().then((rows) => rows.filter((m) => langSet.has(m.lang) && !m.deletedAt)),
  ]);
  const daily: DailyStat[] = dailyByLang.flat();

  // ── Vocabulary ──
  const [knownCounts, learningCounts] = await Promise.all([
    Promise.all(langs.map((l) => database.words.where('[lang+state]').equals([l, 1]).count())),
    Promise.all(langs.map((l) => database.words.where('[lang+state]').equals([l, 2]).count())),
  ]);
  const snapshots = (key: 'knownTotal' | 'learningTotal') =>
    dailyByLang.map((rows) =>
      rows
        .filter((r) => r[key] > 0)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((r) => ({ date: r.date, value: r[key] })),
    );
  let coverage: Overview['vocabulary']['coverage'] = null;
  let families = knownCounts.reduce((a, b) => a + b, 0);
  if (langs.length === 1) {
    const lang = langs[0];
    const [knownWords, freq] = await Promise.all([database.words.where('[lang+state]').equals([lang, 1]).toArray(), database.frequency.where('[lang+rank]').between([lang, 0], [lang, 10_000], true, true).toArray()]);
    const known = new Set(knownWords.map((w) => w.norm));
    const lemmaOf = new Map(freq.map((f) => [f.norm, f.lemma ?? f.norm]));
    families = new Set(knownWords.map((w) => w.lemma ?? lemmaOf.get(w.norm) ?? w.norm)).size;
    if (freq.length) {
      coverage = [1000, 2000, 5000, 10_000].map((top) => {
        const band = freq.filter((f) => f.rank <= top);
        return { top, share: band.length ? band.filter((f) => known.has(f.norm)).length / band.length : 0 };
      });
    }
  }
  const weeks = Array.from({ length: 12 }, (_, i) => weekKey(now - (11 - i) * 7 * DAY));
  const newByWeek = new Map(weeks.map((w) => [w, 0]));
  for (const d of daily) {
    const w = weekKey(dayMs(d.date));
    if (newByWeek.has(w)) newByWeek.set(w, newByWeek.get(w)! + d.newKnown + d.newLearning);
  }

  // ── Reading ──
  const readMinutes = daily.reduce((n, d) => n + d.readMs, 0) / 60_000;
  const wordsRead = daily.reduce((n, d) => n + d.wordsRead, 0);
  const wpmByWeek = new Map<string, { words: number; ms: number }>();
  for (const d of daily) {
    if (!d.readMs) continue;
    const w = weekKey(dayMs(d.date));
    const acc = wpmByWeek.get(w) ?? { words: 0, ms: 0 };
    acc.words += d.wordsRead;
    acc.ms += d.readMs;
    wpmByWeek.set(w, acc);
  }
  const wpmSeries = [...wpmByWeek]
    .filter(([, v]) => v.ms > 3 * 60_000)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-26)
    .map(([w, v]) => ({ x: dayMs(w), y: Math.round(v.words / (v.ms / 60_000)) }));
  const year = new Date(now).getFullYear();
  const finishedTexts = texts.filter((t) => t.finishedAt || (t.kind === 'shelfItem' && t.shelf === 'read'));
  const books = texts
    .filter((t) => t.kind !== 'shelfItem' && t.stats)
    .sort((a, b) => (b.lastOpenedAt ?? b.createdAt) - (a.lastOpenedAt ?? a.createdAt))
    .slice(0, 8)
    .map((t) => ({ id: t.id, title: t.title, lang: t.lang, known: t.stats!.knownShare }));

  // ── Listening ──
  const mediaIds = new Set(media.map((m) => m.id));
  const transcripts = await database.transcripts.toArray();
  const transcribed = new Set(transcripts.filter((t) => mediaIds.has(t.mediaId) && !t.deletedAt).map((t) => t.mediaId));
  const listenedIds = new Set(sessions.filter((s) => s.type === 'listen' && s.refId).map((s) => s.refId!));
  const notes = await database.notes.toArray();
  const deckIds = new Set(decks.map((d) => d.id));

  // ── Flashcards ──
  const cards = (await database.cards.toArray()).filter((c) => deckIds.has(c.deckId) && !c.deletedAt);
  const reviewLogs = (await database.reviewLogs.where('reviewedAt').above(now - 90 * DAY).toArray()).filter((r) => deckIds.has(r.deckId));
  const retention = (days: number) => {
    const relevant = reviewLogs.filter((r) => r.reviewedAt > now - days * DAY && r.stateBefore === 2 && r.affectedSchedule);
    return relevant.length >= 5 ? relevant.filter((r) => r.rating > 1).length / relevant.length : null;
  };
  const forecast = Array.from({ length: 14 }, (_, i) => ({ date: localDateKey(now + i * DAY), due: 0 }));
  const endOfToday = new Date(now).setHours(23, 59, 59, 999);
  for (const c of cards) {
    if (c.suspended || c.state === 0) continue;
    const i = c.due <= endOfToday ? 0 : Math.ceil((c.due - endOfToday) / DAY);
    if (i < 14) forecast[i].due++;
  }
  const maturity = { new: 0, learning: 0, young: 0, mature: 0 };
  for (const c of cards) {
    if (c.suspended) continue;
    if (c.state === 0) maturity.new++;
    else if (c.state === 1 || c.state === 3) maturity.learning++;
    else if (c.scheduledDays >= 21) maturity.mature++;
    else maturity.young++;
  }
  const recent = reviewLogs.filter((r) => r.reviewedAt > now - 30 * DAY && r.durationMs > 0 && r.durationMs < 120_000);
  const ludusModes = new Map<ReviewMode, { right: number; count: number }>();
  for (const r of reviewLogs) {
    if (r.mode === 'classic') continue;
    const acc = ludusModes.get(r.mode) ?? { right: 0, count: 0 };
    acc.count++;
    if (r.rating >= 3) acc.right++;
    ludusModes.set(r.mode, acc);
  }
  const reviewsPerDay = Array.from({ length: 30 }, (_, i) => {
    const date = localDateKey(now - (29 - i) * DAY);
    return { date, reviews: daily.filter((d) => d.date === date).reduce((n, d) => n + d.reviews, 0) };
  });

  // ── Writing ──
  const written = entries.filter((e) => e.words > 0);
  const errors = new Map<CorrectionCategory, number>();
  for (const e of entries) for (const c of e.review?.corrections ?? []) errors.set(c.category, (errors.get(c.category) ?? 0) + 1);

  // ── Time & habit ──
  const byDate = new Map<string, Record<Activity, number>>();
  const add = (date: string, activity: Activity, minutes: number) => {
    if (!byDate.has(date)) byDate.set(date, emptyMinutes());
    byDate.get(date)![activity] += minutes;
  };
  const byHour = Array.from({ length: 24 }, () => 0);
  const kindOf = (s: ActivitySession): Activity => (s.type === 'read' || s.type === 'listen' || s.type === 'watch' || s.type === 'review' || s.type === 'ludus' || s.type === 'write' ? s.type : s.type === 'sing' ? 'listen' : 'review');
  for (const s of sessions) {
    const minutes = s.activeMs / 60_000;
    add(localDateKey(s.startedAt), kindOf(s), minutes);
    byHour[new Date(s.startedAt).getHours()] += minutes;
  }
  for (const l of logs) {
    if (l.at < sinceMs) continue;
    add(localDateKey(l.at), 'logged', l.minutes);
    byHour[new Date(l.at).getHours()] += l.minutes;
  }
  const days: DayMinutes[] = [...byDate]
    .filter(([date]) => date >= since)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, minutes]) => ({ date, minutes, total: ACTIVITIES.reduce((n, a) => n + minutes[a], 0) }));
  const totals = emptyMinutes();
  for (const d of days) for (const a of ACTIVITIES) totals[a] += d.minutes[a];
  // Older logged time still counts in the totals.
  for (const l of logs) if (l.at < sinceMs) totals.logged += l.minutes;
  const met = new Set(daily.filter((d) => d.goalMet).map((d) => d.date));
  const { current, longest } = streaks(met, now);
  const monday = dayMs(weekKey(now));
  const weekMet = Array.from({ length: 7 }, (_, i) => met.has(localDateKey(monday + i * DAY)));

  return {
    langs,
    vocabulary: {
      known: knownCounts.reduce((a, b) => a + b, 0),
      learning: learningCounts.reduce((a, b) => a + b, 0),
      families,
      knownSeries: sumSeries(snapshots('knownTotal'), knownCounts),
      learningSeries: sumSeries(snapshots('learningTotal'), learningCounts),
      coverage,
      newPerWeek: weeks.map((w, i) => ({ week: w, words: newByWeek.get(w) ?? 0, current: i === weeks.length - 1 })),
    },
    reading: {
      minutes: readMinutes,
      words: wordsRead,
      wpm: readMinutes >= 3 ? Math.round(wordsRead / readMinutes) : null,
      wpmSeries,
      finished: finishedTexts.length,
      finishedThisYear: finishedTexts.filter((t) => t.finishedAt && new Date(t.finishedAt).getFullYear() === year).length,
      books,
    },
    listening: {
      minutes: daily.reduce((n, d) => n + d.listenMs, 0) / 60_000,
      watchMinutes: daily.reduce((n, d) => n + d.watchMs, 0) / 60_000,
      finished: progress.filter((p) => p.completed && mediaIds.has(p.mediaId)).length,
      withTranscript: [...listenedIds].filter((id) => transcribed.has(id)).length,
      mined: notes.filter((n) => deckIds.has(n.deckId) && !n.deletedAt && (n.source === 'sonus' || n.source === 'visio' || n.source === 'cantus')).length,
      // Cantus: songs sung along with (for at least half a minute), and the time with them.
      songs: new Set(sessions.filter((s) => s.type === 'sing' && s.refId && s.activeMs >= 30_000).map((s) => s.refId!)).size,
      songMinutes: daily.reduce((n, d) => n + (d.songMs ?? 0), 0) / 60_000,
    },
    flashcards: {
      reviewsPerDay,
      retention30: retention(30),
      retention90: retention(90),
      forecast,
      maturity,
      secondsPerCard: recent.length >= 5 ? Math.round(recent.reduce((n, r) => n + r.durationMs, 0) / recent.length / 100) / 10 : null,
      ludus: [...ludusModes].map(([mode, v]) => ({ mode, accuracy: v.right / v.count, count: v.count })).sort((a, b) => b.count - a.count),
    },
    writing: {
      entries: written.length,
      words: written.reduce((n, e) => n + e.words, 0),
      grades: entries
        .filter((e) => e.review)
        .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
        .map((e) => ({ x: dayMs(e.date), y: e.review!.scores.overall })),
      errors: [...errors].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count).slice(0, 5),
    },
    habit: { days, totals, current, longest, byHour, weekMet },
  };
}

export interface LanguageSummary {
  lang: string;
  hours: number;
  known: number;
  lastStudied: number | null;
  hoursThisMonth: number;
  hoursLastMonth: number;
}

/** Every studied language side by side (Polyglot, Tabula's live columns). */
export async function languageSummaries(langs: string[], database: LinguaDB = db, now = Date.now()): Promise<LanguageSummary[]> {
  const d = new Date(now);
  const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const lastMonthStart = new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime();
  const logs = (await database.studyLogs.toArray()).filter((l) => !l.deletedAt);
  return Promise.all(
    langs.map(async (lang) => {
      const [sessions, known] = await Promise.all([database.sessions.where('[lang+startedAt]').between([lang, 0], [lang, Infinity]).toArray(), database.words.where('[lang+state]').equals([lang, 1]).count()]);
      const mine = logs.filter((l) => l.lang === lang);
      const minutesBetween = (from: number, to: number) =>
        sessions.filter((s) => s.startedAt >= from && s.startedAt < to).reduce((n, s) => n + s.activeMs / 60_000, 0) + mine.filter((l) => l.at >= from && l.at < to).reduce((n, l) => n + l.minutes, 0);
      const last = Math.max(0, ...sessions.map((s) => s.endedAt), ...mine.map((l) => l.at));
      return {
        lang,
        hours: minutesBetween(0, Infinity) / 60,
        known,
        lastStudied: last || null,
        hoursThisMonth: minutesBetween(monthStart, Infinity) / 60,
        hoursLastMonth: minutesBetween(lastMonthStart, monthStart) / 60,
      };
    }),
  );
}

/** Hours studied since a moment (sessions and logged study), across all languages. */
export async function hoursSince(from: number, database: LinguaDB = db): Promise<number> {
  const [sessions, logs] = await Promise.all([database.sessions.toArray(), database.studyLogs.toArray()]);
  const minutes = sessions.filter((s) => s.startedAt >= from).reduce((n, s) => n + s.activeMs / 60_000, 0) + logs.filter((l) => !l.deletedAt && l.at >= from).reduce((n, l) => n + l.minutes, 0);
  return minutes / 60;
}

export interface Pace {
  hours: number;
  hoursPerWeek: number;
  hoursThisWeek: number;
  wordsThisWeek: number;
  booksThisYear: number;
}

/** How a language (or '*' for all) is going lately: what goals and projections are measured against. */
export async function paceOf(lang: string, database: LinguaDB = db, now = Date.now()): Promise<Pace> {
  const all = lang === '*';
  const [sessions, logs, daily, texts] = await Promise.all([
    all ? database.sessions.toArray() : database.sessions.where('[lang+startedAt]').between([lang, 0], [lang, Infinity]).toArray(),
    database.studyLogs.toArray().then((rows) => rows.filter((l) => !l.deletedAt && (all || l.lang === lang))),
    all ? database.dailyStats.toArray() : database.dailyStats.where('[lang+date]').between([lang, ''], [lang, '￿']).toArray(),
    database.texts.toArray().then((rows) => rows.filter((t) => !t.deletedAt && (all || t.lang === lang))),
  ]);
  const minutesSince = (from: number) => sessions.filter((s) => s.startedAt >= from).reduce((n, s) => n + s.activeMs / 60_000, 0) + logs.filter((l) => l.at >= from).reduce((n, l) => n + l.minutes, 0);
  const monday = new Date(`${weekKey(now)}T00:00:00`).getTime();
  const mondayKey = weekKey(now);
  const year = new Date(now).getFullYear();
  return {
    hours: minutesSince(0) / 60,
    hoursPerWeek: minutesSince(now - 28 * DAY) / 60 / 4,
    hoursThisWeek: minutesSince(monday) / 60,
    wordsThisWeek: daily.filter((d) => d.date >= mondayKey).reduce((n, d) => n + d.newKnown + d.newLearning, 0),
    booksThisYear: texts.filter((t) => t.finishedAt && new Date(t.finishedAt).getFullYear() === year).length,
  };
}
