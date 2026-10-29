# Decision log

Short records of choices that are not obvious from the code. Newest last.

## Phase 1 — 2026-10-15

- **Name: Lingua.** Section 1 is **Home** (was "Focus"); the other six keep their Latin names.
- **No Supabase.** Local-first only (IndexedDB via Dexie). Devices exchange data with backup files:
  Ordo → Backup → Share (AirDrop / Save to Files) on one device, Ordo → Restore (merge) on the other.
  Rows still carry `updatedAt` / `deletedAt`, so cloud sync could be added later without migrations.
- **Vite, not Next.js.** No server exists; SSR conflicts with IndexedDB. Static build → any HTTPS host.
- **Russian and Greek are priority languages** (full support). Others run in basic mode until packs exist.
- **Fonts.** UI: Plus Jakarta Sans for Latin with **Inter** as fallback for Cyrillic and Greek
  (Jakarta only ships `cyrillic-ext`). Reader fonts and their script coverage:
  Literata (Latin, Cyrillic, Greek) — default · Lora (Latin, Cyrillic) · Merriweather (Latin, Cyrillic) ·
  Newsreader (Latin) · Atkinson Hyperlegible (Latin). Missing scripts fall back to Noto Serif Variable
  (serifs) or Inter (Atkinson), so Russian/Greek text never drops to a random system font.
  Fonts are self-hosted (Fontsource) so they work offline.
- **Colour tokens.** Spec colours are used as given. In Paper mode terracotta `#C86D51` and sage
  `#6B8E78` are ~3.4:1 on cream, so they are decorative only; text uses `#A5533B` (5.0:1) and
  `#4F6F5B` (5.2:1). Nocturne colours all pass AA as given.
- **Primary buttons are ink-on-paper** (espresso fill, cream text); terracotta/amber is the accent for
  active states, learning highlights and focus rings.
- **iOS status bar.** Paper launches with `default` (dark text), Nocturne with `black-translucent`
  (light text). iOS reads this once at launch, so a theme change updates the status bar on next launch.
- **Updates use a prompt**, never auto-reload, so a new version can't interrupt a review or audio.
- **Backup files are `.zip`** (not a custom extension): the iOS file picker greys out unknown types.
- **Section shortcuts are Alt+1…7** on desktop (Ctrl+number is taken by browser tab switching).
- **Node.js 24 LTS** installed via winget on the development PC (2026-10-15).
- **Several languages per learner.** Ordo → Languages → "Learn another language" re-runs onboarding;
  each language keeps its own profile and the active one can be switched. Restoring a backup keeps
  only the most recently activated language active.
- **Benchmarks ignore Reduced Motion.** App animations respect the system setting, but the device-lab
  benchmark always animates because it is started on purpose.

## Phase 1 verification (2026-10-15)

- Type-check clean; 19 unit tests pass (Russian/Greek normalisation, tokenizer, merge rules,
  phone → desktop backup round trip, frame statistics).
- Production build: 41 precached files (~1 MB incl. Latin/Cyrillic/Greek font subsets), icons,
  maskable icon and 44 light/dark iPhone launch screens generated from `public/logo.svg`.
- Checked in the built-in browser at desktop and 375×812: onboarding (ru, A2, Nocturne), sidebar
  collapse (`[`), Alt+7 → Ordo, tab bar, large-title collapse, bottom sheet drag-to-dismiss, no
  console errors.
- Not verifiable in the built-in browser: service worker registration (the pane refuses SW script
  fetches) and frame rate (the pane throttles when hidden). Confirm both in Edge/Chrome or on the iPhone.

## Phase 2 planning — 2026-10-15

- **Ten languages with full support:** English, Spanish, Russian, Portuguese, French, Greek, German,
  Italian, Swedish, Hungarian (replaces "Russian and Greek first"). Instant translations are in
  **English**; for English as a target language the pack gives English definitions.
- **Interface language stays English.** The list above is about languages you learn.
- **New features planned** (specs in `FEATURES.md`): richer statistics (recorded from Phase 2,
  dashboards in Phase 6), **Tabula** (polyglot capabilities table) and **Iter** (journey timeline,
  milestones, goals, study log) in Phase 6 under Ratio, **Diarium** (journal with LLM correction and
  grading) in Phase 5 under Codex. The plan grows from five to **six phases** so no phase overflows.
- **Tabula columns** will be matched to the learner's own existing capabilities table.
- **LLM model is picked from the provider's live model list** (models get retired), defaulting to a
  Llama 3.x 70B-class model on Groq or a Flash model on Gemini.

- **Scope commitment (learner's request):** everything in the original brief and later requests is in
  scope except automatic sync. Where an outside service sets the limit, Lingua does the most it allows:
  Goodreads via CSV import/export, Apple Books via DRM-free EPUB, Spotify via embeds plus podcast RSS.
- **Language packs built** (v1, 22 MB total, served from `public/packs/`, installed on demand):
  top-1k gloss coverage en 98.8 · es 98.5 · ru 99.0 · pt 98.3 · fr 96.1 · el 95.3 · de 97.5 ·
  it 94.3 · sv 97.8 · hu 96.1 %. Russian also indexes е-spellings of ё words; Greek indexes
  accent-free spellings (subtitles, ALL CAPS). Portuguese frequency is Brazilian (OpenSubtitles pt_br).
- **Gloss order:** a form's own meaning first, except nouns/adjectives that are also forms of a very
  common verb (είναι → "to be").

## Phase 2 build — 2026-10-15

- **Reader:** CSS-column pages (two-page spread with a gutter fold from 940 px), spring page turns,
  swipe on touch, arrows/keys on desktop; scroll mode as an alternative. Long chapters are stored in
  parts of ≤ 2,500 words. Text is **ragged-right by default**: justified text without hyphenation
  leaves rivers on phones (Chrome on Windows can't hyphenate Russian); justify is one tap away.
- **Word interaction:** desktop hover → instant gloss (measured 0.2–1.1 ms), click cycles
  Unseen → Known → Learning → Unseen, click the gloss (or D) for details; touch tap → bubble with
  Known/Learning pills, long-press → details. State changes repaint spans directly, then save.
- **Learning creates a flashcard** in the language's "From my reading" deck with the sentence as
  context; Reset removes a never-reviewed card, suspends a reviewed one.
- **Language packs install themselves** (Web Worker) the first time a language is studied; the
  proficiency seeding (e.g. A2 → top 500 forms Known) runs right after.
- **AI explanations** (Groq or Gemini, the learner's key) list the provider's live models; keys are
  sent only in request headers. MyMemory runs anonymously (no e-mail parameter in URLs).
- **Activity recording is live:** reading sessions, words read, new Known/Learning per day and a
  daily vocabulary snapshot feed the streak, Home's goal ring and (in Phase 6) Ratio.
- **Removed:** the "A" typography shortcut (the desktop panel is a popover opened from the bar).

## Open — to confirm on a real iPhone (Ordo → Device lab → Copy report)

- Lock-screen background audio in standalone mode with MediaSession controls.
- `navigator.storage.persist()` result for the installed app.
- Share sheet with a file (Web Share level 2).
- Long-press on a word without the iOS callout / text selection.
- Status bar appearance in both themes.

## Phase 3 build — 2026-10-15

- **Scheduling is FSRS** (ts-fsrs, fuzz on, short-term steps on), 90% desired retention by default,
  per deck. The day ends at 4 am, like Anki. Learning steps due within 20 minutes are shown in the
  same session. New cards are interleaved one per four reviews.
- **Ludus grades each card once per lesson:** no mistakes → Good, right on the one retry → Hard,
  missed twice → Again. Only due or new cards move on the schedule; extra practice (when nothing is
  due) is logged but never reschedules. "Ludus counts as review" can be switched off in Ordo › Study.
- **A card that matures** (interval ≥ 21 days) marks its word Known in the reader (switchable).
- **Ready-made decks** are frequency *bands* (Top 250 = words 201–250) of lemmas, not word forms,
  so "Top 1,000" means 1,000 dictionary words. Words already Known can be left out, and a word that
  is already a card in another deck is never added twice. They go into a "Ready-made" folder.
- **Themed lists** come from English Wiktionary's translation tables: the translation table of the
  concept's main sense, Wiktionary's own order, regional and rare words last (Brazilian first for
  Portuguese), then the first candidate the language's dictionary knows. A short hand-checked
  override list fixes the few misses found in review (e.g. Spanish *plátano*, Greek *φαγητό*).
- **Dictionary glosses were cleaned while doing this** (benefits the reader's hover too):
  abbreviations and letter names no longer speak for a word (French *ce* ≠ "CE"; Russian *я* = "I",
  not "the letter Я"), grammar tags and descriptions are trimmed ("[with prepositional] in, at" →
  "in, at"), verbs show "to …" first, and among the 500 most common words function-word meanings
  come before nouns and interjections. Packs are now v5 and refresh on their own.
- **Anki import keeps progress:** FSRS memory state when the deck used FSRS in Anki, otherwise
  interval → stability and ease → difficulty. Supports old (.anki2/.anki21) and new (.anki21b,
  zstd) packages, cloze notes, reversed cards, first sound and image per note. Runs in a worker
  (sql.js WASM, cached on first use). Anki's review history is not imported.
- **Deletions keep tombstones**; deleted cards move to a `~deleted` deck id so deck counts stay
  index-only and cheap.
- **Listening uses the device's own voices** (Web Speech API, offline). The voice and speed are
  device-only settings; listening exercises are skipped where no voice exists.
- **Customizable flashcards:** font (the five reader fonts), style (Plain · Index card · Bookplate ·
  Linen), seven soft colours mixed into the card surface (gentler in Nocturne) and text size; in
  Ordo › Flashcards and the study screen's Aa button. Ludus uses the same font.
- **Escape in a popover is "handled"** (preventDefault) so page shortcuts never act on the same key.
- **Hover translation (reader) is pointer-driven** and the tooltip never catches the mouse; word
  details open with right-click or D (clicking the tooltip would block the words under it).

## Polish before Phase 4 — 2026-10-16

- **No pure white or black chrome.** New `--inverse` / `--on-inverse` tokens: espresso with cream
  text on Paper, old-paper cream with espresso text on Nocturne. Used by primary buttons, toasts,
  tooltips and the reader's translation (hover tooltip and tap bubble). Nocturne ink leans cream.
- **Show answer** is a soft accent tint (terracotta by day, amber by night), not a solid slab.
- **Reading papers:** seven day papers (Cream, Ivory, Parchment, Sepia, Sage, Blush, Stone) and seven
  night papers (Charcoal, Espresso, Sepia night, Ink, Forest, Plum, Midnight), chosen separately.
  The colours live once in `design/papers.ts`; a generated stylesheet keys them to `data-theme`, so
  the paper flips with the theme inside the same view transition. The status bar follows the paper.
- **Online lookups are hedged:** the next provider starts if one hasn't answered in 0.9 s; first
  useful answer wins (tested). Hover waits 70 ms before going online. Measured: a dictionary hover
  updates the tooltip in ≈0.5 ms (max 2 ms); online fallbacks answered in 0.4–0.9 s, then cached.
- **Codex library:** shelves grouped as Reading · Up next · Wishlist (Goodreads, no EPUB yet) ·
  Finished, with a filter, search (`/`), sort (recent, added, title, author, progress, easiest
  first) and a covers/list switch. Sort and view are device-only.
- **Language switcher** in the sidebar chip (and the phone top bar): every studied language, a
  cross-fade of the whole app (View Transition) that waits until the new language has rendered;
  pages that belong to one language (a book, a deck) return to their section first.
- **Motion preference** (Ordo › Preferences): System follows the device; Reduced makes CSS
  transitions instant and springs skip movement (MotionConfig "always"); Full adds liquid page
  enters, animated reordering of shelves, smooth in-page scrolling and a longer theme cross-fade.
  Browsers already animate at the screen's refresh rate (120 Hz where available). Device-only.
- **Thesaurus overview:** a Today panel (progress ring for the day, review/new split, week ahead),
  then two tabs: My decks (search, sort by most to do · recently studied · name · size, applied at
  every folder level) and Discover (ready-made decks). Search also finds ready-made themes.

## Phase 4 build (Sonus) — 2026-10-16

- **Word clicks are learning-first:** one click marks Learning, a second Known, a third resets.
- **One audio engine for the whole app** (`services/audio/engine.ts`): a single `<audio>` element
  outside React, so playback survives page changes and the lock screen. Coarse state in a small
  store; the playhead goes to subscribers every frame while visible and on `timeupdate` while hidden.
  Positions save every 5 s and on pause; listening time is recorded in chunks (statistics, goal, streak).
- **iOS playback rule:** every play button calls `unlockAudio()` before any await (a moment of silence
  played inside the tap), so later programmatic play is allowed.
- **Sentence repeats** loop a sentence back at its end, with the chosen pause while the screen is on;
  with the screen locked they jump back without pausing, so the system can't suspend the app.
- **Lock screen:** Media Session metadata with artwork; previous/next track = previous/next sentence
  when there is a transcript, otherwise skip back/forward.
- **Podcasts:** search uses Apple's public directory (no key); feeds are RSS, parsed in the browser.
  Episodes stay inside the feed row and become library items only when played or saved. Most feeds
  and many hosts allow apps to read and download them; where a host blocks downloads (no CORS), the
  episode streams, the message offers to open the file, and a saved file can be attached to the
  episode. An optional relay address (Ordo › Listening) covers such hosts.
- **Transcripts:** SRT/VTT (including karaoke word timestamps), plain text (spread over the audio by
  length, marked approximate), or Whisper on Groq with word timings and the learner's key in the
  header only. Downloaded files over 24 MB are split at MP3 frame boundaries and stitched by
  duration; streamed episodes are fetched by Groq itself from their address. One cue per sentence.
- **Karaoke view** reuses the reader's word engine, hover tooltip, tap bubble and word drawer, so a
  transcript is read exactly like a book. Time-driven highlighting writes to the DOM directly.
  "Open in Codex" turns a transcript into a text only when asked (shelves stay uncluttered).
- **Commute mode** shows the spoken sentence large with big controls and an optional screen wake lock.
- **Spotify** plays in Spotify's embed (DRM: no download, transcription or lock-screen control by
  Lingua). Its iFrame API reports the position, so a transcript file still follows along.
- **Thesaurus tabs:** the tab you pick always wins; with no decks, My decks shows the ways to start,
  and the Today panel appears once there are decks.
- **Deferred:** Whisper running locally on WebGPU (large download, needs testing on the devices).

## 2026-10-16 — Codex, Thesaurus and Ludus refinements

- **Word clicks land every time:** a click within 10 px of where it started counts, a click in the
  gap between words picks the nearest word, words get a little vertical padding, and each change
  flashes a soft ring (sage for Known, terracotta for Learning).
- **Word forms (packs v6):** each pack carries inflection tables for its 6,000 most common lemmas,
  from Wiktionary via kaikki.org. Rows with pronunciations, clitic forms and summary duplicates are
  dropped. `core/lang/paradigm.ts` lays out conjugations by person (I / you / he·she / we …), cases
  by number and the rest as "All forms". These tables are stored in `dictParadigms` (Dexie v5).
- **Word drawer order:** Meaning (with a small "+ Deck"), Dictionary, Forms, In context, Explain.
- **Adding to the library is a page** (`/codex/new`): write or paste, import a file, or Goodreads.
  A designed cover (14 cloths × 5 ornaments) or your own picture can be chosen there and later
  on the book's details page (`/codex/book/:id`, "Cover & details" in the book's menu).
- **Ready-made decks open full screen** (`/thesaurus/ready/:key`) as a booklet. The frequency decks
  show as a vocabulary journey: a winding trail with named stops and a "You are here" flag.
- **More Ludus exercises:** tap what you hear (sentence tiles), translate the sentence (English
  tiles), which article (de, es, pt, it, fr, el, sv), and say it out loud (the browser's speech
  recognition). "Can’t speak now" turns the lesson's speaking exercises into typing. Sentences in
  fill-the-gap and translate exercises have the reader's instant translations.
- **End of a session:** the next step ("Another lesson") on top, "Done" quietly below, always stacked.
- **Phones:** sub-pages rely on the top bar's back button, which now goes to the section, so
  pages show no second back link.
- **Grammar:** planned as its own section for Lingua 2.0, in [`GRAMMAR-PLAN.md`](GRAMMAR-PLAN.md).

## 2026-10-17 — Diarium, Ratio, Tabula, Iter

- **Order changed on request:** Phase 5 is Diarium only; Visio and local Whisper move to the next
  step, together with a clearer Home.
- **Icon:** a single open-book line glyph with a terracotta ribbon on a flat ground, in a light and
  a dark version. iOS takes the Home Screen icon when Lingua is added, so index.html offers the one
  matching the phone's appearance at that moment; iOS 18+ can also restyle icons itself (Dark,
  Tinted, Clear), and a flat glyph renders cleanly there. The browser-tab icon follows the theme live.
- **Updates install themselves:** new versions are looked for at launch, on returning to the app and
  every 30 minutes, and applied at launch or while the app is in the background, never during a
  lesson or while audio plays. A toast says when it happened.
- **Diarium:** prompts come from the AI when a key is set (cached per day) and from curated prompts
  in all ten languages otherwise. The check returns JSON (corrected text, a native-like version,
  corrections with category, explanation and severity, scores, CEFR estimate, two strengths, one
  tip); the review keeps the text it read, so later edits show as "Check again". The word diff
  (core/diff, tested) groups replacements so each change can be tapped for its explanation.
- **Ratio** reads everything from what is already recorded (sessions, daily statistics, review logs,
  words, the journal, the study log); nothing is precomputed. Charts are small hand-drawn SVGs with
  a hover/tap readout. Retention counts review-state cards only (FSRS-style true retention).
- **Milestones are found, not logged:** `checkMilestones` scans the history after each session and
  at start, dates each milestone to when it actually happened, and records it once (deterministic
  ids). Only ones reached in the last minutes get a toast.
- **Tabula** keeps any language, including ones Lingua doesn't teach (`x-<name>` ids). Notion's CSV
  export imports with Dutch or English headers and statuses; a changed level is written to Iter.
- **Goals are honest:** level projections use rough study-hour estimates per CEFR level (slower for
  Russian, Greek, Hungarian and German) and the recent pace; they say when the pace isn't enough.
- **Reset:** one language's progress (books, audio and the journal stay), or everything; both need a
  typed word. Erasing keeps the installed app shell, so Lingua still opens offline.

## 2026-10-17 — Visio, Whisper on this device, Home

- **Videos live like Sonus audio:** a `media` row of kind `video`, its file in `blobs`, and two
  `transcripts` rows (`target`, `native`). "Keep subtitles only" deletes the file and keeps the
  rest, so cards and words keep working; the file can be attached again.
- **Lingua draws its own subtitles** over the video (so words can be hovered, tapped and marked);
  the tracks are also given to the `<video>` as WebVTT, hidden, and shown only in the iPhone's own
  full-screen player, which can't show page content. Elsewhere full screen is the stage element,
  and popovers, drawers, glosses and toasts render into whatever element is full screen
  (`usePortalRoot`).
- **One word engine per view, kept in step:** a change in the subtitles repaints the transcript
  beside them and the other way round (a document event; nothing is saved twice). Words found in
  Sonus or Visio keep the line's clip (`mediaId`, `startMs`, `endMs`), so their cards can play it.
- **Whisper on this device** runs transformers.js in a module worker: WebGPU (fp16 encoder and q4
  decoder when the GPU has shader-f16) with WebAssembly (q8) as the fallback, using the
  `onnx-community/whisper-*_timestamped` models for word timings. Audio is decoded to 16 kHz mono on
  the main thread (workers have no AudioContext) and cut at pauses into two-minute parts for
  progress. The 27 MB engine and the models are not precached; transformers.js fetches and caches
  them on first use (jsDelivr and Hugging Face), and the worker script is cached when first used.
  Only the model files are downloaded; no audio leaves the device.
- **Groq takes videos too:** their sound is decoded and sent as 16-bit WAV parts of up to ten
  minutes (under the 25 MB limit), cut at the quietest moment; long non-MP3 audio works the same way.
  Whisper sentences are split into subtitle-sized lines with their word timings.
- **English subtitles** come from a file, from the AI (40 lines a batch with the lines before as
  context, cached), or one line at a time from the free translators when asked ("Translate this
  line"), since translating a whole film that way would run past their daily limits.
- **Streaming sites can't play inside Lingua** (DRM and their terms); their subtitle files can be
  added as "Subtitles only". Streaming services are revisited in Lingua 2.0.
- **Home** shows what to do next rather than more statistics: reviews due, the book, episode and
  video in progress, today's journal prompt; the week as bars; four numbers from the same sources
  as Ratio; the latest milestone; and a first-steps list that disappears when done or dismissed.

## 2026-10-17 — Lingua 2.0-1: reading, words and cards

- **The device voice is gone.** Web Speech voices sounded poor and often didn't speak at all, so
  the speaker buttons, the listening exercises and the voice settings were removed rather than
  patched. Real audio (clips from Sonus and Visio) stays.
- **Context glosses in two layers.** Without a key, the word before decides between a form's
  senses (an article or a quantifier points to a noun, a pronoun to a verb, "muy" to an adjective
  or adverb), from small per-language word lists and the pack's parts of speech. With an AI key, the
  sentence is sent once when you first hover or tap a word in it (not every paragraph in the
  background), so a long book never costs more than what you actually look up.
- **Phrase selection is Lingua's own**, not the browser's text selection: words are spans that
  toggle on click, and iOS's selection handles would fight the long-press. Mouse: drag beyond a few
  pixels. Touch: long-press marks the word, sliding extends; letting go without sliding opens the
  drawer. Up to 60 words, so a paragraph fits but a chapter doesn't.
- **Phrases are cards** in "From my reading" tagged `phrase`, with the sentence as context, so
  they study like any other card.
- **"+ Deck" moves Learning words.** A word marked Learning already has a card in "From my
  reading"; adding it elsewhere used to make a second card. Now it moves the one card, with its
  history.
- **Practise again** goes over the session's cards once more, shuffled, without touching their
  schedule (FSRS would treat a second look minutes later as a real review). Missed cards come round
  again at the end of the pass.
- **Onboarding asks two light questions**, both optional: why (kept for later suggestions) and what
  you enjoy (orders Home's "Next up"; due cards never drop below second place, since reviews pile
  up when skipped). The time-a-day choice becomes the daily goal.

## 2026-10-17 — Lingua 2.0-2: adding and editing, PDFs, news, better dictionaries

- **Chapters are now merged like everything else (last writer wins), with tombstones.** Editing a
  book rewrites only the chapters that changed; a removed chapter keeps its row, emptied and marked
  deleted, so a backup from another device can't bring it back. Long edits are split the same way
  imports are. Reading progress is clamped to the chapters that are left.
- **The reading level is a guess you can change.** "Lingua's guess" comes from the share of a
  text's words among the 5,000 most common (names, unranked words seen three times or more, are
  left out); under 40 words there is no guess. The thresholds were set on real texts so a simple
  story reads A1–A2, not B2.
- **PDFs are read with pdf.js, loaded only when a PDF is chosen** (it is large). Paragraphs come
  from geometry, not from the text alone: a gap wider than the usual line gap (the 25th percentile,
  capped at 1.6× the body size), a change of size, or a short last line ending a sentence. Lines
  repeated on most pages (headers, page numbers) go. Chapters follow the PDF's bookmarks, else its
  headings, else ten-page parts. A PDF with almost no text per page is called scanned rather than
  shown empty.
- **News articles go through Jina Reader, and only when asked.** Browsers can't fetch most news
  pages directly (CORS), and a reader service returns clean text. It sees the article's link and
  nothing else; the page says so. Lingua then keeps the article's main run of prose (menus, link
  lists, cookie and subscription prompts and timestamps go). Sources were chosen for working
  feeds that allow cross-origin reads; Telex and Index were dropped (bot checks, consent walls).
