# Lingua 5.1 · the plan

**Status (2026-10-20): planned, nothing built.** The user pasted the first half of the Lingua 5 list
("Lingua 5.1") and asked for a very careful plan before any building. This file is that plan. The
roadmap has a short entry under "## Lingua 5" that points here and ticks the steps as they finish.

Read first: [CLAUDE.md](../CLAUDE.md) (desktop first, the check, commit as sanchour) and the
"## Lingua 4.0" part of [ROADMAP.md](ROADMAP.md), which 5.1 overlaps.

---

## 0. Decisions the user makes before the build

Each has a recommendation, which the build follows unless the user says otherwise.

| # | Question | Recommendation |
| --- | --- | --- |
| D1 | **Who takes the payments?** The app has no server. | A *merchant of record* (Paddle or Lemon Squeezy): it sells in the user's name, handles EU VAT and receipts, and gives licence keys the app can check without a server of its own. Stripe needs our own VAT handling and a server. The user creates the account (sessions never create accounts). |
| D2 | **What is Max?** | **AI without a key.** Lingua runs a small server (a Cloudflare Worker) that holds Lingua's own AI keys, checks the Max licence and keeps a fair-use limit. Your own key keeps working for Lingua+ members, so nothing is taken away. The other reading, "AI features with your own key, monthly", is hard to justify to a buyer. |
| D3 | **Max price.** The user said 6.99/month or a price I propose. | **€5.99 a month or €49.99 a year** (about 30% off). Well below the big apps' AI tiers, and the fair-use limit keeps the AI cost a small part of it. The real cost per user is measured in the test phase before launch. |
| D4 | **Free or Lingua+ for the rooms the list doesn't name** (Visio, Mundus, Sermo, Diarium, Grammatica, Alphabets, Typing). | The table in 5.1-2. In short: reading, words, listening and your own guide stay free; practice games, the course, music, streaming and AI with your key are Lingua+. |
| D5 | **5.1 and Lingua 4.0.** 4.0-2 … 4.0-5 are still open in another session. | Build 5.1 now, beside 4.0. 5.1-1 (the new room order) goes first and is pushed quickly, because every session builds on it. **5.1's Codex step is done together with 4.0-2** (they change the same files). Cursus's course tab is filled by 4.0-4. |
| D6 | **The phone's tab bar** fits five rooms; the new order has six before Ratio and Ordo. | Home, Cursus, Codex, Thesaurus, Sonus et Visio on the bar; Mentis, Ratio and Ordo in the top bar's menu. The desktop sidebar has all eight. |

Not a question: Lingua+ drops from the placeholder's 29.99 to **€24.99, once, with every update**, as
the user said.

---

## 1. How 5.1 fits what is already planned

- **Lingua 4.0-1 (done)** made the tiers, the 35 placeholder languages, the language map with dots
  and the Lingua+ placeholder (`data/plus.ts`, `meta.plusAt`, Ordo › Lingua+, the raised "+").
  5.1 reworks the map (5.1-3) and turns the placeholder into real plans (5.1-2).
- **4.0-2 (next, another session)**: Codex's Add tabs (Write or paste · Import a book · Import a
  comic · News & links · Goodreads), the one-screen word drawer, the end page, one memory per word,
  gap sentences. 5.1's Codex list touches the same screens, so **5.1-5 is built inside 4.0-2**:
  whichever session starts it does both lists, and ticks both.
- **4.0-3** (Cantus games, karaoke, Visio streaming) builds on the Sonus et Visio room of 5.1-1:
  5.1-1 goes first so 4.0-3 doesn't build on pages that are about to move.
- **4.0-4 (Cursus, the course)**: 5.1-1 makes the Cursus room and its tabs; 4.0-4 fills the Course
  tab. Until then the tab says the course is coming (tier 1 only).
- **3.0-8 parts 5–6 (alphabets and writing, another account)** land in Cursus › Alphabets. 5.1-1
  only moves routes and adds redirects, so part 5 can be written against either address.
- **"Sonus+"** today is the Cantus room at `/cantus` (Today, Music, Podcasts, dark design). The list
  makes it part of Lingua+. It keeps its address and look; Sonus et Visio links to it.

---

## 2. The order, and what can run at the same time

| Step | What | Size | Waits for |
| --- | --- | --- | --- |
| 5.1-1 | Rooms in the new order: Cursus, Sonus et Visio, Mentis; system light; Mundus lines removed | L | — |
| 5.1-2 | Lingua+ and Lingua+ Max | L | D1–D4 |
| 5.1-3 | Onboarding, the map and its data, the flags | L | 5.1-2 (the plans screen) |
| 5.1-4 | Home | M | 5.1-1 |
| 5.1-5 | Codex (inside 4.0-2) | L | 4.0-2 starting |
| 5.1-6 | Thesaurus and Ludus | L | — |
| 5.1-7 | Sound: good pronunciation without a key | M | — |
| 5.1-8 | Keyboard practice (Cursus › Typing) | M | 5.1-1 |
| 5.1-9 | A touch of the language in the design | M | 5.1-1 |
| 5.1-10 | 5.1 complete: the full check | S | all |

