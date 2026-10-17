# Feature specifications

Specs for features added after Phase 1 (Statistics, Tabula, Iter and Diarium are built, and Visio is described in ARCHITECTURE.md › Phases, step 7). Each lists where it lives, what it records, and the phase
that builds it. Visual language for all of them: minimal, bookish, calm; details tucked into
popovers and drawers; every motion a transform/opacity spring (see `PERFORMANCE.md`).

---

## Additions from the original-vision check (2026-10-15)

Things the original brief asked for that the plan now covers explicitly:

- **More Duolingo-style ways to learn a deck (Thesaurus › Ludus, Phase 3):** multiple choice · match
  the pairs · fill the gap (cloze) · **build the sentence from a word bank** · **type the answer** ·
  **listen and choose / type what you hear** (spoken by the device's own offline voices via the Web
  Speech API). A Ludus session mixes them, Duolingo-style, with gentle progress and no hearts/penalties.
- **More ready-made categories (Phase 3):** Top 100 → 10,000 · Basics · Verbs · Connectors ·
  Animals · Food & drink · Family & people · Home & everyday objects · Numbers, time & dates ·
  Colours & adjectives · Body & health · Travel & places · Weather & nature · Feelings.
- **Goodreads & Apple Books spirit:** a daily **reading-goal ring** on Home (Apple Books, Phase 2),
  shelves Reading / To read / Finished with ratings (Goodreads, Phase 2), a yearly **reading
  challenge** in Iter (Goodreads, Phase 6).
- **Integrations, within what these services allow:**
  - *Goodreads* — import your shelves from Goodreads' CSV export (Phase 2); export books finished in
    Lingua as a Goodreads-compatible CSV to import back (Phase 6). Goodreads closed its public API in
    2020, so a live connection isn't possible.
  - *Apple Books* — import any DRM-free EPUB (from Files, iCloud Drive or a download). Apple Books has
    no API and books bought there are DRM-protected, so they can't be opened by other apps.
  - *Spotify* — Spotify links and embeds play inside Sonus (Phase 4); Spotify's DRM means the audio
    can't be downloaded, transcribed or controlled from the lock screen by Lingua. For offline
    listening on the bike or in the car, Sonus also takes **podcast RSS feeds** (most Spotify
    podcasts publish one) and audio files, which are stored offline, transcribed and lock-screen
    controllable.
- **"In sync":** devices stay in step through backup files (Ordo › Backup) because cloud sync was set
  aside. The schema is sync-ready; automatic sync can be added later if wanted (it needs a free
  backend account such as Supabase).

---

## Statistics — Ratio › Overview (Phase 6; data recorded from Phase 2)

Recorded continuously into `sessions` (one row per reading / listening / watching / review /
writing session) and `dailyStats` (per language per day). Shown per language and across all languages.

| Area | Statistics |
|------|------------|
| Vocabulary | Known and Learning words over time (forms and lemma families) · new words per day / week · coverage of the top 1k / 2k / 5k / 10k most frequent words · estimated passive vocabulary |
| Reading | Words read · time · reading speed (words per minute, trend) · books and texts finished · comprehension of each book (% known words) · pages per day |
| Listening & watching | Hours · episodes / films finished · transcripts read along · words mined |
| Flashcards | Reviews per day · true retention (30 / 90 days) · forecast of upcoming reviews · maturity (new / learning / young / mature) · time per card · Ludus accuracy by exercise type |
| Writing | Journal entries · words written · grade trend · CEFR estimate trend · most frequent error categories |
| Time & habit | Total hours per language and per activity (incl. manual study log) · calendar heatmap · streaks (current / longest) · time of day · weekly goal progress |
| Polyglot | All languages side by side: hours, known words, level, last studied, momentum (hours this month vs last) |

Charts: hand-rolled SVG (tiny, on-brand, themable), drawn once; hovering/tapping a point shows a
popover. Calendar heatmap uses sage tints; accent terracotta/amber is reserved for "today" and records.

---

## Tabula — polyglot capabilities table (Ratio › Tabula, Phase 6)

An at-a-glance, beautiful overview of every language the learner speaks or studies, including
languages Lingua doesn't teach (e.g. a native language or a dormant one).