- **Dictionaries choose the common meaning from translation tables.** English Wiktionary's
  translation tables list, for each English word, the words translators use in each language, in
  order. A gloss counts as common when a common English word's table lists the word first and
  across most of that word's senses (the share of its tables). Phrases ("go with"), look-alikes
  ("era" for era) and rare or regional senses count for less; "the" counts fully for articles,
  since its table lists every article of a language. A form's own entry is read for what it states
  ("ellos": they, them; "estoy": am), a form's part of speech decides which reading it shows
  (Hungarian "azt" is "that", not "the"), and forms of forms are followed ("tus" → tu → tuyo).
- **A lemma fallback for words the dictionary lacks**, tried before going online: case and
  definite endings, attached pronouns, Portuguese hyphens, and the end of a German or Swedish
  compound, which says it is only the end. The dictionary decides which guess is a word.
- **A test of everyday words per language** guards the builder's choices, so a later tweak that
  makes "la" read "it" or "megy" read "to go with" fails the build's tests instead of shipping.

## 2026-10-17 — Lingua 2.0-3: Ordo, easy to find your way in

- **Eight groups instead of one long page.** Reading, Study and cards, Listening and Languages
  ("your learning") come first; Look and feel, AI and translation, Your data and About and more
  follow. Each has a one-line summary of what is set now (the reading font and size, new cards a
  day, whether an AI key is connected, the last backup), and the ones that need you (no key, no
  backup yet) say so in the accent colour.
- **Phones open a group as its own page** (`/ordo/<group>`), like the iPhone's Settings; the top
  bar's Back returns to the list. A group with a single section drops that section's repeated
  title. Wide screens keep the groups in a column with the open one beside it, and switching
  groups doesn't replay the page's entrance, only a short fade of the right side.
- **Search knows every setting** by its label and by the words people use ("dark" finds Theme,
  "retention" finds Remember). Choosing a result opens its group, scrolls to the setting and
  lights its row up for a moment. The index is checked by a test against the labels really on the
  pages, so a renamed setting can't silently drop out of search.
- **Old links still land.** `/ordo#ai`, `/ordo#reset` and the like redirect to the group that
  holds that section and scroll to it; links inside the app now point at the groups directly.

## 2026-10-17 — Lingua 2.0-4: Cantus, learning through music

- **A room of its own.** Cantus sits between Sonus and Visio in the sidebar and the tab bar (six
  tabs now fit a phone) with its own warm rose, and is part of the rest of the app: Home's song for
  today, "Music" in onboarding and in what you enjoy, saved lines as cards, song games counted as
  Ludus, songs and minutes in Ratio, song milestones in Iter.
- **Songs come from Apple's public catalogue** (no key, CORS allowed): artwork, a 30-second
  preview, length and album, searched in the store of the language's main country. **Lyrics come
  from LRCLIB**, free and open and often timed to the line. A lookup that fails (offline, busy) is
  never taken for "no lyrics": the page offers to try again, and the lyrics can be searched under
  another name or pasted.
- **The music plays where it can, and the lyrics follow it.** Three clocks look the same to the
  lyric sheet: YouTube's embedded player (the whole song for everyone; the learner pastes a link),
  Spotify's (the whole song when signed in to Spotify in the browser), and a timer for music
  playing anywhere else, Apple Music included, with a second back or ahead. Apple Music's own
  player needs a developer token, so it is the timer's case. A song's timing can be nudged in
  quarter seconds and is remembered. Apple's preview is only a taste: where it starts in the song
  isn't known, so the lyrics don't follow it.
- **The lyric sheet** is built like the reader (the same word spans, states, taps, bubbles and
  word sheet), one block per line, with the English under each line shown, blurred until tapped,
  or hidden. Lines around the current one step back; the current one is larger, and its words take
  the song's colour as they are sung (paced at about 95 ms a letter, so a long instrumental gap
  isn't read as slow singing). Following the song pauses for four seconds after you scroll, with
  "Back to the song". Tapping the space or the English of a line offers From here, Save line and
  Copy.
- **Translations** read the whole song when there is an AI key (one request, the verse as context),
  otherwise the free translators line by line; a chorus is translated once.
- **The album art sets the page's colours**: the artwork is shrunk to 24×24 and the most colourful
  common shade becomes the tint, mixed into the theme so Paper and Nocturne both stay calm.
- **Spotify through the learner's own app**, as the roadmap asked: Spotify only lets apps read a
  library through a registered app, so Ordo › Music explains making a free one (five steps, with
  the exact redirect address to copy). Sign-in is PKCE, so there's no secret; the tokens are
  device-only and never in backups. Liked songs are sorted by the language they're sung in: the
  alphabet for Russian and Greek, otherwise the lyrics' little words (a small detector,
  core/lang/detect.ts), remembered per track on the device.
- **Charts are built with the app**, because Deezer allows no browser requests and Apple's chart
  feed is too flaky to rely on live: scripts/cantus/charts.ts reads Apple's and Deezer's "most
  played" for the language's countries, keeps the songs whose lyrics are in the language, and
  writes public/cantus/charts.json. The deploy workflow refreshes it every Monday; if the services
  are down, the file in the repository stays. A language with fewer than six charting songs in
  its own language shows no chart row.
- **Discover** has artists picked by hand per language, each with why they're good to learn with
  and how clear they are to follow, and styles to explore.

## 2026-10-17 — Lingua 2.0-4b: music moves into Sonus; Apple Music; Lingua 3.0

- **Music inside Sonus, first.** Six tabs on a phone were too many, and music is listening: Sonus
  became "listen and sing" with Music · Library · Podcasts. The room keeps its rose headings and
  its Latin name inside (Cantus, the "From Cantus" deck). Podcast discovery moved into Podcasts.
  Old `/cantus` links redirect; `/cantus/spotify` stays, because learners typed it into their
  own Spotify apps.
- **Apple Music without a developer token.** MusicKit needs Apple's paid developer key, and the
  embed player posts no messages. But pressing a cross-origin frame moves focus into it, which
  the page sees as `blur` with the frame as the active element: that press starts or pauses
  the lyrics' timer, and focus goes back to the page so the next press is seen too. Artwork and
  title are covered by a link of our own, so opening the song in Apple Music doesn't toggle the
  lyrics. Previews start part way into the song, hence "Tap the line you're hearing".
- **Phones open the Music app.** The embed is too tall for the docked player, and signing in to
  Apple inside a home-screen app is awkward. "Play in Apple Music" opens the song in the Music app
  and turns on line tapping for when you come back.
- **No Genius lookups.** Genius's API needs a key; sending it in a header triggers a browser
  preflight that Genius's firewall answers with 403, and keys in addresses are against this app's
  rule. Its song embed is readable from a browser, but finding the song id needs the API. So:
  LRCLIB, then lyrics.ovh, then a link to Genius's search and pasting.
- **Lingua 3.0.** At the user's request, 2.0 ends with this prompt; the rest of the brief (twenty
  languages, Grammatica with alphabets, Radio, Mundus and services, the full check) is Lingua 3.0,
  built in a new session from ROADMAP.md's handover.
- **Any computer can carry on.** The user's way of working and rules were only in Claude's memory
  on the first PC; they are now in `CLAUDE.md`, which every Claude session in this folder reads.
  `docs/SETUP.md` covers a new laptop: installs, clone, checks, moving learning data with a
  backup, and rebuilding the 2 GB word data (the subtitle corpora, once fetched by hand, are in
  `fetch.ts` now). `.claude/launch.json` runs `node` from the PATH instead of a Windows path.

## 2026-10-17 — Lingua 3.0 re-planned with the user's additions

- **Fixes and polish before new rooms.** The user added a list (phone feel, Liquid Glass tab bar,
  themes, Home layout, a working music room, natural voices, device sync). As with Lingua 2.0,
  what people use every day comes first: it is 3.0-2 … 3.0-4, straight after the languages
  (3.0-1, already under way on its branch). Grammatica, Radio and Mundus follow.
- **A second list the same evening** went where it belongs instead of into one more step:
  progressive grammar exercises and letter-writing practice into Grammatica (now 3.0-6, see
  GRAMMAR-PLAN.md), the "beyond the app" tips into Mundus (3.0-7), and comics, audiobooks,
  audio courses and AI conversation into a new 3.0-8. The full check is 3.0-9.
- **Voices come back, differently.** 2.0-1 removed the device voice because it was robotic and
  often American. 3.0-4 uses Gemini's text-to-speech with the learner's own key (in a header),
  in the accent of the chosen flag, generated once and kept; without a key only the device's
  high-quality regional voices, else no voice button.
- **Sync without accounts.** The rules forbid creating accounts, and the app is local-first, so
  3.0-4 pairs devices with a QR code and syncs them directly (WebRTC) using the backup's merge.
- **AI conversation stays outside by default.** Voice chats happen in the AI apps the learner
  already has; Lingua prepares the prompt (level, due words, current grammar) and opens the app,
  sending nothing itself. A text chat inside Lingua only with the learner's own key.

## 2026-10-18 — Lingua 3.0-1: twenty languages, every one with its dictionary

- **Unihan for Simplified Chinese, not Wiktionary's redirects.** Wiktionary points old variants at
  their modern character the same way it points Simplified at Traditional (㦱 → 我, 勺 → 的), and
  one page (还) points at the wrong characters. Unicode's own table is exact for single characters;
  Wiktionary's pairing is kept for words (學校 → 学校), where it is reliable.
- **A word's reading follows its first meaning.** Characters with two readings (还 hái/huán, 听
  tīng/yǐn) took the reading of whichever entry came first in the file; now each meaning keeps its
  entry's reading and the word is read as its usual meaning is. 的 as a particle is "de" by hand:
  Wiktionary gives only dì and dí.
- **What no dictionary lists reads as its parts.** The browser's word splitter joins 我的, 我是,
  不知道; rather than leave those blank, the tap reads "I + of", like a contraction.
- **Endings are not words.** Japanese counts from a morpheme list made い, る, た and the stem 言
  cheaper than whole words; the splitter now charges bare endings extra wherever a whole word
  fits. The same splitter runs in the reader, so it cuts sentences the way the counts did.
- **Everyday text for Latin and Swahili.** Their only word lists are Wikipedia's, where bot-made
  stubs ("…is a language with N speakers, census…") rank high. Blending in OPUS text (Tatoeba
  and the Vulgate; ParaCrawl and Global Voices) per million words keeps Wikipedia's breadth
  without its stubs.
- **A short list by hand.** After the rules, each new language's 200 commonest words were read
  through; the few still wrong (particles, pronoun forms, words whose first dictionary meaning is
  archaic) are set in `scripts/lang-data/fixes.ts`. Tests check them, as they do for the first ten.
- **Tier 2 is automatic, with honest limits (3.0-1b).** Fifteen beta languages share the pipeline
  and the app's fallbacks: English Diarium prompts, the generic sample text, three style searches
  in music, podcast searches made from the name, the device's own fonts for Devanagari, Thai,
  Tamil, Georgian and Traditional Chinese. Where a source was broken, the source changed (Leipzig
  for Hindi, Tamil, Tagalog and Georgian; subtitles counted the reader's way for Thai), but no
  meanings were set by hand, so a few common words lead with a rare meaning. The check is the
  sample sentence: at least half its words glossed (a third for Uzbek, whose Wiktionary is thin).
- **One pack, two scripts, for Serbo-Croatian.** Cyrillic is turned into Latin inside
  `normalizeWord` (кућа → kuća) and dictionary tone marks are dropped, so Serbian, Croatian,
  Bosnian and Montenegrin text all find the same entries.
- **Uzbek's ʻ is an apostrophe.** oʻ and gʻ are written with U+02BB, which the app now folds like
  the other apostrophes, so text and dictionary spellings meet.
- **A translation table can feed two packs.** Cantonese reads Mandarin's tables too (Traditional
  spellings); the evidence map now lets one table code serve several languages, after Cantonese
  briefly took Mandarin's evidence away.
- **The first ten packs stay as they are.** The builder's new rules would change them a little,
  but their checks pass and a new pack version would make every installed app download all of
  them again; they are rebuilt when there's a reason to.

## 2026-10-18 — Lingua 3.0-2: a look of your own, Liquid Glass on the phone

- **Palettes, not new themes.** Paper and Nocturne stay the two themes (light and dark, following
  the device if wanted); each gets six palettes that change the page, surfaces, lines and accent
  but keep the ink, so text contrast never drops. Accent text is held at 4.5 : 1 or better. The
  reader's own page colours (papers) stay a separate choice.
- **Glass by CSS, motion by springs.** The tab bar's glass is backdrop blur and saturation with a
  bright inner rim; the lens is one element moved by a spring whose speed stretches it (scaleX) and
  slims it (scaleY). Dragging moves it directly; release snaps to the nearest tab. Reduced motion
  sets it in place; reduced transparency makes the bar solid. Desktop keeps its sidebar.
- **Commute's light/dark button was the wake lock.** A sun icon for "keep the screen on" read as a
  theme switch that did nothing; the screen-on button is now a phone, and a real moon/sun button
  switches the theme.

## 2026-10-19 — Lingua 3.0-3: Sonus and music, fully working

- **One gesture to translate a phrase, everywhere.** The reader's press-and-drag (mouse) and
  hold-then-slide (touch) became one hook, `usePhraseGesture`, used by the lyric sheet, podcast
  and Visio transcripts and the subtitles over a video. A video holds still while a phrase is
  chosen and goes on after. One gesture means one set of habits, and one place to fix it.
- **The preview is a real source, with its own clock.** Apple's 30-second preview plays on an
  audio element, so it always plays, even with nothing connected. Where the clip sits in the song
  is unknown, so the first tap on the line you hear places it (`previewAtMs`, kept with the song).
  On phones it is the default source, ahead of the Apple Music embed.
