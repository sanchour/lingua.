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
