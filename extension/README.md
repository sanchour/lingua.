# Lingua subtitles (Chrome and Edge, Manifest V3)

Two interactive subtitle lines over YouTube and other video sites. It reads the subtitle files the player loads (YouTube's json3, WebVTT, TTML),
never the video. Looking words up and saving them happen in Lingua, in a tab you keep open.

## Install (until there is a Web Store listing)

1. Open `chrome://extensions` (or `edge://extensions`) and turn on Developer mode.
2. Load unpacked, and pick this `extension/` folder.
3. Open Lingua in a tab (the live site or `localhost`), then a video with subtitles on. Turn the site's own captions on once so the player loads them.

## What it does

- Draws the learner's language and, on YouTube, YouTube's English translation of it as two lines over the picture.
- Hovering the lines pauses; a word opens a card from Lingua; Save to deck puts it in "From my reading". ← and → step by line.
- On YouTube it also hands the captions to Lingua: a video added in Visio gets them as its subtitles.

## Not checked yet

Only the reader (`parse.js`) and Lingua's side (`src/services/visio/bridge.ts`) have tests. The overlay on the real sites, above all the
streaming services, needs the learner's own accounts and an unpacked install. Netflix and Disney+ sometimes send subtitles in ways the page
script can't see; where that happens the two lines won't appear, and Visio's follow clock is the fallback.

## Files

`manifest.json` · `inject.js` (page: watches subtitle requests) · `parse.js` (reads them) · `content.js` (the overlay) ·
`background.js` (relays to a Lingua tab) · `lingua-page.js` (runs on Lingua's pages and talks to the app).