- **Untimed lyrics get estimated times, not none.** Sung lines share the song's length by how long
  they are (a short intro and outro kept free), so the sheet follows gently, without lighting word
  by word. A tap on a line pins that line to the moment; the times between pins are stretched to
  fit. It is a guide, and says so.
- **LRCLIB is shared and often busy: ask less, wait as told.** It turns new questions away (503,
  429) when loaded. Lookups now ask at most three questions, stop at the first sure timed match,
  wait as long as Retry-After says (up to 10 s), then fall back to lyrics.ovh, and the page tries
  again by itself twice. Measured on 149 chart songs: lyrics found 72% → 81%, timed 66% → 78%.
- **A translation mixed into the lyrics is passed over.** Some uploads add the English after
  every line in brackets; those lose to any clean version of the song (backing vocals in brackets
  are short or a line of their own, so they don't count).
- **A translation that repeats the line isn't one.** Free translators sometimes give a line back
  unchanged; that is now treated as no answer (the next provider tries), and the sheet and the
  lessons skip such lines already saved.
- **Sonus opens on Library.** What you listen to (recent songs and episodes together, your songs,
  podcasts you follow, new episodes, your files) comes first; Music and Podcasts are for finding
  more. Radio (now 3.0-5) gets a fourth tab.
- **Song lessons teach the language, and the song is the bonus.** The words come from the song but
  are chosen by the learner: not known yet, within reach of their level (`LEVEL_REACH`, by how
  common the word is), one per meaning, the most useful first. Rounds go words → the word in its
  line (its meaning as the hint) → a form and its dictionary word (only forms of one word: "bois"
  in "langues de bois" is wood) → the line in English → the verse in order. Wrong options are
  real words of the song, never "pa-pala". The words can be added as cards with the line they're
  sung in. Without a translation the lesson translates the song first (and can start without it).

## 2026-10-19 — Lingua 3.0-4: natural voices, and sync between your devices

- **The accent is the voice's, not the prompt's.** Gemini's speech models (3.8 Flash TTS, through
  the Interactions API) take the text verbatim; Google's guide says to choose a regional voice
  rather than ask for an accent. So Lingua asks the voice library for voices of the flag's locale
  (`language_code=es-MX`) and uses the first, or the one the learner picks in Ordo. A locale with
  no library voice gets no Gemini voice: Gemini's general voices could sound American.
- **Each text is spoken once.** The WAV is kept in a `speech` table keyed by voice and text, so a
  card heard every day costs one request ever, and works offline after. It is a cache: never
  backed up or synced, made again on the other device when needed.
- **A device voice only if it's a good one.** 2.0-1 removed the device voice for sounding robotic
  and American. Now only voices for exactly the flag's locale, and only the natural kinds
  (Natural, Neural, Premium, Enhanced, Google, Siri), are used; otherwise there's no speaker button.
  Latin has no natural voice anywhere, so it has none.
- **Sync is a backup sent both ways.** Each device sends the other a backup (no media) and merges
  what comes back with the restore's newest-edit-wins merge, so there's one way data moves between
  devices, already tested. Media stays on its device (too large for a quick sync); a backup file
  still carries it.
- **No accounts, no server holding data.** PeerJS's free public broker introduces the devices;
  the data goes over WebRTC, encrypted, directly or through PeerJS's relay when a network blocks
  direct links (still encrypted, never stored). Each pairing has a 16-character secret (80 bits)
  that names both meeting places (hashed) and must be proven (HMAC of a fresh challenge) before
  anything is sent, so finding the meeting place isn't enough to get the data.
- **Pairings stay on their device.** The secret and the list of paired devices are device-only
  settings, like API keys, and never travel in a backup. API keys go along only if "Send API
  keys too" is on.
- **A code to type as well as a QR code.** iPhone home-screen apps don't share storage with
  Safari, so a QR code that opens a link couldn't pair the installed app; the app reads the QR
  code with its own camera view (jsQR), and the code can always be typed.

## 2026-10-19 — Radio before Grammatica

- **The user swapped 3.0-5 and 3.0-6.** Radio is small and builds on Sonus as it is now (its player,
  mini player and tabs, fresh from 3.0-3), so it comes first as 3.0-5. Grammatica and alphabets,
  the largest step left, is 3.0-6 and next in line after it. Older entries that say "3.0-5" for
  grammar or "3.0-6" for radio meant the old order.

## 2026-10-19 — Comics before Grammatica

- **The user swapped 3.0-6 and 3.0-8.** Comics, audiobooks and courses, and AI conversation are
  3.0-6 and next; Grammatica and alphabets are 3.0-8, after Mundus. With the swap the user added
  notes on Radio (a real map, a full-screen player with transcription or commute mode, stations
  in Library) and Music (explore shelves instead of the "Songs you love" card); they are part of
  3.0-6. Older entries that say "3.0-6" for grammar or "3.0-8" for comics meant the old order.

## 2026-10-20 — Lingua 3.0-6, part 3: audiobooks and courses

- **A book is its parts.** Each part is an ordinary Sonus item with a shared `bookId` and its
  number in `episode`, so downloads, transcripts, Whisper, sync and backups needed no change.
  The book's title and author are its parts' `collection` and `artist`; renaming writes every
  part. A Dexie index on `bookId` (schema v10) finds a book's parts.
- **LibriVox through archive.org.** LibriVox's own API doesn't let web pages read it; archive.org
  holds its recordings and its search, file lists and downloads all allow apps. A book's parts
  stream like podcast episodes (the 64 kbps copies, plenty for speech) and can be saved for
  offline or transcribed. Their titles lose the leading track number, which the list shows.
- **Order from the files.** Track numbers order a book when every part has its own; otherwise
  natural name order, folder by folder ("CD 2" before "CD 10"). An .m4b, or any file with
  chapters inside, is a one-part audiobook whose chapters stand in for parts.
- **Courses stop, audiobooks play on.** At a part's end an audiobook opens the next part on the
  same audio element (so a locked phone can carry on); a course marks the lesson done and
  stops, since a lesson is meant to be repeated or practised before the next.
- **The sleep timer lives in the engine,** checked every frame and on `timeupdate`, with a timer
  as backup so it fires with the screen locked. Minutes fade out over eight seconds (an iPhone
  can't change an audio element's volume, so there it just stops); end of chapter follows seeks;
  end of part stops instead of playing on.
- **Read along keeps Whisper's transcript.** The book's sentences are saved as the part's
  transcript with Whisper's kept in `original`, so matching can run again from it and Stop
  puts it back. A part transcribed later is matched at once.

## 2026-10-20 — Audiobooks get their own Sonus tab

- **Next to Podcasts, not a page off Library.** The user asked for audiobooks as a section of
  their own beside Podcasts. The tab mirrors Podcasts: what you have first (a cover grid, like
  followed podcasts), then discovery (LibriVox), then the free courses. The old page
  /sonus/audiobooks redirects to it; a book's page goes back to it.
- **Five tabs still fit a phone** (375 px) without scrolling sideways: the tab is "Audiobooks"
  from the `sm` width and "Books" below it (`Segmented` options can now carry a `short` label).
- **Progress on the cover:** a thin bar at the cover's foot shows how much of the book is heard
  (finished parts plus the place in the current one, when every part's length is known), or
  the share of a course's lessons done. A book never played says how many parts it has.
- **LibriVox's catalogue link** moved from the course cards to under the LibriVox search, since
  it is books, not a course.

## 2026-10-20 — Lingua 3.0-6, part 4: Colloquium, talking with AI

- **A room of its own, but not another header icon.** The phone's header already holds
  Grammatica, Mundus, Ratio and Ordo, so Colloquium is a new `placement: 'side'`: in the desktop
  sidebar under the divider, and reached on a phone from Home (a card every day, a step every
  third day without a chat), with a back arrow to Home. It sits after Grammatica, so the sidebar
  reads learning rooms first. Since 3.0-7 put Mundus before Grammatica: Mundus Alt 6, Grammatica 7, Colloquium 8, Ratio 9, Ordo 0
  (`sectionKey`: Alt 0 is the tenth).
- **The prompt is in the language** (hand-written for the core twenty, English naming the
  language for beta languages): an AI answers in the language it's addressed in, and the learner
  can read what they're asking for. Grammatica's topic title stays in English inside it; the AI
  understands it either way.
- **Open, then copy.** `window.open` runs first, inside the tap, so a browser doesn't block it as
  a pop-up; the clipboard write follows. Nothing is sent from Lingua on that path.
- **The in-app chat answers in JSON** (reply, English, corrections, up to three words), uncached,
  at temperature 0.7. A correction is kept only when its "original" is found in the learner's
  last line and the suggestion differs: models otherwise "correct" words the learner never wrote.
- **Chats are a table, synced like journal entries** (last write wins, deleted with a mark).
  Dexie v14: v12 and v13 went to Mundus and Grammatica first, and a device already at 13 would
  never run a v11 upgrade, so 11 stays unused.
- **The chat is full screen on a phone** (like the players), the box docked at the bottom above
  the home indicator; on desktop it stays in the page, the box sticky under the last line.

## 2026-10-20 — Lingua 3.0-9: the full check, and 3.0 is done

- **3.0-8 skipped, as the user asked.** Grammatica's topics and its first lessons are live; the
  drills beyond them and alphabets and writing are left out of 3.0, and the check leaves them out.
- **The twenty languages were checked against their real services**, not just the screens: a
  script in the dev app asked each language's music, radio, podcast, LibriVox, Mundus and voice
  sources, and the packs were measured offline. It is how two silent failures showed up that no
  screen made obvious.
- **Apple's Korean and Croatian stores answer nothing** to the public search (checked with
  "love", "IU" and "k-pop"). Korean now searches the US store, which has the K-pop catalogue, and
  Serbo-Croatian the Serbian store; Cantus's own search already added the US store, so only the
  rails and artist pages were empty.
- **A first suggestion must find something.** German podcast discovery opened on "langsam
  gesprochene nachrichten" (one podcast); "deutsch lernen" (25) leads now and the slow news stays
  a chip.
- **No voice beats a robotic one**, unchanged: the app's own test browser has only old Microsoft
  voices, so Listen buttons hide there. That is the rule from 3.0-4 working, not a bug.
- **Version 3.0.0.** Ordo › About reads it from `package.json`.

## 2026-10-19 — Lingua 3.0-6, part 2: comics

- **A comic is a text whose chapters are pages:** the page's picture, then its speech bubbles as
  paragraphs, each with its place on the page (`box`). Everything that works on text (word
  states, glosses, cards, word counts, Ratio, backups and sync) works on comics unchanged; only
  the reader has a view of its own.
- **Bubbles are read when a page opens,** and the next page ahead, not all at import: a long comic
  is added in seconds, and reading the whole of it at once would keep a phone busy for minutes.
  "Read the bubbles again" is there when a page comes out wrong.
- **Tesseract in sparse-text mode, lines grouped by Lingua.** Its usual page mode joined bubbles
  into one paragraph; finding each line alone and joining lines that sit under each other in the
  same column gives one paragraph per bubble. Lettering in capitals is made into sentences so
  words look up as usual; a word the dictionary on the device doesn't know keeps its capital
  (likely a name). German keeps its capitals.
- **The engine is Lingua's own file, the language data is not.** tesseract.js's worker and its
  WebAssembly engine (about 4 MB, SIMD where the browser has it) are built into the app and cached
  the first time a comic opens, never in the offline download. The reading data per language
  (1–15 MB) comes from tesseract.js's data packages on jsDelivr and is kept on the device.
- **No two-page spreads:** on desktop the page's words sit where the second page would; a comic in
  Lingua is read to learn its words, so they stay in view.

## 2026-10-20 — Sonus and Sonus+

- **Sonus+ is the Cantus room, grown.** Same route (`/cantus/*`), same dark design; podcasts join
  music. Sonus's own pages (an episode, a podcast, a book) open over the room
  through nested routes, unchanged: `sonusBase()` / `sonusHome()` read the address so their links
  stay in the room when opened from it, and in Sonus otherwise. Radio and Audiobooks stay Sonus tabs, as
  the user asked.

## 2026-10-20 — Whole songs (design handoff, workstream C)

- **YouTube first, keyless by default.** No free keyless official YouTube search exists, so the
  learner's own Data API key (Ordo › Music, device-only, sent in `X-Goog-Api-Key`) is used when
  set; otherwise the public Piped servers (YouTube Music's "songs" first: the artists' own audio)
  and then Invidious instances from its directory, each tried in turn. Only YouTube's own embedded
  player plays the result; oEmbed checks the owner allows embedding first.
- **New song fields without a migration:** `soundcloudUrl`, `vimeoId`, `dailymotionId`,
  `bandcampUrl`, `fullSource`, `rejected` are not indexed, so Dexie needs no new version, and
  backups carry whole rows, so they travel too.
- **One clock at a time** was already the design; switching source now pauses the old one and
  seeks the new one to the same place. YouTube and SoundCloud re-read their place when the tab
  becomes visible again.

## 2026-10-20 — Removing a language

- **Each kind of data leaves the way it already does** (`data/removeLanguage.ts`): texts, decks,
  folders, audio, audiobooks, songs, journal and journey through their own delete functions, so
  their files, chapters, cards and transcripts go too and synced kinds leave tombstones. Words,
  sessions, daily counts, feeds, stations and challenges are deleted outright; the offline
  dictionary through `removePack`. The language's profile keeps a tombstone (`deletedAt`) so
  other devices hear of it; onboarding puts a fresh profile over it if it's added again.

## 2026-10-20 — Cantus search (design handoff, workstream B)

