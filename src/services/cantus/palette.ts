// A song page takes its colours from the album art: the artwork is shrunk to a few pixels and the
// most colourful, typical shade becomes the page's tint (Apple's artwork allows this; it is served
// with CORS).

export interface Palette {
  /** The artwork's main colour. */
  base: string;
  /** A darker shade, for text and buttons on light paper. */
  deep: string;
  /** A light shade, for text and buttons on dark paper. */
  soft: string;
}

const hex = (r: number, g: number, b: number) => `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return hex(f(0) * 255, f(8) * 255, f(4) * 255);
}

/** Picks the palette from pixel data (RGBA): hue buckets weighted by colourfulness. */
export function paletteFromPixels(data: Uint8ClampedArray): Palette {
  const buckets = new Map<number, { w: number; r: number; g: number; b: number }>();
  let grey = { w: 0, r: 0, g: 0, b: 0 };
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (a < 128) continue;
    const [h, s, l] = rgbToHsl(r, g, b);
    if (s < 0.18 || l < 0.08 || l > 0.94) {
      grey = { w: grey.w + 1, r: grey.r + r, g: grey.g + g, b: grey.b + b };
      continue;
    }
    const key = Math.round(h / 24) % 15;
    const w = s * (1 - Math.abs(l - 0.5));
    const cur = buckets.get(key) ?? { w: 0, r: 0, g: 0, b: 0 };
    buckets.set(key, { w: cur.w + w, r: cur.r + r * w, g: cur.g + g * w, b: cur.b + b * w });
  }
  const best = [...buckets.values()].sort((a, b) => b.w - a.w)[0];
  let h: number;
  let s: number;
  if (best && best.w > 0.6) {
    [h, s] = rgbToHsl(best.r / best.w, best.g / best.w, best.b / best.w);
    s = Math.min(0.62, Math.max(0.3, s));
  } else {
    // A black-and-white cover: a warm, quiet grey.
    [h] = grey.w ? rgbToHsl(grey.r / grey.w, grey.g / grey.w, grey.b / grey.w) : [30];
    s = 0.08;
  }
  return { base: hslToHex(h, s, 0.55), deep: hslToHex(h, Math.min(0.7, s + 0.08), 0.32), soft: hslToHex(h, Math.min(0.75, s + 0.1), 0.78) };
}

/** The palette of an artwork, or null if the image can't be read. */
export function paletteOf(url: string): Promise<Palette | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
      try {
        const size = 24;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, size, size);
        resolve(paletteFromPixels(ctx.getImageData(0, 0, size, size).data));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url.replace(/\/\d+x\d+bb\.jpg$/, '/100x100bb.jpg');
  });
}
