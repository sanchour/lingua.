# Sandesigner 1.1: set-up file for any project

Put this file in a project's root and say to the AI working there (Claude, ChatGPT, Gemini, Copilot, Cursor …):

> Read SANDESIGNER.md (or SANDESIGNING.md) and set up Sandesigner in this project, the way it says.

## What Sandesigner is

A design canvas for working on an app's look with an AI. You get:

- frames, shapes, text with any font, pens, sticky notes and icons;
- widget outlines for laying out a screen;
- screenshots of the app (or of other apps, as templates), with numbered design notes pinned on them.

It exports a **brief**: Markdown that lists every note by priority, with what each note is on and the layout in numbers. It also exports a picture, and a `.sandesign` file of the whole canvas.

- **App:** https://sanchour.github.io/lingua./sandesigning/ (or the downloaded `sandesigner.html`, which works offline)
- **Script for web apps:** https://sanchour.github.io/lingua./sandesigning/sandesigner.js
- **File format:** https://sanchour.github.io/lingua./sandesigning/FORMAT.md

## For the AI: setting it up

Do these steps, then tell the person what you did and how to open it. Change nothing else in the project.

### 1. Add the button (web apps only)

A small **Design** button in a corner opens the canvas (Alt Shift D does too). The camera beside it captures the page with every element's box, so a note knows exactly which element it is on.

Add `sandesigning.js` so it loads **only in development**, never for real users. Use the project's own way of telling development apart:

- **Vite** (any framework), in `index.html` before `</body>`:
  ```html
  <script type="module">
    if (import.meta.env.DEV) {
      const s = document.createElement('script');
      s.src = 'https://sanchour.github.io/lingua./sandesigning/sandesigning.js';
      document.body.appendChild(s);
    }
  </script>
  ```
- **Next.js:** in the root layout, `{process.env.NODE_ENV === 'development' && <Script src="https://sanchour.github.io/lingua./sandesigning/sandesigning.js" strategy="afterInteractive" />}` (`import Script from 'next/script'`).
- **Anything else** (plain HTML, Django, Rails, PHP, Astro, SvelteKit …): the same `<script src>`, inside whatever the templates use for "development only". If nothing fits, load it only when `location.hostname` is `localhost` or `127.0.0.1`.
- **Offline, or a strict Content-Security-Policy:**
  1. Download `sandesigning.js` into the project's development-only static folder.
  2. Load it from there.
  3. Note in the project's instructions that it's a copy. It doesn't update by itself.

`data-position="bottom-left"` on the script tag moves the button. `data-launcher="off"` hides it, leaving Alt Shift D and `window.sandesigning.open()`.

**Phone apps** (iOS, Android, React Native, Flutter …) can't load the script. Skip this step. The person takes screenshots on the phone and pastes or drops them into the Sandesigning app.

### 2. Make a `design/` folder

Create `design/` in the project root with a `README.md` saying:

> Design briefs from Sandesigning: `name.md` (the brief), `name.png` (the picture, numbers are the notes), `name.sandesign` (the canvas; open it at https://sanchour.github.io/lingua./sandesigning/). Newest first.

Keep this file (`SANDESIGNING.md`) in `design/` too.

### 3. Teach future sessions

Add this section to the project's instructions for AI, whichever it has: `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `.cursor/rules` or `.cursorrules`. If there's none, create `AGENTS.md`.

```markdown
## Design briefs (Sandesigning)

Design changes come as Sandesigning briefs, pasted into the chat or saved in `design/` (`name.md` + `name.png`, sometimes `name.sandesign`; `design/SANDESIGNING.md` explains them).

When given one:
1. Read the brief (and look at the picture). Work through the open notes by priority (Must, then Should, then Could).
2. Each note says what it is on: a readable name, a CSS selector and the React component when the page was captured. Find that in the code. Selectors are hints from one moment, not stable ids.
3. Frames list the wanted layout. Positions are x, y from the frame's top-left, then width × height, in CSS pixels. Outlines ("button outline" …) are placeholders for real components. Follow the project's own design system, tokens and components over raw numbers when they nearly match.
4. Don't change what no note or frame asks for. Ask about notes marked Question before building them.
5. Afterwards, report per note number what was done, and what wasn't and why.
```

### 4. Check it

1. Start the app in development.
2. Make sure the **Design** button shows and opens the canvas.
3. Make sure the production build doesn't include the script.

## For the AI: reading a brief or a .sandesign file

The brief explains itself.

A `.sandesign` file is JSON:

- `nodes` are in drawing order.
- Each node has a `type` (`frame`, `rect`, `ellipse`, `line`, `path`, `text`, `sticky`, `pin`, `image`, `widget`, `icon`) and `x, y, w, h` in canvas pixels.
- `parent` is the frame a node is in.
- `pin` nodes are the notes. Their `target` says what they are on.
- `assets` holds the pictures as data URLs.

FORMAT.md (link above) has every field.
