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
  Since 3.0-8 Ludus also has **right or wrong**, **spell the word** from letter tiles, and, only
  where a natural voice speaks the language (a Gemini voice or a good device voice, never a robotic
  one), **listen and pick the word** and **dictation**. Right answers in a row light a combo; a
  perfect lesson gets confetti. A gear opens the setup sheet (length, Classic or Zen, which
  exercises, typing, sounds, vibration), and **Lightning** (on a deck and at the end of a lesson)
  is a minute of quick choices with a best score, which never moves a card's schedule.
- **More ready-made categories (Phase 3):** Top 100 → 10,000 · Basics · Verbs · Connectors ·
  Animals · Food & drink · Family & people · Home & everyday objects · Numbers, time & dates ·
  Colours & adjectives · Body & health · Travel & places · Weather & nature · Feelings.
- **Goodreads & Apple Books spirit:** a daily **reading-goal ring** on Home (Apple Books, Phase 2),
  shelves Reading / To read / Finished with ratings (Goodreads, Phase 2), a yearly **reading
  challenge** in Iter (Goodreads, Phase 6).
- **Integrations, within what these services allow:**
  - *Goodreads* — import your shelves from Goodreads' CSV export (Phase 2), shown in Codex ›
    Goodreads (5.1-3a): sorted, grouped and filtered, with covers from Open Library, and each book's
    EPUB or a free edition (Gutenberg, Wikisource) to read it here; export books finished in
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

## Diarium in Lingua 5 (5.2-5)

- **The editor** is Tiptap (`features/codex/diarium/DiaryEditor.tsx`, loaded only with an entry): Ctrl B/I/U, Ctrl Alt 1–3
  and 0, Ctrl Shift 7/8 and B, `# ` `- ` `1. ` `> ` at the start of a line, and a small toolbar over a selection. Entries
  stay Markdown in `text` (`core/journal/markdown.ts`, tested both ways), so sync, export and word counts keep working;
  plain entries from before read as paragraphs. Words are counted in the plain text.
