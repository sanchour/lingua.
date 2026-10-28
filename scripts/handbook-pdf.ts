// Prints the Lingua Handbook (docs/handbook/handbook.html) to docs/handbook/Lingua-Design-Handbook.pdf (Lingua 7-0).
//   node scripts/handbook-pdf.ts            from the repository's root, after npm install (the fonts come from node_modules)
// It drives a Chromium already on the computer over the DevTools protocol, with Node's own WebSocket: Chrome, Edge,
// or Playwright's headless shell (set CHROME_PATH to use another). The PDF gets clickable contents and bookmarks from the headings.
// A page whose text runs past its bottom margin, or whose boxes reach past its sides, is named, and the PDF isn't written until it fits.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const source = resolve('docs/handbook/handbook.html');
const target = resolve('docs/handbook/Lingua-Design-Handbook.pdf');
if (!existsSync(source)) throw new Error('Run this from the repository root: docs/handbook/handbook.html not found.');
if (!existsSync(resolve('node_modules/@fontsource-variable/literata'))) throw new Error('The fonts come from node_modules: run npm install first.');

/** A Chromium on this computer: CHROME_PATH, Chrome, Edge, then Playwright's. */
function findChrome(): string {
  const local = process.env.LOCALAPPDATA ?? '';
  const playwright = [join(local, 'ms-playwright'), join(process.env.HOME ?? '', '.cache/ms-playwright'), join(process.env.HOME ?? '', 'Library/Caches/ms-playwright')].flatMap((dir) =>
    existsSync(dir)
      ? readdirSync(dir)
          // The headless shell first: it is all printing needs, and a full Chromium there may lack its runtime.
          .filter((d) => /^chromium(_headless_shell)?-\d+$/.test(d))
          .sort((x, y) => Number(y.includes('shell')) - Number(x.includes('shell')) || y.localeCompare(x))
          .flatMap((d) => [
            join(dir, d, 'chrome-headless-shell-win64/chrome-headless-shell.exe'),
            join(dir, d, 'chrome-headless-shell-linux64/chrome-headless-shell'),
            join(dir, d, 'chrome-headless-shell-mac-arm64/chrome-headless-shell'),
            join(dir, d, 'chrome-win64/chrome.exe'),
            join(dir, d, 'chrome-linux/chrome'),
            join(dir, d, 'chrome-mac/Chromium.app/Contents/MacOS/Chromium'),
          ])
      : [],
  );
  const candidates = [
    process.env.CHROME_PATH ?? '',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    join(local, 'Google/Chrome/Application/chrome.exe'),
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    ...playwright,
  ];
  const found = candidates.find((path) => path && existsSync(path));
  if (!found) throw new Error('No Chrome, Edge or Chromium found. Set CHROME_PATH to one.');
  return found;
}

const profile = mkdtempSync(join(tmpdir(), 'lingua-handbook-'));
const chrome = spawn(findChrome(), ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--allow-file-access-from-files', 'about:blank'], {
  stdio: ['ignore', 'ignore', 'pipe'],
});

const endpoint = await new Promise<string>((done, fail) => {
  let text = '';
  const timer = setTimeout(() => fail(new Error('Chrome did not start within 20 seconds.')), 20_000);
  chrome.stderr.on('data', (chunk: Buffer) => {
    text += chunk.toString();
    const m = /DevTools listening on (ws:\/\/\S+)/.exec(text);
    if (m) {
      clearTimeout(timer);
      done(m[1]);
    }
  });
  chrome.on('exit', () => fail(new Error(`Chrome stopped before it was ready:\n${text}`)));
});

const socket = new WebSocket(endpoint);
await new Promise((done) => socket.addEventListener('open', done, { once: true }));
let nextId = 0;
const waiting = new Map<number, { done: (value: any) => void; fail: (error: Error) => void }>();
const events: Array<{ method: string; sessionId?: string }> = [];
socket.addEventListener('message', (event) => {
  const message = JSON.parse(String(event.data));
  if (message.id && waiting.has(message.id)) {
    const { done, fail } = waiting.get(message.id)!;
    waiting.delete(message.id);
    if (message.error) fail(new Error(message.error.message));
    else done(message.result);
  } else if (message.method) events.push(message);
});
const send = (method: string, params: object = {}, sessionId?: string): Promise<any> =>
  new Promise((done, fail) => {
    const id = ++nextId;
    waiting.set(id, { done, fail });
    socket.send(JSON.stringify({ id, method, params, sessionId }));
  });
const until = async (method: string, ms = 30_000) => {
  const start = Date.now();
  while (!events.some((e) => e.method === method)) {
    if (Date.now() - start > ms) throw new Error(`Waited too long for ${method}.`);
    await new Promise((r) => setTimeout(r, 50));
  }
};

try {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Page.navigate', { url: pathToFileURL(source).href }, sessionId);
  await until('Page.loadEventFired');
  const { result } = await send('Runtime.evaluate', { expression: 'window.__handbookReady', awaitPromise: true, returnByValue: true }, sessionId);
  const report = result.value as { pages: number; overflow: number[] };
  if (report.overflow.length) {
    console.error(`These pages run past a margin (the bottom, or the sides): ${report.overflow.join(', ')}. Shorten or narrow them (they're outlined in red in a browser), then print again.`);
    const why = await send('Runtime.evaluate', { expression: 'JSON.stringify(window.__wide || [])', returnByValue: true }, sessionId);
    for (const row of JSON.parse(why.result.value as string) as string[][]) console.error(`  page ${row[0]}: ${row.slice(1).join('; ')}`);
    process.exitCode = 1;
  } else {
    const pdf = await send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true, generateDocumentOutline: true, generateTaggedPDF: true }, sessionId);
    writeFileSync(target, Buffer.from(pdf.data, 'base64'));
    console.log(`${report.pages} pages → ${target}`);
  }
} finally {
  socket.close();
  chrome.kill();
  await new Promise((r) => setTimeout(r, 300));
  rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
