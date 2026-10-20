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

### 3.0-1 · Twenty languages with their flags, every one well supported ✅

**Plan for finishing it (2026-10-18, third computer):** merge `main` into the branch; wire the
rest of `build.ts` as the handover lists; fix the Japanese splitter's stray endings before
counting; count Japanese and Mandarin again; build the ten packs and review each one's commonest
words, fixing what reads wrong; tests for everyday words and readings; charts for all twenty; look
at the new languages in the browser; docs; merge into `main`, push, check the live site.

**What it took, beyond the handover's list:**
- Japanese: the morpheme-based seed list (い, る, 言 ranked above いる, 言う) made the counter cut
  whole words apart (い|る, で|す, 言|って). Bare endings now cost extra in `segmentJapanese` (the
  reader uses it too), the first counting pass treats words the seed list lacks as fairly common,
  and the spoken negative ん (知らん, わからん) deinflects.
- Mandarin: Wiktionary's redirects mix old variants with Simplified spellings (㦱 → 我, 勺 → 的),
  so single characters now go by Unicode's Unihan table (`Unihan_Variants.txt`, fetched with
  the rest); readings follow the meaning that comes first (还 hái "still", 听 tīng); words the
  browser joins that no dictionary lists (我的, 不知道) read as their parts ("I + of"); the
  translation evidence for "現在／现在" counts for both spellings. Top 1k glossed: 72% → 99.7%.
- Latin and Swahili: Wikipedia's word lists ranked bot-written stubs high ("census", "speakers");
  their ranks now blend in everyday text from OPUS (Tatoeba and the Vulgate for Latin, ParaCrawl
  and Global Voices for Swahili).
- `scripts/lang-data/fixes.ts`: the commonest words whose dictionary meaning still read wrong
  (Dutch "niet" as "staple", Turkish "şey" as "well", Swahili "ya" as "the"), set by hand.
- Arabic forms also under their hamza-less spelling (ان, الى), like Greek without accents.

- [x] New: Arabic, Mandarin, Dutch, Norwegian, Turkish, Japanese, Korean, Latin, Swahili and
      Indonesian (Bahasa).
  - Packs from Wiktionary (kaikki) and frequency lists (FrequencyWords; Latin and Swahili from
    Leipzig corpus lists; Japanese and Mandarin counted from OpenSubtitles text split the way the
    reader splits it).
  - Word splitting: `Intl.Segmenter` for Mandarin; for Japanese a dictionary splitter of its own
    (the browser splits 食べました into 食|べ|ま|した). Readings: pinyin and kana over the words.
  - Right-to-left reading for Arabic, everywhere text is shown.
  - Fonts loaded only for the scripts in use (Arabic, CJK, Hangul).
  - Starter decks, Diarium prompts and level hours for each.
- [x] **Flags as icons** for all twenty, drawn in the app's soft style (rounded, slightly muted).
      Each language has a default flag and can switch to another, such as English UK/US,
      Portuguese PT/BR, Spanish ES/MX, Arabic by country, Mandarin CN/TW, Swahili TZ/KE. Latin gets
      a laurel emblem.
- [x] **Every language checked, the ten existing ones too:** a test list of everyday words per
      language like 2.0-2's (`glosses.test.ts`), the 200 commonest words reviewed, the lemma
      fallback rules, news sources, starter decks and Diarium prompts.
- [x] Music for the new languages: Apple stores, artists to learn with, styles and charts.
- [x] **Complete support for each new language, nothing left out** (the user asked for this
      explicitly): dictionary pack with readings, starter and Top-N decks, Diarium prompts,
      welcome text, news, music (store, artists, styles, charts), **podcasts** (suggested
      searches and learner podcasts), speech recognition locale, subtitle language codes,
      typing helpers for special letters, article and pronoun tables for cards and grammar
      forms, context rules for glosses, language detection, flags, fonts and level hours.

### 3.0-1b · Tier 2 (beta): more languages, built automatically ✅
Asked for on 2026-10-18: a second tier that gets only what costs little time, effort and tokens.
The twenty languages above stay the main tier. Built right after 3.0-1, because it reuses 3.0-1's
pack pipeline; nothing here is reviewed by hand.

**How it went (2026-10-18):** every pack well under 8 MB (0.3–3.1 MB). Word lists had to change
for six: FrequencyWords' Hindi, Tamil and Tagalog lists are a few thousand words (Leipzig news or
Wikipedia instead), Georgian's is garbled by old non-Unicode fonts (Leipzig news), and Thai's is
cut into syllables (counted from OPUS subtitles with the reader's own splitter, as Cantonese is).
Share of each language's 1,000 commonest words with a meaning: Polish 98, Vietnamese 96,
Cantonese 95, Czech 95, Serbo-Croatian 93, Malay 92, Hindi 88, Thai 87, Romanian 83, Georgian 79,
Tagalog 69, Persian 59, Tamil 52, Mongolian 52, Uzbek 46 (a thin Wiktionary and no suffix rules).
Known beta rough edges: some commonest words lead with a rare meaning (Thai ฉัน "to eat" before
"I", Vietnamese tôi "to temper" before "I"), since tier 2 has no hand-checked list.

**The languages (15 named; the user said twenty, so five slots are open for them to name):**
Hindi (hi), Polish (pl), Vietnamese (vi), Tagalog (tl), Thai (th), Farsi (fa), Cantonese (yue),
Czech (cs), Romanian (ro), Serbo-Croatian (sh), Malay (ms), Tamil (ta), Georgian (ka), Uzbek (uz),
Mongolian (mn). Suggestions for the open five: Ukrainian, Hebrew, Bengali, Finnish, Danish.

**What a tier-2 language gets** (all automatic or one line each):
- Reader with tap and select-to-translate (online translators, AI with a key), flashcards,
  Ludus, Diarium (English prompts; AI corrections with a key), Visio subtitles, Sonus transcripts.
- An offline pack from Wiktionary (kaikki) and a frequency list, through the same `build.ts`:
  glosses, forms, Top-N decks and the themed starter decks (themes.ts covers any code).
- Podcasts: suggested searches made from the name ("learn Polish podcast", "{endonym} podcast").
- Music: Apple search and LRCLIB lyrics, a store per language, charts where Deezer or Apple has a
  country chart; Discover shows three generic style searches, no hand-picked artists.
- Radio (3.0-5) by language, automatically. A speech locale, language detection by script, a
  flag (simple shapes in the existing style), one sample sentence.

**Not for tier 2:** hand-picked artists, Mundus, Grammatica and alphabets, news feeds, Diarium
prompts in the language, a welcome text, hand-checked glosses, morphology rules, readings.
The app marks these languages "Beta" and says what they include.

**Steps (small, in this order):**
- [x] `languages.ts`: a `tier: 1 | 2` field; the fifteen entries (code, name, endonym, script,
      `rtl` for Farsi, flags, one sample sentence). Flags: in, pl, vn, ph, th, ir (also af, tj),
      hk, cz, ro (md), hr / rs / ba / me, my, lk / sg, ge, uz, mn.
- [x] `sources.ts`: one line each. Frequency lists: FrequencyWords has hi, pl, vi, tl, th, fa, cs,
      ro, hr (for sh), ms, ta, ka; Uzbek and Mongolian use a Leipzig corpus (pick the largest
      `uzb_*` / `mon_*` list on downloads.wortschatz-leipzig.de when building).
- [x] Special cases, kept minimal:
  - **Cantonese:** from the Chinese dictionary (kaikki "Chinese"), keyed by Traditional
    characters, Jyutping (zh_pron tagged Cantonese, Jyutping) as the reading; frequency counted
    from OPUS `zh_tw` with `count.ts`. Beta: written Cantonese words (嘅, 佢, 係) may be thin.
  - **Serbo-Croatian:** code `sh`, kaikki "Serbo-Croatian"; Cyrillic text is transliterated to
    Latin in `normalizeWord` (one table), so one pack serves both scripts. Locale `hr`.
  - **Vietnamese:** words split at spaces (syllables); multi-syllable entries stay in the pack
    for the drawer. **Thai:** `Intl.Segmenter` splits it. **Malay:** reuses Indonesian's rules.
  - **Farsi:** the `[lang='ar']` CSS rule becomes `[lang='ar'], [lang='fa']`; keep ZWNJ in words.
  - Scripts without a bundled font (Devanagari, Thai, Tamil, Georgian) use the device's own.
- [x] App: onboarding shows tier 2 under "More languages · Beta"; Ordo › Languages says what a
      beta language includes. Missing tables fall back cleanly (prompts → English, no sample →
      the generic one, no Discover picks → style searches only).
- [x] Build: `fetch.ts <codes>`, `translations.ts`, `themes.ts`, `count.ts yue`,
      `build.ts <codes>`; keep packs under about 8 MB each (lower `FREQ_KEEP` for tier 2 if needed).
- [x] Check: each pack installs and the sample sentence gets glosses; typecheck, tests, build;
      one look at a phone and a desktop. Docs, commit, push.

The user added the next three steps on 2026-10-17 (their list is under "Lingua 3.0" in
"Lingua updates.txt"). They come straight after 3.0-1, before the new rooms, because they fix
and polish what people use every day; Radio, Grammatica, Mundus, then comics, audiobooks and AI
conversation, and the full check follow as 3.0-5 … 3.0-9 (on 2026-10-19 the user swapped Radio
and Grammatica, then comics and Grammatica: the order is now Radio, comics, Mundus, Grammatica).
A second list the user added the same evening (better grammar exercises, writing practice for
alphabets, a tips section, comics, audiobooks and audio courses, AI conversation) is planned into
3.0-6 (comics, audiobooks, AI), 3.0-7 (tips) and 3.0-8 (grammar and writing).

### 3.0-2 · A real app on phone and desktop, and a look of your own ✅

**Built (2026-10-18), in this order:** onboarding without the Enjoy step (Home orders itself from
the reasons; Ordo › Languages keeps the choice); Commute mode's sun was "keep the screen on", which
looked like a theme switch, so it got a real light/dark button and the screen-on button a phone
icon; six palettes each for Paper and Nocturne (`design/palettes.ts`, swatches in Look and feel,
applied before first paint); the Liquid Glass tab bar (spring lens that stretches with its speed,
drag to choose, hidden on pages without a tab); segmented controls with a glass lens on touch
screens; Sonus's and Thesaurus's section bars fill the width instead of scrolling; Home in two
columns from tablet width. Checked by script at 375 px: no room or Discover tab is wider than the
screen, and no tap target is under 32 px. Not checked on a real iPhone yet (QA-ios).

- [x] **Phone and desktop alike, neither first** (the user's words: functional and fitting for
      both): every room looks and works properly on both.
  - On a phone (375 px and up) it feels like a native app: nothing wider than the screen, no
    sideways page scroll, no zoom, tap targets of at least 44 px, sheets and lists that scroll
    on their own while the page stays fixed.
  - On desktop (1024 px to wide screens) it uses the room well: sensible widths, grids that fill
    the space without stretching, hover states, keyboard use, no phone layout blown up.
  - The Discover pages (Codex, Thesaurus, Sonus, Visio) and their widgets first, checked at
    375, 768, 1280 and 1600 px wide.
  - The sub-tab bars (Library · Discover · Podcasts and the like) fit the width as a segmented
    control instead of scrolling sideways.
- [x] **Liquid Glass tab bar (phone only):** the iPhone tab bar as iOS 26 draws it: a floating
      glass capsule (blur, saturation, a bright rim and soft refraction), with a glass "lens"
      that slides between tabs with a spring and stretches as it moves, following the finger
      when dragged. Sub-tab segmented controls get the same sliding lens. Desktop stays as it is.
      Respects reduced motion and reduced transparency.
- [x] **Home, reorganised** for desktop and phone so every element has its proper size: a clear
      grid on desktop (main column with today's plan, a side column with progress), one tidy
      column on the phone; no cramped or oversized cards.
- [x] **Themes:** under Look and feel, at least six themes for Paper (light) and six for Nocturne
      (dark), each a background and element colours that belong together: cream and paper
      whites, a slightly pink white with a rose accent, sage, sand, and more; for Nocturne ink,
      plum, forest, slate and others. Shown as small swatches; the room colours stay readable on
      every theme (contrast checked).
- [x] **Commute mode:** its light/dark button works.
- [x] **Onboarding:** the "What do you enjoy most" step goes (Home's order keeps a sensible
      default; Ordo › Languages keeps the choice for those who want it).

### 3.0-3 · Sonus and music, fully working ✅

**Built (2026-10-19), in this order:** one phrase gesture (`usePhraseGesture`) for lyrics,
podcast transcripts and Visio subtitles, with the reader's phrase bubble; the song page and an open
podcast fixed to the window (only the lyrics or the transcript scroll; on phones the header, song
card and docked player stay put); Apple's preview as a fifth source with its own clock, placed in
the song by one tap on the line you hear; estimated times for untimed lyrics, put right by taps; an
error boundary round the player and sheet; LRCLIB asked fewer, better questions with Retry-After
backoff when it is busy, lyrics.ovh when it can't be reached, two automatic retries on the page,
candidates to pick from at once when nothing sure was found, and lyrics with a translation mixed
into every line passed over for a clean version; Sonus opens on Library (Music and Podcasts
after it); about ten styles per language at the top of Music; song lessons that teach the
language first (words at your level, the word in its line, a form and its dictionary word, the
line in English, then the verse in order as the bonus), translating the song first when needed,
with the words added as cards at the end. Lyrics measured on the charts (`lyrics-check.ts`, 8
songs a language, 149 songs): **72% → 81% found, 66% → 78% timed**; most misses left are LRCLIB
turning questions away while busy, not songs it lacks.

**Plan (2026-10-18):**
1. **Hold to translate, one gesture for all three:** the reader's phrase selection (mouse: press and
   drag; touch: hold a word, then slide) becomes a shared hook (`usePhraseGesture`) that the lyric
   sheet, the podcast and Visio transcripts and the subtitles over a video use, with the reader's
   phrase bubble (translate, save as a card, copy). The video holds still while choosing.
2. **Fixed pages:** the song page and an open podcast fill the screen; only the lyric sheet or the
   transcript scrolls (its own scroll box, which the follow-along uses instead of the window).
   Phones: header, song card and the docked player stay put, and the lyrics scroll between them.
3. **One clock per source, and the preview always plays:** a fifth source, Apple's 30-second
   preview, on an audio element with its own clock. The preview starts somewhere in the song, so
   the first time "tap the line you hear" sets where (kept with the song). Untimed lyrics get
   estimated times spread over the song's length (sung lines by their length), followed gently
   with no word-by-word lighting, and a tap on a line puts them right. Player and sheet sit inside
   an error boundary: a player that fails says so and offers another source.
4. **Lyrics that load:** LRCLIB asked more ways (exact with and without the album, search by
   cleaned title and first artist, by words, by title alone with the artist checked); lyrics.ovh
   with the cleaned title; candidates shown straight away to pick from when the match is unsure
   or nothing was found, with Genius and "paste them yourself" under them. A script
   (`scripts/cantus/lyrics-check.ts`) measures how many chart songs per language get lyrics,
   before and after.
5. **Sonus: Library · Music · Podcasts.** Library first: now playing or continue, recently
   played (songs and episodes together), your songs, the podcasts you follow, new episodes, your
   own files. Music: styles at the top under the search, then your songs, charts, Spotify and
   artists. Podcasts: followed shows, then find podcasts. Radio (3.0-5) gets its own fourth tab.
   About ten styles per language (beta languages six, made from the name).
6. **Song games that teach the language:** rounds in the order words → meaning → grammar → line →
   bonus: the song's words at the learner's level that aren't known yet (meaning, chosen from
   four), fill in the word with its English meaning as the hint, a form spotted in the line
   ("cantaba is a form of cantar", from the pack's form notes), translate the line (chosen from
   three), and the lines in order last, as the bonus. The words met can be added as cards at
   the end. The page says so at the top.

