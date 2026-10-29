# Lingua with Codex: what it builds, the rules, and the prompt

Written 2026-10-29 for ChatGPT's Codex (any model it offers), working beside the Claude sessions. It takes three steps of
[Lingua 6](LINGUA-6-PLAN.md) that touch their own folders and need only what Part A already built: **6-24 Import and export**,
**6-25 Accessibility and the desktop**, **6-22 Dictionary tools**, in that order. Everything else is somebody else's: see section 6.

## 1. Before anything: what Codex must know

- **Read, in this order:** `CLAUDE.md` (the rules; `AGENTS.md`, if the folder has one, is a copy of it), then this file, then the step's section in
  [LINGUA-6-PLAN.md](LINGUA-6-PLAN.md) and its entries in [LINGUA-6-FEATURES.md](LINGUA-6-FEATURES.md) (search the file for `**6-24**` etc.).
- **Set-up check, once per session:** `node -v` must be 24 or newer (Node 26 is what the owner has); `npm install` if `node_modules` is missing;
  then `npm run typecheck`, `npm test` and `npm run build` must all pass **before** you change anything. If one fails on a clean checkout, stop and
  say so: don't fix other people's work.
- **The app runs with** `node node_modules/vite/bin/vite.js --port 5174 --strictPort` (5173 is often another app). If you have no browser,
  say so in your report: *never* write "checked in the browser" for something you did not see. Typecheck, tests and build are checks; they are not looking at it.
- **There is no formatter.** Never run Prettier or `eslint --fix`. Match the file you are in: single quotes, long lines (about 200 columns), JSX wrapped
  the way it is around it. Comments say *why*, in one line. Desktop only: no phone layouts.
- **Never:** use a real API key (tests use `test-not-a-real-key`), sign in anywhere, create an account, download anything to the machine without
  asking, open anything outside this folder. Never force-push, never rewrite pushed history, never move a tag that points at someone else's commit.

## 2. How to claim, and how to push without colliding

