// Renders the Home Screen icons for both colour schemes from public/icons/*.svg.
// The rest (favicon, Android/desktop icons, splash screens) comes from pwa-assets.config.ts.
// Run: node scripts/icons.mjs
import sharp from 'sharp';

const out = [
  ['public/icons/logo-light-square.svg', 'public/apple-touch-icon-180x180.png'],
  ['public/icons/logo-dark-square.svg', 'public/apple-touch-icon-dark-180x180.png'],
];
for (const [src, dest] of out) {
  await sharp(src, { density: 300 }).resize(180, 180).png({ compressionLevel: 9 }).toFile(dest);
  console.log('wrote', dest);
}
