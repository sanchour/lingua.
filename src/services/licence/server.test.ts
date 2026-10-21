// The licence server (server/licence) against a stand-in for Stripe: what it signs, the app accepts.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import worker from '../../../server/licence/src/index';
import type { Env } from '../../../server/licence/src/index';
import { verifyLicence } from './licence';

let env: Env;
let publicKey: JsonWebKey;

beforeAll(async () => {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  publicKey = await crypto.subtle.exportKey('jwk', pair.publicKey);
  env = { STRIPE_SECRET_KEY: 'test-not-a-real-key', LICENCE_PRIVATE_KEY: JSON.stringify(await crypto.subtle.exportKey('jwk', pair.privateKey)), ALLOWED_ORIGIN: 'https://sanchour.github.io' };
});

afterEach(() => vi.unstubAllGlobals());

const DAY = 86_400_000;
const periodEnd = Math.floor((Date.now() + 30 * DAY) / 1000);

/** Stripe answers by path: a checkout per id, and subscriptions per customer. */
function stripe(answers: Record<string, unknown>) {
  const fetch = vi.fn(async (url: string) => {
    const path = Object.keys(answers).find((p) => url.includes(p));
    return path ? new Response(JSON.stringify(answers[path])) : new Response('{}', { status: 404 });
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

const post = (path: string, body: unknown) => worker.fetch(new Request(`https://licence.example${path}`, { method: 'POST', body: JSON.stringify(body) }), env);

describe('the licence server', () => {
  it('turns a paid Lingua+ checkout into a licence the app accepts', async () => {
    const fetch = stripe({ 'checkout/sessions/cs_test_plus': { status: 'complete', payment_status: 'paid', mode: 'payment', customer: null, customer_details: { email: 'a@example.com' } } });
    const res = await post('/claim', { session: 'cs_test_plus' });
    const { licence } = (await res.json()) as { licence: string };
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://sanchour.github.io');
    expect(await verifyLicence(licence, publicKey)).toMatchObject({ plan: 'plus', email: 'a@example.com' });
    // The secret key goes to Stripe in a header, never in the address.
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).not.toContain('test-not-a-real-key');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-not-a-real-key');
  });

  it('gives Max its paid-until date and interval, also from Stripe’s newer item fields', async () => {
    stripe({
      'checkout/sessions/cs_test_max': {
        status: 'complete',
        payment_status: 'paid',
        mode: 'subscription',
        customer: 'cus_1',
        subscription: { status: 'active', items: { data: [{ current_period_end: periodEnd, price: { recurring: { interval: 'year' } } }] } },
      },
    });
    const { licence } = (await (await post('/claim', { session: 'cs_test_max' })).json()) as { licence: string };
    expect(await verifyLicence(licence, publicKey)).toMatchObject({ plan: 'max', customer: 'cus_1', until: periodEnd * 1000, interval: 'year' });
  });

  it('refuses an unpaid checkout, and anything that isn’t a checkout', async () => {
    stripe({ 'checkout/sessions/cs_test_open': { status: 'open', payment_status: 'unpaid', mode: 'payment', customer: null } });
    const unpaid = await post('/claim', { session: 'cs_test_open' });
    expect(unpaid.status).toBe(400);
    expect(((await unpaid.json()) as { error: string }).error).toMatch(/isn’t paid/);
    expect((await post('/claim', { session: '../customers' })).status).toBe(400);
  });

  it('refreshes Max from the customer’s subscription, and only its own licences', async () => {
    stripe({
      'checkout/sessions/cs_test_max': { status: 'complete', payment_status: 'paid', mode: 'subscription', customer: 'cus_1', subscription: { status: 'active', current_period_end: periodEnd } },
      'subscriptions?customer=cus_1': { data: [{ status: 'active', current_period_end: periodEnd + 30 * 86_400, items: { data: [{ price: { recurring: { interval: 'month' } } }] } }] },
    });
    const { licence } = (await (await post('/claim', { session: 'cs_test_max' })).json()) as { licence: string };
    const refreshed = (await (await post('/refresh', { licence })).json()) as { licence: string };
    expect((await verifyLicence(refreshed.licence, publicKey))?.until).toBe((periodEnd + 30 * 86_400) * 1000);
    const [body] = licence.split('.');
    expect((await post('/refresh', { licence: `${body}.bad` })).status).toBe(400);
  });

  it('answers the browser’s preflight and nothing but its two addresses', async () => {
    const options = await worker.fetch(new Request('https://licence.example/claim', { method: 'OPTIONS' }), env);
    expect(options.status).toBe(204);
    expect(options.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    expect((await worker.fetch(new Request('https://licence.example/'), env)).status).toBe(404);
  });
});
