# Lingua 5.2 · the plan

**Status: being built since 2026-10-21, in the order of HANDOVER.md** (planned 2026-10-20; 5.2-1 done 2026-10-21). This is the second half
of the Lingua 5 list; the first half is [LINGUA-5.1-PLAN.md](LINGUA-5.1-PLAN.md), whose section 0
holds the user's decisions (Stripe; Max is AI with your own key; €24.99 once, €5.99 a month or €49.99
a year). **Desktop only:** the phone isn't needed anymore, so nothing here is designed or checked for
a phone. The roadmap's "## Lingua 5" ticks the steps.

5.2 builds on 5.1's new rooms: Sonus et Visio (one room), Mentis (Mundus, Sermo, Diarium) and Cursus
(Grammatica, Alphabets, Typing, the course). Room names below are the new ones.

---

## 1. How 5.2 fits the rest

- **5.1-1 (the new room order)** and **5.2-1 (Settings, the sidebar)** change the same frame and are
  built as one step, first.
- **5.2-4 (Visio)** is Lingua 5's own step. Lingua 4.0-3 was removed on 2026-10-20 (the karaoke and
  song games are dropped), and the Visio work moved here with the user's points below.
- **5.2-5, 5.2-6, 5.2-7** rework the three tabs of Mentis (5.1-1). 5.1's plan is updated for them:
  Sermo has no chat inside Lingua anymore, and Explore and Picks are one.
- **5.2-8 (Grammatica)** changes only the pages (`features/grammatica`). The topics and drills
  (`core/grammar`) are where 3.0-8 parts 5–6 (another account) work, so the two don't collide.
- **The decision on Max (D2)** applies here too: Diarium's corrections and Gemini's YouTube
  transcripts are Max features that use the learner's own key.

## 2. The order, and what can run at the same time