- [x] **Sonus opens on Library:** one well-laid-out library of your music and podcasts (now
      playing and recent first, then saved songs, followed podcasts and new episodes), then a
      **Music** tab and a **Podcasts** tab that show only that kind, each with its own discovery.
      Radio (3.0-5) slots in as a fourth tab or inside Library; decide there.
- [x] **Song page without double scrolling:** a fixed page (art, title and controls fixed, only
      the lyric sheet scrolls), smooth on phone and desktop.
- [x] **Playback in sync with the lyrics, without errors:** one player engine per source (preview,
      Spotify, Apple Music) with a single clock; the preview always plays; timed lyrics follow
      the music exactly; untimed lyrics get a gentle estimated scroll and "tap the line you hear".
      Errors are caught and explained, never a dead page.
- [x] **Lyrics that load:** search more widely (LRCLIB by exact track and by search with title and
      artist cleaned up, featuring and remaster tags removed; lyrics.ovh; Genius as a link), let
      you pick between results, and pop them up easily, with "paste them yourself" as the last
      step. Measured on a list of songs per language.
- [x] **An open podcast fits one screen on desktop:** player, transport and transcript laid out
      so the page itself never scrolls (only the transcript does).
- [x] **Styles at the top** of the Music tab, and more styles for each language.
- [x] **Hold to translate** several words or a sentence works on song lyrics, podcast
      transcripts and Visio subtitles, with mouse and touch, as in Codex.
- [x] **Song games teach the language first and the song as a bonus**, and say so: words from the
      song in the learner's level as cards, fill in the word with its meaning, grammar spotted in
      the line, translate the line, then put the lines in order.

### 3.0-4 · Natural voices, and sync between your devices ✅

**Built (2026-10-19):** natural voices from Gemini's voice library, chosen by the flag's locale
(`gemini-3.8-flash-tts` through the Interactions API, the key in a header; each word or line
generated once and kept in a `speech` table that never leaves the device), else a good device
voice for exactly that locale (Natural, Neural, Premium, Enhanced, Google or Siri), else no
speaker button; speaker buttons in the word drawer, the phrase bubble and on flashcards;
Ordo › Languages › Voice (who reads the language, in which accent, another library voice to try
and pick, a sample, an off switch). Device sync without accounts in Ordo › Your data › Your
devices: a QR code and a 16-character code, scanned with the camera or typed; PeerJS's broker
introduces the two at meeting places derived from the secret, each proves it knows the secret
(HMAC) before anything is sent, then each sends a backup (no media, keys only if chosen) and
merges the other's. Sync on opening, every ten minutes, on coming back to the app, and with "Sync
now". Checked in the browser with two separate devices (two origins): pairing by typed code,
the first sync, and later syncs both ways. Not checked: a real Gemini key (none is used in
testing), the camera scan, and an iPhone on a mobile network.

