// A licence is "<payload>.<signature>", both base64url: the payload is JSON, the signature ECDSA
// P-256 with SHA-256 over the payload's text, made by the licence server (server/licence) with its
// private key. The app only ever checks one, with the public key, so this works offline.
import { LICENCE_PUBLIC_KEY } from './config';

export interface LicencePayload {
  v: 1;
  plan: 'plus' | 'max';
  /** The buyer's email, shown in Settings › Lingua+. */
  email?: string;
  /** Stripe's customer id, which Max is refreshed by. */
  customer?: string;
  issued: number;
  /** Max: paid until (ms). */
  until?: number;
  interval?: 'month' | 'year';
}

const ALGORITHM = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const SIGN = { name: 'ECDSA', hash: 'SHA-256' } as const;

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const b64 = text.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(text.length / 4) * 4, '=');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

const isPayload = (p: unknown): p is LicencePayload => {
  const o = p as Partial<LicencePayload> | null;
  return Boolean(o) && o!.v === 1 && (o!.plan === 'plus' || o!.plan === 'max') && typeof o!.issued === 'number' && (o!.plan === 'plus' || typeof o!.until === 'number');
};

/** The licence's payload if its signature holds, else null (no key yet, edited, or not a licence). */
export async function verifyLicence(licence: string, publicKey: JsonWebKey | null = LICENCE_PUBLIC_KEY): Promise<LicencePayload | null> {
  if (!publicKey) return null;
  const [body, signature, extra] = licence.trim().split('.');
  if (!body || !signature || extra !== undefined) return null;
  try {
    const key = await crypto.subtle.importKey('jwk', publicKey, ALGORITHM, false, ['verify']);
    const ok = await crypto.subtle.verify(SIGN, key, fromBase64Url(signature), new TextEncoder().encode(body));
    if (!ok) return null;
    const payload: unknown = JSON.parse(new TextDecoder().decode(fromBase64Url(body)));
    return isPayload(payload) ? payload : null;
  } catch {
    return null;
  }
}

/** Signs a payload (the server's half; here for tests and the key tool). */
export async function signLicence(payload: LicencePayload, privateKey: JsonWebKey): Promise<string> {
  const key = await crypto.subtle.importKey('jwk', privateKey, ALGORITHM, false, ['sign']);
  const body = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = new Uint8Array(await crypto.subtle.sign(SIGN, key, new TextEncoder().encode(body)));
  return `${body}.${toBase64Url(signature)}`;
}
