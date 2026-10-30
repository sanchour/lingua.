// Lingua's licence server (Lingua 5.1-2a), a Cloudflare Worker: the one place Stripe's secret key
// lives. POST /claim turns a paid Stripe checkout into a signed licence; POST /refresh gives a Max
// licence its newest paid-until date. The app checks licences offline with the public key; no AI
// and no learner data goes through here. Setup: server/licence/README.md.

export interface Env {
  /** Stripe's secret key (a Worker secret): sk_test_… while testing, sk_live_… after. */
  STRIPE_SECRET_KEY: string;
  /** The private JWK that keygen.mjs printed (a Worker secret). */
  LICENCE_PRIVATE_KEY: string;
  /** The app's origin, the only page allowed to call this from a browser. */
  ALLOWED_ORIGIN?: string;
  /** A KV namespace that remembers when each checkout was first claimed (optional: without it a checkout can be claimed again at any time). */
  CLAIMED?: { get(key: string): Promise<string | null>; put(key: string, value: string): Promise<void> };
}

/** The payload the app reads (src/services/licence/licence.ts keeps the same shape). */
interface LicencePayload {
  v: 1;
  plan: 'plus' | 'max';
  email?: string;
  customer?: string;
  issued: number;
  until?: number;
  interval?: 'month' | 'year';
}

interface StripeSubscription {
  status: string;
  current_period_end?: number;
  items?: { data?: Array<{ current_period_end?: number; price?: { recurring?: { interval?: string } } }> };
}

interface StripeCheckout {
  status: string;
  payment_status: string;
  mode: 'payment' | 'subscription' | 'setup';
  customer: string | null;
  customer_details?: { email?: string | null } | null;
  subscription?: StripeSubscription | string | null;
}

const ALGORITHM = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const SIGN = { name: 'ECDSA', hash: 'SHA-256' } as const;
/** The learner who paid may claim again for this long (a lost page, a second device); after that the checkout is spent. */
export const CLAIM_WINDOW_MS = 24 * 3_600_000;
const LIVE = new Set(['active', 'trialing', 'past_due']);

/** A refusal the learner can act on (a 400 with its message), unlike a fault of ours. */
class Refusal extends Error {}

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const bin = atob(text.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(text.length / 4) * 4, '='));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function sign(env: Env, payload: LicencePayload): Promise<string> {
  const key = await crypto.subtle.importKey('jwk', JSON.parse(env.LICENCE_PRIVATE_KEY) as JsonWebKey, ALGORITHM, false, ['sign']);
  const body = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = new Uint8Array(await crypto.subtle.sign(SIGN, key, new TextEncoder().encode(body)));
  return `${body}.${toBase64Url(signature)}`;
}

/** A licence this server signed, read back (for /refresh); null if it isn't one. */
async function verify(env: Env, licence: string): Promise<LicencePayload | null> {
  const { kty, crv, x, y } = JSON.parse(env.LICENCE_PRIVATE_KEY) as JsonWebKey;
  const [body, signature, extra] = licence.trim().split('.');
  if (!body || !signature || extra !== undefined) return null;
  try {
    const key = await crypto.subtle.importKey('jwk', { kty, crv, x, y }, ALGORITHM, false, ['verify']);
    if (!(await crypto.subtle.verify(SIGN, key, fromBase64Url(signature), new TextEncoder().encode(body)))) return null;
    return JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as LicencePayload;
  } catch {
    return null;
  }
}

async function stripe<T>(env: Env, path: string): Promise<T> {
  // The secret key travels only in this header, from this server to Stripe.
  const res = await fetch(`https://api.stripe.com/v1/${path}`, { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } });
  if (res.status === 404) throw new Refusal('Stripe doesn’t know that purchase.');
  if (!res.ok) throw new Error(`Stripe answered ${res.status}`);
  return (await res.json()) as T;
}

/** Paid-until (ms) and billing interval of a subscription; Stripe's newer API keeps the period on its item. */
function period(sub: StripeSubscription): { until: number; interval: 'month' | 'year' } {
  const item = sub.items?.data?.[0];
  const end = sub.current_period_end ?? item?.current_period_end ?? 0;
  return { until: LIVE.has(sub.status) ? end * 1000 : Date.now(), interval: item?.price?.recurring?.interval === 'year' ? 'year' : 'month' };
}

export async function claim(env: Env, session: string): Promise<string> {
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(session)) throw new Refusal('That isn’t a Stripe checkout.');
  const checkout = await stripe<StripeCheckout>(env, `checkout/sessions/${session}?expand[]=subscription`);
  if (checkout.status !== 'complete' || (checkout.payment_status !== 'paid' && checkout.payment_status !== 'no_payment_required')) {
    throw new Refusal('That checkout isn’t paid yet.');
  }
  if (env.CLAIMED) {
    const first = Number(await env.CLAIMED.get(session));
    if (first && Date.now() - first > CLAIM_WINDOW_MS) throw new Refusal('That checkout was claimed a while ago. Your licence is on the device you used then; to move it, write to support.');
    if (!first) await env.CLAIMED.put(session, String(Date.now()));
  }
  const email = checkout.customer_details?.email ?? undefined;
  const customer = checkout.customer ?? undefined;
  const issued = Date.now();
  if (checkout.mode === 'payment') return sign(env, { v: 1, plan: 'plus', email, customer, issued });
  if (checkout.mode !== 'subscription' || !checkout.subscription) throw new Refusal('That checkout isn’t for Lingua.');
  const sub = typeof checkout.subscription === 'string' ? await stripe<StripeSubscription>(env, `subscriptions/${checkout.subscription}`) : checkout.subscription;
  return sign(env, { v: 1, plan: 'max', email, customer, issued, ...period(sub) });
}

export async function refresh(env: Env, licence: string): Promise<string> {
  const payload = await verify(env, licence);
  if (!payload || payload.plan !== 'max' || !payload.customer) throw new Refusal('That isn’t a Max licence.');
  const { data } = await stripe<{ data: StripeSubscription[] }>(env, `subscriptions?customer=${encodeURIComponent(payload.customer)}&status=all&limit=10`);
  const sub = data.find((s) => LIVE.has(s.status)) ?? data[0];
  if (!sub) throw new Refusal('There’s no subscription for this licence anymore.');
  const { until, interval } = period(sub);
  return sign(env, { ...payload, issued: Date.now(), until: Math.max(until, sub.status === 'canceled' ? 0 : (payload.until ?? 0)), interval });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN ?? '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    };
    const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const { pathname } = new URL(request.url);
    if (request.method !== 'POST' || (pathname !== '/claim' && pathname !== '/refresh')) return reply({ error: 'Not found.' }, 404);
    try {
      const body = (await request.json().catch(() => ({}))) as { session?: unknown; licence?: unknown };
      const licence = pathname === '/claim' ? await claim(env, String(body.session ?? '')) : await refresh(env, String(body.licence ?? ''));
      return reply({ licence });
    } catch (error) {
      if (error instanceof Refusal) return reply({ error: error.message }, 400);
      return reply({ error: 'The licence server had a problem. Try again in a moment.' }, 502);
    }
  },
};
