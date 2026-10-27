// Builds Sandesigning into public/sandesigning/, which GitHub Pages serves beside Lingua:
//   index.html, sandesigning.html   the standalone app, everything in one file (works offline, downloadable)
//   sandesigning.js                 the script for any web app (a tag or a bookmark)
//   SANDESIGNING.md, FORMAT.md      the setup file for any project's AI, and the file format
// Run: node sandesigning/build.ts
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { rolldown } from 'rolldown';

const here = new URL('./', import.meta.url);
const out = new URL('../public/sandesigning/', import.meta.url);
mkdirSync(out, { recursive: true });

const bundle = async (entry: string) => {
  const b = await rolldown({ input: new URL(`src/${entry}`, here).pathname.replace(/^\/([A-Z]:)/, '$1'), platform: 'browser', logLevel: 'warn' });
  const { output } = await b.generate({ format: 'iife', minify: true });
  await b.close();
  return output[0].code;
};

const { VERSION } = await import('./src/model.ts');
const app = await bundle('app.ts');
const embed = await bundle('embed.ts');

// A script's text can't hold "</script" inside an HTML page.
const safe = app.replace(/<\/script/gi, '<\\/script');
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sandesigning</title>
<meta name="description" content="A design canvas for every app: frames, shapes, widget outlines, screenshots, notes, and a brief any AI can build from.">
<meta name="generator" content="Sandesigning ${VERSION}">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6366f1"/><stop offset=".6" stop-color="#ec4899"/><stop offset="1" stop-color="#f59e0b"/></linearGradient></defs><rect width="32" height="32" rx="9" fill="url(#g)"/><text x="16" y="22" font-family="system-ui,sans-serif" font-size="17" font-weight="700" fill="#fff" text-anchor="middle">S</text></svg>')}">
<style>html,body{margin:0;height:100%;background:#f4f4f5}@media (prefers-color-scheme:dark){html,body{background:#111113}}</style>
</head>
<body>
<noscript>Sandesigning needs JavaScript.</noscript>
<script>${safe}</script>
</body>
</html>
`;
writeFileSync(new URL('index.html', out), html);
writeFileSync(new URL('sandesigning.html', out), html);
writeFileSync(new URL('sandesigning.js', out), `/* Sandesigning ${VERSION}: https://sanchour.github.io/lingua./sandesigning/ */\n${embed}`);
for (const f of ['SANDESIGNING.md', 'FORMAT.md']) copyFileSync(new URL(f, here), new URL(f, out));
const size = (s: string) => `${Math.round(Buffer.byteLength(s) / 1024)} KB`;
console.log(`Sandesigning ${VERSION}: sandesigning.html ${size(html)}, sandesigning.js ${size(readFileSync(new URL('sandesigning.js', out), 'utf8'))}`);