**In parallel:** after 5.1-1 is pushed, 5.1-6, 5.1-7 and 5.1-8 touch separate files and can each run
in a session of their own. 5.1-2 → 5.1-3 → 5.1-4 run in order in the main session. 5.1-9 last of the
design work, since it touches every room lightly.

---

## 3. The steps

Every step ends with the usual check (CLAUDE.md): typecheck, tests, build, the browser at desktop
width first (1280 and 1440) and then a phone (375), light and dark; the docs it touches; commit,
rebase onto `origin/main`, push, the Pages deploy. Each "Done when" is checked in the browser, not
assumed.

### 5.1-1 · Rooms in the new order: Cursus, Sonus et Visio, Mentis

**The user's points**
- [ ] Sidebar order: Home, Cursus, Codex, Thesaurus, Sonus et Visio, Mentis, Ratio, Ordo (Settings).
- [ ] Cursus holds Grammatica and Alphabets (and the course).
- [ ] Sonus and Visio become one room with a clear, overseeable layout: one big, aesthetic library with two add buttons.
- [ ] Mentis, a new room: Mundus, Sermo (Colloquium renamed) and Diarium, combined smartly.
- [ ] Standard light: follow the device's light or dark on first start.
- [ ] Remove the "Ideas from Mundus" lines everywhere.

**Navigation**
- `app/sections.ts`: `SectionId` becomes `home | cursus | codex | thesaurus | sonus | mentis | ratio
  | ordo` in that order. Alt+1…8 follow it (the shortcut dialog updates itself from the list).
- Icons: Cursus a path or graduation mark (`Route` or `GraduationCap`), Sonus et Visio a combined
  mark (headphones over a frame; drawn like the deck icon if lucide has nothing fitting), Mentis a
  thought or lantern (`Lamp`/`Sparkle`, chosen when drawn).
- Phone bar (D6): Home, Cursus, Codex, Thesaurus, Sonus et Visio. The label "Sonus et Visio" is
  checked at 375 px; if it doesn't fit, the bar says "Sonus · Visio" in two lines.
- **Every old address keeps working** with a redirect: `/grammatica/*` → `/cursus/grammatica/*`,
  `/visio` → `/sonus?show=watch`, `/visio?tab=services` → `/sonus?tab=streaming`, `/mundus/*` →
  `/mentis/*`, `/colloquium/*` → `/mentis/sermo/*`, `/codex?tab=diarium` → `/mentis/diarium`,
  `/codex/diarium/:id` → `/mentis/diarium/:id`. Players and detail pages keep their addresses
  (`/sonus/play/…`, `/visio/watch/…`, `/cantus/*`) so links in notes and other sessions' work hold.
- Code folders keep their names (`features/colloquium`, `features/visio`…) to avoid clashing with
  the sessions working in them; ARCHITECTURE.md lists which folder is which room.

**Cursus** (`/cursus`): desktop tab strip like Mundus's (with 1–4 key hints), Segmented on a phone.
- Tabs: **Course** (4.0-4; until then a short "coming to the six core languages" page, and hidden
  for other tiers), **Grammatica** (today's room, unchanged inside), **Alphabets** (3.0-8 part 5;
  shown where the language has a script to learn), **Typing** (5.1-8, tier 1).
- The room opens on the tab you used last; first time, Course for tier 1, Grammatica otherwise.

**Sonus et Visio** (`/sonus`): one library for everything you listen to and watch.
- Header: the title, then two add buttons side by side: **+ Listen** (podcast, audiobook, audio
  file, Spotify link, radio station) and **+ Watch** (video file, YouTube or video link, subtitles).
  They are today's AddMenu and AddVideoMenu, restyled as a pair.
- Tabs: **Library** · **Audiobooks** · **Radio** · **Streaming** (Visio › Services today), and a
  **Sonus+** card at the end of the strip opening `/cantus` (Lingua+).
- Library, top to bottom:
  1. A filter: **All · Listen · Watch** (remembered).
  2. **Continue**: one row of what's half-finished, audio and video together, with progress.
  3. **Categories** with counts, as today's Sonus library: Songs, Podcasts, Episodes, Audiobooks,
     Stations, Your audio, and now **Films & series** and **Videos**. Six across on desktop.
  4. Shelves: Recently played, Recently added (a grid of every kind), New episodes, To watch.
  Every tile uses the real artwork (covers, posters, artwork; `Art` and `Poster` as today).
