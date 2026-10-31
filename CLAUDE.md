# Working on Lingua

Lingua is a local-first language-learning PWA (Vite 8, React 19, TypeScript, Tailwind 4, Dexie,
Zustand, motion/react). It is live at https://sanchour.github.io/lingua./ and GitHub Pages
deploys it from `main` (repo `sanchour/lingua.`). Setting up a new computer: [docs/SETUP.md](docs/SETUP.md).
Continuing from another account: [docs/HANDOVER.md](docs/HANDOVER.md).

## Where the work stands (2026-10-29)

- **Start here: [docs/HANDOVER.md](docs/HANDOVER.md).** The work still open, in order, how to claim
  a step so two accounts never do the same one, what only the user can do, and the prompt to paste.
  The plan, with what is done ticked, is [docs/ROADMAP.md](docs/ROADMAP.md); the user's original brief
  is [Lingua updates.txt](Lingua%20updates.txt).
- **Done and live:** Lingua 2.0 to 5 (Lingua 5 released as 0.5.2 on 2026-10-28). Details and what was
  left out are in the ROADMAP and [docs/DECISIONS.md](docs/DECISIONS.md). Only the six core
  languages (tier 1) get a course; tier 2 stays cheap (automatic packs, decks, podcasts, music search).
- **Now: Lingua 6 · Features** ([docs/LINGUA-6-PLAN.md](docs/LINGUA-6-PLAN.md), 28 steps, versions 0.6.x; audit in
  [docs/LINGUA-6-FEATURES.md](docs/LINGUA-6-FEATURES.md), tick entries as built; claim steps in the plan's table).
  **Then Lingua 7 · Design** ([docs/LINGUA-7-PLAN.md](docs/LINGUA-7-PLAN.md), versions 0.7.x). Before any design work
  read Part One of the handbook, [docs/handbook/Lingua-Design-Handbook.pdf](docs/handbook/Lingua-Design-Handbook.pdf)
  (source `docs/handbook/handbook.html`, printed with `node scripts/handbook-pdf.ts`), and the chapter for the
  room you change. Tablet and phone guides in it are reference only; the desktop-only rule still holds.
- **6-29 The word graph** (the user's idea; Opus builds it, beside Part B): [docs/WORD-GRAPH-PLAN.md](docs/WORD-GRAPH-PLAN.md),
  seven pushes, G1 to G7. Its numbers were measured on the real dictionaries; read its sections 1, 3 and 4 before drawing.
- **Lingua for Mac** (a look, not a launch; Tauri v2; the user, 2026-10-29): [docs/MAC-PLAN.md](docs/MAC-PLAN.md), handover step 25, parallel with the rest.
- **New idea: Slang & Dialects** (the user, 2026-10-31): a section where learners compare and learn regional slang and dialect words, colloquial differences, and how to speak in that dialect, accompanied by a visual dialect map. Only the 6 core languages first (e.g. Spanish Latin American varieties like Paisa, Caleño, Costeño, Argentinian, Chilean, Peruvian, Mexican, Dominican, Cuban, Puerto Rican; Mandarin variants; French varieties, etc.). **Do not build yet: a stronger model (e.g. Claude Opus) needs to plan it out first.**
- **Sandesigner** (the user's own design canvas for all their apps) lives in `sandesigning/`, apart from Lingua's code
  (no React, no dependencies); format in `sandesigning/FORMAT.md`. After changing it run `npm run sandesigner` and
  commit both `public/sandesigner/` and `public/sandesigning/`.
- Other accounts and sessions push to `main` all the time: rebase onto `origin/main` before every push.
- Why things are the way they are: [docs/DECISIONS.md](docs/DECISIONS.md). Structure:
  [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). The 60 fps rules: [docs/PERFORMANCE.md](docs/PERFORMANCE.md).

## How the user wants each prompt handled

1. Write a plan first (in the roadmap), then build it without waiting for confirmation.
2. Check it: `npm run typecheck`, `npm test`, `npm run build`, and look at it in a browser at
   desktop sizes (1280, 1440, and a 1366×768 laptop), light and dark.
3. Update the docs it touches (ROADMAP, DECISIONS, FEATURES), and tick the step in docs/HANDOVER.md.
4. After every finished prompt, commit and push to `main`, then check the Pages deploy went live
   (the installed desktop app updates from it). **Every push gets a version** (the user, 2026-10-25),
   checkpoints and claims too: `node scripts/version.ts "what this push is"`, commit, rebase, then
   tag and push the tag. The scheme is 0.<Lingua>.<part>-alpha.<push> (alpha, so 0): [docs/VERSIONS.md](docs/VERSIONS.md).
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

- **Sonus+ song streaming and sharing (the user, 2026-10-30):** When listening to music in **YouTube Music,
  Amazon Music, Spotify, or Apple Music**, the learner can easily stream or share the song straight to Sonus+;
  the song opens cleanly and immediately in Sonus+ (`/cantus`), resolving lyrics, vocabulary, and player without friction.

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
- Vitest caches transformed modules in `node_modules/.vitest-cache`, and an `import.meta.glob`
  there doesn't see files added later (the course's languages): delete the folder when a test
  should find a new file and doesn't.
- Windows, Git Bash: if `node` isn't found, `export PATH="/c/Program Files/nodejs:$PATH"`.
  Heredocs and `node -e` there lose backslashes: write patch scripts to a file instead.
- Antivirus software (Kaspersky did this on the first PC) can rewrite a local headless Chrome's
  traffic and fake CORS failures; check in the app's built-in browser before blaming the code.
- Pack builds and `count.ts` take 1–2 GB of memory each and the Japanese count about an hour: on
  an 8 GB laptop run them one at a time, with the dev server stopped.
- `scripts/.cache` (about 2 GB, git-ignored) holds the raw word data for building language packs.
  It isn't needed to run the app (the packs in `public/packs` are committed); rebuild it as
  docs/SETUP.md says, only for pack work.
