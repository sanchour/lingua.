# The Sandesigner file format

For people and AI models reading what Sandesigner exports. Version 1.1.

Sandesigner exports a canvas three ways:

- **`name.sandesign`** — the whole canvas as JSON, pictures included. It opens again in Sandesigner anywhere.
- **`name.md`** — the brief: the notes and the layout written out in Markdown. This is usually what an AI should read.
- **`name.png` / `name.svg`** — a picture of the canvas. The numbered circles on it are the brief's notes.

## The brief (`.md`)

- **Notes:** listed first, open ones by priority (Must, Should, Could), then the ones marked done. Each note has:
  - its number, as on the picture;
  - its priority and kinds: Layout, Spacing, Size, Colour, Type, Words, Remove, Add, Behaviour, Question;
  - the words;
  - where it is, and what it is on. "On" can be:
    - an element of a captured page: a readable name, a CSS selector, the React component in development builds, and the page's address;
    - a shape on the canvas.
- **Frames:** one section each, e.g. "Desktop · 1440 × 900", listing what's inside.
  - Positions are `x, y` from the frame's top-left, then `width × height`, in CSS pixels.
  - Nesting shows frames inside frames.
- **Screenshots** show the app as it is now. What is drawn over them shows what is wanted.
- **Outlines** ("button outline", "card outline", "nav outline" …) are placeholders. Build a real component of that kind there, with the label as its text or purpose.
- **Text** entries give the words, font, size/weight, colour and alignment. Use them as written.
- **Icons** are named from [Lucide](https://lucide.dev). Use the same name, or the closest one in the project's own icon set.

## The `.sandesign` file

A JSON object:

```json
{
  "format": "sandesign", "version": 1,
  "id": "k3j2h1g0", "title": "Settings redesign", "created": 1793000000000, "updated": 1793000000000,
  "nodes": [ … ],
  "assets": { "a1b2c3d4": "data:image/png;base64,…" },
  "dom": { "a1b2c3d4": [ { "x": 0, "y": 0, "w": 1440, "h": 64, "name": "header", "selector": "body > header", "component": "TopBar", "depth": 2 } ] },
  "view": { "x": 0, "y": 0, "zoom": 1 },
  "settings": { "grid": false, "snap": true, "notesText": true }
}
```

- **`nodes`** are in drawing order: later ones are on top.
- Every node has `id`, `type`, and `x, y, w, h` in canvas pixels.
  - Canvas pixels are absolute. To get a position inside a frame, subtract the frame's `x, y`.
  - Some fields are optional on every node: `name`, `parent` (the id of the frame it is in), `opacity` (0–1), `hidden`, `locked`.
- **`assets`** are pictures as data URLs, keyed by id.
- **`dom`** holds a captured page's elements, keyed by the screenshot's asset id.
  - Their boxes are in the page's CSS pixels.
  - Multiply by the picture node's `scale` to get the picture's pixels.

| `type` | What it is | Its own fields |
| --- | --- | --- |
| `frame` | A screen or board; holds children through their `parent` | `fill`, `stroke`, `strokeWidth`, `radius`, `clip` (cuts off what spills out), `device` (`desktop` 1440×900, `laptop` 1366×768, `small` 1280×800, `tablet` 834×1194, `phone` 390×844, `android` 412×915, `square` 1080×1080) |
| `rect`, `ellipse` | Shapes | `fill` (`"none"` for none), `stroke`, `strokeWidth`, `radius`, `dash` |
| `line` | A line or arrow | Runs from `(x, y)` to `(x + w, y + h)`; `w` and `h` can be negative. `stroke`, `strokeWidth`, `start` / `end` (`none`, `arrow`, `dot`), `dash` |
| `path` | A pen or highlighter stroke | `points` (x, y, x, y … drawn in a `bw × bh` box, stretched to `w × h`), `stroke`, `strokeWidth`, `highlight` |
| `text` | Words | `text`, `font`, `size`, `weight`, `color`, `align`, `lineHeight`, `italic`. With `auto` the width follows the words; otherwise they wrap at `w` |
| `sticky` | A sticky note | `text`, `fill` |
| `pin` | A numbered design note; its point is the box's centre | `n`, `text`, `kinds`, `priority` (`Must`, `Should`, `Could`), `done`, `target` `{ name, selector?, component?, page? }` |
| `image` | A picture, screenshot or cut-out | `asset`, `nw` × `nh` (its pixels), `crop` (the part shown, in its pixels), `source` (page address or file), `scale` (pixels per CSS pixel) |
| `widget` | An outline standing for a component | `widget` (`button`, `input`, `search`, `card`, `nav`, `sidebar`, `tabbar`, `list`, `table`, `image`, `video`, `chart`, `heading`, `text`, `toggle`, `checkbox`, `slider`, `chip`, `avatar`, `icon`, `modal`, `tabs`), `label`, `fill`, `stroke`, `radius` |
| `icon` | A Lucide icon | `icon` (its Lucide name), `color`, `strokeWidth` |

## Copy and paste

Copying in Sandesigning puts `{ "sandesigning": 1, "nodes": […], "assets": {…}, "dom": {…} }` on the clipboard as text.

Paste it into any other Sandesigning canvas, in any browser or app, and it arrives with its pictures.