| Step | What | Size | Built with / waits for |
| --- | --- | --- | --- |
| 5.2-1 | Settings (Ordo's new name), a narrower sidebar, flashcard widths | S | with 5.1-1 |
| 5.2-2 | Radio: only stations in the language, a better list, a tuner for countries | M | 5.1-2b's territories data |
| 5.2-3 | Listening: audiobooks and free courses, the book page, the player, Commute, Sonus+ settings | M | 5.1-1 |
| 5.2-4 | Visio: dual subtitles for YouTube and the streaming services, real service marks | L | after 5.1-1 |
| 5.2-5 | Diarium: writing tools, a calendar, search, in the language | M | 5.1-1 |
| 5.2-6 | Sermo: a guided path into your AI app, many more scenes | M | 5.1-1 |
| 5.2-7 | Mundus: an interactive guide, one Explore, Things to try | M | 5.1-1 |
| 5.2-8 | Grammatica: a guided path at your level, lessons at desktop size | L | 5.1-1 |
| 5.2-9 | Ratio: one language, compact, goals in Tabula instead of Iter, more numbers | M | — |
| 5.2-10 | Lingua 5 complete: the full check (one check with 5.1-5) | S | all |

**In parallel** once the frame (5.1-1 with 5.2-1) is pushed: Radio and Listening together (both in
Sonus's folders) in one session; Diarium, Sermo and Mundus each in its own (separate folders);
Grammatica and Ratio each in its own.

---

## 3. The steps

Every step ends with the check in CLAUDE.md: typecheck, tests, build, the browser at desktop sizes
(1280, 1440, a 1366×768 laptop), light and dark; the docs it touches; commit, rebase, push, the
Pages deploy. "Done when" is checked in the browser.

### 5.2-1 · Settings, a narrower sidebar, and flashcard widths

**The user's points**
- [x] Ordo is called Settings again.
- [x] The sidebar a bit less wide.
- [x] Every flashcard: thin, normal or wide on desktop.

**Settings**
- "Settings" everywhere the learner reads it: the sidebar, the page title, the shortcut dialog and
  every "Ordo › …" in the app's own text (Diarium's "add a free key in Ordo › AI", Mundus, the plans
  page). A search over `src` for "Ordo" lists them; tests that assert on the text change with them.
- The address becomes `/settings` (with `/settings/:group` and `/settings/lab`); `/ordo/*`
  redirects. The code folder `features/ordo` keeps its name.
- From here on the docs say Settings (5.1's plan says Ordo for the same place).

**The sidebar**
- `SIDEBAR_WIDTH` goes from 248 to **216** px expanded and from 76 to **64** collapsed. The longest
  label, "Sonus et Visio", still fits on one line at 216 (checked).
- Places that hard-code the width (Diarium's floating bar uses `lg:pl-[248px]`) read a CSS variable
  `--sidebar-w` that the desktop shell sets, so they follow it when it is collapsed too.

**Flashcard width**
- A setting **Card width: Thin · Normal · Wide** (about 460, 600 and 840 px at most; Normal is
  today's size). It sits with the other card-look settings (`CardLookPanel`), for all decks, and a
  deck can choose its own like the other look settings.
- It applies to every flashcard: studying (`FlipCard`), Recall, and the card previews in deck
  settings. A live preview shows the change while choosing.

**Done when:** every "Ordo" the learner sees reads Settings and old links land there; the sidebar is
narrower and nothing in it wraps or clips; the three widths change every flashcard.

---

### 5.2-2 · Radio: only stations in the language, a better list, a tuner for countries

**The user's points**
- [x] Each language shows many countries and stations that aren't in that language. Fix it.
- [x] Improve the very long list: its look and its layout.
- [x] The country slider: more fun, interactive and good-looking.

**Why it happens:** stations come from radio-browser.info by their language tag, and anyone who
adds a station types the tags. A station in the USA tagged "english,spanish,french", or a music
station tagged by its owner's language, lands under Spanish.

**The fix** (`services/radio/stations.ts`, with tests over saved directory answers for Spanish,
Russian and Arabic): a station stays under a language only when
1. the language is its **only or first** tag (a list of three or more languages is dropped unless
   this language comes first);
2. it is in a country where the language is **official, regional or widely spoken** (5.1-2b's
   territories data), **or** the language is its only tag (real stations abroad, such as a Russian
   station in Israel or a Turkish one in Germany, stay);
3. it isn't on a short hand-kept list of known wrong stations per language
   (`services/radio/corrections.ts`), filled while checking the top stations of the six core
   languages;
4. its name doesn't speak against it: a name in another script, outside the language's countries,
   needs a second sign.
A station's menu gets **"Not in Spanish"**, which hides it on this device.
**Measured:** the countries shown per language before and after (Spanish should list the
Spanish-speaking countries and a few with large communities, not sixty).

**The list, laid out for a desktop**
- Two panes: on the left the map, smaller and sticky, with the tuner (below) under it; on the right
  the stations.
- Stations as **tiles** (the station's logo large; where it has none, a drawn tile with its initials
  in a colour of its own), with the name, the city and up to two kinds (news, talk, music, culture,
  sport, from its tags), and moving bars on the one playing.
- **Sections instead of one long list:** Your stations · **Talk and news** (first, since speech is
  what helps learning) · Music · Regional · Everything. Each shows a row of eight with **See all**,
  which opens a full grid with kind chips and a sort (most listened, name, sound quality). Long grids
  draw only what's on screen, so 400 stations stay smooth.
- Search stays at the top.

**The tuner** (instead of today's row of country chips)
- A horizontal dial like an old radio's: the countries sit along it as marks with their flags and
  station counts, and a fine needle stands in the middle. Drag it, use the wheel, or the arrow keys,
  and it **tunes** with a soft snap to each country; the map glides to the country as it does, and
  its stations fill the right pane.
- The dial's marks are spaced by how many stations each country has, and the language's main
  countries come first. Movement uses transforms only (PERFORMANCE.md).

**Done when:** the six core languages show only stations in their language (spot-checked by
playing the top twenty of each); the list is in sections with tiles; the tuner moves smoothly and
the map follows.

---

### 5.2-3 · Listening: audiobooks and free courses, the book page, the player, Commute, Sonus+ settings

**The user's points**
- [x] Free courses (now at the bottom of Audiobooks) as a tab beside free audiobooks, with courses
  to explore and add easily, like LibriVox's books.
- [x] An audiobook's page: a design lift for its parts, and a larger cover.
- [x] The audiobook player: "Read along as you listen" becomes a small button with small text, and
  the player is centred.
- [x] Commute: more liquid glass, more like iOS.
- [x] Sonus+: basic settings that fit the app.

**Audiobooks, with tabs** (`sonus/library/BooksTab.tsx`)
- Tabs inside Audiobooks: **Your shelf** (your books and your courses) · **Free audiobooks**
  (LibriVox, as now) · **Free courses**.
- **Free courses as a catalogue**, not a list of links. `services/sonus/courses.ts` grows from links
  into entries of three kinds:
  - *Audio you can add*: courses published as a podcast feed (added to your shelf as a course and
    played in Sonus, as podcasts are);
  - *Courses with files*: the US Foreign Service Institute's courses (public domain: their audio goes
    to Sonus, their textbook PDF to Codex, from the sites that host them, checked one by one);
  - *Links* to good courses that only play on their own site (Language Transfer and others, as now).
  Cards with a cover, who made it, the level, the length and **Add** (or **Open** for links); search,
  a level filter and a kind filter. Every address is checked when built, as today's are.

**The audiobook's page** (`sonus/BookPage.tsx`)
- The cover much larger (about 320 px) in a sticky left column, with the title, the reader, the
  length and **Continue part 7 at 12:30**.
- The parts on the right as a proper list: number, title, length, a thin progress line for each,
  a tick on finished parts, live bars on the one playing, play on hover. Long books group their
  parts by section where LibriVox gives sections.

**The player** (`sonus/player/PlayerPage.tsx`)
- With no transcript, the player is **one centred column**: the cover, the details, the controls.
  "Read along as you listen" shrinks to a small button with small text under the controls; it opens
  the transcript options in a small popover.
- With a transcript, the two columns stay as they are.

**Commute** (`sonus/CommutePage.tsx`)
- The cover, blurred large and soft, fills the screen behind everything. The controls sit on
  frosted panels (a strong blur, a little more colour, a fine light edge at the top, a soft shine),
  with large round buttons that swell under the pointer like 4.0-1's glass tab bar.
- Blur only on a few panels that don't move; with "reduce transparency" set in the system, solid
  panels instead.

**Sonus+ settings** (a gear in the room's header, in its own dark design)
- **Listening:** the speed for podcasts and books, the size of the skip back and forward, play the
  next episode by itself, the sleep timer's default.
- **Lyrics and singing:** the translation line (always, on hover, never), romanisation for other
  scripts (pinyin, transliteration), lyric size.
- **Learning:** new words from songs go to "From songs" by themselves (on or off); how hard the song
  games are.
- **Sources:** the full-song source you prefer (Apple Music, Spotify, YouTube), or previews only.
- **The room:** always dark or follow the app's light; show or hide explicit songs; the country for
  charts and podcasts (the language's main country unless chosen).
- Only settings that change something real are added; any that turns out to have nothing behind it
  is left out and said so in the roadmap.

**Done when:** a free course with a feed and an FSI course are added and play; the book page shows
the large cover and the new parts list; the player without a transcript is centred with the small
button; Commute looks like glass and stays smooth; each Sonus+ setting changes what it says.

---

### 5.2-4 · Visio: dual subtitles for YouTube and the streaming services, real service marks

**The user's points**
- [x] A YouTube player with dual subtitles; if possible for the streaming services too.
- [x] The services' icons accurate and up to date.
- [x] Remove "From Mundus" at the bottom of Services.
- [x] The Visio the user asked for (2026-10-20): Netflix, Prime Video, Max, Disney+ and YouTube shows,
  transcribed and watched inside Lingua with hover translations, as in Codex. *(built; not tried on real sites)*
- [x] For the streaming services that protect their video: their subtitles brought in (3.0-7's "Add its
  subtitles") and followed beside the show playing in its own app, with the same taps and translations. *(built; not tried on real sites)*
- [x] A look at whether a small Lingua browser extension is worth it for desktop. The user's decision
  D9 (yes) stands; the look comes first and fixes what the extension does. *(built; not tried on real sites)*

**What exists:** dual subtitles for your own video files (the language's line with every word
hoverable, your language's line under it). YouTube doesn't play in Visio yet.

**YouTube inside Visio**
- Paste a YouTube link (or open one from Explore): YouTube's own player (its official embed, which
  YouTube allows) with Lingua's two subtitle lines over the picture, kept in time with the player.
  Hovering pauses (as Language Reactor does); click a word for the word panel; keys: ← and → for the
  line before and after, R to repeat the line, S to show or hide the second line.
- **Getting the subtitles is the hard part:** YouTube doesn't let another page read a video's
  captions. In this order:
  1. **The Lingua browser extension** (below), when installed, reads the captions on youtube.com
     and hands them to Lingua: the language's line, and YouTube's own translation for the second.
  2. **With Max** (and a Gemini key): Gemini can watch a public YouTube video from its link and
     return a timed transcript; the second line is translated (to be checked with the current
     models and their length limits).
  3. **A subtitle file** you add (as today's "Add its subtitles").
  4. Otherwise YouTube's own captions inside its player (not hoverable), with one line on how to
     get Lingua's.
- The video joins the library (Videos, in Sonus et Visio) with its title, channel and picture.

**The streaming services: a Lingua browser extension** (Chrome and Edge)
- On Netflix, Prime Video, Disney+, HBO Max and YouTube (and the free channels that use ordinary
  players, such as arte, ARD, ZDF, RTVE and RaiPlay, each checked), it shows Lingua's two subtitle
  lines over the service's own player: words to hover with Lingua's dictionary, click to save to
  your deck, pause on hover, the line before and after.
- **How:** it reads the subtitle files the service's player loads (the way Language Reactor works).
  The video itself is never touched, captured or recorded; its protection stays as it is.
- Saved words reach Lingua through the open Lingua window (the extension and the app talk to each
  other directly); when Lingua is closed they wait in the extension.
- Its own folder (`extension/`). Publishing it in the Chrome Web Store needs a developer account,
  which the user creates; until then the user loads it as an unpacked extension.
- **Honest limits:** services change their players, so each needs looking after; a service that
  blocks it is said so in the app.

**Real service marks** (`features/mundus/ServiceBadge.tsx`, `core/mundus/services.ts`)
- Today each service is a coloured square with letters. Each gets its **real mark** instead: the
  open SVG drawings from the Simple Icons project where it has the service, and the service's own app
  icon where it doesn't, all at the same size and corner.
- Names and colours checked against each service today (Apple TV+ has been called Apple TV since
  October 2025; Max is HBO Max again). A test makes sure every service has a mark. The marks are
  used only to name a service and link to it.

**"From Mundus" removed** from the bottom of Services (`PicksOnServices` in `ServicesTab.tsx`),
as 5.1-1 removes the other Mundus lines.

**Done when:** a YouTube video with Spanish captions plays in Visio with both lines in time (with
the extension, and with Max); the extension shows both lines on Netflix and YouTube; every
service shows its real mark.

---

### 5.2-5 · Diarium: writing tools, a calendar, search, in the language

**The user's points**
- [x] Remove "A few sentences…".
- [x] Without AI set up, remove the bar at the bottom.
- [x] Basic writing tools: three heading sizes, Ctrl+B, Ctrl+I and so on.
- [x] "Dear diary" in the language being learned.
- [x] Search and sort buttons.
- [x] A ⋯ on each entry in the list to rename or delete it.
- [x] A calendar view, in the same design as the rest, that shows your progress.

**Text and the bar**
- The "A few sentences a day is plenty…" line on Diarium's home and the editor's "A few sentences
  are plenty" go. The empty page says "Today…" in the language (Aujourd'hui…, Hoy…, Heute…,
  Сегодня…, 今天…, اليوم…).
- Without Max (D2), the floating bar at the bottom (the AI check) isn't shown at all; the entry's
  menu has one quiet line about corrections with Max.

**Writing tools**
- A small toolbar appears over selected text (bold, italic, underline, H1, H2, H3, list, quote),
  and the keys work anywhere: **Ctrl+B, Ctrl+I, Ctrl+U**, **Ctrl+Alt+1/2/3** for the three heading
  sizes and **Ctrl+Alt+0** for normal text, **Ctrl+Shift+8** and **Ctrl+Shift+7** for lists, and
  the usual typing shortcuts (`# `, `## `, `### `, `- `, `1. `, `> `).
- Entries are stored as Markdown in the entry's existing text, so sync, export and word counts keep
  working. The AI check reads the plain text, and its corrections are matched back paragraph by
  paragraph.
- The editor is Tiptap (open source, built on ProseMirror), loaded only in Diarium: a plain text box
  can't show headings, and Tiptap handles right-to-left Arabic and Chinese input methods properly.

**"Dear diary" in the language**
- A salutation per language: Cher journal, Querido diario, Liebes Tagebuch, Дорогой дневник,
  亲爱的日记, and so on, written by hand for tiers 1 and 2 and checked against good sources. Where a
  language has no such habit, the title is the date in that language ("mardi 20 octobre").

**Search, sort and the ⋯ menu**
- Search and sort in Diarium's header, as in Codex and Thesaurus: `/` searches titles and text;
  sort by newest, oldest, longest or most corrected.
- Each entry in the list has a **⋯** (and the same menu on right-click): **Rename** (the title edits
  in place) and **Delete** (with Undo for a few seconds).

**The calendar** (a List · Calendar switch)
- Months as grids in the same design as the week card on Home and in Ratio: each day an entry was
  written is inked (darker the longer it is), corrected entries get a small tick, and a thin line
  joins days in a row. Click a day to open its entry; a strip of the year above jumps between months.
- Beside it, the month in numbers: entries, words, days written, the longest run, words corrected.

**Done when:** the three heading sizes and every shortcut work in French, Russian and Arabic; the
salutation follows the language; search, sort, rename and delete work; the calendar inks the right
days.

---

### 5.2-6 · Sermo: a guided path into your AI app, many more scenes

**The user's points**
- [x] Remove "Pick a scene…".
- [x] A better layout, larger scene cards, Sermo screen by screen: pick your scene (large); then
  voice or text and "correct my mistakes"; then your prompt, opened in ChatGPT, Claude, Gemini,
  Copilot or Grok, going smoothly to the site or app where the learner is signed in.
- [x] Remove the chat inside Lingua.
- [x] Many more scenes, situations and things to practise and talk about.

**Screen by screen** (one choice a screen, large, with Back on each; choices remembered)
1. **Pick your scene.** Large picture cards (a free photo or a drawing per scene), in groups, each
   with its level range; a search, and **Surprise me**.
2. **How you'll talk.** Two large choices, **Voice** or **Text**; then **Correct my mistakes** (at the
   end, or as I go), **Help me when I'm stuck** (the AI offers words), and how long (5, 10 or 20
   minutes).
3. **Your prompt.** The prompt in a reading card (in the language, at your level, with your learning
   words), **Copy**, and large buttons with each AI's mark: **ChatGPT · Claude · Gemini · Copilot ·
   Grok**. For voice, one line on where that AI's voice button is (as today).

**Opening smoothly where the learner is signed in**
- The prompt opens in the AI's own site in the browser the learner uses, where they are already
  signed in. Where the site takes a prompt in its link, it opens filled in (ChatGPT, Claude, Grok and
  Copilot accept one, each checked when built; filled in, not sent). Where it doesn't (Gemini, to
  check), the prompt is copied first and a small note says "Paste with Ctrl+V".
- Desktop apps (ChatGPT, Claude and Copilot on Windows) open where they register their links, which
  is checked per app; otherwise the browser.
- The link carries only the prompt (the scene, the level and some words): no key, nothing personal.

**The chat inside Lingua goes**
- The chat page and the chat with a key are removed. Old chats stay in the database (nothing is
  deleted) and old chat links open Sermo.

**Many more scenes** (from 10 to about 80, in `core/colloquium/scenes/`)
- **Everyday:** café, bakery, market, supermarket, pharmacy, doctor, hairdresser, post office, bank,
  a phone call, a neighbour, a lost item, a complaint in a shop, renting a flat, a repair.
- **Travel:** airport, train station, taxi, hotel, asking the way, tourist office, booking a tour,
  car hire, an emergency.
- **Work and study:** a job interview, the first day at work, a meeting, a presentation, asking for
  a raise, a group project, small talk at a conference.
- **Social:** meeting someone, a date, a birthday, dinner with a family, making plans, apologising,
  comforting a friend, your weekend.
- **Culture and ideas:** a film, a book, music, today's news, a debate, the culture of the language's
  countries (a few hand-written per core language).
- **Stories and games:** twenty questions, a detective story, a fairy tale told together, describe a
  picture, would you rather, explain a word without saying it, talk with a famous person from the
  language's culture.
- **Practice:** one grammar point in conversation (only the past, only questions), linked to
  Grammatica's current topic.
- **From your week:** scenes made from what you read, watched and wrote (Mundus's week and Diarium).
- Each scene has a level range, the AI's role and yours, three to five goals ("order two things, ask
  the price, pay by card") and useful words from the pack. A test builds every scene's prompt in
  every tier 1 and 2 language.

**Done when:** the three screens work from start to the AI's site with the prompt filled in or
copied; there is no chat inside Lingua; about 80 scenes in groups, each with goals and words.

---

### 5.2-7 · Mundus: an interactive guide, one Explore, Things to try

**The user's points**
- [x] Make "Mundus says" interactive.
- [x] Remove "Something for every room…" in Explore.
- [x] Explore and Every pick become one, called Explore: Every pick's layout with Explore's pictures
  and cards. Clicking one opens a small side bar with the rest: a short description, "Add its
  subtitles", which streaming service, the trailer, and so on. Stress the level more.
- [x] Things to try: smaller cards; a more interactive, fun tab.

**Mundus says, interactive** (the guide's line on its first tab)
- Mundus's line is followed by two or three replies to click, and each does something:
  **Something shorter** (a five-minute step), **I'd rather listen / watch / read** (today's lane
  changes and the compass needle swings to it), **Why this?** (Mundus answers with its reason: the
  quietest lane and what you like), **Not today** (that step goes away for today).
- Mundus answers in one line and the three steps under it change with it. No AI needed; it keeps for
  the day. With Max, a small box lets you say it in your own words ("20 minutes, and I'm tired").

**One Explore**
- **Layout of Every pick:** on the left the list of kinds (Series, Films, Books, Podcasts, Music,
  Radio, YouTube, Games…) and the level; on the right the results.
- **Cards of Explore:** the picture tiles with real covers and posters, and **the level large on
  every tile** (A1 to C2 on a colour scale). Results come in three bands: **At your level**, then
  **A stretch**, then **Easier**; the level filter starts at yours.
- **Clicking one** opens a small bar on the right: the description; the level and why ("slow, clear
  speech, everyday words"); where to watch or listen (the services with their real marks, 5.2-4, and
  the free ways); **Add its subtitles**; **the trailer** (from TMDB when its key is set, otherwise a
  YouTube search); **open in Lingua** (a book into Codex, a podcast into Sonus+, a station plays, a
  film into Visio); and **Save** to a want-to list.
- The "Something for every room…" line goes. Old Explore and Picks links open the new Explore at the
  matching kind.

**Things to try**
- Smaller cards in a dense grid (four or five across): a short title and a time ("2 min").
- **Deal me one** turns over a random card. Cards can be ticked done, which stamps them and counts
  them this week; done ones move to the back. Filters for time (2, 5, 15 minutes) and room. Mundus
  marks one as "Try this one today".

**Done when:** each reply changes the guide's steps; Explore has the side list, the picture tiles
with large levels, three level bands and the side bar with everything listed; Things to try deals,
ticks and filters.

---

### 5.2-8 · Grammatica: a guided path at your level, lessons at desktop size

**The user's points**
- [x] A complete redesign that leads you along a progression, by hand; it knows your level.
- [x] Opening a grammar step makes the screen small and thin, like a phone page. Fix it: desktop
  only.

**What it knows:** your level (onboarding, Tabula, the placement test), how well you know each
topic (from the drills), what you met while reading (3.0-8's links), and what's due for review.

**The page** (`features/grammatica/GrammaticaPage.tsx`)
- **One next step, large, at the top:** "Next for you: le passé composé avec avoir · B1 · 10
  minutes", a line on why ("you met it 23 times this week in *Le Petit Prince*"), and **Start**.
- **A level ladder** (A1 to C1) above it: how much of your level is done, and what levelling up
  needs ("four more topics").
- **Your level as a chapter:** its topics in order as a path: done ✓, the current one ●, the next ones
  ○, later ones quiet, with "you are here". Any topic can still be opened, but the path leads.
- **On the right:** reviews due (with Start), your weak spots (the topics with the most mistakes), and
  the placement test ("Not sure of your level? Five minutes").
- **All topics**, by level and with a search, stays one click away.
- After a lesson, **Next** goes straight to the next step on the path, not back to the list.

**Lessons at desktop size** (the bug)
- The lesson page uses a narrow full-screen column (`max-w-2xl` in `GrammarLesson.tsx`). It becomes a
  wide stage: the lesson in a main column (examples first, the explanation, the drills at a
  comfortable size) and a sticky right column with this lesson's steps and progress, the rule to
  glance at, and its words. Enter checks and continues; 1–4 choose (as in Ludus).
- The same wide layout for reviews, the placement test and topic pages (`lessonParts.tsx` already
  has a wide variant; the narrow one goes).

**Done when:** a learner placed at A2 in French opens Grammatica on their next step with the reason;
the path, the ladder and the right column are right; every lesson, review and the placement test use
the full desktop width.

---

### 5.2-9 · Ratio: one language, compact, goals in Tabula instead of Iter, more numbers

**The user's points**
- [x] Ratio shows only the language being learned, except on Tabula.
- [x] Every element a bit more compact.
- [x] Remove Iter completely; a basic goal inside Tabula instead.
- [x] Expand Ratio.

**One language:** the Overview's "all languages" choice goes; Ratio is about the current language.
Tabula still shows every language you know.

**Compact:** smaller padding and headings, denser cards, shorter charts; more fits on a 1280×800
screen without scrolling. Numbers use even-width figures.

**Iter goes, a goal comes to Tabula**
- The Iter tab and its pages are removed (`features/ratio/iter`), with every link to them. Its data
  (milestones, the study log, goals) stays in the database untouched, so nothing synced is lost and
  an export still has it, but nothing shows it.
- On each Tabula row: **Goal: B1 by June 2027** (a level and a date), and if you like, hours a week. A
  slim bar shows where you are: your estimated level, the time left, the hours a week your pace
  needs, and "on track" or "behind". Set in a small popover. An Iter goal with a level and a date
  moves into it.

**More in Ratio** (for the current language; each card opens the room it's about)
- **Words:** words known over time, new words a week, where they came from (reading, songs, decks),
  and **coverage**: how much of an ordinary text you'd understand ("you know 87% of the words in an
  average news article"), worked out from the words you know and how common they are.
- **Reading:** reading speed over time, words read, books finished, look-ups per 1,000 words (falling
  means progress).
- **Listening and watching:** hours by kind (podcasts, books, radio, songs, video).
- **Practice:** cards reviewed, how many you remembered after a day or more, Ludus accuracy by
  exercise, grammar topics mastered, typing speed (5.1-4a).
- **Time:** a year of days as a heat map in ink, time per room, your best time of day, your run of
  days.
- **Your level, estimated:** where your numbers put you, as a range, and what's missing for the next
  level (words, topics, hours). Said plainly: an estimate, not a certificate.
- Mostly from what is already stored; a small daily record of the known-word count is added for the
  curve if it doesn't exist yet.

**Done when:** Ratio never shows another language outside Tabula; Iter is gone and goals show in
Tabula; each new card shows real numbers for a test profile.

---

### 5.2-10 · Lingua 5 complete: the full check

- [x] Every point of 5.1 and 5.2 checked in the app at desktop sizes (1280, 1440, 1366×768), light
  and dark, with each pretend plan (Free, Lingua+, Max). *A sample, not every room at every width,
  theme and plan; see ROADMAP 5.2-10 for what was and was not covered.*
- [x] Docs (ROADMAP, DECISIONS, FEATURES, ARCHITECTURE for the rooms and folders). The version says
  0.5.2 (done 2026-10-28). Commit, push, the live site checked.

---

## 4. Things that can't be done exactly as asked

- **Protected video (DRM):** Netflix, Prime Video, Disney+ and HBO Max don't let other apps play their
  video, so Lingua never plays it. For them it follows their subtitles beside the show, and the
  extension reads subtitles only; the video is never touched.
- **Dual subtitles on streaming services** only work through a browser extension, and only where a
  service doesn't block it; each needs upkeep as the services change.
- **YouTube's captions** can't be read by Lingua itself: they come through the extension, Gemini with
  Max, or a file.
- **Opening the prompt already filled in** works only where an AI's site accepts a prompt in its link;
  elsewhere it is copied, ready to paste.
- **Radio tags** come from the public, so a wrong station can still slip through; "Not in Spanish"
  and the corrections list deal with those.
