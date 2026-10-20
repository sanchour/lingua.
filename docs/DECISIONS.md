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
- **Downloaded on request, stored in IndexedDB.** At 2–13 MB a language the files are too big to
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

