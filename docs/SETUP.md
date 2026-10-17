# Working on Lingua from another computer

Everything Lingua needs lives in the GitHub repository `sanchour/lingua.`: the code, the docs,
the plan, the language packs and the rules for Claude ([CLAUDE.md](../CLAUDE.md)). A new laptop
(Windows or Mac) needs a few installs, then picks up where the last one stopped.

## Quick start: one prompt

Install the Claude desktop app, open its Code tab in a folder such as Documents, and paste:

```text
Set up Lingua on this laptop and continue the roadmap.

1. Check that Node 24 or newer and Git are installed. If one is missing, ask me before
   installing it (winget on Windows, Homebrew on a Mac), or tell me what to download.
2. Clone https://github.com/sanchour/lingua..git into a folder called "lingua" here. From then
   on, work only inside that folder, and never touch anything to do with my internship.
3. Read lingua/CLAUDE.md first and follow it for everything: my way of working, the rules and
   where the work stands. Then read docs/SETUP.md, the "Lingua 3.0" part of docs/ROADMAP.md
   with its handover, and "Lingua updates.txt".
4. Run npm ci, npm run typecheck, npm test and npm run build to check this laptop works.
5. Continue Lingua 3.0 from 3.0-1: switch to the branch lingua-3.0/languages-wip, merge main
   into it, and start the word-data download in the background (docs/SETUP.md, section 5,
   about 2 GB). Then carry on through 3.0-2 to 3.0-8.

Work on your own: plan each step in the roadmap, build it without asking me, and commit and
push after each finished step so the site updates. The first push needs my GitHub sign-in:
tell me when. If a usage limit stops you, set up a check-in that continues automatically once
it refreshes. Give me end notes when you finish.
```

The sections below are the same steps by hand.

## 1. Install

- **Node 24** (or newer) from https://nodejs.org. Check with `node -v`.
- **Git** from https://git-scm.com (on a Mac, `xcode-select --install` also gives it).
- **The Claude desktop app**, signed in to your account, for the Code tab.

## 2. Get the code

```bash
git clone https://github.com/sanchour/lingua..git lingua
cd lingua
npm ci
```

The first `git push` asks you to sign in to GitHub in the browser (Git Credential Manager on
Windows, the keychain on a Mac). Without that sign-in the laptop can build but not publish.

## 3. Check it runs

```bash
npm run dev        # http://localhost:5173
npm test
npm run build      # type check + production build into dist/
```

## 4. Continue with Claude

Open the `lingua` folder in the Code tab of the Claude desktop app. Claude reads
[CLAUDE.md](../CLAUDE.md) by itself: the way of working (plan, build, check, commit, push after
every prompt, end notes), the rules (only this folder, nothing to do with the internship, keys
only in headers, no real sign-ins) and where the work stands. To carry on, say for example
"Continue Lingua 3.0 from the roadmap".

Claude's memory from the first PC doesn't travel; CLAUDE.md holds what it held. If you want work
to resume by itself after a usage limit, ask the new session to set that up.

## 5. Word data, only for building language packs

The app doesn't need this: the packs it downloads are in `public/packs` and on the live site.
Building or rebuilding packs (Lingua 3.0-1) needs the raw sources, about 2 GB, in the git-ignored
`scripts/.cache`. On the branch that has the twenty-language sources:

```bash
git switch lingua-3.0/languages-wip
node scripts/lang-data/fetch.ts           # all sources; re-running skips finished files
node scripts/lang-data/translations.ts    # → scripts/.cache/en-translations.json
node scripts/lang-data/themes.ts          # → scripts/.cache/themes.json
node scripts/lang-data/build.ts ru el     # → public/packs/<code>.v1.json.gz (no codes: all)
```

`fetch.ts ja zh` downloads just those languages. Big downloads retry by themselves, and a file
that still fails is fetched again on the next run.

## 6. Your learning data

Words, progress, books and settings live in each browser, not on GitHub. To move them:

1. On the old computer: **Ordo › Your data › Backup & move devices › Create backup**, then
   **Share backup** or **Save file**.
2. On the new one, open https://sanchour.github.io/lingua./ (install it from the address bar if
   you like), go to the same place, choose **Restore from file** with that backup, then **Merge**
   (or **Replace** to start from the backup alone).

API keys stay out of a backup unless you switch on "Include API keys"; otherwise enter them again
in Ordo. Spotify needs connecting again on each device.

## Publishing

Nothing to set up per computer: a push to `main` runs `.github/workflows/deploy.yml`, which
builds the app and publishes it to GitHub Pages. Installed apps then offer the update.

## Windows notes

- In Git Bash, if `node` isn't found: `export PATH="/c/Program Files/nodejs:$PATH"`.
- Some antivirus software (Kaspersky did on the first PC) rewrites a local test browser's traffic
  and fakes CORS errors. If a request fails only there, check in the app's built-in browser.
