# Lingua for Mac · the plan

**Status: planned 2026-10-29, not started.** The user asked: "i dont want it launch ready yet, i just want to build a lingua
mac version now to see, check, get motivated and excited, i think i will like tauri a lot … can you create a mac plan?"

So this is a **look, not a launch**: a real `Lingua.app` (and a `.dmg`) on the user's own Mac, built with **Tauri v2**
around the app as it is, to see how it feels and what breaks. Nothing here is for the App Store or for other people's
Macs. Signing, notarization, sandboxing, in-app purchase and review are a later plan (see "Not in this plan").

It runs **beside Lingua 6 and Lingua 7, in parallel**, and changes almost nothing of Lingua's own code. Claim it in
[HANDOVER.md](HANDOVER.md) (row 25), as that file says. Read first: [CLAUDE.md](../CLAUDE.md), then this file.

## Why Tauri

The user wants Tauri. It uses the Mac's own WebKit (WKWebView), so the app is about 10 MB plus Lingua's files, not an
extra Chromium, and it is the better base if this ever goes to the store. The price: the app then runs in Safari's
engine, not Chrome's, and Lingua has only been checked in Chrome, so **M-3 is the step that matters**. If something
important cannot work there (M-3 says what counts), the fallback is Electron (Chromium, same web code), and this plan's
M-1 and M-5 carry over almost unchanged.

## What is already in Lingua's favour

- Lingua is a static site with no server of its own; the licence server is separate. It already runs offline.
- `vite.config.ts` reads `BASE_PATH` and defaults to `/`: Tauri serves the build at `tauri://localhost/`, so **the
  default is right and no base change is needed** (the Pages deploy keeps setting its own).
- The router is `createBrowserRouter`; Tauri falls back to `index.html` for paths it doesn't know, so deep links work.
- Keyboard shortcuts already switch between ⌘/⌥ and Ctrl/Alt symbols (Auto, Mac, Windows).
- Learning data lives in IndexedDB (Dexie). It stays in the app's own store; the existing backup export and import
  moves it between the browser and the app.

## The steps

Every step ends with a commit and a push like any other (CLAUDE.md), versioned on the line Lingua is on (`0.6.0-alpha.N`
now; no line of its own). `src-tauri/target/` is git-ignored; **the Pages deploy never builds the app.**

### M-0 · The toolchain (the user, once)

Xcode and Node 24 are on this Mac; **Rust is not.** The user runs the installer (a session doesn't install system
tools unasked):

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Then open a new terminal and check `cargo --version`. About 5 minutes; the first Tauri build compiles about 400
crates (5–10 minutes, once).

### M-1 · The shell

- `npm i -D @tauri-apps/cli@^2`, then `npx tauri init` with: app name Lingua, window title Lingua, frontend dist
  `../dist`, dev URL `http://localhost:5173`, before-dev `npm run dev`, before-build `npm run build`.