- **The AI check** reads the plain text; "Use the corrected text" puts the corrections back paragraph by paragraph,
  each keeping its heading or list marker (and its marks where it didn't change).
- **The heading:** a title from Rename, else the day's prompt, else "Dear diary" in the language
  (`core/journal/salutations.ts`: Cher journal, Liebes Tagebuch, Дорогой дневник, 亲爱的日记 …) or the date in it where
  diaries aren't addressed that way. An empty page says "Today…" in the language.
- **Without AI** the bottom bar goes: words, Saved and dictation sit under the heading, and ⋯ has one quiet line about
  corrections (Max, or a key in Settings).
- **Entries:** search (`/` focuses, accent-blind, title, prompt and text), sort (newest, oldest, longest, most
  corrected), ⋯ on each row and right-click: Rename in place, Delete with Undo.
- **List · Calendar:** month grids with days inked by words written, a tick on corrected days, a line joining runs,
  a click opens the day; a year strip to jump months; beside it the month's entries, words, days written, longest run
  and corrections, with its entries.

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
- **Speak:** the microphone in the bar records, and Whisper (on this device, or Groq with a key)
  writes it out after what is written, to read back and correct; the recording isn't kept.
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

## The dictionary, the word memory and sentences with a gap (4.0-2)

- **Thesaurus › Dictionary** (Spanish, Russian, Mandarin, French, German, Arabic): download a
  language's dictionary once and look any word up offline: pronunciation with a recording, every
  meaning with labels and examples, definitions in the language itself (its own Wiktionary),
  Tatoeba's sentences, pairs, set phrases, synonyms and antonyms, words easily confused, the
  etymology and every form. With your own AI key, "At a glance, tidied by AI" puts an entry's
  meanings in order with an example each.
- **Your words** sit beside the dictionary: every word you looked up or marked anywhere, with each
  place and sentence, sorted by how well you know it, where you met it and theme.
- **The word drawer** is as it was, with **Open dictionary** to see the full entry.
- **Codex › Add** has Import a book and Import a comic as tabs of their own.
- **Reading goal:** set it in Ordo › Languages (5–60 minutes); while you read, a soft note says
  when today's goal is reached, between pages.
- **The end page:** after the last page, the sitting's time, pages, new words met and words looked
  up.
- **Ludus › Sentences with a gap:** rounds of real sentences with a word missing, at three levels;
  a deck's own words first when played from a deck, then your words, then your level's. Decks can
  also show a sentence with a gap on the front of their cards.

## Lingua+, a new icon and a calmer shell (4.0-1)

- **Lingua+ (a preview):** Ordo › Lingua+ shows what is free (Codex, Thesaurus) and what Lingua+
  adds (every other room) for 29.99. "Get Lingua+" charges nothing and nothing is locked; "Reset
  Lingua+" takes it away. Home has a small card for it until it is had.
- **New app icon:** two solid pages and a ribbon, on warm paper (light) or warm charcoal (dark).
- **The desktop sidebar** has Ratio and Ordo at the bottom left; Thesaurus has a new icon.
- **The phone's tab bar** is glass with a lens that swells under your finger; dragging along it and
  then tapping a section opens it at the first tap.

## Languages in tiers, and the language map (4.0-1)

- **Five kinds of language:** Core (6 languages, with everything), Full (14: everything but a
  course), Beta (15 today), Basics (20) and Experimental (10). What each comes with is said in the
  language picker. Beta, Basics and Experimental languages that aren't built yet are shown with
  "Soon" and can't be chosen.
- **"What will you read?" is a map with a list:** the world with a dot where each language is
  spoken. Choose a language and the map flies there; tap a place and its languages come first. The
  list shows Core as large cards, then Full, then the others in a compact list you can search.

## Comics in Codex (3.0-6)

- **Add a comic** (Codex › Add › File): "Choose a comic" takes a CBZ (or a CBR made as zip), a PDF,
  or the pages' pictures; on desktop "A folder of pages" takes a whole folder, and any of them can
  be dropped. The first page becomes the cover; pages go in order of their names (2 before 10).
- **Read it like a comic, learn it like a book:** the page fills its side of the screen (on a
  phone the top, with its words underneath). Lingua reads the speech bubbles on this device
  (Tesseract; the first time it downloads the language's reading data) and lists each bubble's
  words, which work as everywhere in Codex: hover or tap for the meaning, a word's sheet, drag
  across words to translate a phrase, save to cards. Tap a bubble on the page and its words light
  up; point at words and their bubble lights up on the page.
- **Turning and zooming:** the arrows, ← and →, or a swipe on the page (right to left for manga and
  Arabic comics); double-tap or pinch to zoom into a panel, drag to look around, double-tap to go
  back. "Read the bubbles again" (the scan button) when a page came out wrong.
- Pages read count as reading in Ratio, and the comic remembers its page.

## Audiobooks and courses in Sonus (3.0-6)

- **Since 5.2-3:** Audiobooks has three tabs: Your shelf, Free audiobooks (LibriVox) and Free
  courses, a catalogue to search and filter by level and kind. Podcast courses and the FSI
  courses' audio (Spanish, French, German, Russian) are added with one click; the rest open on
  their own sites. A book's page keeps its cover and Continue in a sticky column beside the parts.
  The player without a transcript is one centred column; Commute sits on a blurred copy of the
  cover with frosted controls. Sonus+ has its own settings behind a gear in the room's header.

- **The Audiobooks tab** (Sonus, between Podcasts and Radio; "Books" on a phone): your
  audiobooks and courses as covers, each with the part you're on (or the lessons done) and a
  thin bar for how much is heard; then LibriVox's free books in the language, searchable by
  title or author, with a link to its whole catalogue; then free courses. "Add your own" takes
  files or a folder.
- **Add one** (Sonus › Add): "Audiobook or course" takes several files or, on desktop, a folder;
  parts play in track order (else by name), chapters inside the files are kept, and the title
  comes from the files. An .m4b added as plain audio becomes an audiobook too. "Free
  audiobooks" opens LibriVox's books in the language (search by title or author) and links to
  good free courses (Language Transfer, the FSI courses), with "Add a course" for your own.
- **A book's page:** Continue (the part you were on, or a course's first lesson not done), the
  parts with their progress, or one file's chapters; tick a course's lessons done. The ⋯ menu
  renames it, makes it a course or an audiobook, reads it along with an ebook, or removes it.
  Library has a shelf of them.
- **Listening:** the player shows the part and the chapter playing, a chapters list to jump to,
  the previous and next part, and "Lesson done" in a course. At a part's end an audiobook plays
  the next one; a course stops and ticks the lesson. The moon sets a sleep timer: 5–60 minutes
  (it fades out), the end of the chapter or the end of the part; the minutes left show on it.
- **Read along:** pick the book's ebook in Codex and every part with a transcript shows the
  book's own sentences instead of Whisper's, lighting up as they're read, each word working as
  in Codex. Parts transcribed later get them at once; Stop goes back to Whisper's text.

## Ordo in Lingua 2.0 — settings by group, with search (2.0-3)

- **Eight groups**, learning first (Reading, Study and cards, Listening, Languages), then the app
  (Look and feel, AI and translation, Your data, About and more), each with a line saying what is
  set now; the ones that need something (no AI key, no backup yet) say so.
- **Phone:** a grouped list like the iPhone's Settings; each group is its own page with Back.
  **Desktop:** the groups in a column, the open one beside it.
- **Search settings** by name or everyday words ("dark", "font size", "key", "backup"); a result
  opens its page and the setting glows for a moment. On desktop, / focuses the search.
- **Languages (2026-10-20):** add another language ("Learn another language"), or remove one with
  its bin: after "Remove Spanish?", the language and everything learnt in it (texts, words, decks
  and cards, audio and audiobooks, songs, journal, progress, its offline dictionary) are deleted
  from the device and their room freed. The last language can't be removed; adding a removed
  language again starts it afresh.

## Music in Sonus — learning through music (2.0-4, in Sonus since 2.0-4b)

Sonus is "listen and sing". Since 3.0-3 it opens on **Library** (what you listen to: recently
played songs, episodes and stations together, your songs, the podcasts you follow, new episodes, your own
files), then **Music** and **Podcasts** for finding more. The music room still goes by Cantus
inside (its deck is "From Cantus").

**Sonus and Sonus+ (2026-10-20).** Sonus is your Library, Audiobooks and the Radio. Sonus+ (the room
below, first called Cantus) is where you find things to listen to: Today, Music and Podcasts.
Library is laid out like Apple Music's: your kinds of things with counts (Songs, Podcasts,
Episodes, Audiobooks, Stations, Your audio; each opens its own page or tab), then Recently
played, Recently added and New episodes. Episodes open and play inside Sonus+; the now-playing bar shows whatever plays.

**Cantus, a room of its own (design handoff, 2026-10-20).** Music opens Cantus full screen:
no Lingua sidebar, tab bar or mini player; always dark, whatever the theme; the open song's
artwork colours its glow. Four pages: **Today** (a song for today, most played now, recently
opened, artists, styles), **Explore** (Explore today with Surprise me and shuffle, the style of the
day, styles, artists, your Spotify), **Library** (your songs, recently opened, most played by you)
and **Search**. On desktop they are pills along the top with a search field; on a phone, a tab
bar at the bottom. The **player** fills the screen (`/cantus/song/…`); the chevron folds it away
and the song plays on: a glass **now-playing bar** shows it with the line being sung, play and
pause, and its progress; tap it to open the player again. A YouTube, Spotify or Apple Music player
stays on screen, small above the bar, while it plays (their terms ask for a visible player). For
YouTube and Spotify the player adds the song's progress and a line back / play / a line on. The
**X** leaves Cantus for Sonus › Music: "Back in Lingua · Cantus closed. The song keeps its place."
Open Cantus brings the song back in the bar, where it was. Song games open over the room.

