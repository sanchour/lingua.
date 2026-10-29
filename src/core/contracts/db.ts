// Lingua 6 contract: the Dexie versions and tables, reserved up front so no two steps (or accounts, or AIs) take
// the same version number. Types and constants only: the schema strings and the upgrade functions are written in
// `src/data/db.ts` by each step, and must equal what is here.
//
// The rule: Lingua 6 step 6-N uses Dexie version 17 + N, and only if it needs one (a new table, a new index, or an
// upgrade function). A step with nothing to change leaves its number unused, as 11 is. Lingua 5 ended at 17
// (`typing`). `db.version(n)` is called in order in `createDb()`, one line per version.

/** The version Lingua 5 ended on (SCHEMA_V17, `typing`). */
export const LINGUA5_LAST_DEXIE_VERSION = 17;

/** The Dexie version of Lingua 6's step N (1 to 25). */
export type Lingua6Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25;

export function dexieVersionOfStep(step: Lingua6Step): number {
  return LINGUA5_LAST_DEXIE_VERSION + step;
}

/** What a step changes in the schema, written in the same notation as `SCHEMA_Vn` in db.ts. A table that is only
 *  given an extra index repeats its whole index string, as Dexie wants. `null` means the step has no schema change
 *  yet; a later step that finds it needs one adds it here first, as its own small versioned push (see
 *  docs/LINGUA-6-CONTRACTS.md). */
export interface StepSchema {
  step: Lingua6Step;
  /** Tables and the full index string of each. */
  stores: Record<string, string>;
  /** Merge policy for each new table in backup and restore (src/data/backup.ts). */
  policy: Record<string, 'lww' | 'union' | 'insertOnly'>;
  /** What the upgrade function does, if there is one. Never rewrites the learner's data to fill a default. */
  upgrade?: string;
}

/** Part A. 6-0 itself changes nothing. */
export const PART_A_SCHEMA: StepSchema[] = [
  {
    // 6-1: words find favourites and important ones, and the inbox, by language.
    step: 1,
    stores: {
      words: 'id, [lang+state], [lang+lemma], [lang+favourite], [lang+important], [lang+inbox], updatedAt',
    },
    policy: {},
    upgrade: 'none: new fields are optional and read as their defaults (word.ts)',
  },
  {
    // 6-2: decks that are archived or pinned are found by language; cards of a deck by their order.
    step: 2,
    stores: {
      decks: 'id, lang, folderId, kind, [lang+archived], updatedAt',
      notes: 'id, deckId, wordId, lang, [deckId+order], updatedAt, *tags',
    },
    policy: {},
  },
  {
    // 6-3: buried cards and leeches are found by deck.
    step: 3,
    stores: {
      cards: 'id, noteId, [deckId+due], [deckId+state], [deckId+leech], due, updatedAt',
    },
    policy: {},
  },
  {
    // 6-4: the engine keeps no table of its own; its answers go to `evidence` (6-5). Version number unused.
    step: 4,
    stores: {},
    policy: {},
  },
  {
    // 6-5: the learner's record. Append-only; summaries are derived and cached per day.
    step: 5,
    stores: {
      evidence: 'id, [lang+at], [lang+skill+at], [lang+category+at], [lang+itemKey], at',
      evidenceDays: 'id, [lang+day]',
    },
    policy: { evidence: 'union', evidenceDays: 'insertOnly' },
  },
  {
    // 6-6: what Max made, with its label and checks, so nothing is paid for twice.
    step: 6,
    stores: {
      generated: 'id, [lang+kind], [lang+createdAt], hash',
    },
    policy: { generated: 'insertOnly' },
  },
];

/** Parts B to E: the version number each step may use, reserved. Their tables are added to this file by the step
 *  that needs them, before it writes any code (docs/LINGUA-6-CONTRACTS.md). */
export const LATER_STEPS_RESERVED: Record<string, number> = Object.fromEntries(
  Array.from({ length: 19 }, (_, i) => [`6-${i + 7}`, LINGUA5_LAST_DEXIE_VERSION + i + 7]),
);

/** The `generated` table's row, 6-6: one thing Max made. */
export interface GeneratedRow {
  id: string;
  lang: string;
  /** 'story' · 'dialogue' · 'quiz' · 'drill' · 'wordlist' · 'sentences' · … */
  kind: string;
  /** hash(kind + level + model + the prompt's inputs): the cache key. */
  hash: string;
  level?: string;
  /** The checked result, as the strict JSON schema of its kind says. */
  content: unknown;
  /** The checks it passed, shown beside the quiet "Generated" label. */
  checks: Array<'schema' | 'dictionary' | 'level' | 'grammar'>;
  /** Words the offline dictionary doesn't know, flagged rather than hidden. */
  unknownWords?: string[];
  model: string;
  createdAt: number;
  /** The learner pressed Report. */
  reported?: boolean;
}
