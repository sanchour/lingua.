# Deploying Lingua

The iPhone needs an HTTPS URL to install Lingua as a home-screen app (service workers, storage
persistence and the share sheet need a secure context). Lingua is a static site, so any free static
host works. GitHub Pages is set up already.

## GitHub Pages (free)

1. Create a free GitHub account and an empty repository, e.g. `lingua` (private or public; Pages on a
   private repo needs a paid plan, so make it public if you're on the free plan).
2. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push this project to the repository's `main` branch. The workflow in
   `.github/workflows/deploy.yml` builds and publishes it to `https://<user>.github.io/<repo>/`.
4. On the iPhone, open that URL in **Safari** → Share → **Add to Home Screen**.
   On Windows, open it in Edge or Chrome → the install icon in the address bar → **Install**.

Every push to `main` deploys a new version; open apps show an "Update ready" prompt.

## Local development

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build (service worker active)
```

To try the dev server on the iPhone over Wi-Fi, run `npm run dev -- --host` and open the printed
network URL. Over plain HTTP the app runs but the service worker, persistence and sharing are off,
so use the deployed URL for real device tests.
