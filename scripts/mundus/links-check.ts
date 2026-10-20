// Opens every address written into Mundus's picks (dictionaries, sites, games) and fails on a dead
// one. Searches built from titles aren't checked: they can't go stale. Run with Node 24:
//   node scripts/mundus/links-check.ts
// Big sites often turn scripts away (403, 418, 429, 503) while browsers get through: those are
// listed as "blocked", not counted as dead.
import { readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import type { Picks } from '../../src/core/mundus/types.ts';

const dir = new URL('../../src/core/mundus/picks/', import.meta.url);
const urls = new Map<string, string>();
for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
  const picks = ((await import(pathToFileURL(new URL(file, dir).pathname.replace(/^\/([A-Z]:)/, '$1')).href)) as { default: Picks }).default;
  for (const [group, list] of Object.entries(picks)) {
    if (!Array.isArray(list)) continue;
    for (const p of list) if (p.url) urls.set(p.url, `${file.replace('.ts', '')} ${group}: ${p.title}`);
  }
}

const BLOCKED = new Set([403, 418, 429, 503]);
let dead = 0;
for (const [url, where] of urls) {
  let status = 0;
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36' }, signal: AbortSignal.timeout(20_000) });
    status = res.status;
  } catch {
    status = 0;
  }
  if (status >= 200 && status < 400) continue;
  if (BLOCKED.has(status)) console.log(`blocked ${status}  ${url}  (${where})`);
  else {
    dead++;
    console.log(`DEAD    ${status || 'no answer'}  ${url}  (${where})`);
  }
}
console.log(`${urls.size} addresses, ${dead} dead.`);
process.exit(dead ? 1 : 0);
