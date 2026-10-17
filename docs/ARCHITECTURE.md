# Lingua — Architecture

Lingua is a local-first language-learning studio for polyglots: a deep reader (LingQ / Apple Books),
a hybrid spaced-repetition vocabulary system (Anki / Duolingo), audio/video immersion
(LanguageTransfer / Spotify), a corrected writing journal, and a personal overview of every language
you speak. One codebase installs as a PWA on **Windows desktop** (Edge/Chrome "Install app") and
**iPhone** (Safari "Add to Home Screen").

Every phase starts by reading this file, `FEATURES.md`, `DECISIONS.md` and `PERFORMANCE.md`.

## Product map

| # | Section | Contains | Desktop | iPhone |
|---|---------|----------|---------|--------|
| 1 | **Home** | Streak, continue reading/listening, daily review queue, language overview strip | sidebar | tab bar |
| 2 | **Codex** | *Library* (reader + word engine) · *Diarium* (writing journal with AI corrections) | sidebar | tab bar |
| 3 | **Thesaurus** | Folders, decks, Classic Recall (FSRS) + Ludus exercises | sidebar | tab bar |
| 4 | **Sonus** | Audio player, karaoke transcripts, commute mode, Spotify links | sidebar | tab bar |
| 5 | **Cantus** | Songs: Apple catalogue search, LRCLIB lyrics that follow the music (YouTube, Spotify, or a timer), translation per line, song games, Spotify liked songs, weekly charts | sidebar | tab bar |
| 6 | **Visio** | Dual-subtitle video player, dialogue mining | sidebar | tab bar |
| 7 | **Ratio** | *Overview* (statistics) · *Tabula* (capabilities table) · *Iter* (journey) | sidebar | header button |
| 8 | **Ordo** | Settings in groups with a search: reading, study, listening, music, languages, look, AI keys, your data, about | sidebar | header button |

**Languages with full support from the start:** English, Spanish, Russian, Portuguese, French, Greek,
German, Italian, Swedish, Hungarian. Each gets an offline dictionary pack (instant translations into
**English**; for English itself, English definitions), a frequency list and starter decks, and
script-aware text handling. The interface itself is in English.

Feature specifications for statistics, Diarium, Tabula and Iter: [`FEATURES.md`](FEATURES.md).

## Stack

Vite · React 19 · TypeScript 7 · Tailwind CSS 4 (CSS-variable tokens) · Motion (`motion/react`) ·
Lucide · Dexie 4 + `dexie-react-hooks` · Zustand (ephemeral UI state) · React Router · vite-plugin-pwa
(Workbox) · `@floating-ui/react-dom` · JSZip · Fontsource (self-hosted fonts) · `ts-fsrs` ·
Vitest + fake-indexeddb. Later phases add sql.js + fzstd (`.apkg`) and `@huggingface/transformers` (lazy).

No backend. Every external API (MyMemory, Lingva, Groq, Gemini) is called from the browser with the
user's own key; keys never leave the device. No Supabase: devices exchange data through backup files.

## Layers

```
app/        shells (desktop / touch / immersive), router, onboarding, boot
features/   one folder per section; pages + use*Controller hooks;
            views/desktop + views/touch only where the interaction differs
design/     tokens, motion presets, fonts, primitives, layout hooks
state/      Zustand stores for ephemeral session state (never the source of truth)
services/   side effects: storage, files, perf, packs, translate, llm, transcribe, audio
data/       Dexie schema, row types, settings, repositories, backup I/O, activity log
core/       pure TypeScript: text, languages, parsers, backup merge, srs, ludus, diff, stats
workers/    off-main-thread work: pack install, archive parsing
```

Dependencies point downward only. Features never touch Dexie tables directly; they go through
`data/` functions and hooks. `core/` imports nothing from React or the DOM and is unit-tested.

### Platform adaptation (two independent axes)

- **Layout** — `wide` (≥1024 px) renders `DesktopShell` (collapsible 7-item sidebar, multi-pane
  workspaces); `compact` renders `TouchShell` (floating 5-tab bar, large-title header with Ratio/Ordo).
  The reader runs in an **immersive shell** (no sidebar or tab bar) on both.
- **Pointer** — `fine` (mouse, hover) vs `coarse` (touch). Chooses hover-tooltips vs tap/long-press,
  independently of layout, so touch laptops and iPads behave correctly.

Both come from `design/hooks/useLayout.ts`.

## Data

Source of truth: IndexedDB via Dexie, database `lingua`. Exact row types live in
[`src/data/types.ts`](../src/data/types.ts); table indexes in [`src/data/db.ts`](../src/data/db.ts).
New tables are added with a new Dexie version (non-destructive; existing data is untouched).