- **Columns match the learner's own table** (a Notion database, shared 2026-10-15, translated from Dutch):

  | Column | Learner's column | Values |
  |--------|------------------|--------|
  | Language | Taal | any language, incl. ones Lingua doesn't teach (Dutch, Frisian, Arabic, Chinese…) |
  | CEFR level | CEFR Niveau | A0 · A1 · A2 · B1 · B2 · C1 · C2, each with its own quiet tint |
  | Status | Status | Native *(Moedertaal)* · Natural *(Natuurlijk: picked up naturally, in daily use)* · Background *(Achtergrond: known, not actively studied)* · Learning *(Aan het leren)* · Not started *(Niet begonnen)* |
  | Method | Methode | tags, several allowed: Natural · School · Internet · Series · Self-study (+ own tags) |
  | Started | Begin Datum | a date (optional) |

  The learner's rows, for reference and as the first import test: Dutch C2 Native/Natural 2005-06-27 ·
  English C2 Natural/School & Internet 2016-09-01 · Spanish B2 Natural/Internet 2021-01-04 · Frisian B1
  Natural/Natural 2005-06-27 · Portuguese B1 Background/Series 2023-03-25 · French B1 Background/School
  2022-09-12 · Russian A2 Learning/Self-study 2023-04-17 · German A2 Not started/Self-study · Arabic A1
  Not started 2023-01-10 · Chinese A0 Not started.
- **Details tucked into each row's drawer** (not columns): per-skill CEFR (Reading, Listening,
  Speaking, Writing), hours (auto from Lingua + manual log), certificates (name, level, date), notes.
- **Import from Notion:** Notion's "Export → CSV" of this database imports directly; Dutch and
  English column headers and status names are both recognised.
- **Live data** for languages studied in Lingua: known words, hours, streak, last activity.
- **Views:** a clean table on desktop (skill levels drawn as small segmented bars, sortable,
  drag to reorder); stacked cards on iPhone; a one-line summary at the top
  ("7 languages · 3 at C1+ · 312 hours this year").
- **Editing:** inline, in popovers; changing a level records an Iter event (level history).
- **Export:** a shareable image card of the table (optional, end of Phase 6).
- **Data:** `capabilities` (Synced, keyed by language code or a custom id for languages outside the ten).

---

## Iter — the language-learning journey (Ratio › Iter, Phase 6)

Tracks the learner's path per language and across all of them.

- **Timeline:** a vertical, bookish timeline of events, filterable by language.
  - *Automatic milestones:* started a language · 100 / 500 / 1,000 / 2,500 / 5,000 / 10,000 known
    words · first book finished · every 10 hours · 7 / 30 / 100 / 365-day streaks · first journal
    entry · best journal grade · level changes (from Tabula) · deck completed.
  - *Manual entries:* classes, tutoring, exams and certificates, trips, conversations, notes — with
    date, language and optional photo.
- **Goals:** per language (target level + date, or hours / words per week), with a quiet progress ring
  and an honest projection based on recent pace.
- **Study log:** "Log time" for study done outside Lingua (class, tutor, app, conversation, podcast)
  so hours and statistics reflect everything.
- **Level history:** a step chart of CEFR level over time per language.
- **Data:** `journeyEvents` (automatic + manual), `studyLogs`, `goals` (all Synced).
- Automatic milestones are generated from `dailyStats` / word counts when they happen, so the
  timeline fills in from Phase 2 onward even before the Iter screen exists.

---

## Diarium — language journal with corrections and grading (Codex › Diarium, Phase 5)

Practise writing in the target language; get corrected, explained and graded.

- **Write:** a calm, distraction-free editor in the reader's typography. Optional daily prompt
  suited to the learner's level (generated by the LLM in the target language and cached; curated
  fallback prompts offline). Drafts save locally as you type; works offline.
- **Check:** sends the entry to the chosen LLM (Groq or Gemini, the learner's own key). Returns JSON:
  - corrected text and a more natural "native-like" rewrite
  - each correction: span, original → suggestion, category (grammar, spelling, word choice, word
    order, agreement, tense/aspect, case, punctuation, style), short explanation in English, severity
  - scores 0–100 for grammar, vocabulary, coherence and overall, plus a CEFR estimate
  - two strengths and one focused tip
- **Review:** original and corrected side by side on desktop, a toggle on iPhone; a word-level diff
  (deletions struck through in terracotta, insertions in sage); tap a change for its explanation.
- **Learn:** send corrected phrases or new words to Thesaurus (deck "Journal") in one tap; every
  word in an entry is tappable like the reader.
- **Track:** entries, words written, grade trend, recurring error categories → Ratio; milestones → Iter.
- **Privacy:** a clear note that checked entries are sent to the chosen AI provider.
- **Data:** `journalEntries` (text, prompt, versions, review JSON, scores; Synced). Word diff in
  `core/diff` (tested).
