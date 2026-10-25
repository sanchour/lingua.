// Lingua's version for every push (docs/VERSIONS.md): 0.<Lingua>.<part>-alpha.<push>, e.g. 0.5.2-alpha.3.
//   node scripts/version.ts "What this push is"            the next push in this line (alpha.N + 1)
//   node scripts/version.ts --line 0.5.3 "What this is"    a new part's first push (0.5.3-alpha.1)
//   node scripts/version.ts --release "What this is"       a part's check passed (0.5.2-alpha.N → 0.5.2)
// It writes package.json, package-lock.json and a line at the top of CHANGELOG.md, and prints the version.
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  const value = args[i + 1];
  args.splice(i, name === '--line' ? 2 : 1);
  return value ?? '';
};
const line = flag('--line');
const release = flag('--release') !== undefined;
const note = args.join(' ').trim();
if (!note) throw new Error('Say what this push is: node scripts/version.ts "Radio: stations in the language"');

const read = (file: string) => readFileSync(file, 'utf8');
const pkg = JSON.parse(read('package.json')) as { version: string };
const m = /^0\.(\d+)\.(\d+)(?:-alpha\.(\d+))?$/.exec(pkg.version);
if (!m) throw new Error(`package.json's version ${pkg.version} isn't 0.X.Y-alpha.N`);

let next: string;
if (line) {
  if (!/^0\.\d+\.\d+$/.test(line)) throw new Error('--line takes 0.X.Y');
  next = `${line}-alpha.1`;
} else if (release) next = `0.${m[1]}.${m[2]}`;
else next = m[3] ? `0.${m[1]}.${m[2]}-alpha.${Number(m[3]) + 1}` : `0.${m[1]}.${Number(m[2]) + 1}-alpha.1`;

// Only the root's version changes; JSON is rewritten with its own line endings.
const setVersion = (file: string, paths: string[][]) => {
  const raw = read(file);
  const json = JSON.parse(raw) as Record<string, unknown>;
  for (const path of paths) {
    let at = json as Record<string, unknown>;
    for (const key of path.slice(0, -1)) at = at[key] as Record<string, unknown>;
    at[path[path.length - 1]] = next;
  }
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  writeFileSync(file, JSON.stringify(json, null, 2).replace(/\n/g, eol) + eol);
};
setVersion('package.json', [['version']]);
setVersion('package-lock.json', [['version'], ['packages', '', 'version']]);

const log = read('CHANGELOG.md');
const eol = log.includes('\r\n') ? '\r\n' : '\n';
const date = new Date().toISOString().slice(0, 10);
const marker = '<!-- new versions go here -->';
if (!log.includes(marker)) throw new Error(`CHANGELOG.md has no ${marker}`);
writeFileSync('CHANGELOG.md', log.replace(marker, `${marker}${eol}- **${next}** · ${date} · ${note}`));
console.log(next);
