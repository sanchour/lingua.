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

Built as prompts, each checked, committed and pushed on its own, so the live app got better step
by step. Fixes to what already existed came first, because they make every later feature feel
better. On 2026-10-17 Lingua 2.0 was closed after 2.0-4b: everything still open moved to
**Lingua 3.0** (below), to be built in a new session.

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

### 2.0-3 · Ordo: settings that are easy to find your way in ✅
- [x] **One overview, then one section at a time:** Ordo opens on a short list of groups (Look and
      feel, Reading, Study, Listening and watching, Languages, AI and keys, Backup and reset,
      About), each with a one-line summary of what is set. Choosing one opens just that section.
  - Phone: a grouped list like the iPhone's Settings; a section opens as its own page with a back
    button. No more one long page.
  - Desktop: the groups stay in a side column, the chosen section beside them.
- [x] **Search** over every setting by name and words ("font", "key", "backup"), jumping to it.
- [x] Each setting says in one line what it does; links from elsewhere (for example "Open
      settings" from a missing AI key) land on the right section.
- [x] Checked on a phone and on desktop, light and dark.

### 2.0-4 · Cantus: learning through music, a room of its own ✅
- [x] **Search** any song in the language (Apple's free search: artwork and a preview). Lyrics come
      from LRCLIB (free, open, often synced to the music).
- [x] **The song page:**
  - Lyrics light up line by line with the music: the Spotify player when you're signed in,
    Apple Music, or the preview.
  - Every word works as in Codex.
  - A translation under each line (AI or the free translators), shown, blurred or hidden.
  - Save lines and words.
- [x] **Your songs:** songs you save in Lingua, and, with your own Spotify app ID (a free developer
      app, explained step by step), your Spotify liked songs in that language.
- [x] **Discover:** artists, albums and styles per language, picked by hand, with charts where
      available.
- [x] Lyrics can be opened in Codex as a text.
- [x] **A room of its own, not a tab:** Cantus sits beside Codex, Sonus and Visio in the sidebar
      and the tab bar, with its own icon and colour, and is part of the whole app:
  - Home suggests a song for today; "music" is one of the things you can enjoy in onboarding.
  - Words and lines saved from songs are cards that replay their bit of the song.
  - Ludus gets song exercises: fill in the lyric, put the lines in order.
  - Ratio and Iter count songs and minutes. (Mundus links to artists arrive with Mundus, 2.0-8.)
- [x] **Aesthetic:** the album art sets the page's colours; the lyric sheet scrolls with the song,
      the current line large and clear; calm, simple controls that work one-handed on a phone.

### 2.0-4b · Music moves into Sonus; Apple Music; lyrics from more places ✅
- [x] **Music lives in Sonus:** Sonus is "listen and sing", with three tabs: **Music** (first),
      Library and Podcasts (podcast discovery now sits inside Podcasts). The Cantus tab is gone, so
      the iPhone tab bar has five tabs again. Songs open at `/sonus/song/…`; old `/cantus` links
      still open them, and the Spotify return address `/cantus/spotify` stays as it is, since
      learners entered it in their own Spotify app. The Music room is one page: your songs, recently
      opened, this week's charts, your Spotify likes, then artists and styles. Its headings keep
      the rose colour.
- [x] **Apple Music:** a song from Apple's catalogue plays in Apple Music's own player on the song
      page (signed in to Apple Music in it: the whole song; otherwise a preview). The player tells
      the page nothing, but pressing it moves focus into it, so a press starts or pauses the
      lyrics. Its artwork and title open the song in Apple Music without counting as a press. On a
      phone, "Play in Apple Music" opens the Music app; back in Lingua, "Tap the line you're
      hearing" waits, and the lyrics run on from that line.
- [x] **Find the place by tapping:** for Apple Music and music playing anywhere, the target button
      turns on "Tap the line you're hearing": the next tap on a line starts the lyrics there.
- [x] **Lyrics from more places:** LRCLIB first (often timed), then lyrics.ovh (free, no key, plain
      text). Genius can't be asked from a browser without breaking a rule: its API needs a key, the
      only header way is refused by Genius's firewall (the browser's preflight gets a 403), and a key
      in the address is not allowed here. So the song page has "On Genius" (its search) and "Paste
      them yourself"; "Find other lyrics" also has lyrics.ovh. Under the lyrics: where they came
      from, and whether they're timed.

Lingua 2.0 ends here.

## Lingua 3.0

Everything still open from "Lingua updates.txt", as its own version, built in a new session (see
the handover at the end). Same way of working: plan each prompt here first, build without
stopping, then commit, push and check the live site. Version 3.0 in the app when it's done.

### 3.0-1 · Twenty languages with their flags, every one well supported
- [ ] New: Arabic, Mandarin, Dutch, Norwegian, Turkish, Japanese, Korean, Latin, Swahili and
      Indonesian (Bahasa).
  - Packs from Wiktionary (kaikki) and frequency lists (FrequencyWords; Latin and Swahili from
    Leipzig corpus lists; Japanese and Mandarin counted from OpenSubtitles text split the way the
    reader splits it).
  - Word splitting: `Intl.Segmenter` for Mandarin; for Japanese a dictionary splitter of its own
    (the browser splits 食べました into 食|べ|ま|した). Readings: pinyin and kana over the words.
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
- [ ] Music for the new languages: Apple stores, artists to learn with, styles and charts.

The user added the next three steps on 2026-10-17 (their list is under "Lingua 3.0" in
"Lingua updates.txt"). They come straight after 3.0-1, before the new rooms, because they fix
and polish what people use every day; Grammatica, Radio, Mundus, then comics, audiobooks and AI
conversation, and the full check follow as 3.0-5 … 3.0-9. A second list the user added the same
evening (better grammar exercises, writing practice for alphabets, a tips section, comics,
audiobooks and audio courses, AI conversation) is planned into 3.0-5, 3.0-7 and 3.0-8.

### 3.0-2 · A real phone app, and a look of your own
- [ ] **Phone first, strictly:** every room at 375 px wide works like a native app: nothing wider
      than the screen, no sideways page scroll, no zoom, tap targets of at least 44 px, sheets
      and lists that scroll on their own while the page stays fixed. The Discover pages (Codex,
      Thesaurus, Sonus, Visio) and their widgets first.
  - The sub-tab bars (Library · Discover · Podcasts and the like) fit the width as a segmented
    control instead of scrolling sideways.
- [ ] **Liquid Glass tab bar (phone only):** the iPhone tab bar as iOS 26 draws it: a floating
      glass capsule (blur, saturation, a bright rim and soft refraction), with a glass "lens"
      that slides between tabs with a spring and stretches as it moves, following the finger
      when dragged. Sub-tab segmented controls get the same sliding lens. Desktop stays as it is.
      Respects reduced motion and reduced transparency.
- [ ] **Home, reorganised** for desktop and phone so every element has its proper size: a clear
      grid on desktop (main column with today's plan, a side column with progress), one tidy
      column on the phone; no cramped or oversized cards.
- [ ] **Themes:** under Look and feel, at least six themes for Paper (light) and six for Nocturne
      (dark), each a background and element colours that belong together: cream and paper
      whites, a slightly pink white with a rose accent, sage, sand, and more; for Nocturne ink,
      plum, forest, slate and others. Shown as small swatches; the room colours stay readable on
      every theme (contrast checked).
- [ ] **Commute mode:** its light/dark button works.
- [ ] **Onboarding:** the "What do you enjoy most" step goes (Home's order keeps a sensible
      default; Ordo › Languages keeps the choice for those who want it).

### 3.0-3 · Sonus and music, fully working
- [ ] **Sonus opens on Library:** one well-laid-out library of your music and podcasts (now
      playing and recent first, then saved songs, followed podcasts and new episodes), then a
      **Music** tab and a **Podcasts** tab that show only that kind, each with its own discovery.
      Radio (3.0-6) slots in as a fourth tab or inside Library; decide there.
- [ ] **Song page without double scrolling:** a fixed page (art, title and controls fixed, only
      the lyric sheet scrolls), smooth on phone and desktop.
- [ ] **Playback in sync with the lyrics, without errors:** one player engine per source (preview,
      Spotify, Apple Music) with a single clock; the preview always plays; timed lyrics follow
      the music exactly; untimed lyrics get a gentle estimated scroll and "tap the line you hear".
      Errors are caught and explained, never a dead page.
- [ ] **Lyrics that load:** search more widely (LRCLIB by exact track and by search with title and
      artist cleaned up, featuring and remaster tags removed; lyrics.ovh; Genius as a link), let
      you pick between results, and pop them up easily, with "paste them yourself" as the last
      step. Measured on a list of songs per language.
- [ ] **An open podcast fits one screen on desktop:** player, transport and transcript laid out
      so the page itself never scrolls (only the transcript does).
- [ ] **Styles at the top** of the Music tab, and more styles for each language.
- [ ] **Hold to translate** several words or a sentence works on song lyrics, podcast
      transcripts and Visio subtitles, with mouse and touch, as in Codex.
- [ ] **Song games teach the language first and the song as a bonus**, and say so: words from the
      song in the learner's level as cards, fill in the word with its meaning, grammar spotted in
      the line, translate the line, then put the lines in order.

### 3.0-4 · Natural voices, and sync between your devices
- [ ] **A natural voice for every language**, cheap and automatic, in the regional accent of the
      chosen flag (Castilian or Mexican Spanish, European or Brazilian Portuguese, never an
      American voice for a non-English language): Gemini's text-to-speech with the learner's own
      Gemini key (in a header), each word or sentence generated once and kept on the device. With
      no key, only the device's own high-quality voices for that region, else no voice button.
      Every language listened to; the plan names the fallback where Gemini has no voice.
- [ ] **Sync between the desktop app and the iPhone**, without accounts: pair the two once with a
      QR code; whenever both are open they sync directly, device to device (WebRTC; a public
      broker only introduces them, the data never sits on a server), using the backup's merge.
      "Sync now" in Ordo, with the last sync time. API keys only if chosen.

### 3.0-5 · Grammatica and alphabets
Built as in [`GRAMMAR-PLAN.md`](GRAMMAR-PLAN.md), steps 1–4:
- [ ] Grammar files, the topic browser, explanations and tables.
- [ ] The drills: conjugate, decline, pick the form, word order. Items are FSRS cards, with mastery rings.
- [ ] Topic maps for every language (Spanish and German first).
- [ ] Links from the word drawer, Home and Ludus; placement; Ratio and Tabula.
- [ ] **Progressive, high-quality exercises:** each topic's drills climb in steps (recognise the
      form, pick it, build it, use it in a sentence, translate into the language), in real
      sentences from the language's examples, with a short explanation of every mistake. A lesson
      mixes new items with due ones, ends with a short review, and unlocks the next topic only
      when it is mastered. Transform, spot-the-mistake and, with an AI key, free sentences that are
      corrected and explained.
- [ ] **Alphabets** for the languages with a script of their own (Russian, Greek, Arabic, Japanese
      kana, Korean Hangul; Mandarin: pinyin and tones, then the first characters): the full
      alphabet as a chart with sound, and short lessons in the spirit of Duolingo. See the letters,
      hear them, match sound to letter, read real words, then write them. Letters are FSRS cards
      with mastery rings, like grammar topics. Offered first to beginners in these languages.
- [ ] **Writing practice for letters and characters:** trace each letter, kana, Hangul block or
      character with a finger or the mouse, guided by its strokes in order and direction
      (stroke data from KanjiVG for Japanese, Make Me a Hanzi for Mandarin, drawn by hand for the
      alphabets), then write it from memory. Strokes are checked for order, direction and shape,
      with a gentle hint on a miss. Arabic letters in their joined forms (start, middle, end).

### 3.0-6 · Radio (in Sonus)
- [ ] Stations from radio-browser.info (an open, community-run directory): by language, by country,
      search, favourites; only secure (https) streams.
- [ ] A minimal "night sky" map: every station a dot at its place, so the dots draw the world;
      tap one to tune in, like Radio Garden.
- [ ] Plays in Sonus's player and mini player, with now playing when the station shares it.
      Listening time counts. A fourth tab in Sonus (Library · Music · Podcasts · Radio), or
      inside Library: decide when planning.

### 3.0-7 · Mundus: recommendations, and streaming services in Visio
- [ ] **Mundus**, a deep-dive page per language: video games, series, films, books, podcasts,
      music, YouTube channels and dictionaries. Picked by hand for all twenty languages, with level
      hints and why each is good for learners.
  - Buttons open them on the web, Spotify, YouTube, Goodreads, Amazon, Netflix, Max, Disney+ and others.
  - "Add to Codex/Sonus/Visio" where it fits.
  - Reached from Home and the sidebar.
  - Its music links to the artists in Sonus › Music (opening their songs there).
- [ ] **Visio › Services:** choose the services you have (Netflix, Max, Disney+, Prime Video,
      Apple TV+, SkyShowtime, Viaplay, and free public ones such as RTVE Play, ARD, arte, NRK).
  - The picks show which of your services carry them.
  - With a free TMDB key, live lists of series and films originally in the language, on your
    services in your country, with posters.
  - Each opens in its app. "Add its subtitles" uses the Subtitles-only flow.
- [ ] Every language's picks checked: links open, the services match the country, level hints
      make sense.
- [ ] **Beyond the app: tips that make learning fun,** a short section in Mundus (also offered on
      Home now and then): small, playful challenges with a tap to mark them done, such as
      switching your phone or a game to the language (with how to do it on iPhone, Windows and in
      popular apps), labelling things at home, cooking a recipe in it, thinking aloud on a walk,
      a song on repeat for a week, changing your Spotify region of discovery, writing your
      shopping list in it. Per language where it matters (a local radio app, a café phrase to try).
      Interactive cards that flip, with a streak of challenges done.

### 3.0-8 · Comics, audiobooks and courses, and talking with AI
- [ ] **Comics, fully supported in Codex:** open CBZ/CBR-style archives (zip), image folders and
      PDFs page by page, with a reader made for panels: fit to width or page, swipe on a phone,
      two pages on desktop, zoom into a panel. Speech bubbles become text by on-device OCR
      (Tesseract, loaded only for comics, per script), so every word works as in Codex: tap,
      select to translate, save to cards. Reading time and pages count in Ratio.
- [ ] **Audiobooks and audio courses in Sonus:** add audio files (MP3, M4A/M4B with chapters) or
      folders, or open free audiobooks from LibriVox in the language. Chapters, resume where you
      left off, speed, sleep timer, the mini player. A text alongside when there is one (the
      ebook in Codex, matched by Whisper's timings, so the sentence being read lights up). Audio
      courses (lesson by lesson, with their own order and "lesson done"), and links to good free
      courses per language.
- [ ] **Talk or text with an AI:** a "Conversation" corner with ready links and prompts to start a
      voice chat or a text chat in ChatGPT, Claude, Gemini or Copilot (each opens the app or site;
      nothing is sent from Lingua). Prompts per level and theme: a café role-play, a job interview,
      a debate, "correct my mistakes after each answer", "speak slowly and simply". The prompt is
      written in the language, with the learner's level, words due for review and current
      grammar topic woven in, and a copy button. With an AI key, a text chat inside Lingua too,
      corrections shown inline and new words saved as cards.
- [ ] Checked on a phone and on desktop, light and dark; docs.

### 3.0-9 · Lingua 3.0 complete: the full check
- [ ] Every point of "Lingua updates.txt" checked against the app, one by one.
- [ ] Every room on a phone and on desktop, light and dark: layout, taps, scrolling, the
      keyboard, offline.
- [ ] All twenty languages end to end: dictionary and taps, news, music, radio, recommendations,
      grammar, alphabets and writing, comics, audiobooks, AI conversation prompts, voices.
- [ ] The app's version says 3.0. Docs, then commit, push and the live site checked.

### Handover for the Lingua 3.0 session

**Started work, on a branch of its own:** `lingua-3.0/languages-wip` (pushed, not merged; based
on the commit before 2.0-4b, so expect small conflicts in `src/app/shells/AppShell.tsx`,
`src/data/settings.ts` and `src/features/cantus/player/LyricSheet.tsx` when merging main into it).
It holds 3.0-1's first pieces, not yet wired up end to end:
- `src/core/lang/languages.ts`: the twenty languages (scripts, endonyms, samples, `rtl`, flag lists).
- `src/core/lang/japanese.ts` (+ tests, passing): conjugation back to the dictionary form,
  the frequency-weighted splitter (今日 は, not 今日は; 食べました whole), and furigana alignment.
  `src/core/text/tokenizer.ts` re-splits runs of Japanese with it once `src/services/packs/lexicon.ts`
  has read the pack's words into memory.
- `normalize.ts`: Arabic vowel marks and Latin macrons dropped for word identity; Arabic alef
  folding. `answer.ts`: no "typo" tolerance for Mandarin and Japanese, Arabic article.
- Readings: `PackForm` gets a fifth field (pinyin or kana), the worker stores it as `DictForm.r`,
  `lookupGlosses` returns it, and Mandarin words missing from the pack are composed from
  listed words. The reader doesn't draw readings yet (plan: a pseudo-element over each word, so
  word text stays clean; setting `reader.readings`: new words / all / off).
- `src/design/fonts.ts`: Noto Serif JP, SC, KR and Noto Naskh Arabic (installed packages), loaded
  per script on demand, ordered by the language on screen.
- `scripts/lang-data`: sources and downloads for all twenty (with retries; Leipzig lists unpacked
  with relative paths, since GNU tar reads "C:" as a host).

**The raw data, in `scripts/.cache` (git-ignored, about 2 GB):** every kaikki dictionary and
frequency list for the twenty languages, `en-translations.json` with evidence for all nineteen
targets, and the OpenSubtitles corpora `opus-ja.txt.gz` and `opus-zh_cn.txt.gz`. The first PC
has it; any other computer rebuilds it on the branch with `fetch.ts`, then `translations.ts`
(see [SETUP.md](SETUP.md) §5; the corpora are part of `fetch.ts` since 1a04524). `themes.json`
still has only the first ten languages: `themes.ts` must map Wiktionary's codes (`cmn` for
Mandarin, `no` and `nb` for Norwegian) and run again.

