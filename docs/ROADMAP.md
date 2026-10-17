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

## Prompt 2: Visio · Whisper · Home ✅

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

Built as nine prompts, in this order. Each is checked, committed and pushed on its own, so the
live app gets better step by step. Fixes to what already exists come first, because they make
every later feature feel better. Reordered on 2026-10-17 after new asks: the settings first,
music raised to a room of its own, every language checked, and a full check at the end.

### 2.0-1 · Reading, words and cards feel right ✅
- [x] **No more voiceover:** the device voice is removed from Codex and Thesaurus (buttons, drawer,
      Ludus, the Ordo voice settings). The listening exercises went with it; cards found in Sonus or
      Visio still replay their real clip.
- [x] **Hover translation** shows only the translation (no Learning/Known badge).
- [x] **Smarter translations in context:**
  - The gloss is chosen with the words around it: after an article or a quantifier ("cada tarde")
    a noun sense wins over an adverb, after a pronoun a verb, and so on (per-language rules on the
    pack's parts of speech).
  - With an AI key, a word you hover or tap gets the meaning its sentence needs: one request per
    sentence, only for sentences you look at, cached (Ordo › Reading can turn it off).
  - A small "the meaning in this sentence" line in the drawer when it differs from the usual one.
- [x] **Select to translate:** press and drag over words (mouse), or long-press and slide (touch), to
      select a phrase, a sentence or a paragraph (up to 60 words). A bubble shows its translation
      (AI when there's a key, else the free translators) and can save it as a phrase card.
- [x] **Word drawer:**
  - Two tabs, *Meaning* and *Forms*, so grammar tables get their own space.
  - The CEFR level beside "most common #N".
  - "+ Deck" moves a Learning word from "From my reading" to the deck you pick, instead of copying it.
- [x] **Thesaurus:**
  - The flicker between flashcards after grading is fixed (one card at a time, no overlap).
  - Right-clicking (or long-pressing) a flashcard opens the same word drawer as Codex.
  - A new Ludus icon: a puzzle piece.
  - After Recall: "Practise again" (the same cards, schedule untouched) and "Practise with Ludus"
    above Done; after Ludus: "Another lesson".
  - Discover: ready-made deck tiles with their own colour, a large faint illustration, sample
    words and a gentle lift on hover.
- [x] **Onboarding:** two more steps: why you're learning and how much time a day (sets the daily
      goal), and what you enjoy most (reading, listening, watching, writing, cards), which orders
      Home's next steps (also in Ordo › Languages).

### 2.0-2 · Codex: adding and editing, articles, PDFs, better dictionaries ✅
- [x] Reading level (A1–C2) can be chosen when adding a text and edited later; "Lingua's guess" is
      worked out from how many of the text's words are among the 5,000 most common.
- [x] **Edit** in a book's ⋯ menu: title, author, cover, level, the text itself (chapters: edit,
      remove, add one, add from a file).
- [x] **PDFs:** text is pulled out with pdf.js (loaded only when needed), split into chapters by
      the PDF's bookmarks, else headings, else ten-page parts, and read like any book. Paragraphs
      come from line gaps and short last lines; running headers and page numbers go. Scanned PDFs
      without text and locked PDFs say so.
- [x] **News articles:** paste a link; the article's text is read through Jina Reader (with a note
      about what it sees), with a paste-the-text fallback. Plus news sources for ten languages with
      one-tap "Latest" lists (El País, DW, Agência Brasil, franceinfo, Radio-Canada, Corriere,
      Il Sole 24 Ore, tagesschau, Ekot, Proto Thema, HVG, 24.hu).
- [x] **Better dictionaries (Portuguese, Spanish, Swedish, Hungarian first, then all):**
  - [x] Rebuild the packs choosing the most common sense first, not the first listed: English
        Wiktionary's translation tables say which word translators use for common English words.
  - [x] More inflected forms: forms of forms (Spanish "tus" → tu → tuyo), what a form means of its
        own ("ellos" → they, "estoy" → am), and the part of speech a form belongs to (Hungarian
        "azt" is "that", not "the").
  - [x] A lemma fallback for forms that aren't listed: case and definite endings, attached
        pronouns, Portuguese hyphens, and the end of a German or Swedish compound.
  - [x] Glosses checked by a test of everyday words in each of the four languages
        (`src/core/packs/glosses.test.ts`), and the top 200 of each reviewed by hand.

### 2.0-3 · Ordo: settings that are easy to find your way in
- [ ] **One overview, then one section at a time:** Ordo opens on a short list of groups (Look and
      feel, Reading, Study, Listening and watching, Languages, AI and keys, Backup and reset,
      About), each with a one-line summary of what is set. Choosing one opens just that section.
  - Phone: a grouped list like the iPhone's Settings; a section opens as its own page with a back
    button. No more one long page.
  - Desktop: the groups stay in a side column, the chosen section beside them.
