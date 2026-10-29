# Lingua 6 · Features · the plan

**Renamed 2026-10-27** (the user: "Put Lingua 7 as Lingua 6 - Design, so Lingua Design becomes 0.7"): what was planned as
Lingua 7 · Features is **Lingua 6 · Features** (`0.6.x`), built first; what was Lingua 6 · Design is **Lingua 7 · Design** (`0.7.x`),
built after it. Step numbers moved with the names (Features 6-1 … 6-28, Design 7-0 … 7-11).

**Status: planned 2026-10-26, not started.** The user pasted the Lingyu feature catalogue (1,618 entries) and asked:
"Compare the app with these features, check which features it currently has and which ones it doesn't have. For
all the features which it doesn't, map them out and create a long roadmap plan, in order to integrate and add all
these features into the app. All of them that are missing. Do this intelligently. The plan will be noted as
Lingua 6 - Features. However for now, just create the plan … I will most likely implement this plan on another
session."

So this file is written for the session that builds it, on any account. Read first: [CLAUDE.md](../CLAUDE.md), the
queue in [HANDOVER.md](HANDOVER.md), Part One of [the design handbook](handbook/Lingua-Design-Handbook.pdf), and
**the audit, [LINGUA-6-FEATURES.md](LINGUA-6-FEATURES.md)**: every one of the 1,618 entries, ticked where Lingua has
it, and otherwise naming the step below that builds it. Tick entries there as they are built.

---

## 0. What the audit found

| | Entries |
| --- | --- |
| Lingua has it | 437 |
| Partly there: Lingua 6 finishes it | 262 |
| Missing: Lingua 6 builds it | 834 |
| Already planned in an open Lingua 5.2 step (5.2-4, 5.2-6, 5.2-7, 5.2-8) | 38 |
| Needs the user's word: against a standing decision (step 6-27) | 47 |

Lingua already has most of the catalogue's own "Phase 1" core (vocabulary and FSRS, interactive reading, grammar,
pronunciation audio, notes, progress, import and export) and much of its "Phase 3" (video and subtitles, authentic
media, several languages). The gaps are deep rather than wide: pronunciation and phonetics, translation and contrast,
exams, the tutor, games, a phrasebook and notebook, conversation feedback, and many smaller tools in every room.

## 1. How this plan was made "intelligently"