- **Several sources, one list.** Apple's search index leaves out some artists' own recordings
  (none of Bad Bunny's "BAILE INoLVIDABLE" or "Diles" in any store), but Apple's artist lookup
  has them. So search asks Apple (three stores), LRCLIB (which knows who sings what) and Spotify
  when connected, then opens at most two artists' catalogues: the artist the query names, or the
  one most known for the title it names. Every source is optional; only Apple failing entirely
  is an error. All free and keyless.
- **Typos are put right from the results, not a dictionary:** a typed word the results never use,
  a typo or two from one they use three times or more ("inolvidabel" → "inolvidable"). The
  learner sees the correction and can search as typed.
- **The original first:** titles are compared without "(feat. …)" or labels; covers, karaoke,
  tributes and instrumentals sink, remixes and live versions sink a little unless typed; the
  artist LRCLIB knows the title by most rises.

## 2026-10-20 — Cantus, a room of its own (design handoff, workstream A)

- **One route for the whole room.** `/cantus/*` is one lazy page that reads the address itself
  (tab, song, games), so the player can stay mounted while the pages change under it. A song
  playing on while the learner browses needs that: React Router would otherwise unmount the song
  page, and its YouTube or Spotify player with it.
- **Folded, not moved.** The folded player is hidden with `visibility`, never moved in the page
  or remounted, so the embedded players never reload. Their own wrapper stays visible (small,
  above the now-playing bar) while they play, as YouTube's and Spotify's terms want a visible
  player; paused, it hides.
- **Dark by the room, not by the setting.** While the room is open `<html data-room="cantus">`
  and `data-theme="nocturne"` give the whole document its colours (so dialogs and menus portalled
  out of it match); leaving puts back what the learner's theme setting says.
- **Leaving keeps the place** in localStorage (the song and the millisecond; a preview starts
  again), not in the database: it is a convenience of this device.

## 2026-10-19 — Lingua 3.0-6, part 1: Radio and Music

- **A drawn map, not a map service.** The countries come from Natural Earth (public domain), made
  small by `scripts/radio/world-map.ts` (about 60 KB gzipped, only in the Radio chunk) and drawn on
  one canvas in the app's own colours. No tiles, no keys, works offline, and it follows the theme.
  Nodes that would overlap join into one; names are placed biggest country first and never cover
  each other or a node.
- **Live text reads the stream a second time.** The audio element can't hand its sound to a page
  across origins, so the stream is fetched again (where the station's server allows it, most do),
  cut into parts of twelve seconds at a frame, and sent to Whisper. It's off until turned on, since
  it doubles the data and uses the key; without a key it says so at once instead of after a part.
- **Explore asks Apple a few times a day.** Today's songs (three artists of the language, or three
  styles where none are picked by hand) and a style of the day are chosen by the date, kept in
  localStorage for the day, and shuffled again only on request.
- **"Most played by you" counts openings,** one per song page opened; a reopen within a minute (a
  reload, React's double run in development) counts once.

## 2026-10-20 — Lingua 4.0-1, the rest: glass, icon, Lingua+

- **The two-tap bug was a flag that never cleared.** The tab bar swallows the click that follows a
  drag (it would otherwise open the tab under the finger). Browsers send no click after a longer
  drag, so the flag stayed and ate the next tap. It is reset when a press starts, and by a timer.
- **Lingua+ lives in the device's `meta`, not in a purchase.** It is a placeholder: one timestamp,
  device-only like the other `meta` fields, so it isn't backed up or synced. When real purchases
  come it will need to follow the Apple ID instead; nothing reads it yet, so nothing can be locked
  by mistake.
- **One icon mark, drawn without an outline.** Solid shapes read at 180 px and stay legible when
  iOS tints them; the old line drawing didn't. The Home Screen icon can't follow the phone's
  appearance after Lingua is added, only at that moment.
- **60 fps by reading, not by measuring.** The audit found three animated sizes; frame times need
  a device, so they stay on QA-ios.

## 2026-10-20 — Lingua 4.0-1: tiers and the language map

- **35 placeholders, not 25.** Tier 3's five new languages, tier 4's twenty and the ten
  experimental ones make 35; the plan's "25" was a miscount. All are shown and marked `soon`;
  none can be chosen until its tier's data exists, so no one lands in a language that has no
  words. `AVAILABLE_LANGUAGES` is the list for everything that needs a real language (the
  "I already speak" menus, tests).
- **A language's dots are its flags' countries.** No second table: the countries in `flags`
  (already there for the flag picker) are where the map puts a dot. Esperanto has none; Latin's
  laurel isn't a country; both appear in the list only.
- **The picker has its own map, on Radio's drawing.** It shares the countries and the camera
  arithmetic (`radio/sky.ts`, `worldMap.ts`), not Radio's component, which is built around
  stations. The wheel zooms only with ctrl, so scrolling the page never gets caught by the map.

## 2026-10-19 — A full dictionary from open data (planned for 4.0)

- **"As good as Oxford's," not Oxford's.** Oxford's dictionaries are licensed content, and their API
  is paid and needs a server to keep its key, which a local-first app on GitHub Pages doesn't have.
  The six core languages get a full dictionary built instead (planned in 4.0-2). It uses
  Wiktionary's extracts (kaikki.org), each language's own Wiktionary, Tatoeba and Lingua's packs,
  credited as their licences ask. The most common entries are tidied once, when the dictionary is
  built.
- **The word drawer stays short and the dictionary page holds the rest,** so the drawer fits one
  desktop screen without scrolling (the user's note) while the full entry is one click away.

## 2026-10-19 — Languages in tiers (planned for 4.0)

- **Four tiers and an experimental shelf,** as the user listed them (planned in 4.0-1): six core
  languages with courses, fourteen with everything but a course, twenty partial (today's fifteen
  beta languages and five new), twenty with the basics, and ten experimental. The names in the app
  are Core, Full, Beta, Basics and Experimental: "Beta" stays because tier 3 is exactly today's beta.
- **The user's extra "Tier 2 … (20 in total)" line is read as tier 3.** It names the same five new
  languages as the tier 3 list, and fifteen plus five is twenty.
- **Cheap means scripted.** Tier 3 is built by the scripts that already make the beta packs; tier 4
  needs no data of its own, only the shared services (Wiktionary, machine translation, radio and
  podcast search). No hand-written content below tier 2.
- **The picker reuses Radio's map.** 3.0-6 draws countries from Natural Earth with its own camera and
  gestures; the language picker puts a dot where each language is spoken on the same map, so the
  long list gets a shape without a second map library.
- **Maya means Yucatec Maya** for now (written in Latin letters, with radio and texts online); K'iche'
  has more speakers and can replace it if the user prefers.

## 2026-10-19 — Lingua 4.0 planned

- **After 3.0, in five steps,** as the user asked: smoothness, the app's look and Lingua+ (4.0-1);
  Codex with one memory for every word and cloze sentences (4.0-2); songs and shows, Cantus games,
  karaoke and Visio (4.0-3); Cursus with speaking and writing (4.0-4); the full check (4.0-5).
- **Streaming services can't play inside Lingua.** Netflix, Prime Video, Max and Disney+ protect
  their video and allow no other app to play it; tools that add subtitles to them are browser
  extensions. 4.0-3 brings YouTube in fully and follows the others' subtitles beside their own
  apps instead, and looks at an extension for desktop.
  *Changed on 2026-10-20:* the user removed 4.0-3 (karaoke and song games). Its Visio part moved to
  Lingua 5.2-4, which builds the browser extension (the user's decision: yes).
- **The course is called Cursus,** Latin for "a course" (Iter is already the journey in Ratio). Its
  units are named by what the learner can do after them, as the user asked. Feedback from other
  speakers needs a community and a server; AI feedback with a key comes first.
- **Lingua+ is a placeholder.** The purchase charges nothing and locks nothing until the user
  decides how it will be sold; a reset button in Ordo removes it for testing.
- **A Home Screen icon that follows light and dark** is limited by iOS, which picks a web app's
  icon when it is added (it can tint or darken any icon itself since iOS 18). 4.0-1 draws the
  icon for both and finds out how far it can follow the switch.

## 2026-10-19 — Lingua 3.0-5: Radio

- **A fourth tab, not a shelf in Library.** Radio needs room for its map, countries and search;
  Library only shows your favourite stations. With four tabs the Podcasts tab no longer shows how
  many shows you follow, so the four fit a phone's width.
- **radio-browser.info, matched by the language's own names there.** Its `language` field is a
  list of English names; searching them exactly avoids "malay" finding Malayalam. Languages with
  other names there are listed (`norsk`, `brazilian portuguese`, Croatian, Serbian, Bosnian and
  Montenegrin for Serbo-Croatian); any other language uses its English name, so tier 2 gets radio
  automatically. The servers tried are de1, de2 and the round-robin name.
- **Only what plays here.** https streams only (an http stream can't play in an https app), HLS
  only where the browser plays it, never video codecs; the same stream or the same name in the
  same country once.
- **The world is drawn by radio itself.** The faint dots behind the stations are where the
  directory's stations of every language are (13,543 with a place, half-degree cells, 8 KB),
  made once by a script rather than a map of coastlines: the map is only lights, like a night sky.
- **A station is a live item in the one player.** It goes through the same engine (mini player,
  lock screen, listening time) but saves no position, keeps speed at 1, and after a pause of more
  than a few seconds starts from what's on now instead of the old buffer.
- **Kept stations are synced; the directory is not.** Favourites and played-lately are a small
  `stations` table (backed up, newest edit wins); the directory's lists are fetched again after
  half a day and kept only in the browser's storage.
- **Now playing, when the station lets a web page ask.** Browsers can't read the song titles inside
  a stream, so Lingua asks AzuraCast's public file or Icecast's status page; most big
  broadcasters allow neither, so there it shows the station's place instead. A server that
  doesn't answer once isn't asked again that session.
- **A click is reported** to radio-browser when a station is played (`/json/url/{id}`), as its
  API asks, since it orders stations by listens.

## 2026-10-20 — Desktop first (the user)

- **Lingua is designed for the desktop app first.** That covers layout, design and functions.
  Wide windows are used fully, with columns, side panels and sticky rails. Tabs and toolbars
  look like a desktop app's, with hover states and keyboard shortcuts. The phone must keep
  working, but each feature is shaped and checked on desktop first. CLAUDE.md says so for every
  session.

## 2026-10-20 — Mundus becomes a guide (the user's notes)

- **A guide that steers, not a catalogue.** The user wanted a friend that steers you toward the
  right next thing at your level. So Mundus leads with advice built from your own signals: the
  last seven days of activity sessions by lane, your level, the interests you gave at onboarding,
  which rooms you have used, and Grammatica's next topic. Every suggestion says why. The
  catalogue moved below, as "Explore everything".
- **A simple, testable rule.** It steers to the quietest lane, with a small pull toward what you
  enjoy, and never toward the lane you used most. Writing is suggested only to those who like
  writing. It is a pure function (`core/mundus/guide.ts`), so it is tested without a database.
- **Different from Home.** Home is today's study plan: reviews due, continue reading, the daily
  goal. Mundus is about direction: balance, new rooms, the next stage, and things to try.
- **The name stays Mundus.** Iter (already a tab in Ratio) and Mundus were tried, and the user
  chose to keep Mundus.
- **Pictures from open sources, no keys:** Open Library covers, TVmaze posters, Apple's podcast
  artwork, and Wikipedia's free images. Only titles are sent, and answers are cached on the
  device. Wikipedia serves no copyrighted posters, so film posters still need TMDB.
- **No new data.** Tips done still go in the `challenges` table, and everything else is read from
  tables that already exist. The code for picks and tips keeps its `mundus` folders, since
  Mundus shows them.

## 2026-10-20 — Mundus as a place to explore (the user's notes)

- **Shelves by room, not by kind.** The user wanted Mundus to recommend something for every part of
  the app, with everything opening inside it. So Explore groups picks by the room they open in
  (Watch, Read, Listen, Radio and music, Words, Play). The lists by kind stay as "All picks".
- **Live shelves reuse Sonus's sources.** Audiobooks come from LibriVox and stations from
  radio-browser, through Sonus's own clients and caches. Nothing is new to set up, and a shelf
  that can't load just hides.
- **Ways in from every room.** The phone's tab bar keeps its five rooms. Mundus is reached from the
  top bar, Home's card, and an "Ideas from Mundus" line at the foot of Codex, Thesaurus, Sonus and
  Visio. These are small additions to those pages, linking by route.

## 2026-10-20 — Lingua 3.0-7: Mundus and Visio › Services

- **Picks open by search, not by stored links.** A title opens Netflix's, Goodreads', Amazon's,
  Steam's, Spotify's or YouTube's search for it; only dictionaries and a few sites keep an address
  (checked by `scripts/mundus/links-check.ts`). Searches can't go stale; deep links do.
- **A service is named on a pick only when it's the title's home** (its own original, or a public
  broadcaster's own show). Licences change by country and month, so anything else comes from TMDB
  for the learner's country, when they add a key.
- **TMDB with the Read Access Token only.** TMDB's short v3 key works only in a web address, which
  breaks the rule that keys never travel in one; the long token goes in the Authorization header.
  It is kept with the other keys (device-only). Answers are cached in localStorage (lists a day,
  titles a week): a cache, never data the learner owns.
- **Music in Mundus is Sonus's "artists to learn with"**, imported from `features/cantus/discover.ts`
  and linked by route (`/sonus?tab=music&q=…`), so the two never disagree.
- **Challenges are one row per challenge and day** (`challenges`, Dexie v12, synced and backed up,
  newest edit wins; undoing soft-deletes). Habits count every day they're done, one-offs once.
- **Dexie v12 before v10 and v11.** 3.0-6's v10 (books) and v11 (chats) may reach `main` after
  this. Dexie 4.4 patches tables and indexes that a lower, later version declares ("schema patch
  mode"), so devices already on v12 still get them; only an `upgrade()` callback in v10 or v11
  would be skipped on such a device, so those versions should add tables and indexes only.
- **Mundus is a header section** (desktop sidebar under the divider, phone top bar), so the shells
  needed no changes; Visio got a Library · Services segmented control like Sonus's.

## 2026-10-20 — Lingua 3.0-8, part 1: Grammatica's topics and browser

- **Topics are typed modules, not `.json.gz`** (`src/core/grammar/topics/<lang>.ts`, loaded with
  `import.meta.glob` like Mundus's picks). TypeScript checks their shape, a test checks their
  content, and Vite splits them per language, so nothing loads until Grammatica opens.
- **Every sentence is a real pack sentence.** `grammar.test.ts` reads each pack's examples and
  fails if an example or drill item (brackets removed) isn't one of them, letter for letter. So
  no sentence is invented, and a typo or a stray diacritic shows up at once.
  `scripts/grammar/mine.ts` finds candidates by tags, words or a pattern.
- **Every rule names its source.** Each module lists the pages it was checked against (Wikipedia's
  grammar articles, Wiktionary entries, SpanishDict for por and para). A topic without clean
  sentences or a rule we could check is left out and named in the module's `notes`, rather than
  guessed.
- **Wrong forms are chosen to be wrong with the English.** A drill always shows the translation,
  so a distractor may be grammatical on its own (*Ich soll* vs *Ich will*) as long as the English
  rules it out. Forms that would be right in a different but equally valid reading are avoided.
- **Mandarin keeps to Simplified characters**, though many short pack sentences exist only in
  Traditional (and some are Cantonese or Wu); those are skipped, so the topic list is a little
  shorter. Pinyin is not shown yet.
- **Arabic is fully vowelled and set right to left.** `SentenceLine` uses `dir="rtl"` and a larger
  size for Arabic, table cells and inline forms use `dir="auto"`. Pack sentences with vowelling
  slips were skipped.
- **Tags link topics to word forms using the pack's own tag names** (`preterite indicative`,
  `past subjunctive`, `imperfect indicative` …); `topicForTags` picks the most specific match, for
  "Why this form?" in part 4.
- **The phone's compact title is a flex item** between the back button and the header icons, so
  with Grammatica's fourth icon it truncates instead of running under them.
## 2026-10-20 — Lingua 3.0-8, part 2a: grammar drills and the lesson kit

- **Every drill is made from the same compact items** (a pack sentence with the form in
  brackets and three wrong forms) and from the topic's own tables. So the five steps need no
  extra content, and nothing in a drill can be wrong that the topic file doesn't already say.
  The table drills (complete the table, match the pairs) only use short cells without
  alternatives ("el / la") or notes.
- **Forgiving typing, without letting a wrong form through.** A typed form missing only its
  accents counts as right, with a note, unless a wrong form is spelled the same without
  accents (hablo, habló). Arabic is compared without its vowel marks on the same terms, so a
  learner can type without harakat. A test runs every wrong form of every item through the
  checker to make sure none is accepted.
- **Russian stress marks come off the forms.** The pack's sentences are stressed but the wrong
  forms aren't, so a stressed option would give the answer away.
- **Spot the mistake only for one-word forms.** When the form is a phrase (Mandarin word order,
  "he comido"), the swapped chunk stands out, so those items get word order instead. For word
  order the form is split into its words too, since the order of all of them is the point.
- **Grading and scheduling as in Ludus.** No mistake is Good, right on the retry Hard, missed
  twice Again. An item is scheduled when it is new or due, otherwise only logged. Lightning is
  practice and never moves a schedule. Logs go to `grammar:<lang>`, so vocabulary statistics
  leave them out. Ratio counts the time as review until part 4 gives grammar its own place.
- **Lightning is a button, not a mode.** The setup sheet has Classic and Zen (how a lesson
  feels), plus length, exercise kinds, typing, sounds and vibration. Lightning sits beside
  Start, so choosing it never stops a step from being passed.
- **Sounds are synthesised** with the Web Audio API (a few sine notes), so there are no audio
  files to bundle or cache. Vibration uses `navigator.vibrate` where it exists; iOS has
  none, and the setting simply does nothing there.

## 2026-10-20 — Lingua 3.0-8, part 2b: Ludus expanded

- **Listening is back, but only with a good voice.** Lingua 2.0 removed the listening exercises
  because device voices sounded poor. Listen and dictation now appear only when `speakerFor`
  finds a natural voice (Gemini, or a device voice it rates as good), and never with a robotic one.
- **Spelling only where letters are letters.** Not for Mandarin, Japanese, Korean or Arabic: their
  characters, syllable blocks or joined letters make poor loose tiles. Only single words of three
  to twelve letters are spelled.
- **Lightning logs every answer as practice.** It goes round the same cards many times in a
  minute, so each answer is logged on its own with `affectedSchedule: 0`, rather than settled into
  one grade per card.
- **Turned-off kinds fall back, never empty a lesson.** If every kind is off, a lesson still uses
  the gentlest one (meanings), and the sheet always keeps at least one kind on.

## 2026-10-20 — Lingua 3.0-8, part 3: examples first, the rule at hand, your own sentence

- **The lesson opens with the examples, not the rule.** This follows the user's note on teaching
  grammar: examples, a short rule, then use it at once. Later steps open with a single sentence
  and the one-line reason, so returning learners aren't slowed down.
- **The rule is a side panel, not a link away.** Leaving the lesson for the topic page would lose
  its place, so "See the rule" opens the Drawer (a slide-over on a desktop, a bottom sheet on a
  phone) over it.
- **Your own sentence is practice.** The AI's verdict can be wrong, so it never grades an FSRS
  item or counts towards passing a step; it only feeds the combo. It is cached like the other AI
  answers, and the prompt tells the model not to invent rules.
- **Due items from other topics don't decide the step.** They are scored for their own cards, but
  the 80 % is reckoned on the topic's own exercises.
- **No transform drills.** Real sentences don't come in present and past pairs, and a generated
  pair could be wrong, which the content rules forbid.


## 2026-10-20 — Lingua 3.0-8, part 4: grammar where it's needed, and in the numbers

- **"Why this form?" reads the pack's own description.** The dictionary already describes each
  inflected form ("first-person plural preterite indicative of comer"); `topicForTags` matches its
  words to a topic's tags. Nothing new is stored, and a form with no clear topic shows no link
  rather than a guess. Arabic and Mandarin packs don't describe forms, so they show none.
- **Placement asks about a dozen topics, not until three misses.** A miss streak would stop the
  check at the learner's first weak spot and leave later topics they know unmarked. Twelve topics
  with two gaps each is about two minutes. Only both right counts, so a lucky guess on one gap
  isn't enough. A placed topic's items stay unscheduled: they first meet the learner in practice
  or as a due item, never as a pile of reviews on day one.
- **The grammar level is strict.** Tabula's level is the highest CEFR level at which every topic,
  and every topic below it, is learned. One unlearned A1 topic keeps it at none, which matches
  how Tabula's other levels are meant: what you can rely on, not what you've touched.
- **`learnedAt` without a Dexie version.** It's a plain field on the progress row with no index,
  and Ratio reads all rows for one language anyway, so the schema doesn't change.

## 2026-10-20 — Lingua 4.0-2: a full dictionary, one memory for every word, sentences with a gap

- **The dictionary is Wiktionary, built into a file per language, not an online service.** Oxford
  is licensed and its API needs a paid key on a server; Lingua has no server. Wiktionary (via
  kaikki.org's extracts, CC BY-SA) has senses with labels, examples with translations, pairs,
  phrases, synonyms and etymologies for all six core languages, and it is already where the packs
  come from, so lemma keys match. Every headword with a meaning of its own goes in (not only the
  frequent ones): a dictionary is where you look up the rare word. Forms stay the pack's job.
- **Downloaded on request, stored in IndexedDB.** At 3–17 MB a language (v2) the files are too big to
  come with the pack, which every reader needs at once. A worker stores them in `fullDict` keyed
  by the pack's lemma key, with an accent-free key for the search box (prefix search on
  `[lang+fold]`). A `#version` row says which build is there, so a better build can be offered.
  It is a cache of the site, so backups and sync skip it.
- **Mandarin is keyed by Simplified,** as the pack is: Wiktionary files words under Traditional and
  names the Simplified spelling; single characters go by Unihan's variants.
- **"Easily confused" is computed, not looked up:** one letter apart among the 20,000 most common
  words (found through one-deletion neighbours), and for Mandarin the same syllables in other
  tones. Wiktionary rarely lists paronyms.
- **The word memory is engagement, not exposure.** A row is kept when a word is looked up or
  marked, not for every word on every page: a book would add thousands of rows a sitting, synced
  to every device, and most would be words the reader didn't notice. One row per word, form and
  place (`${lang}:${norm}:${kind}:${sourceId}`, so devices agree) keeps the latest sentence and a
  count; the lemma gathers the forms. Where a word was met is worked out from the context the
  rooms already pass (textId, mediaId, songId), with `where` for conversations.
- **The memory is a view over decks, not new decks.** Decks are the user's own (and Anki's); moving
  cards about behind their back would be worse than a clear view sorted by source, strength and
  theme.
- **Sentences with a gap use what's on the device:** the pack's examples (which have translations
  and the word's span) and the sentences from the word memory. Tatoeba would need its whole link
  list to pair sentences with translations. Choices are other answers of the same round: real
  forms of real words, so the right one can't be told by its ending alone.
- **A card type without a new card direction.** "A sentence with a gap" is how a deck shows its
  word → meaning cards, so the scheduler and existing cards stay as they are.
- **The reading goal is Codex's own** (`dailyGoal.codexMinutes`): Home's goal counts every kind of
  study. Its note waits for a page turn or a new paragraph, as the user asked: never mid-sentence.
- **The drawer is wider on desktop instead of shorter on content:** 780 px and two columns keep
  every section; senses fold after three, the AI explanation's notes and examples fold.
  *Reversed the same day (second pass):* the user wanted the drawer exactly as it was, so it is
  the 440 px drawer from before 4.0-2 again; the full entry is one click away (Open dictionary).

### Second pass (the user's feedback, same day)

- **The dictionary lives in Thesaurus, beside the word memory,** not in Codex: both are about
  words, so one tab holds the search, your words and the entry. Codex's header keeps only Add.
- **The reading goal is set in Ordo and only felt in the reader.** A ring on Codex's page was one
  more thing to look at; the note between pages is the point.
- **Sentences with a gap is a Ludus mode** (`mode=ludus&kind=sentences` on the study page), so
  Ludus is the one place for play and a deck can start it with its own words first.
- **Definitions in the language itself for the 30,000 most common words only.** For all 84,000
  Spanish words they nearly doubled the file (5.5 → 10.2 MB); the rare words keep their English
  definitions. The other editions are streamed and filtered on the fly, so the 100–740 MB files
  never land on disk.
- **Tatoeba at build time, not on the device:** pairing sentences with translations needs the
  link list and all English sentences (about 110 MB), which a build can read once. Up to three
  sentences per word, closest to 45 characters, so neither a bare phrase nor a paragraph.
- **AI tidying is on request, per word, with the user's key.** Tidying the common entries in
  advance would need a key at build time, which Lingua never uses. One request per word, cached.


## 2026-10-20 — Lingua 3.0-8, part 5: alphabets and writing

- **Words picked by hand, then checked against the pack.** Mining words from the packs gave
  junk: wrong glosses, rare homographs, even slurs. A short hand-picked list per letter, kept only
  when the pack has the word with that meaning, gives clean words. A word the pack lacks is
  dropped rather than invented. Japanese words are matched by their kana reading.
- **Letters share Grammatica's tables.** A letter is a `grammarItems` row with topic `script`, and
  a group a `grammarProgress` row `script:<group>`. They are logged in the same hidden deck
  `grammar:<lang>`, so vocabulary statistics leave them out, and resetting a language clears them.
  Grammar's own lists skip these rows (`isScriptTopic`). There's no new Dexie version and no
  backup change.
- **The shape is checked, not the strokes.** Stroke order needs stroke data for every letter in six
  scripts, and only Japanese and Chinese have open data for it. Comparing ink with the font's own
  letter works for every script today: a trace is compared in place, and writing from memory
  is scaled to the letter's box first, so a smaller letter in a corner still counts. A scribble
  covers the letter but puts most of its ink off it, so it fails on precision. The thresholds
  (trace 70 % covered and 75 % on the letter; memory 60 % and 65 %) were set on test shapes and
  synthetic strokes, not on real handwriting yet.
- **Romanization by named schemes:** Russian BGN/PCGN, Greek ELOT 743, Arabic in the scholarly
  transliteration read from the vowel marks, Japanese modified Hepburn, Korean Revised
  Romanization. Where a scheme can't be applied letter by letter (Korean sound changes, unvowelled
  Arabic), the word isn't used.

## 2026-10-21 — Lingua 3.0-8, part 6: short grammars for tier 2

- **Seven to nine A1–A2 topics per tier 2 language, not thirty.** Tier 2 is kept cheap, and the
  first topics are where a beginner trips. Each module is written like the core six (real pack
  sentences, a named source, the same tests), so it can grow later without changing shape.
- **A topic is left out rather than taught from thin data.** Portuguese object pronouns are the
  clearest case: Brazil and Portugal put them in different places, and the pack's sentences mix
  both, so drills would mark one country's usage wrong.
- **English and Swahili get no grammar for now.** English pack sentences carry no translation to
  show, and Swahili has eighteen usable sentences.
- **Gaps with only two right answers get distractors that are wrong everywhere.** De and het,
  a and az, en and ett have one alternative each, so the other two choices are words that never
  fit there (die and deze before a het-word, azt and annak as "the"). A choice that is right in a
  dialect or a looser standard is never offered as wrong: Norwegian ei and en for feminine nouns
  are both kept out of the drills.
- **Tier 3 alphabets only where a letter chart teaches the script honestly.** Part 5's lessons
  assume a letter has one shape and one sound and that words romanize letter by letter. Georgian
  fits that exactly. Devanagari, Tamil and Thai don't (vowel signs, conjuncts, schwa deletion,
  tone classes), and Persian is written without its vowels, so a chart would teach them wrong.
  They are named in the roadmap rather than built half-right.

## 2026-10-21 — Cursus moves into Lingua 5; no separate 4.0 check

- **4.0-4 (Cursus, the course) is now part of Lingua 5, and 4.0-5 (the 4.0 check) is removed,** at
  the user's request. Lingua 4.0 is therefore 4.0-1 and 4.0-2, both done (4.0-3 went on
  2026-10-20). Nothing about the course changed: same plan, now in ROADMAP's Lingua 5 section
  ("Cursus"), step 4 of the handover, parallel with 5.1-1, ahead of Lingua 5's final check.
- **The version goes from 3.0 to 5.0** at that check (step 21); there is no 4.0 release.

## 2026-10-21 — Lingua 5's frame: Cursus, Sonus et Visio, Mentis, Settings (5.1-1 with 5.2-1)

- **Rooms are frames around the pages that were there.** Cursus and Mentis render Grammatica,
  the alphabet, Mundus, Colloquium (Sermo) and Diarium inside their tabs instead of rewriting them,
  so the sessions working in those folders aren't disturbed. A small context (`InRoom`) tells an
  embedded page's `PageHeader` to keep only its actions; the room draws the title and tabs.
- **One table of moved addresses** (`app/redirects.ts`, with a table test) rather than a redirect
  per page: the router sends every old prefix to one `Moved` component. Internal links were
  rewritten to the new addresses too, so nothing inside the app goes through a redirect.
- **Mundus's own tabs became a segmented control** under Mentis's tab strip: the digits 1–3 belong
  to Mentis's tabs, and two rows of tab strips read as clutter. Its guide's side panel stacks
  below in Mentis, because the room's prompt rail takes the right.
- **Speaking is opt-in in the guide, like writing.** Talking happens in the learner's own AI app,
  so Lingua can't time it; a lane with 0 minutes would otherwise always look like the quietest. It
  is steered to only for learners who chose Speaking (a new choice in onboarding).
- **Today's prompt comes from what was read, watched and listened to this week** (texts opened and
  media played in the last seven days, a series or podcast by its name), turning by day, the two
  prompts about different things when there are two. Without anything, Diarium's prompt of the day
  and Sermo's scene of the day. Talking about a title is a new line in every conversation kit
  (twenty languages), used in place of the scene.
- **Sonus et Visio filters, it doesn't split.** All · Listen · Watch is one remembered setting; the
  categories, Continue and the shelves follow it. Films & series are videos added as files (or
  subtitles only), Videos are ones from a link. Visio's old page is gone; its card moved to
  `features/visio/library/VideoCard`.
- **The device's light for new installs only.** An install that finished onboarding before this and
  never chose a light keeps paper (`rowsToSettings`), so nobody's app changes colour on update.
- **Card width is a maximum** (460, 576 or 840 px); Normal is exactly the old `max-w-xl`. A deck's
  own width is optional and falls back to the one for every card.
- **The sidebar is 216/64 px** and publishes its width as `--sidebar-w` for the fixed bars that
  centre beside it.

## 2026-10-21 — Lingua+ and Lingua+ Max (5.1-2a)

- **One table decides every lock** (`FEATURE_PLAN` and `can()` in `data/plan.ts`), with `usePlan`,
  `useCan`, `RequirePlan` (a tab or room), `PlanRoute` (a full page: back to its room with the
  plans open) and `useGate` (a link or button). Moving a feature between plans is one line.
- **Max gates the keys, not the features' code.** `aiKeys(settings)` blanks the Groq and Gemini
  keys without Max, and the AI services read settings through `getAiSettings()`, so no AI call can
  forget the check; `aiBlock()` tells the screens whether the plan or the key is missing. TMDB and
  YouTube keys aren't AI and stay free. Sermo is Lingua+ (the scenes, talked through in the
  learner's own AI app); chatting inside Lingua uses a key, so that part is Max.
- **Licences are signed, checked offline.** ECDSA P-256 over the payload's text, the public key in
  `services/licence/config.ts`, the private key only in the Worker's secrets. Max keeps 14 days'
  grace past its paid-until date while the device can't reach the server.
- **The licence server is a Cloudflare Worker in this repo** (`server/licence`, tested in
  `services/licence/server.test.ts` against a stand-in Stripe). It reads the checkout and the
  subscription, also from Stripe's newer API where the period sits on the subscription item.
  Stripe returns the learner to Settings › Lingua+ with `?checkout=`; GitHub Pages serves deep
  links through its 404 page, so the address works on the live site.
- **The licence stays on its device.** `meta` is device-local (it holds the device id), so the
  licence doesn't sync; Settings › Lingua+ has Copy licence and Restore instead.
- **Test mode is automatic** (`TEST_MODE` while the links, the server or the public key are
  empty), so the code that charges ships now and switches on with configuration alone. Installs
  that finished onboarding before the plans act as Max in test mode, so nothing they used locks.
- **The MAX mark is quiet** (the user, 2026-10-21: "more minimal, luxe"): no fill and no sheen, but
  spaced capitals in the accent shaded towards the ink (deeper on light grounds, brighter on
  dark), the "+" kept and a hairline beside the name ("Lingua+ │ MAX") and a hairline outline elsewhere, and one fade-in (opacity
  only, as PERFORMANCE.md asks; none with reduced motion).

## 2026-10-25 — Cursus as an adventure trail

- **The user asked for the course "in a HelloChinese, Duolingo format": an adventure, a clear
  progression line, a fun look and feel.** One trail of round lessons for all twelve units, swinging
  left and right; each unit has its own colour and picture (`course/AdventurePath.tsx`
  `UNIT_LOOK`), a banner with its can-do lines and progress, and its check as a trophy. The levels
  are landmarks (a flag at A1, mountains at A2 and B1, the summit at the end).
- **Pressable, not glossy:** each lesson is a coloured disc with a darker edge under it that it
  sinks into when pressed, like Duolingo's; the rest of Lingua's calm look (paper, serif titles)
  stays. Motion is transform-only (the bouncing "Continue", the cards), and none with reduced motion.
- **Locked, with a way through:** units after the one you're in look locked, as in Duolingo, but a
  click offers that unit's check to jump there (the course always allowed testing out). Lessons
  inside the current unit stay open in any order, as before.
- **Where you are** (the right-hand card, "What you can do") stays as it was; the page opens
  scrolled to the next lesson.

## 2026-10-25 — Sound without a key (5.1-3c, parts 1 and 2)

- **Real people for common words, from Wikimedia Commons.** Lingua Libre and Wiktionary speakers'
  recordings (free licences: mostly CC BY-SA, some CC0 or CC BY). Only an index is committed
  (`public/sounds/<lang>.v1.json.gz`, 30–160 KB a language); each sound is Commons' mp3 (about 15 KB),
  fetched the first time it's played and kept in `db.speech` with its speaker and licence, which
  Commons' API gives. Commons allows any site to fetch both. Settings › Voice lists the
  recordings heard with their credits and links, as CC BY-SA asks; the speaker button's tooltip
  names the speaker.
- **Two sources, because one wasn't enough.** The English Wiktionary's entries (kaikki.org) carry
  the region each word was recorded in, but kaikki doesn't read the Spanish, Russian, Mandarin and
  Arabic pronunciation templates (85 Spanish entries had audio). So the script also lists Commons'
  categories: all of Lingua Libre for the language, and the Wiktionary speakers' "Ru-слово.ogg"
  files. Of the 10,000 most common forms: French 85%, German 88%, Spanish 43%, Russian 35%,
  Mandarin 33%, Arabic 19% (of the 1,000 most common: 46–98%). Mandarin only from recordings
  marked Mandarin (Lingua Libre's "cmn"), never Cantonese or another Chinese language.
- **The accent:** the flag's region first ("France", "Mexico" or "American Spanish" for Latin
  American flags), then a recording with no region named, then any. Lingua Libre's category
  listing doesn't say where its speakers are from, so most Spanish, Russian and Arabic recordings
  have no region.
- **Only for a word in the index, and only without a Gemini key** (Gemini's voice, with Max, stays
  first). A sentence still needs a voice. When a recording can't be fetched (offline, Commons
  busy), the device's voice says it instead.
- **A robotic device voice is now the last resort, not never** (the plan's order). It is still
  only exactly the flag's locale, and Voice says how to get a natural one (Edge's online natural
  voices on Windows; a Premium or Enhanced voice on a Mac). The learner can pick any of the
  device's voices for the locale (`voice.device`). Edge's "Online (Natural)" voices rank first.
- **Part 3, a voice made on the device (Piper), with espeak-ng (GPL-3): the user said yes**
  (2026-10-25). Piper needs espeak-ng to turn text into phonemes; whether a paid app may ship it
  was the user's call. The voices whose licence allows a paid app: fr_FR siwis (CC BY 4.0,
  credited in Settings), es_ES davefx (CC0), es_MX ald (Unlicense), de_DE thorsten (CC0), ru_RU
  denis and dmitri (CC0), zh_CN chaowen (CC0). Left out: ar_JO kareem (no clear licence, so Arabic
  has none), ru_RU ruslan (non-commercial), zh_CN huayan (unknown), fr_FR tom (AGPL).
- **Our own small runtime, not a wrapper package.** The npm wrappers only know their own list of
  voices (no chaowen) and load their engines from CDNs. Lingua runs onnxruntime-web and
  espeak-ng's WebAssembly build in a worker, served as its own assets; each 63 MB model comes from
  Hugging Face only when the learner downloads it, and stays in the browser's cache.
- **Mandarin through pinyin.** Piper's new Chinese voices take pinyin (initial, final, tone), not
  espeak's phonemes. `pinyin-pro` (MIT) reads the characters in the browser; piper itself uses
  g2pW, a 600 MB model, too big to download for this.
- **Slower than hoped, so not first.** On a laptop a sentence takes 1–2.5 s to make (WebAssembly on
  one thread; GitHub Pages can't give the isolation threads need, and WebGPU's first sentence
  took 15 s). So natural device voices (Edge's online ones, Apple's premium) stay first unless
  the learner picks Piper; Piper comes before the merely good and robotic ones. Long text is said
  in parts, made while the part before plays, and everything said is kept.

## 2026-10-24 — A much larger Discover (5.1-3b, part 4)

- **New lists without the 2 GB rebuild:** a full rebuild of 35 packs (and an hour's count for
  Japanese and Mandarin) only to add themed lists would also change everything else in them. The
  new `retheme.ts` reads each built pack and picks the new lists by the pack's own words, the same
  way `build.ts` does (`themePicks.ts`, shared); the 14 lists from the full build stay. A later
  full build makes the same lists, so nothing is lost.
- **Computed decks are worked out, not listed:** irregular verbs from each pack's own verb tables
  (a verb is irregular when one of its forms leaves the regular stem: ser → soy, gehen → ging), only
  for the 15 languages where learners study them; words that look like English by comparing each
  common word (Russian, Greek and Georgian in Latin letters) with its first English meaning, so
  false friends never count. "From songs and shows" comes from the words looked up there.
- **Levels by how common the words are:** a deck's level is set by its middle word's frequency
  rank (A1 to 600, A2 to 1,800, B1 to 5,000), so it differs by language and needs no hand labels.
- **Discover searches itself:** on Discover, search looks through names and the words inside
  (Hund finds Animals); on My decks it still searches decks, folders and themes.
- **Hand fixes where Wiktionary's first pick is another sense** (the date you eat, a match you
  strike): sense hints for every language, and checked overrides for Spanish and a few for French,
  German and Mandarin; an override can hold for one part of speech (`es:book|verb`).