**Search in Cantus** asks Apple (the language's store and two more), LRCLIB and your Spotify at
once, live as you type, and opens the whole catalogue of the artist you name or who sings the song
you name, since Apple's search leaves some artists' own recordings out. A typo is put right from
what comes back ("Showing results for baile inolvidable", with "Search for … instead"); the
original comes before covers, karaoke and other versions. A top result (the song, or the artist
for their name), songs (each with its 30-second preview), artists and albums, chips to keep one
kind, Enter to open the top result; with the field empty, recent searches and styles to browse.

**Whole songs.** A song opened in Cantus finds a whole recording by itself on YouTube (with your
own key from Ordo › Music, or through public Piped and Invidious servers without one), official
audio first, the right length, never live, covers or sped-up. "Playing from YouTube · Official
audio"; "Not this one" finds the next. Paste a link from YouTube, SoundCloud, Spotify, Apple Music,
Vimeo, Dailymotion or Bandcamp. SoundCloud's player tells the lyrics where it is, like YouTube's.
Apple and Spotify say "30-second preview". Changing source carries on from the same place.


- **Find any song** in the language you're learning (Apple's catalogue; tap the artwork for a
  30-second preview), or explore (3.0-6): Music is shelves of songs to tap. Recently opened,
  **Explore today** (songs from three of the language's artists, new each day, shuffled on
  request, with a round button on each for the 30-second preview and "Surprise me" for a random
  one), this week's most played songs sung in the language, your songs, **Most played by you**,
  a **style of the day**, then about ten styles a language, your Spotify likes and artists picked
  for learners (clear, medium or fast).
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
- **Your songs:** save with the heart; they have a shelf in Music and in Library. With your own
  Spotify app (Ordo › Music explains it), your liked songs sung in the language too.
- **Learn it (song lessons):** the language first, the song as the bonus. Words from the song
  worth learning at your level (what does it mean?), each word back in its line, a form and the
  word it comes from, the line in English, then the verse's lines in order. At the end the words
  can be added to your cards with the line they're sung in. The lesson counts as Ludus.
- **Everywhere else:** Home suggests a song for today; saved lines go to the "From Cantus" deck and
  their cards play the line again (with a YouTube or Spotify link); lyrics open in Codex as a text;
  Ratio counts songs and time with music; Iter marks the first song and every 10, 25, 50 and 100.

## Radio (3.0-5, Sonus › Radio)

- **Live stations in the language** from radio-browser.info, an open directory kept by listeners:
  the most listened first, a search by name or style ("jazz", "news", a city), and the countries
  where the language is on air (the flag's country first). Only secure streams this device plays.
- **Only stations really in the language** (5.2-2): a station stays when the language is its only
  or first one, in a country where the language is spoken (a station whose only language it is
  stays abroad too), and its name fits; one station copied under many flags shows once. Spanish
  went from 44 countries to 34, Russian from 30 to 15, German from 11 to 7. **Not in Spanish** on a
  tile hides a station on this device.
- **Laid out for the desktop** (5.2-2): the map and a **tuner** sticky on the left (a dial like an
  old radio's, the countries along it with flags and station counts; drag it, turn the wheel or
  use the arrow keys and it snaps to each country while the map flies there), the stations on the
  right as **tiles** (the logo large, or the initials on a colour of their own; the town; up to two
  kinds; moving bars on the one playing) in **sections**: Your stations, Talk and news, Music,
  Regional, Everything, each a row of eight with **See all** (kind chips, sorted by most listened,
  name or sound quality).
- **A real map** (3.0-6): the world's countries in the app's colours, light and dark. Where the
  language is on air the countries are tinted, each with a node and its number of stations, sending
  out rings like a signal; nodes close together join (tap to fly in until they part). Tap a
  country, its node or its chip and the map flies there and lists its stations; closer in, the
  towns with stations glow, and a tap lists theirs. Drag, pinch, scroll or double-tap to zoom, the
  +/− buttons, "Where it's on air" and "The whole world". The station playing pulses.
- **A full-screen station** (3.0-6): tap the mini player or the station on air. Artwork, name,
  place, what's on, the heart, your stations before and after, the station's site, and **commute
  mode** (big buttons: your stations one after another, play and pause, save, live text, and the
  latest line in large type).
- **Live text** (3.0-6): turn it on and what's said is written out as it airs, about fifteen
  seconds behind, every word to tap, hover and save as in Codex. Whisper does it (Groq with your
  free key, or on this device); the station is streamed a second time for it, and only stations
  whose servers allow it can be written out (the page says when one can't).
- **Your stations:** a heart keeps a station; favourites and stations played lately are at the top
  of Radio, favourites in Library, and stations played lately in Library's "Recently played".
  Synced between your devices.
- **Plays like everything else in Sonus:** the mini player says "Live" (or the song, when the
  station shares it), the lock screen plays and pauses, and the time counts as listening.

## Voices and your devices (3.0-4)

- **Natural voices:** a speaker button on words (the word drawer), on selected phrases and on
  flashcards reads them aloud in the accent of the language's flag (Castilian or Mexican Spanish,
  Brazilian or European Portuguese). With a free Gemini key it's one of Gemini's natural voices,
  each word made once and kept on the device. Without one (5.1-3c), a common word in the six core
  languages is said by a real person: a Lingua Libre or Wiktionary speaker's recording on Wikimedia
  Commons, in the flag's accent when there is one, fetched the first time and kept on the device;
  everything else by the best of the device's own voices for exactly that accent (Edge's online
  natural voices first, the old robotic ones last); otherwise no button. Settings › Languages ›
  Voice says which voice reads the language, plays a sample, lets you try and pick another Gemini
  voice or another of the device's voices, says how to get a natural voice when only a robotic one
  is there, credits the recordings heard (speaker, licence, link), and turns reading aloud off.
