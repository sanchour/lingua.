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

## Changes since 6-0

- **0.6.0-alpha.4 (6-4):** `exercise.ts` gains `TransformBody` and `AnswerRule`'s `accent-blind` gains `rejects`. From 6-4 on,
  `src/core/exercise/` imports `exercise.ts` and `learner.ts` for its types; the contract stays the single source.

- **0.6.0-alpha.8 (6-1):** `WordV6` is built as `tags`, `favourite` and `important` on `Word` (Dexie 18, as `PART_A_SCHEMA` says); `inbox` waits for 6-2, `grammarTopics` and `relatedWordIds` for 6-1b. `WordHistory` is worked out by `wordHistory` in `data/words.ts`, never stored.

- **0.6.0-alpha.10 (6-2):** built `Word.inbox`, `Deck.archived`, `pinned`, `important` and `Note.order` (the field only; nothing sorts by it yet), with Dexie 19 exactly as `PART_A_SCHEMA` says; `coverBlobId` and `madeFrom` wait for 6-2b. The inbox is worked out, not stored for new words: a word with sightings and no row is new (`inboxStateOf`).

- **0.6.0-alpha.12 (6-3):** built `Card.buriedUntil` and `leech`, `ReviewLog.hinted`, `guessed` and `contextId`, `Note.mnemonic` and `template` (the field only), `DeckConfig.burySiblings`, with Dexie 20 exactly as `PART_A_SCHEMA` says. `answerCard` takes `hinted`, `guessed` and `contextId` and returns `leech`.

- **0.6.0-alpha.14 (6-5):** `EvidenceRow` gains `itemKey` (the item as one string) and `evidence` is indexed `[lang+itemKey]` instead of `[lang+item]`, which cannot index an object.

- **0.6.0-alpha.15 (6-5):** built `evidence` (Dexie 22; 21 is unused) with `itemKey`, and `evidenceDays` as a cache that is **not backed up** (`skip`, not `insertOnly`: it is rebuilt from the evidence). `LearnerRecord.record` takes a row without `itemKey`. The room is the one where the answer is taken: `answerCard` and `answerGrammarItem` write the rows.

- **0.6.0-alpha.17 (6-6):** built `generated` (Dexie 23) and `GeneratedRow` as the contract has them; `checks` holds `grammar` for later, nothing writes it yet. Backed up as `insertOnly`.

- **0.6.0-alpha.19 (6-1b):** the language's half was built in the full dictionary's `FullEntry` (version 3) with different names from `DictEntryV6`, which says so now: `syl`, `stress`, `hom`, `cog`, `parts`, `root`.

## What was decided here (and could be reopened)

- Part A's tables: `evidence`, `evidenceDays` (6-5) and `generated` (6-6) are the only new ones; 6-1 to 6-3 add fields
  and indexes, 6-4 has no table of its own.
- `favourite`, `important`, `inbox` are fields on `Word`, not a separate table, because the word's id is already the
  same on every device.
- Free answers without Max are 'ungraded' until the learner rates them, and count in `evidence` as 'ungraded', not as wrong.
- The persistent-mistake rule (three different days or three places) is the plan's, kept in `PERSISTENT_MISTAKE`.
- Not checked against the real pack builder: the exact field names `DictEntryV6` takes when `scripts/dictionary.ts`
  writes them. 6-1 may adjust them, as its own contract push.

- **0.6.0-alpha.59 (6-2b):** `Deck` gains `coverBlobId` (already in `DeckV6`) and `color`, both optional and not indexed, so no Dexie version.