## 2026-10-24 — More varied Ludus lessons (5.1-3b, part 3)

- **Rules over pure chance:** kinds are weighted (making the word and sentences more often than
  plain recognition), but a lesson never repeats a kind back to back and keeps every kind under
  about a third. The planner places one exercise at a time and tries again (up to nine times) when
  a lesson would have to bend a rule; with very few cards or kinds it bends the fewest.
- **The pairs round is a first look:** it takes new cards first, and a new card met there gets
  only its second, harder round later, so a lesson isn't longer than before.
- **Borrowed sentences aren't saved:** a dictionary sentence lent to a card is for that lesson only;
  the card's own example stays as the learner left it.
- **Long words get smaller, not broken:** the app's browser has no hyphenation for German, so a
  long compound would break before its last letter; the longest word sets the type size instead.

## 2026-10-24 — A deck's settings and cards (5.1-3b, part 2)

- **New-card order is written into the cards,** not read at study time: shuffling or ordering sets
  the new cards' due times once, so the study queue stays as simple and fast as it was. Words added
  later come after them.
- **Forget progress keeps the history:** the cards start again as new, but the review log stays,
  so Ratio's past days and streaks don't change.
- **Per-deck Ludus exercises add to the global ones** (Ludus's own settings), and at least two kinds
  always stay on.

## 2026-10-23 — The Thesaurus room (5.1-3b, part 1)

- **Fixed colours for new, learning and to review** (sage, amber, blue), as Anki has, instead of the
  accent: the accent changes with every palette (amber in Charcoal, green in Sage, blue in Linen and
  Ink), so "learning" and "to review" looked the same in some of them.
- **A deck's colour without photos:** a theme deck takes its theme's hue, words from reading the
  accent, the path sage, and any other deck a steady hue from its id. There are no theme photos (none
  are shipped; a hue and an icon keep the app offline and light).
- **List or cards inside the sort menu,** as Codex does, so the strip holds only search, sort and New.

## 2026-10-22 — Speaking your journal (Cursus, part 5)

- **Whisper, not the browser's recognition:** the browser's speech recognition (used for the
  course's short phrases) sends audio to the browser maker and stops after a sentence; a journal
  is longer and private. Whisper runs on the device (free, offline once downloaded) or on Groq with
  the learner's key, the same choice Settings › Listening already makes for live text.
- **Record, then write out:** one recording of up to five minutes, written out when you stop,
  rather than live text: Whisper is far better with the whole of what was said, and it fits how a
  journal is spoken. The recording itself is never stored.
- **No new AI links:** Sermo already opens ChatGPT, Claude, Gemini and Copilot with a prompt in the
  language; the course's Speak lesson and Diarium lead there instead of repeating them.

## 2026-10-22 — In your own words (Cursus, part 4)

- **Where it is asked for:** at the natural end of something (a text's end page) or beside it
  (the players' side panel), always folded or behind a button, never in the way. Each place asks
  two things that fit it: retell, plus carry it on (reading), describe a scene (watching) or keep
  one thing (listening). No new room: what is written goes to Diarium, where writing already lives.
- **Scenes in words, not pictures:** "describe a picture" would need pictures Lingua doesn't have
  and can't license; each course unit has a scene described in English to write about instead.
- **One panel and one hook** (`useOwnWriting`) for the course's Write lesson and the rest, so the
  check, Diarium and "Ask a speaker" behave the same everywhere.

## 2026-10-22 — Cursus, the course

- **One outline, each language written by hand.** Twelve can-do units (A1 to B1) shared by the six
  core languages; each language's words, phrases, grammar and model answers are written and
  checked for it, not drawn from the packs' theme lists, which are machine-made and have errors.
  A test checks every unit is complete, every phrase has one bracketed word and three wrong ones,
  and every grammar topic named exists.
- **Grammatica's lesson engine runs the course.** A unit's words and phrases become topics of
  their own (a word is an item whose sentence is the word), so the exercises, keys, sounds, setup
  and feel are the same as Grammatica's. Course lessons run as practice: no grammar schedule moves.
  The course gives some kinds its own titles ("Which word is it?").
- **Speaking without a server:** the browser's speech recognition, compared word by word with the
  phrase (accents, case, punctuation and Arabic marks don't count; Mandarin by character); 75%
  passes. Where there is no recognition, or no microphone, you say it and go on yourself.
- **Feedback from people, lightly:** "Ask a speaker" copies the task and the text with a request,
  to paste to a friend or a language exchange. No community or server.
- **Testing out:** a unit's check can be taken first; 80% marks every lesson of the unit done.
- Lessons count in Ratio as Ludus (writing as writing); the course is Lingua+, like Grammatica.
- **How each script is written:** Russian with stress marks, which the exercises take off every
  answer and tile (the wrong forms have none, so a marked word would give it away); Arabic as
  Modern Standard Arabic, fully vowelled, each phrase's answer a whole word so the tiles work;
  Mandarin in simplified characters with pinyin (tone marks, 一 and 不 as said) for every word
  and phrase.

## 2026-10-22 — Goodreads as Codex's third tab (5.1-3a)

- **The library is what can be read.** Goodreads books without their text left the library's
  shelves (the Wishlist group, and read books never opened here under Finished) for their own tab;
  a book whose EPUB or free edition comes in is in both, keeping its Goodreads shelf and rating.
- **Covers by cover id, not by ISBN.** Open Library limits covers by ISBN to 100 an IP every five
  minutes; its Books API answers fifty ISBNs at once with covers by id, which aren't limited. Books
  without an ISBN are searched by title and author, one at a time. A book is asked about once
  (`coverUrl` '' when there is none); a cover id of -1, and a one-pixel picture, count as none.
- **"Find a free edition" only when it can be free:** published 96 years ago or more (Gutenberg is
  in the United States; 1930 and before in 2026), or the year unknown. A newer book says so.
- **A newer export updates.** Importing the CSV again adds new books and gives those already here
  the export's shelf, rating and dates (matched by Goodreads' book id).
- Sort, group and the view are remembered on the device; the filters last while the tab is open.

## 2026-10-22 — Discover (5.1-3a)

- **Only sources an app may read, checked when built.** Wikipedia, Wikisource and Gutendex send
  CORS; Gutenberg's files and search page don't, so they go through Jina Reader, which the news
  already uses (it sees the link and nothing else). StoryWeaver, African Storybook, Bloom and
  Pepper&Carrot don't let apps read their files (and Commons has Pepper&Carrot only in English and
  Esperanto): they are links, and their downloads come in through Import. Wikinews is left out: no
  new stories in a month.
- **Belt and braces for flaky lists.** Wikipedia's two most-read lists were each empty for some
  languages on some days: the feed (yesterday, then the day before) comes first, then the API's
  list. Gutendex often didn't answer (once over 40 seconds): eight seconds, then Gutenberg's own
  search. Gutendex's data keeps out audio books and bilingual books; at import, a missing edition
  is said plainly instead of importing an error page.
- **Books keep their chapters:** the HTML edition's headings become chapters (the title page's
  lines and the table of contents left out); a Wikisource work's subpages, in the order its main
  page links them.
- **Covers from the web** (`coverUrl`): shown as pictures, which needs no CORS; the designed cover
  when one doesn't load.

## 2026-10-21 — Photos of a book's pages (5.1-3a)

- **The comics' OCR, on the device,** in a second mode: a book page is read whole (Tesseract's
  automatic layout) where comic lettering is read as scattered lines. One worker, switched between
  the two as needed, and let go when the import ends.
- **Paragraphs from the lines' positions,** not Tesseract's paragraphs, which split mid-word in
  testing ("ciu-" / "dad"). A paragraph ends at a wider gap, an indent against the line before (so a
  second column works), a jump up to another column, or a line ending a sentence well short of the
  column's right edge. A phone photo is made smaller (at most 2400 px across) rather than larger.
- **The photo stays with its text,** so a misread word can be checked against the page; ten pages
  to a chapter in a long book.
- Pictures dropped on the book tab are a book's pages; on the comic tab, a comic's.

## 2026-10-21 — Check yourself (5.1-3a)

- **Made from the text, without AI;** it checks words and sentences, not understanding, and says
  so in what it asks. The words asked about are Learning words first, then new ones; a gap never
  takes a sentence's first word and options are shown as written mid-sentence, so a capital letter
  gives nothing away. The questions are made once as the end page opens, so they don't change while
  you answer. With Max, the AI adds two questions about the story, asked for when the panel opens;
  if they come after you're through, they're left out.
- Folded, because the end page is a quiet place; it counts in Ratio like a Ludus round (and, like
  every session, not under five seconds).

## 2026-10-21 — Word meanings in the core languages (5.1-3a)

- **At reading time, not in the packs.** The user asked for much better translations (Spanish "a"
  read "bishop"). The packs already carry what is needed: each form's Wiktionary description, each
  lemma's senses and paradigm. Reading them when a chapter loads (`services/translate/gloss`
  `refineForms`) reaches every install at once, with no pack version or 2 GB rebuild. The rules are
  pure (`core/lang/formGloss`) and tested on the real packs.