| Area | Tables | Since |
|------|--------|-------|
| Profile | `languages` (one row per studied language), `settings` (key → value) | v1 |
| Codex | `texts`, `chapters`, `readingProgress`, `textVocab` | v1 / v2 |
| Word engine | `words`, `frequency`, `dictForms`, `dictEntries`, `dictPacks`, `translationCache`, `llmCache` · `dictParadigms` (inflection tables per lemma) | v1 / v5 |
| Thesaurus | `folders`, `decks`, `notes`, `cards`, `reviewLogs` | v1 |
| Sonus / Visio | `media`, `transcripts`, `playbackProgress`, `blobs` · `feeds` (podcast subscriptions; episodes stay in the feed row) | v1 / v4 |
| Activity | `sessions`, `dailyStats` | v1 |
| Language packs (Phase 3) | `dictExamples` (usage examples per lemma), `starterLists` (frequency-ranked lemmas, themed lists) | v3 |
| Diarium | `journalEntries` (text, prompt, versions, AI review) | v6 |
| Tabula / Iter | `capabilities`, `journeyEvents` (milestones + moments), `studyLogs`, `goals` | v6 |
| Cantus | `songs` (catalogue facts, lyric lines with times, translation, colours, saved / played) | v7 |

Conventions: ids are `crypto.randomUUID()` (except deterministic ids like `words.id = "ru:слово"`);
times are epoch ms; indexed booleans are `0 | 1`; user-owned rows carry `createdAt`, `updatedAt`,
`deletedAt?` so backups can merge (and cloud sync could be added later without schema changes).

**Activity is recorded from Phase 2 onward** (`sessions` + `dailyStats`), so by the time the Ratio
dashboards arrive in Phase 6 they already have months of history.

### Behaviour rules

- **Word cycle** (desktop click): `0 Unseen → 2 Learning → 1 Known → 0` (one click learning, two known).
  Becoming Learning creates a note + card in the language's "Mined" deck with the sentence as context.
  Reset deletes a never-reviewed card, otherwise suspends it. A card maturing (interval ≥ 21 days)
  auto-promotes its word to Known (toggle). Words are tracked per surface form; Ratio also groups lemmas.
- **Starter frequency decks** are non-overlapping rank bands (1–100, 101–200, 201–250, 251–500,
  501–1000, 1001–2000, 2001–5000, 5001–10000) shown as a cumulative milestone path. Cards are only
  created when a deck is activated.
- **Proficiency seeding** (optional): once the language pack is installed, pre-mark the top-N frequency
  forms as Known (A1 100 · A2 500 · B1 1000 · B2 2000 · C1 5000). See `core/lang/levels.ts`.
- **Ludus scheduling**: answers on *due* cards update FSRS (correct first try → Good, after retry →
  Hard, wrong → Again); practice on not-yet-due cards is logged without rescheduling.
- **Backup merge**: newest `updatedAt` wins per row and tombstones propagate; logs/sessions are
  unioned; chapters/blobs/caches are insert-if-missing; device-local settings (`apiKeys`, `ui`, `meta`)
  are never overwritten. Per-table policies live in `data/backup.ts`; the pure merge in `core/backup/merge.ts`.

### Language packs

Built offline by `scripts/lang-data` from Kaikki.org (Wiktionary, CC BY-SA) and FrequencyWords
(OpenSubtitles 2018, CC BY-SA 4.0), one gzipped JSON file per language in `public/packs/`. A pack
holds the frequency list, every common word form mapped to its lemma(s) with a short English gloss,
and full entries (senses, IPA, gender, inflections) for those lemmas. Since v2 it also carries the
10,000 most frequent lemmas (forms counted together, for the Top-N decks), short usage examples with
translations and cloze spans, and the 14 themed lists (`themes.ts` picks each concept's translation
from English Wiktionary's translation tables; `build.ts` checks it against the language's own
dictionary). Raising `PACK_VERSION` makes installed packs refresh themselves quietly. Installed into IndexedDB by a
Web Worker on first use; managed in Ordo → Languages.

### Translation tiers

```
open chapter → tokenize (Intl.Segmenter) → unique normalised forms
             → one bulkGet over words + dictForms + translationCache → in-memory glossMap
hover / tap  → glossMap.get(norm) → single shared tooltip   (≈1 ms, no network, no re-render)
miss         → shimmer → MyMemory → Lingva (queued, deduplicated) → cache + glossMap
drawer       → LLM (Groq or Gemini, model chosen from the provider's live list) → JSON → llmCache
```

### Reader rendering (60 fps rules applied)

- Chapters are stored in parts of ≤ ~2,500 words so a page renders in one frame.
- Word spans carry `data-n` (normalised form); one delegated listener per chapter.
- Word-state changes update span classes directly (no React render); Dexie is written afterwards.
- The hover tooltip is a single always-mounted element moved with `transform`.
- Paged mode uses CSS columns (two-page spread on wide screens) and page turns are transform springs.

### Text normalisation

`core/text/normalize.ts`:
- NFC, locale-aware lowercase (`toLocaleLowerCase(lang)`), curly apostrophes → `'`.
- **Russian**: strip combining stress marks (U+0301, U+0300) used in learner texts; `ё` is kept
  distinct (все ≠ всё); dictionary lookup also tries the `е` spelling.
