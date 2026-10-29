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
   where the work stands. Then read docs/HANDOVER.md, the work queue.
4. Run npm ci, npm run typecheck, npm test and npm run build to check this laptop works.
5. Take the first free step in the queue of docs/HANDOVER.md (claim it first, as it says) and
   carry on through the queue. Start the word-data download (docs/SETUP.md, section 5, about
   2 GB) in the background only when a step builds language packs.

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
only in headers, no real sign-ins) and where the work stands. To carry on, paste the prompt at the top of
[HANDOVER.md](HANDOVER.md).

Claude's memory from the first PC doesn't travel; CLAUDE.md holds what it held. If you want work
to resume by itself after a usage limit, ask the new session to set that up.

## 5. Word data, only for building language packs

The app doesn't need this: the packs it downloads are in `public/packs` and on the live site.
Building or rebuilding packs (Lingua 3.0-1) needs the raw sources, about 2 GB, in the git-ignored
`scripts/.cache`. On the branch that has the twenty-language sources:

```bash
git switch lingua-3.0/languages-wip
node scripts/lang-data/fetch.ts           # all sources; re-running skips finished files
node scripts/lang-data/count.ts           # → counted-ja.txt, counted-zh.txt (about 20 min)
node scripts/lang-data/translations.ts    # → scripts/.cache/en-translations.json
node scripts/lang-data/themes.ts          # → scripts/.cache/themes.json
node scripts/lang-data/retheme.ts         # new themed lists into the built packs, no rebuild (5.1-3b)
node scripts/lang-data/build.ts ru el     # → public/packs/<code>.v1.json.gz (no codes: all)
```

`fetch.ts ja zh` downloads just those languages. Big downloads retry by themselves, and a file
that still fails is fetched again on the next run.

The full dictionary of the six core languages (Thesaurus › Dictionary) needs the packs' kaikki
files above, plus its own extras: the languages' own Wiktionary editions (streamed, about 1.7 GB
read, 60 MB kept) and Tatoeba's sentences (decompressed with `bunzip2`, which Git Bash has):

```bash
node scripts/lang-data/dictionary-fetch.ts                          # → scripts/.cache/mono-*.jsonl.gz, tatoeba/
node --max-old-space-size=3072 scripts/lang-data/dictionary.ts fr   # → public/dict/fr.v3.json.gz (no codes: all six)
```

`dictionary.ts` also reads each language's frequency list (`freq-<code>.txt`, FrequencyWords) and, for Mandarin, `Unihan_Variants.txt`; `fetch.ts <codes>` makes them with the kaikki file but also downloads the subtitle corpora the packs need. Just for the dictionary (about 580 MB of kaikki files for the six, 2026-10-29), by hand:

```bash
mkdir -p scripts/.cache && cd scripts/.cache
curl -L -o kaikki-es.jsonl.gz https://kaikki.org/dictionary/Spanish/kaikki.org-dictionary-Spanish.jsonl.gz   # French, German, Russian, Arabic, Chinese alike
curl -L -o freq-es.txt https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/es/es_50k.txt   # zh: zh_cn/zh_cn_50k.txt
curl -L -o unihan.zip https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip && unzip -o unihan.zip Unihan_Variants.txt
```

Kaikki refreshes its extracts weekly, so a rebuild picks up whatever Wiktionary changed since.

The recordings of common words (5.1-3c) read the same kaikki files (streamed from kaikki.org when
they aren't in the cache) and Commons' Lingua Libre and Wiktionary categories (French takes a
few minutes of API requests); each index is small and committed:

```bash
node scripts/lang-data/recordings.ts fr   # → public/sounds/fr.v1.json.gz (no codes: all six)
```

Typing practice's letters and words (5.1-4a) come from the committed packs in seconds:

```bash
node scripts/typing/build.ts              # → src/core/typing/data/<lang>.json (the six core languages)
```

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