- **The form's own English.** A verb form is the lemma's verb inflected by person, number and tense
  ("I have", "has", "said", "will go", "would be"; German subjunctive II as "would"); a plural noun
  is made plural ("children"). Only the lemma the description names counts. A form that is itself a
  headword keeps the pack's meaning, because its description names the rarer reading ("casa" of
  casar). "Inflection of X" is looked up in X's paradigm, preferring the indicative and the third
  person.
- **Hand-checked tables** for es, fr, de and ru (`core/lang/commonGlosses`, loaded with the
  reader): the English verb for common lemmas (Wiktionary's first sense is often not the usual one:
  querer "to desire") and the meanings of some 150 common words each, reviewed against the 300
  commonest forms. They win over the pack and over context.
- **Context is more careful.** Function words (prepositions, articles, pronouns…) keep their usual
  meaning; of a word's own senses only its two main parts of speech compete; another lemma of the
  same form still can ("se tarde": tardar).
- Arabic and Mandarin are left as they are: their fixes are in the build (scripts/lang-data/fixes.ts)
  and their forms don't inflect in English the same way.

## 2026-10-21 — Home, Today (5.1-2c)

- **The old Home stays, one setting away.** `HomePage` picks `HomeToday` or `HomeClassic` by
  `ui.homeLayout` (device-local, default Today), so the user can compare and nothing is removed
  until they say the new one stays. Next up, the week and first steps are shared from HomeClassic.
- **Square, at the user's request.** The first build left gaps where one column ran longer than
  the other. Now each row's cards stretch to one height: the numbers moved from a row of their own
  to a two-by-two card under the week, sized so the two columns meet; Next up shows at most four
  rows; first steps became a full-width strip; Cursus and Mundus share a row in equal columns
  (`auto-cols-fr`), so a third card (the alphabet) never wraps alone.
- **The ribbon animates once, by transform** (scaleX), and the segments are plain widths; nothing
  animates layout (PERFORMANCE.md).

## 2026-10-21 — The first start (5.1-2b)

- **The user shaped it in the browser.** After the first build the user asked, page by page, for:
  a big, wide map clicked first; a stricter map; the list of every language under the map, peeking
  in; level rows that are easy to see and press; the spoken languages centred with the level asked
  at once; the reasons and the goal on separate pages; a plans page that sells; and every page on
  one screen. Their outline added the name, the welcome and the funny subtitles.
- **Tints only where a language has a standing.** CLDR counts second-language speakers, so German
  showed in Slovenia (42%), Slovakia and Hungary. The map now tints official, regional, minority
  and historical places only; "widely spoken" needs at least half the population (was 5% or a
  million) and shows on a country's card, not in colour.
- **The map opens on the inhabited world** (72° N to 48° S), filling a wide box instead of fitting
  the whole Mercator world into it. A panel over the map's right side shifts every flight
  (`inset`), so the country or the language lands in the part still showing. The hit test runs
  untransformed: the drawing leaves the pixel-ratio scale set, which made hover and clicks miss on
  screens scaled above 100%.
- **The goal is a level,** stored on the language (`LanguageProfile.goal`); the name on the
  learner (`learner.name`). Neither needs a database version. The "about N months" uses the middle
  of Cambridge's guided learning hours per level (A1 95 … C2 1100) and says it is rough.
- **The plans page in onboarding is its own pitch** (`features/plans/PlanPitch`), sharing the buy
  logic with the plan cards (`useBuy`). It promises only what is true. Max shows monthly first, here
  and in Settings (the user).

## 2026-10-25 — Typing practice (5.1-4a)

- **keybr's method, per language.** Letters unlock in frequency order (pack words weighted by
  rank, 1/(rank+20)), and practice lines are made-up words from a trigram model, because real
  words of only six letters are too few to practise on. Twelve presses at the target speed and
  95% accuracy per letter unlock the next; the slowest letter is the focus.
- **The physical key, not the character.** `KeyboardEvent.code` is mapped to the language's
  standard layout (dead keys included), so a learner with an English keyboard practises the real
  layout before installing it. "I have this layout" switches to `e.key` for those who have.
- **Mandarin types pinyin.** Typing Chinese is typing pinyin and picking, so its letters are
  pinyin letters (ü on V, as pinyin keyboards do) over the syllables of common characters, and a
  second mode is a small practice input method with the candidates from the most common
  characters. No tones: real input methods don't ask for them.
- **Its own table** (`db.typing`, Dexie v17, last write wins in backups); the time is a 'write'
  session with refId 'typing', so Ratio and Home count it without a new session type.
- **The data is built, not fetched:** `scripts/typing/build.ts` writes about 30–60 kB of JSON per
  language from the committed packs, loaded only when the tab opens.

## 2026-10-25 — A touch of the language (5.1-4b)

- **One attribute, mostly CSS.** `<html data-flavour>` (set in Root from the studied language,
  unless Settings turns it off) drives the heading face, the ornaments and the ornament colour from
  `styles/flavours.css`; with no flavour every page is as before, so turning it off is exact.
- **The accent leans, it isn't replaced.** Palettes are the learner's: each palette's accent moves
  a fraction toward the language's colour in OKLab with its lightness kept, generated per palette
  (`flavourCss()`); a text or fill colour that would read worse than 4.5 : 1 (or than before) stays
  as it was, which a test checks for every palette and language. German doesn't lean (its touch is
  the grotesque and the rule); French and Arabic lean least, since blue and teal grey terracotta.
- **Headings only, never the reading text.** `font-display` is used on room titles, Home's
  greeting and empty states; book titles, lessons and reading keep the reading font.
- **Mandarin's quotation marks are “ ”,** as mainland texts use; 「」 for Japanese and Traditional
  Chinese.

## 2026-10-25 — Lingua 5.1's check on its own, version 5.1.0

