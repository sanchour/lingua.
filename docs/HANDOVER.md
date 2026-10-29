# Continuing Lingua from any account

The user works on Lingua from more than one Claude account and computer. Everything a new session
needs is in this repository; Claude's memory doesn't travel, and [CLAUDE.md](../CLAUDE.md) holds the
way of working and the rules. This file is the **work queue**: what is still open, in order, how to
take a step without clashing with another account, and the prompts to paste.

Last updated 2026-10-27 (Lingua 6 · Features is step 23, next after 21; Lingua 7 · Design is step 24; renamed so the numbers follow the order).

---

## 1. The prompt to paste

**On a computer that already has the `lingua` folder** (open it in the Code tab):

```text
Continue Lingua. Read CLAUDE.md and docs/HANDOVER.md, take the first free step in the queue
(claim it first, as the handover says), and do it the way CLAUDE.md describes: plan it in the
roadmap, build it, check it at desktop sizes, update the docs, commit and push to main, check
the deploy, and give me end notes. Then take the next free step, until I stop you or a
usage limit does.
```

**To do one particular step**, replace the first sentence with "Continue Lingua with step N of
docs/HANDOVER.md."

**On a new computer:** the quick-start prompt in [SETUP.md](SETUP.md) clones the repository,
checks it builds, and then goes on with the queue below.

---

## 2. Claiming a step (so two accounts never do the same one)

1. `git pull` (or fetch and rebase onto `origin/main`).
2. In the queue below, change the step's `[ ]` to `[~]` and add *claimed YYYY-MM-DD*. Commit
   ("Claim step N") and **push at once**, before any other work.
3. If the push is rejected because someone pushed first, pull and look again: the step may have
   just been claimed.
4. When the step is finished, tick it `[x]` here and in the roadmap, in the step's final commit.
5. A claim with no commits for that step for more than a day is free again; say so in the commit
   that takes it over.

Steps marked **parallel** can be claimed by a second account while an earlier one is running. The
others wait for the step before them, because they build on it.

---

## 3. The queue

Plans: Lingua 3.0 and 4.0 in [ROADMAP.md](ROADMAP.md); Lingua 5 in
[LINGUA-5.1-PLAN.md](LINGUA-5.1-PLAN.md) and [LINGUA-5.2-PLAN.md](LINGUA-5.2-PLAN.md); Lingua 7 · Design
in [LINGUA-7-PLAN.md](LINGUA-7-PLAN.md), with [the design handbook](handbook/Lingua-Design-Handbook.pdf)
as its guide; Lingua 6 · Features in [LINGUA-6-PLAN.md](LINGUA-6-PLAN.md), with the audit of 1,618 features in
[LINGUA-6-FEATURES.md](LINGUA-6-FEATURES.md). The user's decisions for Lingua 5 are in section 0 of the 5.1 plan. Each step is planned in detail there;
read that part before starting.

