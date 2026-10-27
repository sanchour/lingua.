# Lingua 7 · Design · the plan

**Renamed 2026-10-27** (the user: "Put Lingua 7 as Lingua 6 - Design, so Lingua Design becomes 0.7"): what was planned as
Lingua 7 · Features is **Lingua 6 · Features** (`0.6.x`), built first; what was Lingua 6 · Design is **Lingua 7 · Design** (`0.7.x`),
built after it. Step numbers moved with the names (Features 6-1 … 6-28, Design 7-0 … 7-11).

**Status: planned 2026-10-26, not started.** Lingua 7 is a design update: page by page, the app is
made calmer, clearer and more itself. The onboarding is its first step (7-1), from the user's notes
of 2026-10-26; the rooms follow one at a time, each planned when the user's notes for it come
("this is just onboarding, but Lingua 7 will focus on design, so much more will come").
**Desktop only**, as always (CLAUDE.md, D6 of the 5.1 plan).

The companion is **the handbook**: [handbook/Lingua-Design-Handbook.pdf](handbook/Lingua-Design-Handbook.pdf),
a small book on how to design or improve each page in Lingua's own spirit. Read its Part One once
before any Lingua 7 step, and the room's chapter before working on that room. Its source is
[handbook/handbook.html](handbook/handbook.html); `node scripts/handbook-pdf.ts` prints it again.

Read first: [CLAUDE.md](../CLAUDE.md), then [HANDOVER.md](HANDOVER.md) for the queue. Lingua 5
(LINGUA-5.1-PLAN.md, LINGUA-5.2-PLAN.md) stays as planned. **Lingua 7 comes after Lingua 6 · Features**
(the user, 2026-10-26: "Do Lingua Features first, then Lingua Design"): after 5.2's check (handover step 21), then Lingua 6 (step 23), then this plan (step 24).

---

## 0. The user's notes (2026-10-26), and what each becomes

The user went through the onboarding and left these notes, in the flow's order. Three were a bare
"remove"; the reading of each is written down here, and the user can correct it (section 4).

| # | The user's note | Where | What it becomes |
| --- | --- | --- | --- |
| N1 | "remove" | Your name | The Lingua mark above "First things first." goes (the header already shows the wordmark). *A reading: see Q1.* |
| N2 | "no skip for now, first name then continue" | Your name | No "Skip for now". Continue stays disabled until a first name is typed. |
| N3 | "remove Commitment issues… that part" | Language | The subtitle loses "Commitment issues welcome: you can add more later." |
| N4 | "these sections could be a bit clearer. Core, Full, Beta, and clearly stated what's there and what isn't" | Language, the tiers | Each tier says plainly what it has and what it doesn't have yet. |
| N5 | "Languages could be better put, larger elements, more prominent, inviting, still warm and bookish" | Language, the list | The six core languages become six small book covers; every other language a larger, warmer row. |
| N6 | "remove tab, just show Germany there properly placed" | Language, the country panel | No tab strip in the panel: the country is its title (flag and name), set properly at the top. |
| N7 | "these make no sense, redo this section, maybe without example, but still interactive level choosing, and kind of popping up what that could mean" | Level | No example sentences. Seven levels to choose from, and a card that pops up with what the level means. |
| N8 | "remove" | Level | The "Skip the N most common words" switch leaves the page; the default stays and the level's card says it. *A reading: see Q2.* |
| N9 | "remove" | You speak | The page "Which languages do you already speak?" leaves the first start. *A reading: see Q3.* |
| N10 | "remove 'why do you want to learn' from the onboarding flow" | Why | The page goes. |
| N11 | "remove the pace and reaching, because it's not very accurate, but add some connection still" | Goal | No "in about N months" and no pace verdicts. The minutes say what they hold in Lingua; the goal says what it means. |
| N12 | "this is just onboarding, but Lingua 7 will focus on design, so much more will come" | All of Lingua 7 | The rooms are steps of their own, waiting for the user's notes (section 3). |

---

## 1. What Lingua 7 is

- **A design update, not new features.** Each step takes one page or room and makes it look and read
  the way the handbook describes: the language first, quiet until asked, honest, warm and bookish.
  Features change only where the user's notes ask for it (the onboarding drops pages).
- **One room at a time, with the user.** The user reviews a room in the browser and leaves notes, as
  they did for the onboarding; the step is planned from those notes here, then built.
