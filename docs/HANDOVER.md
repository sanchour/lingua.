# Continuing Lingua from any account

The user works on Lingua from more than one Claude account and computer. Everything a new session
needs is in this repository; Claude's memory doesn't travel, and [CLAUDE.md](../CLAUDE.md) holds the
way of working and the rules. This file is the **work queue**: what is still open, in order, how to
take a step without clashing with another account, and the prompts to paste.

Last updated 2026-10-21 (5.1 regrouped into four steps; step 2 done).

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
[LINGUA-5.1-PLAN.md](LINGUA-5.1-PLAN.md) and [LINGUA-5.2-PLAN.md](LINGUA-5.2-PLAN.md). The user's
decisions for Lingua 5 are in section 0 of the 5.1 plan. Each step is planned in detail there;
read that part before starting.

| # | Status | Step | Where it is planned | Size |
| --- | --- | --- | --- | --- |
| 1 | [x] | **Grammatica part 5: alphabets and writing** (3.0-8). *Done 2026-10-20:* `src/core/script`, `src/data/script.ts` and `src/features/grammatica/letters` hold all of it, so it can move whole. **Parallel** with everything. Write it so it can move into Cursus › Alphabets (step 2 moves it). | ROADMAP "3.0-8" | L |
| 2 | [x] | **The frame of Lingua 5:** *Done 2026-10-21 (ROADMAP "The frame of Lingua 5").* the rooms in the new order (Cursus, Sonus et Visio, Mentis), Ordo renamed Settings, a narrower sidebar, flashcard widths, the device's light, the Mundus lines removed. First of the rest, because the course and the rest of Lingua 5 build on the new rooms. | 5.1-1 and 5.2-1 | L |
| 3 | — | *Removed 2026-10-20: the karaoke and song games are dropped; Visio moved to step 22.* | ROADMAP "4.0-3" | — |
| 4 | [ ] | **Cursus, the course** (tier 1; moved into Lingua 5 from 4.0-4 on 2026-10-21), in Cursus's Course tab. **Parallel** with 2. | ROADMAP "Lingua 5" › "Cursus" | XL |
| 5 | — | *Removed 2026-10-21: there is no separate 4.0 check; the version goes from 3.0 to 5.0 at step 21.* | — | — |
| 6 | [x] | *Done 2026-10-21 (a, b and c).* **5.1-2 · Plans, the first start and Home,** one step in three parts, in order: a · Lingua+ and Lingua+ Max (Stripe in test mode, the licence server, plans, the MAX badge); b · onboarding, the map without dots and its language data, the twelve flags (it shows the plans); c · Home, the new layout (the old one a setting away). After 2. | 5.1-2a, b, c | XL |
| 7 | — | *Merged into step 6 on 2026-10-21 (5.1 in four steps).* | — | — |
| 8 | — | *Merged into step 6 on 2026-10-21.* | — | — |
| 9 | [~] | *claimed 2026-10-21* **5.1-3 · Reading, words and sound,** one step in three parts: a · Codex, on top of what 4.0-2 built; b · Thesaurus and Ludus, including the larger Discover (pack rebuild); c · sound without a key (recordings, an on-device voice). **Parallel** with 6. | 5.1-3a, b, c | XL |
| 10 | — | *Merged into step 9 on 2026-10-21.* | — | — |
| 11 | — | *Merged into step 9 on 2026-10-21.* | — | — |
| 12 | — | *Merged into step 20 on 2026-10-21 (typing goes with the design touch as 5.1-4).* | — | — |
| 13 | [ ] | **Radio and listening** (stations in the language, the tuner, audiobooks and courses, the player, Commute, Sonus+ settings). **Parallel** after 2. | 5.2-2 and 5.2-3 | L |
| 14 | [ ] | **Diarium.** **Parallel** after 2. | 5.2-5 | M |
| 15 | [ ] | **Sermo.** **Parallel** after 2. | 5.2-6 | M |
| 16 | [ ] | **Mundus** (the interactive guide, one Explore, Things to try). **Parallel** after 2. | 5.2-7 | M |
| 17 | [ ] | **Grammatica's guided path** and full-width lessons. **Parallel** after 1 and 2. | 5.2-8 | L |
| 18 | [ ] | **Ratio** (one language, compact, goals in Tabula, more numbers). **Parallel.** | 5.2-9 | M |
| 19 | [x] | **Grammatica part 6: topic maps for every language** (3.0-8). *Done 2026-10-21:* short grammars for twelve tier 2 languages, the Georgian alphabet; the rest named in ROADMAP "3.0-8". **Parallel.** | ROADMAP "3.0-8" | L |
| 20 | [ ] | **5.1-4 · Typing, and the language in the design,** one step in two parts: a · typing practice in Cursus; b · a touch of the language in the design. After the room steps above (b touches every room lightly). | 5.1-4a, b | L |
| 21 | [ ] | **Lingua 5 complete:** the full check; the version says 5.0. Last, after 22. | 5.1-5 and 5.2-10 | S |
| 22 | [ ] | **Visio, as Lingua 5.2-4:** YouTube inside Lingua with two subtitle lines; the streaming services' subtitles beside the show playing in its own app, with the same taps and translations; a Lingua browser extension for them (decided yes); the services' real marks. **Parallel** after 2. | 5.2-4 | L |


**Lingua 5.1 is four steps and the check** (the user, 2026-10-21): 2 (5.1-1, done), 6 (5.1-2), 9 (5.1-3)
and 20 (5.1-4); 21 holds 5.1's check (5.1-5) with 5.2's.

**The order now (the user, 2026-10-21, said three times; the last: "after 5.1-3, do cursus"):** finish
all of step 9 (5.1-3a Codex, with much better word translations for the six core languages, then b
and c), then step 4, **Cursus, the course, for all six core languages**.

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
- **Learning data** lives in each browser, not in the repo; device sync (SETUP.md, section 6)
  moves it.