- [ ] **Search** over every setting by name and words ("font", "key", "backup"), jumping to it.
- [ ] Each setting says in one line what it does; links from elsewhere (for example "Open
      settings" from a missing AI key) land on the right section.
- [ ] Checked on a phone and on desktop, light and dark.

### 2.0-4 · Cantus: learning through music, a room of its own
- [ ] **Search** any song in the language (Apple's free search: artwork and a preview). Lyrics come
      from LRCLIB (free, open, often synced to the music).
- [ ] **The song page:**
  - Lyrics light up line by line with the music: the Spotify player when you're signed in,
    Apple Music, or the preview.
  - Every word works as in Codex.
  - A translation under each line (AI or the free translators), shown, blurred or hidden.
  - Save lines and words.
- [ ] **Your songs:** songs you save in Lingua, and, with your own Spotify app ID (a free developer
      app, explained step by step), your Spotify liked songs in that language.
- [ ] **Discover:** artists, albums and styles per language, picked by hand, with charts where
      available.
- [ ] Lyrics can be opened in Codex as a text.
- [ ] **A room of its own, not a tab:** Cantus sits beside Codex, Sonus and Visio in the sidebar
      and the tab bar, with its own icon and colour, and is part of the whole app:
  - Home suggests a song for today; "music" is one of the things you can enjoy in onboarding.
  - Words and lines saved from songs are cards that replay their bit of the song.
  - Ludus gets song exercises: fill in the lyric, put the lines in order.
  - Ratio and Iter count songs and minutes; Mundus links to artists.
- [ ] **Aesthetic:** the album art sets the page's colours; the lyric sheet scrolls with the song,
      the current line large and clear; calm, simple controls that work one-handed on a phone.

### 2.0-5 · Twenty languages with their flags, every one well supported
- [ ] New: Arabic, Mandarin, Dutch, Norwegian, Turkish, Japanese, Korean, Latin, Swahili and
      Indonesian (Bahasa).
  - Packs from Wiktionary (kaikki) and frequency lists (FrequencyWords; Latin from a corpus list).
  - Word splitting with `Intl.Segmenter` for Mandarin and Japanese, plus readings (pinyin, kana).
  - Right-to-left reading for Arabic, everywhere text is shown.
  - Fonts loaded only for the scripts in use (Arabic, CJK, Hangul).
  - Starter decks, Diarium prompts and level hours for each.
- [ ] **Flags as icons** for all twenty, drawn in the app's soft style (rounded, slightly muted).
      Each language has a default flag and can switch to another, such as English UK/US,
      Portuguese PT/BR, Spanish ES/MX, Arabic by country, Mandarin CN/TW, Swahili TZ/KE. Latin gets
      a laurel emblem.
- [ ] **Every language checked, the ten existing ones too:** a test list of everyday words per
      language like 2.0-2's (`glosses.test.ts`), the 200 commonest words reviewed, the lemma
      fallback rules, news sources, starter decks and Diarium prompts.

### 2.0-6 · Grammatica
Built as in [`GRAMMAR-PLAN.md`](GRAMMAR-PLAN.md), steps 1–4:
- [ ] Grammar files, the topic browser, explanations and tables.
- [ ] The drills: conjugate, decline, pick the form, word order. Items are FSRS cards, with mastery rings.
- [ ] Topic maps for every language (Spanish and German first).
- [ ] Links from the word drawer, Home and Ludus; placement; Ratio and Tabula.

### 2.0-7 · Radio (in Sonus)
- [ ] Stations from radio-browser.info (an open, community-run directory): by language, by country,
      search, favourites; only secure (https) streams.
- [ ] A minimal "night sky" map: every station a dot at its place, so the dots draw the world;
      tap one to tune in, like Radio Garden.
- [ ] Plays in Sonus's player and mini player, with now playing when the station shares it.
      Listening time counts.

### 2.0-8 · Mundus: recommendations, and streaming services in Visio
- [ ] **Mundus**, a deep-dive page per language: video games, series, films, books, podcasts,
      music, YouTube channels and dictionaries. Picked by hand for all twenty languages, with level
      hints and why each is good for learners.
  - Buttons open them on the web, Spotify, YouTube, Goodreads, Amazon, Netflix, Max, Disney+ and others.
  - "Add to Codex/Sonus/Visio" where it fits.
  - Reached from Home and the sidebar.
- [ ] **Visio › Services:** choose the services you have (Netflix, Max, Disney+, Prime Video,
      Apple TV+, SkyShowtime, Viaplay, and free public ones such as RTVE Play, ARD, arte, NRK).
  - The picks show which of your services carry them.
  - With a free TMDB key, live lists of series and films originally in the language, on your
    services in your country, with posters.
  - Each opens in its app. "Add its subtitles" uses the Subtitles-only flow.
- [ ] Every language's picks checked: links open, the services match the country, level hints
      make sense.

### 2.0-9 · Lingua 2.0 complete: the full check
- [ ] Every point of "Lingua updates.txt" checked against the app, one by one.
- [ ] Every room on a phone and on desktop, light and dark: layout, taps, scrolling, the
      keyboard, offline.
- [ ] All twenty languages end to end: dictionary and taps, news, music, radio, recommendations,
      grammar.
- [ ] Docs, then commit, push and the live site checked.