1. **Build the shared machinery once.** Hundreds of entries are the same few things seen from different rooms. "Word
   → synonym" cards, synonym races, synonym maps, a synonym finder while writing and frequency-ranked synonyms are
   five entries and one data source. Part A builds six foundations (the word record, the inbox and decks, cards and
   memory, one exercise engine, the learner's record, checked AI generation); the steps after it mostly add screens
   and content on top.
2. **Every feature lands in a room that exists**, as a tab, a panel, a mode or a setting, in the handbook's style.
   New tabs only where a room needs one: Cursus › Sounds and › Exams, Thesaurus › Phrases and › Map, Mentis › Notebook,
   Ludus › Translate. One word
   everywhere: a word met in a song is the same record in the phrasebook, the word map and the exam deck.
3. **Lingua's rules hold.** Local-first; AI only with Max and the learner's own key; estimates labelled; nothing
   added behind the learner's back (previews before a deck grows); nothing public. Entries that would need a server,
   accounts or a phone app go to 6-27 with a local-first way to get most of them, for the user to decide.
4. **Hand-made where it counts, automatic elsewhere.** Hand-made content (phonetics and mouth drawings, exam
   formats, language-specific tools, culture notes) is for the six core languages; tier 2 gets what builds itself
   from the packs ("Tier 2 stays cheap", CLAUDE.md). Everything generated passes 6-6's checks.
5. **Nothing doubled.** Entries already in open Lingua 5.2 steps stay there; Lingua 6 builds after them.

---

## 2. Where Lingua 6 fits, and the order

- **Next after Lingua 5's check (handover step 21), and before Lingua 7 · Design** (the user, 2026-10-26: "Do Lingua Features first, then Lingua Design"). New screens follow
  the handbook as it stands; Lingua 7 then redesigns rooms that already have Lingua 6's features in them.
- **Versions:** `0.6.0-alpha.N` from its first push (`node scripts/version.ts --line 0.6.0 "…"`), `0.6.0` at 6-28.
- **Desktop only**, as always. **Plans** follow the rooms (D4 of the 5.1 plan): what Thesaurus, Codex, the
  dictionary, Diarium, the notebook and Ratio gain is free; what Ludus, Cursus (Grammatica, the course, Sounds,
  Exams), Sermo and Sonus+ gain is Lingua+; every AI feature is Max (D2, D8).
- **Each step:** claim it in the table below (as HANDOVER.md section 2 says for its queue), write its detailed plan
  in this file under the step before building (CLAUDE.md's way), build, check, tick its entries in
  LINGUA-6-FEATURES.md and its row here, update FEATURES and DECISIONS, version, push.

| Step | Status | What | Entries | Needs | Size |
| --- | --- | --- | --- | --- | --- |
| **Part A · Foundations** | | | | | |
| 6-0 | [x] | *done 2026-10-29 (0.6.0-alpha.2; [LINGUA-6-CONTRACTS.md](LINGUA-6-CONTRACTS.md), `src/core/contracts/`; typecheck, tests and build pass, nothing imports it yet)* The contracts: Part A's types, tables and APIs, before any code | — | Lingua 5's check | S |
| 6-1 | [x] | *the learner's half done 2026-10-29 (0.6.0-alpha.8; Dexie 18, tags, favourite, important, the note, first met, last reviewed and recall on the word's page; 6 of its entries ticked); the language's half is 6-1b* The word record | 22 new · 23 to finish | — | L |
| 6-1b | [ ] | The language's half of the word record: word families and compounds, syllables and stress, homophones, countable and irregular flags, regional labels, ranked synonyms and confusables, false friends with the learner's languages, spelling mistakes; **needs a pack rebuild and `scripts/.cache` (about 2 GB, hours): ask the user first**; the links to grammar topics and to other words | 16 of 6-1's entries | 6-1 | L |
| 6-2 | [x] | *the inbox and the first deck tools done 2026-10-29 (0.6.0-alpha.10; Dexie 19; 5 of its entries ticked); the rest is 6-2b* The inbox and the deck workshop | 15 new · 25 to finish | 6-1 | L |
| 6-2b | [ ] | The rest of the deck workshop: a merge dialog (the data is there), bulk tag, move and delete of cards, tidy (duplicate cards and translations, missing sentences and sounds), decks made from a text, a book, a song, a list, a conversation, a topic or a goal with a preview, nested folders and sorting by hand, descriptions and cover pictures, bulk edit | 20 of 6-2's entries | 6-2 | L |
| 6-3 | [x] | *the memory controls done 2026-10-29 (0.6.0-alpha.12; Dexie 20; leeches, bury, mnemonic, how likely it is remembered, the catch-up plan; 4 of its entries ticked); the card kinds and the rest is 6-3b* Cards and memory | 21 new · 11 to finish | 6-1 | L |
| 6-3b | [ ] | The rest of cards and memory: the card templates (picture, synonym, antonym, collocation, grammar facts, several meanings, related words, image occlusion, sound only) and pictures with their licence; hints and the "I guessed" button on cards (the data is there); custom learning steps; a Difficult set; reschedule or forget a card; no near-identical cards in a row; frequently forgotten first; the due calendar, estimated time, stability and recognition beside recall; contexts rotated | 17 of 6-3's entries | 6-3 | L |
| 6-4 | [x] | *done 2026-10-29 (0.6.0-alpha.6): `core/exercise`, the shared transformation screen, transformations in Ludus, Grammatica and the course; 3 of its 25 new entries built (F0244, F0936, F0937), the rest is 6-4b* One exercise engine | 25 new · 3 to finish | — | L |
| 6-4b | [ ] | The rest of 6-4's kinds and ways to answer: the matching variants, correct the mistake, rewrite, combine, expand, simplify, drag and drop, predict the form, complete a dialogue; confidence, self-assessment, delayed feedback, retry with a new example; the existing kinds moved into the engine | 22 of 6-4's new entries · 3 to finish | 6-4 | L |
| 6-5 | [ ] | The learner's record | 9 new · 2 to finish | 6-4 | M |
| 6-6 | [ ] | Generated materials, checked | 19 new · 3 to finish | 6-1, 6-4 | M |
| **Part B · The skills** (in parallel, after Part A) | | | | | |
| 6-7 | [ ] | Grammar | 19 new · 12 to finish | 6-4, 6-5 | L |
| 6-8 | [ ] | Reading | 41 new · 31 to finish | 6-4, 6-6 | XL |
| 6-9 | [ ] | Listening | 49 new · 18 to finish | 6-4, 6-6 | XL |
| 6-10 | [ ] | Sounds and pronunciation | 82 new · 7 to finish | 6-4, 6-5 | XL |
| 6-11 | [ ] | Speaking | 46 new · 5 to finish | 6-5, 6-6 | L |
| 6-12 | [ ] | Writing | 48 new · 7 to finish | 6-1, 6-6 | L |
| 6-13 | [ ] | Translating and comparing languages | 45 new · 2 to finish | 6-4, 6-6 | L |
| **Part C · Paths and guidance** | | | | | |
| 6-14 | [ ] | Courses and lessons | 29 new · 10 to finish | Part B's 6-8 to 6-10 | XL |
| 6-15 | [ ] | The tutor, in context | 28 new · 10 to finish | 6-5, 6-6 | M |
| 6-16 | [ ] | Personal and adaptive | 27 new · 11 to finish | 6-5 | L |
| 6-17 | [ ] | Goals, habits and progress | 24 new · 12 to finish | 6-5 | L |
| 6-18 | [ ] | Exams and levels | 38 new · 1 to finish | 6-14, 6-16 | L |
| **Part D · More of the language** (in parallel, after Part A) | | | | | |
| 6-19 | [ ] | Immersion and culture | 23 new · 7 to finish | 6-1 | L |
| 6-20 | [ ] | Phrasebook, notebook and the word map | 55 new · 10 to finish | 6-1, 6-2 | L |
| 6-21 | [ ] | Games and projects | 66 new · 3 to finish | 6-4, 6-6 | L |
| 6-22 | [ ] | Dictionary tools | 15 new · 2 to finish | 6-1 | M |
| 6-23 | [ ] | Tools for each language | 32 new · 19 to finish | 6-1, 6-4 | L |
| **Part E · Around the app** (any time after Part A) | | | | | |
| 6-24 | [ ] | Import, export and integrations | 15 new · 7 to finish | 6-2 | M |
| 6-25 | [ ] | Accessibility and the desktop | 3 new · 10 to finish | — | M |
| **Part F · Further out** (each only with the user's word) | | | | | |
| 6-26 | [ ] | Experiments | 38 new · 2 to finish | the user | — |
| 6-27 | [ ] | Together, and beyond the desk | 9 to finish · 47 to decide | the user | — |
| **Part G** | | | | | |
| 6-28 | [ ] | Lingua 6 complete: the check; version 0.6.0 | — | all | S |

Sizes are a guide: S an evening, M a session, L two or three sessions, XL more, best split into parts as Lingua 5's
big steps were (a, b, c), each pushed on its own.

### Stages, and which AI builds what (the user, 2026-10-28)

The user has Claude Pro, ChatGPT Plus and Google AI Pro, each with its own limits; Lingua 6 is spread over them so
one limit never stops the work. Each step is still claimed in the table above first, whichever AI builds it.

| Stage | Steps | Who | Why |
| --- | --- | --- | --- |
| 0 | 6-0 The contracts | Claude Opus, one session | The one place a careful model pays off: every later step and every AI builds against it |
| 1 | Part A, 6-1 to 6-6, in order | Claude Code, Sonnet | Dexie migrations and shared types: one owner, one after the other, no parallel work |
| 2a | Part B, 6-7 to 6-13 | Claude Code, Sonnet | The skills; deep in Part A's engine and the learner's record |
| 2b | Parts D and E, 6-19 to 6-25 | Codex (ChatGPT Plus) or Gemini in Antigravity (Google AI Pro) | Mostly new tabs and parsers, in their own folders; runs at the same time as 2a |
| 3 | Part C, 6-14 to 6-18, in order | Claude Code, Sonnet | Ties A, B and D together; 6-14 waits for 6-8 to 6-10, 6-18 for 6-14 and 6-16 |
| 4 | 6-28 The check, 0.6.0 | Any, Gemini is enough | A spot-check: the audit's entries are ticked step by step as they're built, not all at the end |
| — | Part F, 6-26 and 6-27 | Only with the user's word | Not part of 0.6.0 unless the user asks |

- **Models:** Sonnet for building (Opus uses a Pro limit several times faster); Opus only for 6-0 and a step that
  needs real design thinking. The tests, typecheck and build cost no tokens: run them, don't ask a model to.
- **Parallel without collisions (stages 2a and 2b).** The folders differ, but some files are shared: `src/data/db.ts`
  (the Dexie versions), `src/data/types.ts`, `src/app/router.tsx`, `src/app/pages.ts`, the navigation, and the docs
  (FEATURES, DECISIONS, HANDOVER, this table). So: 6-0 reserves every Lingua 6 table and Dexie version up front,
  so no two steps add the same version number; a step adds to the shared files only in its own lines; always rebase
  onto `origin/main` before a push (CLAUDE.md), and a conflict in a shared file is merged, never overwritten.
- **Short briefs:** with 6-0 in place, a step's brief is "build 6-N as LINGUA-6-PLAN.md says, against the contracts",
  plus HANDOVER.md's prompt. Codex and Gemini read CLAUDE.md too.

---

## 3. The steps

Each step: the idea, what it adds, where it lives, the data, and when it is done. "Entries" lists every catalogue
entry the step builds or finishes (the audit has their names).

### Part A · Foundations

#### 6-0 · The contracts (the user, 2026-10-28)

**The idea:** before Part A is built, fix what everything else builds against, so the parallel stages and the three
AIs agree without reading each other's work. Written as code, not only prose: a types-only folder that
`npm run typecheck` checks, with a short guide beside it.

- `src/core/contracts/word.ts`: the updated `Word` and `DictEntry` (6-1), what each field means, which are new and
  how old records read (defaults, never a rewrite of the learner's data).
- `src/core/contracts/db.ts`: the Dexie bump for all of Lingua 6, every new table with its keys and indexes, and the
  version numbers reserved per step; the upgrade functions stay in `src/data/db.ts`, written in 6-1 to 6-6.
- `src/core/contracts/exercise.ts`: the API of `core/exercise` (6-4): the exercise kinds, the props each screen
  takes, how an answer is checked (exact, accent-blind, a list of accepted answers, AI-checked with Max) and the
  result it reports.
- `src/core/contracts/learner.ts`: the `evidence` table of `core/learner` (6-5): one row per thing the learner did
  (what, which word or topic, right or wrong, how sure, when, from which room), and the questions other rooms ask of it.
- `docs/LINGUA-6-CONTRACTS.md`: a page on how to use them, and the rule that changing a contract is its own small,
  versioned push that says what moved.

**Done when:** the four files typecheck, Part A's steps here point to them, and nothing in the app uses them yet.

#### 6-1 · The word record

**Contract (6-0):** [word.ts](../src/core/contracts/word.ts) (`WordV6`, `DictEntryV6`) and [db.ts](../src/core/contracts/db.ts) (Dexie 18). Build against it; change it only as [LINGUA-6-CONTRACTS.md](LINGUA-6-CONTRACTS.md) says.

**The idea.** Every room already reads words from the dictionary packs (`DictEntry`, forms, examples) and the word
memory (`Word`, `Sighting`). 6-1 makes this one record per word with two halves: **the language** (everything the
dictionary can say) and **you** (everything the learner did with it). Every later step reads from it.

**The language, more of it** (built into the packs by `scripts/dictionary.ts` from Wiktionary through kaikki, as now):
- Word families, roots and stems, prefixes and suffixes, derived forms (Wiktionary's derived and related terms,
  etymology templates); compound words split (German first); homonyms and homophones (same spelling or same IPA).
- Syllables (open hyphenation patterns per language), stress (Russian accents from Wiktionary), countable or not,
  irregular forms flagged, aspect pairs (Russian), phrasal and separable verbs.
- Labels on senses: register and formality, slang and colloquial, regional (Spain or Mexico, Brazil or Portugal,
  Britain or America), connotation (pejorative, endearing): Wiktionary's sense tags, shown as small quiet chips.
- Synonyms ranked by frequency; differences between similar words (the "easily confused" lists, extended); example
  sentences ranked by difficulty (Tatoeba sentences scored by the frequency of their words).
- False friends and cognates **with the learner's own languages** (Tabula), from etymology links and spelling, each
  pair checked by meaning; common spelling mistakes and learner errors (hand-made lists for the six core languages).

**You:** personal notes (the `Word.note` field, now edited on the page), tags, favourite and important, first met,
last reviewed, review history and recall rate (from `reviewLogs`), links to grammar topics ("Why this form?" made
general), to other words, and to every text where it was met (the sightings, as now).

**Where:** Thesaurus › Dictionary's entry becomes **the word's page** (the language left, you right, on a desktop);
the word drawer's "Open dictionary" opens it. **Data:** a new pack format version (`DictEntry.family`,
`syllables`, `labels`, `related`); `Word` gains `tags`, `favourite`, `important` (Dexie version + migration, backup
and merge). Tier 2 packs get what Wiktionary has for them; nothing hand-made.
**Done when:** a Spanish, a German and a Russian word each show family, syllables, labels and the learner's half;
the old packs still load. **Entries (22 new · 23 to finish):** F0121–F0125, F0127–F0129, F0131, F0134, F0136–F0137, F0140–F0141, F0144–F0145, F0148–F0151, F0155–F0157, F0160–F0162, F0164, F1055–F1056, F1060, F1063–F1064, F1066–F1074, F1259, F1270–F1272

#### 6-2 · The inbox and the deck workshop

**Contract (6-0):** [word.ts](../src/core/contracts/word.ts) (`DeckV6`, `NoteV6`, `InboxState`) and [db.ts](../src/core/contracts/db.ts) (Dexie 19). Build against it; change it only as [LINGUA-6-CONTRACTS.md](LINGUA-6-CONTRACTS.md) says.

**The idea.** Saving is not scheduling. Words met and looked up wait in an inbox until the learner decides; decks
are easy to shape; making a deck from a book, a song or a list always shows a preview first.

- **The inbox** (Thesaurus › My decks, a first row "Inbox · 23"; "Your words" in the dictionary becomes its full
  view): each word with its sentence and source; Add to a deck (with meaning and sentence filled), Mark known,
  Ignore; select many with checkboxes for bulk add, tag, move or delete.
- **Decks:** nested folders, tags, a description, a cover picture, cards reordered by drag, cards sorted by alphabet,
  date added, difficulty (FSRS), frequency, due date, part of speech or theme; merge, duplicate and split decks;
  archive (not "mastered": it keeps the history); mark important and pin.
- **Tidy** (a panel in a deck's settings): duplicate cards and duplicate translations found, missing sentences and
  sounds suggested from the dictionary, one click each.
- **Decks from things**, all with a preview where words can be unticked: a text, a book or a chapter (its unknown
  words above a chosen frequency), a podcast or video transcript, a song, a pasted list (meanings from the
  dictionary), a conversation (6-11), a topic, a situation or a goal (Max, 6-6; without Max, the dictionary's
  themes).

**Data:** `Deck.description`, `coverBlobId`, `archived`; `Note.order`; `Folder.parentId`; `Word.inbox`
('new' · 'kept' · 'ignored'). Export of decks is 6-24's exporter. **Done when:** a chapter becomes a 20-word deck
through its preview in under a minute; bulk actions undo. **Entries (15 new · 25 to finish):** F0044–F0058, F0065–F0068, F0070, F0073–F0074, F0076–F0086, F0361, F0801, F0815, F1239, F1481, F1487, F1580

#### 6-3 · Cards and memory

**Contract (6-0):** [word.ts](../src/core/contracts/word.ts) (`CardTemplate`, `CardV6`, `ReviewLogV6`) and [db.ts](../src/core/contracts/db.ts) (Dexie 20). Build against it; change it only as [LINGUA-6-CONTRACTS.md](LINGUA-6-CONTRACTS.md) says.

**The idea.** More kinds of cards, gentler hints, and the memory shown honestly. `core/srs` already runs ts-fsrs.

- **Card templates per deck:** fronts and backs from word, meaning, definition in the language, picture, sound,
  sentence with a gap, a short paragraph; and new kinds: grammar facts (gender, plural, aspect), synonym, antonym or
  collocation (6-1), several meanings on one card, related words on one card, image occlusion (boxes drawn over a
  picture), sound only.
- **Pictures** from a file, the clipboard or a search of open pictures (Wikimedia Commons, Openverse) with the
  licence kept; always the learner's choice, never automatic.
- **Hints:** the first letter, then more letters; a hinted answer is logged as assisted (6-5). An "I guessed"
  button after a right answer counts as Hard and marks the guess. A mnemonic field on every card (Max can suggest).
- **Memory controls:** custom learning steps; leech detection (many lapses: suggest rewriting, a picture or
  suspending); a Difficult set for extra practice; reschedule or forget a card; bury the sibling direction until
  tomorrow; no near-identical cards in a row; frequently forgotten cards first among equals; after a long absence a
  catch-up plan that spreads the overdue cards over days instead of a wall.
- **The memory, honestly:** a due calendar (a month of due counts), today's estimated time (from time per card), and
  on a card's page its stability and how likely it is remembered today ("about 92 %", ts-fsrs' retrievability) in
  plain words, recognition and recall side by side (the two directions), and its contexts rotated through the
  word's sentences.

**Data:** `Card.buriedUntil`, `leech`; `ReviewLog.hinted`, `guessed`, `contextId`; `Note.mnemonic`, `template`.
**Done when:** a deck with picture fronts and synonym cards studies; leeches are found in a test deck; the catch-up
plan spreads 300 overdue cards over a week. **Entries (21 new · 11 to finish):** F0005–F0009, F0014–F0017, F0021–F0022, F0025–F0026, F0028–F0030, F0092, F0095–F0097, F0099–F0101, F0103, F0109–F0112, F0114–F0115, F0117–F0118

#### 6-4 · One exercise engine

**Contract (6-0):** [exercise.ts](../src/core/contracts/exercise.ts) (no table, Dexie 21 unused). Build against it; change it only as [LINGUA-6-CONTRACTS.md](LINGUA-6-CONTRACTS.md) says.

**The idea.** Ludus (`features/thesaurus/study/exercises.tsx`), Grammatica's lessons, the course, Check yourself and
alphabet lessons each have their own exercises today. One engine in `core/exercise`: an exercise kind is plain data
(prompt, answer check, hints, feedback, what it trains) drawn by shared components, so a new kind works in every room
at once and every answer reaches the learner's record (6-5).

- **New kinds:** drag and drop; matching variants (word and definition, picture, sentence, sound; synonyms and
  antonyms; affixes and meanings; words and parts of speech); correct the mistake; rewrite a wrong sentence;
  transformations (singular to plural, present to past, active to passive, direct to reported speech, statement to
  question) from Grammatica's data; combine, expand or simplify sentences; predict the next form; complete a dialogue.
- **Ways to answer:** hints revealed by a tap and growing step by step; an optional confidence rating; a
  self-assessment for free answers ("Was yours as good?"); delayed feedback (all answers at the end, exam-like);
  retry with a different example.
- **Checking answers:** accents and case tolerated where the language allows; a near miss explained ("right word,
  wrong ending"); free answers judged by meaning with Max and labelled; without Max, the model answer and a self-rating.
- The existing kinds move into the engine **without changing what learners see** (snapshot tests first).

**Done when:** one new kind (transformations) appears in Ludus, Grammatica and the course with no room-specific
code. **Entries (25 new · 3 to finish):** F0033, F0035–F0040, F0241, F0243–F0251, F0254, F0257–F0258, F0925, F0936–F0938, F0941–F0942, F0944, F0947

#### 6-5 · The learner's record

**Contract (6-0):** [learner.ts](../src/core/contracts/learner.ts) and [db.ts](../src/core/contracts/db.ts) (`evidence`, `evidenceDays`, Dexie 22). Build against it; change it only as [LINGUA-6-CONTRACTS.md](LINGUA-6-CONTRACTS.md) says.

**The idea.** Lingua already logs reviews, sessions, journal corrections and grammar items. One record joins them
into evidence: what was answered with and without help, which mistakes recur (in one set of categories across
Diarium, conversation transcripts, Grammatica, Ludus and dictation), which words are recognised but not recalled,
which skills are quiet. It is what the tutor remembers (6-15), what adapts (6-16), what Ratio shows (6-17) and
what exams estimate from (6-18).

- **Categories:** Diarium's (grammar, spelling, word choice, word order, agreement, tense and aspect, case,
  punctuation, style) plus pronunciation and mishearing. A mistake seen on three different days or in three places
  is **persistent**; once is a slip.
- **Your error log** (Mentis › Notebook, 6-20): the persistent ones, each with its examples and a "Practise this".
- **Private:** on the device only, in backups and sync, deleted with the language; exportable (6-24).

**Data:** an append-only `evidence` table (at, lang, skill, item, outcome, assisted, category), with small derived
summaries cached per day. **Done when:** a learner's weak spots are the same in Grammatica, Ratio and the tutor.
**Entries (9 new · 2 to finish):** F0113, F0281, F0664, F0974, F0996, F1009, F1127, F1457–F1460

#### 6-6 · Generated materials, checked

**Contract (6-0):** [db.ts](../src/core/contracts/db.ts) (`generated`, `GeneratedRow`, Dexie 23). Build against it; change it only as [LINGUA-6-CONTRACTS.md](LINGUA-6-CONTRACTS.md) says.

**The idea.** Max already writes prompts, checks entries and explains. One generator service (`services/llm`
extended) makes everything the catalogue wants made, and **checks it before it is shown**, because "language
learners can easily internalize a confident but incorrect explanation" (the catalogue's own warning).

- **Makes:** stories and passages at a level, dialogues and listening scripts (with two voices: Gemini or Piper),
  quizzes, grammar drills, translation and dictation exercises, parallel and simplified texts, flashcards, word
  lists, example sentences, variations of a grammar pattern, and exercises from a document, notes, a transcript or
  the learner's mistakes.
- **Checks:** a strict JSON schema; every word looked up in the offline dictionary (unknown words flagged); the
  level measured (share of words beyond the level by frequency) and regenerated when off; a short second check of
  grammar where cheap; a quiet "Generated" label and Report on everything made; cached so nothing is paid for twice;
  the cost said before a long job.
- **Without Max:** the hand-made or dictionary-made version where one exists; otherwise "This comes with Lingua+ Max",
  as today.

**Done when:** a generated A2 story in French passes the checks, shows its label, and is served from the cache the
second time. **Entries (19 new · 3 to finish):** F0278, F0438, F1013–F1018, F1020–F1024, F1027–F1028, F1031–F1036, F1609

### Part B · The skills

#### 6-7 · Grammar (Cursus › Grammatica, after 5.2-8's guided path)

- **More ways in:** browse by part of speech and by category besides level; search in plain words ("when do I use
  the subjunctive?", 6-15); prerequisites ("Before this: …") and a topic map (a graph of topics, the learned ones
  filled), drawn in the handbook's fine line.
- **Richer pages:** a deeper "More on this", formal and informal pairs, right and wrong pairs, exceptions, regional
  notes, agreement and pronoun tables for the core six, cross-references; pictures that explain: tense timelines,
  word-order slots, decision trees ("which past?"), sentence diagrams, endings coloured on the stem.
- **In the language, or both:** each explanation can be read in the language being learned, or side by side with the
  learner's own (the translation language).
- **The sentence explainer:** select any sentence (reader, lyrics, subtitles, a lesson): every word's role,
  dictionary form, ending and function; clauses bracketed; dependencies drawn as arcs; more than one reading shown
  when it is ambiguous. Forms come from the dictionary on the device; roles and dependencies from Max.
- **Personal:** bookmarks and notes on topics (to the notebook); a heatmap of the topics that cause mistakes (6-5).
- Content for the six core languages; tier 2's short grammars get tables where the data exists.
**Entries (19 new · 12 to finish):** F0195–F0196, F0199, F0203–F0204, F0206–F0207, F0211–F0212, F0214–F0221, F0224–F0227, F0255, F0264, F0267, F0273–F0277, F0279, F0333

#### 6-8 · Reading (Codex)

- **More to read, by kind:** a Graded shelf (texts by measured level, and stories Max writes at your level,
  labelled); shelves from open sources: short stories, fables, fairy tales, myths, poems, essays, speeches and
  historical documents (Wikisource), travel guides (Wikivoyage in the language), recipes (Wikibooks), picture books
  under open licences (StoryWeaver and the like, in-app where the licence allows); dialogues, everyday messages,
  emails and posts (generated and labelled, or Tatoeba's dialogues); parallel texts in two columns; simplified
  versions beside the original (Max). Filters by topic, length, level, kind and known-word share.
- **In the reader:** read the page aloud (Piper or Gemini, following the sentence); colour by part of speech; endings
  marked; an interlinear mode (a gloss under every word); a sentence's literal and natural translation (Max); hide the
  translations, then reveal sentence by sentence; a reading ruler; bookmarks, highlights in colours, margin notes,
  quotes kept with their source, cards from a highlighted passage; export of highlights (6-24).
- **Comprehension, more kinds** (6-4 and 6-6): the main idea, true or false, short answers (Max), a title, events in
  order, a character's motive, meaning from context, what happens next, tone, irony, audience, fact or opinion, a
  metaphor, cultural references, a missing paragraph, headings to paragraphs, the sentence that doesn't belong, the
  original against the simplified; at the end of a text and of a chapter.
- **A book as a project:** words collected chapter by chapter; unknown-word density shown on the contents; a glossary
  of characters and places gathered while reading (names the learner confirms); discussion questions per chapter
  (Max); annotations; a shelf of favourite passages.
**Entries (41 new · 31 to finish):** F0284–F0285, F0287–F0292, F0294–F0296, F0298–F0310, F0319–F0323, F0327, F0336, F0338, F0345–F0346, F0354–F0360, F0366–F0369, F0371, F0373–F0384, F0386–F0388, F0393–F0395, F0399–F0400, F0402, F0404, F0407, F1124–F1125, F1602

#### 6-9 · Listening (Sonus et Visio)

- **The player:** repeat the current sentence (R); loop a selection or between two points (A–B); sentence by
  sentence (a pause after each line, as Visio's auto-pause, for audio with a transcript); a line's translation only
  after it has played; pitch kept or changed with speed; speakers labelled in transcripts (with Max; Whisper alone
  can't tell speakers apart); timestamps and bookmarks for hard parts, replayed by themselves; lines where dictation
  went wrong marked; playlists, yours and by level; a second viewing with less help (the second line hidden, then
  the first).
- **More to hear:** slow and natural versions; accents (Lingua Libre's speakers by region, regional radio); speeches
  and lectures (YouTube, 5.2-4); phone calls, announcements, noise and voices of different ages and moods (generated
  scripts with voices, labelled); an episode made from your own saved words (6-6 and a voice).
- **Exercises** (6-4), from real lines first (the learner's podcasts, songs and films), then generated ones: hear and
  choose the meaning or the picture, rebuild the sentence, order the words, the missing words in a real line,
  dictation of real lines (with punctuation, or the endings only), keywords, the main idea, who, where and how they
  feel, the next phrase, a change of topic, without and then with subtitles, your guess against the transcript,
  formal or informal, which accent.
- **Training the ear:** word boundaries and connected speech from real clips; speed that steps up while accuracy
  holds (from 0.8×); speech in noise; overlapping speakers; one sentence from several speakers (Tatoeba's audio);
  slow and natural side by side.
**Entries (49 new · 18 to finish):** F0259, F0412–F0416, F0421–F0423, F0426–F0432, F0434–F0435, F0439–F0440, F0443–F0445, F0448–F0449, F0454, F0457–F0461, F0463–F0465, F0467–F0470, F0472–F0477, F0479, F0481–F0486, F0488–F0490, F0494–F0495, F0500–F0503, F0505–F0507, F0816, F0818, F1579, F1600

#### 6-10 · Sounds and pronunciation (a new tab: Cursus › Sounds, beside Alphabets)

- **The sound system** of each core language: its sounds as vowel and consonant charts (IPA, drawn in the handbook's
  line), each sound with recordings (Wikimedia Commons' IPA recordings, public domain) and real words; mouth and
  tongue drawings by hand, with voicing and place explained; syllables and stress rules; intonation and rhythm;
  connected speech where the language has it (reduction, assimilation, elision, gemination, palatalization,
  aspiration, nasal vowels); tones (Mandarin) and pitch accent (Japanese); spelling-to-sound rules and the reverse.
- **Practice:** listen and repeat; record and compare (yours beside the model, with the waveform and a pitch line);
  shadowing (the model plays, you speak over it, both recorded); minimal pairs, heard and said; drills for single
  sounds, clusters, stress, intonation and tones; read a word, a sentence or a paragraph aloud; the same passage every
  week, played back over time (a pronunciation diary).
- **Feedback, honestly:** understandable first, never "lose your accent" (the catalogue's own note): did speech
  recognition on the device (Whisper) get your words; stress and pitch drawn from the recording (local pitch
  tracking); sound-level hints only where they are reliable, labelled as hints; with Max, Gemini can listen and
  comment.
- **In the course:** a "Sounds" first unit for each core language, and pronunciation lessons in later units (6-14).
- Recordings stay on the device, sizes shown, deletable.
**Entries (82 new · 7 to finish):** F0480, F0492–F0493, F0496–F0499, F0510, F0561, F0580, F0586–F0601, F0604–F0606, F0700–F0730, F0733–F0750, F0894, F0933, F0977, F1191, F1309, F1339, F1344, F1351, F1372, F1601, F1618

#### 6-11 · Speaking (Mentis › Sermo, after 5.2-6)

- **In the prompts Sermo writes:** the four modes (free, scenario, tutor, immersion); styles (interruptions and
  follow-up questions, an AI that doesn't always understand, little help, only words you know (a capped list from
  the word memory), new expressions one at a time, branching, several characters, a group); more scenes
  (negotiating, asking for clarification, a pronunciation focus).
- **"How did it go?"** The conversation happens in the learner's AI app since 5.2-6, so Lingua takes it back:
  paste or drop the chat (or a recording) into Sermo, and get the corrected transcript, corrections (essential apart
  from style), more natural and idiomatic alternatives, words to learn, register and politeness, and from a recording
  fluency notes (speaking time, length of answers, pauses, fillers, repeated words, self-corrections, words that were
  hard to find, speech rate) from Whisper's timings on the device; reviewed sentence by sentence; a summary of new
  expressions; mistakes and expressions to cards through a preview; the transcript kept in Diarium.
- **Speaking alone:** 30-second prompts, one-minute talks, storytelling, describing a picture, explaining something,
  a quick debate, challenges made from your week; recorded, written out, reviewed the same way.
- No live voice conversation inside Lingua: the user said no (Q3, 2026-10-26). Feedback comes from the pasted conversation.
**Entries (46 new · 5 to finish):** F0260, F0487, F0520, F0536, F0540, F0548–F0560, F0562–F0576, F0578–F0579, F0581–F0584, F0602–F0603, F0607–F0613, F0975, F0978, F1126

#### 6-12 · Writing (Mentis › Diarium, after 5.2-5)

- **Writing tasks** beside the free entry, each with a short brief and a length: describe a picture, a story (begun or
  continued, with your new words), a dialogue, an email, a formal letter, an informal message, a review, an opinion,
  a persuasive piece, for and against, a travel journal, a biography, an imagined conversation, how something works,
  a memory, a post, a work message, a complaint, an apology, an invitation, a reply to today's news, a rewrite with a
  grammar structure, a text rebuilt from notes.
- **The assistant (Max):** register and formality, simpler or a level higher, several phrasings, more idiomatic and
  more precise words, why a correct sentence still sounds unnatural, literal translations from your own language
  spotted; your voice kept (suggestions, not rewrites, by default); a rubric per task. Measured on the device:
  vocabulary range, sentence length and complexity. A portfolio of your best pieces per level, compared over time,
  by topic and kind.
- **While writing:** a spellchecker in the language (open Hunspell dictionaries), words looked up on hover, the
  dictionary's forms in a side panel (conjugation and declension help), synonyms and collocations of the selected
  word (6-1), a phrase bank (openers, linking words, by function; hand-made for the core six), templates, a timer,
  drafts compared side by side.
**Entries (48 new · 7 to finish):** F0165, F0280, F0617, F0620, F0622–F0628, F0630–F0635, F0637–F0647, F0654–F0658, F0662–F0663, F0665–F0667, F0669, F0672–F0673, F0675–F0682, F0684, F0687, F0689, F0695–F0696, F0834

#### 6-13 · Translating and comparing languages (Ludus › Translate, and contrast notes)

- **Translation practice:** sentences, paragraphs, dialogues; with or without hints; literal and natural; several
  right answers accepted (judged by meaning with Max; without it, against Tatoeba's references); alternatives
  compared; with a required word or a grammar construction; idioms, slang, formal and literary texts, registers; a
  word-by-word alignment view; why the direct translation fails; back-translation; translate, then rebuild the
  original; timed rounds; your own texts.
- **Comparing languages, with the ones the learner speaks** (Tabula): word order, gender, cases, tense and aspect,
  prepositions, articles, pronouns, politeness and address, idioms, cognates and false friends, shared roots, word
  formation, sounds of similar words, meanings that drift, cultural associations. Hand-made tables for pairs among
  English and the six core languages first, then generated and labelled for others; your own notes on a pair (6-20).
- Comparing published translations of one passage; false friends between the Romance languages.
**Entries (45 new · 2 to finish):** F0268–F0272, F0389, F0405, F0754–F0756, F0758–F0772, F0774–F0794, F1341

### Part C · Paths and guidance

#### 6-14 · Courses and lessons (Cursus › Course)

- **Further:** units for B2 (then C1) in the six core languages.
- **New lessons:** listening, reading (a short text with tasks), pronunciation (6-10), translation (6-13), culture,
  spaced review, micro (two minutes) and long (twenty-five); tracks for survival, travel and work; lessons built on
  a story that runs through the units, on a dialogue, on one authentic text or one conversation, by discovery (find
  the rule from examples), from your interests (Max).
- **Structure:** a placement at the start (6-18); paths by skill and by goal (travel, work, study) that branch from
  the same units; optional lessons; any order within a unit; bookmarks and history; a recap of words and grammar at
  each unit's end.
- **Your own course:** build one from decks, texts and topics; from a textbook's contents or a syllabus (imported,
  matched to Lingua's topics and decks with Max); around a goal; or generated on a topic (labelled).
**Entries (29 new · 10 to finish):** F0864–F0865, F0868, F0870, F0872–F0873, F0875–F0876, F0878–F0884, F0886–F0888, F0890–F0891, F0898–F0899, F0901, F0903, F0906–F0907, F0911–F0914, F0916, F0918–F0921, F0952–F0953, F1030, F1374

#### 6-15 · The tutor, in context (everywhere, with Max)

- **Not a chat room.** 5.2-6 takes the chat out of Lingua, and the blueprint agrees: "the tutor is contextual, not a
  disconnected chatbot". An **Ask** button where learning happens (the word drawer, a sentence, a grammar topic, a
  lesson's question, a correction, a card) that knows what is on screen and, if the learner allows, their level,
  known words, studied topics, recurring mistakes and interests (6-5).
- **What it does:** explain simply (grammar, nuance, idioms, slang, pronunciation, regional differences, cultural
  references), compare similar words, give more examples, an easier or harder version, a hint that doesn't give it
  away, why an answer was wrong, an analogy; in your language or in the one you're learning; turn a question into a
  short lesson kept in the notebook.
- **How it explains** (Settings, one group): short or thorough, examples first, how hard, how long the sentences,
  how much of the language, how often to correct, how much translation, how fast it speaks. Presets: teacher, editor,
  coach. Encouraging, never gushing (the handbook's voice).
**Entries (28 new · 10 to finish):** F0222–F0223, F0955–F0958, F0960–F0968, F0970–F0971, F0979, F0981–F0985, F0989–F0992, F0994–F0995, F0998–F1005, F1012

#### 6-16 · Personal and adaptive (Home, Mundus, Ludus)

- **On the learner's record (6-5):** exercises chosen by accuracy; lessons as long as the time there is; texts and
  media where 90–98 % of the words are known; listening speed that adapts; pronunciation drills from your mistakes;
  examples about what you enjoy, in words you know; explanations aware of your languages (false friends from
  Tabula); revision lessons and a small homework at the end of a lesson.
- **Today's plan** on Home: a few minutes each of what helps most, every step skippable.
- **Plans:** around a trip, a book or an exam (dates to a weekly plan); a catch-up after a break; an immersion plan;
  goal suggestions; another way when progress stalls (more listening when recall is stuck, and so on).
- **Every suggestion says why, and can be dismissed or overridden** (Mundus's steps, interactive since 5.2-7).
**Entries (27 new · 11 to finish):** F0263, F0282–F0283, F0403, F0504, F0577, F0670, F0838, F0908, F0948, F0954, F0969, F0972, F0980, F1006, F1008, F1010–F1011, F1037, F1172, F1441–F1442, F1444–F1447, F1449–F1451, F1453, F1456, F1462–F1464, F1469–F1470, F1603, F1610

#### 6-17 · Goals, habits and progress (Ratio and Home, after 5.2-9)

- **Goals of every kind** (5.2-9 puts a basic goal in Tabula): words, lessons, books, conversations, writing,
  listening hours, by a date; weekly targets that bend, with rest days; streaks optional (a setting) with a missed
  day made up the next; no guilt.
- **Reminders** as desktop notifications at chosen times, with quiet hours; off by default (Q5); a calendar file
  (6-24).
- **Looking back:** a weekly review of goals with a reflection prompt, a monthly report (printable), moments worth
  keeping (marked from anywhere; Iter's timeline went in 5.2-9, so a small list in Ratio), real-life goals ("order
  in a café") and encounters, restart and habit plans.
- **Stamps, not points:** real milestones (the first book, 1,000 words) as stamps in the handbook's style; rewards the
  learner sets for themselves.
- **The analytics the catalogue's section 14 asks for:** activity by skill, what was remembered after a day or more,
  answers with and without help, the review workload, comprehension, writing and speaking portfolios, mistakes by
  category over time, progress toward the target level, listening by accent and by speed; each chart with its
  definition and what it doesn't say.
**Entries (24 new · 12 to finish):** F0508–F0509, F0837, F0840, F0922, F1128, F1144–F1151, F1153, F1155, F1157–F1167, F1170–F1171, F1173–F1174, F1177–F1178, F1510, F1525, F1608

#### 6-18 · Exams and levels (a new tab: Cursus › Exams)

- **Where you are:** placement by skill (reading, listening, grammar; vocabulary size by sampling frequency bands;
  writing and speaking with Max), as a level estimate per skill, "an estimate, not a certificate", in ranges
  ("likely B1, perhaps B2"), never a single score.
- **Exam preparation** for the exams of Lingua's languages: DELE (Spanish), DELF and DALF (French), Goethe and TestDaF
  (German), TORFL (Russian), HSK (Mandarin), and for tier 2 IELTS, TOEFL and Cambridge (English), JLPT (Japanese),
  TOPIK (Korean): the format explained, timed mock exams in its task types (made by 6-6 from Lingua's materials),
  writing and speaking rubrics (the official descriptors paraphrased), exam word decks, an oral exam in Sermo (an
  examiner scene), a countdown and a plan by the exam date, a weakness report, the history of mocks, a printable
  revision plan. Past papers: links to the official free samples only.
**Entries (38 new · 1 to finish):** F0069, F0614, F0877, F0986, F1007, F1029, F1154, F1375–F1377, F1379–F1406, F1617

### Part D · More of the language

#### 6-19 · Immersion and culture (Mundus, the word drawer, Codex, Settings)

- **Culture notes** on words and set phrases, and a Culture shelf in Mundus: idioms explained, proverbs, regional
  slang, humour and wordplay, politeness and etiquette, greetings and address, body language, conversational habits,
  holidays and food, history behind expressions, dialect samples (with Lingua Libre's regional recordings),
  intercultural scenes and misunderstandings; words that don't translate. Hand-made with sources for the six core
  languages; "Explain this reference" with Max anywhere.
- **Lingua in the language** (Settings › Look and feel): the app's own words in the language being learned, for the
  six core languages, with the English on hover; translated once and checked. It needs every interface string in one
  place first, so it is the biggest piece of this step. The user said yes to it (Q4, 2026-10-26).
- **Every day:** describe your surroundings, narrate your day, a shopping list in the language, signs and menus read
  from a photo (Codex's OCR), playlists of media by level, short videos and live streams through YouTube (5.2-4).
**Entries (23 new · 7 to finish):** F0158, F0406, F0773, F0807, F0811, F0813, F0819, F0821, F0826–F0827, F0829, F0832, F0841–F0847, F0849–F0852, F0856–F0862

#### 6-20 · Phrasebook, notebook and the word map

- **Thesaurus › Phrases:** phrases and sentence templates saved from anywhere (a drag in the reader, a line of a song,
  a subtitle, Sermo), by situation and topic; formal and informal versions, replies, openers, linking words, debate
  phrases, idioms, polite requests, emergencies, travel; sound, translation and notes; search; practised by recall,
  cards on request; new phrases from templates; a phrasebook for a trip; offline; exported (6-24).
- **Mentis › Notebook** (beside Diarium): notes in Markdown (grammar, words, confusing expressions, from reading,
  conversations and media), linked to words, topics, lessons and texts; folders, tags, search across every note; the
  error log (6-5); a summary of your notes and exercises made from one (Max).
- **Thesaurus › Map:** your words as a map, joined by meaning, form and use (synonyms, antonyms, cognates, families,
  roots, collocations, themes, grammar, idioms, shared sentences, the texts and mistakes where they appear, other
  languages); pan and zoom on a desktop canvas in the handbook's line; filters; the lonely words; related words to
  discover; a map around one idea.
**Entries (55 new · 10 to finish):** F0146–F0147, F0159, F0683, F0691, F0795, F0835, F1076–F1095, F1097–F1118, F1120–F1123, F1130–F1137, F1140–F1141, F1595, F1607

#### 6-21 · Games and projects (Ludus)

- **Word games on your own words:** crossword, word search, hangman, anagrams, missing letters, word ladders, find the
  words in a text, guess the definition or the picture, association, synonym and antonym races, sorting by category,
  odd one out, building from parts, memory, bingo, clues one by one, a daily puzzle (the same for everyone learning
  the language, made from the date), a weekly theme, beating your best, timed translation, dictation races.
- **Story games (Max):** mysteries, text adventures, choose-your-own stories, quests, an escape room, a detective
  case, a journey, a city to explore, survival challenges, conversation quests, finishing a story or a dialogue,
  your own game, games from your words.
- **Projects** (the catalogue's section 17): small chains across rooms, each step opening its room: read a story,
  talk about it, write your opinion; listen and sum it up aloud; watch and explain the argument; recreate a dialogue
  and play both parts; translate and compare; record and write it out; read aloud what you wrote; a presentation
  from a text; a podcast into a deck; a week around one topic; a short story with your new words; your own podcast.
- Games never move a card's schedule unless they are reviews (as Lightning).
**Entries (66 new · 3 to finish):** F0168–F0173, F0175–F0177, F0179–F0184, F0186–F0190, F0313–F0314, F0885, F1185, F1190, F1192–F1201, F1203–F1216, F1220–F1225, F1228–F1232, F1234–F1235, F1237–F1238, F1240–F1244

#### 6-22 · Dictionary tools (Thesaurus › Dictionary)

- **Search:** by definition (a reverse dictionary: describe it, get the word), with typos, rhymes, similar sounds (by
  IPA), prefix or suffix, by part of speech; and **one search across Lingua** (Ctrl K): texts, notes, cards, phrases,
  topics.
- **Your dictionary:** favourites and bookmarks; your own entries; several dictionaries for one language (the pack,
  the language's own Wiktionary, one you import) compared side by side; report a wrong entry (fixed for you at once,
  and listed for the next pack build).
**Entries (15 new · 2 to finish):** F1247–F1249, F1275–F1280, F1282–F1283, F1285, F1287–F1290, F1482

#### 6-23 · Tools for each language

- **Scripts:** stroke order (Make Me a Hanzi and KanjiVG, open data), components and radicals, transliteration on or
  off and fading as you learn (pinyin, romaji, Arabic and Cyrillic romanisation), script conversion (Serbian Cyrillic
  and Latin; Traditional and Simplified through OpenCC), accents and diacritics drills, ligatures, Russian cursive, a
  character reference.
- **Russian:** the soft and hard signs, unstressed vowels, stress shown, aspect pairs, verbs of motion and their
  prefixes, numerals, participles, reflexive verbs, word order and sentence stress.
- **Romance languages:** clitic pronouns, where the accent goes, regional words (Spain and Latin America, France and
  Québec), dialects compared, European and Brazilian Portuguese, verbs and their prepositions.
- **East Asian:** kanji readings, hanja, honorifics and politeness levels, classifiers and measure words, particles,
  reading aids removed gradually, Traditional and Simplified, kana to kanji, handwriting matched against the strokes.
- **Arabic:** short vowels faded progressively, diacritics, a root explorer (words by root and pattern, from the
  dictionary), Modern Standard and dialect labelled with samples, registers, transliteration controls.
**Entries (32 new · 19 to finish):** F1294–F1295, F1298–F1306, F1308, F1310–F1311, F1314–F1317, F1321–F1325, F1331, F1334–F1335, F1337–F1338, F1340, F1343, F1345–F1350, F1352–F1356, F1359–F1362, F1365–F1369, F1371

### Part E · Around the app

#### 6-24 · Import, export and integrations

- **One exporter** (`services/export`) used by every room. **Out:** words to CSV, decks to Anki (`.apkg` with media)
  and CSV, notes and entries to Markdown, text or PDF, statistics (CSV), highlights, conversation transcripts, the
  phrasebook, progress reports (a printable page), a bilingual reading journal; a calendar file (`.ics`) for plans
  and exam dates; Markdown that Obsidian and Notion import.
- **In:** Quizlet's text export, Markdown, transcripts with timings, grammar notes, any web page's text through the
  Lingua extension (5.2-4's extension gains "Send to Codex"), Kindle's `My Clippings.txt` and vocabulary lookups.
**Entries (15 new · 7 to finish):** F0059, F0408, F0692, F1138, F1473, F1475, F1480, F1483, F1486, F1490–F1498, F1509, F1511–F1512, F1615

#### 6-25 · Accessibility and the desktop (with Lingua 7's check)

- A high-contrast pair of palettes (7 : 1 text); colour never alone (shapes and patterns beside the colours of word
  states, card states and charts); a dyslexia-friendly reading choice (Lexend or OpenDyslexic, with letter and word
  spacing) besides Atkinson Hyperlegible; a screen-reader pass (labels, live regions, headings; Narrator, NVDA and
  macOS VoiceOver); a keyboard-only pass over every room.
- One privacy page: what is sent where (AI, translation, look-ups, recordings). Storage by kind (packs, voices,
  audio, video, recordings) with delete. Transcription paused when the app is hidden. Clear errors everywhere (with
  Lingua 7-10). Undo after every destructive action.
- **On the desktop instead of a phone widget:** a word of the day on Home and as an optional notification, and a
  small review window that floats over other apps (Document Picture-in-Picture in Chrome and Edge).
**Entries (3 new · 10 to finish):** F1523–F1524, F1531, F1533–F1534, F1536, F1539, F1541, F1544, F1546–F1547, F1549–F1550

### Part F · Further out (each only with the user's word)

#### 6-26 · Experiments

Each is proposed to the user in a few lines before it is built, and starts in Settings › Lab. Ideas: interactive
novels and audio dramas (6-6 and voices); characters who remember (would need a chat, which the user declined: Q3); generated roleplay worlds,
shops, cafés and stations to walk through; a tutor that follows your word map; meaning maps across languages; a map
of grammar; a morphology explorer; books and your own writing analysed (vocabulary profile, difficulty curve, your
corpus); authors compared; language across periods and how words evolved (etymology chains); dialect maps; a
pronunciation lab (waveform and spectrogram); AI pronunciation coaching; hints while you talk; speech-driven
adventures; the webcam reading signs and labelling objects; phrases suggested by context; one journal in several
languages; word families across languages; **a personal textbook** (a printable book of your words and texts);
audiobooks at your level; subtitles that show only the words you don't know; a research dashboard and experiments
comparing ways to remember; plans to keep a language up; heritage-language paths; what transfers between your
languages; a multilingual word map; a game of real or synthetic voices.
**Entries (38 new · 2 to finish):** F0398, F0491, F1269, F1467–F1468, F1551–F1578, F1581–F1585, F1587–F1588

#### 6-27 · Together, and beyond the desk

**What is here:** community (profiles, following, forums, groups, partners, exchanges, peer correction, leaderboards,
shared goals, tournaments, community decks, courses and reading lists), apps for iPhone and Android, widgets,
TalkBack, a phone's share sheet, and cloud sync with accounts.

**Why it waits for the user:** Lingua is private and local, with no accounts and only a tiny licence server (D1);
the phone isn't designed for (D6, D7); anything public needs moderation, reporting, blocking and safety for younger
learners (the catalogue's own F1437–F1439), which is ongoing work and, in the EU, a legal duty for platforms.

**What Lingua can do without a server** (each small, proposed as the default): share a deck, a reading list, a plan
or a course as a file or a link that carries its data, imported by the other person; "Ask a speaker" already copies
a text for someone; two people's devices paired for shared decks only (as device sync does); a progress card as a
picture (Tabula's image card). **With a server:** accounts and a database (Supabase, as FEATURES once noted),
moderation tools, terms and a privacy policy, and a running cost. The PWA keeps working on phones as it does (D7).
**Entries (9 to finish · 47 to decide):** F0060–F0064, F0192, F0318, F0917, F1179–F1181, F1217–F1219, F1407–F1408, F1410–F1439, F1500, F1504, F1515–F1516, F1522, F1540, F1612–F1614, F1616

### Part G

#### 6-28 · Lingua 6 complete: the check

Every step's entries ticked in LINGUA-6-FEATURES.md (or moved, with the reason, to 6-26 or 6-27); the handbook's
review sheet for every new screen; typecheck, tests and the build; 1280, 1440 and 1366×768, light and dark, two
palettes each; the six core languages and one tier 2 language through each new feature; `node scripts/version.ts
--release`: version 0.6.0.

---

## 4. The methods (the catalogue's section 26)

Methods aren't features: this is where Lingua already teaches with each, and what Lingua 6 adds.

| Method | In Lingua today | Lingua 6 |
| --- | --- | --- |
| Spaced repetition | FSRS for cards and grammar items | 6-3: the memory shown honestly, catch-up plans |
| Active recall | Production cards, typing, Ludus | 6-3: hints that are logged |
| Interleaving | Grammatica brings items from other topics; Ludus mixes kinds | 6-4: kinds from every skill mixed |
| Retrieval practice | Reviews, Lightning | 6-21: games on your words |
| Comprehensible input | Level guesses, known-word share | 6-16: texts at 90–98 % known |
| Extensive reading | Codex, Discover, shelves | 6-8: graded shelves by kind |
| Intensive reading | The word panel, S, Check yourself | 6-7: the sentence explainer; 6-8: comprehension |
| Extensive listening | Podcasts, audiobooks, radio | 6-9: playlists by level |
| Intensive listening | Transcripts, line replay | 6-9: loops, dictation of real lines |
| Shadowing | — | 6-10 |
| Dictation | Ludus dictation where a natural voice speaks | 6-9: dictation of real media |
| Sentence mining | Lines and phrases as cards, Made for you | 6-2: the inbox |
| Translation | Ludus and Grammatica both ways | 6-13 |
| Output practice | Diarium, Sermo, the course's speaking and writing | 6-11, 6-12 |
| Corrective feedback | Diarium's Check, "Your own sentence" | 6-11: conversation feedback; 6-5: mistakes across rooms |
| Task-based learning | Sermo's scenes, the course's writing tasks | 6-12: tasks; 6-21: projects |
| Communicative practice | Sermo | 6-11 |
| Pattern discovery | Grammatica's "examples first" | 6-14: discovery lessons |
| Explicit instruction | Grammatica's rules | 6-7 |
| Minimal-pair training | — | 6-10 |
| Phonetic training | Alphabets (letters and sounds) | 6-10 |
| Interlinear reading | Pinyin and kana over words, glosses on hover | 6-8: the interlinear mode |
| Dual coding | Fine drawings, pictures on Anki cards | 6-3: pictures on any card |
| Mnemonics | — | 6-3: a mnemonic on every card |
| Chunk learning | Set phrases, phrases as cards | 6-20: the phrasebook |
| Incidental learning | Reading, listening and watching with look-ups | — (already the heart of Lingua) |
| Deliberate practice | Weak spots in Grammatica (5.2-8) | 6-5, 6-16 |
| Self-explanation | — | 6-4: "explain why" answers |
| Peer learning | "Ask a speaker" | 6-27 |
| Immersion | Visio, radio, music, Mundus | 6-19 |
| Reflective learning | Ratio, Mundus's note on your week | 6-17: reflection prompts |

---

## 5. What can't be done exactly as the catalogue says

- **Song lyrics** are shown from LRCLIB as now; Lingua doesn't store or pass on licensed lyrics.
- **Past exam papers:** links to the official free samples only.
- **Sound-by-sound scoring** in the browser isn't reliable; Lingua says whether you were understood, draws stress and
  pitch, and labels anything finer as a hint.
- **Telling speakers apart** without a key isn't reliable on the device; with Max only.
- **Exam scores** are ranges with their uncertainty, never a prediction to the point.
- **Quizlet** has no open API (its text export works); books bought for Kindle or Apple Books are DRM-protected
  (highlights come through Kindle's clippings file).
- **Third-party media** stays within each service's terms, as Visio already does; live streams through YouTube only.
- **Pictures for cards** come from open-licence sources with their credit, never scraped from search engines.
- **Community and phone apps:** 6-27.

## 6. The user's answers (2026-10-26)

| # | Question | The user's answer, and what follows |
| --- | --- | --- |
| Q1 | Lingua 6 after Lingua 7, or before? | **"Do Lingua Features first, then Lingua Design."** Lingua 6 is next after Lingua 5's check; Lingua 7 follows. Versions: Lingua 6 is `0.6.x`, Lingua 7 then `0.7.x`: the plans were renamed on 2026-10-27 so the numbers follow the order (VERSIONS.md). |
| Q2 | Sharing and community: files and links only, or a server with accounts? | **"Still to be considered."** Open: nothing in 6-27 is built until the user decides. |
| Q3 | A live voice conversation inside Lingua again? | **No.** Sermo keeps opening the learner's AI app; 6-11's feedback comes from the pasted conversation. |
| Q4 | The interface in the language being learned, for the six core languages? | **Yes**, as the last part of 6-19. |
| Q5 | Streaks optional, stamps instead of points, reminders off by default? | **Yes.** |
| Q6 | Phone apps and widgets: still decided against (D6)? | **"Can be."** Not ruled out any more; still not scheduled. Until the user schedules them, desktop only (D6) holds for everything built. |