- **The handbook holds the rules.** Every step ends with the handbook's review sheet (Part Four)
  for the pages it touched.

**Where the handbook's rules come from.** Lingua's own design (the Cozy Scriptorium tokens, the
palettes and papers, the rooms, the voice the user shaped in 5.1-2b) and the user's notes. The user
also shared a design package for a music-learning app under the temporary name "Lingyu"
(2026-10-25: a UX blueprint with 36 design contracts, design tokens and a hand-off; it lives
outside the repo and isn't needed). From it the handbook adopts the principles that fit Lingua:
content before dashboards, details only when asked, one word everywhere, nothing added behind the
learner's back, honest numbers, every page's empty, loading and error states, and closing a panel
returns you to where you were. It does **not** adopt its indigo palette and tokens (Lingua keeps
its own), its four-tab structure (Lingua keeps its rooms), its phone layouts (desktop only) or its
feature catalogue (an option library, not a list to build).

---

## 2. The order

1. **7-0 · The handbook.** Done 2026-10-26 with this plan.
2. **7-1 · The onboarding** (section 3). The first step to build; the version line becomes
   `0.7.0-alpha.1` with its first push (`node scripts/version.ts --line 0.7.0 "…"`): Lingua 6 · Features (`0.6.x`) is built
   first.
3. **7-2 to 7-10 · The rooms and the shared pieces,** each when the user's notes for it come. They
   don't depend on each other, so they can run in parallel once planned.
4. **7-11 · Lingua 7's check:** every room against the handbook's review sheet; version `0.7.0`.

---

## 3. The steps

### 7-0 · The handbook — done 2026-10-26

- [x] `docs/handbook/handbook.html`: a small book (A5, about thirty pages), set in Literata and Plus
  Jakarta Sans from `node_modules`, in the Cream palette. Part One the spirit (what Lingua is, six
  habits, the voice), Part Two the materials (paper and ink, type, space, motion, drawings, flags,
  language touches), Part Three page by page (the anatomy of a page, the onboarding as Lingua 7
  begins it, then every room), Part Four before you call it done (states, the check, a review
  sheet), and an appendix (the numbers, the words Lingua uses, Lingua 7 at a glance, pages for notes).
- [x] `scripts/handbook-pdf.ts` prints it with the Chromium on the computer (Chrome, Edge or
  Playwright's), with clickable contents and PDF bookmarks, to `docs/handbook/Lingua-Design-Handbook.pdf`.
- When a room's step changes a rule, the handbook changes with it, in the same commit.
- [x] **The second edition** (2026-10-27, at the user's ask: "a full Lingua handbook, helping me with everything from
  start to finish"): 80 pages, then 90 (the same day, the user: "check if anything still misses": adding a
  language, getting the language right, the press kit, how Lingua is built, keeping data safe, when something breaks,
  choosing what's next, your own rhythm, and an index made at print time). Added Part Two the product (what Lingua does, languages and tiers, plans and prices,
  where it is going, Lingua 6), the new tabs of Lingua 6, Part Six the people it's for, Part Seven telling people
  (the story, words for selling, the website, channels, content, the launch, counting without spying), Part Eight
  running it (money, privacy and the law, support, shipping, working with Claude) and Part Nine start to finish (the
  whole road, what only the user can do, two checklists). Chapters number themselves; refer to them by name.

### 7-0b · Design notes in the Lab — done 2026-10-27

**The user's ask** (2026-10-27): "an app or something … where I can have the Lingua open, and click elements and things,
and quickly add notes, comments, to improve design", then "build the design notes tool into Lingua (Settings › Lab):
click any element to pin a note, notes kept on the device, and Copy for Claude as Markdown."

- [x] **Off unless switched on:** Settings › Lab › Design notes (`ui.designNotes`, device-only, off by default), so
  learners never meet it.
- [x] **Alt N** (the physical key, any layout, a Mac's Option too) or the small pill at the bottom right turns on
  **pick mode**: the element under the pointer gets a thin terracotta outline and a label (what it is and its text);
  a click opens a small note card beside it instead of doing what the element does. Esc leaves pick mode.
- [x] **Pins:** each note on the page shows as a numbered dot on its element, following it as the page scrolls; a
  click opens the note to edit, tick done or delete. A note whose element has gone stays at its last place, marked.
- [x] **The notes panel:** this page's notes (or every page's), each with its element, room and text; done ones
  faded; Copy for Claude; clear the done ones.
- [x] **Copy for Claude:** Markdown grouped by room and page, each note with its element (a description and a CSS
  path), where it was on screen, the window size, the light and palette, the language and the version, ready to
  paste into any session on any account.
- [x] **Kept on this device** (`localStorage`, `lingua.designNotes`): never synced, never in backups, cleared by
  Reset. Pick mode, the outline and the pins move by transform only (PERFORMANCE.md).
- [x] **Found in the check:** Alt N works from a text field too (the first start focuses one), except on a Mac where
  Option N types ñ's tilde; a pin sits where the click was, as a share of the element, so it follows it; the first start's
  notes are its own (it shares "/" with Home); the bar moves between the four corners (the mini player and downloads
  use the bottom right), remembered on the device; when the clipboard refuses, the Markdown is shown to select.
- **Where:** `src/features/lab/designNotes/` (notes and Markdown, the selector, the overlay, tests),
  `features/lab/DesignNotesCard.tsx`, mounted lazily in `app/Root.tsx` like the FPS monitor.
- **Done when:** a note pinned on Home, Codex and Settings survives a reload, follows its element when the page
  scrolls, and comes out as clean Markdown; the app's own clicks never fire in pick mode; light and dark.

### 7-0c · Design notes in more detail

**The user's ask** (2026-10-27): "improve the design notes tool so I can be more detailed".

- [x] **What kind, how much:** chips for the kind of change (Layout, Spacing, Size, Colour, Type, Words, Remove, Add,
  Behaviour, Question) and a priority (Must, Should, Could).
- [x] **The right element:** while picking, ↑ and ↓ choose the element around or inside the one under the pointer; in
  the note card, Bigger and Smaller do the same. The chosen element stays outlined while the card is open.
- [x] **An area, not an element:** Shift and drag while picking marks a rectangle (for spacing, alignment, empty room);
  it is kept relative to the smallest element around it, so it follows the page; drawn dashed.
- [x] **New words:** for an element with text, its words to edit, written out as old → new.
- [x] **Tweaks with a preview:** add a property (type size, weight, line height, letter spacing, typeface, colour,
  background, padding, margin, gap, corners, width, height, opacity, shadow): its value now is filled in, the wanted
  value is typed, and Preview shows it live on the element until the card closes.
- [x] **What the element is, written down by itself:** its tag, the component around it (in the dev server), its
  classes, its size, its type, colours (with the token's name when it is one, e.g. `--ink`), padding, margin, gap and
  corners, in a fold-out in the card and in the Markdown.
- [x] **The Markdown says all of it:** priority and kinds, the note, new words, tweaks (now → wanted), the area, the
  element's details; a count by priority at the top. The panel shows each note's priority and kinds.

### 7-0d · More in the Device lab

**The user's ask** (2026-10-27): "add in device lab a bunch more settings to test, check, and do stuff for the app,
like replaying the onboarding flow".

- [x] **Replay the first start** from the beginning or any step, with the language already chosen; nothing is saved,
  the light chosen in it is put back, and Esc or "Leave the replay" ends it. Home's first steps can be shown again.
- [x] **The look at a click:** the light (device, Paper, Nocturne), every palette as a swatch, motion (system, full,
  reduced) and the language touches, without leaving the Lab.
- [x] **Check the layout:** a 4 px grid with an 8 px beat and the 720 px reading measure, outlines on every box, and
  the three check sizes (1280 × 800, 1366 × 768, 1440 × 900) for the installed app's window.
- [x] **Try the pieces:** a toast of each kind, and clearing the translation and AI caches (learning data stays).
- These are for this session only (not saved), except the look, which is the real setting.

### 7-1 · The onboarding, quieter and shorter

**The user's points** (2026-10-26; section 0 has the notes word for word)
- [ ] Your name: no skip; a first name, then Continue. The mark above the title goes (Q1).
- [ ] Language: the "Commitment issues" line goes.
- [ ] Language: the tiers say clearly what each has and what it doesn't.
- [ ] Language: larger, more inviting language elements, warm and bookish.
- [ ] Language: no tab in the country panel; the country is its title, properly placed.
- [ ] Level: redone without example sentences: choose a level, see what it means pop up.
- [ ] Level: the common-words switch leaves the page (Q2).
- [ ] "Which languages do you already speak?" leaves the first start (Q3).
- [ ] "Why do you want to learn …?" leaves the first start.
- [ ] Goal: no pace, no "about N months"; a connection that is true instead.

**The flow after 7-1.** Your name → Welcome → See what Lingua can do → then four steps with dots:
**Language · Level · Goal · Study light**, then the plans (a fifth dot, as now). Adding another
language stays Language · Level · Goal. Back works everywhere and nothing chosen is lost. Every page
fits a 1366×768 screen without scrolling, except the language page, where the list peeks in under
the map on purpose (as now).

**Your name** (`IntroPages.tsx` › `NamePage`, `Onboarding.tsx`)
- The label is "Your first name"; the button says **Continue** and is disabled until the trimmed
  name has a letter in it. Enter does nothing until then. The "Skip for now" label goes from
  `Onboarding.tsx`, and `canContinue` covers the name page.
- The `LogoMark` above "First things first." goes (Q1); the title moves up into its space, so the
  page stays centred. "It stays on this device. We just like to be polite." stays.
- The welcome uses the name; the "friend" fallback stays only for profiles from before 7-1.

**Language** (`LanguageStep.tsx`, `core/lang/languages.ts` › `TIERS`)
- Subtitle: "Click a country to see what's spoken there, or scroll down for all of them." Nothing
  after it.
- **The country panel has no tabs.** Its head is the country: the flag at 24 px and the name in
  Literata at 22 px, with "Spoken here" under it in small caps and Close at the right. Under the head,
  the languages you can learn there, as now. Searching shows its matches in the same panel, headed
  "Matching “…”", again without tabs. The whole list lives under the map, as it already does.
- **The core six as small book covers.** Under the map, one row of six cards, each like the cover of
  a small book: the emblem at 28 px, the endonym in Literata at 24 px, the English name in small caps,
  and the language's sample line in italic. Each cover carries the language's own touch from
  `design/flavours.ts` (its ornament, its heading face, its leaning accent), so French looks a little
  French before it's chosen. Hover lifts a cover by 2 px; the chosen one gets the terracotta
  bookmark ribbon at its top edge and its tick. They replace today's small chips.
- **Every other tier, larger and warmer.** Each tier is a section with a serif heading (Full, Beta,
  Basics, Experimental), then **Has** and **Not yet** as two short lines, then its languages as
  larger rows: emblem 24 px, endonym in Literata 16 px, English name under it, in a four-column grid
  instead of small chips. "Coming" languages stay dimmed and say so on hover.
- **What each tier has, and doesn't** (one table in `TIERS`, `has` and `notYet`, used by the map's
  panel, this list and Settings; check every word against what is built when 7-1 starts, since
  `TIERS[1]` still says the course and typing are coming):

  | Tier | Has | Not yet |
  | --- | --- | --- |
  | Core | The course, grammar lessons, the alphabet, typing practice, the complete dictionary, natural voices, every room | (nothing: everything Lingua has) |
  | Full | Every room, grammar lessons, the alphabet, reading with lookups, word packs and decks | The course, typing, the complete dictionary |
  | Beta | Reading with lookups, word packs and decks, podcasts, radio, music search (built automatically) | Grammar lessons, the alphabet, the course |
  | Basics | Reading with tap-to-translate, your own words and decks, radio and podcasts | Word packs, grammar, the course |
  | Experimental | Reading with machine translation where it exists | Most rooms; some may not work |

- The search box, the map, its tints and its gestures stay as they are.

**Level** (`LevelStep.tsx`, redone)
- Title: "So, how far along are you?" Subtitle: "Pick the one that sounds most like you. You can
  change it any time."
- **Seven levels in one row,** A0 to C2, as steps of a staircase that rise left to right (or books
  of growing thickness on a shelf; the build tries both and keeps the calmer one). Each shows its
  code and a two-word name: A0 Starting out · A1 First words · A2 Getting by · B1 Holding a
  conversation · B2 At ease · C1 Reading anything · C2 Like a native (the same names as the goal's
  milestones, so the two pages speak alike).
- **What it could mean pops up.** Hovering or choosing a level opens a small card above it (spring
  `snappy`, transform and opacity only) with three plain lines of what you can do there (reading,
  listening, talking; paraphrased from the CEFR's global scale, no examples) and one line of what
  Lingua does with it: "We start you with the alphabet and your first words" (A0), "The 1,000 most
  common words start as known; unmark any while reading" (from A2 up, the number following the
  level as `seedKnownTopN` does today). Arrow keys move between levels; the card follows.
- **The common-words switch goes** from this page (Q2). `seedKnown` stays `true` and the card says
  so; anyone who'd rather not can unmark words while reading. (Settings has no such switch today;
  add one only if the user asks.)
- The sentence ladder goes, and with it `src/data/levelSentences.json` and its check in
  `territories.test.ts`; nothing else reads them.

**You speak, and Why** (`Onboarding.tsx`)
- Both pages leave the first start (`FIRST` loses `speak` and `why`). The components stay in the
  repo until the user confirms (Q3); nothing else imports them.
- What they fed: the translation language comes from the device's language, as when adding another
  language; Tabula is no longer filled at the first start (Ratio › Tabula still adds languages you
  speak); `learner.reasons` starts empty, so Home's "Next up" and Mundus use what they do with no
  reasons (check `enjoymentsFor([])` and `core/mundus/guide.ts` give a good first Home), and the
  reasons stay editable in Settings › Language.

**Goal** (`GoalStep.tsx`)
- The estimate goes: no "{goal} in about N months", no Cambridge hours, no "Ambitious. We like it."
  Nothing on this page forecasts.
- **The connection, kept true.** Two live lines instead, one for each choice:
  - Under the chosen goal, what it means, in the level card's words: "B1 · Holding a conversation:
    you follow the gist of shows and talk about familiar things."
  - Under the minutes, what they hold in Lingua today, from what the rooms really offer: 5 "Your
    cards for the day." · 10 "Your cards and a page or two." · 15 "Cards, a few pages and a song." ·
    20 "Cards, a short chapter and a song." · 30 "Cards, a chapter and an episode with subtitles." ·
    45 "All of that, and a talk or a diary entry." · 60 "A whole evening in the language." (The
    copy is a draft; keep it honest at build time.)
- The milestones path and the minutes slider with its checkpoints stay.

**Study light and the plans:** unchanged in 7-1.

**Tests:** `onboarding.test.ts` for the new pages (the name is required; `completeOnboarding` with
no `spoken` and no `reasons`); the tiers table has `has` and `notYet` for every tier. **Done when:**
a fresh profile goes from the name to the plans at 1280, 1440 and 1366×768, light and dark, with no
scrolling except the language page's list; Continue is disabled without a name; the country panel
has no tabs; every tier says what it has and doesn't; the level card pops up by mouse and by keys;
no page mentions months or a pace; the first Home looks right with no reasons; the handbook's
review sheet passes for each page.

### 7-2 to 7-10 · The rooms and the shared pieces — each waits for the user's notes

Each is planned here when the user has looked at the room and left notes. Until then, nothing is
built. Start each from the handbook's chapter for the room.

| Step | Room or piece | The handbook's chapter |
| --- | --- | --- |
| 7-2 | Home (Today and Classic) | Page by page · Home |
| 7-3 | Cursus (Course, Grammatica, Alphabets, Typing) | Page by page · Cursus |
| 7-4 | Codex (the library, the reader, the word drawer, Diarium's editor where it sits) | Page by page · Codex |
| 7-5 | Thesaurus and Ludus (words, decks, the study screen, games) | Page by page · Thesaurus and Ludus |
| 7-6 | Sonus et Visio (library, players, radio, Sonus+, streaming) | Page by page · Sonus et Visio |
| 7-7 | Mentis (Mundus, Sermo, Diarium) | Page by page · Mentis |
| 7-8 | Ratio (Overview, Tabula, Iter) | Page by page · Ratio |
| 7-9 | Settings and the plans | Page by page · Settings and the plans |
| 7-10 | Shared pieces: empty, loading and error states, dialogs, toasts, the sidebar | Before you call it done · Every page's states |

### 7-11 · Lingua 7 complete: the check

Every room against the handbook's review sheet, at 1280, 1440 and 1366×768, light and dark, two
palettes each, with reduced motion; the version becomes `0.7.0` (`node scripts/version.ts --release`).

---

## 4. Questions for the user

| # | Question | Until answered |
| --- | --- | --- |
| Q1 | The first bare "remove", on the name page: was it the Lingua mark above "First things first."? | 7-1 removes the mark. |
| Q2 | The "remove" after the level note: was it the "Skip the N most common words" switch? | 7-1 removes the switch and keeps the default (common words start as known). |
| Q3 | The "remove" before the Why page: was it the whole "Which languages do you already speak?" page? | 7-1 takes the page out of the first start and keeps the component. |
