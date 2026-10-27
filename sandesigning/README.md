# Sandesigning

A design canvas for every app you work on. Use it to:

- lay out screens with frames, shapes, text, pens, icons and widget outlines;
- build on screenshots of your app, other apps or templates, with numbered design notes;
- hand the result to any AI model as a brief it can build from.

- **Use it:** https://sanchour.github.io/lingua./sandesigning/
- **Download:** the same page, File › Use it in other projects › Download `sandesigning.html`. It's one file and works offline.
- **In a web app:** `<script src="https://sanchour.github.io/lingua./sandesigning/sandesigning.js" defer></script>`, in development only. It adds a **Design** button and Alt Shift D; the camera beside the button captures the page.
- **In any project, through its AI:** put [SANDESIGNING.md](SANDESIGNING.md) in the project and say *"Read SANDESIGNING.md and set up Sandesigning in this project."*
- **For AI models:** [FORMAT.md](FORMAT.md) describes the brief and the `.sandesign` file.

## What it does

- **Tools**, one key each:
  - Select V, Hand H (or hold Space)
  - Frame F (device sizes), Rectangle R, Ellipse O, Line L, Arrow ⇧L
  - Pen P, Highlighter ⇧P, Eraser E
  - Text T, Sticky note S, Design note N
  - Widget outline W, Icon K, Picture I, Cut out C
- **Canvas:**
  - Shift-select, marquee, Alt-drag to copy.
  - Move, resize (Shift keeps the shape, Alt works from the middle), arrows to nudge.
  - Snapping with guides, a grid, undo and redo.
  - Layers you can drag, hide and lock.
  - Align and space out, front and back, Ctrl Alt G to put things in a frame.
- **Look:** fill, stroke, corners, opacity (1 … 0), dashes and arrowheads. Fonts: system fonts, 27 Google Fonts, or any font on the computer, with size, weight, line height and alignment.
- **Screenshots and templates:**
  - Paste (Ctrl V) or drop pictures.
  - Capture the page in a web app. Every element's box comes too: hold Alt to see them, Alt-click to lift one out and move it.
  - Cut out any part of any picture.
  - Seven starter templates.
  - Save your own templates and pictures to the library.
- **Design notes:** numbered pins with priority (Must, Should, Could) and kinds, the same as Lingua's design notes. A note knows what it is on.
- **Shortcuts:** Ctrl K finds every action, ? shows them all, and every button's tooltip shows its key.
- **Export:**
  - the brief for AI (Ctrl ⇧ C copies it, Ctrl B shows it);
  - a picture (Ctrl ⇧ X copies one);
  - PNG, each frame as PNG, SVG;
  - the `.sandesign` file (Ctrl S).
- **Import:** `.sandesign` files, and paste between canvases. Canvases are kept in the browser.

## Building

`npm run sandesigning` (or `node sandesigning/build.ts`) bundles `src/` into `public/sandesigning/`, and GitHub Pages serves it from there:

- `index.html` and `sandesigning.html`: the same single-file app;
- `sandesigning.js`: the script;
- copies of `SANDESIGNING.md` and `FORMAT.md`.

Commit the built files with the source.

Other commands:

- `npm run typecheck` checks it.
- `npx vitest run sandesigning` tests it.
- `node sandesigning/scripts/icons.ts` remakes the icon set from Lucide.

It has no dependencies and no React, so it can move to its own repository whenever that's wanted.

## The code

| File | What's in it |
| --- | --- |
| `model.ts` | The document, its nodes and the geometry |
| `render.ts` | Every node as SVG; PNG and SVG export |
| `editor.ts` | The canvas: view, tools, selecting, moving, resizing, snapping, text, history, saving |
| `studio.ts` | Everything around it: panels, menus, palette, shortcuts, clipboard, pictures, capture, files |
| `brief.ts` | The Markdown brief |
| `capture.ts` | The tab screenshot and the page's elements |
| `library.ts` | Devices, widgets, fonts, templates |
| `store.ts` | IndexedDB |
| `keys.ts` | Key combinations |
| `index.ts`, `app.ts`, `embed.ts` | The door, the standalone page, the script |
