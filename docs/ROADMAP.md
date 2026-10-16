# Roadmap: what's being built now

A working plan for the next prompts. Each prompt is planned here first, then built without
stopping, then committed and pushed. A push redeploys GitHub Pages, and installed apps update
themselves. Ticks show what is done.

## Prompt 1: iPhone icon · Diarium (Phase 5) · Phase 6 · reset

Visio and Whisper are skipped here and come in prompt 2.

### 1. A minimal icon that follows light and dark
- [x] A new mark: one simple open-book glyph with rounded strokes and a terracotta bookmark, on a flat ground.
  - Light: espresso glyph on paper.
  - Dark: cream glyph on nocturne.
- [x] PNGs for both schemes from `pwa-assets-generator`.
  - `apple-touch-icon` in light, plus a `(prefers-color-scheme: dark)` variant, which iOS picks when the app is added.
  - iOS 18+ and 26 can also render any Home Screen icon in Dark, Clear or Tinted. A flat glyph on a plain ground gives the cleanest result there.
- [x] The SVG favicon changes with the system theme through an internal media query (browser tabs, desktop).

### 2. Updates reach installed apps by themselves
- [x] Check for a new version on launch, when the app comes back to the front, and every 30 minutes.
- [x] Apply a new version without asking, at a safe moment:
  - when the app is hidden;
  - or on the next page change;
  - never while you're studying, reading or listening.
- [x] After the reload, a quiet toast: "Lingua was updated".

### 3. Diarium: the writing journal (Codex › Diarium)
- [x] Data:
  - Dexie v6 `journalEntries` (Synced), with `versions` and the `review` JSON.
  - Backup and merge support.
- [x] `core/diff`: a word-level diff (LCS) with tests.
- [x] A Library · Diarium switch at the top of Codex.
- [x] The list of entries: date, first line, words, grade.
- [x] A "Write today's entry" card with the day's prompt.
- [x] Editor (`/codex/diarium/:id`):
  - the reader's typography, distraction-free;
  - autosave and a word count;
  - a prompt from the LLM, suited to the level and cached, with curated offline prompts in all ten languages.
- [x] Check with AI (Groq or Gemini, the learner's own key). The reply is JSON:
  - a corrected text and a native-like rewrite;
  - corrections, each with span, original → suggestion, category, explanation and severity;
  - scores (grammar, vocabulary, coherence, overall) and a CEFR estimate;
  - two strengths and one tip.
- [x] Review screen:
  - side by side on desktop, a toggle on phones;
  - a word diff, with deletions struck through in terracotta and insertions in sage;
  - tap a change to read its explanation;
  - score rings, strengths and the tip.
- [x] Learning from it:
  - send corrections or words to the Thesaurus deck "Journal";
  - instant translations on every word.
- [x] Tracking (milestones go to Iter in step 4):
  - a `write` session per entry;
  - words written, grades and error categories go to Ratio;
  - milestones go to Iter.
- [x] A privacy note next to Check.

### 4. Phase 6: Ratio, Tabula and Iter
- [ ] Ratio tabs: **Overview · Tabula · Iter**, with a language filter (this language, or all).
- [ ] SVG charts in `design/charts`: line, bars, calendar heatmap, ring and step chart, each with a hover or tap popover.
- [ ] Overview:
  - **Vocabulary:** words over time; new words per week; coverage of the top 1k, 2k, 5k and 10k; an estimate of passive vocabulary.
  - **Reading:** words, time, words per minute with its trend, books finished, comprehension per book.
  - **Listening:** hours, episodes finished, words mined.
  - **Flashcards:** reviews per day, retention over 30 and 90 days, a 14-day forecast, maturity, time per card, Ludus accuracy by exercise.
  - **Writing:** entries, words, grade trend, top error categories.
  - **Time and habit:** hours per activity, a calendar heatmap, current and longest streak, time of day, the week's goal.
  - **Polyglot:** all languages side by side, with momentum.
- [ ] Tabula:
  - the `capabilities` table: language, CEFR, status, methods, start date, live data;
  - a drawer per language with skills, hours, certificates and notes;
  - Notion CSV import (Dutch or English headers);
  - a sortable table on desktop that you can reorder by dragging, and stacked cards on phones;
  - a summary line at the top;
  - a level change records an Iter event;
  - export as an image card.
- [ ] Iter:
  - a timeline of `journeyEvents`, filled automatically from history, with manual entries and an optional photo;
  - goals with a ring and an honest projection (`goals`);
  - a study log, "Log time" (`studyLogs`), whose hours count everywhere;
  - level history as a step chart;
  - a yearly reading challenge.
- [ ] Goodreads CSV export of the books you've finished (Codex menu and Ordo › Backup).
- [ ] Polish pass: accessibility (focus, labels, reduced motion, contrast), performance, and an iOS check.

### 5. Reset
- [ ] Ordo › Storage › **Reset**, with two choices:
  - reset this language's progress (words, cards, reviews and statistics);
  - erase everything (database, caches, settings), back to onboarding.
  - A "Back up first" button, and a typed confirmation.

### 6. Check everything
- [ ] Walk every section on desktop and phone sizes, then fix what's glitchy or slow.

## Prompt 2: Visio · Whisper · Home
- [ ] Visio: a dual-subtitle video player (files and links), mining dialogue into decks, transcripts.
- [ ] Whisper: local transcription (WebGPU), with Groq as the fallback.
- [ ] Home: easy to read at a glance on desktop and phone.

## Lingua 2.0
New languages, music, grammar ([`GRAMMAR-PLAN.md`](GRAMMAR-PLAN.md)), radio, recommendations,
streaming services, and the list of improvements. It is planned in detail when prompt 2 is done.
