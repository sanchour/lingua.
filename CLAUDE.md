# Working on Lingua

Lingua is a local-first language-learning PWA (Vite 8, React 19, TypeScript, Tailwind 4, Dexie,
Zustand, motion/react). It is live at https://sanchour.github.io/lingua./ and GitHub Pages
deploys it from `main` (repo `sanchour/lingua.`). Setting up a new computer: [docs/SETUP.md](docs/SETUP.md).
Continuing from another account: [docs/HANDOVER.md](docs/HANDOVER.md).

## Where the work stands (2026-10-20)

- **Start here: [docs/HANDOVER.md](docs/HANDOVER.md).** The work still open, in order, how to claim
  a step so two accounts never do the same one, what only the user can do, and the prompt to paste.
- The user's brief up to Lingua 4.0 is [Lingua updates.txt](Lingua%20updates.txt); Lingua 5's lists
  are in its two plan files. The plan, with what is done ticked, is [docs/ROADMAP.md](docs/ROADMAP.md).
- **Lingua 2.0 and 3.0 are done and live** (version 3.0.0), except Grammatica's **3.0-8 parts 5–6**
  (alphabets and writing; topic maps for every language). Parts 1–4 are live.
- **Lingua 4.0:** 4.0-1 (tiers, the 35 placeholder languages, the language map, the sidebar and
  icons, the Lingua+ placeholder) and 4.0-2 (the full dictionary for the six core languages, the
  one-screen word drawer, Import a book / a comic, the end page and reading goal, the word memory,
  sentences with a gap; Dexie v15) are done. Open: 4.0-4 and 4.0-5 (4.0-3 was removed on 2026-10-20: the karaoke and song games are dropped; its Visio part is Lingua 5.2-4). Only the six core languages
  (tier 1) get a course.
- **Lingua 5** is planned in detail: [docs/LINGUA-5.1-PLAN.md](docs/LINGUA-5.1-PLAN.md) and
  [docs/LINGUA-5.2-PLAN.md](docs/LINGUA-5.2-PLAN.md), with the user's decisions at the top of 5.1
  (Stripe; Max is AI with your own key; Lingua+ €24.99 once, Max €5.99 a month or €49.99 a year;
  desktop only). The user asked on 2026-10-20 to make it ready to start: it is built step by step
  in HANDOVER.md's order, interleaved with the rest of 4.0.
- Other accounts and sessions push to `main` all the time: rebase onto `origin/main` before every
  push. Tier 2 stays cheap: only the features that cost little (automatic packs, decks, podcasts,
  music search).
- Why things are the way they are: [docs/DECISIONS.md](docs/DECISIONS.md). Structure:
  [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). The 60 fps rules: [docs/PERFORMANCE.md](docs/PERFORMANCE.md).

## How the user wants each prompt handled

1. Write a plan first (in the roadmap), then build it without waiting for confirmation.
2. Check it: `npm run typecheck`, `npm test`, `npm run build`, and look at it in a browser at
   desktop sizes (1280, 1440, and a 1366×768 laptop), light and dark.
3. Update the docs it touches (ROADMAP, DECISIONS, FEATURES), and tick the step in docs/HANDOVER.md.
4. After every finished prompt, commit and push to `main`, then check the Pages deploy went live
   (the installed desktop app updates from it).
5. When a session finishes, give end notes: what changed, what wasn't verified, what's next.

The user prefers token-efficient sessions: work inline and read only what is needed; no
multi-agent workflows unless they ask for one.

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

- **No formatter:** there is no Prettier or ESLint fix step. Never run `npx prettier` or
  `eslint --fix` (a stock Prettier once rewrote about 70 files); format by hand to match: single
  quotes, long lines (about 200 columns), JSX wrapped the way the file around it is.
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