- **A natural voice made on the device (5.1-3c):** for French, Spanish (Spain or Mexico), German,
  Russian and Mandarin, Settings › Languages › Voice offers Piper's open voices (63 MB each, the
  size said first). Once downloaded they speak sentences and words without the internet; long
  text starts after its first part is made, and what was said is kept. Hear, Use or Remove each.
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

## Colloquium: talking with AI (3.0-6)

- **Where:** in the desktop sidebar (Alt 8); on a phone from Home's "Talk today" card or the
  occasional "Talk for ten minutes" step.
- **A scene and how it goes:** ten scenes from the café to a friendly debate (those above your
  level say from when they work), voice or text, correct my mistakes, slowly and simply, your
  words due for review, and Grammatica's next topic. The prompt is written in the language (the
  core twenty; English naming the language for the rest) and shown with Copy.
- **Open it in your AI:** ChatGPT, Claude, Gemini or Copilot opens as the prompt is copied; paste
  it, send it, and switch to voice there. Nothing is sent from Lingua.
- **Chat here** (with a Groq or Gemini key in Ordo › AI): the AI starts the scene; tap any word
  of its lines for the meaning, hear them, show the English, and add the words it suggests to
  learn. Your lines come back with corrections under them. Chats are kept, backed up and synced,
  to carry on or delete.

## Mundus, the guide (3.0-7)

- **A friend who points the way.** Mundus looks at your last seven days (reading, listening,
  watching, words, writing), your level and what you enjoy. It writes a short note on your week,
  and a compass shows the week's mix, with the needle pointing where to go next.
- **Next for you:** three steps, each with its reason:
  - something to enjoy in the part of your week that's been quiet, at your level;
  - something to try away from the screen;
  - a way to grow: your next Grammatica topic, a room you haven't tried, or a stretch one level up.
  Each opens inside Lingua.
- **Your path:** four stages, from Starting out (A1) to Going deep (B2+). It shows where you are,
  what this stage opens up, and a taste of what comes further along.
- **Things to try:** small challenges suited to your stage, with a tap to mark one done. More open
  up as your level rises. The full list, with the streak, is at Mundus › Things to try.
- **Explore everything:** the shelves below, for every room.
- **Elsewhere:** Home shows Mundus's first suggestion.

### What Mundus explores

