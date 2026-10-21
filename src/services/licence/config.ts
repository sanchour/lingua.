// Where Lingua+ and Max are bought (Lingua 5.1-2a, D1: Stripe). Filled in once the user has set up
// Stripe and the licence server (server/licence/README.md); until then Lingua runs in test mode:
// the buy buttons charge nothing and Settings › Lab can pretend any plan.

export const STORE = {
  /** Stripe Payment Links, one per product (Checkout pages hosted by Stripe; no payment code here). */
  links: { plus: '', maxMonth: '', maxYear: '' },
  /** Stripe's customer portal login link: change or cancel Max, invoices. */
  portal: '',
  /** The licence server (a Cloudflare Worker): POST /claim and /refresh. */
  server: '',
};

/**
 * The licence server's public key (ECDSA P-256), written here by server/licence/keygen.mjs. The
 * app checks every licence against it, so a licence works offline and can't be made up.
 */
export const LICENCE_PUBLIC_KEY: JsonWebKey | null = null;

/** Test mode: nothing to buy from yet, so buying is pretend and nothing is charged. */
export const TEST_MODE = !STORE.server || !LICENCE_PUBLIC_KEY || !STORE.links.plus || !STORE.links.maxMonth || !STORE.links.maxYear;
