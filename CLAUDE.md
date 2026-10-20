# Working on Lingua

Lingua is a local-first language-learning PWA (Vite 8, React 19, TypeScript, Tailwind 4, Dexie,
Zustand, motion/react). It is live at https://sanchour.github.io/lingua./ and GitHub Pages
deploys it from `main` (repo `sanchour/lingua.`). Setting up a new computer: [docs/SETUP.md](docs/SETUP.md).

## Where the work stands

- The user's brief is [Lingua updates.txt](Lingua%20updates.txt). The plan, with what is done ticked,
  is [docs/ROADMAP.md](docs/ROADMAP.md).
- Lingua 2.0 is closed (last step 2.0-4b). Everything still open is **Lingua 3.0**, in order
  3.0-1 … 3.0-9 under "## Lingua 3.0" in the roadmap. Read its "Handover for the Lingua 3.0
  session" before starting.
- 3.0-1 is done (merged into `main` on 2026-10-18). Work on `main` from here; the branch
  `lingua-3.0/languages-wip` is history. Known gaps are at the top of the handover.
- 3.0-1b (tier-2 beta languages), 3.0-2 (phone and desktop, themes), 3.0-3 (Sonus and music) and 3.0-4 (voices, device sync) are done. The user swapped steps twice: 3.0-5 became Radio (done), **3.0-6 is now comics, audiobooks and courses, AI conversation, and the user's Radio and Music notes**, and Grammatica and alphabets moved to 3.0-8.
- **Lingua 3.0 is complete and live (version 3.0.0, 2026-10-20):** 3.0-6, 3.0-7 and the full
  check 3.0-9 are done. The user first skipped the rest of 3.0-8, then resumed it on 2026-10-20:
  parts 1–4 (topics, drills, lessons, links, placement, Ratio) are live; part 5 (alphabets and
  writing) and part 6 (the other languages) are next. Other sessions may still push to `main`, so rebase onto `origin/main` before pushing. Tier 2 stays cheap: only the
  features that cost little (automatic packs, decks, podcasts, music search). Keep it cheap.
- **Lingua 4.0 has started (2026-10-20):** five steps, 4.0-1 … 4.0-5, under "## Lingua 4.0" in the roadmap.
  **4.0-1 is done** (tiers, the 35 placeholder languages and the language map, the glass tab bar,
  the sidebar and icons, the new app icon, the Lingua+ placeholder). **4.0-2 is done** (the full
  dictionary for the six core languages, the one-screen word drawer, Import a book / Import a comic,
  the end page and reading goal, the word memory, sentences with a gap; Dexie v15). **Next is 4.0-3**
  (Cantus games, karaoke, streaming services in Visio). 4.0 sorts the languages into four tiers and an
  experimental shelf (the table at the top of "## Lingua 4.0"); only the six core languages get a course.
- **Lingua 5 is planned and must not be built yet (2026-10-20, the user: plan only):**
  [docs/LINGUA-5.1-PLAN.md](docs/LINGUA-5.1-PLAN.md) and [docs/LINGUA-5.2-PLAN.md](docs/LINGUA-5.2-PLAN.md),
  with the user's decisions at the top of 5.1 (Stripe; Max is AI with your own key; desktop only).
  When it is built: 5.1-1 with 5.2-1 first, 5.1's Codex step inside 4.0-2, 5.2's Visio inside 4.0-3.
- Why things are the way they are: [docs/DECISIONS.md](docs/DECISIONS.md). Structure:
  [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). The 60 fps rules: [docs/PERFORMANCE.md](docs/PERFORMANCE.md).

## How the user wants each prompt handled

1. Write a plan first (in the roadmap), then build it without waiting for confirmation.
2. Check it: `npm run typecheck`, `npm test`, `npm run build`, and look at it in a browser at
   desktop sizes (1280, 1440, and a 1366×768 laptop), light and dark.
3. Update the docs it touches (ROADMAP, DECISIONS, FEATURES, QA-ios).
4. After every finished prompt, commit and push to `main`, then check the Pages deploy went live
   (the installed phone and desktop apps update from it).
5. When a session finishes, give end notes: what changed, what wasn't verified, what's next.

The user often works across usage limits and is away while work runs: when a limit is hit, the
work should pick up again once it refreshes. They decide where a version ends.

Commit as `sanchour <255895307+sanchour@users.noreply.github.com>`
(`git -c user.name=sanchour -c user.email=255895307+sanchour@users.noreply.github.com commit …`).

## Rules that always hold

- **Desktop only (the user, 2026-10-20).** Design, layout and functions are made for the desktop
  app. Use wide windows fully: columns, side panels, sticky rails, desktop-style tabs and
  toolbars, hover states, keyboard shortcuts, and right-click or drag where it helps. **The phone
  isn't needed anymore** (the user: "Phone is not needed anymore"): don't design, build or check
  for it; what exists for it stays as it is.

- Work only inside this repository's folder. Never open or change anything to do with the user's
  internship, or other folders on the computer. Temporary files go in the session's scratchpad.
- API keys (Groq, Gemini) stay on the device and travel only in request headers, never
  in a URL. Tests use fake keys such as `test-not-a-real-key`, never the user's real ones.
- Never sign in to the user's real accounts or create accounts. Ask before a browser download.

## Practical notes

- Node 24 runs the TypeScript scripts directly (`node scripts/lang-data/fetch.ts`).
- Windows, Git Bash: if `node` isn't found, `export PATH="/c/Program Files/nodejs:$PATH"`.
  Heredocs and `node -e` there lose backslashes: write patch scripts to a file instead.
- Antivirus software (Kaspersky did this on the first PC) can rewrite a local headless Chrome's
  traffic and fake CORS failures; check in the app's built-in browser before blaming the code.
- Pack builds and `count.ts` take 1–2 GB of memory each and the Japanese count about an hour: on
  an 8 GB laptop run them one at a time, with the dev server stopped.
- `scripts/.cache` (about 2 GB, git-ignored) holds the raw word data for building language packs.
  It isn't needed to run the app (the packs in `public/packs` are committed); rebuild it as
  docs/SETUP.md says, only for pack work.
