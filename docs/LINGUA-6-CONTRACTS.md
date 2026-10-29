# Lingua 6's contracts

Written in step 6-0 (2026-10-29) so Part A, and every step after it, builds against one set of types and
numbers, whoever builds it (Claude, Codex or Gemini). They are in code, in `src/core/contracts/`, and checked by
`npm run typecheck`. **Nothing in the app imports them yet**: each step copies exactly what its contract says into the
real files (`src/data/types.ts`, `src/data/db.ts`), then the contract stays as the page that says what the fields mean.

| File | Fixes | Built by |
| --- | --- | --- |
| [word.ts](../src/core/contracts/word.ts) | The new `Word`, `DictEntry`, `Deck`, `Note`, `Card` and `ReviewLog` fields, and how an old record reads | 6-1, 6-2, 6-3 |
| [db.ts](../src/core/contracts/db.ts) | The Dexie version of every step, the tables and index strings, merge policies, the `generated` row | 6-1 to 6-6, then each later step |
| [exercise.ts](../src/core/contracts/exercise.ts) | The exercise kinds, how an answer is checked, hints, results, the props of every shared screen | 6-4 |
| [learner.ts](../src/core/contracts/learner.ts) | The `evidence` row, the categories, the persistent-mistake rule, the questions other rooms ask | 6-5 |

## The rules

1. **Dexie versions.** Lingua 6's step 6-N uses version **17 + N**, and only if it needs one. Lingua 5 ended at 17
   (`typing`), so 6-1 is 18 and 6-6 is 23; 6-7 to 6-25 are 24 to 42, reserved. A version a step doesn't need stays
   unused, as 11 is (a device already at a higher version never runs a lower one's upgrade).
2. **Old records are never rewritten.** Every new field is optional, and its file says what absence means
   (`favourite` absent is 0, `inbox` absent is 'kept'). An upgrade function only does what an index needs.
3. **Derived things are not stored twice.** First met, last reviewed and recall rate come from `sightings`, `cards`
   and `reviewLogs`; the per-day summaries in `evidenceDays` can always be rebuilt from `evidence`.
4. **One way in.** Rooms write what the learner did through `LearnerRecord.record` and read it through its questions;
   no room queries `evidence` itself. Exercises are drawn by `core/exercise`, not by room-specific screens.
5. **Private.** `evidence` is on the device, in backups (merge: `union`, rows never change), deleted with the
   language, and exportable (6-24).

## Using them

- **Starting a step:** claim it in the plan's table, read its contract file, write the step's detailed plan under it in
  [LINGUA-6-PLAN.md](LINGUA-6-PLAN.md), then build. The real `SCHEMA_Vn` in `src/data/db.ts` must equal the step's entry
  in `db.ts`'s `PART_A_SCHEMA` (or the entry the step adds).
- **Steps 6-7 to 6-25 and their tables:** `LATER_STEPS_RESERVED` holds only their version numbers. A step that needs a
  table adds a `StepSchema` for it to `contracts/db.ts` **first**, as its own small push, then builds.

## Changing a contract

A contract changes in **its own small, versioned push** (`node scripts/version.ts --line 0.6.0 "Contract: what
moved"`), before the code that needs it, and the commit says what moved and which steps it touches. Never as part of
a step's big commit, so another account that rebases can see it. If a step already built against the old text, that step
is fixed in the same push or the next, and its row in the plan says so. Never rename a field a built step already stores:
add the new one and read both.

## What was decided here (and could be reopened)

- Part A's tables: `evidence`, `evidenceDays` (6-5) and `generated` (6-6) are the only new ones; 6-1 to 6-3 add fields
  and indexes, 6-4 has no table of its own.
- `favourite`, `important`, `inbox` are fields on `Word`, not a separate table, because the word's id is already the
  same on every device.
- Free answers without Max are 'ungraded' until the learner rates them, and count in `evidence` as 'ungraded', not as wrong.
- The persistent-mistake rule (three different days or three places) is the plan's, kept in `PERSISTENT_MISTAKE`.
- Not checked against the real pack builder: the exact field names `DictEntryV6` takes when `scripts/dictionary.ts`
  writes them. 6-1 may adjust them, as its own contract push.
