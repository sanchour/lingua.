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
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
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
        globIgnores: ['**/apple-splash-*'],
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
            // The SQLite engine for Anki imports (685 kB) is only fetched when first needed.
            urlPattern: ({ url }) => url.pathname.endsWith('.wasm'),
            handler: 'CacheFirst',
            options: { cacheName: 'lingua-wasm', expiration: { maxEntries: 4 } },
          },
        ],
      },
    }),
  ],
  build: {
    target: 'es2022',
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
  },
});
