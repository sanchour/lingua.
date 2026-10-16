import {
  combinePresetAndAppleSplashScreens,
  defineConfig,
  minimal2023Preset,
} from '@vite-pwa/assets-generator/config';

const PAPER = '#FAF6F0';
const NOCTURNE = '#1F1C1A';

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: combinePresetAndAppleSplashScreens(
    {
      ...minimal2023Preset,
      maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: PAPER } },
      apple: { ...minimal2023Preset.apple, resizeOptions: { background: PAPER } },
    },
    {
      padding: 0.45,
      resizeOptions: { background: PAPER, fit: 'contain' },
      darkResizeOptions: { background: NOCTURNE, fit: 'contain' },
      linkMediaOptions: { log: false, addMediaScreen: true, basePath: process.env.BASE_PATH ?? '/', xhtml: false },
    },
    [
      'iPhone SE 4.7"',
      'iPhone XR',
      'iPhone 11 Pro Max',
      'iPhone 12 mini',
      'iPhone 12',
      'iPhone 12 Pro Max',
      'iPhone 14 Plus',
      'iPhone 14 Pro',
      'iPhone 14 Pro Max',
      'iPhone 15',
      'iPhone 16 Pro',
      'iPhone 16 Pro Max',
      'iPhone 16e',
      'iPhone 17',
      'iPhone 17 Pro Max',
      'iPhone Air',
    ],
  ),
  images: ['public/logo.svg'],
});
