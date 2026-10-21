// Buying, claiming and keeping a plan (Lingua 5.1-2a). Stripe takes the payment on its own page;
// the licence server turns a paid checkout into a signed licence; the app keeps the licence and
// checks it offline. In test mode buying is pretend and nothing is charged.
import { migratePlan, savePlan } from '@/data/plan';
import { getSettings } from '@/data/settings';
import { LICENCE_PUBLIC_KEY, STORE, TEST_MODE } from './config';
import { verifyLicence } from './licence';

const DAY = 86_400_000;

export type Product = 'plus' | 'maxMonth' | 'maxYear';

export class LicenceError extends Error {}

/** Opens Stripe's checkout for a product, or in test mode "buys" it at once. */
export async function buy(product: Product): Promise<'pretend' | 'opened'> {
  const { meta } = await getSettings();
  if (TEST_MODE) {
    const now = Date.now();
    if (product === 'plus') await savePlan(meta, { plus: { since: now }, pretend: undefined });
    else await savePlan(meta, { max: { since: now, until: now + (product === 'maxYear' ? 365 : 31) * DAY, interval: product === 'maxYear' ? 'year' : 'month' }, pretend: undefined });
    return 'pretend';
  }
  const url = new URL(STORE.links[product]);
  // Stripe hands this back with the checkout, so a purchase can be matched to the device that made it.
  url.searchParams.set('client_reference_id', meta.deviceId);
  window.open(url, '_blank', 'noopener');
  return 'opened';
}

/** Keeps a licence after checking its signature; says what it was for. */
export async function applyLicence(licence: string): Promise<'plus' | 'max'> {
  if (!LICENCE_PUBLIC_KEY) throw new LicenceError('Purchases aren’t open yet, so there are no licences to restore.');
  const payload = await verifyLicence(licence);
  if (!payload) throw new LicenceError('That isn’t a Lingua licence, or it was changed.');
  const { meta } = await getSettings();
  if (payload.plan === 'plus') await savePlan(meta, { plus: { since: payload.issued, licence }, pretend: undefined });
  else await savePlan(meta, { max: { since: migratePlan(meta).max?.since ?? payload.issued, until: payload.until!, licence, interval: payload.interval }, pretend: undefined });
  return payload.plan;
}

async function post(path: string, body: unknown): Promise<string> {
  if (!STORE.server) throw new LicenceError('Purchases aren’t open yet.');
  const res = await fetch(`${STORE.server}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as { licence?: string; error?: string };
  if (!res.ok || !data.licence) throw new LicenceError(data.error ?? 'The licence server didn’t answer. Try again in a moment.');
  return data.licence;
}

/** After paying: Stripe sends the learner back with the checkout's id, which becomes a licence. */
export const claimCheckout = async (session: string) => applyLicence(await post('/claim', { session }));

/** Max: the newest paid-until date, when online. Quiet when it can't (the grace covers offline). */
export async function refreshMax(): Promise<void> {
  const { meta } = await getSettings();
  const licence = migratePlan(meta).max?.licence;
  if (!licence || !STORE.server || !navigator.onLine) return;
  try {
    await applyLicence(await post('/refresh', { licence }));
  } catch {
    // A failed refresh leaves the licence as it was; Max keeps its grace.
  }
}

/** Settings › Lingua+ › Restore: a licence copied from another device or the purchase email. */
export const restoreLicence = (text: string) => applyLicence(text);
