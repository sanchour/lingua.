# Feature specifications

Specs for features added after Phase 1 (Statistics, Tabula, Iter and Diarium are built, and Visio is described in ARCHITECTURE.md › Phases, step 7). Each lists where it lives, what it records, and the phase
that builds it. Visual language for all of them: minimal, bookish, calm; details tucked into
popovers and drawers; every motion a transform/opacity spring (see `PERFORMANCE.md`).

---

## Additions from the original-vision check (2026-10-15)

Things the original brief asked for that the plan now covers explicitly:

- **More Duolingo-style ways to learn a deck (Thesaurus › Ludus, Phase 3):** multiple choice · match
  the pairs · fill the gap (cloze) · **build the sentence from a word bank** · **type the answer** ·
  **say it out loud**. A Ludus session mixes them, Duolingo-style, with gentle progress and no
  hearts/penalties. (The device-voice listening exercises were removed in Lingua 2.0: the voices
  sounded poor and often didn't work. Cards found in Sonus or Visio replay their real clip instead.)
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

---

## Codex in Lingua 2.0 — adding, editing and better meanings (2.0-2)

- **Add** (Codex › +): Write or paste · File (EPUB, PDF or plain text) · News (a link,
  or a source's latest stories; read through Jina Reader) · Goodreads shelves. Every way can set a
  **reading level** (A1–C2) or leave it to Lingua's guess.
- **Edit** (a book's ⋯): title, author, level, shelf and cover, plus the chapters themselves —
  edit a chapter's text, remove it, add one, or add more from a file. A news article keeps a link
  to the original.
- **Dictionaries:** the short meaning a tap shows is the everyday one (from translation tables),
  forms show what they mean themselves ("ellos" they, "estoy" am), and words the dictionary lacks
  are read through a likely base form before going online. The word's sheet says when it did that.

## Ordo in Lingua 2.0 — settings by group, with search (2.0-3)

- **Eight groups**, learning first (Reading, Study and cards, Listening, Languages), then the app
  (Look and feel, AI and translation, Your data, About and more), each with a line saying what is
  set now; the ones that need something (no AI key, no backup yet) say so.
- **Phone:** a grouped list like the iPhone's Settings; each group is its own page with Back.
  **Desktop:** the groups in a column, the open one beside it.
- **Search settings** by name or everyday words ("dark", "font size", "key", "backup"); a result
  opens its page and the setting glows for a moment. On desktop, / focuses the search.

## Music in Sonus — learning through music (2.0-4, in Sonus since 2.0-4b)

Sonus is "listen and sing". Since 3.0-3 it opens on **Library** (what you listen to: recently
played songs and episodes together, your songs, the podcasts you follow, new episodes, your own
files), then **Music** and **Podcasts** for finding more. The music room still goes by Cantus
inside (its deck is "From Cantus").


- **Find any song** in the language you're learning (Apple's catalogue; tap the artwork for a
  30-second preview), or start from Discover: this week's most played songs sung in the language,
  artists picked for learners (clear, medium or fast), and about ten styles a language, at the
  top of Music.
- **The song page** fills the window and stays put; only the lyrics scroll (on a phone the
  header, the song and the player stay, the lyrics scroll between). "Playing from …" picks the
  source: Apple's 30-second **preview** (always plays; the first tap on the line you hear places
  it in the song), **Apple Music** (its player on the page:
  pressing it starts and pauses the lyrics; on a phone, "Play in Apple Music" opens the Music app,
  then you tap the line you're hearing), YouTube (paste the song's link), Spotify, or music
  playing anywhere (start the timer, or tap the line you're hearing). The current line is large
  and in the song's colour, its words lighting up as they're sung; the English sits under each
  line, shown, blurred or hidden. Every word works as in Codex. Tap a line's English or the space
  around it to play from it, save it as a card, or copy it. Press and drag (or hold and slide on
  a phone) across several words to translate the phrase. Lyrics without times get estimated ones
  that follow gently; a tap on the line you hear puts them right. The album art colours the page.
- **Lyrics** come from LRCLIB (often timed to the music), then lyrics.ovh; when LRCLIB is busy
  the page tries again by itself. When nothing sure was found, the likely lyrics are shown to pick
  from ("Are these the lyrics?"), with "Search another name", "On Genius" (Genius's search, to
  copy the words) and "Paste them yourself". Under the lyrics: where they came from.
- **Your songs:** save with the heart. Recently opened songs sit below; with your own Spotify app
  (Ordo › Music explains it), your liked songs sung in the language too.
- **Learn it (song lessons):** the language first, the song as the bonus. Words from the song
  worth learning at your level (what does it mean?), each word back in its line, a form and the
  word it comes from, the line in English, then the verse's lines in order. At the end the words
  can be added to your cards with the line they're sung in. The lesson counts as Ludus.
- **Everywhere else:** Home suggests a song for today; saved lines go to the "From Cantus" deck and
  their cards play the line again (with a YouTube or Spotify link); lyrics open in Codex as a text;
  Ratio counts songs and time with music; Iter marks the first song and every 10, 25, 50 and 100.

## Voices and your devices (3.0-4)

- **Natural voices:** a speaker button on words (the word drawer), on selected phrases and on
  flashcards reads them aloud in the accent of the language's flag (Castilian or Mexican Spanish,
  Brazilian or European Portuguese). With a free Gemini key it's one of Gemini's natural voices,
  each word made once and kept on the device; without one, the device's own voice if it's a good
  one for that accent; otherwise no button. Ordo › Languages › Voice says which voice reads the
  language, plays a sample, lets you try and pick another Gemini voice, and turns reading aloud off.
- **Your devices:** pair the desktop app and the phone once (Ordo › Your data › Your devices: one
  shows a QR code and a code, the other scans or types it). Whenever both are open they sync
  directly, device to device: words, cards, reviews, books, songs, progress and settings (not
  audio and video files; API keys only if you choose). "Sync now" and the last sync time are
  there too. No account, and nothing kept on a server.

## Languages in Lingua 3.0 — twenty, and fifteen in beta (3.0-1, 3.0-1b)

- **Twenty languages with everything:** English, Spanish, French, German, Italian, Portuguese,
  Russian, Greek, Swedish, Hungarian, Dutch, Norwegian, Turkish, Indonesian, Swahili, Latin,
  Arabic (right to left), Mandarin (pinyin over words), Japanese (kana over words, split by its own
  dictionary) and Korean. Each has an offline dictionary pack, starter and Top-N decks, Diarium
  prompts, news, music, podcasts, speech recognition and a flag of its own (with a choice of
  regional flags).
- **Beta languages:** Hindi, Polish, Vietnamese, Tagalog, Thai, Persian (right to left), Cantonese
  (Jyutping over words, Traditional characters), Czech, Romanian, Serbo-Croatian (one pack for Latin
  and Cyrillic text), Malay, Tamil, Georgian, Uzbek and Mongolian. They get what is built
  automatically: the reader with tap and select to translate, an offline dictionary, flashcards and
  Ludus, Diarium with English prompts, subtitles, podcast searches and music searches with three
  style searches. Onboarding lists them under "More languages · Beta", and Ordo › Languages marks
  them and says what they include. No grammar, alphabet or hand-picked recommendations.

## Look and feel in Lingua 3.0 (3.0-2)

- **Themes:** Paper (light) and Nocturne (dark), or following the device; within each, six palettes
  shown as swatches (Paper: Cream, Rose, Sage, Sand, Linen, Lavender; Nocturne: Charcoal, Ink, Plum,
  Forest, Slate, Ember). Each changes the page, surfaces and accent; text keeps its contrast.
- **On a phone:** a Liquid Glass tab bar with a lens that slides and stretches between sections and
  can be dragged; segmented controls with the same glass lens; section bars that fit the width.
- **Commute mode:** a light/dark button, and a separate button that keeps the screen on.
- **Onboarding:** language, level, goal and look (four steps); what you enjoy is set in Ordo ›
  Languages, and Home starts from your reasons.
