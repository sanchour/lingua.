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
- **3.0-6 and 3.0-7 are done and live** (3.0-6 ended with Colloquium, the conversation corner,
  and its full check). 3.0-8 (Grammatica) is being built from another account, and a Cantus
  redesign in another session; all push to `main`, so rebase onto `origin/main` before pushing.
  Next is 3.0-9, the full check, once 3.0-8 has landed. Tier 2 stays cheap: only the
  features that cost little (automatic packs, decks, podcasts, music search). Keep it cheap.
- **Lingua 4.0** is planned after 3.0 (five steps, 4.0-1 … 4.0-5, under "## Lingua 4.0" in the roadmap); start it
  only once 3.0-9 is done, or when the user asks. 4.0 sorts the languages into four tiers and an
  experimental shelf (the table at the top of "## Lingua 4.0"); only the six core languages get a course.
- Why things are the way they are: [docs/DECISIONS.md](docs/DECISIONS.md). Structure:
  [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). The 60 fps rules: [docs/PERFORMANCE.md](docs/PERFORMANCE.md).

## How the user wants each prompt handled

1. Write a plan first (in the roadmap), then build it without waiting for confirmation.
2. Check it: `npm run typecheck`, `npm test`, `npm run build`, and look at it in a browser at
   desktop and phone width, desktop first (the phone must keep working).
3. Update the docs it touches (ROADMAP, DECISIONS, FEATURES, QA-ios).
4. After every finished prompt, commit and push to `main`, then check the Pages deploy went live
   (the installed phone and desktop apps update from it).
5. When a session finishes, give end notes: what changed, what wasn't verified, what's next.

The user often works across usage limits and is away while work runs: when a limit is hit, the
work should pick up again once it refreshes. They decide where a version ends.

Commit as `sanchour <255895307+sanchour@users.noreply.github.com>`
(`git -c user.name=sanchour -c user.email=255895307+sanchour@users.noreply.github.com commit …`).

## Rules that always hold

- **Desktop first (the user, 2026-10-20).** Design, layout and functions are made for the desktop
  app first. Use wide windows fully: columns, side panels, sticky rails, desktop-style tabs and
  toolbars, hover states, keyboard shortcuts, and right-click or drag where it helps. The phone
  must keep working, but desktop is the priority, and every check starts there.

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
