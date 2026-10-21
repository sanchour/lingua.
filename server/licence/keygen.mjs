// Makes the licence server's key pair (Lingua 5.1-2a), once. The public key is written into the app
// (src/services/licence/config.ts); the private key is printed once, to be stored as the Worker's
// secret and nowhere else. A new pair makes every licence sold so far invalid, so it refuses to
// replace a key that is already set unless asked with --replace.
//   node server/licence/keygen.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const file = new URL('../../src/services/licence/config.ts', import.meta.url);
const text = readFileSync(file, 'utf8');
const line = /export const LICENCE_PUBLIC_KEY: JsonWebKey \| null = (.*);/;
const found = line.exec(text);
if (!found) throw new Error('LICENCE_PUBLIC_KEY was not found in src/services/licence/config.ts');
if (found[1] !== 'null' && !process.argv.includes('--replace')) {
  console.error('A public key is already set. A new pair invalidates every licence sold; run with --replace only if that is meant.');
  process.exit(1);
}

const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const { kty, crv, x, y } = await crypto.subtle.exportKey('jwk', pair.publicKey);
const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);

writeFileSync(file, text.replace(line, `export const LICENCE_PUBLIC_KEY: JsonWebKey | null = ${JSON.stringify({ kty, crv, x, y })};`));
console.log('The public key is written into src/services/licence/config.ts (commit it).\n');
console.log('The private key, for the Worker only. Run this in server/licence and paste the line below when asked:');
console.log('  npx wrangler secret put LICENCE_PRIVATE_KEY\n');
console.log(JSON.stringify(privateJwk));
console.log('\nDon’t save it anywhere else: whoever has it can make licences.');
