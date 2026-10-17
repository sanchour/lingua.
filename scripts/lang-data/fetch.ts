// Downloads the raw sources for every pack (or the codes given as arguments) into scripts/.cache.
// Files that are already complete are skipped, so the script can be re-run safely.
import { execFileSync } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { CACHE_DIR, frequencyFile, frequencyUrl, kaikkiFile, kaikkiUrl, leipzigFile, PACK_SOURCES } from './sources.ts';
import type { PackSource } from './sources.ts';

/** Big downloads sometimes drop half way: try again a few times before giving up. */
async function download(url: string, target: URL): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await downloadOnce(url, target);
    } catch (e) {
      if (attempt >= 5) throw e;
      console.log(`  retrying ${url} (${e instanceof Error ? e.message : e})`);
      await new Promise((r) => setTimeout(r, 5000 * attempt));
    }
  }
}

async function downloadOnce(url: string, target: URL): Promise<void> {
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

/**
 * A Leipzig corpus's word list ("id, word, count", most frequent first) in FrequencyWords' format
 * ("word count"), so the pack builder reads every language the same way.
 */
function leipzigToFrequency(s: PackSource): void {
  const out = fileURLToPath(frequencyFile(s));
  if (existsSync(out)) return;
  const dir = fileURLToPath(new URL(`leipzig-${s.code}/`, CACHE_DIR));
  mkdirSync(dir, { recursive: true });
  // Relative paths: GNU tar reads "C:\…" as a remote host.
  execFileSync('tar', ['-xzf', fileURLToPath(leipzigFile(s)).split(/[\\/]/).pop()!, '-C', `leipzig-${s.code}`], { cwd: fileURLToPath(CACHE_DIR) });
  const find = (d: string): string | null => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = `${d}/${e.name}`;
      if (e.isDirectory()) {
        const f = find(p);
        if (f) return f;
      } else if (e.name.endsWith('-words.txt')) return p;
    }
    return null;
  };
  const words = find(dir);
  if (!words) throw new Error(`No word list in ${s.leipzig}`);
  const rows = readFileSync(words, 'utf8')
    .split('\n')
    .map((l) => l.split('\t'))
    .filter((r) => r.length >= 3 && /\p{L}/u.test(r[1]))
    .map((r) => [r[1], Number(r[2])] as const)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50_000);
  writeFileSync(out, rows.map(([w, n]) => `${w} ${n}`).join('\n') + '\n');
  rmSync(dir, { recursive: true, force: true });
  console.log(`✓ freq-${s.code}.txt from ${s.leipzig} (${rows.length} words)`);
}

// Small files first, then the dictionaries from smallest to largest.
for (const s of sources) {
  if (s.leipzig) {
    await download(frequencyUrl(s), leipzigFile(s));
    leipzigToFrequency(s);
  } else {
    await download(frequencyUrl(s), frequencyFile(s));
  }
}
const order = ['sw', 'id', 'nb', 'el', 'ko', 'nl', 'sv', 'tr', 'ja', 'ar', 'hu', 'pt', 'fr', 'it', 'ru', 'es', 'de', 'la', 'zh', 'en'];
for (const s of [...sources].sort((a, b) => order.indexOf(a.code) - order.indexOf(b.code))) {
  await download(kaikkiUrl(s), kaikkiFile(s));
}
console.log('All sources downloaded.');
