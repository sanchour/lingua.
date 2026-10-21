# Lingua's licence server

Lingua 5.1-2a. A Cloudflare Worker (free tier) and the only place Stripe's secret key lives. Stripe
takes the payment on its own page (Payment Links); this server turns a paid checkout into a
**signed licence**, and the app checks the signature offline with the public key built into it.
No AI and no learner data go through here (D2).

- `POST /claim` `{ session }`: the Stripe checkout id the learner comes back with. Paid → a licence
  (`plus`, or `max` with its paid-until date and interval).
- `POST /refresh` `{ licence }`: a Max licence → the same with the newest paid-until date. The app
  calls it on start when online; Max keeps 14 days' grace offline.

Until everything below is filled in, the app stays in **test mode**: the buy buttons switch the plan
on that device and charge nothing, and Settings › Lab can pretend any plan. Test mode ends by itself
once `src/services/licence/config.ts` has the three links, the server and the public key.

## Setting it up (the user, once)

Do it all first in Stripe's **test mode** (its test cards, nothing charged), then again live.

1. **Stripe account** (stripe.com). Turn on **Stripe Tax** and register for the EU's VAT one-stop
   shop (Stripe calculates the VAT; it doesn't file it).
2. **Three products with Payment Links** (Stripe › Payment Links › New):
   - Lingua+ · €24.99 · one-time.
   - Lingua+ Max · €5.99 · monthly.
   - Lingua+ Max · €49.99 · yearly.

   For each link, under *After payment*, choose "Don't show confirmation page" and redirect to:
   `https://sanchour.github.io/lingua./settings/plus?checkout={CHECKOUT_SESSION_ID}`.
   For the one-time link, turn on "Create customers" (so the licence carries the customer).
3. **Customer portal** (Settings › Billing › Customer portal): allow cancelling and switching
   between monthly and yearly; copy its login link.
4. **The key pair:** `node server/licence/keygen.mjs`. It writes the public key into the app and
   prints the private key once.
5. **The Worker** (in this folder, with a Cloudflare account):

   ```
   npx wrangler login
   npx wrangler secret put STRIPE_SECRET_KEY
   npx wrangler secret put LICENCE_PRIVATE_KEY
   npx wrangler deploy
   ```

   Paste Stripe's secret key (Developers › API keys) for the first, and the line keygen printed
   for the second. Deploying prints the Worker's address.
6. **The app:** in `src/services/licence/config.ts`, fill in `STORE.links` (the three Payment
   Links), `STORE.portal` (the portal's login link) and `STORE.server` (the Worker's address).
   Commit and push; the site updates and test mode is over.
7. **Check it** with a Stripe test card (4242 4242 4242 4242, any future date, any CVC) while the
   keys are the test ones: buy each plan, come back to Settings › Lingua+, see it switch; cancel Max
   in the portal and see Settings say until when it runs. Then swap in the live key and links.

## Honest limits

An app that runs entirely on the device can be unlocked by someone determined to edit it. The
licence stops casual sharing, not that. The private key must never be in the repository: whoever
has it can make licences. A new key pair (`keygen.mjs --replace`) invalidates every licence sold.
