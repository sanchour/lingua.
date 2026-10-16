// Downloads the raw sources for every pack (or the codes given as arguments) into scripts/.cache.
// Files that are already complete are skipped, so the script can be re-run safely.
import { createWriteStream, existsSync, mkdirSync, renameSync, statSync } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { CACHE_DIR, frequencyFile, frequencyUrl, kaikkiFile, kaikkiUrl, PACK_SOURCES } from './sources.ts';

async function download(url: string, target: URL): Promise<void> {
  const path = fileURLToPath(target);
  const head = await fetch(url, { method: 'HEAD' });
  const expected = Number(head.headers.get('content-length') ?? 0);
  if (existsSync(path) && expected && statSync(path).size === expected) {
    console.log(`✓ ${path.split(/[\\/]/).pop()} (cached)`);
    return;
  }
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`${url} → HTTP ${res.status}`);
  const total = Number(res.headers.get('content-length') ?? 0);
  let received = 0;
  let lastLog = 0;
  const body = Readable.fromWeb(res.body as import('node:stream/web').ReadableStream);
  body.on('data', (chunk: Buffer) => {
    received += chunk.length;
    if (total && Date.now() - lastLog > 5000) {
      lastLog = Date.now();
      console.log(`  ${path.split(/[\\/]/).pop()}: ${((received / total) * 100).toFixed(0)}% of ${(total / 1e6).toFixed(0)} MB`);
    }
  });
  await pipeline(body, createWriteStream(`${path}.part`));
  renameSync(`${path}.part`, path);
  console.log(`✓ ${path.split(/[\\/]/).pop()} (${(received / 1e6).toFixed(1)} MB)`);
}

const wanted = process.argv.slice(2);
const sources = wanted.length ? PACK_SOURCES.filter((s) => wanted.includes(s.code)) : PACK_SOURCES;
mkdirSync(CACHE_DIR, { recursive: true });

// Small files first, then the dictionaries from smallest to largest.
for (const s of sources) await download(frequencyUrl(s), frequencyFile(s));
const order = ['el', 'sv', 'hu', 'pt', 'fr', 'it', 'ru', 'es', 'de', 'en'];
for (const s of [...sources].sort((a, b) => order.indexOf(a.code) - order.indexOf(b.code))) {
  await download(kaikkiUrl(s), kaikkiFile(s));
}
console.log('All sources downloaded.');