- **Greek**: tonos is meaningful (πότε ≠ ποτέ) and kept; final sigma handled by lowercase rules;
  `foldKey()` gives an accent-free fallback key for ALL-CAPS text that drops tonos.
- **Hungarian**: agglutinative, so many suffixed forms are not in the pack; misses use the online
  fallback and are cached.

## Folder layout

```
lingua/
├─ docs/                 ARCHITECTURE · FEATURES · DECISIONS · PERFORMANCE · QA-ios · DEPLOY
├─ scripts/lang-data/    Node tools: fetch sources, build dictionary + frequency packs
├─ public/               logo.svg (icons + iOS splash screens are generated from it), packs/
├─ .github/workflows/    deploy.yml (GitHub Pages)
└─ src/
   ├─ main.tsx · app/ (router, Root, sections, shells/{desktop,touch}, onboarding/)
   ├─ core/              text/ · lang/ · backup/ · parsers/ (+ srs/ ludus/ diff/ stats/ later)
   ├─ data/              db · types · settings · languages · backup · activity · library · words
   ├─ services/          storage/ · files/ · perf/ · packs/ · translate/ · llm/ (+ transcribe/ audio/)
   ├─ workers/           packs.worker.ts
   ├─ state/             ui.ts · reader.ts (+ player/ study/ visio later)
   ├─ design/            tokens.css · motion.ts · fonts.ts · primitives/ · hooks/
   ├─ features/          home/ codex/ thesaurus/ sonus/ visio/ ratio/ ordo/ lab/
   └─ test/              setup.ts
```

## Phases

1. **Foundation** ✅ — scaffold, PWA, design system, shells, Dexie schema, onboarding, Ordo
   (appearance, reading preview, languages, storage, backup/restore), device lab + FPS monitor.
2. **Codex** ✅ — language packs for all ten languages, importers (paste, txt, epub, Goodreads CSV),
   library with shelves and comprehension %, immersive reader (page-flip spread + scroll), word
   engine, Tier-1 + Tier-2 translation, word drawer, AI settings, activity recording, real streak,
   daily reading-goal ring on Home.
3. **Thesaurus** ✅ — folders/decks/editor, Classic Recall (ts-fsrs, 3D flip), Ludus (multiple choice,
   match pairs, cloze, word-bank sentences, typing, speaking; the device-voice listening was removed
   in 2.0), CSV + `.apkg` import,
   starter library (frequency bands + 14 themed categories) for all ten languages, Home review queue,
   review statistics recording.
4. **Sonus** ✅ — one audio engine outside React (lock screen via Media Session, sentence repeats,
   resume), audio files with ID3 tags, podcasts (Apple directory search, RSS, streaming, offline
   downloads), transcripts (SRT/VTT/plain text, Whisper on Groq with word timings, long MP3s split at
   frame boundaries), karaoke view with Codex word lookups, Open in Codex, commute mode, mini player,
   Spotify links and embeds (transcripts follow via the iFrame API), listening statistics. Local
   Whisper came with step 7.
5. **Diarium** ✅ (Visio moved to the next step) — the writing journal: daily prompts (AI or
   curated, ten languages), autosaving editor, AI check with corrections, scores and a CEFR
   estimate, word diff with explanations, corrected and native-like versions, corrections to a
   Journal deck, writing time and words in the statistics.
6. **Ratio + Tabula + Iter + polish** ✅ — statistics dashboards across all activities and
   languages (hand-drawn SVG charts), the polyglot capabilities table (Notion CSV import, drag to
   reorder, image export), the journey (milestones found in history, moments with photos, goals
   with honest projections, yearly reading challenge, study log, level history), Goodreads CSV
   export, reset of one language or of everything, an adaptive icon, self-updating installs and
   an accessibility/overflow pass.
7. **Visio + Whisper + Home** ✅ — the screening room: videos from files or links (poster frames,
   subtitles paired by file name, "subtitles only" to free space), two subtitle tracks from SRT/VTT,
   Whisper or an AI translation, a player whose subtitles work like Codex text (hover, tap, mark,
   drawer), auto-pause, line stepping and repeats, speed, sync, full screen (with `<track>`s for the
   iPhone's own player), the transcript beside it, "Save line" cards that replay their clip, and
   watching time. Whisper on this device (transformers.js in a worker: WebGPU or WebAssembly,
   tiny/base/small, cached after the first download) beside Whisper on Groq, which now also takes
   videos and any format as 16 kHz WAV parts. Home at a glance: today's goal and next steps, the
   week, honest numbers, the latest milestone and a first-steps list.

**Lingua 2.0** (after the six phases): ten more languages, learning through music, Grammatica (the
grammar section, planned in [`GRAMMAR-PLAN.md`](GRAMMAR-PLAN.md)), foreign radio, recommendations
and streaming-service integration in Visio.
