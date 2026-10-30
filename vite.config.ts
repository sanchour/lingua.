/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves the app from /<repo>/; the deploy workflow sets BASE_PATH.
const base = process.env.BASE_PATH ?? '/';
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Whisper's engine without its 27 MB WebAssembly built in: transformers.js fetches and caches it on first use.
      'onnxruntime-web/webgpu': fileURLToPath(new URL('./node_modules/onnxruntime-web/dist/ort.webgpu.min.mjs', import.meta.url)),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt': app/UpdatePrompt.tsx applies new versions itself at a calm moment (never mid-lesson or mid-audio).
      registerType: 'prompt',
      injectRegister: false,
      pwaAssets: {
        config: true,
        overrideManifestIcons: true,
        injectThemeColor: false, // theme-color is managed per theme in index.html
      },
      manifest: {
        id: base,
        name: 'Lingua',
        short_name: 'Lingua',
        description: 'A calm, local-first studio for reading, vocabulary, listening and watching in a new language.',
        lang: 'en',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'any',
        theme_color: '#FAF6F0',
        background_color: '#FAF6F0',
        categories: ['education', 'books'],
      },
      workbox: {
        globPatterns: [
          '**/*.{js,css,html,svg,png,ico,webmanifest}',
          // UI + default reader font subsets for all ten languages (Latin incl. ő/ű, Cyrillic, Greek), so the first offline launch looks right.
          '**/plus-jakarta-sans-latin-wght-normal-*.woff2',
          '**/plus-jakarta-sans-latin-ext-wght-normal-*.woff2',
          '**/inter-{cyrillic,greek}-wght-normal-*.woff2',
          '**/literata-{latin,latin-ext,cyrillic,greek}-wght-normal-*.woff2',
        ],
        // Whisper and Piper on this device, the PDF reader and the comics' OCR are optional and large: they are cached when first used.
        globIgnores: ['**/apple-splash-*', '**/whisper.worker-*.js', '**/piper.worker-*.js', '**/pdf-*.js', '**/pdf.worker.min-*', '**/tesseract-core-*', '**/worker.min-*.js'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Every other font subset is cached the first time it is used.
            urlPattern: ({ request }) => request.destination === 'font',
            handler: 'CacheFirst',
            options: { cacheName: 'lingua-fonts', expiration: { maxEntries: 120 } },
          },
          {
            // The SQLite engine for Anki imports (685 kB) and the Whisper worker are only fetched when first needed.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && (url.pathname.endsWith('.wasm') || url.pathname.includes('/whisper.worker-')),
            handler: 'CacheFirst',
            options: { cacheName: 'lingua-wasm', expiration: { maxEntries: 6 } },
          },
          {
            // Piper's worker and espeak-ng's language data (18 MB), the first time a voice made on the device speaks.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && (url.pathname.includes('/piper.worker-') || /\/assets\/piper_phonemize-[\w-]+\.data$/.test(url.pathname)),
            handler: 'CacheFirst',
            options: { cacheName: 'lingua-piper', expiration: { maxEntries: 4 } },
          },
          {
            // pdf.js (about 400 kB) and its worker (1.2 MB) load the first time a PDF is added.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && /\/assets\/pdf(?:\.worker\.min)?-[\w-]+\.m?js$/.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'lingua-pdf', expiration: { maxEntries: 6 } },
          },
          {
            // Tesseract's engine (about 4 MB) and worker, for reading comics' speech bubbles, load the first time a comic opens.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && /\/assets\/(tesseract-core-|worker\.min-)[\w.-]+\.js$/.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'lingua-ocr', expiration: { maxEntries: 4 } },
          },
        ],
      },
    }),
  ],
  build: {
    // Separate offline catalogues so each stays below the service worker's asset-size limit.
    rolldownOptions: { output: { manualChunks: (id) => { const locale = /\/core\/i18n\/(es|fr|de|ru|zh|ar)\.json$/.exec(id); return locale ? `interface-${locale[1]}` : undefined; } } },
    target: 'es2022',
  },
  // Module workers: Whisper's engine loads its WebAssembly with dynamic imports.
  worker: { format: 'es' },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'sandesigning/src/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
  },
});