**Plan (2026-10-19):**
1. **Voice, Gemini first.** Gemini's current speech models (`gemini-3.8-flash-tts`, then the
   Lite model) through the Interactions API, with the learner's Gemini key in the
   `x-goog-api-key` header. The accent comes from the voice, not the prompt: Gemini's voice
   library is asked for voices of the flag's locale (`language_code=es-ES`, `es-MX`, `pt-BR`…),
   and the first (or the learner's pick) is kept. Each word or line is spoken once and the WAV
   kept on the device (a `speech` table, never backed up), so a word costs one request ever.
2. **Fallbacks, named.** No key, or no Gemini voice for that locale: the device's own voice for
   exactly that locale, but only a good one (Natural, Neural, Premium, Enhanced, Google or Siri
   voices). Nothing good: no speaker button at all. Latin has no natural voice anywhere, so it
   has none; a flag whose locale Gemini lacks says so in Ordo.
3. **Where you hear it:** a speaker button in the word drawer, the phrase bubble (reader, lyrics,
   transcripts, subtitles) and on flashcards; Ordo › Languages › Voice shows which voice speaks
   the language (Gemini voice and accent, the device voice, or none), lets you pick another
   library voice, and plays a sample.
4. **Sync without accounts.** Ordo › Your data › Your devices: "Pair a device" shows a QR code and
   a short code (a random secret); the other device scans it with its camera or types the code.
   Both derive their broker ids from the secret, so only they can find each other; PeerJS's
   public broker introduces them and the data goes device to device over WebRTC, after each
   proves it knows the secret (HMAC). Each sends the other a backup (no media; API keys only if
   chosen) and merges what it receives with the backup's newest-edit-wins merge. They sync when
   both are open (on opening, every ten minutes, and on coming back to the app), and "Sync now"
   shows the last sync time. Pairings stay on the device and never travel in backups.
- [x] **A natural voice for every language**, cheap and automatic, in the regional accent of the
      chosen flag (Castilian or Mexican Spanish, European or Brazilian Portuguese, never an
      American voice for a non-English language): Gemini's text-to-speech with the learner's own
      Gemini key (in a header), each word or sentence generated once and kept on the device. With
      no key, only the device's own high-quality voices for that region, else no voice button.
      Every language listened to; the plan names the fallback where Gemini has no voice.
- [x] **Sync between the desktop app and the iPhone**, without accounts: pair the two once with a
      QR code; whenever both are open they sync directly, device to device (WebRTC; a public
      broker only introduces them, the data never sits on a server), using the backup's merge.
      "Sync now" in Ordo, with the last sync time. API keys only if chosen.

### 3.0-5 · Radio (in Sonus) ✅

**Built (2026-10-19):** Sonus › Radio, a fourth tab, as planned below: the language's stations from
radio-browser.info (about 400 a name, playable https streams only, kept for half a day); the night
sky map (the world drawn by 3,305 half-degree cells where radio stations are, made by
`scripts/radio/world-dots.ts`; the language's stations as warm lights, fitted to where they
are, "World" to see it all; tap a light for that place's stations); a search by name or style;
country chips (the flag's country first, each loading that country's own list); "Your stations"
(favourites and played lately, a backed-up and synced `stations` table, Dexie v9) in Radio and
favourites in Library. Stations play through Sonus's player as a live item (no position, fresh
after a pause, "Live" in the mini player, play and pause on the lock screen); listening counts as
listening. Now playing comes from AzuraCast's public file (common for community radio) or
Icecast's status, where the server lets web pages ask; most big stations don't, so it shows
less often than hoped. Checked in the browser at desktop and phone width: French stations on the
map, a place's stations, playing, pausing and resuming live, favourites in Library, the Canada
list, the jazz search, now playing from an AzuraCast station, and the listening time recorded.
Not checked: an iPhone (the lock screen, playing with the screen off).


**Plan (2026-10-19):** a fourth tab, **Radio**, in Sonus (Library · Music · Podcasts · Radio); your
favourite stations also show in Library. Stations come from radio-browser.info (de1, then de2, then
the round-robin name), searched by the language's names there, exactly (`spanish`; Norwegian is
`norwegian` and `norsk`, Serbo-Croatian is Croatian, Serbian, Bosnian and Montenegrin), only
https streams the browser can play (HLS only where it plays natively), most listened first, kept
for half a day. The map: the world drawn faintly by the places of radio stations everywhere (a
small grid made once by a script), the language's stations bright on top, fitted to where they
are; tap a place for its stations. Countries as chips (the flag's first) and a search by name.
Favourites and recently played stations are a table that is backed up and synced. Stations play
through Sonus's one player as a live item: no position saved, the stream fresh again after a
pause, "Live" in the mini player, listening time counted as listening. Now playing comes from
the station's Icecast status where it shares one. A click is reported to radio-browser when a
station is played, as its API asks.
- [x] Stations from radio-browser.info (an open, community-run directory): by language, by country,
      search, favourites; only secure (https) streams.
- [x] A minimal "night sky" map: every station a dot at its place, so the dots draw the world;
      tap one to tune in, like Radio Garden.
- [x] Plays in Sonus's player and mini player, with now playing when the station shares it.
      Listening time counts. A fourth tab in Sonus (Library · Music · Podcasts · Radio), or
      inside Library: decide when planning.

### 3.0-6 · Comics, audiobooks and courses, talking with AI, and radio and music to explore ✅

The user swapped 3.0-6 and 3.0-8 on 2026-10-19: comics, audiobooks, courses and AI conversation
come next, and Grammatica and alphabets move to 3.0-8. The user added notes on Radio and Music
for this step (under "Lingua 3.0, third list" in "Lingua updates.txt").

**Plan:** built in four parts, each committed and pushed when it works:
1. **Radio and Music** (the user's notes): the real map, the full-screen station player with a live
   transcript and commute mode, stations in Library's "Recently played", and Music's explore
   shelves in place of the "Songs you love" card.
2. **Comics** in Codex: a comic is a text of pages (images kept on the device like a book's
   pictures); CBZ and zip-based CBR through jszip, image files or a folder, PDFs drawn page by
   page with pdf.js. Speech bubbles are read by Tesseract (tesseract.js, loaded only for comics;
   its language data per language, fetched once and kept), grouped into bubbles, kept with the
   page, and shown as reader text (the Codex engine: tap, hold, drag to translate, save to cards).
   Reading time and pages go to Ratio as reading.
3. **Audiobooks and courses** in Sonus: several files or a folder become one audiobook or course
   (its parts in order, M4B chapters read from the file), LibriVox's free audiobooks in the
   language (found through archive.org, which LibriVox uses for its files), a sleep timer, and
   the ebook in Codex matched to a part's Whisper transcript, so the book's own sentences light
   up as they are read. *How (planned 2026-10-19):* a book is its parts, ordinary Sonus items
   that share a `bookId` (`episode` is the part's number), so downloads, transcripts, sync and
   backups work unchanged. Chapters come from the file (MP4 `chpl` or the QuickTime chapter
   track, an MP3's ID3 `CHAP` frames). LibriVox through archive.org (its search and files allow
   apps; LibriVox's own API doesn't). A book page (/sonus/book/:id) with the parts, Continue and
   "lesson done"; a shelf in Library; the player gets the part and chapter, chapters to jump to,
   the next part on its own at a part's end (courses stop and mark the lesson done) and a sleep
   timer (minutes, end of chapter, end of part). Read along: an alignment of Whisper's words with
   the book's (unique word runs as anchors, times filled in between) gives each of the book's
   sentences its time, shown in the player in place of Whisper's text. Free courses: Language
   Transfer and the FSI courses, linked per language.
4. **Conversation**: the corner with prompts and links, and the in-app text chat with a key.
   *How (planned 2026-10-19):* a room of its own, **Colloquium** (Latin for a conversation), at
   /colloquium: in the desktop sidebar under the divider, and on a phone from Home (a card, and
   now and then a "talk for ten minutes" step) rather than one more icon in the top bar. A
   scenario (café, market, the way, doctor, hotel, job interview, introduce yourself, a meeting,
   a friendly debate, the news, tell a story, your day, review my words) and how it should go
   (correct my mistakes after each answer, speak slowly and simply, voice or text) make a prompt
   written in the language, for the learner's level, with up to ten words due for review and the
   current grammar topic when Grammatica has one. "Copy and open" puts it on the clipboard and
   opens ChatGPT, Claude, Gemini or Copilot (their app on a phone), with a line on starting
   voice there; nothing is sent from Lingua. The core twenty languages get prompts written in
   the language; beta languages get English prompts that ask for the language. With a Groq or
   Gemini key, "Chat here": the AI answers in the language (every word taps and holds as in
   Codex, read aloud with the 3.0-4 voices), each of the learner's messages comes back with its
   corrections inline, and new words can be saved as cards. Chats are kept (a `chats` table,
   schema v14, backed up and synced like journal entries) and can be continued or removed.
   *Done (2026-10-20):* /colloquium with ten scenes (café, market, the way, meeting someone, your
   day from A1; doctor and hotel from A2; job interview, a story together, a debate from B1),
   voice or text, "correct my mistakes", "slowly and simply" (on up to A2), "use my N words due"
   and "practise <Grammatica's next topic>"; the prompt is shown in the language with Copy, and
   ChatGPT, Claude, Gemini and Copilot open in a new tab as it's copied. With a Groq or Gemini
   key, "Start chatting": the AI opens the scene, its lines gloss on tap, read aloud, show their
   English and offer up to three words to learn; each of the learner's lines gets its
   corrections under it (only ones that quote the line). Past chats are listed to carry on or
   delete. Desktop: in the sidebar under the divider (Alt 8, after Mundus and Grammatica; Ratio and Ordo moved to
   Alt 9 and 0). Phone: a "Talk today" card on Home (the scene of the day, or a chat from the
   last two days to carry on), a "Talk for ten minutes" step every third day without a chat,
   a back arrow to Home, and the chat full screen with the box docked at the bottom.

- [x] **Radio, a real map** (the user's note): the world's countries drawn as shapes (Natural Earth
      data, made small by a script), in the app's own colours, light and dark, with a touch of
      radio (stations send out rings, like a signal). The countries where the language is on air
      are tinted, each with a node showing how many stations it has; tap a country or its node and
      the map flies to it and lists its stations. Zoomed in, the places with stations show as
      lights. Drag to move, pinch, scroll or double-tap to zoom, +/− and "World" buttons;
      smooth on a phone (one canvas, drawn once per frame). *Done:* nodes that would overlap join
      into one (tap it to fly in until they part), names never cover each other or a node, and
      countries go by their everyday names ("Venezuela", not "Bolivarian Republic Of Venezuela").
- [x] **A full-screen player for a station** (the user's note), like a podcast's: tap the mini
      player or the station on air. Artwork, name, place, what's on, live, the heart, play and
      pause, the station's site, and **commute mode** (the big-button page: play and pause, your
      stations one after another, what's on in large type).
- [x] **A live transcript, where the station allows it:** Lingua listens along in parts of about
      twelve seconds and Whisper writes them out (Groq with a key, or on the device), a few
      seconds behind the sound. Every word works as in Codex (hover, tap, hold, drag to translate,
      save to cards). Off until you turn it on, since it streams the station a second time; only
      stations whose servers let web pages read the stream (many Icecast servers do) can be
      transcribed, and the player says so when one can't. *Done;* without a key or Whisper on the
      device it turns itself off at once and says where to add one. Not yet heard with a real key.
- [x] **Library › Recently played** has the stations you played lately, with songs and episodes.
- [x] **Music, made to explore** (the user's note): the "Songs you love" card goes. Shelves in the
      style of "Recently opened": your most played songs, songs from the artists to learn with
      (a different few each day), a style of the day, and "Surprise me" (a random song in the
      language). Apple's search is asked a few times a day at most; results are kept for the day.
      *Done:* Recently opened, Explore today (with shuffle, and a round button on each song for
      Apple's 30-second preview), the charts, your songs, Most played by you (from three songs
      opened twice or more), Style of the day, then styles, Spotify and artists.
- [x] **Comics, fully supported in Codex:** open CBZ/CBR-style archives (zip), image folders and
      PDFs page by page, with a reader made for panels: fit to width or page, swipe on a phone,
      two pages on desktop, zoom into a panel. Speech bubbles become text by on-device OCR
      (Tesseract, loaded only for comics, per script), so every word works as in Codex: tap,
      select to translate, save to cards. Reading time and pages count in Ratio. *Done:* Codex ›
      Add › File has "Choose a comic" (CBZ, CBR made as zip, a PDF, or the pages' pictures),
      "A folder of pages" on desktop, and drop. Each page is a chapter: its picture, then its
      bubbles as paragraphs. The reader shows the page whole beside its words (above them on a
      phone); tap a bubble and its words light up, hover words and their bubble lights up;
      double-tap or pinch to zoom, swipe to turn (right to left for manga and Arabic). Tesseract
      reads the open page and the next one ahead, in sparse-text mode, lines grouped into
      bubbles, capitals made into sentences (names the dictionary doesn't know keep theirs).
      Checked with drawn test pages, in the dev app and in the production build. *Not done:* two
      pages side by side on desktop (the page's words take that place); CBR files that are RAR
      archives (a browser can't open them; the message says to make a CBZ).
- [x] **Audiobooks and audio courses in Sonus:** add audio files (MP3, M4A/M4B with chapters) or
      folders, or open free audiobooks from LibriVox in the language. Chapters, resume where you
      left off, speed, sleep timer, the mini player. A text alongside when there is one (the
      ebook in Codex, matched by Whisper's timings, so the sentence being read lights up). Audio
      courses (lesson by lesson, with their own order and "lesson done"), and links to good free
      courses per language. *Done (2026-10-20):* Add › "Audiobook or course" (files, or a folder
      on desktop; parts by track number, else by name; an .m4b or any file with chapters is a
      one-part audiobook) and "Free audiobooks" (now Sonus's own Audiobooks tab, see below: LibriVox through archive.org,
      searchable, plus Language Transfer and FSI per language, and "Add a course"). A book page
      (/sonus/book/:id) with Continue, the parts (or one file's chapters), lessons to tick,
      rename, audiobook/course, read along, remove; a shelf in Library, one entry per book in
      Recently played. *Then (2026-10-20, the user's request):* audiobooks became a Sonus tab of
      their own between Podcasts and Radio ("Books" on a phone): your audiobooks and courses as
      covers with how far in you are, LibriVox's free books with search, the free courses, and
      "Add your own"; /sonus/audiobooks now opens it. In the player: the book in the back link, "Part 3 of 12", the chapter
      playing, chapters to jump to, part arrows, "Lesson done", and a moon for the sleep timer
      (5–60 minutes with a fade, end of chapter, end of part; the minutes left on the moon and
      the mini player). At a part's end an audiobook plays on and a course marks the lesson done
      and stops; the lock screen's previous and next go by chapter, then part. Read along: pick
      the ebook in Codex and every part with a transcript gets the book's sentences, timed;
      new transcripts get them at once; Stop puts Whisper's text back. Checked in the dev app
      at desktop and phone width with a real LibriVox book streaming from archive.org. *Not
      checked:* a real M4B or a whole folder of files, read along with a real Whisper
      transcript (only in tests), playing on into the next part with an iPhone locked.
- [x] **Talk or text with an AI:** a "Conversation" corner with ready links and prompts to start a
      voice chat or a text chat in ChatGPT, Claude, Gemini or Copilot (each opens the app or site;
      nothing is sent from Lingua). Prompts per level and theme: a café role-play, a job interview,
      a debate, "correct my mistakes after each answer", "speak slowly and simply". The prompt is
      written in the language, with the learner's level, words due for review and current
      grammar topic woven in, and a copy button. With an AI key, a text chat inside Lingua too,
      corrections shown inline and new words saved as cards. *Done:* see part 4 above.
- [x] Checked on a phone and on desktop, light and dark; docs. *Done (2026-10-20):* every 3.0-6
      screen (Home, Sonus's five tabs, a LibriVox book and its player, Codex, Colloquium and a
      chat, with Mundus and Grammatica alongside) at 375 px in Nocturne and 1280 px in Paper:
      nothing wider than the screen, no errors. The chat was driven end to end with the test key
      and the network stubbed in the page. Comics were checked in part 2; what needs a real
      device or a real key is listed in QA-ios.md.

### 3.0-7 · Mundus: recommendations, and streaming services in Visio ✅

**Built (2026-10-20):** as planned below. Mundus at /mundus (desktop sidebar under Visio, a globe in
the phone's top bar, a card on Home that alternates a challenge with a pick at your level). Picks
for all twenty languages in `src/core/mundus/picks/<lang>.ts` (series, films, books, games,
podcasts, YouTube, dictionaries; music is Sonus's own artist list), filtered by kind and level, each
opening by search where it lives; Add to Codex (wishlist), Follow in Sonus (Apple's directory), Add
its subtitles (Visio's Subtitles-only flow, now with the title given), Find subtitles
(OpenSubtitles). Visio › Library · Services: the services you have and your country, the free TMDB
"API Read Access Token" (header only; the short v3 key is turned down), live lists of series and
films made in the language on your services, a title sheet with where it streams. Beyond the app:
19–21 general challenges plus a few per language, flip cards, done per day in a synced
`challenges` table (Dexie v12), a streak. `scripts/mundus/links-check.ts` opens the 75 written
addresses: none dead (big sites that turn scripts away are listed as blocked). Checked in the browser
at desktop and phone width, light and dark. **Not checked:** a real TMDB token (the client is tested
with a fake one), an iPhone (QA-ios.md, 3.0-7). Hungarian, Dutch, Turkish and Indonesian picks were
written and checked against the web by helper agents; the planned second fact-check of every
language stopped at a usage limit, so the other picks rest on one careful pass.

**Plan (2026-10-19, built alongside 3.0-6's last parts in a session of its own):**
1. **A room of its own, /mundus.** In the desktop sidebar after Visio, a globe in the phone's top
   bar, and a card on Home. Two parts as a segmented control: **Picks** and **Beyond the app**.
   Tier-2 languages get the tips and Visio's live lists (both automatic), no hand-picked list.
2. **Picks, by hand, for the twenty languages** (one data file per language, loaded with the page):
   series, films, books, video games, podcasts, YouTube channels and dictionaries, each with its
   original title, the English one, creator and year, the level it suits (A1 … C1) and a line on
   why it helps a learner. Music is Sonus's own "artists to learn with", so the two never differ.
   Filters by kind and by level. Buttons open things where they live, by search, so a link never
   goes stale: Netflix, Prime Video, Apple TV, YouTube, Spotify, Apple Podcasts, Goodreads, Amazon
   (your country's store), Steam, and the dictionary's own site. "Add to Codex" puts a book on the
   wishlist shelf, "Follow in Sonus" finds the podcast in Apple's directory and follows it, "Songs
   in Sonus" opens the artist's songs in Sonus › Music, and "Add its subtitles" for a series or film
   runs Visio's Subtitles-only flow with the title filled in.
3. **Visio › Services** (Visio gets Library · Services): choose the services you have (Netflix,
   Max, Disney+, Prime Video, Apple TV+, SkyShowtime, Viaplay, and the free public ones that fit the
   language: RTVE Play, ARD, ZDF, arte, france.tv, RaiPlay, NRK TV, SVT Play, NPO, and more) and your
   country (from the device, changeable). Picks known to live on a service (its originals) say so;
   with a **free TMDB key** (the "API Read Access Token", sent in the Authorization header, never in
   a web address, kept on the device like the other keys) each pick is looked up in your country
   (where to watch, a poster), and Services shows **live lists of series and films originally in
   the language, on your services in your country**, with posters, kept for a day. A title opens
   a sheet: what it is, which of your services has it (each opens the service), the TMDB watch page,
   and "Add its subtitles". Checked with curl: TMDB allows web pages to call it with that header.
4. **Beyond the app:** about twenty playful challenges (switch your phone to the language, with how
   on iPhone, Android, Windows and in Netflix, YouTube and Steam; label things at home; cook a
   recipe; think aloud on a walk; one song on repeat for a week; your shopping list; and more),
   plus a few per language (a café phrase to try, a local radio app, a keyboard to add). Cards that
   flip to show how, a tap marks one done, a streak of days with a challenge done. Done challenges
   are a new table, `challenges` (Dexie v12), backed up and synced. Home offers one now and then.
5. **Check:** a script that opens every explicit link in the picks (dictionaries, channels) and
   fails on a dead one; tests for links, the TMDB client (fake key) and the streak; typecheck,
   tests, build; the browser at desktop and phone width, light and dark.

- [x] **Mundus**, a deep-dive page per language: video games, series, films, books, podcasts,
      music, YouTube channels and dictionaries. Picked by hand for all twenty languages, with level
      hints and why each is good for learners.
  - Buttons open them on the web, Spotify, YouTube, Goodreads, Amazon, Netflix, Max, Disney+ and others.
  - "Add to Codex/Sonus/Visio" where it fits.
  - Reached from Home and the sidebar.
  - Its music links to the artists in Sonus › Music (opening their songs there).
- [x] **Visio › Services:** choose the services you have (Netflix, Max, Disney+, Prime Video,
      Apple TV+, SkyShowtime, Viaplay, and free public ones such as RTVE Play, ARD, arte, NRK).
  - The picks show which of your services carry them.
  - With a free TMDB key, live lists of series and films originally in the language, on your
    services in your country, with posters.
  - Each opens in its app. "Add its subtitles" uses the Subtitles-only flow.
- [x] Every language's picks checked: links open, the services match the country, level hints
      make sense.
- [x] **Beyond the app: tips that make learning fun,** a short section in Mundus (also offered on
      Home now and then): small, playful challenges with a tap to mark them done, such as
      switching your phone or a game to the language (with how to do it on iPhone, Windows and in
      popular apps), labelling things at home, cooking a recipe in it, thinking aloud on a walk,
      a song on repeat for a week, changing your Spotify region of discovery, writing your
      shopping list in it. Per language where it matters (a local radio app, a café phrase to try).
      Interactive cards that flip, with a streak of challenges done.
- [x] **Mundus as a place to explore** (the user's notes, 2026-10-20). Mundus recommends something
      for every room: series, films, books, music, radio stations, audiobooks and more. Each opens
      inside the app's own features, so it all connects. The layout should invite exploring, and
      Mundus should be easy to find.
  - *Plan:*
    - **Explore** becomes Mundus's first tab: a shelf for each room, scrolling sideways, with
      "See all" leading to the full lists (the Picks tab as it was).
    - **Watch (Visio):** series and films (posters with a TMDB key) open Visio's title sheet, with
      your services and "Add its subtitles"; YouTube channels.
    - **Read (Codex):** books, to put on the Codex wishlist; the language's news sources, opening
      Codex › New › News.
    - **Listen (Sonus):**
      - podcasts, followed and opened in Sonus;
      - audiobooks from LibriVox, opened as a book in Sonus;
      - the most-listened radio stations, opened on their station page;
      - artists, opening their songs in Sonus › Music;
      - the free courses.
    - **Words (Thesaurus):** the ready-made theme decks, opening in Thesaurus.
    - **Play and look up:** games and dictionaries.
    - **Beyond the app:** a shelf of today's challenges.
    - **Today:** at the top, a pick of the day and a challenge.
    - **Finding it:** each room gets a quiet "Ideas from Mundus" line that opens Mundus at that
      room's shelf (Codex, Thesaurus, Sonus, Visio), and Home keeps its card.
  - *Built (2026-10-20):* as planned, in `src/features/mundus/ExploreView.tsx` and `MundusLink.tsx`.
    - Mundus has three tabs: Explore, All picks and Beyond the app. Older `?kind=` links still
      open All picks.
    - Explore has a "For my level / Everything" switch. "For my level" means your level or one
      above it; a beginner reaches A2.
    - Live shelves fetch only what Sonus already uses: LibriVox's most downloaded audiobooks and
      radio-browser's most listened stations, cached as in Sonus. When either can't be reached,
      its shelf hides.
    - Tapping an audiobook adds it to Sonus and opens it, as Sonus's own audiobook list does.
    - Not verified: an iPhone, and a real TMDB token with posters on the shelves.

- [x] **Mundus becomes a guide** (the user's notes, 2026-10-20). The user asked for "an
      exploration friend" that guides you to things to consume and do at your level, steers you
      in the right direction, and is full of recommendations and tips to take on as you go. They
      wanted a different name, design, layout, function and direction.
  - *Plan and build (2026-10-20):* the name stays Mundus, at `/mundus` (Iter and Mundus were tried
    and dropped). Tabs: Your guide, Explore, Every pick, Things to try. On desktop they are a tab
    strip with 1–4 as shortcuts, and the guide has a side panel.
  - **Real pictures, not template icons:** book covers come from Open Library, series posters from
    TVmaze, podcast artwork from Apple, and logos, portraits and photos from Wikipedia. Lookups are
    cached on the device. Film posters still need the free TMDB key.
  - **The engine** is `src/core/mundus/guide.ts`, pure and tested. It reads the last seven days of
    activity, split into reading, listening, watching, words and writing. It steers toward the
    quietest of these, leaning toward what the learner said they enjoy (writing only for those
    who like it). It then picks three next steps, each with its reason:
    - something to enjoy in that lane, at the learner's level;
    - a thing to try away from the screen, at their stage;
    - a way to grow: the next Grammatica topic, a room not tried yet, or a stretch pick one level up.
  - **The page:**
    - a note on the week, with a compass (one spoke per lane, the needle pointing where to go);
    - "Next for you";
    - "Your path": four stages from Starting out to Going deep, with a taste of what comes
      further along;
    - "Things to try": tips by stage, which open up as you go;
    - "Explore everything": the room shelves.
    - `/mundus/picks` and `/mundus/try` hold the full lists.
  - **Elsewhere:** Home's card shows Mundus's first step, and the rooms' "Ideas from Mundus" lines
    open its shelves. No new tables.
  - The picks, tips and shelves keep their code in `core/mundus` and `features/mundus`.

### 3.0-8 · Grammatica and alphabets

*Skipped by the user on 2026-10-20 ("do -9 just skip -8") after parts 1 and 2a, then resumed the
same day ("everything has been done from Lingua 3.0 except grammar and alphabet, so finish it").*

Built as in [`GRAMMAR-PLAN.md`](GRAMMAR-PLAN.md), steps 1–4:
- [x] Grammar files, the topic browser, explanations and tables (2026-10-20: Spanish 28 topics,
      German 23, French 21, Russian 17, Arabic 16, Mandarin 15).
- [x] The drills: conjugate, decline, pick the form, word order. Items are FSRS cards, with mastery rings.
- [ ] Topic maps for every language (Spanish and German first).
- [x] Links from the word drawer, Home and Ludus; placement; Ratio and Tabula.
- [x] **Progressive, high-quality exercises:** each topic's drills climb in steps (recognise the
      form, pick it, build it, use it in a sentence, translate into the language), in real
      sentences from the language's examples, with a short explanation of every mistake. A lesson
      mixes new items with due ones, ends with a short review, and unlocks the next topic only
      when it is mastered. Transform, spot-the-mistake and, with an AI key, free sentences that are
      corrected and explained.
- [x] **Grammar when it's needed, examples first** (the user's notes, 2026-10-19). Cases, verb
      aspect, verbs of motion and the other structures that translation drills alone can't teach
      get short lessons of their own, in a set order: a few example sentences first (with audio),
      then a concise explanation of the rule, then the learner uses it straight away, then more
      examples. Explicit side-by-side comparisons of structures that are easily confused (ser and
      estar, perfective and imperfective, accusative and dative, идти and ходить). No long grammar
      chapters: a lesson is offered at the moment it's needed. When a form in the reader, a song,
      a card or a drill uses the structure, "Why this form?" opens just that lesson, and a
      mistake in a drill links to it too.
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

**Order set by the user (2026-10-20).** Six parts, each committed and pushed on its own, starting
with the six core languages (Spanish, Russian, German, Arabic, Mandarin, French):
1. [x] Grammar files, the topic browser, explanations and tables.
2. [x] The drills (conjugate, decline, pick the form, word order) as FSRS cards, with mastery rings.
3. [x] Progressive exercises, and lessons that show examples first.
4. [x] Links from the word drawer, Home and Ludus; placement; Ratio and Tabula.
5. [ ] Alphabets and writing practice for the languages with their own script.
6. [ ] The other languages, tier by tier, keeping tier 2 and below cheap.

Content rules: every rule is checked against a named source (listed in each module's `sources`),
every sentence is a real sentence from the language's pack (a test enforces it), and a topic
without clean sentences or a checkable rule is left out and named in the module's `notes`. The
tables below (Dexie v13 and so on) are unchanged; the parts above replace the old part numbering.

**Part 1, as built (2026-10-20).** Six modules in `src/core/grammar/topics/` (es, ru, de, ar, zh,
fr); `/grammatica` lists them by unit with a "Next up" card, and a topic page shows examples
first, then the rule, comparisons, tables, a "watch out" line and more sentences. Arabic is set
right to left. `scripts/grammar/mine.ts` finds candidate sentences in a pack. The phone's top
bar title is now a flex item, so a long topic title no longer runs under the four header icons.

**Part 2, plan (2026-10-20).** The drills as FSRS cards, with mastery rings, and (the user's
note of the same day) "heavily expand Ludus and the grammar lessons with more interactivity,
fun and engaging exercises, and customizable lessons". Two commits:

*2a: grammar drills.*
- `src/core/grammar/drills.ts`, pure and seeded, makes the exercises from a topic's items. Each
  step has its own kinds:
  1. Recognise: which of two sentences is right? Or hear the sentence and pick the form you
     heard.
  2. Pick: fill the gap from four forms, or complete the topic's table.
  3. Build: type the form, with its base word and cue. Or match the table's pairs.
  4. Use: put the words in order, or tap the wrong word.
  5. Say it: build the sentence from its English, with a wrong form among the tiles.
- Tiles split on spaces; Mandarin splits by `Intl.Segmenter`. The form stays one tile.
- Russian stress marks are taken off the form and the wrong forms, so they don't give the
  answer away.
- A typed form missing only its accents still counts, unless a wrong form is spelled the same
  way without them (hablo, habló). Arabic is compared without its vowel marks on the same terms.
- A lesson screen, `/grammatica/:topicId/lesson`, full screen like Ludus.
  - About ten exercises of the topic's current step. A missed one comes back once at the end.
  - A mistake shows the correct sentence, with the topic's one-line reason.
  - "Can't type this now" turns a typing exercise into a choice.
- **Progress.**
  - Each item is an FSRS card in `grammarItems`, made the first time it is answered: no mistake
    is Good, right after a retry Hard, missed twice Again.
  - Answers are logged in `reviewLogs` with mode `grammar` and deck `grammar:<lang>`, and counted
    in the day's reviews. Items not due are logged without moving their schedule, as in Ludus.
  - 80 % right on the first try passes a step; after step 5 the topic is learned.
  - The ring fills a fifth per step, and turns gold with a crown once half the topic's items are
    mature.
- `/grammatica/review` drills the items due across topics, each as an exercise from a step its
  topic has passed.
- The topic page gets a lesson card: step dots, Start, and Practise once the topic is learned.
  The room gets a Review button when items are due.

*Shared by both kinds of lesson* (`src/features/lesson/`):
- **A combo streak** for answers right in a row, with a small burst at 3, 5 and 10.
- **Short sounds** made in the browser (no audio files) and a vibration on phones. Both can be
  turned off.
- **An end screen** with the best combo, accuracy and time, and confetti for a perfect lesson.
- **A setup sheet** (a gear on the lesson screen and before starting), kept in settings
  (`lessons`):
  - the length: 5, 10, 15 or 20;
  - which exercise kinds to include;
  - typing on or off;
  - the mode: Classic, Lightning or Zen. Lightning is a 60-second round of quick choices with a
    personal best. Zen has no combo, timer or sounds.

*2a, as built (2026-10-20).* As planned. Lightning became a button beside Start rather than a
mode in the setup sheet, so the sheet's modes are Classic and Zen. Spot the mistake is used only
when the form is one word; for word order the form is split into its words.

*2b: Ludus expanded.*
- New kinds of exercise:
  - Listen: hear the word and pick it.
  - Dictation: hear the sentence and build it from tiles.
  - Spell: put the word's letters in order, for languages written with letters.
  - True or false: does this word mean that?
- The combo, sounds, end screen and setup sheet above.
- Lightning mode: quick choices against the clock. It is logged as practice and doesn't move
  any schedule.

*2b, as built (2026-10-20).* As planned. Listening and dictation appear only where a natural voice
speaks the language (Lingua 2.0 removed the robotic ones). Spelling skips Mandarin, Japanese,
Korean and Arabic. Lightning is a button on a deck and at the end of a lesson.

**Part 3, plan (2026-10-20).** The user asked on 2026-10-20 to finish 3.0-8 after all, so parts
3 to 6 go ahead. Part 3 covers progressive exercises and lessons that show examples first:
- **Examples first.** A step lesson opens with a "See it" screen: three sentences with the form
  marked, each of which can be played, and on a desktop the topic's rule beside them. The first
  lesson on a topic also shows the rule and the comparison. Later steps show one sentence and the
  one-line reason. "Start" (or Enter) begins; reviews and Lightning skip it.
- **The rule one tap away.** After a mistake, "See the rule" opens the topic's rule, tables and
  comparison in a side panel (a bottom sheet on a phone), without leaving the lesson.
- **Mixed with what's due.** A step lesson adds up to three items due from other topics, each
  labelled with its topic.
- **What went wrong.** The end screen lists the sentences missed, each with its reason and a
  speaker, so the lesson ends with a short review of its mistakes.
- **Your own sentence, with an AI key.** At step 5 and in practice, a last exercise asks for a
  sentence of the learner's own using the topic. The AI checks it, corrects it and explains in
  one or two lines. It is practice and moves no schedule. Without a key it isn't offered.
- Left out: transform drills (present to past, singular to plural). The items are real
  sentences, so they don't come in pairs, and a generated pair could be wrong.

*Part 3, as built (2026-10-20).* As planned. The "See it" screen shows all three examples and the
rule for step 1 and a topic's first lesson, and one example with its reason for later steps. On a
desktop the rule sits beside the examples. A step is passed on the topic's own exercises only, so
items mixed in from other topics don't count for or against it.

**Part 4, plan (2026-10-20).** Grammar where it's needed, and in the numbers:
- **"Why this form?" in the word drawer.** The pack's description of the form tapped ("first-person
  singular preterite indicative of comer") is matched to a topic by `topicForTags`. A chip under
  it opens that topic. Arabic and Mandarin have no tagged forms, so they show none.
- **Home.** A Grammatica card shows the next topic with its ring, or the items due for review,
  and opens the lesson.
- **Ludus.** The end of a lesson offers "Grammar: <next topic>" when the language has a grammar.
- **Placement.** For a learner who has done no lessons yet, Grammatica offers a short check: two
  quick gaps per topic up to one level above theirs. It stops after three topics missed in a
  row. A topic with both right is marked learned (`placed`), and its items are left for review.
- **Ratio, Overview.** A Grammar panel: topics learned and mastered, accuracy and time per topic,
  the three weakest, and topics learned per month (a new `learnedAt` on the progress row; no
  index, so no new Dexie version).
- **Ratio, Tabula.** The "In Lingua" column adds the grammar level reached: the highest level
  whose topics, and every topic below it, are all learned.

*Part 4, as built (2026-10-20).* As planned, except placement: instead of stopping after three
topics missed in a row, it asks about at most twelve topics. That is about two minutes, and a miss
streak would end the check at the learner's first weak spot. It has no retries and moves no
schedule. Once some progress exists, the check stays available as a quiet "Check what I know"
button beside Review and Lightning. The Ratio panel shows only when one language is chosen, and its
"Needs work" list opens each topic's practice. Tabula shows "grammar A1" once every A1 topic is
learned, and "N grammar topics" before that.

**Original plan (2026-10-20).** Four parts, each pushed once it works:
1. **The Grammatica room, with Spanish and German.** `/grammatica` is a header section, with an
   icon in the phone's top bar beside Mundus. Each language's topics are a typed module,
   `src/core/grammar/topics/<lang>.ts`, loaded only when needed, like Mundus's picks. This
   replaces the plan's `.json.gz`: the modules are typed, tests check them, and Vite splits them
   per language.
   - **A topic** has a one-line summary, then example sentences first (each one can be played
     aloud), then a short rule. After that come tables, side-by-side comparisons for pairs that are
     easily confused, a "watch out" line, and the one-line reason shown after a mistake.
   - **Drill items** are compact: a sentence with the form in brackets, its English, three wrong
     forms and sometimes the base word. Five steps are generated from the same items
     (`src/core/grammar/drills.ts`, pure and seeded):
     - recognise: which of two sentences is right;
     - pick: the gap, from four forms;
     - build: type the form;
     - use: put the sentence in order, or tap the wrong word;
     - say it yourself: build the sentence from its English, with the wrong forms among the tiles.
   - **A lesson** is about twelve exercises. They come from the topic's current step, plus items
     due from earlier steps and topics. A mistake shows the rule's line, and the item comes back
     at the end.
   - **Progress.** A step unlocks the next once you get 80 % right, and a topic is learned after
     step 5. Items are FSRS cards in `grammarItems`, and each topic's step is kept in
     `grammarProgress`. Both are added in Dexie v13 and to BACKUP_POLICIES. A topic's ring fills
     as you pass its steps, and it turns to "mastered" when most of its items are mature.
   - **Nothing is locked.** "Next up" is the first topic you haven't learned at or below your
     level. `currentGrammarTopic(lang)` in `src/data/grammar.ts` returns it for the rest of the
     app.
   - **Spanish and German** get about thirty topics each, A1 to B2.
2. **Topic maps for the other eighteen tier-1 languages**, in the same shape. Each gets twelve to
   twenty topics covering the core from A1 to B1, with the structures that need a lesson of their
   own (cases, aspect, verbs of motion, particles, measure words, politeness). Wider maps are a
   later step. Tier 2 gets no grammar, to stay cheap.
3. **Alphabets and writing** for ru, el, ar, ja (hiragana and katakana), ko (Hangul) and zh
   (pinyin and tones, then the first characters).
   - An Alphabet tab in Grammatica, offered first to beginners.
   - A chart with sound.
   - Lessons of five or six letters: see and hear them, match sound to letter and letter to sound,
     read real words, then write.
   - Letters are FSRS items in the same table.
   - Writing happens on a canvas that takes a finger, pen or mouse. Strokes are checked for order,
     direction and shape. The stroke data comes from:
     - KanjiVG (kana, CC BY-SA 3.0);
     - Make Me a Hanzi (characters, Arphic and LGPL), fetched by `scripts/grammar/strokes.ts`;
     - Hangul jamo strokes written by hand.
   - Cyrillic, Greek and Arabic have no free stroke-order data. They are traced over the letter and
     checked by how well the ink covers it. This gap is noted.
4. **Links and the rest:**
   - "Why this form?" in the word drawer, matched by the form's tags.
   - A Home card when a topic is next.
   - A grammar link at the end of a Ludus lesson.
   - A short placement check that skips topics you already know.
   - Grammar in Ratio and Tabula.
   - Then the docs and a handover.

### 3.0-9 · Lingua 3.0 complete: the full check ✅

Done 2026-10-20. The user asked to do 3.0-9 and skip 3.0-8 ("do -9 just skip -8"): Grammatica's
parts 1 and 2a are live, the rest of 3.0-8 (drills beyond 2a, alphabets and writing) is left out
of Lingua 3.0, so the check leaves grammar, alphabets and writing out too.

- [x] Every point of "Lingua updates.txt" checked against the app, one by one (the Lingua 2.0
      list, the three Lingua 3.0 lists and Tier 2; the 4.0 lists are planned for 4.0). The table
      below gives each point and how it was checked.
- [x] Every room on a phone and on desktop, light and dark: 29 rooms and tabs (Home; Codex,
      Diarium, Add; Thesaurus and Discover; Sonus, Audiobooks, Radio; Sonus+ Today, Explore,
      Search, Podcasts, Library; Visio and Services; Grammatica; Colloquium; Mundus and its three
      pages; Ratio and Iter; Ordo and four groups) at 1280 px and 375 px, each in Paper and
      Nocturne: nothing wider than the screen, no errors. Taps and the keyboard were checked in
      the reader (hover, drag across words, right-click) and in a Colloquium chat; scrolling in
      the sweep. Offline: the build precaches the app (Workbox); not tried with the network off.
- [x] All twenty languages end to end (a script in the dev app, each language's real services):
      every one has its dictionary pack (92–99.7% of its 1,000 most common words explained on a
      tap; what's missing is mostly names, English and contractions, which the online lookup
      covers), Mundus picks (14–37), radio stations (11–638), music picks (9–11 artists, 10–12
      styles) with songs found, podcasts (13–24 for the first suggestion), LibriVox where it has
      books, and Colloquium prompts in the language. Found and fixed: **Korean found no songs**
      (Apple's Korean store answers nothing; it now searches the US store, and Serbo-Croatian the
      Serbian one instead of the silent Croatian one), and **German podcasts opened on a search
      with one result** ("deutsch lernen" first now, 25). News: every language has a source but
      Latin. Voices: none in the app's own test browser, by design (only natural device voices, or
      Gemini's with a key; this browser has only the old robotic ones); see QA-ios.md for a
      phone. Comics work the same in every language (checked in 3.0-6).
- [x] The app's version says 3.0 (3.0.0 in `package.json`; Ordo › About shows "Lingua 3.0").
      Docs, then commit, push and the live site checked.

**The brief, point by point.** ✓ checked in the app on 2026-10-20 · T by tests or data · P on a
real phone (QA-ios.md) · S skipped with 3.0-8.

| Point (Lingua updates.txt) | Where it is | Check |
| --- | --- | --- |
| Ten new languages (Arabic … Bahasa) and their flags | the language list, packs | ✓ all twenty |
| Music: find songs, lyrics that follow, saved and discover | Sonus+ (Cantus) | ✓ songs in all twenty |
| Foreign radio stations, like Radio Garden | Sonus › Radio, the map | ✓ |
| Recommendations with buttons out (Spotify, Netflix …) | Mundus | ✓ picks in all twenty |
| Visio: choose your streaming services | Visio › Services | ✓ |
| Codex: reading level when adding; PDFs; edit a text | Codex › Add, ⋯ › Edit | ✓ (level), T |
| Codex: translations that fit the sentence | the reader | ✓ "cada tarde" → afternoon; evening |
| Codex: hold and swipe to translate words or a sentence | the reader | ✓ "paseo con mi perro" → walk with my dog |
| Codex: news articles | Codex › Add › Article | T |
| Codex: the word panel (forms on their own tab, level) | right-click a word | ✓ Meaning/Forms, "#622 · A1" |
| Codex: no learning/known on hover | the reader | ✓ |
| Codex: every language well supported | the packs | T 92–99.7% |
| Thesaurus: Discover designed; no flash between cards; right-click panel; buttons; Ludus icon; no word voice-over | Thesaurus | ✓ (Discover), T |
| Onboarding: two more steps, then "what you enjoy" removed | onboarding | ✓ four steps |
| Good voices per language, not American, cheap | voices (device or Gemini) | P |
| Liquid Glass tab bar (phone only) | the phone shell | ✓ in the sweep, P |
| Sync between desktop and iPhone | Ordo › Your data | P |
| Home laid out for desktop and phone | Home | ✓ |
| At least six themes for Paper and for Nocturne | Ordo › Look and feel | ✓ 6 + 6 |
| Phone: discover pages fit; no sideways scrolling bars | everywhere | ✓ 29 rooms at 375 px |
| Commute mode's light/dark button | Sonus › Commute | T (3.0-2) |
| Podcasts on one page on desktop | a podcast's page | ✓ (3.0-3) |
| Cantus: playing in sync with lyrics; lyrics that load | Sonus+ player | ✓ (Cantus C, live) |
| Styles to explore at the top, more per language | Sonus+ Today | ✓ 10–12 styles each |
| Hold to translate on songs, podcasts and videos | the players | ✓ (3.0-3) |
| Song games that teach the language too | Song games | ✓ (3.0-3) |
| Sonus: Library first, then music and podcasts | Sonus and Sonus+ | ✓ (now split, as the user asked) |
| A song page without double scrolling | the player | ✓ (Cantus A) |
| Comics | Codex | ✓ (3.0-6) |
| Audiobooks and audio courses | Sonus › Audiobooks | ✓ |
| Prompts and links for voice or text chats with AIs | Colloquium | ✓ |
| Grammar exercises; writing letters and characters | Grammatica | S (topics and lessons 2a live) |
| Tips for learning outside the app | Mundus › Try | ✓ |
| Tier 2: fifteen beta languages | the language list | ✓ all have packs |
| Radio map; full-screen station; recently played radios; music page explore | Radio, Library, Sonus+ | ✓ (3.0-6 part 1) |

### Cantus overhaul (design handoff)

The user's design handoff (2026-10-19; a mock-up, frames 2a desktop and 2b phone, and a written
brief kept outside the repository) asks for three workstreams, built beside 3.0-6 in a session of
their own and pushed to `main` one by one. Its design comes first; its search and full-song
playback make the room really work.

**Plan:**
- **A. Cantus, a room of its own.** `/cantus` is an app inside the app: no sidebar, tab bar or
  mini player; an X leaves it for Sonus › Music, which says "Back in Lingua · The song keeps its
  place" with an Open Cantus button. Always dark and immersive (the mock-up's ground, the song's
  artwork colours as its glow, Cantus rose for the rest), Plus Jakarta Sans throughout. Today
  (a song for today with how many of its words you know, then rails: most played now, artists to
  learn with, styles to explore), Explore and Library (today's Music shelves, moved), and Search;
  a pill nav on desktop, a bottom bar on a phone. A glass now-playing bar while you browse, and a
  full-screen player (`/cantus/song/:id`): artwork, actions, progress and transport beside the
  lyrics on desktop, the lyrics above the controls on a phone. Every feature of the song page
  stays (save, Learn it, the target, translations shown, blurred or hidden, line actions, word
  glosses, the source menu, the timing nudge, the credit). Playback lives in the room, not the
  page: the song plays on while you browse, and keeps its place when you leave. Old
  `/sonus/song/…` links open the new player.
- **B. Search that finds songs.** Apple's search index leaves out some artists' own recordings
  (Bad Bunny's "BAILE INoLVIDABLE" and "Diles" are missing from every store's results, though
  Apple's catalogue has them by artist). Search asks several places at once and merges them:
  Apple in the language's store and a few more (us, mx, …), the artists the query names (their
  whole catalogue by Apple's artist lookup), LRCLIB's song list (which knows the songs people
  sing), Spotify when connected; typos are put right from what comes back ("inolvidabel" →
  "inolvidable"). Results: a top result, songs, artists and albums, filter chips, recent searches
  and style tiles, live as you type, with the keyboard.
- **C. One clock, whole songs.** One source plays at a time (Sonus pauses, the others stop); the
  lyrics follow only it, corrected on seeks, buffering and returning to the tab. A song with no
  whole-song source gets one found by itself: YouTube (with the learner's own free key, kept on
  the device and sent in a header; or, without a key, the public Piped and Invidious directories
  the brief names, tried in turn), Dailymotion's open search, and SoundCloud or Bandcamp links
  pasted by hand; ranked by title, artist and length (within about 3 s), official audio first,
  never live, cover, sped-up or lyric videos. "Playing from YouTube · Official audio", with "Not
  this one". One field takes a link from any of them. Apple and Spotify are labelled
  "30-second preview" where that is what they play.
- [x] A: the room, its pages, the now-playing bar and the full-screen player, on phone and desktop.
  Built 2026-10-20: `src/features/cantus/room/` (the room, its four pages, nav, the now-playing
  store), the song page turned into the room's player (`SongPlayer`, kept mounted and folded while
  browsing), Song games over the room, Sonus › Music's closed state, `/sonus/song/…` redirected.
  Not built: the Song for today's "words you know" count (it needs the song's lyrics before it is
  ever opened; left for later). The old Music room (`MusicRoom.tsx`) is gone; every shelf moved.
- [x] B: search, with tests for the brief's six queries (mocked), merging, ranking and typos.
  Built 2026-10-20: `services/cantus/search.ts` (+ `fuzzy.ts`) and `room/search.tsx`; 12 tests.
  Checked live the same day: all six queries put the right song (or Bad Bunny) on top. Spotify
  only tells search who sings a song (a Spotify track with no Apple match can't be opened yet).
- [x] C: the master clock, finding whole songs, any link, the source menu; checked with real songs.
  Built 2026-10-20 (`services/cantus/fullsong.ts`, SoundCloud clock, link players). Checked live,
  keyless: 10 of 10 songs (4 English, 4 Spanish, 2 Russian) got a whole recording within 4 s of
  Apple's length; YouTube playback stayed within 2 ms of the lyrics clock; seeking either way and
  switching source kept the place. Not built: Dailymotion search (its player has no clock here);
  Vimeo, Dailymotion and Bandcamp links play with the lyrics started by hand.

### Sonus and Sonus+ (user's request, 2026-10-20)

Sonus becomes two places. **Sonus** (in Lingua, as now) is your **Library**, with **Audiobooks** and
**Radio** as its other tabs. **Sonus+** is the room built for Cantus, the Apple-like app for finding things to
listen to: songs to sing and learn, and now **podcasts**, in its dark design,
with one now-playing bar for whatever plays. (The user moved Radio, then Audiobooks, back out of Sonus+.)

- [x] Sonus+: the room's tabs are Today, Music (your songs and new ones; Explore and the room's
  Library merged) and Podcasts, with Search in the header. Its address stays `/cantus`.
- [x] Podcasts, episodes and audiobooks open over the room (`/cantus/podcast|play|book/…`, Sonus's
  own pages with a Back button); their links stay in the room (`features/sonus/paths.ts`).
- [x] The now-playing bar shows an episode or a book while it plays; starting one stops the song.
- [x] Sonus: Library, Audiobooks and Radio (`/sonus/audiobooks` and `/cantus/audiobooks` open the tab). Sonus+ has a card at the top (it says the room is closed when you
  come back from it); old `?tab=music|podcasts` and `?q=` links open Sonus+.
- [x] Library overhaul, laid out like Apple Music's library:
  - [x] Under the top cards, **categories** with counts: Songs, Podcasts, Episodes, Audiobooks,
    Stations, Your audio (only those you have). Two columns on a phone, six across on a desktop.
  - [x] Songs, Podcasts, Episodes and Your audio open a view of their own inside Library
    (`?view=…`, so Back returns); Audiobooks and Stations open their tabs.
  - [x] Then **Recently played** (a row), **Recently added** (a grid of what you saved last, of
    every kind), **New episodes**. One tile for every kind of item. Checked on a phone and at
    1280: categories, both rows, a Podcasts view with Back; a podcast followed in Sonus+ opens
    over the room and its episode plays in the bar.

### Handover for the Lingua 3.0 session

**Where Lingua 3.0 stands (2026-10-20): complete and live, version 3.0.0.** 3.0-6 (Radio and
Music, comics, audiobooks and courses, Colloquium), 3.0-7 (Mundus) and the full check, 3.0-9, are
done; the user skipped the rest of 3.0-8 (Grammatica's topics and lessons 2a are live). The
Cantus redesign became Sonus+ ("### Sonus and Sonus+"). **Next: Lingua 4.0, when the user asks**
("## Lingua 4.0"). Other sessions may still push to `main`: rebase onto `origin/main` before
every push. Dexie versions: v10 audiobooks (`media.bookId`), v12 Mundus's challenges, v13 Grammatica, v14
Colloquium's chats; v11 stays unused (a device already past it would never run it). The next
free one is v15.
**Desktop first (the user, 2026-10-20).** Every session designs and builds for the desktop app
first: layout, design and functions. The phone must keep working, but desktop is the priority.
See CLAUDE.md.

- **Audiobooks, where things are:** `src/data/books.ts` (a book is its parts), import in
  `services/sonus/files.ts` (`importBook`, `readAudioTags`), LibriVox and the free courses in
  `services/sonus/librivox.ts` and `courses.ts`, the sleep timer's rules in `core/audio/sleep.ts`
  with the engine's part and chapter handling in `services/audio/engine.ts`, read along in
  `services/sonus/readAlong.ts`; the pages are `features/sonus/BookPage.tsx`,
  `library/BooksTab.tsx` (the Audiobooks tab), `library/BookGrid.tsx`, `library/AddBookDrawer.tsx`, and `player/BookBar.tsx`, `Chapters.tsx`,
  `SleepTimer.tsx`.
- **Colloquium, where things are:** the scenes and the prompts in 20 languages in
  `src/core/colloquium/prompts.ts`, chats in `src/data/chats.ts`, the AI's turn (JSON, and the
  rule that a correction must quote the learner) in `src/services/llm/colloquium.ts` on
  `chatJson` in `client.ts`; the pages are `features/colloquium/ColloquiumPage.tsx`,
  `ChatPage.tsx` and `HomeCard.tsx`. A section can now be `placement: 'side'` (desktop sidebar
  only); `sectionKey` gives Alt 1 … 9 and 0.
- **Not checked with real things yet:**
  - Live text with a real Groq key (the no-key path is checked), and a Colloquium chat with a
    real Groq or Gemini key (checked with the test key and a stubbed network).
  - Audiobooks: a real M4B with chapters, a folder of MP3s, read along with a real transcript,
    and playing on into the next part with an iPhone locked (QA-ios.md, 3.0-6 part 3).
  - Comics from a real CBZ (checked with drawn test pages, in dev and in the production build).
  - The radio map, station page and comics on an iPhone (QA-ios.md, 3.0-6 parts 1 and 2).
- **Testing tips from this session:**
  - In the dev app, modules load by path, so a test comic can be drawn on a canvas and added with
    `(await import('/src/services/import/comic.ts')).importComic('es', files)`. Bare package
    names (like 'dexie') don't load that way.
  - A synthetic `drop` event with a `DataTransfer` works in the production build.
  - Tesseract's language data comes from jsDelivr the first time.
  - Git Bash heredocs lose backslashes, and `cat > file` with no heredoc waits for input. Write
    patch scripts with the Write tool, into the scratchpad.
  - `gh` isn't installed. Check the deploy with
    `curl https://api.github.com/repos/sanchour/lingua./actions/runs?per_page=1`.

**3.0-1 to 3.0-5 are done and on `main` (2026-10-19, third computer).** The user swapped steps
twice: 3.0-5 became Radio (done), then **comics, audiobooks, courses and AI conversation became
3.0-6** (being built on the third computer, with the user's notes on Radio and Music), and
**Grammatica and alphabets moved to 3.0-8**, with the user's notes on teaching grammar when it's
needed. Lingua 4.0 is planned at the end of this file. Japanese place names (日本) are now counted, so the reader keeps them whole. The first ten
packs were not rebuilt with this session's builder (see DECISIONS). Not checked on an iPhone yet:
hold to translate on touch, the preview clock and the fixed song page (QA-ios.md, 3.0-3); voices
with a real Gemini key, the camera scan and syncing over a mobile network (QA-ios.md, 3.0-4);
radio on the lock screen and with the screen off (QA-ios.md, 3.0-5).

The rest of this handover is the state before that session, kept for its notes.

**Where 3.0-1 stood (2026-10-18, end of the second PC's session):** everything is on the branch
`lingua-3.0/languages-wip` (pushed). Typecheck and the 191 tests pass there; no new pack is built yet.
- Done on the branch: flags for all twenty (`src/design/flags.tsx`, a flag picker in Ordo ›
  Languages, a flag sheet in the Device lab); readings over words in the reader (Ordo › Reading);
  Arabic right to left by CSS (`[lang='ar']`); for the ten new languages: writing prompts,
  welcome texts, news feeds (checked for CORS), level hours, detection, context rules, pronoun
  rows, card samples, articles, typing helpers, podcast searches, speech locales, subtitle codes,
  Apple stores, chart sources (`scripts/cantus/charts.ts`) and Discover artists and styles.
- Data tools: `count.ts` (new: Japanese and Mandarin counts from OPUS, split the reader's way);
  `themes.ts` maps Mandarin (`cmn`) and Norwegian (`no`) and prefers Simplified characters.
- **Half done, in `scripts/lang-data/build.ts`:** imports, `entryReading` (pinyin / kana),
  `readSpellings` (Simplified ↔ Traditional; kanji spelling → kana entries), Mandarin entries
  re-keyed to Simplified in `readEntries`, Mandarin "character" entries kept, `reading` on
  `LexicalData` and in the lemma's IPA slot. **Still to wire inside `build()`:**
  1. At the start: `spellings = await readSpellings(source)`, `traditionalOf.clear()`,
     `japaneseLexicon = null`.
  2. Japanese: link each kanji spelling to its kana entries (`formLinks`), and in `lemmasFor`
     put the redirect targets (`kanaOfKanji`) first. Consider keeping the soft-redirect targets
     apart from kana entries' listed kanji, and only use the latter when the kanji has no entry.
  3. Build-time rule linking for forms nothing links to: `baseCandidates(form, lang)` (and for a
     kana word, the kanji entries whose reading is that kana, `kanjiOfKana`); add candidates to
     `needed` before pass 2, then link the first one found in `lexical` through `tableLinks`.
  4. `addForm`: the fifth field, the reading (Mandarin: the lemma's pinyin; Japanese: the kana
     lemma for a kanji spelling, else `readingOf(form, lemma, lemmaReading)`).
  5. Mandarin: add each lemma's Traditional spelling as a form (`traditionalOf`).
  6. Japanese: set `japaneseLexicon` once forms exist and split example sentences with
     `segmentJapanese` in `wordsOf` (`JAPANESE_RUN` is already defined).
  7. The pack's `source` line: name OPUS for Japanese and Mandarin, Leipzig for Latin and Swahili.
  Then `node scripts/lang-data/count.ts zh` (Japanese was counted already, but redo it on a new
  PC), build the ten packs, add everyday-word checks for each to `glosses.test.ts`, run the
  charts script, and check every new language in the browser.
- `counted-ja.txt` looked mostly right, but stray endings (い, る, す, た, って) rank high: the
  splitter leaves some colloquial endings alone. Look at `deinflect`'s rules for て/た/る forms
  before building Japanese.
- After 3.0-1: **3.0-1b, the tier-2 beta languages** (planned above).

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

## Lingua 4.0

The user's list for Lingua 4.0 (2026-10-19) is under "Lingua 4.0" in "Lingua updates.txt". It
comes after Lingua 3.0 is complete (3.0-9). The user asked for at most five steps, so each step
combines a lot; each is planned in detail when it starts. Where something can't be done as asked,
the step says so and what is done instead.

**The languages in 4.0, by tier** (the user's second 4.0 list; names in the app in brackets). The
user's list has a line "Tier 2: The ones already in place with new ones: Icelandic, Frisian, Ancient
Greek, Bengali, Punjabi (20 in total)"; it is read as tier 3, whose list has the same five new ones
and makes 20 with them. The new languages are placeholders for now, as the user said.

| Tier | Languages | What they get |
| --- | --- | --- |
| 1 · Core (Core) | Spanish, Russian, Mandarin, French, German, Arabic | Everything at its best, and Cursus, the course (4.0-4). The most work goes here. |
| 2 · Full (Full) | Italian, English, Portuguese, Greek, Swedish, Hungarian, Dutch, Norwegian, Turkish, Indonesian, Swahili, Latin, Japanese, Korean | Everything (packs, recommendations, Sonus, Cantus, Grammatica, alphabets) except a course. |
| 3 · Partial (Beta) | Hindi, Polish, Tagalog, Vietnamese, Thai, Persian, Cantonese, Czech, Romanian, Serbo-Croatian, Malay, Tamil, Georgian, Uzbek, Mongolian, and new: Icelandic, Frisian, Ancient Greek, Bengali, Punjabi | What today's beta languages have, built by script: an automatic word pack, decks, Codex with lookups, podcasts, radio, music search, an alphabet page where the script is new. No hand-written grammar. |
| 4 · Basics (Basics) | Hebrew, Ukrainian, Finnish, Danish, Catalan, Bulgarian, Kazakh, Afrikaans, Amharic, Yoruba, Armenian, Burmese, Urdu, Slovak, Estonian, Lithuanian, Latvian, Khmer, Albanian, Maltese | The bare minimum, added in one go: Codex with tap-to-translate (Wiktionary where it has the word, machine translation otherwise), your own words and decks, radio and podcast search. A small word pack only where the data comes free with the tier 3 script. |
| Experimental | Esperanto, Old Norse, Sanskrit, Haitian Creole, Quechua, Maya (Yucatec), Hawaiian, Māori, Irish, Basque | Offered under "Experimental", as tier 4 where the services know the language, less where they don't; said plainly on the language. |

### 4.0-1 · Languages in tiers, a new language picker, smooth, a new icon, and Lingua+
- [x] **Five kinds of language:** the tiers above become one field on each language (`tier: 1 | 2 |
      3 | 4 | 'x'`, replacing today's `tier?: 1 | 2`), and what a language shows follows from it
      (Cursus for tier 1, the beta notes for 3, the short list of rooms for 4 and experimental).
      The 25 new languages are added as placeholders: name, endonym, script, flags, sample sentence,
      fonts; tier 3's packs come from the existing pack script, tier 4 gets no pack of its own.
      *Done (2026-10-20):* `tier: 1 | 2 | 3 | 4 | 'x'` on every language (`core/lang/languages.ts`,
      with `TIERS` for names and what each comes with); today's fifteen beta languages are tier 3.
      35 placeholders (5 + 20 + 10, not the 25 the plan said: tier 3's five, tier 4's twenty and
      the ten experimental) are marked `soon`: they show on the map and in the list, and tapping
      one says it is on the way instead of choosing it. `AVAILABLE_LANGUAGES` is what can be
      chosen (35). Flags are drawn for all their countries. *Not done:* the placeholders have no
      sample sentence, pack or fonts for their scripts yet (they come with their tier).
- [x] **"What will you read?" as a map with a list:** the onboarding page (and Ordo › Languages)
      shows the world map from 3.0-6's Radio (same drawing, same gestures) with a dot where each
      language is spoken, beside a list on desktop and above it on a phone. The six core languages
      come first as large cards, then tier 2, then the rest in a compact list with a search box
      and the tier shown. Tapping a language flies the map to where it's spoken; tapping a place on
      the map shows its languages at the top of the list. *Done (2026-10-20), in the onboarding
      page:* `app/onboarding/LanguageMap.tsx` draws Radio's countries with a dot where each
      language is spoken (its flags' countries; a number where several languages meet), drag to
      move, ctrl and the wheel or two fingers to zoom, +/−/world buttons; picking a language flies
      the map to it, tapping a dot or country lists its languages first. The list has Core as
      large cards, Full as cards, then the rest as compact rows with their tier and a search box.
      Ordo › Languages still adds another language through the same page.
- [x] **Every animation at 60 fps:** find the clicks and transitions that still stutter (the
      Performance lab, a phone and a desktop) and fix them as PERFORMANCE.md says. *Done as far as
      reading the code can say (2026-10-20):* the app was checked against PERFORMANCE.md's rules and
      the three places that animated `width` or `height` (the song games' two progress bars, Home's
      week chart) now move with transforms. Left as they are, on purpose: the sidebar's width (a
      contained, fixed box, noted in its code) and the video clip's reveal, which can't be a
      transform. *Not measured:* no frame times on a phone or in the Performance lab (they need a
      real device): run Ordo › Performance on the iPhone and a laptop.
- [x] **The phone's tab bar in liquid glass,** like the glass slider, on the phone only. Fix the
      bug where, after using the slider, a section needs two taps before it opens. *Done:* the bar
      was already glass from 3.0-2; it now has a sheen from above, more blur and light, and the lens
      swells under a finger as in iOS 26. **The bug:** after a drag the browser often sends no click,
      so the flag that swallows "the click that ends a drag" stayed set and ate the next tap; it now
      clears when a new press starts and 350 ms after a drag.
- [x] **Desktop sidebar:** Ratio and Ordo at the bottom left. **A better Thesaurus icon.** *Done:*
      Ratio and Ordo are a group of their own at the bottom of the sidebar; Thesaurus is a stack of
      cards (`GalleryVerticalEnd`), no longer the library shelves.
- [x] **A new app icon:** more minimal, in the spirit of Apple's own apps, fitting Lingua, with a
      background that follows light and dark. iOS chooses a Home Screen web app's icon when it is
      added; iOS 18 and later can also show any icon dark or tinted. The icon is drawn for both,
      and the step checks how far an installed app can follow the switch by itself. *Done:* two
      solid pages with a ribbon cut out of one, no outline, on a soft gradient; terracotta on warm
      paper for light, a lighter terracotta on warm charcoal for dark. `public/icons/*.svg` feed
      `scripts/icons.mjs` (the two Home Screen PNGs) and `public/logo.svg` (favicon and the rest, which
      follows the browser's light or dark). The in-app logo is the same mark. *What an installed app
      can do:* iOS reads the Home Screen icon once, when Lingua is added, which is why index.html picks
      the light or dark PNG then; it can't switch afterwards, and iOS 18's own dark and tinted looks
      are made by the system from the icon, not chosen by the app. *Not checked:* on a real iPhone.
- [x] **A placeholder Lingua+:** a one-time purchase of 29.99 that unlocks everything; the free
      edition has Codex and Thesaurus. Built into the app (where it is offered, what it includes),
      but the purchase button charges nothing and nothing is locked yet. Ordo has a button to
      reset Lingua+, which removes it again. *Done:* Ordo › Lingua+ (what is free, what Lingua+
      adds, "Get Lingua+" and, once had, "Reset Lingua+"), and a quiet card on Home until it is had.
      One number on the device (`meta.plusAt`, `data/plus.ts`); nothing checks it yet. The price shows
      as 29.99 without a currency, to be set with real purchases.
      *Reworked the same day at the user's request:* Lingua+ stays in settings (a room of its own was
      tried and removed), as a full page in Ordo › Lingua+ with every room linked, and a small raised
      "+" beside the Lingua name once it is had; the sidebar now fits a laptop screen (rooms scroll,
      Ratio and Ordo stay at the bottom); Thesaurus has a hand-drawn deck icon.

### 4.0-2 · Codex, a full dictionary, and one memory for every word ✅

**Plan (2026-10-20), built in this order:** (1) Codex › Add's tabs and the word drawer on one
screen; (2) reading time, a goal and the end page; (3) the word memory; (4) sentences with a gap;
(5) the full dictionary. Dexie **v15** is taken by this step (`sightings`, `fullDict`); the next
free version is v16.

- [x] **A full dictionary for the six core languages, as good as Oxford's, inside Lingua** (the
      user's third 4.0 list).
  - **What can't be done as asked:** Oxford's own dictionaries can't go in the app. Their content
    is licensed, and their API is paid and needs a server to keep its key.
  - **What was done instead (2026-10-20):** `scripts/lang-data/dictionary.ts` builds one file per
    language from the English Wiktionary extract (kaikki.org) into `public/dict/<lang>.v1.json.gz`:
    every headword with a meaning of its own, not only the frequent ones. Spanish 84,000 words,
    German 78,000, French 67,000, Russian 49,000, Arabic 17,000, Mandarin 156,000 (keyed by the
    Simplified spelling, the Traditional shown beside it); about 40 MB in all, 2–13 MB each.
  - **Each entry has:** the pronunciation (IPA; pinyin with tones for Mandarin) with a recording
    from Wikimedia Commons where there is one; every sense with Wiktionary's labels (formal, slang,
    regional, Latin America, …), old and rare senses last, with up to two real examples each and
    their synonyms and antonyms; the other half of pairs (perfective/imperfective, feminine and
    masculine, the plural); set phrases with their meaning (Wiktionary's multi-word entries that
    contain the word); related words; words easily confused (one letter apart among the 20,000
    most common, or for Mandarin the same syllables in other tones); the etymology; the frequency
    rank and level; and the inflection table from the language pack.
  - **On the device:** downloaded once per language (Codex › Dictionary, "Download the
    dictionary"), stored in the `fullDict` table by a worker, then looked up and searched offline.
    It can be removed again from the same page.
  - **Where it opens:** "Full entry" in the word drawer; a search box in Codex's header (desktop;
    a dictionary button on the phone) and above Thesaurus › Word memory; the page
    `/codex/dictionary/<word>`, with every word in it a link to its own entry.
  - **Not done:** definitions from each language's own Wiktionary (a second, larger download per
    language), Tatoeba's sentences (they need the whole Tatoeba link list to pair sentences with
    translations), and tidying the most common entries with AI (needs a key; Lingua never uses the
    user's own in a build). Arabic is thin (17,000 headwords, few recordings) because the English
    Wiktionary is.
- [x] **The word drawer fits on one desktop screen** (the user's third 4.0 list). *Done:* on
      desktop the drawer is 780 px wide with two columns (the word and its meanings; where it was
      met, examples and "Explain"), tighter spacing, at most three senses for the first entry and
      two for the others with "N more meanings" to fold the rest open, and the AI explanation's
      notes and examples folded. Checked at 1366×768 on a dozen common French words: the tallest
      came to 486 of 675 px. On a phone the drawer is as it was.
- [x] **Codex › Add: "Import a book" and "Import a comic" as tabs of their own.** *Done:* Write or
      paste · Import a book · Import a comic · News & links · Goodreads (on a phone Write · Book ·
      Comic · News · Goodreads). The book tab takes EPUB, PDF and text (a comic dropped there still
      goes to comics); the comic tab takes archives, PDFs, pictures and a folder of pages. Old
      `?way=file` links open the book tab.
- [x] **An end page** after finishing a book or a text. *Done:* the last page opens a quiet full
      page: "The end", the title and author, then four numbers for this sitting (time read, pages
      or words read, new words met, words looked up) and today's reading against the goal, with
      "Mark as finished" and "Keep reading". New words are the words on the pages read that were
      still unseen; looked up counts right-clicked and tapped words.
- [x] **Reading time and a goal** in Codex. *Done:* Codex's header shows today's minutes against
      the goal with a ring; it opens to choose 5–60 minutes (`dailyGoal.codexMinutes`, 15 by
      default; Home's goal stays the one for every kind of study). The reader shows a soft note
      when the goal is reached in that sitting, only at a page turn or a new paragraph, never
      mid-sentence, and not again that day.
- [x] **A personal memory of every word.** *Done:* every word looked up (the drawer, a tap in the
      reader) or marked (Known, Learning) anywhere, in a book, a comic, a song, a podcast, a film,
      a conversation or a card, is kept in `sightings`: one row per word and place, with the
      sentence, how often and when, filed under its lemma so the forms of a word are one word.
      The drawer shows "Met before" (the other places, with their sentences, linked), and
      Thesaurus has a third tab, **Word memory**: every word with its forms and places, sorted by
      where it came from (books, songs, conversations, …), by how well you know it (Learning,
      Known, Looked up) and by theme (the ready-made theme decks), with a search. Decks themselves
      stay as they were; the memory is the tidy view across them. Fixed on the way: Colloquium
      saved a word as Known while saying "in your words to learn"; it is now Learning.
- [x] **Sentences with a gap, like Clozemaster.** *Done:* Thesaurus › "Sentences with a gap"
      (`/thesaurus/sentences`, under Ludus): rounds of 15 real sentences with one word missing, at
      three levels: Choose (four choices, keys 1–4), Type (the first letter as a hint) and Harder
      (no hint, the translation only after answering, rarer words). Your own words come first
      (Learning, then words you looked up, with where you met them), then words of your level by
      frequency; a miss comes back once at the end of the round. Sentences are the pack's examples
      with their translation, or the sentence you met the word in. **As a card type:** a deck's
      settings have "Card front: The word / A sentence with a gap"; with the second, a word →
      meaning card that has a sentence shows it with the word missing.

### 4.0-3 · Removed (2026-10-20)
The user removed this step: the karaoke and the song games are dropped. Its Visio part (YouTube,
the streaming services, the browser extension) moved to Lingua 5.2-4. The number stays so the
other steps keep theirs.

### 4.0-4 · Cursus: a course with a clear path, and speaking and writing
*Cursus becomes a room with tabs in Lingua 5.1-1 (step 2 of [HANDOVER.md](HANDOVER.md)); the
course fills its Course tab.*
- [ ] **Cursus** (Latin for "a course"), a new room: a course like Duolingo, HelloChinese or Busuu,
      organised by level, with a clear learning path, each lesson with a clear objective.
- [ ] **Units named by what you can do after them,** not by how many lessons they hold: after the
      first Russian unit you can introduce yourself, describe your family, order food and ask
      simple questions. The path shows where you are and where you're going.
- [ ] **Every skill:** reading, listening, speaking and writing exercises, grammar explained when
      it's needed (3.0-8), sentences with a gap (4.0-2), and feedback on writing and speaking from
      AI with a key. Feedback from other speakers needs a community and a server, which Lingua
      doesn't have; the step looks at a light way to do it (sharing an exercise to a speaker).
- [ ] **More open questions and active production,** in Cursus and across the app: answer in your
      own words, describe a picture or a scene, retell what you read or heard, write the next line.
- [ ] **Speak your journal:** in Diarium a microphone button; what you say is transcribed (Whisper on
      the device, or Groq with a key) into the entry, to read back and correct. Links and prompts
      to talk in the language with ChatGPT, Claude, Gemini or Copilot in their own apps (with
      3.0-6's conversation corner).
- [ ] **How possible:** quite possible, and the largest step of 4.0. Most parts exist: words and
      themes per language (the packs and themes.ts), grammar topics and drills (3.0-8), sentences
      with audio (packs and voices, 3.0-4), Ludus exercises, Diarium with AI corrections, Whisper.
      The new work is one shared outline of can-do units (A1 to B1, from the CEFR's can-do lists)
      filled per language with that language's words, grammar and sentences, and the room around
      it. Only the six core languages (tier 1) get a course, as the user decided: Cursus is
      where most of the work goes, so each of the six is done well rather than twenty done thinly.

### 4.0-5 · Lingua 4.0 complete: the full check
- [ ] Every point of the 4.0 list checked against the app, on a phone and on desktop, light and dark.
- [ ] The app's version says 4.0. Docs, then commit, push and the live site checked.

## Lingua 5

The user pasted the Lingua 5 list in two halves (2026-10-20), each planned in detail: **5.1** in
[LINGUA-5.1-PLAN.md](LINGUA-5.1-PLAN.md) and **5.2** in [LINGUA-5.2-PLAN.md](LINGUA-5.2-PLAN.md) (the
user's points, the design of each step, the files, the tests, what "done" means). The user's
decisions are at the top of the 5.1 plan: Stripe; Max is AI with your own key; Lingua+ €24.99 once,
Max €5.99 a month or €49.99 a year; desktop only. **On 2026-10-20 the user asked to make it ready to
start: it is built in the order of [HANDOVER.md](HANDOVER.md).** The steps, ticked here as they finish:

- [ ] 5.1-1 · Rooms in the new order: Cursus, Sonus et Visio, Mentis; the device's light; no more "Ideas from Mundus"
- [ ] 5.1-2 · Lingua+ (€24.99 once) and Lingua+ Max
- [ ] 5.1-3 · Onboarding: intro pages, a map without dots, accurate language data, twelve new flags, the new screens
- [ ] 5.1-4 · Home: Today, Next up, the week, Cursus, Mundus, numbers (the old Home one setting away)
- [ ] 5.1-5 · Codex (on top of what 4.0-2 built)
- [ ] 5.1-6 · Thesaurus and Ludus: deck list and cards, a much larger Discover, even and varied Ludus
- [ ] 5.1-7 · Sound: human recordings and a natural on-device voice without a key
- [ ] 5.1-8 · Keyboard practice in Cursus (tier 1)
- [ ] 5.1-9 · A touch of the language in the design
- [ ] 5.1-10 · Lingua 5.1 complete: the full check (one check with 5.2-10)
- [ ] 5.2-1 · Settings (Ordo's new name), a narrower sidebar, flashcard widths (built with 5.1-1)
- [ ] 5.2-2 · Radio: only stations in the language, a better list, a tuner for countries
- [ ] 5.2-3 · Listening: audiobooks and free courses, the book page, the player, Commute, Sonus+ settings
- [ ] 5.2-4 · Visio: dual subtitles for YouTube and the streaming services, real service marks (Lingua 5's own step; Lingua 4.0-3 was removed)
- [ ] 5.2-5 · Diarium: writing tools, a calendar, search, in the language
- [ ] 5.2-6 · Sermo: a guided path into your AI app, many more scenes
- [ ] 5.2-7 · Mundus: an interactive guide, one Explore, Things to try
- [ ] 5.2-8 · Grammatica: a guided path at your level, lessons at desktop size
- [ ] 5.2-9 · Ratio: one language, compact, goals in Tabula instead of Iter, more numbers
- [ ] 5.2-10 · Lingua 5 complete: the full check
