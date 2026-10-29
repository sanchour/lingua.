// The learner's record (6-5): one append-only `evidence` row for everything the learner did, written where answers are taken
// (a card answered, a grammar item answered) and read only through these questions, so every room agrees about the weak spots.
// Private: on the device, in backups, deleted with the language.
import Dexie from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import type { EvidenceDay, EvidenceItem, EvidenceRow, LearnerRecord, Skill, WeakSpot } from '@/core/contracts/learner';
import { itemKeyOf, quietSkills, recognisedNotRecalled, summariseDay, weakSpotsOf } from '@/core/learner/learner';
import { localDateKey } from '@/lib/format';
import { db } from './db';
import type { LinguaDB } from './db';

type NewEvidence = Omit<EvidenceRow, 'id' | 'day' | 'itemKey'> & { id?: string };

/** Keeps one thing the learner did. A day's cached summary is dropped, to be worked out again when asked. */
export async function recordEvidence(row: NewEvidence, database: LinguaDB = db): Promise<EvidenceRow> {
  const day = localDateKey(row.at);
  const stored: EvidenceRow = { ...row, id: row.id ?? crypto.randomUUID(), day, itemKey: itemKeyOf(row.item) };
  await database.transaction('rw', database.evidence, database.evidenceDays, async () => {
    await database.evidence.put(stored);
    await database.evidenceDays.delete(`${row.lang}:${day}`);
  });
  return stored;
}

/** Every row of a language in a span of time, oldest first. */
async function rowsOf(lang: string, from: number, to: number, database: LinguaDB): Promise<EvidenceRow[]> {
  return database.evidence.where('[lang+at]').between([lang, from], [lang, to], true, true).toArray();
}

const WEAK_WINDOW = 120 * 86_400_000;

/** The questions other rooms ask. They are the only way to read the table. */
export function learnerRecord(database: LinguaDB = db, now: () => number = Date.now): LearnerRecord {
  return {
    record: async (row) => {
      await recordEvidence(row as NewEvidence, database);
    },
    weakSpots: async (lang, opts) => weakSpotsOf(await rowsOf(lang, now() - WEAK_WINDOW, now(), database), opts),
    recognisedNotRecalled: async (lang, limit) => recognisedNotRecalled(await rowsOf(lang, now() - WEAK_WINDOW, now(), database), limit),
    quietSkills: async (lang, days = 14) => quietSkills(await rowsOf(lang, now() - days * 86_400_000, now(), database), now(), days),
    history: async (lang, item: EvidenceItem, limit = 50) => {
      const rows = await database.evidence.where('[lang+itemKey]').equals([lang, itemKeyOf(item)]).toArray();
      return rows.sort((a, b) => b.at - a.at).slice(0, limit);
    },
    days: async (lang, from, to) => {
      const start = new Date(`${from}T00:00:00`).getTime();
      const end = new Date(`${to}T23:59:59.999`).getTime();
      const cached = new Map((await database.evidenceDays.where('[lang+day]').between([lang, from], [lang, to], true, true).toArray()).map((d) => [d.day, d]));
      const byDay = new Map<string, EvidenceRow[]>();
      for (const r of await rowsOf(lang, start, end, database)) byDay.set(r.day, [...(byDay.get(r.day) ?? []), r]);
      const today = localDateKey(now());
      const out: EvidenceDay[] = [];
      for (const [day, rows] of [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        const summary = cached.get(day) ?? summariseDay(lang, day, rows);
        // A finished day's summary is kept; today's changes, so it is not.
        if (!cached.has(day) && day !== today) await database.evidenceDays.put(summary);
        out.push(summary);
      }
      return out;
    },
    forgetLanguage: (lang) => forgetEvidence(lang, database),
  };
}

/** Takes one row back (an answer that was undone), and the cached summary of its day. */
export async function forgetEvidenceRow(id: string, database: LinguaDB = db): Promise<void> {
  await database.transaction('rw', database.evidence, database.evidenceDays, async () => {
    const row = await database.evidence.get(id);
    if (!row) return;
    await database.evidence.delete(id);
    await database.evidenceDays.delete(`${row.lang}:${row.day}`);
  });
}

/** Everything the record holds for a language (it is removed, or the learner wipes it). */
export async function forgetEvidence(lang: string, database: LinguaDB = db): Promise<void> {
  await database.evidence.where('[lang+at]').between([lang, Dexie.minKey], [lang, Dexie.maxKey]).delete();
  await database.evidenceDays.where('[lang+day]').between([lang, Dexie.minKey], [lang, Dexie.maxKey]).delete();
}

/** The weak spots of a language, live. */
export function useWeakSpots(lang: string, opts: { skill?: Skill; limit?: number } = {}): WeakSpot[] | undefined {
  return useLiveQuery(() => learnerRecord().weakSpots(lang, opts), [lang, opts.skill, opts.limit]);
}