| # | Status | Step | Where it is planned | Size |
| --- | --- | --- | --- | --- |
| 1 | [x] | **Grammatica part 5: alphabets and writing** (3.0-8). *Done 2026-10-20:* `src/core/script`, `src/data/script.ts` and `src/features/grammatica/letters` hold all of it, so it can move whole. **Parallel** with everything. Write it so it can move into Cursus › Alphabets (step 2 moves it). | ROADMAP "3.0-8" | L |
| 2 | [x] | **The frame of Lingua 5:** *Done 2026-10-21 (ROADMAP "The frame of Lingua 5").* the rooms in the new order (Cursus, Sonus et Visio, Mentis), Ordo renamed Settings, a narrower sidebar, flashcard widths, the device's light, the Mundus lines removed. First of the rest, because the course and the rest of Lingua 5 build on the new rooms. | 5.1-1 and 5.2-1 | L |
| 3 | — | *Removed 2026-10-20: the karaoke and song games are dropped; Visio moved to step 22.* | ROADMAP "4.0-3" | — |
| 4 | [x] | *done 2026-10-22 (five parts: the frame, all six languages, your own words across the app, speaking your journal)* **Cursus, the course** (tier 1; moved into Lingua 5 from 4.0-4 on 2026-10-21), in Cursus's Course tab. **Parallel** with 2. | ROADMAP "Lingua 5" › "Cursus" | XL |
| 5 | — | *Removed 2026-10-21: there is no separate 4.0 check; the version goes from 3.0 to 5.0 at step 21.* | — | — |
| 6 | [x] | *Done 2026-10-21 (a, b and c).* **5.1-2 · Plans, the first start and Home,** one step in three parts, in order: a · Lingua+ and Lingua+ Max (Stripe in test mode, the licence server, plans, the MAX badge); b · onboarding, the map without dots and its language data, the twelve flags (it shows the plans); c · Home, the new layout (the old one a setting away). After 2. | 5.1-2a, b, c | XL |
| 7 | — | *Merged into step 6 on 2026-10-21 (5.1 in four steps).* | — | — |
| 8 | — | *Merged into step 6 on 2026-10-21.* | — | — |
| 9 | [x] | *a done 2026-10-22; b done 2026-10-24 (part 1 2026-10-23, parts 2–4 2026-10-24); c done 2026-10-25 (recordings, device voices, Piper on the device: ROADMAP "Sound without a key"); the user added Cursus as an adventure path to this step on 2026-10-25, done the same day* **5.1-3 · Reading, words and sound,** one step in three parts: a · Codex, on top of what 4.0-2 built; b · Thesaurus and Ludus, including the larger Discover (pack rebuild); c · sound without a key (recordings, an on-device voice). **Parallel** with 6. | 5.1-3a, b, c | XL |
| 10 | — | *Merged into step 9 on 2026-10-21.* | — | — |
| 11 | — | *Merged into step 9 on 2026-10-21.* | — | — |
| 12 | — | *Merged into step 20 on 2026-10-21 (typing goes with the design touch as 5.1-4).* | — | — |
| 13 | [x] | *done 2026-10-25* **Radio and listening** (stations in the language, the tuner, audiobooks and courses, the player, Commute, Sonus+ settings). **Parallel** after 2. | 5.2-2 and 5.2-3 | L |
| 14 | [x] | *done 2026-10-27 (0.5.2-alpha.18)* **Diarium.** **Parallel** after 2. | 5.2-5 | M |
| 15 | [x] | *done 2026-10-28 (0.5.2-alpha.21)* **Sermo.** **Parallel** after 2. | 5.2-6 | M |
| 16 | [x] | *done 2026-10-28 (0.5.2-alpha.24)* **Mundus** (the interactive guide, one Explore, Things to try). **Parallel** after 2. | 5.2-7 | M |
| 17 | [x] | *done 2026-10-28 (0.5.2-alpha.26)* **Grammatica's guided path** and full-width lessons. **Parallel** after 1 and 2. | 5.2-8 | L |
| 18 | [x] | *done 2026-10-28 (0.5.2-alpha.27 and .28; ROADMAP "Ratio (5.2-9)")* **Ratio** (one language, compact, goals in Tabula, more numbers). **Parallel.** | 5.2-9 | M |
| 19 | [x] | **Grammatica part 6: topic maps for every language** (3.0-8). *Done 2026-10-21:* short grammars for twelve tier 2 languages, the Georgian alphabet; the rest named in ROADMAP "3.0-8". **Parallel.** | ROADMAP "3.0-8" | L |
| 20 | [x] | *done 2026-10-25, with step 9 (a · typing, b · language touches: ROADMAP "Typing, and the language in the design")* **5.1-4 · Typing, and the language in the design,** one step in two parts: a · typing practice in Cursus; b · a touch of the language in the design. After the room steps above (b touches every room lightly). | 5.1-4a, b | L |
| 21 | [x] | *done 2026-10-28: version 0.5.2; ROADMAP 5.2-10 says what was and wasn't checked* **Lingua 5 complete:** the full check; the version becomes 0.5.2 (`node scripts/version.ts --release`, docs/VERSIONS.md; 5.1-5, 5.1's own check, was done on 2026-10-25 at the user's ask: 0.5.1). Last, after 22. | 5.2-10 | S |
| 22 | [x] | *done 2026-10-28 (0.5.2-alpha.28; extension unverified on real sites; Gemini transcript and the captions fallback built 0.5.3-alpha.7, unverified with a real key);* *claimed 2026-10-25; taken over 2026-10-27 (no commits since 2026-10-26; real marks and "From Mundus" done), with all of Lingua 5* **Visio, as Lingua 5.2-4:** YouTube inside Lingua with two subtitle lines; the streaming services' subtitles beside the show playing in its own app, with the same taps and translations; a Lingua browser extension for them (decided yes); the services' real marks. **Parallel** after 2. | 5.2-4 | L |
| 23 | [~] | *6-0 done 2026-10-29 (docs/LINGUA-6-CONTRACTS.md), 6-4 done 2026-10-29 (0.6.0-alpha.6; 6-4b is the rest of its kinds); 6-1 done 2026-10-29 (0.6.0-alpha.8 the learner's half, 0.6.0-alpha.20 the language's half, dictionary version 3; 6-1c is what has no source); 6-2 done for the inbox and the first deck tools 2026-10-29 (0.6.0-alpha.10; 6-2b is the rest); 6-3 done for the memory controls 2026-10-29 (0.6.0-alpha.12; 6-3b is the rest); 6-5 done for the record and its first reader 2026-10-29 (0.6.0-alpha.15; 6-5b is the rest); 6-6 done for the pipeline 2026-10-29 (0.6.0-alpha.17; 6-6b is the screens and the other kinds). **Part A's b rows, 2026-10-29 (0.6.0-alpha.63; 8 of its audit entries stay open: British and American English, Brazilian Portuguese, false cognates, differences between similar words, and the drills and courses that need Max, listed by what they need in the plan rows): 6-1c, 6-2b, 6-3b, 6-4b and 6-6b are `[~]` with what is built and what is not in each row of the plan (select and bulk actions, tidy, decks from a list or text, sort by hand and six card orders, false friends, review by review, grammar links, Made by Max with stories, sentences, dialogues, quizzes, word lists and simplified texts); 6-5b is built apart from Diarium's evidence (Antigravity-2, 6-12 W4) and the error log (6-20, 6-24). Not tried: any of Max's output with a real key (the user's job). About 90 audit entries of Part A stay open.** **Part A (6-0 to 6-6) is done; 6-29 The word graph (the user's idea, 2026-10-29, Opus builds it, after Part A, beside Part B) is planned in LINGUA-6-PLAN.md; next is Part B (6-7 to 6-13, in parallel, in the plan's table), where each step also has its own 'b' row for what Part A's steps left.*** **Lingua 6 · Features** (planned 2026-10-26; the user will most likely build it in other sessions): 28 steps in seven parts, from the word record and one exercise engine to exams, pronunciation and games. **Claim each step in the plan's own table** (LINGUA-6-PLAN.md section 2), as section 2 here says; tick its entries in LINGUA-6-FEATURES.md when done. Part A first. **Next after 21, before 24** (the user, 2026-10-26: "Do Lingua Features first, then Lingua Design"; the plan's section 6 has all six answers). | LINGUA-6-PLAN | XL |
| 24 | [ ] | **Lingua 7-1 · The first start, quieter and shorter** (Lingua 7 · Design's first step): a first name, no skip; clearer tiers, the core six as book covers, a country panel without tabs; the level as seven steps with a card that pops up; "You speak" and "Why" out; the goal without a forecast. Read the plan's section 0 (the user's notes) and section 4 (three readings to confirm) first, and the handbook's Part One and its chapter "The first start". **After 23** (Lingua 6 first, the user 2026-10-26). | LINGUA-7-PLAN 7-1 | M |
| 25 | [ ] | **Lingua for Mac, a look** (the user, 2026-10-29: "i just want to build a lingua mac version now to see, check, get motivated and excited, i think i will like tauri a lot"): Tauri v2 around the app as it is, a `Lingua.app` and a `.dmg` on the user's own Mac, unsigned; six small steps M-0 to M-6, the check in WebKit (M-3) decides Tauri or Electron. **Parallel** with everything; M-0 (installing Rust) is the user's. Not a launch: signing and the App Store are a later plan. | MAC-PLAN | M |


**Lingua 5.1 is four steps and the check** (the user, 2026-10-21): 2 (5.1-1, done), 6 (5.1-2), 9 (5.1-3)
and 20 (5.1-4); 21 holds 5.1's check (5.1-5) with 5.2's.

**The order now (the user, 2026-10-21, settled: "I meant after 5.1-3a do cursus"):** finish 5.1-3a
(Codex, with much better word translations for the six core languages), then step 4, **Cursus, the
course, for all six core languages**, then 5.1-3b and c (the rest of step 9). **5.1-3a is done
(2026-10-22, ROADMAP "Codex (5.1-3a)"), and Cursus (2026-10-22, ROADMAP "Cursus"). 5.1-3b part 1 is
done (2026-10-23); next are 5.1-3b parts 2, 3 and 4, then 5.1-3c (section 6).** **Since 2026-10-25 all
of 5.1's steps are done (2, 6, 9 and 20); next are 5.2's room steps (13–18 and 22, each on its own
and in parallel), then 21, the check.** **Then Lingua 6 · Features** (step 23), part by part, **then
Lingua 7 · Design** (step 24, the first start, as its first step; the rooms join the queue one by one, as
the user's notes for each come: LINGUA-7-PLAN.md, section 3). The order is the user's (2026-10-26).

---

## 4. What the user has to do (sessions never create accounts or sign in)

- **GitHub:** the first `git push` on a new computer asks the user to sign in.
- **Stripe** (step 6): create the account and the products (Lingua+ €24.99 once; Max €5.99 a month
  and €49.99 a year) and register for the EU's VAT one-stop shop. Until then, Stripe's test mode.
- **Cloudflare** (step 6): an account for the small licence server (free tier).
- **Chrome Web Store** (step 22): a developer account to publish the browser extension. Until then
  the user loads it unpacked.
- **API keys** (Groq, Gemini, TMDB) stay in the app's settings on each device, never in the repo.

## 5. Good to know

- **No formatter:** Lingua has no Prettier or ESLint fix step. Never run `npx prettier` or
  `eslint --fix` (they would rewrite files across the repo); format by hand to match the code
  around it.
- **Token-efficient:** the user prefers sessions that work inline and read only what they need;
  no multi-agent workflows unless the user asks for one.
- **Desktop only:** don't design, build or check anything for the phone (CLAUDE.md).
- **Other accounts push to `main` all the time:** rebase onto `origin/main` before every push.
  Git stores the files with LF line endings; on Windows they are checked out with CRLF, so patch
  scripts must keep whatever the file has.
- **Design notes:** the user may paste Markdown from Settings › Lab › Design notes (7-0b): notes by room and page,
  each with the element's CSS path, where it was, the window size and the light. Read them as the user's notes for
  the room in question (Lingua 7 · Design plans each room from such notes).
- **Sandesigner 1.1 (7-0e):** the user may paste a brief from Sandesigner (Markdown, often with a picture) or put
  `.sandesign` files in the repo. `sandesigning/FORMAT.md` explains both; work through the notes by priority. The tool
  itself is `sandesigning/` (README there); after changing it, `npm run sandesigner` (or `npm run sandesigning`) rebuilds `public/sandesigner/` and `public/sandesigning/`.
  The launcher and Lingua's Design Notes floating bar can collapse into a single pen icon, with an optional expand on hover toggle. Both Sandesigner and Lingua's Settings (`Keyboard shortcuts` & `?` dialog) support switching modifier command symbols between Auto, Mac (`⌘ / ⌥`), and Windows (`Ctrl / Alt`).
- **Learning data** lives in each browser, not in the repo; device sync (SETUP.md, section 6)
  moves it.

---

## 6. Where 5.1-3b stopped (2026-10-23)

The plan is ROADMAP "Thesaurus and Ludus (5.1-3b, handover step 9): how it is built" (four parts,
each pushed on its own) and the design is LINGUA-5.1-PLAN.md "5.1-3b". Claim step 9 again before
starting, as section 2 says.

**Done, part 1 (the room), commit a053a1c:** header tabs, the deck table and cards view, the Today
rail, the journey under My decks. Files: `src/features/thesaurus/ThesaurusPage.tsx`,
`library/DeckTree.tsx`, `library/TodayCard.tsx`, `library/JourneySection.tsx`,
`library/states.ts` (`CARD_STATES`: new sage, learning amber, to review blue, fixed because the
accent changes with every palette; `studiedAgo`), `common/DeckIcon.tsx` (`deckHue`, `THEME_HUES`),
`src/app/RoomTabs.tsx` (its `end` tools now also show below 1024 px), setting `ui.deckView`.

**Next, part 2 (a deck):** `src/features/thesaurus/deck/DeckPage.tsx` and `DeckSettings.tsx`: the
settings as a right-hand panel in sections (Daily limits, Order, Card look, Ludus, Danger zone) with
a live card preview at the top; the card list as a grid of small cards (word, meaning, a state dot
from `CARD_STATES`, when it's due) that turn over on hover, five across on a wide screen, "Show
more" as now.

**Then part 3 (Ludus):** `study/exercises.tsx` `Options` (one height with `auto-rows-fr`,
`hyphens: auto` with `lang` set, smaller type only for very long answers, four short ones in a
row); `src/core/srs/ludus.ts` `planLesson` by weights (never the same kind twice running, no kind
over about a third, gentle kinds for new cards, their second round mixed in, gap sentences in the
mix); a test over many seeded lessons. Check German and Russian with long words.

**Part 4 (Discover) is done too (2026-10-24), so 5.1-3b is finished.** It didn't need the full
rebuild: `node scripts/lang-data/themes.ts` then `node scripts/lang-data/retheme.ts` (about a
second a pack) gave every pack its new lists as v8. What the plan said, for the record:
- About 40 themes in groups Path, Everyday, Fun, Grammar and Computed (cognates; your words from
  songs and shows), as minimal cards with search, sort and group. Discover lost the frequency path
  to My decks in part 1: show it again there as the Path group.
- "Add to My decks" or "Add to…" a deck you have, skipping words already in it and saying how many
  were added, on themes and on journey stages (`src/data/starter.ts` `addStarterDeck`;
  `library/JourneySection.tsx` and `VocabularyJourney.tsx`).
- New concept lists in `scripts/lang-data/themes.ts` (CONCEPTS), the themes in
  `src/core/lang/starter.ts` `STARTER_THEMES`, icons and hues in `common/DeckIcon.tsx`.
- Build: `node scripts/lang-data/translations.ts`, `node scripts/lang-data/themes.ts`, then
  `node scripts/lang-data/build.ts <codes>`, one pack at a time, tier 1 and 2 first, **dev server
  stopped** (1–2 GB each). Bump `PACK_VERSION` in `src/core/packs/format.ts` (7 → 8) and the
  `v7` file name in `src/core/lang/formGloss.test.ts`. Japanese and Mandarin also need
  `node scripts/lang-data/count.ts` first (about an hour; not run yet).
- `scripts/.cache` (2.3 GB) was fully downloaded on 2026-10-23, but only on the laptop that did
  part 1. On any other computer run `node scripts/lang-data/fetch.ts` first (SETUP.md, section 5).

**Then 5.1-3c** (sound without a key): planned in ROADMAP "Sound without a key (5.1-3c)". Parts
1 (real people's recordings of common words, from Wikimedia Commons) and 2 (device voices ranked,
chosen in Settings) and 3 (Piper's voices made on the device; the user said yes to espeak-ng's
GPL on 2026-10-25) are done. The user then asked, in the same step, for Cursus's course as an
adventure path like Duolingo's and HelloChinese's (ROADMAP "Cursus as an adventure path").

**Things that cost time in part 1:**
- Tailwind only sees class names written out in full: a class built in a template string
  (`bg-[color-mix(...${hue}...)]`) never reaches the CSS. Spell each one out, or use `style`.
- When Claude's window is hidden, the built-in browser stops drawing: screenshots time out, and
  `AnimatePresence mode="wait"` swaps (tabs, search results) stall until a screenshot forces a
  frame. Check with DOM reads or by measuring with JavaScript, and retry the screenshot.
- A fresh browser profile starts at onboarding. Test decks can be made from the page's console:
  `(await import('/src/data/starter.ts')).addStarterDeck('es', { kind: 'theme', id: 'food' }, { skipKnown: false })`.

> **Handbook upkeep (2026-10-28):** when a push changes a token, a primitive, a pattern, a sound or a design rule, add a line to the handbook's "design changelog" page and, if a number moved, to its `#facts` block (`src/test/handbookFacts.test.ts` fails until they agree). Print with `node scripts/handbook-pdf.ts`: it also refuses a page whose content crosses a side margin.


**Codex progress, 2026-10-29:** 6-12’s assigned W1–W4 slices are finished (details and limitations in its LINGUA-6-PLAN row). 6-5b’s Diarium correction evidence hook is included. Next for Codex: 6-8 Reading, then 6-24 → 6-25 → 6-22. Antigravity-1 retains 6-7 and 6-13. No real model has been used for Writing feedback.

**Antigravity-1 progress, 2026-10-29:** 6-7 Grammar is finished across all slices G1 to G5. 6-13 Translating and comparing languages is finished across all slices T1 to T3 (T1: translation practice sets, hints, literal vs natural, required words, accepted alternatives, idioms, slang, formal registers, dialogues, paragraphs, custom passages, timed challenges; T2: interactive word-by-word token alignment, round-trip back-translation with drift analysis, scrambled-tile sentence reconstruction, multi-reference comparison; T3: hand-crafted contrast tables across English and all six core languages es, fr, de, it, ru, zh and Romance cross-pairs covering word order, gender, cases, tense & aspect, articles, prepositions, politeness/address, false friends, shared roots, pronunciation, and cultural semantics, with saved personal notes). Both assigned steps (6-7 and 6-13) are complete. Next for Antigravity-1: claimed Step 6-11 Speaking (slices S1 to S3).

**Codex progress and branch change, 2026-10-29:** assigned Writing W1–W4 and Reading R1–R4 are finished, with limits in their plan rows. The user moved subsequent pushes to `codex/lingua`: R1/R2 were already on main; R3/R4 are branch work and are not live on Pages. Next: 6-24 → 6-25 → 6-22 on that branch. Claims in the branch plan are not yet visible on main until merged. No real AI model used.
