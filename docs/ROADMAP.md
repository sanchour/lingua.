# Roadmap: what's being built now

A working plan for the next prompts. Each prompt is planned here first, then built without
stopping, then committed and pushed. A push redeploys GitHub Pages, and installed apps update
themselves. Ticks show what is done.

## Prompt 1: iPhone icon · Diarium (Phase 5) · Phase 6 · reset ✅

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
- [x] Ratio tabs: **Overview · Tabula · Iter**, with a language filter (this language, or all).
- [x] SVG charts in `design/charts`: line, bars, calendar heatmap, ring and step chart, each with a hover or tap popover.
- [x] Overview:
  - **Vocabulary:** words over time; new words per week; coverage of the top 1k, 2k, 5k and 10k; an estimate of passive vocabulary.
  - **Reading:** words, time, words per minute with its trend, books finished, comprehension per book.
  - **Listening:** hours, episodes finished, words mined.
  - **Flashcards:** reviews per day, retention over 30 and 90 days, a 14-day forecast, maturity, time per card, Ludus accuracy by exercise.
  - **Writing:** entries, words, grade trend, top error categories.
  - **Time and habit:** hours per activity, a calendar heatmap, current and longest streak, time of day, the week's goal.
  - **Polyglot:** all languages side by side, with momentum.
- [x] Tabula:
  - the `capabilities` table: language, CEFR, status, methods, start date, live data;
  - a drawer per language with skills, hours, certificates and notes;
  - Notion CSV import (Dutch or English headers);
  - a sortable table on desktop that you can reorder by dragging, and stacked cards on phones;
  - a summary line at the top;
  - a level change records an Iter event;
  - export as an image card.
- [x] Iter:
  - a timeline of `journeyEvents`, filled automatically from history, with manual entries and an optional photo;
  - goals with a ring and an honest projection (`goals`);
  - a study log, "Log time" (`studyLogs`), whose hours count everywhere;
  - level history as a step chart;
  - a yearly reading challenge.
- [x] Goodreads CSV export of the books you've finished (Codex menu and Ordo › Backup).
- [x] Polish pass: accessibility (focus, labels, reduced motion, contrast), performance, and an iOS check.

### 5. Reset
- [x] Ordo › Storage › **Reset**, with two choices:
  - reset this language's progress (words, cards, reviews and statistics);
  - erase everything (database, caches, settings), back to onboarding.
  - A "Back up first" button, and a typed confirmation.

### 6. Check everything
- [x] Walk every section on desktop and phone sizes, then fix what's glitchy or slow.

## Prompt 2: Visio · Whisper · Home

### 1. Visio: the screening room
- [x] Library:
  - add a video file (MP4, WebM, MOV, M4V) or a direct link;
  - drop a video and its subtitles together, matched by name;
  - covers taken from a frame of the video;
  - progress and subtitle badges on each card;
  - "Keep subtitles only", to save space on a phone.
- [x] Subtitles:
  - SRT or VTT for the language you're learning, and for your own;
  - or a transcript from Whisper (Groq, or on this device);
  - or an AI translation of the learning-language track as your own track.
- [x] Player (`/visio/watch/:id`):
  - dual subtitles over the picture;
  - every word works as in Codex: hover or tap for a translation, click to mark, long-press for the drawer;
  - your own line can stay hidden until you hover or tap it;
  - auto-pause at the end of each line, repeat a line, previous and next line, speed, and a subtitle offset;
  - fullscreen keeps the subtitles;
  - the transcript runs beside the video on desktop and below it on phones;
  - watching time is recorded.
- [x] Mining:
  - "Save line" makes a card (deck "From Visio") with the sentence, its translation and the clip times;
  - words marked Learning keep the clip as well;
  - cards replay their clip in Thesaurus.

### 2. Whisper on this device
- [x] `@huggingface/transformers` in a worker, with WebGPU when available and WASM otherwise.
  - Models: tiny, base or small (multilingual), downloaded once and cached.
  - Word timings, and progress for both the download and the transcription.
- [x] Ordo › Listening: transcribe with Groq (fast, needs a key) or on this device (private, no key), and the model size.
- [x] Sonus and Visio both use it.

### 3. Home at a glance
- [x] One "Today" panel with the goal ring and the next steps, in order: reviews due, continue reading, listening or watching, today's journal prompt.
- [x] A week strip, a few honest numbers (known words, coverage, hours this week) linking to Ratio, and the latest milestone.
- [x] A first-run checklist for an empty app: add a text, start a deck, follow a podcast, write an entry.
- [x] Clear on desktop (two columns) and on phones (one column, the most important first).

### 4. Check, commit, push
- [x] Typecheck, 106 tests, production build; every route checked on desktop and phone (no errors, no unnamed buttons, no sideways scrolling).
- [x] Checked in headless Chrome: a test video with Russian and English subtitles, hover and tap translations on the subtitles, marking words, "Save line", previous and next line, clip replay on the card, Whisper tiny on this device (English test speech, 15 s with the download), and the Groq path for a video (mocked, sends a 16 kHz WAV).
- [x] Committed and pushed; Pages redeployed.

Notes: Home's numbers are known words, learning, hours this week and hours in all (coverage stays in Ratio). Streaming sites (YouTube, Netflix…) can't play inside Lingua; their subtitle files can be added as "Subtitles only". That is revisited with the streaming services in Lingua 2.0.

## Lingua 2.0
New languages, music, grammar ([`GRAMMAR-PLAN.md`](GRAMMAR-PLAN.md)), radio, recommendations,
streaming services, and the list of improvements. It is planned in detail when prompt 2 is done.
