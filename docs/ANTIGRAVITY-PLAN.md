# Lingua with Antigravity (Gemini): two sessions in parallel

Written 2026-10-29 (the user: "make another one for gemini, antigravity, two different sessions running parallel, you will finish part A"; and later: "gemini and antigravity are the same").
Two sessions run at the same time, each with its own steps of [Lingua 6](LINGUA-6-PLAN.md) **Part B** (the skills), beside Codex ([CODEX-PLAN.md](CODEX-PLAN.md): 6-24, 6-25, 6-22)
and Claude (finishes Part A). Antigravity and Gemini are one tool (Google's Antigravity, running Gemini models), so there are **two sessions of it**, called **Antigravity-1** and **Antigravity-2**; use whichever Gemini model it offers. Their steps share no room, so they can run side by side.

| Session | Takes, in this order | Rooms it works in |
|---|---|---|
| **Antigravity-1** | **6-7** Grammar → **6-13** Translating and comparing languages | Cursus › Grammatica; Ludus › Translate; contrast notes (Tabula) |
| **Antigravity-2** | **6-12** Writing → **6-8** Reading | Mentis › Diarium; Codex (the reader) |

Not given to anyone yet, on purpose: 6-9 to 6-11 (Listening, Sounds, Speaking: they share the audio code), 6-19 (its "Lingua in the language" piece touches every file's strings: it will be a solo push, later), Part C, and 6-29 (Opus).

## 1. The rules are CODEX-PLAN.md sections 1 to 3 and 5, with these changes

Read `CLAUDE.md`, then [CODEX-PLAN.md](CODEX-PLAN.md) sections 1, 2, 3 and 5: set-up check, **how to claim and push** (claim first, small slices, commit as sanchour, `git fetch` + rebase, `node scripts/version.ts` after the rebase and **never `--line`**, tag, push, retry on a taken number), when a slice is done, what you may tick, and the end report. They apply to you word for word, with:

- **Your name in the claim** is `Antigravity-1` or `Antigravity-2` (`[~]` and `*claimed by Antigravity-1 2026-MM-DD*`), not Codex. A row claimed by anyone else is theirs: take your next step.
- **Four sessions push to `main` at once** (you, the other of the two, Codex, Claude). Rebase before **every** push; push small; a rejected push means fetch, rebase and redo the version number. Never force-push, never edit another session's claimed row except to tick your own slices.
- **Hot files** that everyone touches: `src/data/db.ts`, `src/data/types.ts`, `src/core/contracts/*`, `src/app/router.tsx`, `src/app/pages.ts`, `src/core/exercise/index.ts`, the docs. Change them by **adding lines only** (a route, an export, a table), never by reordering or reformatting, so a rebase merges cleanly. On a conflict keep both sides.
- **A new table needs its Dexie version first, as its own small push** (section 3 of CODEX-PLAN): step 6-N is **17 + N**: 6-7 is 24, 6-8 is 25, 6-12 is 29, 6-13 is 30 (Codex has 39, 41, 42). Prefer no table.
- **Claude owns these files; do not edit them** (they are the unfinished Part A): `src/features/practice/PracticePage.tsx`, `src/features/exercise/ExerciseSession.tsx` and its views, `src/core/exercise/kinds.ts`, `src/services/llm/generate.ts`, `src/core/generate/generate.ts`, `src/features/thesaurus/deck/NoteEditor.tsx`, the Thesaurus page and deck tree, `src/core/srs/*`. You **use** them: the exercise engine (`core/exercise`: specs are data, shared screens draw them), the generator (`generateMaterial`, with a model injected: tests use a fake one), the learner's record (`src/data/learner.ts`: write a row where a learner answers). If you need a new exercise kind, put its builder in a **new file of your own** (`src/core/exercise/<yourstep>.ts`) and add one export line to `index.ts`. If you need a new generated kind, **do not edit the generator**: write down what you need in your report and build the rest on the existing kinds.
- **Max (the AI) cannot be tried** with a real key in this work, and you must never use one. Every Max feature is built against an injected, faked model in tests and shown to the learner as "needs Max and a key" when there is none (see how Practice's *dialogue* set does it). Say so in the report: *not tried with a real model*.
- **If your tool has a browser,** look at each screen at 1280, 1440 and 1366×768, light and dark, and say that you did. If it has none, say "not looked at". Never claim either way without having done it.

## 2. Antigravity-1

### 6-7 Grammar (plan: `#### 6-7`; take its entries from the Entries line there)

Today: Grammatica (`src/features/grammatica/` and `src/core/grammar/`, topics for the six core languages, the guided path, drills, a ladder). Read what is there first.

- **Slice G1 · more ways in.** Browse by part of speech and by category besides level; search topics in plain words; "Before this: …" prerequisites on each topic; bookmarks and a note on a topic (to the notebook). Pure ranking/search code with tests in `src/core/grammar/`.
- **Slice G2 · richer pages.** Per topic: exceptions, formal/informal pairs, right/wrong pairs, cross-references, and "read it in the language / side by side". Content for the six core languages is hand-made data under the existing grammar data folder: write it carefully and in the language; keep each addition small, and say in the plan row which languages and topics are covered.
- **Slice G3 · pictures that explain.** Tense timelines and word-order slots as small inline SVG components drawn in the handbook's fine line (read the handbook's Part One first); endings coloured on the stem in the tables.
- **Slice G4 · the topic map.** A graph of topics (prerequisites as edges), learned ones filled, with a heatmap of the topics that cause mistakes (read `listWeakSpots` / the evidence API in `src/data/learner.ts`). A plain SVG is enough; **do not** build a general graph engine (6-29 is the word graph and is Opus's).
- **Slice G5 · the sentence explainer.** Select any sentence: every word's dictionary form and ending (from the dictionary on the device) and its role (Max). Roles and arcs come from Max through an injected model, labelled; without Max show forms only.
- **Done when:** G1 to G3 are on screen and tested; G4 and G5 are done or named in the plan row as not done.

### 6-13 Translating and comparing languages (plan: `#### 6-13`)

- **Slice T1 · translation practice.** Sentences first: a Translate set in the exercise engine (a new builder file; the `translate` kind exists, extend with `accepted` answers from Tatoeba pairs if the data is on the device, otherwise `ai`/`self` rules), with hints, literal vs natural, a required word. Mount it as a Practice-like route of your own (`/thesaurus/translate/:set?`, beside `thesaurus/practice`), not in `PracticePage.tsx`.
- **Slice T2 · views.** Word-by-word alignment, back-translation, "translate, then rebuild the original".
- **Slice T3 · comparing languages.** Hand-made contrast tables for pairs among English and the six core languages (word order, gender, cases, articles, politeness, false friends: start with the pairs that matter most and say which exist), shown in a Compare tab; your own notes on a pair.
- **Done when:** T1 and T3 are on screen with data for at least English with each core language; T2 is done or named as not done.

## 3. Antigravity-2

### 6-12 Writing (plan: `#### 6-12`)

Today: Diarium (`src/features/codex/diarium/`, the Mentis room links to it), with Max's corrections. Read it first.

- **Slice W1 · writing tasks.** A list of tasks beside the free entry (letter, email, story, review, opinion and the rest of the plan's list), each with a brief and a length; a data file of tasks; a word counter and a timer.
- **Slice W2 · measured on the device.** Vocabulary range, sentence length and complexity from the text (pure functions in `src/core/journal/` or a new `src/core/writing/`, with tests); a portfolio of best pieces per level over time.
- **Slice W3 · while writing.** The dictionary's forms in a side panel (conjugation and declension of the selected word), synonyms and collocations of it (from the entry), words looked up on hover, a phrase bank of openers and linking words by function (hand-made for the six core languages). A spellchecker: only if an open Hunspell dictionary can be added without a new dependency — otherwise leave it and say so.
- **Slice W4 · Max's feedback.** Register and formality, a level higher, more idiomatic words, literal translations spotted, with a rubric per task; suggestions, not rewrites; through an injected model; labelled; write evidence rows for the corrections (this is also 6-5b's Diarium row: do it here and tick it there).
- **Done when:** W1 to W3 are on screen and tested; W4 is built against a fake model and marked "not tried with a real model".

### 6-8 Reading (plan: `#### 6-8`; this is the biggest: stop at any slice boundary and report)

Today: the reader (`src/features/codex/reader/`, and `library/`, `discover/`). Antigravity-2 also works in `codex/diarium/` for 6-12; no other session edits `src/features/codex/`.

- **Slice R1 · in the reader.** Colour by part of speech, endings marked, an interlinear gloss mode, hide-then-reveal translations, a reading ruler, highlights in colours with margin notes, and a card from a highlighted passage.
- **Slice R2 · the Graded shelf and open sources.** Texts by measured level (reuse the level measure in `core/lang`), filters by topic/length/level/known-word share, and shelves from open licences. **No downloads of whole sources**: use bundled small public-domain texts or the sources' public APIs at the learner's request; ask before adding any data file over 1 MB.
- **Slice R3 · comprehension kinds.** New exercise kinds from the plan's list (main idea, true/false, order of events, title, meaning from context, headings to paragraphs, the sentence that doesn't belong), made as specs in your own builder file; the free-answer ones judged with Max (injected) or self-rated.
- **Slice R4 · parallel and simplified texts.** Two columns; a simplified version beside the original (Max, labelled).
- **Done when:** R1 and R2 are on screen and tested; R3 and R4 are done or named as not done.

## 4. The prompts to paste

**Antigravity-1** (a session in the `Lingua` folder):

```text
Continue Lingua as the session called Antigravity-1. Read CLAUDE.md, then docs/ANTIGRAVITY-PLAN.md and docs/CODEX-PLAN.md sections 1, 2, 3 and 5, and follow them exactly (the changes in ANTIGRAVITY-PLAN section 1 win). Do the set-up check first. Then take step 6-7 Grammar: claim it in docs/LINGUA-6-PLAN.md as CODEX-PLAN section 2 says, with the name Antigravity-1, push the claim alone, and work through its slices G1 to G5 one at a time, each its own checked and versioned push. When 6-7 is done, claim and do 6-13 (slices T1 to T3). Add lines to shared files, never reformat them; stay out of the files ANTIGRAVITY-PLAN section 1 lists as Claude's. Tick audit entries only for what a learner can reach on screen. Say plainly what you did not verify (no real AI model, no browser, and so on). If you are blocked or a check fails that your change did not cause, stop and tell me. End every session with the report in CODEX-PLAN section 5.
```

**Antigravity-2** (a second Antigravity session, started at the same time, in its own clone of the repository):

```text
Continue Lingua as the session called Antigravity-2. Read CLAUDE.md, then docs/ANTIGRAVITY-PLAN.md and docs/CODEX-PLAN.md sections 1, 2, 3 and 5, and follow them exactly (the changes in ANTIGRAVITY-PLAN section 1 win). Do the set-up check first. Then take step 6-12 Writing: claim it in docs/LINGUA-6-PLAN.md as CODEX-PLAN section 2 says, with the name Antigravity-2, push the claim alone, and work through its slices W1 to W4 one at a time, each its own checked and versioned push. When 6-12 is done, claim and do 6-8 Reading (slices R1 to R4). Add lines to shared files, never reformat them; stay out of the files ANTIGRAVITY-PLAN section 1 lists as Claude's. Tick audit entries only for what a learner can reach on screen. Say plainly what you did not verify (no real AI model, no browser, and so on). If you are blocked or a check fails that your change did not cause, stop and tell me. End every session with the report in CODEX-PLAN section 5.
```

**Picking up after a limit** (either session; change the name):

```text
Continue Lingua as the session called <Antigravity-1 or Antigravity-2>. Read CLAUDE.md, docs/ANTIGRAVITY-PLAN.md and docs/CODEX-PLAN.md sections 1, 2, 3 and 5. Find the rows in docs/LINGUA-6-PLAN.md claimed by your name and the last slice you pushed (git log); carry on with the next slice. Do the set-up check first. Report as CODEX-PLAN section 5 says.
```

**Two sessions in one folder?** Two sessions editing one working copy will trample each other's uncommitted files. Give each session **its own clone** (`git clone https://github.com/sanchour/lingua. lingua-ag1`, and another `lingua-ag2`, each with `npm install`), or its own git worktree. Everything meets only through `origin/main`.
