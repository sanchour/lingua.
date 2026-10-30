// Iter and Tabula: the journey's milestones (found in the history, recorded once), your own
// moments, goals, study done outside Lingua, and the polyglot table.
import { useLiveQuery } from 'dexie-react-hooks';
import { getLanguage } from '@/core/lang/languages';
import type { ImportedCapability } from '@/core/parsers/notion';
import { LANGUAGE_NAMES } from '@/core/parsers/notion';
import { localDateKey } from '@/lib/format';
import { db } from './db';
import type { LinguaDB } from './db';
import type { Capability, CefrLevel, Goal, JourneyEvent, StudyLog } from './types';

const DAY = 86_400_000;
export const WORD_MILESTONES = [100, 500, 1000, 2500, 5000, 10_000];
export const STREAK_MILESTONES = [7, 30, 100, 365];
export const CEFR_LEVELS: CefrLevel[] = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const nameOf = (lang: string) => getLanguage(lang)?.name ?? LANGUAGE_NAMES[lang] ?? lang;
const dayMs = (date: string) => new Date(`${date}T12:00:00`).getTime();

// ── Milestones ──────────────────────────────────────────────────────────────

type MilestoneListener = (events: JourneyEvent[]) => void;
const listeners = new Set<MilestoneListener>();
/** Hears about milestones reached just now (not ones found in old history). */
export function onMilestone(listener: MilestoneListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Finds the milestones a language has reached and records the new ones, dated to when they
 * actually happened (from daily statistics, sessions and the library). Returns the new events.
 */
export async function checkMilestones(lang: string, database: LinguaDB = db, now = Date.now()): Promise<JourneyEvent[]> {
  const profile = await database.languages.get(lang);
  if (!profile) return [];
  const name = nameOf(lang);
  const found: Array<Omit<JourneyEvent, 'createdAt' | 'updatedAt'>> = [];
  const [daily, sessions, logs, texts, entries, decks] = await Promise.all([
    database.dailyStats.where('[lang+date]').between([lang, ''], [lang, '￿']).sortBy('date'),
    database.sessions.where('[lang+startedAt]').between([lang, 0], [lang, Infinity]).toArray(),
    database.studyLogs.where('lang').equals(lang).toArray(),
    database.texts.where('lang').equals(lang).toArray(),
    database.journalEntries.where('lang').equals(lang).toArray(),
    database.decks.where('lang').equals(lang).toArray(),
  ]);

  found.push({ id: `${lang}:started`, lang, kind: 'started', at: profile.createdAt, title: `Started ${name}` });

  // Known words: the first day each threshold was reached.
  const knownNow = await database.words.where('[lang+state]').equals([lang, 1]).count();
  for (const n of WORD_MILESTONES) {
    if (knownNow < n) break;
    const day = daily.find((d) => d.knownTotal >= n);
    found.push({ id: `${lang}:words:${n}`, lang, kind: 'words', at: day ? dayMs(day.date) : now, title: `${n.toLocaleString()} known words`, detail: name, value: n });
  }

  // Books finished.
  const finished = texts.filter((t) => t.finishedAt && !t.deletedAt).sort((a, b) => a.finishedAt! - b.finishedAt!);
  finished.forEach((t, i) => found.push({ id: `${lang}:book:${t.id}`, lang, kind: 'book', at: t.finishedAt!, title: i === 0 ? `First book finished: ${t.title}` : `Finished ${t.title}`, detail: t.author }));

  // Every ten hours, counting study logged outside Lingua.
  const timeline = [...sessions.map((s) => ({ at: s.endedAt, minutes: s.activeMs / 60_000 })), ...logs.filter((l) => !l.deletedAt).map((l) => ({ at: l.at, minutes: l.minutes }))].sort((a, b) => a.at - b.at);
  let minutes = 0;
  let next = 10;
  for (const t of timeline) {
    minutes += t.minutes;
    while (minutes / 60 >= next) {
      found.push({ id: `${lang}:hours:${next}`, lang, kind: 'hours', at: t.at, title: `${next} hours of ${name}`, value: next });
      next += 10;
    }
  }

  // Streaks: the day a run of goal days reached each length.
  let run = 0;
  let prev = 0;
  for (const d of daily.filter((x) => x.goalMet)) {
    const ms = dayMs(d.date);
    run = prev && Math.round((ms - prev) / DAY) === 1 ? run + 1 : 1;
    prev = ms;
    for (const n of STREAK_MILESTONES) if (run === n) found.push({ id: `${lang}:streak:${n}:${d.date}`, lang, kind: 'streak', at: ms, title: `${n}-day streak`, detail: name, value: n });
  }

  // Journal: the first entry, and the best grade so far.
  const written = entries.filter((e) => e.words > 0 && !e.deletedAt).sort((a, b) => a.createdAt - b.createdAt);
  if (written.length) found.push({ id: `${lang}:journal:first`, lang, kind: 'journal', at: written[0].createdAt, title: 'First journal entry', detail: name });
  const best = written.filter((e) => e.review).sort((a, b) => b.review!.scores.overall - a.review!.scores.overall || a.createdAt - b.createdAt)[0];
  if (best && best.review!.scores.overall >= 60) {
    found.push({ id: `${lang}:grade:${best.review!.scores.overall}`, lang, kind: 'grade', at: best.review!.reviewedAt, title: `Best journal grade: ${best.review!.scores.overall}`, detail: best.review!.cefr ? `Reads like ${best.review!.cefr}` : undefined, value: best.review!.scores.overall });
  }

  // Songs: the first one sung along with, then every milestone of different songs.
  const sung = sessions.filter((s) => s.type === 'sing' && s.refId && s.activeMs >= 30_000).sort((a, b) => a.endedAt - b.endedAt);
  const firstAt = new Map<string, number>();
  for (const s of sung) if (!firstAt.has(s.refId!)) firstAt.set(s.refId!, s.endedAt);
  const order = [...firstAt].sort((a, b) => a[1] - b[1]);
  if (order.length) {
    const first = await database.songs.get(order[0][0]);
    found.push({ id: `${lang}:song:first`, lang, kind: 'song', at: order[0][1], title: first ? `First song: ${first.title}` : 'First song sung along with', detail: first?.artist });
  }
  for (const n of [10, 25, 50, 100]) {
    if (order.length >= n) found.push({ id: `${lang}:song:${n}`, lang, kind: 'song', at: order[n - 1][1], title: `${n} songs in ${name}`, value: n });
  }

  // Decks learned: every card mature (at least 20 cards).
  for (const deck of decks.filter((d) => !d.deletedAt)) {
    const cards = await database.cards.where('[deckId+state]').between([deck.id, 0], [deck.id, 3], true, true).toArray();
    const live = cards.filter((c) => !c.suspended && !c.deletedAt);
    if (live.length >= 20 && live.every((c) => c.state === 2 && c.scheduledDays >= 21)) {
      found.push({ id: `${lang}:deck:${deck.id}`, lang, kind: 'deck', at: Math.max(...live.map((c) => c.lastReview ?? 0)) || now, title: `Deck learned: ${deck.name}`, value: live.length });
    }
  }

  const existing = new Set((await database.journeyEvents.bulkGet(found.map((f) => f.id))).filter(Boolean).map((e) => e!.id));
  const fresh = found.filter((f) => !existing.has(f.id)).map((f) => ({ ...f, createdAt: now, updatedAt: now }));
  if (fresh.length) await database.journeyEvents.bulkPut(fresh);
  const recent = fresh.filter((e) => e.kind !== 'started' && now - e.at < 15 * 60_000);
  if (recent.length) for (const l of listeners) l(recent);
  return fresh;
}

/** Checks every studied language (on start and when Iter opens). */
export async function checkAllMilestones(database: LinguaDB = db): Promise<JourneyEvent[]> {
  const langs = await database.languages.toArray();
  return (await Promise.all(langs.map((l) => checkMilestones(l.id, database)))).flat();
}

export function useJourney(): JourneyEvent[] | undefined {
  return useLiveQuery(async () => (await db.journeyEvents.orderBy('at').reverse().toArray()).filter((e) => !e.deletedAt), []);
}

export async function addMoment(input: Pick<JourneyEvent, 'lang' | 'at' | 'title' | 'detail' | 'category' | 'photoBlobId'>, database: LinguaDB = db): Promise<string> {
  const now = Date.now();
  const id = crypto.randomUUID();
  await database.journeyEvents.add({ ...input, id, kind: 'manual', createdAt: now, updatedAt: now });
  return id;
}

export async function removeMoment(id: string, database: LinguaDB = db): Promise<void> {
  await database.journeyEvents.update(id, { deletedAt: Date.now(), updatedAt: Date.now() });
}

// ── Study log ───────────────────────────────────────────────────────────────

export const LOG_ACTIVITIES: Array<{ id: StudyLog['activity']; label: string }> = [
  { id: 'class', label: 'Class' },
  { id: 'tutor', label: 'Tutor' },
  { id: 'conversation', label: 'Conversation' },
  { id: 'app', label: 'Another app' },
  { id: 'podcast', label: 'Podcast or video' },
  { id: 'reading', label: 'Reading' },
  { id: 'other', label: 'Other' },
];

export async function logStudy(input: Pick<StudyLog, 'lang' | 'at' | 'minutes' | 'activity' | 'note'>, database: LinguaDB = db): Promise<void> {
  const now = Date.now();
  await database.studyLogs.add({ ...input, id: crypto.randomUUID(), createdAt: now, updatedAt: now });
}

export async function removeStudyLog(id: string, database: LinguaDB = db): Promise<void> {
  await database.studyLogs.update(id, { deletedAt: Date.now(), updatedAt: Date.now() });
}

export function useStudyLogs(): StudyLog[] | undefined {
  return useLiveQuery(async () => (await db.studyLogs.orderBy('at').reverse().toArray()).filter((l) => !l.deletedAt), []);
}

// ── Goals ───────────────────────────────────────────────────────────────────

export function useGoals(): Goal[] | undefined {
  return useLiveQuery(async () => (await db.goals.toArray()).filter((g) => !g.deletedAt), []);
}

export async function saveGoal(goal: Omit<Goal, 'createdAt' | 'updatedAt' | 'id'> & { id?: string }, database: LinguaDB = db): Promise<void> {
  const now = Date.now();
  const existing = goal.id ? await database.goals.get(goal.id) : undefined;
  await database.goals.put({ ...goal, id: goal.id ?? crypto.randomUUID(), createdAt: existing?.createdAt ?? now, updatedAt: now } as Goal);
}

export async function removeGoal(id: string, database: LinguaDB = db): Promise<void> {
  await database.goals.update(id, { deletedAt: Date.now(), updatedAt: Date.now() });
}

/**
 * Rough study hours to reach each CEFR level from zero, for a language close to English (Spanish,
 * Swedish…). Harder languages take longer; the projection says so instead of promising a date.
 */
export const HOURS_TO_LEVEL: Record<CefrLevel, number> = { A0: 0, A1: 60, A2: 160, B1: 350, B2: 550, C1: 800, C2: 1100 };
// From the FSI's language categories: about 1× for Dutch and Norwegian, up to 2.2× (88 weeks
// against 24–30) for Arabic, Mandarin, Japanese and Korean.
const HARDER: Record<string, number> = {
  ru: 1.6, el: 1.6, hu: 1.8, de: 1.15, tr: 1.6, la: 1.4, id: 1.25, sw: 1.25, nl: 1, nb: 1, ar: 2.2, zh: 2.2, ja: 2.4, ko: 2.2,
};

export interface GoalProgress {
  /** 0–1 */
  fraction: number;
  /** "12 of 30 books", "3.5 of 5 hours this week" */
  label: string;
  /** An honest line about the pace. */
  projection: string;
}

export function goalProgress(goal: Goal, data: { level: CefrLevel; hours: number; hoursPerWeek: number; hoursThisWeek: number; wordsThisWeek: number; booksThisYear: number }, now = Date.now()): GoalProgress {
  const round = (n: number) => Math.round(n * 10) / 10;
  if (goal.kind === 'level') {
    const target = goal.target as CefrLevel;
    const factor = HARDER[goal.lang] ?? 1;
    const need = HOURS_TO_LEVEL[target] * factor;
    const fromLevel = HOURS_TO_LEVEL[data.level] * factor;
    const done = Math.max(data.hours, fromLevel);
    const remaining = Math.max(0, need - done);
    const fraction = need ? Math.min(1, done / need) : 1;
    if (CEFR_LEVELS.indexOf(data.level) >= CEFR_LEVELS.indexOf(target)) return { fraction: 1, label: `${target} reached`, projection: 'Goal reached. Time for a new one?' };
    if (data.hoursPerWeek < 0.25) return { fraction, label: `${data.level} → ${target}`, projection: `About ${Math.round(remaining)} more hours of study. Log a few weeks of practice for a projection.` };
    const weeks = remaining / data.hoursPerWeek;
    const eta = new Date(now + weeks * 7 * DAY);
    const by = goal.by ? dayMs(goal.by) : null;
    const pace = `At ${round(data.hoursPerWeek)} h a week, ${target} is about ${Math.round(remaining)} hours away: around ${eta.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}.`;
    if (!by) return { fraction, label: `${data.level} → ${target}`, projection: pace };
    const needed = remaining / Math.max(1, (by - now) / (7 * DAY));
    return { fraction, label: `${data.level} → ${target} by ${new Date(by).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`, projection: eta.getTime() <= by ? `${pace} On track.` : `${pace} To make it by then, aim for ${round(needed)} h a week.` };
  }
  if (goal.kind === 'travel') {
    const byMs = goal.by ? dayMs(goal.by) : null;
    if (!byMs) return { fraction: 0.5, label: String(goal.target), projection: 'Countdown to your trip' };
    const daysLeft = Math.ceil((byMs - now) / DAY);
    const fraction = daysLeft <= 0 ? 1 : Math.max(0, 1 - daysLeft / 90);
    return {
      fraction,
      label: `${String(goal.target)}: ${daysLeft > 0 ? `${daysLeft} days away` : 'Trip started!'}`,
      projection: daysLeft > 0 ? `${daysLeft} days to prepare your language confidence.` : 'Enjoy your journey in the language!',
    };
  }

  if (goal.kind === 'real-life') {
    const done = Boolean(goal.completedAt);
    return {
      fraction: done ? 1 : 0,
      label: String(goal.target),
      projection: done ? 'Accomplished in the real world!' : 'Ready for your next real-world encounter.',
    };
  }

  const target = Number(goal.target) || 1;
  const byMs = goal.by ? dayMs(goal.by) : null;
  const daysLeft = byMs ? Math.ceil((byMs - now) / DAY) : null;
  const deadlineSuffix = daysLeft !== null ? (daysLeft > 0 ? ` (${daysLeft}d left)` : ' (due)') : '';

  if (goal.kind === 'words') {
    const current = data.wordsThisWeek; // or known words context
    const fraction = Math.min(1, current / target);
    return {
      fraction,
      label: `${current} of ${target} words${deadlineSuffix}`,
      projection: fraction >= 1 ? 'Target reached!' : `${target - current} words to go${deadlineSuffix}.`,
    };
  }

  if (goal.kind === 'lessons') {
    return {
      fraction: 0.5,
      label: `Target: ${target} lessons${deadlineSuffix}`,
      projection: `${target} lessons to master.`,
    };
  }

  if (goal.kind === 'conversations') {
    return {
      fraction: 0.5,
      label: `Target: ${target} conversations${deadlineSuffix}`,
      projection: `${target} conversations to hold.`,
    };
  }

  if (goal.kind === 'writing') {
    return {
      fraction: 0.5,
      label: `Target: ${target} journal entries${deadlineSuffix}`,
      projection: `${target} entries to write.`,
    };
  }

  if (goal.kind === 'listening-hours') {
    const currentHours = Math.round(data.hours * 10) / 10;
    const fraction = Math.min(1, currentHours / target);
    return {
      fraction,
      label: `${currentHours} of ${target} hours${deadlineSuffix}`,
      projection: fraction >= 1 ? 'Listening target complete!' : `${Math.round((target - currentHours) * 10) / 10} hours to go${deadlineSuffix}.`,
    };
  }

  if (goal.kind === 'hours-week') return { fraction: Math.min(1, data.hoursThisWeek / target), label: `${round(data.hoursThisWeek)} of ${target} hours this week`, projection: data.hoursThisWeek >= target ? 'Done for this week.' : `${round(target - data.hoursThisWeek)} hours to go this week.` };
  if (goal.kind === 'words-week') return { fraction: Math.min(1, data.wordsThisWeek / target), label: `${data.wordsThisWeek} of ${target} new words this week`, projection: data.wordsThisWeek >= target ? 'Done for this week.' : `${target - data.wordsThisWeek} words to go this week.` };
  // Yearly reading challenge.
  const yearStart = new Date(new Date(now).getFullYear(), 0, 1).getTime();
  const elapsed = (now - yearStart) / (365 * DAY);
  const expected = target * elapsed;
  return {
    fraction: Math.min(1, data.booksThisYear / target),
    label: `${data.booksThisYear} of ${target} books in ${new Date(now).getFullYear()}`,
    projection: data.booksThisYear >= target ? 'Challenge complete!' : data.booksThisYear >= Math.floor(expected) ? 'On track for the year.' : `${Math.ceil(expected - data.booksThisYear)} ${Math.ceil(expected - data.booksThisYear) === 1 ? 'book' : 'books'} behind schedule.`,
  };
}

/** Where a goal stands, for the slim bar in Tabula: reached, on track, behind, or open (a weekly goal still being filled, a level goal with no date). */
export type GoalStatus = 'reached' | 'on track' | 'behind' | 'open';
export function goalStatus(goal: Goal, progress: GoalProgress): GoalStatus {
  if (progress.fraction >= 1) return 'reached';
  if (goal.kind === 'level') return !goal.by ? 'open' : /On track/.test(progress.projection) ? 'on track' : /To make it by/.test(progress.projection) ? 'behind' : 'open';
  if (goal.kind === 'books-year') return /On track/.test(progress.projection) ? 'on track' : 'behind';
  return 'open';
}

// ── Tabula ──────────────────────────────────────────────────────────────────

export function useCapabilities(): Capability[] | undefined {
  return useLiveQuery(async () => (await db.capabilities.orderBy('order').toArray()).filter((c) => !c.deletedAt), []);
}

/** The first time Tabula opens, each language studied in Lingua gets a row. */
export async function seedCapabilities(database: LinguaDB = db): Promise<void> {
  if ((await database.capabilities.count()) > 0) return;
  const langs = await database.languages.toArray();
  const now = Date.now();
  await database.capabilities.bulkPut(
    langs.map((l, i) => ({
      id: l.id,
      name: nameOf(l.id),
      level: l.level as CefrLevel,
      status: 'learning' as const,
      methods: ['Self-study'],
      started: localDateKey(l.createdAt),
      order: i,
      createdAt: now,
      updatedAt: now,
    })),
  );
}

/** Saves a row; a changed level is remembered on the journey. */
export async function saveCapability(next: Capability, database: LinguaDB = db): Promise<void> {
  const now = Date.now();
  const before = await database.capabilities.get(next.id);
  await database.capabilities.put({ ...next, createdAt: before?.createdAt ?? now, updatedAt: now });
  if (before && before.level !== next.level) {
    await database.journeyEvents.put({ id: `${next.id}:level:${next.level}:${localDateKey(now)}`, lang: next.id, kind: 'level', at: now, title: `${next.name}: ${next.level}`, detail: `From ${before.level}`, value: CEFR_LEVELS.indexOf(next.level), category: before.level, createdAt: now, updatedAt: now });
  }
}

export async function addCapability(name: string, id: string, database: LinguaDB = db): Promise<void> {
  const count = await database.capabilities.count();
  const now = Date.now();
  await database.capabilities.put({ id, name, level: 'A0', status: 'not-started', methods: [], order: count, createdAt: now, updatedAt: now });
}

export async function removeCapability(id: string, database: LinguaDB = db): Promise<void> {
  await database.capabilities.update(id, { deletedAt: Date.now(), updatedAt: Date.now() });
}

export async function reorderCapabilities(ids: string[], database: LinguaDB = db): Promise<void> {
  const now = Date.now();
  await database.transaction('rw', database.capabilities, async () => {
    for (const [order, id] of ids.entries()) await database.capabilities.update(id, { order, updatedAt: now });
  });
}

/** Merges a Notion import: rows with the same language are updated, new ones added. */
export async function importCapabilities(rows: ImportedCapability[], database: LinguaDB = db): Promise<{ added: number; updated: number }> {
  let added = 0;
  let updated = 0;
  const count = await database.capabilities.count();
  const now = Date.now();
  for (const [i, row] of rows.entries()) {
    const existing = await database.capabilities.get(row.id);
    if (existing && !existing.deletedAt) {
      await saveCapability({ ...existing, ...row, methods: row.methods.length ? row.methods : existing.methods, started: row.started ?? existing.started }, database);
      updated++;
    } else {
      await database.capabilities.put({ ...row, order: count + i, createdAt: now, updatedAt: now });
      added++;
    }
  }
  return { added, updated };
}