- **Explore** (Mundus's first tab): a pick of the day and a challenge to try today, then a shelf for
  every room, scrolling sideways. Each item opens inside Lingua:
  - **Watch (Visio):** series, films and YouTube channels. A series opens Visio's title sheet,
    with your services and "Add its subtitles".
  - **Read (Codex):** books for the Codex wishlist, and the language's news, opening Codex › News.
  - **Listen (Sonus):** podcasts to follow, LibriVox audiobooks that open as a book in Sonus, and
    free courses.
  - **Radio and music (Sonus):** the most-listened stations, opening on their page, and artists,
    opening their songs.
  - **Words (Thesaurus):** the ready-made decks.
  - **Play and look up:** games and dictionaries.
  - **Beyond the app:** challenges you haven't done yet.

  "For my level" keeps to your level and one above it. "See all" opens the full lists.
- **Ideas from Mundus:** Codex, Thesaurus, Sonus and Visio each end with a line that opens Mundus
  at their own shelf, so you find it from wherever you are.

- **Picks:** for each of the twenty main languages, series, films, books, music, podcasts, YouTube
  channels, video games and dictionaries, chosen by hand, each with the level it suits (A1 … C1, in
  green when it's at your level) and why it helps. Filter by kind and by level.
- **Every pick opens where it lives:** Netflix, Prime Video, Apple TV, HBO Max, public broadcasters,
  YouTube, Spotify, Apple Podcasts, Goodreads, Amazon (your country's store), Steam, or the
  dictionary's site. Books: **Add to Codex** (wishlist). Podcasts: **Follow in Sonus**. Series and
  films: **Add its subtitles** (Visio's Subtitles-only, named after the pick) and **Find
  subtitles**. Music: **Songs in Sonus** opens the artist in Sonus › Music.
- **Beyond the app:** playful challenges (your phone in the language, one app at a time, a game,
  a keyboard, Siri, labels at home, a recipe, a walk thinking aloud, one song all week, Spotify,
  the radio while cooking, a café order, table words, counting, voice notes, a language partner…),
  plus a few per language (a tongue twister, a custom, the Roman date). Cards flip to show how, per
  device where it matters; mark one done, and a streak counts the days in a row.
- **On Home:** a card that offers a challenge one day and a pick at your level the next.
- Beta languages get Beyond the app and Visio's live lists; picks by hand are for the main twenty.

## Grammatica (3.0-8)

- **Grammar topics** for Spanish (28), German (23), French (21), Russian (17), Arabic (16) and
  Mandarin (15), A1 to B2, in units (First steps, then the cases, the past, going further).
- **A short grammar for tier 2 languages:** Italian (9 topics), Portuguese (7), Dutch (7),
  Swedish (6), Norwegian (5), Greek (5), Hungarian (5), Turkish (5), Japanese (4), Indonesian (3),
  Korean (3) and Latin (2), A1 and A2, with the same lessons, review and placement.
- **Next up:** the first topic you haven't learned at or below your level, at the top.
- **A topic page shows examples first** (each one can be played aloud), then the rule in a few
  lines, side-by-side comparisons of things that are easily confused (ser and estar, wo and wohin,
  了 and 过, imparfait and passé composé), tables, a "watch out" line and more sentences.
- Every sentence is a real one from the language's data, and every rule is checked against a named
  source, listed at the foot of the page.
- Arabic is shown fully vowelled and right to left; Mandarin in Simplified characters.
- **Lessons in five steps** for every topic: recognise the right sentence (or the form you hear),
  fill the gap (or complete the table), type the form, put the words in order (or tap the wrong
  word), then build the sentence from its English. 80 % right first time moves you on; after step
  5 the topic is learned. A mistake shows the right sentence and the rule in one line, and comes
  back at the end of the lesson.
- **Rings:** each topic's ring fills a fifth per step; it gets a check once learned and a gold
  crown once most of its items are well remembered.
- **Review and Lightning:** grammar items come back for review like cards (Review in Grammatica);
  Lightning is a 60-second round of quick gaps with your best score kept.
- **Lessons your way:** a gear opens the setup sheet (length 5–20, Classic or Zen, which
  exercises, typing, sounds, vibration). Right answers in a row light a combo, with a burst at 3,
  5 and 10; a perfect lesson or a new best gets confetti. "Can't type this now" swaps typing for
  choices.
- **Examples first:** a lesson opens with "See it" (the sentences, each with a speaker, and the rule
  beside them on a desktop). After a mistake, "See the rule" opens the whole topic in a side
  panel without leaving the lesson. A lesson brings in up to three items due from other topics,
  and ends with "What went wrong", each missed sentence with its reason.
- **Your own sentence (with an AI key):** at step 5 and in practice, write a sentence using the
  topic; the AI corrects it and explains in a line. It's practice and moves no schedule.
- **Grammar from everywhere:** a form in the word drawer shows "Why this form?" with its topic
  (where the dictionary describes the form); Home shows the next topic or what's due; the end of a
  Ludus lesson offers the next grammar topic.
- **Check what I know:** a two-minute placement, two quick gaps per topic (up to a dozen topics, up
  to one level above yours). Topics with both right are marked learned.
- **In the numbers:** Ratio's Overview has a Grammar panel (learned, mastered, level, topics a month,
  the topics that need work); Tabula adds your grammar level to "In Lingua".

## Alphabets and writing (3.0-8)

- **The alphabet** for Russian, Greek, Arabic, Japanese (hiragana and katakana), Korean,
  Mandarin (pinyin, tones and the first characters) and Georgian, in Grammatica › Alphabet: a chart by group,
  each letter with its sound, name and real words to hear. Arabic shows each letter at the start,
  middle and end of a word.
- **Short lessons per group:** meet the letters, match sound and letter both ways, match pairs,
  read real words built only from letters you know, find Arabic shapes in a word, then trace each
  letter and write it from memory with a finger, pen or mouse. 80 % right first time and the
  group's ring fills.
- **Letters come back for review** like cards, and practice mixes the letters you've learned.
- **Offered first to beginners:** the alphabet card sits on Grammatica, and on Home at A0 and A1.

## Visio › Services (3.0-7)

- **Your services and country:** tap the services you have (the big ones, and the free and local
  ones that suit the language); the country comes from the device and can be changed.
- **Live lists, with a free TMDB key:** series and films made in the language that stream on your
  services in your country, with posters; a title shows its story (in the language when TMDB has
  it), which of your services has it (each opens the service), other ways to watch, and Add its
  subtitles. Mundus's picks show where they stream for you too. The key stays on the device.

## Lingua 5's rooms (5.1-1 with 5.2-1)

- **Cursus** (`/cursus`): Course · Grammatica · Alphabets · Typing, a tab strip with 1–4, opening
  on the tab used last (first time: Course for the six core languages, Grammatica otherwise). The
  course is the trail below; typing is the next point.
- **Typing** (Cursus › Typing, the six core languages): keybr-style practice in the language's
  letters. Six letters to start, lines of pronounceable made-up words, the next letter when every
  letter is fast and accurate enough (30 words a minute by default, adjustable), the slowest one
  practised most. Your keys type the language's layout (AZERTY, QWERTZ, Spanish, ЙЦУКЕН, Arabic)
  without installing it, or your own with "I have this layout"; a keyboard on screen shows the
  next key and the finger; a card for each new letter says how to type it. Mandarin: pinyin
  letter by letter, then characters (type the pinyin, pick 1–5). The time counts as writing.
- **Sonus et Visio** (`/sonus`): + Listen and + Watch side by side; Library · Audiobooks · Radio ·
  Streaming and Sonus+ at the end of the strip. The library: a sticky rail with All · Listen · Watch
  and the categories (Songs, Podcasts, Episodes, Audiobooks, Stations, Your audio, Films & series,
  Videos); Continue (audio and video, with what's left), Recently played, Recently added, New
  episodes, To watch. One calm card when it's empty.
- **Mentis** (`/mentis`): Mundus · Sermo · Diarium with Today's prompt on the right of every tab:
  something to write and something to talk about from this week. The guide has a Speak lane
  (for those who like speaking): "Talk about *Lupin* for five minutes" opens Sermo on that topic,
  "Write three lines about …" opens Diarium with it as the day's prompt. A Diarium entry has
  "Talk about this".
- **Settings** (Ordo's old name, `/settings`); a narrower sidebar; new installs follow the device's
  light; the "Ideas from Mundus" lines are gone.
- **Card width:** Thin · Normal · Wide in the card look (Settings › Flashcards and the study
  screen's Aa), with a scale preview; a deck can have its own in its settings.

## Lingua+ and Lingua+ Max (5.1-2a)

- **Three plans.** Free: Codex, Thesaurus (unlimited decks and flashcards, Discover), the library,
  audiobooks, the radio, alphabets, Mundus, Diarium, Ratio and every setting. **Lingua+** (€24.99
  once): Ludus, Sonus+, Streaming, the course, Grammatica, typing, Sermo. **Lingua+ Max** (€5.99 a
  month or €49.99 a year): all of Lingua+ plus AI with your own free key (AI translation, Explain in
  context, diary checking, automatic dictation, natural voices).
- **Never pushy.** A locked tab or button has a small "+" (or MAX) chip; a locked room shows one
  calm card; a locked lesson, Sonus+ or a chat goes back to its room with the plans open. The
  plans sheet: Free, Lingua+ ("Best value") and Max side by side, "Continue free" as clear as the
  buy buttons.
- **The mark beside the Lingua name:** "+" for Lingua+; for Max the same "+" (the user asked to keep it), then a hairline and MAX in small,
  spaced capitals in the palette's accent, shaded like foil, fading in once (the user asked for it
  more minimal and luxe). The same quiet MAX, in a hairline outline, marks Max everywhere else.
- **Settings › Lingua+:** your plan and since when, Max's paid-until date and renewal, Manage
  subscription (Stripe's page), Copy licence, Restore with a licence key, and the plans.
- **Settings › AI** says the key works with Max; every AI feature without Max says it comes with
  Lingua+ Max and opens the plans, instead of asking for a key.
- **Test mode** until the user sets up Stripe and the licence server (server/licence/README.md):
  buying switches the plan on this device and charges nothing; Settings › Lab › Pretend a plan acts
  as Free, Lingua+ or Max. Installs from before the plans act as Max, so nothing disappears.

## Thesaurus and Ludus, 5.1-3b

- **The room:** My decks, Discover and Dictionary as header tabs (1 2 3); search (/), sort, and New
  at the right of the same row. Sort's menu also switches My decks between a list and cards.
- **My decks as a table:** each deck's picture in its own colour, name, folder and cards; today's
  new · learning · to review as pills (sage, amber, blue); when it was last studied; Study and Ludus
  on hover, ⋯ for rename, move and delete. Folders fold and add up what's inside them.
- **Today, in a rail:** on a wide window a sticky card beside the decks: a ring split into new,
  learning and to review, one big Study with Ludus beside it, and the week ahead.
- **Your vocabulary journey** sits under My decks.
- **A deck's cards** as a grid of small cards, five across: the word, its stage (new, learning,
  young, known well) and when it's due; hover and it turns over to the meaning.
- **Ludus, more varied:** each lesson mixes its exercises by weight, never the same kind twice in a
  row and none for more than about a third of it; a new card is met gently first (meaning, right
  or wrong, listening, or the pairs round) and comes back a few exercises later to be said or
  typed. Cards without a sentence borrow one from the dictionary, so gaps, word banks and
  translations come up for them too.
- **Even answers:** Ludus's answer cards are all one height; long words get smaller type rather
  than breaking, and four short answers sit in one row.
- **Deck settings** in a panel on the right, with the deck's card drawn live at the top: Daily
  limits; Order (direction, and new cards most common first or shuffled); Card look (front, width);
  Ludus (leave exercises out of this deck's lessons); Danger zone (Forget progress, Delete deck).
- **A much larger Discover:** 47 ready-made decks on five shelves: Path (the most common words,
  band by band), Everyday (clothes, the city, shopping, health, sport, hobbies, technology, the
  kitchen, directions, the restaurant, the hotel and the first fourteen), Fun (coffee shop, film
  night, football, love and dating, compliments, exclamations, festivals, the sea, space, fairy
  tales), Grammar (essential and irregular verbs, connectors, question words) and Made for you
  (words that look like English; the words you looked up in songs and shows).
- **Small cards:** each deck's picture in its colour, its name, its size and how much of it you
  know. Search finds a deck by its name or by any word inside it; sort by suggested, most words or
  easiest first; group by kind or by level.
- **Add to…:** the + on a card (and "Add to…" in a deck's booklet, also for a stop on the journey)
  adds it to My decks or to a deck you have; words already there are skipped, and it says how many
  were added.

## Codex, 5.1-3a (so far)

- **Clicks:** one click marks a word Known (a Known word Unseen again); a double click marks it
  Learning (a Learning word Unseen). The same in lyrics, transcripts and subtitles. K, L and X still
  work on the hovered word.
- **The word panel:** sound, pronunciation, "#437 most common · A1" and **+ Deck** in one row; sound
  buttons on the examples; Open dictionary by the Dictionary heading; "In context" and "Explain in
  context" with Max and a key.
- **Sentences at once:** **S** translates the hovered word's sentence. The sentence you rest on is
  translated ahead (with Max and a key, every sentence coming into view), so it shows at once.
- **Words in "T":** Known, Learning and Unseen each get a style (none, line, dots, mark; Known also
  faint) and one of six colours, with a live sample and "Back to the usual look".
- **Meanings that fit the form** in Spanish, French, German and Russian: "tengo" I have, "entiende"
  understands, "años" years, "könnte" could, "сказал" said; the commonest words hand-checked; a
  function word never takes a rare sense from its neighbour.
- **Adding to the library:** a drop area with a drawing per kind and one button; the cover appears
  once the file is read. **Photos of a printed book's pages** become a text on this device (OCR),
  each photo beside its page's text. The reading level on a small scale.
- **In your own words:** after reading (the end page), listening and watching (the players), a
  panel to retell it, carry a text on, keep one thing you heard or describe a scene you watched,
  checked by AI with Max and a key, kept in Diarium, or copied for someone who speaks the
  language. The course's Write lesson offers the unit's task, a scene, or a question to answer.
- **The course** (Cursus › Course, Lingua+), in Spanish, French, German, Russian, Arabic and
  Mandarin: twelve units from A1 to B1, each named by what you can
  do after it (say hello, talk about yourself … give your opinion), with six lessons: words,
  phrases, the grammar they need, speaking (the microphone compares what you said word by word),
  writing (AI corrections with a key, a model answer, "Ask a speaker"), and a unit check to pass
  or to test out with. The course is an adventure trail (2026-10-25): round lessons winding down
  the page in each unit's colour, a line that fills as you go, a banner opening each unit and a
  trophy (its check) closing it, A1, A2 and B1 as landmarks, the next lesson bouncing where you
  are (the page opens there). A click on a lesson says what it is and starts it; units ahead
  look locked and offer their check to jump there. The next lesson is also on Home.
- **Discover** (Codex › Discover): Wikipedia's most read today, the latest news, free classics from
  Project Gutenberg and Wikisource (search titles and authors), each one click into the library with
  its chapters; links to free picture-book and comic libraries.
- **Check yourself** at the end of a text: four or five quick questions from the text (a missing
  word, which word means…, a sentence back in order), two more about the story with Max. 1–4 and
  Enter; the round counts in Ratio.

## Home, Today (5.1-2c)

- **A square grid.** "Good evening, {name}" with the date, the language and level → goal above it;
  a quiet Lingua+ button top right on the free plan only.
- **Today:** the minutes so far in serif numerals ("8 of 15 minutes") and a ribbon across the card,
  split by room in the rooms' tones (reading, listening, watching, writing), with a legend. Under
  it **Next up**: up to four rows, one click each (the book you're reading, cards due, the episode
  or film half-done, today's song, today's diary prompt, a way in for what you enjoy).
- **Beside it** the week (opens Ratio) and four numbers two by two: days in a row, words known,
  minutes this week, cards due. Both columns end on the same line.
- **First steps** for a new learner run across the page as five tiles, until done or hidden.
- **Cursus and Mundus** in equal columns: the next grammar topic (and the alphabet's next group,
  for beginners in a script of their own) and Mundus's suggestion.
- **Home layout: Today / Classic** in Settings › Look and feel brings back Home as it was before
  Lingua 5.
- **Language touches** (Settings › Look and feel, on): a little of the studied language in the
  design, for the six core languages. Room titles, Home's greeting and empty states in a face of
  the language (Garamond for French, Alegreya for Spanish, a clean grotesque for German, PT Serif
  for Russian, a Song face for Mandarin, Amiri for Arabic); one ornament (a fleuron, a tile strip,
  a straight rule, a thin red rule, a vermilion seal, an eight-point star) on the end page and in
  empty states; the accent leaning a little toward the language's colour; quotes in the
  language's own marks (« », „ “); ¿ in Spanish titles that ask. Your theme and reading font stay.

## The first start (5.1-2b)

- **Ten pages, building up.** Your name ("First things first"), "Welcome, {name}" with a funny line,
  and "See what Lingua can do" (three things in fine line drawings); then seven steps with dots:
  the language, your level, the languages you speak, why, your goal, your study light, the plans.
  Back works everywhere and keeps what was chosen. Every page fits one desktop screen except the
  language page, whose full list peeks in under the map.
- **What language will it be?** The world, big and wide, drawn without dots. Hovering a country
  lifts it and shows its languages; clicking it centres it and opens a panel with its languages
  (official first), and the panel's other tab and the search have every language. Hovering or
  choosing a language tints where it stands: solid where official, lighter where regional, hatched
  where a minority or historical. The language chosen is named on the map and on the button. The
  six core languages sit under the map, every tier below them.
- **Where languages are spoken** comes from Unicode CLDR (`scripts/lang-data/territories.ts`), with
  Latin, Ancient Greek, Old Norse, Sanskrit and Yucatec Maya added by hand. Twelve new flags and
  emblems: the senyera, the ikurrina, Frisian's hearts, the Esperanto star, Hawaiʻi, Tino
  Rangatiratanga, Gurmukhi, Serbo-Croatian's two scripts, Devanagari, a rune and Maya numerals.
- **So, how far along are you?** Six rows: "A0 · Nothing yet", then five real sentences in the
  language, A1 to C1. The one you pick shows its English and its new words as the reader would;
  "Skip the N most common words" sits in the same card.
- **Which languages do you already speak?** A card for each, saying hello in it, with its level as
  signal bars or Native. Adding one (a search of every language, or one-click flags) asks how well
  straight away. They go into Tabula; the first native one Lingua knows is the translation language.
- **Why do you want to learn {language}?** Six tiles, any number, and a line that answers each pick.
- **Set your own goal.** The level to reach as milestones on a path, minutes a day on a slider with
  named checkpoints, and about how long that takes, from the usual hours of study per level.
- **Choose your study light.** Light and Dark as two big pages of the app; choosing one opens its
  palettes under it, and "Follow my device" opens both.
- **Unlock all of Lingua.** Lingua+ and Max as two big cards with what each opens (Max dark with the
  gold MAX, monthly first), free as one clear line with "Continue free".

## Design notes (Settings › Lab, 7-0b)

- **For reviewing the design, off for learners.** Settings › Lab › Design notes › "Show the notes tool" puts a small
  bar in a corner of the window: how many notes are on this page, Pick (Alt N), Notes, Copy, and a button that moves
  the bar to the next corner.
- **Pick:** the element under the pointer gets a thin terracotta outline and a label naming it ("button “Continue
  reading”"); a click opens a note card beside it instead of doing what the element does. Ctrl Enter saves, Esc
  cancels; picking carries on after a save until Esc or Alt N.
- **Pins:** each note on the page is a numbered dot where the click was; it follows its element on scroll and resize,
  dashed when the element has gone. A click opens it to edit, mark done or delete.
- **The panel:** this page's notes, or all of them by room and page (with "Go there"); Copy for Claude; Clear done.
- **Copy for Claude:** Markdown by room and page; each note with the element's name and CSS path, the note, where it
  was, the window size, the light and palette, the language; the version and date at the top. If the clipboard
  refuses, the Markdown is shown to select.
- **Kept on this device** (`lingua.designNotes` in localStorage): never synced or backed up; Reset clears them. The
  first start's notes stay its own, though it shares "/" with Home.

### More detail (7-0c)

- **Kind and priority:** chips for Layout, Spacing, Size, Colour, Type, Words, Remove, Add, Behaviour, Question, and
  Must, Should, Could. Pins with Must have a ring, Could ones are sage; the panel shows each note's priority and kinds,
  with a count by priority at the top.
- **The right element:** ↑ and ↓ while picking choose the element around or inside (the label says how far up); the
  card's Bigger and Smaller do the same. The chosen element stays outlined while the card is open.
- **Areas:** Shift and drag while picking marks a rectangle, kept as fractions of the smallest element around it, so it
  follows the page; drawn dashed, with the pin at its top right.
- **New words:** "Edit the words" for an element with text; written out as “old” → “new”.
- **Tweaks:** add type size, weight, line height, letter spacing, typeface, colour, background, padding, margin, gap,
  corners, width, height, opacity or shadow; the value now is filled in, the wanted value typed (a bare number is px,
  `--ink` is the token); Preview shows them on the element until it is turned off or the card closes.
- **What it is:** a fold-out with the tag, the React component around it (dev server only), classes, size, type,
  colours with their token names, border, padding, margin, gap and corners. All of it goes into the Markdown.

## Sandesigner 1.1 (7-0e): a design canvas for every app

Its own tool in `sandesigning/` (no React, no dependencies), served beside Lingua at `/lingua./sandesigner/` (with `/lingua./sandesigning/` preserved).
[sandesigning/README.md](../sandesigning/README.md) has everything; in short:

- **The canvas:** frames in device sizes, rectangles, ellipses, lines and arrows, pen, highlighter and eraser, text in
  any font (system, 27 Google Fonts, or one on the computer), sticky notes, numbered design notes, widget outlines
  (22 kinds, for laying out a screen), 153 icons, pictures and cut-outs. Select, Shift, marquee, Alt-drag to copy,
  resize with handles, snapping with guides, a grid, layers you can drag, hide and lock, align and space out, undo.
- **Screenshots and templates:** paste or drop any app's screenshot (phones too); in a web app, the camera captures
  the page with every element's box: a note knows which element it's on, and Alt-click lifts an element out of the
  screenshot to move it. Seven starter templates; your own templates and pictures in the library.
- **Keys for everything & Mac/Windows symbols:** one key per tool, Ctrl/⌘ K finds any action, ? lists them all, tooltips show them.
  Both Sandesigner and Lingua Settings allow choosing between Auto, Mac (`⌘ / ⌥ / ⎋ / ⏎`), or Windows (`Ctrl / Alt / Esc / Enter`) command representations.
- **Export and import:** the brief for AI (Markdown: notes by priority with what they're on, and every frame's layout
  in numbers), a picture (copied or PNG, each frame, SVG), the `.sandesign` file; open `.sandesign` files and paste
  between canvases. Canvases are kept in the browser (IndexedDB).
- **Everywhere:** the hosted page or the downloaded `sandesigner.html` (offline); `sandesigner.js` (and `sandesigning.js`) for any web app
  (a Design button and Alt Shift D) or as a bookmark; `SANDESIGNER.md` to drop into any project with one prompt, so
  the AI there sets it up and learns to read briefs; `FORMAT.md` for any model.
- **In Lingua:** the design notes bar has **Canvas** (Alt Shift D): the page is captured onto a canvas with its notes
  pinned where they are, priorities, kinds and elements included. The bar can collapse into a single pen icon button
  and supports an optional "expand on hover" behavior. Settings > Keyboard also offers the Mac/Windows command symbols toggle.

## Device lab (Settings › Developer, restructured in 7-0d)

- **A developer's tool:** a status strip (version, build, language, plan, light, what's on) and six parts on a rail:
  Design notes; Flows; Look; Layout; Pieces; Device and data. `?tab=` keeps the part in the address.
- **Flows:** replay the first start from the beginning or any page, with the language already chosen, over the app;
  nothing is saved, buying is off, the light chosen in it is put back, Esc or "Leave the replay" ends it. Pretend a
  plan. Home's first steps shown again.
- **Look:** light, every palette as a swatch, motion and the language touches, the real settings.
- **Layout:** a 4 px grid with an 8 px beat and the 720 px measure on the page's column; outlines on every box; both on
  every page for the session, with a "Lab" chip at the top to turn them off. The check sizes (1280 × 800, 1366 × 768,
  1440 × 900) resize the installed app's window, or open a window that size from a tab.
- **Pieces:** a toast of each kind, drawers, long-press, words and scripts, sound, flags. **Device and data:** this
  device, storage, the translation and AI caches (cleared without touching learning data), smoothness, sharing.

## Settings: Simple and Everything

- **Simple** (the default): one calm page of essentials in soft cards: your language, the look, reading (text size,
  page style), study (new cards a day), comfort (motion, tips, lesson sounds) and your data, with "Show everything"
  and a quiet link to the developer's tools. A link to a group or a search result still opens that group in full.
- **Everything:** every group as before, and more to fine-tune: at the end of a text, Check yourself, the questions
  about the story and In your own words can each be turned off (Reading).
- **Developer stands apart:** its own group under "For developers", below the rest: the Device lab, design notes and
  the FPS monitor.
- **Tips and explanations** (Look and feel, and Simple › Comfort): off hides the small lines that explain a setting
  or a card (`data-hint`), everywhere; status lines and warnings (last backup, what a reset deletes, where a key goes)
  always show.