Other sessions (Claude, and the owner's other tools) push to `main` all day. The order below is the one that has worked:

1. **Claim first.** In [LINGUA-6-PLAN.md](LINGUA-6-PLAN.md)'s table, change the step's `[ ]` to `[~]` and write `*claimed by Codex YYYY-MM-DD*` in its What column.
   Push that alone (section 2, steps 3 to 6), before any other work. If the row already says `[~]` for someone else, **do not take it**: take the next step in section 4.
   If it says `[~] claimed by Codex`, it is yours: carry on from the last slice that is ticked below.
2. **Work in small slices** (section 4). Each slice is one push. After each: `npm run typecheck && npm test && npm run build`, all green.
3. `git add` only the files you changed, then commit as the owner:
   `git -c user.name=sanchour -c user.email=255895307+sanchour@users.noreply.github.com commit -m "…"`.
4. `git fetch origin && git rebase origin/main`. If the rebase stops, merge the conflict (shared files: `src/data/db.ts`, `src/data/types.ts`,
   `src/app/router.tsx`, `src/app/pages.ts`, the docs: keep both sides' lines), never overwrite. Re-run the checks if anything came in.
5. **Version, after the rebase** (so it counts from the latest): `node scripts/version.ts "what this push is"`. Never `--line`: that restarts the
   counter and was a mistake once already. Commit `package.json`, `package-lock.json` and `CHANGELOG.md` as `<version>: what this push is`.
6. `git tag v<version>` then `git push origin HEAD:main v<version>`. If the push is rejected: `git fetch`, rebase again, and redo step 5 (the number may have been taken).
   If the tag already exists on the remote, it is someone else's: take the next number.
7. **If you cannot push at all** (no network, no sign-in): do not try other routes. Commit on a branch named `codex/<step>`, and say in your report exactly what is
   committed and that nothing is on `main`.

## 3. When a slice is "done" (and what you may tick)

- The checks are green, and the slice has **a test** for its logic (parsers, exporters, contrast ratios: all pure, all testable).
- The feature can be **reached from a screen** (a button, a menu, a setting), not only from code.
- You update, in the same push: the step's row in `LINGUA-6-PLAN.md` (what is built, what is not, "not looked at in a browser" where true),
  `docs/DECISIONS.md` (one short entry for each real choice and why), and `docs/LINGUA-6-FEATURES.md`: tick an entry **only** if a learner can use it now. A function nobody can reach is not a ticked entry.
- **Say what you did not verify.** An honest "written and tested, not looked at" is what the owner wants. A claim that turns out false costs more than a gap.
- A new table needs a Dexie version: step 6-N uses **17 + N** (6-22 is 39, 6-24 is 41, 6-25 is 42), and it must be added to
  `src/core/contracts/db.ts` first, as its own small push, as [LINGUA-6-CONTRACTS.md](LINGUA-6-CONTRACTS.md) says. Prefer no table: settings and existing tables first.

## 4. The three steps, in slices

### Step 1 · 6-24 Import, export and integrations (plan: LINGUA-6-PLAN.md, `#### 6-24`; entries F0059, F0408, F0692, F1138, F1473, F1475, F1480, F1483, F1486, F1490–F1498, F1509, F1511–F1512, F1615)

What exists: `.apkg` and CSV **import** (`src/core/parsers/apkg.ts`, `src/services/import/decks.ts`, `src/features/thesaurus/library/useDeckImport.ts`), whole-app backup (`src/data/backup.ts`). **No exporter exists.** `jszip` and `sql.js` are already dependencies; add no others.

- **Slice 1.1 · the exporter's core.** `src/services/export/` (pure functions, no screens): words to CSV, a deck to CSV, notes and entries to Markdown (with front matter and `[[links]]`, so Obsidian and Notion import it), plain text, statistics to CSV, a calendar file (`.ics`) for dates. One `saveFile(name, blob)` helper (an anchor with a download). Tests for each: exact output for a small fixture.
- **Slice 1.2 · decks to Anki.** A `.apkg` writer with media, using `sql.js` and `jszip`. **Round-trip test:** export a fixture deck, import it with the existing reader, get the same notes back.
- **Slice 1.3 · the screens.** A deck's menu gets *Export…* (Anki, CSV); Settings gets an *Export* section for the rest (words, notes, statistics, calendar). Each button exports what it says, for the active language.
- **Slice 1.4 · import.** Parsers in `src/core/parsers/` with tests: Quizlet's text export, Markdown, Kindle's `My Clippings.txt`, transcripts with timings (SRT and VTT). Wire them into the existing import menus (a text into Codex, words into a deck). The browser extension's "Send to Codex" is **not** in this step: leave it.
- **Done when:** a deck survives Anki and back; a Markdown file of a deck's notes opens in Obsidian with working links (say you could not open Obsidian, if so); a Kindle clippings file makes a deck through a preview.

### Step 2 · 6-25 Accessibility and the desktop (plan: `#### 6-25`; entries F1523–F1524, F1531, F1533–F1534, F1536, F1539, F1541, F1544, F1546–F1547, F1549–F1550)

Read the handbook's chapters on dark mode and accessibility first (`docs/handbook/handbook.html`; the PDF is the same). Colours live in the design tokens (search for `--ink` and `--bg`).

- **Slice 2.1 · high contrast.** A light and a dark high-contrast palette with **text at 7 : 1** against its background. A test computes the contrast ratio of every text/background pair in both palettes and fails under 7. A setting turns it on.
- **Slice 2.2 · colour never alone.** Word states and card states get a shape or pattern beside their colour (the same glyph everywhere), and charts get patterns. Show it in the word memory list, the deck tree and the Today ring.
- **Slice 2.3 · a reading font for dyslexia.** Lexend (add `@fontsource-variable/lexend`, the one dependency this step may add) with settings for letter and word spacing, beside Atkinson Hyperlegible, in the reader's typography settings.
- **Slice 2.4 · the passes.** A keyboard-only pass and a screen-reader pass (labels, live regions, headings) over Home, Codex's reader, Thesaurus, Ludus, Cursus, Settings. Fix what you find; list what you found and fixed in the plan row. No screen reader will be available to you: say "checked by reading the markup and roles, not with NVDA or VoiceOver".
- **Slice 2.5 · privacy and storage.** One page: what is sent where (AI, translation, look-ups, recordings); storage by kind (packs, voices, audio, video, recordings) with delete; transcription paused while the app is hidden; an undo after destructive actions where there is none.
- **Slice 2.6 · the desktop.** A word of the day on Home (and an optional notification); a small floating review window (Document Picture-in-Picture, Chrome and Edge; hide the control elsewhere).
- **Done when:** 2.1 to 2.3 are on screen and tested, and 2.4 to 2.6 are either done or named in the plan row as not done.

### Step 3 · 6-22 Dictionary tools (plan: `#### 6-22`; entries F1247–F1249, F1275–F1280, F1282–F1283, F1285, F1287–F1290, F1482)

The full dictionary (version 3) is on the device in the `fullDict` table (`src/services/dictionary/fullDict.ts`, `src/core/dictionary/format.ts`). `src/features/thesaurus/dictionary/` is its screens; **another session is editing `Entry.tsx`, `WordMemory.tsx` and `YourWord.tsx` there**, so add your own components beside them and change those files only to mount yours (a line or two).

- **Slice 3.1 · search.** Beside the box: by meaning (a reverse dictionary over the senses' glosses and the language's own definitions: score words by shared terms), with typos (edit distance on the accent-free keys), by prefix or suffix, by part of speech, rhymes and similar sounds (by the end of the IPA). Pure scoring code in `src/core/dictionary/` with tests; run it in a worker if it is slow on 80,000 words (budget: a result in under 200 ms).
- **Slice 3.2 · one search across Lingua** (Ctrl K / ⌘K): texts, notes, cards, phrases, grammar topics. A palette, keyboard only, results grouped. Tests for the ranking.
- **Slice 3.3 · your dictionary.** Favourites and bookmarks (a word's `favourite` flag already exists: use it), your own entries, report a wrong entry. This needs a table: contract push first (Dexie 39).
- **Done when:** a Spanish description finds its word; typing `kasa` finds *casa*; Ctrl K opens from any page and finds a deck by name.

## 5. What to report at the end of every session

Plain, short, in this order: **what changed** (pushed versions, one line each) · **what is verified** (checks run, what you saw on screen) · **what is not** (no browser, no screen reader, no Anki to import into, and so on) · **what is next** (the next slice, and any claim you hold). If a usage limit stops you, the next session starts from that report and the plan rows: the work picks up where the ticked slices end.

## 6. Not Codex's (so there is no overlap)

- **Part A's leftovers** (6-1c, 6-2b, 6-3b, 6-4b, 6-5b, 6-6b) and the Practice page, the exercise session, the card editor, the Thesaurus page and the generator: a Claude session is in them.
- **6-7, 6-8, 6-12, 6-13:** Gemini and Antigravity ([GEMINI-PLAN.md](GEMINI-PLAN.md)). **6-29 The word graph:** Claude Opus, in its five phases.
- **Part B (6-7 to 6-13)** and **Part C (6-14 to 6-18):** Claude, in order. **Lingua for Mac:** its own plan, [MAC-PLAN.md](MAC-PLAN.md).
- **Anything that needs the owner's accounts** (Stripe, Cloudflare, the Chrome Web Store): HANDOVER §4. Say so and stop; never work around it.

## 7. The prompt to paste

First time (in the Code tab with the `lingua` folder open, or Codex's own folder picker):

```text
Continue Lingua with Codex. Read CLAUDE.md, then docs/CODEX-PLAN.md, and follow it exactly. Check the set-up first (section 1), then take Step 1 (6-24 Import and export): claim it in docs/LINGUA-6-PLAN.md as section 2 says, push the claim alone, and work through its slices one at a time. After each slice run typecheck, tests and the build, commit as sanchour, rebase onto origin/main, then version and push as section 2 says. Tick audit entries only for what a learner can reach on screen, and say plainly what you did not verify (for example: not looked at in a browser). When Step 1 is done, claim and do Step 2 (6-25), then Step 3 (6-22). Stay out of the files section 6 lists. If you are blocked, or a check fails that your change did not cause, stop and tell me; do not work around it. End every session with the report in section 5.
```

Picking up after a limit or a new session:

```text
Continue Lingua with Codex. Read CLAUDE.md and docs/CODEX-PLAN.md. Look at docs/LINGUA-6-PLAN.md for any step marked "claimed by Codex" and at git log for the last slice pushed; carry on from the next slice of that step, following the plan's sections 1 to 5. Do the set-up check first. Report as section 5 says.
```