**What the data showed:**
- Mandarin: kaikki keys words by Traditional characters; Simplified spellings are soft-redirects.
  Key the pack by Simplified (the frequency list is Simplified) and keep Traditional as forms.
  Single characters carry their meanings under the part of speech "character", which the builder
  skips today. Pinyin is in `sounds` as `zh_pron` tagged Mandarin + Pinyin.
- Japanese: entries have ruby readings, full conjugation tables (kanji and kana forms), and kana
  spellings as soft-redirects. FrequencyWords' Japanese list is split into morphemes (い, て, た):
  count words again from `opus-ja` with the splitter instead.
- Mandarin frequency: count from `opus-zh_cn` with `Intl.Segmenter`, so ranks match the reader.
- Korean lists whole words with their particles (학교에서): the lemma fallback needs particle and
  ending rules; Turkish, Indonesian and Swahili need suffix or prefix rules too. Linking frequent
  forms through those rules at build time (not only when reading) lifts coverage a lot.
- Arabic and Latin forms carry vowel marks; Swahili verbs are listed as "penda" with "-penda" as
  their headword.

**Music, for later:** Apple Music's embed sends no messages, hence the press detection. Genius
is out for the reason under 2.0-4b; lyrics.ovh and LRCLIB both allow browsers. Kaspersky on the
first PC rewrote Chrome's traffic: a CORS failure seen only in the test Chrome may be the antivirus,
so check in the app's built-in browser.