- Bundle identifier `com.sanchour.lingua` (the user can rename it; it can't change cheaply after a release).
- Scripts in `package.json`: `"mac:dev": "tauri dev"`, `"mac:build": "tauri build"`.
- `.gitignore`: `src-tauri/target`, `src-tauri/gen`.
- Icons: `npx tauri icon` from the 1024 px source the PWA icons are made from (`public/icons`, `pwa-assets.config.ts`).
- Done when `npm run mac:dev` opens a window that shows Lingua.

### M-2 · Make it behave as an app

The things the browser did that a webview doesn't, found by running it. Expected, each small:

- **Service worker.** WKWebView doesn't run one on `tauri://`. `src/app/UpdatePrompt.tsx` must do nothing when there
  is none (no "update available" prompt, no registration error), and the app's own version (`__APP_VERSION__`) is
  shown as it is. (Another session had this file open on 2026-10-29: rebase first.) Updates in the app are a new
  build; auto-update is a later plan.
- **Window.** Default 1280×800, minimum 1100×700 (the desktop-only rule), the title bar blended into the page
  (`titleBarStyle: "Overlay"`, hidden title) with room left for the traffic lights, and the window size and place
  remembered (`tauri-plugin-window-state`).
- **Menu.** A real menu bar: Lingua (About, Settings ⌘, , Hide, Quit), **Edit (without it ⌘C, ⌘V and ⌘A do nothing in
  the webview)**, View (full screen), Window, Help (opens the Pages site). Settings opens the app's own Settings room.
- **Links.** `http(s)` links and the Visio and Cantus "open in the browser" buttons go to the default browser
  (`tauri-plugin-opener`), not inside the window.
- **Light and dark** follow the Mac (WKWebView reports `prefers-color-scheme`; check the device's light setting in
  Settings too).

### M-3 · The check that matters: Lingua in WebKit

Go through the app in the window, light and dark, and write the result down in the table at the bottom. The **must
work** list decides Tauri or Electron; the rest is noted and fixed or left.

**Must work** (or Tauri is the wrong base):

1. Data: add words, quit, reopen; they are still there. Backup export and import. IndexedDB size with a big pack.
2. Packs and dictionaries load (59 MB of `public/packs`), the course opens, search is fast.
3. Reading: Codex, the PDF reader (pdf.js worker), the comics' OCR (Tesseract WASM).
4. Sound: audio playback, Radio, recordings, the player with its sleep timer.
5. On-device AI: Whisper (worker, WebGPU where there is one, WASM otherwise) and Piper (WASM, espeak data).
6. The animations hold 60 fps ([PERFORMANCE.md](PERFORMANCE.md)): motion/react, the word graph when it lands.

**Likely to need a fix:**

- **Microphone and speech recognition.** The recording and speaking exercises need
  `NSMicrophoneUsageDescription`, and `webkitSpeechRecognition` also `NSSpeechRecognitionUsageDescription`, in
  `src-tauri/Info.plist` (merged by Tauri). If recognition won't work in the webview, speaking falls back to
  Whisper, which is on the device anyway (`src/services/speech/recognition.ts` says what it does without one).
- **Calls to other sites** (Groq, Gemini, TMDB, news, lyrics, chart sources) now come from the origin
  `tauri://localhost`, which some services may not allow. If one is blocked, send that call through
  `tauri-plugin-http` (it makes the request from Rust, so no CORS). Keys still travel only in headers.
- **YouTube in Visio.** Embeds in a custom-scheme app can fail with an "embedding" error (153) for want of a
  referrer. Try it; the fix is a local `http://localhost` origin (`tauri-plugin-localhost`) or opening the video in
  the browser. The streaming-service extension is a Chrome extension and is not part of this.
- **Fonts, scrolling, text input** (Japanese and Arabic composing, the Hungarian ő/ű), context menus, drag and
  drop of files into the window (Tauri needs `dragDropEnabled: false` for web drag and drop, or its own events).
- **Anything that checks `navigator.userAgent` or `window.chrome`.**

### M-4 · Small things that make it feel like a Mac (only if M-3 is good)

Pick what's cheap; none is needed to "see":

- ⌘, for Settings; ⌘W closes the window but keeps the app in the Dock; ⌘Q quits; ⌘F reaches Lingua's own search.
- Dock badge with the number of cards due (Tauri's `set_badge_count`); a native notification for the daily review
  (`tauri-plugin-notification`), only if the user wants it.
- Open a `.apkg` / `.epub` / `.srt` with Lingua (file associations in `tauri.conf.json`), the same import as dragging.
- A native "Open file" dialog for imports (`tauri-plugin-dialog`) when the web one is awkward.

### M-5 · Build the app and the disk image

- `npm run mac:build` → `src-tauri/target/release/bundle/macos/Lingua.app` and `bundle/dmg/Lingua_<version>_aarch64.dmg`.
  Note the size of both.
- It is **unsigned**: the first start is right-click → Open, or `xattr -cr Lingua.app`. That is fine for this look.
- Move it to Applications, use it for a day. Does it start fast? Does it hold up? Does the backup move the user's data
  over?

### M-6 · What we learned (write-up, then the user decides)

Add a dated entry to [DECISIONS.md](DECISIONS.md) ("Lingua for Mac, 2026-…"): what worked, what needed a fix, what
doesn't work in WebKit, the app's size, how it feels. Tick this plan in the ROADMAP, and say which of these comes next:

1. **Keep going with Tauri** → a second plan, "Lingua for Mac · to ship": Apple Developer account, Developer ID +
   notarization and an updater (direct), and/or the sandbox, entitlements, privacy answers, store listing and review
   (Mac App Store).
2. **Switch to Electron** if a must-work item failed.
3. **Stop here**: Safari's File → Add to Dock already gives the PWA a window.

## Not in this plan

Signing, notarization, the sandbox, the App Store, an auto-updater, in-app purchase (what the licence server's
Lingua+ sells needs a decision before any store, because Apple wants its own purchase system for digital features),
Windows and Linux builds (Tauri could do them later), and the phone (CLAUDE.md: desktop only).

## What to check at the end (the user's way of working)

`npm run typecheck`, `npm test` and `npm run build` still pass (the web app is unchanged); the Pages deploy is
unaffected; `npm run mac:dev` and the built `.app` run; the result table below is filled in. Look at the window at
1280×800, 1440×900 and a 1366×768 laptop, light and dark.

## Result table (fill in during M-3)

| Check | Result | Note |
| --- | --- | --- |
| 1 Data kept after quit and reopen | | |
| 2 Packs, dictionaries, course | | |
| 3 PDF reader, OCR | | |
| 4 Audio, Radio, recording | | |
| 5 Whisper, Piper | | |
| 6 Smoothness (60 fps) | | |
| Speech recognition | | |
| Calls to other sites | | |
| YouTube in Visio | | |
| Text input (CJK, Arabic, ő/ű) | | |
| App size / start time | | |