- The user asked for 5.1-5 now, with 5.1-4, instead of one check with 5.2's at the end. It was a
  scripted sweep (every room and tab, three desktop sizes, light and dark, in a sized frame inside
  the app, counting console errors and anything past the page's edge), the pretend plans, and
  looks at what 5.1-3c and 5.1-4 added. The version is 5.1.0, as the 5.1 plan says; step 21 now
  holds only 5.2's check and takes the version to 5.2.

## 2026-10-25 — Radio only in the language (5.2-2)

- **Rules over a list.** radio-browser's language tags are typed by owners, so a station is kept
  by rules (only or first language; spoken in its country; its name's script) and a short
  hand-kept list catches the rest. The rules alone took Spanish from 44 countries to 34 and
  Russian from 30 to 15; the list is empty for now.
- **Aliases and bases.** Owners write "castellano", "rus", "язык: русский" or "swiss german":
  these count as the language. Other languages are counted by base, so "american english,
  english, english uk" is one other language, not three.
- **Copies under many flags** (the same reciter filed in a hundred countries) are kept once, by
  name: a name in three or more countries is one station.
- **Tiles without virtual scrolling:** `content-visibility: auto` skips drawing tiles off screen,
  enough for 400 stations without a windowing library.

## Listening (5.2-3)

- **Only podcast courses a web app can read.** Lingua has no server, so a feed whose host sends no
  CORS headers (Acast's Coffee Break, Slow German, RussianPod101) can't be added in the app; the
  catalogue lists only feeds checked to allow it, rather than ones that fail on Add.
- **FSI: the audio in Sonus, the textbook on its page.** archive.org keeps the public-domain
  audio as one item per course, which becomes a course on the shelf; the textbook stays a link
  (yojik.eu), since importing a scanned PDF into Codex is its own job. archive.org's thumbnails
  for these items are blank, so they have no cover.
- **Sonus+ settings are only real ones.** The plan's list had settings with nothing behind them
  yet; the gear holds only what changes something in the room today.


## 2026-10-26 — Desktop screen single-page sweep (no tiny scroll)

- **Root causes of tiny scroll eliminated:**
  - `DesktopShell` padding reduced from `pt-12 pb-20` (128px vertical padding) to `pt-6 pb-8` (56px). On desktop there is no mobile tab bar, so 80px bottom padding pushed moderate-height screens just over 100vh.
  - `PageHeader` & `RoomTabs`: Bottom margins reduced from `mb-9` to `mb-5`.
  - Exercise & Lesson views (`GrammarLesson`, `LettersLesson`, `Ludus`, `SpeakLesson`): Hardcoded `paddingBottom` reduced from 140–190px (mobile insets) to 96–104px (desktop horizontal bar).
  - Dialogs & Sheets (`ShortcutsDialog`, `PlansSheet`, `PlanCards`): Added responsive max-height and tightened padding so modal dialogues fit without vertical scroll on standard 1366×768 laptop displays.
  - Sonus / Radio / Visio player views: Recalculated fixed viewport heights (`100dvh-3.5rem` min 460px) and tightened dropzones, empty states, and section gaps across Codex, Colloquium, Diarium, and Mundus.

## 2026-10-26 — Lingua 6 · Design: the plan and the handbook

- **Lingua 6 is a design update, one room at a time, from the user's notes.** The user went through
  the first start and left notes ("this is just onboarding, but Lingua 6 will focus on design, so
  much more will come"). The first start is step 6-1; each room is planned when its notes come, so
  nothing is redesigned on a guess.
- **Three of the notes were a bare "remove".** They are read by their place in the flow (the mark
  above the name, the common-words switch, the "You speak" page) and written down as questions in
  the plan's section 4, so the user can correct a reading before 6-1 is built.
- **No forecast on the goal page.** "B1 in about 7 months" came from Cambridge's guided learning
  hours and said it was rough, but it read as a promise; the user found it not accurate. What stays
  is a true connection: the goal says what the level means, the minutes say what they hold in Lingua.
- **The handbook is a printed book, not a page in the app.** A5, set in Lingua's own Literata and
  Plus Jakarta Sans on its Cream, with prose in the column and the exact values in the outer margin:
  simple to read, with the control there for whoever looks. Every room gets one page, so the whole
  of it can be seen at once. The user asked for it to look made by a person: bookish, minimal, a
  little cute.
- **It prints without a new dependency.** `scripts/handbook-pdf.ts` drives any Chromium on the
  computer over the DevTools protocol with Node's own WebSocket, and refuses to write the PDF while a
  page overflows. Playwright's full Chromium on this computer doesn't start (a Windows side-by-side
  error), so the script tries Playwright's headless shell first.
- **From the "Lingyu" design package, only what fits.** The user shared a reconstructed UX blueprint
  for a music-learning app under a temporary name (2026-10-25). The handbook takes its principles
  (content before dashboards, details on demand, one word everywhere, saving isn't scheduling,
  honest numbers, every page's states, closing returns to where you were) and leaves its indigo
  tokens, its four tabs, its phone layouts and its feature catalogue.

## 2026-10-26 — Lingua 7 · Features: the audit and the plan

- **Every entry checked, not sampled.** The user pasted the Lingyu catalogue (1,618 entries) and asked which Lingua
  has and a plan for all the rest. Each entry got a status (there, partly there, missing, already in an open 5.2
  step, or needing the user's word) from the docs and the code, and the result is a checklist in the repo,
  LINGUA-7-FEATURES.md, ticked as steps are built, so any session can see what is left.
- **"Partly there" rather than ticked** whenever Lingua does a simpler version of what the entry means (sorting
  decks but not cards, dictation only where a natural voice speaks): the steps finish them instead of skipping them.
- **Foundations first.** Many entries are one thing seen from several rooms (synonym cards, synonym races, synonym
  maps and a synonym finder are one data source), so Part A builds six shared pieces (the word record, the inbox
  and decks, cards and memory, one exercise engine, the learner's record, checked AI generation) and the room steps
  build on them. This keeps 1,143 entries from becoming 1,143 separate features.
- **New tabs only where a room needs one** (Cursus › Sounds and Exams, Thesaurus › Phrases and Map, Mentis ›
  Notebook, Ludus › Translate); everything else is a panel, mode or setting in a room that exists.
- **The tutor stays contextual.** 5.2-6 takes the chat out of Sermo; Lingua 7's tutor is an Ask button where the
  learning is, and conversation feedback comes from pasting the AI app's conversation back. A live chat would be the
  user's call (Q3).
- **Generated material is checked before it is shown** (schema, dictionary look-ups, a measured level, a label and
  Report), because the catalogue itself warns that learners absorb confident mistakes.
- **47 entries wait for the user:** community, public profiles, leaderboards, phone apps, widgets, cloud accounts.
  They go against D1, D6 and Lingua being private; step 7-27 proposes sharing by files and links instead, and says
  what a server would cost.

## 2026-10-27 — Lingua 7 before Lingua 6; the full handbook

- **The order is the user's:** "Do Lingua Features first, then Lingua Design." Lingua 7 comes right after Lingua 5's
  check; Lingua 6 then redesigns rooms that already hold Lingua 7's features, so each room is redesigned once.
- **Versions only go up.** Lingua 7 builds as 0.7.x; Lingua 6, built after it, takes 0.8.x. The plans keep their
  names, since everything refers to them (VERSIONS.md).
- **The user's other answers** (LINGUA-7-PLAN.md section 6): sharing and community still to be considered; no live
  voice conversation in Lingua; yes to the interface in the language being learned; yes to optional streaks, stamps
  rather than points and reminders off by default; phone apps and widgets "can be": not ruled out, not scheduled,
  so desktop only (D6) still holds for what is built.
- **The handbook became the whole Lingua handbook** (second edition, 80 pages), at the user's ask: the design parts
  as before, plus the product and roadmap, the people Lingua is for (five learners written as sketches to test, not
  research), telling people (honest claims, channels for one maker, a launch in three stages, counting without
  analytics), running it (Stripe, VAT, the licence's limits, privacy and licences, support, shipping) and the road
  to 1.0. Competitors appear by kind, never by name, because their features and prices change and EU comparative
  advertising must be verifiable. Money examples are labelled illustrations with their assumptions.
- **Chapters number themselves** in the book (the script counts them), so other docs cite chapters by name.
- **The PDF keeps its file name** (`Lingua-Design-Handbook.pdf`) so every link to it still works; its title is
  "The Lingua Handbook".

## 2026-10-27 — Lingua 6 is Features, Lingua 7 is Design; the handbook's missing chapters

- **Renamed so the numbers follow the order** (the user: "Put Lingua 7 as Lingua 6 - Design, so Lingua Design becomes
  0.7"). Lingua 6 · Features (`LINGUA-6-PLAN.md`, the audit `LINGUA-6-FEATURES.md`, steps 6-1 … 6-28, versions 0.6.x,
  handover step 23) is built first; Lingua 7 · Design (`LINGUA-7-PLAN.md`, steps 7-0 … 7-11, versions 0.7.x, handover
  step 24) follows. The 0.8 line from earlier the same day is gone. Entries above this one, and the changelog, keep the
  old names as they were written.
- **The handbook's gaps, filled** (the user: "check if anything still misses from handbook and add that"): adding a
  language (what each tier takes, with the commands), getting the language right (named sources, a native reader
  before Core, reports become fixes), the mark and the press kit, how Lingua is built, keeping learners' data safe,
  when something breaks (an order of severity and of steps), choosing what's next, your own rhythm, and an index the
  print script makes from the pages themselves. 90 pages.

## 2026-10-27 — Design notes in the Lab (7-0b)

- **Inside Lingua, not a separate app.** The user wanted to click elements in the running app and leave design notes.
  Nothing in Claude pins comments to a running local app, so the tool is part of Lingua: a lazy chunk (about 15 KB)
  that loads only when Settings › Lab turns it on, like the FPS monitor.
- **Notes stay on the device** in localStorage: they are working notes for one person, not learning data, so they
  are not in Dexie, backups or sync, and Reset clears them. Copy for Claude is how they travel: Markdown that any
  session, on any account, can read.
- **A note finds its element again** by a short CSS path (an id, a test id or an aria-label, else tags with
  :nth-of-type, at most six steps, stopping at a landmark), and its pin sits where the click was, as a share of the
  element's size, so it follows the element. When the element is gone, the pin stays where it was, dashed.
- **Pick mode holds the page's own clicks** (pointer and mouse events stopped in the capture phase), so picking a
  button never presses it. Alt N is matched by the physical key; it works in text fields except on a Mac, where
  Option N types the tilde of ñ.
- **The bar moves between corners** because the bottom right is shared with the mini player and download progress.

## 2026-10-27 — Design notes in detail, the Device lab as a developer's tool, Simple settings (7-0c, 7-0d)

- **Areas are kept relative to the smallest element around them**, as fractions, like a pin's spot: they follow the page
  when it scrolls or reflows, and still make sense when the window is another size.
- **Tweak previews are inline `!important` styles** on the element, put back exactly as they were when Preview is turned
  off, the element changes or the card closes; nothing is left on the page.
- **Token names come from the app's own stylesheets**, matched by colour where the element is (so a room's own
  colours are named too); the shortest name first, at most two.
- **The component name is read from React's fiber in the dev server only**; production builds minify names, so it is
  left out there rather than shown wrong.
- **The replay draws the first start over the app** (the Lab's state in `features/lab/devLab.ts`, session only) and
  never calls `completeOnboarding`; the light is the real setting, so the one from before is written back at the end.
- **Settings default to Simple** (the user, 2026-10-27: "a cute, minimal clean settings … essential", and "a more
  customizable settings"): most people only change a few things; Everything is one click away and remembered. The
  developer's tools stand apart in their own group, last.
- **Tips and explanations hide by an attribute** (`data-hint` on the explaining line, `html[data-hints=off]` in CSS):
  one switch for every primitive and Settings, no prop threading. Lines that report a state or warn stay untagged.

## 2026-10-27 — Sandesigning, a design canvas for every app (7-0e)

- **Its own folder, not a Lingua room** (the user: "standalone, downloadable … for all my apps … all sessions, accounts,
  and different ai models"): `sandesigning/` has no React and no dependencies (vanilla TypeScript, bundled by the
  rolldown Vite already brings), so the same code is the hosted page, one offline HTML file, a script for any web app
  and a lazy chunk in Lingua, and it can move to its own repository unchanged.
- **Served from Lingua's Pages** (`public/sandesigning/`, built files committed like the packs): one deploy, a stable
  address for the script tag and the setup file, nothing new to run.
- **Inside a shadow root:** the studio and the launcher can't be touched by an app's CSS or touch it; keys, typing and
  the clipboard stop at the host so the app underneath doesn't react.
- **SVG for the canvas, HTML text in `foreignObject`:** shapes, pictures and icons export to SVG and PNG with the same
  drawing code; text wraps and takes any font. Google Fonts are added to the page on first use (a shadow root can't
  declare fonts), only when online.
- **Capture through the browser's screen sharing** (`getDisplayMedia`, one frame, stopped at once), not a DOM-to-picture
  library: it is the real pixels, asks first, and needs nothing installed. The page's element boxes are read at the
  same moment and kept once per screenshot (`doc.dom`), so undo stays light; if another tab was shared (the picture's
  shape doesn't match), the boxes are dropped rather than pointing at the wrong things.
- **Cut-outs share the picture** (a crop box, no new pixels), so lifting elements out of a screenshot costs nothing.
- **The brief is the hand-over to any model:** Markdown that explains itself (positions relative to each frame, outlines
  as placeholders, notes by priority with selectors and components), plus the picture. `SANDESIGNING.md` is the
  user's "file with a prompt": it tells any project's AI how to add the script in development only, make `design/`,
  and teach future sessions to work from briefs.
- **Notes keep design notes' words:** the same kinds and priorities (Must, Should, Could), so Lingua's notes become
  canvas notes as they are.
- **Canvases stay in each site's browser storage**; `.sandesign` files and copy-paste (JSON with its pictures) carry
  them anywhere else. Nothing is uploaded.

## 2026-10-27 — Diarium's editor, and starting when storage fails

- **Tiptap, entries kept as Markdown:** Tiptap gives the keys and lists a writer expects without our own editor, and
  loads only on an entry page. The entry stays a Markdown string with our own small converter (no Markdown library):
  only what the editor can make (headings 1–3, lists, quotes, bold, italic, `<u>`), escapes for text that looks like
  Markdown, and plain old entries read unchanged. Sync, backup and word counts didn't have to change.
- **Corrections go back paragraph by paragraph:** the AI sees plain text (one blank line per paragraph, heading or
  list item); when its answer has the same number of paragraphs, each replaces its own and keeps its marker, else the
  corrected text replaces the entry as paragraphs.
- **"Dear diary" only where people write it;** elsewhere the date in the language, which is how those diaries begin.
- **A blank page is never the answer:** Brave once answered opening IndexedDB with "UnknownError: Internal error" (its
  files locked by a background Brave), and Lingua waited forever with nothing on screen. Now index.html shows a splash
  and any error before the app draws; the router has an error screen (a stale update reloads once); a slow or failed
  database read says so, asks the database directly, and lists what helps, safest first (quit the browser, restart,
  find the data elsewhere, start fresh only last and after asking twice).
- **The user's Home redesign** (branch `home-redesign`, 0.5.2-alpha.17): Home, Cursus, Explora and Bibliotheca as the
  main rooms, Codex, Thesaurus, Sonus, Visio and Mentis under Tools, Ratio and Settings at the bottom; Sonus and Visio
  are separate rooms again (`/visio` is Visio's page, no longer a redirect). Lingua 5's remaining steps build on this.

## 2026-10-27 — Sandesigner 1.1, Design Notes bar collapse, and Mac/Windows command options

- **Renamed to Sandesigner 1.1:** The canvas and layout design suite `sandesigning` was renamed to `Sandesigner` 1.1.
  The build outputs to both `public/sandesigner/` and `public/sandesigning/` to maintain 100% backward compatibility for existing bookmarks and integrations.
  Command line script `npm run sandesigner` added alongside legacy `npm run sandesigning`.
- **Floating bar collapse and expand on hover:** The Design Notes bar in Lingua and the embedded Sandesigner launcher can now be collapsed to a single pen icon button.
  An "expand on hover" option toggle lets the user hover over the icon to temporarily reveal the full toolbar without permanently uncollapsing it. Preferences are saved to localStorage (`lingua.designNotes.collapsed` and `lingua.designNotes.expandOnHover`).
- **Mac and Windows keyboard command symbols:** Both Sandesigner (`sandesigner.keyboard`) and Lingua (`settings.ui.keyboardStyle: 'auto' | 'mac' | 'windows'`) now provide an option to switch shortcut modifier symbols.
  Auto detects the platform via `navigator`. Mac renders symbols `⌘`, `⌥`, `⇧`, `⎋`, `⏎`, `⌫`, `⌦`, while Windows renders `Ctrl`, `Alt`, `Shift`, `Esc`, `Enter`, `Backspace`, `Del`.
  In Lingua, users can toggle this in Settings > Keyboard (`KeyboardSection`) or directly in the `?` shortcuts modal dialog (`ShortcutsDialog`).

## 2026-10-28 — Lingua 6 is spread over three AIs, against contracts written first

- The user has Claude Pro, ChatGPT Plus and Google AI Pro. Lingua 6 is staged (LINGUA-6-PLAN.md, "Stages") so the
  parallel parts go to different subscriptions and one usage limit never stops the work.
- A new step 6-0 writes Part A's types, tables and APIs as typechecked code before Part A is built: parallel work by
  different AIs then meets in the compiler, not in a merge. It also reserves the Dexie versions, the one thing two
  parallel steps would otherwise both claim.
- The audit's entries are ticked step by step, so the final check (6-28) is a spot-check, not a 1,618-entry pass.

## 2026-10-28 — Sermo opens the learner's own AI; no chat inside Lingua

- Sermo's job is the prompt, not the conversation: each AI does the talking, with its own voice mode, where the learner is
  signed in. So the in-app chat (and its key handling) went; chats already made stay in the database.
- Scenes are data in English, not translated wholesale: ten keep their hand-written sentence per language, the other seventy
  go in as English inside the language's frame ("written in English so I understand it, but speak only French with me"). It
  keeps eighty scenes cheap and the AI answers in the language anyway.
- Always copy first, and fill the prompt in only where a site's link takes one: a link can fail (sign-in pages drop the
  question), a copied prompt can't.

## 2026-10-28 — Mundus: replies, one Explore, small cards

- Mundus's replies (shorter, I'd rather listen/watch/read, Why this, Not today) are chips that re-run the guide's own rules and are kept for
  the day on the device; there is no AI in the loop. With Max a small box takes the learner's own words.
- Explore is one page with the three level bands (at level, a stretch, easier) and a side bar, so the shelves, Every pick and the old
  Explore are gone and their links are redirected. Radio and audiobooks have estimated levels, shown with a "~".
- Things to try is a grid of small cards. Each challenge has a time (2, 5 or 15 minutes) and a place by its icon, kept as small tables in
  `core/mundus/try.ts` rather than in every tip's data. Done ones go to the back, and a habit counts again the next day.

## 2026-10-28 — Grammatica is a path with a reason, and lessons use the width

- The suggestion rule did not change (`nextTopic`: the first topic not learned at or below your level); what changed is that it is shown
  with its reason (`core/grammar/path.ts`), so it reads as a guide and not a coincidence. Nothing is locked.
- Weak spots are topics whose items have been forgotten most (lapses), not a new measure, so there is no new table or Dexie version.
- Lessons have a 320 px side column (the steps and the rule) on desktop and no narrow column; Lightning keeps the plain stage.

## 2026-10-28 — Ratio: Iter goes, goals live in Tabula

- Goals were already per language, so they moved without a data change: Tabula reads the same `goals` table, shows the main one on the
  row (a level goal first) and the all-languages reading challenge above. Iter's timeline events, logs and moments stay in the database.
- The estimated level uses only words known, with round figures (500, 1,000, 2,000, 4,000, 8,000, 16,000 for A1 to C2) and says so;
  the level the learner says they have stays the one Lingua uses.

## 2026-10-28 — Visio: YouTube in its own embed, the extension reads, Lingua looks up

- The YouTube embed hides its captions, so Visio's two lines come from a subtitle file, the extension, or (for a show playing elsewhere) the follow clock; a `VideoLike` stand-in lets one clock serve a real video, YouTube and a timer.
- The extension reads only the subtitle files a player loads, never the video, and asks an open Lingua tab for lookups and saves (`services/visio/bridge.ts`), so it holds no data and needs no account. Messages from the page are checked (`parseRequest`) before anything is done.
- Not built then, built 2026-10-28 (0.5.3-alpha.7): a Gemini transcript from a link (Max, the learner's key in a header) and YouTube's own captions as a best-effort fallback (YouTube often answers with nothing from a browser page, so an empty answer is reported, not retried).
- Ratio's look-ups per 1,000 words count only sessions that recorded look-ups (`lookups` on `ActivitySession`, from alpha.28), so the rate is honest rather than thinned by older sessions.

## 2026-10-28 — The handbook grows a design half, and guides for tablet and phone

- The user asked for the handbook to be updated with all recent changes and for the design to be expanded: how it looks, feels, is laid out, its elements and where they go. It now has chapters on the desktop frame (216 px sidebar, a 1152 px column with 40 px sides), six layout patterns, every primitive with its real size, where each kind of thing goes (and the real keyboard shortcuts), how it feels (states, timings, small moments), dark and the fourteen reading papers (with measured contrast: faint ink on Parchment and Mocha is 4.2:1, just under 4.5), charts and numbers, the words on the screen, a recipe for a new screen, and a layout page for every room.
- The user then asked for tablet (iPad) and phone (iOS and Android) sections. They are written as briefs for a later pass, stating what exists today (the shell switches at 768 px; controls already grow under a finger) and what should be done. **The rule to build desktop only is unchanged**: nothing was built or changed for the phone or tablet.
- Fact-checked against the code where it states a number (sizes, radii, timings, shortcuts, the shell); the rest is marked as guidance.

## 2026-10-28 — The handbook draws its own icons (33 on a 48 grid), not yet used in the app

The user asked for a few pages on icons and some made: handdrawn, bookish. The handbook's chapter "Icons: the Lingua hand" gives the rules (48 field, stroke 2.6, round caps, one terracotta detail, sizes, states, night colours, one meaning per icon) and 33 icons; they are also files in `docs/handbook/icons/` (line in `currentColor`). The app still uses Lucide for controls: bringing the drawn set in is a design-pass (Lingua 7) decision, so nothing in `src` changed.

## 2026-10-28 — The handbook's numbers come from one block, checked by a test; its pages are checked sideways too

The user asked for the missing handbook parts (cheat sheet, design brief, forms, chart anatomy, papers and contrast, accessibility, sound and haptics, empty-page art, the first start, a design changelog) and for the thin pages to be filled. The cheat sheet's sizes, springs, colours and shortcuts are read from one JSON block (`#facts`, inline so `file://` printing works), and `src/test/handbookFacts.test.ts` checks that block against `Button.tsx`, `Drawer.tsx`, `Dialog.tsx`, `Sidebar.tsx`, `motion.ts`, `tokens.css` and `ShortcutsDialog.tsx`: change a number in the code and the test names the line to change in the book. It stays scoped to the cheat sheet, not all 169 pages.
The user also found content outside the page borders: tables with `width: 100%` plus the note column's margin ran 35 mm past the page, and the old check only looked at the bottom. `handbook-pdf.ts` now also refuses a page whose boxes reach past its side margins, or that clip text inside a cell; the stylesheet gives a table with no width of its own the whole line, and long cells wrap. Claims not yet tried are tagged in the book (the extension on real sites, the follow clock with a real show), proposals are tagged "Proposed", and the tablet and phone chapters "Guidance only". Two findings from the accessibility chapter are open design questions: terracotta and sage share one lightness (1.0 : 1), and faint ink is 4.2 : 1 on Parchment and Mocha.

## 2026-10-28 — Lingua 5 is complete: 0.5.2

The check (5.2-10) was done as a sample, not as the full grid of every room × three widths × two themes × three plans, which cannot be reached by looking: every room and tab was scanned for sideways overflow and error screens at 1280 and 1366 × 768 (light) and 1440 (dark), and the plan gating was read as Free, Lingua+ and Max. What the check could not cover is listed in ROADMAP 5.2-10, and stays open as ordinary work: the extension on real sites, Max's AI with a real key, Gemini transcripts, and any real phone or tablet. The version drops its alpha suffix here; Lingua 6 starts at `0.6.0-alpha.1`.

## 2026-10-28 — Handbook: stores and installers, page by page, Lingua 6 by page (0.5.3-alpha.2 and .3)

The user asked for the process and the deploy to the App Store, Google Play, Windows and Mac, and for more detail on elements, positions and design for every page of Lingua, with Lingua 6's possible expansions. The handbook now has "Stores and installers" (seven pages: the channels and costs, nine steps from code to a store, Windows, Mac, phones later with the store billing rule, the listing kit and what gets refused, versions and release day), "Page by page" (a card per route: where things sit, elements, states) and "Lingua 6, page by page" (five rules for placing a feature, the new tabs, each step's place on the screens). Store fees and rules are written as known in mid-2026 and marked to be checked the day they are used; the store chapter is a plan, nothing in `packaging/` is built, and phones stay out of scope under the desktop-only rule. The page cards are design intent: where the app differs, the app wins and the card is corrected. The AI claim in ROADMAP 5.2-10 was corrected too: AI with your own key is Max-only and stays locked under Lingua+.

The user then asked for the design and the handbook to grow to 200 pages where needed: "Pages, drawn" (wireframes of the lesson, study, reader, watch, trail, grammar topic, Home and a deck; keys, states and moves page by page) and "Lingua 6, drawn" (the word's page, inbox, Ask panel, reader tools, Sounds, and the questions to settle in the drawing) were added where position is the design: 200 pages (0.5.3-alpha.4). The wireframes are first sketches to draw from, not finished designs.

## 2026-10-29 — 6-4: the engine starts with one new kind, beside the old ones, not instead of them

`core/exercise` holds what every room shares: an exercise as data (`ExerciseSpec`, `src/core/contracts/exercise.ts`), how an answer is judged (`judge`), and the shared screen of a kind (`features/exercise`). Its first kind is **transformations**: one form of a word changed into another, made from any table of forms, so Grammatica's tables, the dictionary's paradigms and the course's grammar lessons all get it from one function (`planTransforms`). **Why not move Ludus's thirteen kinds and Grammatica's ten into the engine first:** the plan says they must not change what learners see, and a rewrite of 23 screens tied to card tracking and retries is where that would break. So the old kinds stay where they are, twelve snapshot tests (`src/core/exercise/snapshots.test.ts`, recorded before any change) prove their plans did not move, and the engine's kind is added to each room as one new case. Moving the old kinds in is 6-4b. A form that is only an accent away from another real form of the word (habló / hablo) is wrong, never "close" (`rejects`).

## 2026-10-29 — 6-1: the word's page gets a "You" card first; the language's half waits for the pack rebuild

A word's page already showed more of the language than the plan listed (sense labels, synonyms, antonyms, derived and related words, pairs, set phrases, from the full dictionary's own data), so 6-1 started with what was missing: the learner's half. Favourite, important, tags and the note are fields on the `Word` row (a word never met gets an Unseen row, so a favourite can be set from the dictionary); first met, last reviewed and recall are worked out from sightings, cards and review logs when asked, never stored twice. Tags change as the saved list is when the change runs (`changeWordTags`): two quick changes once undid each other. The note is saved when its card goes away, not only when the box is left: a note typed and then navigated away from was lost. **Left for 6-1b:** syllables, stress, word families, homophones, confusables and false friends need a pack rebuild from `scripts/.cache` (2 GB, hours): the user decides when.

## 2026-10-29 — 6-2: a word in the inbox has no row; the filter is chips, not a segmented control

Saving a word is not scheduling it. A word met or looked up has only its sightings, and **that is the inbox**: no row of its own is written until the learner decides (add to a deck, mark known, ignore), so nothing is made a card by being met and the existing "Your words" needs no migration. The three decisions write a row: Known and Learning as they always did, Ignore as `inbox: 'ignored'` (and "Back to the inbox" as `'new'`). A row that says nothing is kept, as the contract has it, so favourites, reset words and every word from before the inbox stay where they were. Adding to a deck uses the dictionary's meaning and the last sentence the word was met in, and never makes a second card for a word that has one. An archived deck is left out of the lessons that mix decks and out of the Today counts, and studied only by name; its cards and history stay. "Your words" filters are chips that wrap: five segments did not fit the column at laptop width (the labels were cut), and the segmented control it had held four.

## 2026-10-29 — 6-3: the memory's controls first, and a guess is Hard, never Good

A card forgotten eight times (`LEECH_LAPSES`) is marked a leech when it happens, once, and the study screen says so with a way out (put it aside; try a sentence or a way to remember it); an undo takes the mark back with the answer. A word can be put away until tomorrow from the study screen, and a deck can ask that after one direction is answered the other waits ("One direction a day", off as it was). **"I guessed" counts as Hard:** a right answer that was a guess is not knowing, so `answerCard` grades it 2 and logs `guessed`; a wrong answer stays wrong. After a long absence the Today card offers to spread the overdue cards over 3, 7 or 14 days, the oldest first, instead of one wall (`catchUpPlan`; only cards already overdue move, new and suspended ones never do). How likely a card is remembered today is said in plain words in the card's editor ("about 73 % (slipping)"), from ts-fsrs. The mnemonic is a field of the note, shown on the back of the card. **Not built yet** (6-3b): the new card templates and pictures, the hints and the guess button on cards, custom learning steps and the due calendar; the data fields for them are in.

## 2026-10-29 — 6-5: the record is written where answers are taken, and read through one set of questions

`evidence` rows are written by `answerCard` and `answerGrammarItem`, not by each screen: every room that answers a card or a grammar item (Recall, Ludus, Lightning, the lessons, the course) is recorded without its own code, and an undone answer takes its row back. A right answer with a hint or a guess is `assisted`. Rooms read only through `learnerRecord` (`weakSpots`, `recognisedNotRecalled`, `quietSkills`, `history`, `days`), so the Grammatica, Ratio and the tutor cannot disagree about a weak spot. **A mistake is persistent on three different days or in three places**; once is a slip and is not shown. The per-day summaries are a cache that is not backed up and is dropped when a day gets a new row. The index the contract asked for, `[lang+item]`, cannot index an object: rows carry the item as a string (`itemKey`). One row per **card**, not per exercise, is what Ludus gives for now (its cards are answered once, when they settle): finer rows are 6-5b.

## 2026-10-29 — 6-6: nothing generated is shown unchecked, and the label says only what was checked

`generateMaterial` makes a story or example sentences and checks them before they are kept: the answer must have its shape (a story without its translation is thrown away and asked for again), every word is looked up in the offline dictionary (words it doesn't know are flagged, not hidden: names are among them), and the level is measured as the share of running words beyond it from the frequency list. A text more than 12 % beyond its level is made again with the hard words named, at most three tries in all, and the best try is kept **with only the checks it passed**, so its label says "level not confirmed" rather than claiming it. Without the language pack on the device the dictionary and level checks are not claimed at all: the label says "words not checked". The result is kept in `generated` under a key of language, kind, level, topic and the learner's language, so the same request is never paid for twice; Report sets `reported` and the request is then made anew. **The model is injected**, so the tests fake it and no key is used; it has not been tried against a real provider. No screen asks for a story yet (6-6b), so no audit entry is ticked.

## 2026-10-29 — 6-1b: the dictionary goes to version 3, and the new fields are only what Wiktionary has

The plan listed fifteen things the language's half could say. A word's page already had labels, synonyms, antonyms, derived and related words, aspect and gender pairs, set phrases and easily confused words, so 6-1b added what was missing **and has a source**: syllables (Wiktionary's hyphenation points, kept only when they spell the word), homophones, cognates, what a word is made of (its affix and compound templates, including the `ety` tree form Spanish uses), and the word it comes from. Spanish has syllables for 66,000 words and German for 31,000; French has few and Arabic and Mandarin none, because Wiktionary doesn't. The new fields were cleaned before shipping after a sample showed noise: cognates only in languages Lingua has (not every dialect Wiktionary lists), homophones without region notes and romanisations ("ни (ni) (when unstressed)"), none for Mandarin (its list is only the traditional and simplified spelling of one word), no `-` placeholder as a root, no `<id:adverbial>` modifiers in parts. **The rebuilt files also differ from v2 in old fields:** kaikki.org refreshes its extract weekly, and about 7,400 etymologies were reworded by Wiktionary since v2 was built; the rest is identical. v2 files are replaced, as v1 was. What has no source (countable, irregular, separable, false friends, learner mistakes) is 6-1c, not guessed.

## 2026-10-29 — The word graph: the user's idea, planned as step 6-29 (not built)

The user, in their words: "In Thesaurus I was thinking of a graph view, like a beautiful, bookish, aesthetic web view, where you have an overview of your personal vocabulary/dictionary, like a second brain, kind of like Obsidian, but made for and specialised completely for languages. Add this to the plan, let Opus build and reason the plan." It became **6-29** (not a renumbering of 6-28, the check, which now needs it), taking over 6-20's short "Thesaurus › Map" bullet and all twenty entries of the audit's 13.2, so there is one map, not two. Opus (the advisor) reasoned the design: **shared things (a root, a theme, a text, a grammar topic) are hub nodes, not links between every pair of words**, which keeps edges linear and a 3,000-word graph light; the layout runs in a worker and is cached, so it opens at once; it is drawn on Canvas 2D with level of detail; the learner's record is drawn into it (opacity from how likely a word is remembered, a mark on persistent weak spots); the word opens as marginalia (the word's own page, reused). It needs Part A only, so it can run beside Part B. Its table (positions, saved views) is Dexie 46, outside the reserved numbers: a contract push first. The name ("Tela" or "Graph") is the user's to pick. Nothing is built yet.

## 2026-10-29 — 6-4b: Practice is one screen for every new kind, and a set that cannot be made does not open

The new kinds (matching games, correct the mistake, rewrite, what comes next, drag, present into past) do not each get a room: they run in one **session** (`features/exercise/ExerciseSession`) that any set of specs can play, started from **Practice** (`/thesaurus/practice`, Lingua+, linked from Ludus's menu). The sets are made from the learner's own words (their meaning, synonyms, antonyms, kind of word, example sentence, affixes, verb tables from the dictionary) and from Grammatica (items with their wrong forms), so what is offered depends on what the learner has: a set that has too little to be made says what it needs, and its address never opens as an empty lesson. **How it asks is the learner's** (the options at the top): hints, "how sure are you?", answers only at the end (no verdict after each one, then a list of all of them), and another example after a miss (a spare of the same kind, once). **"What comes next?" is made only from a verb's conjugation:** from a grammar table it asked for *hizo* after *fue, tuvo*, which is not a sequence. **"Present into past" is the plain indicative only**, forward: the first version offered the imperfect subjunctive into the present. A sentence rewritten with its mistake left in is one slip from the right sentence, so the sentence as shown is a `rejects` entry and never nearly right. An answer is taken once per exercise: a second Enter before the next one is drawn used to be graded against the previous one. **Not done, said plainly:** the old kinds were not moved into the engine (it would change nothing the learner sees and risks twenty-three screens), and the free sentence tasks have their screen (a model answer, "was yours as good?") but no data until 6-6b's generator makes the sentences.

## 2026-10-29 — 6-3b: kinds of card are a note's `template`, drawn from its own fields; a card without what its kind needs is a plain card

A note says what its cards ask (`template`) and keeps what that kind reads in `extra` (one line per item): a synonym card lists synonyms, a grammar card facts, a paragraph card a paragraph. `cardFaces` says what each face shows, and when the note lacks what the kind needs (a picture card with no picture, a paragraph without the word in it) the card is the plain one, never an empty one. The dictionary writes the fields on request (`fillFromEntry`) for the learner to edit; nothing is made automatically. Pictures are the learner's choice (a file, the clipboard, or a search of Wikimedia Commons, free licences only, kept with the card). A picture search inside the editor must not be a `<form>`: the editor is one, and Enter there saved the whole card. Where a word's two directions come, a card of the same note never comes within three places of its sibling.

## 2026-10-29 — 6-6b: sentence tasks and dialogues are made when started, by the same checked pipeline

The sentence tasks (passive, reported speech, question, combine, expand, simplify) and the dialogue with a line missing need sentences made to order, so Practice makes them when the learner starts a set: `generateMaterial` with a new kind (`rewrites` for a task, `dialogue`), kept in `generated` under a key that includes the task so each task has its own. A rewrite is accepted only with the right number of sentences to start from (two for "combine", one for the others) and an answer different from what it starts from; a dialogue only with four lines or more between two people. Their words are looked up and their level measured as for stories. The free answer is judged by Max when it works and rated by the learner when it does not (the engine's self-rating), so a failed judgement never loses the answer. These sets need Lingua+ Max and a key, and say so; **none of it has run against a real provider**.

## 2026-10-29 — 6-12 W1: writing tasks use the existing journal

Twenty-six hand-written briefs sit beside free writing. The brief, suggested length and any material the learner supplies are saved as the entry prompt; an optional task id keeps the length target available without a table or migration. Length is guidance, never a limit. The optional timer counts elapsed time until paused and resets when the editor is left; existing activity tracking still measures writing separately. Picture tasks ask the learner to choose a picture they can see; no image picker was built (F0617 stays unticked).

## 2026-10-29 — 6-12 W2: local measures describe the draft, not its CEFR level

The journal uses the existing language-aware tokenizer to count different word forms, words per sentence and sentences over 20 words. Diversity is the type/token ratio, explicitly sensitive to text length; sentence length is only a proxy for complexity. Neither is a grade. A portfolio marker lives on the existing journal row, carrying the study level when kept and the learner’s topic. Its table compares current drafts by date, topic, kind and measures; it is not a snapshot, and removing a marker keeps the entry. No new table or migration.

## 2026-10-29 — 6-12 W3: dictionary help stays on the device

Diarium reuses the reader’s WordForms with the installed pack’s form-to-lemma lookup. Full-dictionary entries supply synonyms and collocations only when present; none are generated. Selection and pointer look-up feed the same side panel, with a typed field for keyboard access. Seven hand-written phrase functions cover the core six languages. A dedicated Hunspell spellchecker is left out: no Hunspell engine/dictionary is already installed, and this slice adds no dependency.

## 2026-10-29 — 6-12 W4: feedback extends the existing review, and corrections become evidence

The same AI request now asks for optional, quoted phrasing suggestions and four rubric criteria assessed against the saved task brief and length. Suggestions whose quotes are absent are discarded; scores outside 0–4 are discarded. The writer still chooses whether to adopt the existing corrected text. The model is injected for fake-model tests; no real provider was tried. Saving the review and its correction evidence is one transaction, with stable ids preventing duplicate rows for the same review. Evidence groups corrections by category, as writing patterns; it records suggested mistakes, not proof that a learner mastered a correction. No correct-answer row is inferred from silence.

## 2026-10-29 — 6-8 R1: optional reading aids keep the existing word engine

Study tools uses the house drawer so its nested deck picker stays open. Category colours use the dictionary’s first sense (explicitly not contextual syntax); changed suffixes are shown only where a dictionary form and word share at least two letters. Interlinear glosses are attributes drawn by CSS, keeping the word’s DOM text intact for phrase selection; revealing a sentence recalculates pagination. The ruler’s position is adjustable with a range input. Exact quote/offset highlights and notes live on the existing Text row, are saved in a transaction, and stop painting if the source changes. This avoids a new table; backups/sync retain the text’s newest-wins policy rather than merging each mark. Highlight removal has Undo. A highlighted passage becomes a card only after the learner supplies a meaning and chooses a deck. Tools reset when leaving the reader; saved marks remain.

## 2026-10-29 — 6-8 R2: a Graded shelf is measured, source results are not

Codex’s Graded tab reuses TextStats (the existing frequency-based level estimate and Known-or-Learning share), keeping manual levels separate. Without local frequency data it shows unmeasured; topic and kind are optional learner labels on the existing text row. The pure filter excludes other languages, deleted texts and shelf-only entries. Open-edition searches reuse Wikisource and Gutenberg, with translated search starting points for the core six languages, and run only when requested. An edition is imported only after Add this edition; its measured level is not promised before import. No corpus is bundled, and no source is scraped wholesale.

## 2026-10-29 — 6-7 G1: grammar browsing, plain-language search, prerequisites and notes

Topics can now be browsed by grammatical category and part of speech as well as level. Plain-language search maps natural queries ('when do I use the subjunctive', 'past tense') with synonym expansion and token weighting against titles, tags, summaries, rule text, and example focus forms. Hand-crafted prerequisites and fallback foundation ordering provide 'Before this: …' guidance with visual indicators of learned status. Personal bookmarks and notebook notes are stored in settings without a new database table or schema migration, so they integrate into local-first backups and survive restarts.

## 2026-10-29 — 6-7 G2: richer pages with in-language reading, exceptions and pairs

Grammar rules now support target-language and side-by-side reading, allowing learners to study explanations in the language itself or dual-column. Topics in the core six languages (Spanish, French, German, Italian, Russian, Chinese) gain structured exceptions, formality contrasts (formal/informal pairings), right/wrong slip prevention cards with explicit grammatical rationales, regional variation notes, and contextual cross-references.

## 2026-10-29 — 6-7 G3: fine-line pictures that explain and endings coloured on stems

Visual representations follow the handbook Part One principles: one fine line (stroke-width 1.3, round caps and joins, ink-soft currentColor with terracotta accent highlights). `TenseTimeline` renders past/now/future coordinates with interval brackets and clickable examples; `WordOrderVisualizer` maps sequential syntactic slots with optional badges and highlight borders; `GrammarDecisionTree` guides learners through interactive branching choices (ser vs estar, which past, accusative vs dative, verb aspect); `SentenceStructureDiagram` maps clause constituents and roles; and `MorphologyBreakdownView` dissects complex words into prefix, stem, and endings. Reference tables across all core languages now colour endings distinctly on stems using markdown bold formatting and styled cell rendering.

## 2026-10-29 — 6-7 G4: interactive topic map, prerequisite DAG and error heatmap

Grammatica gains an interactive topic map tab. Topics are arranged in tiered CEFR columns (A1 through C1) connected by directed prerequisite edges drawn with fine-line cubic bezier curves and arrowheads. Nodes clearly distinguish learned topics (filled in sage with checkmarks), current/next topics (accent border), and unstarted topics. Clicking any node inspects its summary, met and missing prerequisites, unlocked dependent topics, and direct lesson navigation. An error heatmap overlay highlights trouble spots using exercise lapse counts and learner weak spots, visually cueing areas that need review. No general graph engine was added (preserving 6-29 for Opus).

## 2026-10-29 — 6-7 G5: sentence explainer with device forms and AI syntax

The Sentence Explainer analyzes any pasted or selected sentence. On the device, tokenization, lemma identification, inflectional endings extraction and basic clause division work completely offline using local dictionary forms (`db.dictForms`). When Max is connected (or tested via injected model), Universal Dependencies roles (Subject, Predicate Verb, Direct Object, etc.), fine-line SVG dependency arcs, subordinate clause explanations, and alternative grammatically valid interpretations are merged seamlessly. When no key is set, the offline form-and-ending breakdown is presented with a clear notice that Max is needed for syntax arcs and roles.

## 2026-10-29 — 6-13 T1: translation practice sets, literal contrasts, and requirement checks

A dedicated Translation Practice suite is mounted at `/thesaurus/translate/:set?` using the exercise engine contracts (`buildTranslationExercise` in `src/core/exercise/translate.ts`). Translation sets cover English paired with all six core languages (Spanish, French, German, Italian, Russian, Chinese) across sentences, dialogues, paragraphs, idioms, slang, and formal correspondence. Exercises feature tiered hint reveals, side-by-side literal vs. natural comparisons, accepted alternative variations (checked offline via `judge`), and constraint validation requiring specific vocabulary words or grammatical constructions. Learners can also translate arbitrary custom passages with live metrics and log completed attempts to the learner evidence log (`recordEvidence`).

## 2026-10-29 — 6-13 T2: translation views (alignment, back-translation, sentence rebuild)

Four specialized translation views are integrated into `/thesaurus/translate`:
1. `AlignmentView`: Interactive token-level alignment between English and core languages (Spanish pro-drop subjunctive, French modal structures, German V2 subject inversion, Italian piacere syntax and postpositive adjectives, Russian existential possession, Chinese pre-verbal adverbial sequencing) with fine-line visual mapping and structural shift notes.
2. `BackTranslationView`: Guided three-stage workflow (Forward translation into target -> Blind back-translation into English -> Lexical drift analysis) calculating semantic preservation and nuance loss.
3. `ReconstructView`: Two-stage cognitive reconstruction where the learner first translates into the target language, then rebuilds the hidden original English sentence by clicking scrambled word tiles in exact order.
4. Reference comparison: Post-answer review juxtaposes the learner's answer against canonical and regional/stylistic reference translations.




