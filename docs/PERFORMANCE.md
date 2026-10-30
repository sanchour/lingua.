# Performance budget — 60 fps minimum

Target: every interaction and animation holds **60 fps** on a recent iPhone and a mid-range Windows
laptop. Note that Safari on iPhone renders web content at most at 60 Hz (even on ProMotion screens),
so 60 fps is the ceiling there; desktop browsers follow the monitor's refresh rate (120/144 Hz).

## Budgets

| Metric | Budget |
|--------|--------|
| Frame time during animation | ≤ 16.7 ms (p95), no frame > 33 ms |
| Tap / click → visual response | < 50 ms (pressed state is CSS, instant) |
| Hover word → tooltip (Phase 2) | < 20 ms (in-memory lookup) |
| Route change → first content | < 100 ms after first load (sections are code-split) |
| Cold start (cached PWA) → interactive | < 1.5 s on iPhone |
| Main-thread task | < 50 ms; heavy parsing goes to a Web Worker |

## Rules

1. **Animate only `transform` and `opacity`.** Never animate width/height/top/left/margin. Layout
   changes use Motion `layout` (FLIP: one layout, then a transform animation).
2. **Springs come from `design/motion.ts`.** No ad-hoc durations; `MotionConfig reducedMotion="user"`
   respects the system setting.
3. **No per-frame React renders.** Things that change every frame (playback time, FPS meter, karaoke
   highlight) write to the DOM through refs or Motion values, never `setState` at 60 Hz.
4. **Event delegation for large lists** (reader words, transcripts): one listener per container,
   elements identified by `data-*` attributes.
5. **Big documents are windowed**: `content-visibility: auto` on paragraphs / list rows, virtualisation
   for lists over ~200 rows, chapter-at-a-time rendering in the reader.
6. **Blur sparingly.** `backdrop-filter` only on small chrome (tab bar, header), never on full-screen
   layers.
7. **Workers for parsing** (EPUB, `.apkg`, dictionary install, Whisper). Dexie writes in batches.
8. **Lazy-load features** (route-level code splitting); the device lab and every section are separate
   chunks.
9. **Measure.** Ordo → Performance → "FPS monitor" shows a live overlay; Ordo → Device lab runs a
   5-second animation benchmark and reports average fps, p95 frame time and dropped frames.
   Every phase ends with this check on both devices.
10. **Zero-jank startup pipeline.** Non-critical background work (checking journey milestones,
    preloading code-split section chunks, and full-table index scans) is deferred until 3.5–4 seconds
    after startup so initial route mounts and card entrance spring animations hold 60/120 fps cleanly.

## macOS Low Power Mode & 30 Hz Throttling

When **Low Power Mode** is enabled on macOS (*System Settings › Battery › Low Power Mode*), the OS
intentionally throttles Safari, WebKit, and Tauri WebViews by capping hardware `requestAnimationFrame`
dispatch from 60 Hz / 120 Hz down to **30 Hz** to preserve battery life.

- **Detection**: The live FPS monitor (`PerfHud`) and the Smoothness benchmark detect this clean, uniform
  30 Hz cadence (intervals consistently ~33.3 ms with 0 dropped frames) and display `30 fps (LPM)` with
  an amber indicator and tooltip instead of treating it as application lag.
- **Full rate**: To run at 60 fps or 120 fps (ProMotion), set macOS *Low Power Mode* to *Never* or
  *Only on Battery* (while plugged in). Lingua will immediately render at the monitor's full 60/120 Hz.