- On desktop the filter and the categories sit in a sticky rail on the left of the library
  (Apple Music's layout), the shelves on the right; on a phone they stack.
- Empty state: one calm card with the two add buttons and a line on what each brings.

**Mentis** (`/mentis`): the room for thinking in the language: the guide, talking and writing.
- Tabs: **Mundus** (the guide, as built in 3.0-7, with its Explore, Picks and Try views as
  sub-tabs) · **Sermo** (Colloquium, renamed everywhere the user sees it) · **Diarium** (moved out of
  Codex; Codex becomes reading only).
- **Combined smartly**, so the three help each other:
  - The guide's steps can now lead into Sermo ("Talk about *Lupin* for five minutes") and Diarium
    ("Write three lines about the chapter you read"). The guide gains a **speak** lane beside read,
    listen, watch, words and write (`core/mundus/guide.ts`, with tests).
  - On desktop a right rail on every Mentis tab holds **Today's prompt**: one writing prompt and one
    conversation starter at your level, chosen by the guide from what you read and watched this week.
  - A Sermo conversation can be **kept as a Diarium entry** (the learner's lines, corrected), and a
    Diarium entry has **"Talk about this"**, which opens Sermo with it.
- Mundus's Home card stays on Home (5.1-4).

**System light**
- New installs start with `theme: 'system'` (the setting already exists): the app follows the
  device until the learner picks a light. Existing installs keep their choice. The onboarding's
  study-light screen (5.1-3) starts on "Follow my device".

**Mundus lines removed**
- `features/mundus/MundusLink.tsx` and its five uses (Codex, Thesaurus, Sonus library and its empty
  state, Visio and its empty state) are deleted. Mundus stays reachable from the sidebar, Home's
  card and Alt+6.

**Tests:** the redirects (a table test over the old addresses), section order, guide's speak lane.
**Done when:** every room opens from the sidebar in the new order; every old address lands on the
right tab; Sonus et Visio shows audio and video in one library with both add buttons; Mentis shows
all three tabs with the prompt rail on desktop; a fresh profile follows the device's light.

---

### 5.1-2 · Lingua+ and Lingua+ Max

**The user's points**
- [ ] Free: unlimited decks; practising them, but not in Ludus; Discover decks; add anything to
  Thesaurus; Codex fully free; Sonus with audiobooks and radio.
- [ ] Lingua+: €24.99 once, updates for life. Sonus+, the courses and everything else.
- [ ] Lingua+ Max: monthly (D3). All AI: better translation, diary checking, automatic dictation.
- [ ] The plans screen in onboarding and in Ordo.
- [ ] Ordo: manage the subscription, or subscribe easily.
- [ ] Top left: "+" for Lingua+, "Max" for Max, with a fade, luxe effect in the theme's colours.

**What each plan has** (D4; the user's points in bold, my proposal for the rest in plain)

| | Free | Lingua+ · €24.99 once | Lingua+ Max · €5.99/month or €49.99/year |
| --- | --- | --- | --- |
| Codex | **Everything**: reading, lookups, imports, Discover, Goodreads | — | AI translation of sentences in context, Explain in context |
| Thesaurus | **Unlimited decks, flashcards, Discover, add anything** | **Ludus** | — |
| Sonus et Visio | **Library, audiobooks, radio**; your own audio and video | **Sonus+** (music, podcasts, song games); Visio's streaming services and subtitles | Automatic dictation: transcripts for audio and video without subtitles |
| Cursus | Alphabets | **The course**, Grammatica, Typing | Feedback on writing and speaking |
| Mentis | Mundus, Diarium (writing) | Sermo and AI features with your own key | **Diary checking**, Sermo without a key, natural AI voices |
| Ratio, Ordo | Everything | — | — |

- Max includes all of Lingua+ while it runs. Anyone who bought Lingua+ keeps it forever; Max on top
  costs the same.
- **Never pushy:** free rooms are never interrupted. A locked feature shows a small "+" chip; tapping
  it opens the plans sheet on the right plan. No countdowns, no nagging. "Continue free" is always as
  visible as the buy buttons.

**How it works**
- `data/plus.ts` becomes `data/plan.ts`: `type Plan = 'free' | 'plus' | 'max'`, kept as
  `meta.plan = { kind, since, until?, licence? }` (today's `meta.plusAt` is migrated to `plus`).
  One table `can(feature, plan)` and a `usePlan()` hook decide every lock, so the split above lives
  in one place and is easy to change.
- **Purchases (D1):** the provider's checkout opens in a browser window; it returns a licence key,
  which the app checks with the provider's licence endpoint (to be checked: that it allows calls
  from a browser; otherwise the Max server of D2 checks it). Lingua+ is checked once and kept.
  Max is checked on start, with 14 days' grace offline.
- **Max's server (D2):** `server/ai/` in this repo, a Cloudflare Worker: it receives the request
  and the licence, checks it, calls the AI with Lingua's key, counts usage against a fair limit.
  The app's AI calls (`services/translate`, Diarium review, Whisper/Groq, Gemini voices) get a third
  way besides "your key" and "none": "Max". Keys never travel in a URL (as now).
- **Until the user has set up the provider and the Worker**, everything ships in test mode:
  Ordo › Lab has "Pretend: Free / Lingua+ / Max" (replacing "Reset Lingua+"), and the buy buttons
  say they charge nothing.
- **Plans screen** (`features/plans/PlansPage.tsx`, used by onboarding and Ordo › Lingua+): three
  columns on desktop (Free, Lingua+ marked "Best value", Max), each a short list of what it adds,
  the price, one button. On a phone, three cards to swipe.
- **Ordo › Lingua+:** your plan, since when, the next renewal for Max; "Manage subscription" (the
  provider's customer page: change, cancel, invoices); "Restore with a licence key"; and for the
  free plan, the plans screen itself.
- **The badge:** beside the Lingua name in the sidebar and top bar, "+" for Lingua+ (as now) and a
  small-caps **MAX** for Max: filled with a fade from the palette's accent to its second tone, and
  a slow sheen that passes once when the app opens (an overlay moved with `transform`, as
  PERFORMANCE.md asks; none with reduced motion). It takes its colours from the current palette,
  so it fits every light.

**Tests:** `can()` over the whole table; the plan migration; licence states (valid, expired, offline
grace). **Done when:** each pretend plan locks and unlocks exactly the table; the plans screen and
Ordo › Lingua+ look right on desktop and phone, light and dark; the MAX badge fades in every palette.

---

### 5.1-3 · Onboarding

**The user's points**
- [ ] One or two minimal, bookish intro screens.
- [ ] A clean map without dots; another minimal way to show the languages. Countries with a language
  are clickable and show their main languages; countries without one can't be chosen.
- [ ] Accurate language data per country: official, regional, minority.
- [ ] Title: "Which language do you want to learn?"
- [ ] No long scrolling list: an organised, minimal overview.
- [ ] Remove "I already speak" (for now).
- [ ] Core: drop "Everything at its best"; say clearly and professionally what each tier includes.
- [ ] Better flags for Frisian, Punjabi, Serbo-Croatian, Catalan, Amharic, Esperanto, Old Norse,
  Maya, Sanskrit, Hawaiian, Basque, Māori.
- [ ] Level: more interactive and fun; a better "mark words as known" element and text.
- [ ] "What brings you here?": a more fun layout; a daily-time slider with checkpoints.
- [ ] New screen: "Which languages do you already speak?", adding them to Tabula, and saying so.
- [ ] "Choose your study light": every style and theme.
- [ ] Lingua+ and Lingua+ Max.

**The flow:** two intro pages (no step dots), then six steps with dots: Language · Level · You
speak · Goal · Study light · Plans. Back works everywhere; nothing is lost going back.

**Intro pages** (bookish, minimal, desktop-sized)
1. The Lingua mark, one line ("Learn a language by living in it: read, listen, watch, and keep every
   word"), a fine line drawing of an open book, **Begin**.
2. Three small vignettes in the same line style (a page you can tap, a deck of cards, headphones and
   a frame) with a few words each, **Choose a language**. The pages turn with a short page-turn
   (transform only, none with reduced motion).

**Language data** (accurate, from one source)
- A script `scripts/lang-data/territories.ts` reads Unicode CLDR's `territoryInfo` (the pinned
  `cldr-json` release: for each country its languages, share of speakers and official status:
  official, de facto official, official regional, official minority) and writes
  `src/data/territories.json` for Lingua's ~70 languages.
- Each language gets **where it is spoken**, sorted: Official · Regional · Recognised minority ·
  Widely spoken (no status, but at least 5% or a million speakers). A small hand file adds what CLDR
  can't hold: Latin (the Vatican), Ancient Greek, Old Norse and Sanskrit (historical regions, shown
  hatched), Esperanto (no country: chosen from the overview only).
- `flags` on each language today means both "which flag to draw" and "where it's spoken"; it is split
  into `emblem` (5.1-3's flags) and the territories above.
- Tests pin facts that must hold: Catalan official in Andorra and regional in Spain; Basque and
  Galician regional in Spain; Frisian regional in the Netherlands; Māori official in New Zealand;
  Hawaiian regional in the USA; Swahili in Kenya and Tanzania; Arabic's 20+ countries.

**The map** (`app/onboarding/LanguageMap.tsx`, reworked)
- No dots. Countries are drawn quietly; **only countries with a Lingua language react** to the
  pointer (others stay flat and can't be chosen).
- **Hovering a language** in the overview tints its countries: solid for official, lighter for
  regional, a fine hatch for minority and historical. Hovering a country lifts it and shows a small
  card with its main languages (official first); clicking it filters the overview to those.
- Tiny countries (Andorra, the Vatican, Malta…) get a larger invisible hit area.
- Same gestures as now (drag, ctrl and the wheel, two fingers, +/−/world).

**The overview, instead of a list** (title: "Which language do you want to learn?")
- Desktop: the map above, the overview below, all on one screen at 1280×800 without scrolling.
  Core: six cards in one row (flag, name, endonym, a sample line). Under it the other tiers as rows
  of small chips (emblem and name), each row headed by its tier and one line on what it includes.
  A search box filters everything. "Coming" languages are dimmed and say so on hover.
- Phone: the same rows, Core as a 2×3 grid, the map folded above (tap to open).
- **What each tier includes** (replacing "Everything at its best"; checked against what is really
  built at the time):
  - Core: "The full course, grammar lessons, alphabet and typing practice, a complete dictionary,
    natural voices, and every room."
  - Full: "Every room and grammar lessons. No course."
  - Partial (beta): "Reading with lookups, word packs and decks, podcasts, radio and music search.
    Built automatically."
  - Basics: "Reading with tap-to-translate, your own words and decks, radio and podcasts."
  - Experimental: "Reading with machine translation where it exists. Some rooms may not work."
- "I already speak" is removed from this page. The translation language (`native`) now comes from
  the "You speak" step, defaulting to the device's language.

**Flags** (`design/flags.tsx`; drawn by hand, accurate, same size and corner as the others)
| Language | Emblem |
| --- | --- |
| Catalan | the Senyera (four red stripes on gold) |
| Basque | the Ikurriña |
| Frisian | the Frisian flag (blue and white diagonals with red pompeblêden) |
| Esperanto | the Esperanto flag (green, a white canton with a green star) |
| Hawaiian | the flag of Hawaiʻi |
| Māori | the Tino Rangatiratanga flag |
| Amharic | Ethiopia's flag, redrawn accurately (the blue disc and star) |
| Punjabi | a script badge, ਪੰ (Gurmukhi), since it belongs to India and Pakistan |
| Serbo-Croatian | a script badge showing both alphabets, Š / Ћ, instead of four national flags |
| Sanskrit | a script badge, सं (Devanagari) |
| Old Norse | a script badge, a Younger Futhark rune ᚱ on parchment |
| Maya (Yucatec) | a badge with the Maya numeral bar-and-dots, in the same quiet style |
Script badges share one design: the glyph in the reading font on a soft paper square, so they sit
calmly beside real flags.

**Level** (more interactive)
- "How much can you read already?" Five short sentences in the language, one per level (A1 to C1,
  from the pack's sample sentences), stacked like lines on a page. You click the last one you
  understand; the ones above it ink in, the ones below fade. The level and a one-line description
  follow ("A2 · you can follow simple everyday sentences"). "I'm starting from zero" sits at the top.
- **Marking words as known**, reworded and shown: "Skip what you already know: start with the
  1,000 most common words marked as known." A small preview line shows a sentence whose common words
  turn from unseen to known as the switch is turned on. Under it: "You can unmark any word while
  reading." The number follows the level.

**What brings you here?**
- Reasons as six tiles in a 3×2 grid with line icons (Travel, Family & friends, Work, Culture,
  Study, Keeping sharp), several allowed, a tick and a lift when chosen.
- **Daily time slider** with checkpoints 5 · 10 · 15 · 20 · 30 · 45 · 60 minutes, snapping, with the
  names (A sip … Immersed) under the checkpoints and one live line above it: "About 7 hours a month".
  Keys ←/→ move between checkpoints.

**Which languages do you already speak?** (new)
- The device's language is ticked and marked native. Others are added from a search of all
  languages (not only Lingua's), each with a level chip (Native, C2 … A1).
- A line under it: "These go into Tabula, in Ratio, where you can add certificates later." They
  are written to the Tabula table on finish. The first native language becomes the translation
  language (changeable in Ordo, as now).

**Choose your study light**
- Every palette (`design/palettes`, light and dark) as a small preview of the app (a page with a
  word highlighted, a card), in two rows: Paper and Nocturne. On top, **Follow my device** (chosen by
  default, 5.1-1). Picking one changes the whole screen at once.

**Plans:** the plans screen of 5.1-2, with "Continue free" as clear as the rest.

**Tests:** territories facts; `completeOnboarding` with the new fields (`known`, `plan`); the level
sentences exist for every available language. **Done when:** a fresh profile goes through every page
on desktop and phone, light and dark, without scrolling on desktop's language page; hovering Spain
lists Spanish, Catalan, Basque, Galician; the twelve emblems look right next to real flags.

---

### 5.1-4 · Home

**The user's points**
- [ ] A top-right button to the Lingua+ plans, only for those without it.
- [ ] Today: an aesthetic time-goal tracker, and next up / recently opened from each room, minimal
  and one click to open.
- [ ] The weekly calendar as now (click opens Ratio).
- [ ] A Cursus card (next lesson, where you are).
- [ ] Mundus.
- [ ] Some basic numbers.
- [ ] Same feel: minimal, clean, bookish, calm. Easy to revert.

**Layout (desktop, a 12-column grid)**
1. Header: the greeting and date; top right a quiet **Lingua+** button (outlined, the "+" mark) for
   the free plan only. Today's PlusHomeCard goes.
2. **Today** (8 columns): the goal as a thin ring or a ribbon filling across a page, split by room in
   the rooms' tones, the minutes in serif numerals ("12 of 20 minutes"). Beside it **Next up**: at
   most five one-line rows, one per room that has something: the book you're reading and its page,
   cards due, the episode or film half-watched, the next Cursus lesson, the last Sermo chat or diary
   entry. Each row opens it in one click.
3. **This week** (4 columns): today's WeekCard as it is; clicking opens Ratio.
4. **Cursus** (6) and **Mundus** (6): the next lesson with the unit's progress; Mundus's card as now.
5. **Numbers**: one quiet row: streak, words known, minutes this week, cards due.
- Phone: the same order in one column.
- FirstSteps stays for a new learner, inside Today, until done.

**Easy to revert:** the current Home stays as `HomeClassic`; Ordo › Appearance gets "Home layout:
Today / Classic". One setting, no code removed until the user says the new one stays.

**Done when:** each row of Next up opens the right place; the tracker fills as minutes are logged;
Classic brings back today's Home exactly.

---

### 5.1-5 · Codex (built together with 4.0-2)

**The user's points**
- [ ] Optional comprehension questions at the end of each text, without AI.
- [ ] Add to your library: Write or paste · Import a book (EPUB, PDF, a folder of pages) · Import a
  comic · News & links · Goodreads. (The same tabs 4.0-2 plans.)
- [ ] Discover: the latest news and articles, comics and books, imported in one click.
- [ ] Goodreads as its own section: sorted, grouped, filtered.
- [ ] Faster, immediate sentence and word translation.
- [ ] Remove "Machine translation…" under translations.
- [ ] One click marks a word known, two clicks learning.
- [ ] Word panel: "+ Deck" on the right, level with the frequency and the pronunciation; a sound button.
- [ ] "In context" only with an AI key.
- [ ] More fun forms, still minimal.
- [ ] Codex "T": choose the style and colour of known, learning and unseen words.

**Questions at the end** (honest about what works without AI)
- On the end page (4.0-2), "Check yourself" (optional, folded): four or five items made from the
  text itself: a sentence from the text with a word missing (the word from your learning words
  first), "which word means…" from the dictionary, and putting a short sentence back in order.
  This checks words and sentences, not deep understanding; with Max or a key, real questions about
  the story are added. Answers count in Ratio like Ludus.

**Add to your library:** 4.0-2's five tabs. "A folder of pages" takes a folder of page photos or
scans: the pages are read with the on-device OCR the comics already use (`services/comics/ocr.ts`)
and become a text with the photos alongside. The forms get the "fun but minimal" pass: a large drop
area with a line drawing per kind, the cover appearing as soon as the file is read, one clear
button, the level picked on a small scale.

**Discover** (a tab beside Library, sources checked for CORS and licences when built):
news (the language's Wikipedia and Wikinews front pages, the existing news feeds), books (Project
Gutenberg via Gutendex and Wikisource by language; graded children's books from StoryWeaver and
African Storybook, CC BY), comics (Pepper&Carrot, CC BY, in many languages). Shelves with real
covers, one-click import into the library. Only free and legal sources: no new bestsellers.

**Goodreads section:** the imported shelves (read, currently reading, to read, and your own)
become a section of the library with sort (date added, date read, rating, author, title, year),
group (shelf, author, year read) and filter (shelf, rating, has an EPUB). Covers from Open Library
by ISBN. Each book: "Add the EPUB", and "Find a free edition" when it is in the public domain.
(Goodreads has had no public API since 2020; the CSV export stays the way in.)

**Faster translation**
- Words: the dictionary's meaning shows at once from the pack on the device; a better one replaces
  it if it arrives.
- Sentences: the page's sentences are translated **ahead of time** in the background while you read
  (a few at a time, idle time only, cached in a `translations` table by language and text), so a
  click shows the answer immediately. Requests start on pointer-down, not click. With a key, the
  fastest model streams its answer.
- The "Machine translation. Add an AI key…" line under the bubble is removed.

**Clicking words** (desktop)
- One click: **known**. A second click right after (a double click): **learning**. The first click
  applies at once (no waiting to see if a second follows); the second turns it to learning. A click
  on a known word makes it unseen again; a double click on a learning word makes it unseen. Right
  click still opens the word panel. The double click must not select text or start a phrase
  selection (`usePhraseGesture`).
- On a phone, a tap keeps opening the gloss (with Known and Learning in it): a double tap is too easy
  to hit by accident there.

**The word panel** (one-screen drawer of 4.0-2)
- One header row: 🔊 the word · the pronunciation (IPA or pinyin) · "#1,234 most common · B1" ·
  and **+ Deck** on the right. Example sentences get their own small sound buttons.
- "In context" and "Explain in context" show only when a key (or Max) is there.

**Codex "T"** (`TypographyPanel.tsx`): a "Words" section with three rows, Known, Learning, Unseen,
each with a style (none, underline, dotted, highlight; known also "faint") and a colour from six that
suit the palette, with one live sample sentence. Stored in reader settings; the reader CSS reads them
as variables (`reader.css` already keys on `data-s`).

**Done when:** a page's sentences translate instantly after the first seconds; the click rules work
in pages and scroll mode; the word panel fits a 1366×768 screen; Discover imports a book and a comic.

---

### 5.1-6 · Thesaurus and Ludus

**The user's points**
- [ ] A better, better-placed My decks / Discover switch.
- [ ] A better list of my decks.
- [ ] "My vocabulary journey" under My decks.
- [ ] Many more decks to discover (fun ones too), minimal, with search, sort and group.
- [ ] From the journey and from decks: add to My decks, or to a deck you have.
- [ ] A better deck settings panel.
- [ ] The card list as cards.
- [ ] A more aesthetic Today card.
- [ ] Ludus: answer cards line up evenly, even with long words.
- [ ] Ludus: more random, more varied exercises.

**Layout**
- Desktop: My decks and Discover become header tabs (as in Mundus, with 1/2 key hints); search,
  sort and New sit at the right of the same row. Phone: the Segmented stays under the title.
- **My decks** as a list made for a desktop: each deck a row with its picture (the theme photo or
  the deck's colour), name, folder, cards, due today (new · learning · review in small pills), last
  studied, and on hover Study, Ludus and ⋯. Folders fold with counts. A toggle shows the decks as
  cards instead.
- **My vocabulary journey** moves from Discover to under My decks.
- **Today card:** a ring of what's due (new, learning, review), the next seven days as a small
  bar line, one big **Study** and a **Ludus** beside it.
- **Deck settings** as a right-hand panel on desktop: sections with headings (Daily limits, Order,
  Card look, Ludus, Danger zone), compact rows, a live card preview at the top.
- **Card list as cards:** a grid of small cards (the word, its meaning, a state dot, when it's due),
  turning over on hover; five across on a wide screen; "Show more" as now.

**Discover, much larger**
- From 14 themes to about 40, grouped: **Path** (the frequency milestones, as now), **Everyday**
  (today's 14 plus colours, numbers, clothes, weather, the city, shopping, health, school, sport,
  hobbies, technology, kitchen, directions, the restaurant, the hotel), **Fun** (space, the sea,
  fairy tales and fantasy, love and dating, compliments, film night, football, coffee shop,
  festivals, exclamations), **Grammar** (essential verbs, connectors, irregular verbs, question
  words), and **Computed** decks that need no new lists: "Words that look like English" (cognates,
  found by comparing each word with its English meaning) and "Your words from songs and shows".
- Minimal cards: the theme photo, the name, the size, how much you already know.
- Search, sort (suggested, size, easiest first) and group (as above, or by level).
- **Adding:** on a ready-made deck and on a journey stage, "Add to My decks" or "Add to…" an
  existing deck (words already there are skipped, and it says how many were added).
- **What it takes:** new themes are concept lists in `scripts/lang-data/themes.ts`, built from
  Wiktionary into each pack, so the packs are rebuilt (v7 → v8). That needs `scripts/.cache` (about
  2 GB, docs/SETUP.md) and is heavy: tier 1 and 2 first, one pack at a time, the dev server stopped.

**Ludus**
- **Even answer cards** (`study/exercises.tsx` `Options`): every card the same height
  (`auto-rows-fr`), text wrapping inside with `hyphens: auto` and the language set, smaller type only
  for very long answers; on a wide screen four short answers sit in one row.
- **More varied** (`core/srs/ludus.ts` `planLesson`): weights instead of an even pick; never the same
  exercise twice in a row; no kind more than about a third of a lesson; new cards start with
  different gentle kinds (meaning, true/false, listen and choose, the match); the second round for
  new cards is mixed in among the others, not left to the end; 4.0-2's gap sentences join the mix.
- **Tests:** over many seeded lessons, the share of each kind stays within its limits and no kind
  repeats back to back.

**Done when:** the list and grid of decks, the journey, the settings panel and the cards look right
at 1280 and on a phone; adding to an existing deck skips duplicates; Ludus answers line up in German
and Russian with long words.

---

### 5.1-7 · Sound: good pronunciation without a key

**The user's points**
- [ ] AI sound with an AI key (exists: Gemini's voices, 3.0-4).
- [ ] Without a key, still a good pronunciation: "not a cheap American sound".

**What happens today:** with a Gemini key, Gemini's voice for the locale; without one, the best
device voice of exactly that locale (never another language's voice), else no sound button. The
weak point is the device: on Windows without natural voices it is the old robotic voice.

**Without a key, in this order**
1. **A real person saying the word** (single words): recordings from Lingua Libre and Wiktionary on
   Wikimedia Commons (free licences, credited in the panel). A build script makes, per language, an
   index of the pack's common words that have a recording; the sound is fetched when first played
   and kept on the device.
2. **A natural voice on the device** (sentences and words without a recording): an open neural voice
   (Piper, run in the browser with WebAssembly) downloaded once per language (about 20–60 MB, asked
   first, like the packs). Only voices whose licence allows a paid app; checked per voice.
3. **The best device voice for exactly the locale,** ranked better than today: online natural voices
   first, then Google's, then enhanced ones, and the old robotic ones last. When only a robotic one
   is there, Ordo › Voices says how to get a better one (Windows' natural voices, or Edge).
4. No voice: no button, as now. Never another language's voice.

**With a key or Max:** Gemini's voices (as now); Max gets them without a key.
**Ordo › Voices:** each available kind with a sample to hear and choose.

**To check while building (and say if it fails):** Piper's size and speed on a laptop (a short
sentence in under 300 ms), each chosen voice's licence, how many of the 10,000 most common words
have a recording in each tier 1 language (French is rich; Arabic and Mandarin thinner).

**Done when:** in French, Spanish, German, Russian, Mandarin and Arabic, without a key, a common
word plays a human recording and a sentence a natural voice, on Windows and on the iPhone.

---

### 5.1-8 · Keyboard practice (Cursus › Typing)

**The user's points**
- [ ] Typing practice like keybr.com: simple, step by step, effective, for other alphabets
  (Russian, Chinese, Arabic…). Tier 1 only.

**How it works** (`core/typing/` for the engine, `features/cursus/typing/` for the room)
- **Letters by frequency:** each language's letters are ordered by how often they occur in its
  frequency list. You start with the six most common (Russian о е а и н т, Arabic ا ل ي م و ن…).
- **Words to type:** made-up but pronounceable words from the language's own letter patterns
  (keybr's method, a letter-trigram model built from the word list), using only unlocked letters;
  real words as soon as there are enough; sentences from the pack at the end.
- **Unlocking:** a new letter joins when every current one reaches the target speed (30 words a
  minute by default, adjustable) at 95% accuracy. The weakest letter is the "focus" and appears more.
- **No layout to install:** the physical key is read (`KeyboardEvent.code`) and mapped to the
  language's standard layout (Russian ЙЦУКЕН, Arabic 101, French AZERTY, German QWERTZ, Spanish), so
  you can practise before installing it; "I have this layout" switches to the system's own.
- **On screen:** the line to type in the reading font (Arabic right to left, letters joined), and a
  keyboard with the next key lit and the finger shown. Per letter: speed and accuracy bars.
- **Mandarin:** typing Chinese means typing pinyin and picking characters, so: first pinyin
  syllables of the most common characters, then a practice input method (type the pinyin, pick the
  character with 1–5), tones optional.
- **French, German, Spanish:** the letters English keyboards lack (é è ç à, ä ö ü ß, ñ ¿ ¡) get
  their own lessons, with both the layout and the dead-key way to type them.
- Progress is kept per language (`db.typing`), time counts as practice in Ratio and Home.
- On a phone (no keyboard) the tab explains it is for a computer keyboard.

**Tests:** the letter order per language, the word generator only uses unlocked letters, the unlock
rule, the key maps. **Done when:** a Russian learner on an English keyboard types the first lesson
without installing anything, and the seventh letter unlocks at target speed.

---

### 5.1-9 · A touch of the language in the design

**The user's point**
- [ ] Slight, minimal touches that fit the language throughout the app (French aesthetics when
  learning French).

**How:** `design/flavours.ts` gives each language a few small things, applied with `data-flavour`
on the page; the user's palette and reading font stay theirs, so contrast never suffers.
- A nudge of the accent toward a colour of the language (within the palette's lightness).
- A display font for headings (open-licence, loaded only for that language).
- One small ornament for dividers, empty states and the end page.
- The language's quotation marks in quotes (« » French, „ “ German, 「」 Chinese and Japanese).

| Language | The touch |
| --- | --- |
| French | a Garamond-style heading font, a fleuron ❦ divider, a hint of bleu de France |
| Spanish | a thin tile-pattern rule, warm terracotta, ¡ ¿ in titles that ask |
| German | a clean grotesque for headings, straight rules |
| Russian | a Cyrillic serif for headings, a thin red rule |
| Mandarin | a serif Song face for headings, a vermilion seal for "done" marks |
| Arabic | a Naskh heading face, an eight-point star ornament |
| Others | a touch from the script (Devanagari, Hangul, Greek…), else none |

Where: room titles, Home's Today, dividers, empty states, onboarding after the language is picked,
the end page, the loading screen. Not the reading text. Ordo › Appearance: "Language touches"
(on by default). **Done when:** switching between the six core languages changes these touches and
nothing else; light and dark both pass contrast.

---

### 5.1-10 · Lingua 5.1 complete: the full check

- [ ] Every point above checked in the app: desktop first (1280, 1440, 1366×768), then a phone;
  light and dark; each pretend plan.
- [ ] The second half of Lingua 5 (when the user pastes it) is planned as 5.2.
- [ ] Docs (ROADMAP, DECISIONS, FEATURES, QA-ios, ARCHITECTURE for the room/folder map), the version
  says 5.1, commit, push, the live site checked.

---

## 4. Things that can't be done exactly as asked

- **Payments and Max's server** need accounts only the user can create (D1, D2). Until then they run
  in test mode.
- **Comprehension questions without AI** test words and sentences from the text, not understanding
  of the story; real questions come with Max or a key.
- **Discover's books** are the free and legal ones (public domain and open licences).
- **Human recordings** exist for common words, not for every word or for sentences; sentences use
  the on-device natural voice.
- **Typing on a phone** isn't offered: it needs a physical keyboard.
- **Larger Discover** needs the packs rebuilt, a long job done one pack at a time.
