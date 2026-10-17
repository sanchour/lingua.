import { describe, expect, it } from 'vitest';
import { paletteFromPixels } from '@/services/cantus/palette';
import { spotifyTrackId } from '@/services/cantus/spotify';
import { youtubeId } from '@/services/cantus/youtube';
import { planSongRounds, seeded } from './games';
import { parsePlain } from './lyrics';

const SONG = parsePlain(`Sigo cruzando ríos
Andando selvas, amando el sol
Cada día sigo sacando espinas
De lo profundo del corazón

En la noche sigo encendiendo sueños
Para limpiar con el humo sagrado
Cada recuerdo que llevo dentro
Yo te llevo dentro, hasta la raíz`);

describe('song games', () => {
  const rounds = planSongRounds(SONG, 'es', seeded(7));

  it('fills gaps with a word from the line and options from the same song', () => {
    const fills = rounds.filter((r) => r.kind === 'fill');
    expect(fills.length).toBeGreaterThan(4);
    for (const r of fills) {
      if (r.kind !== 'fill') continue;
      const line = SONG[r.line].text;
      expect(r.before + r.gap + r.after).toBe(line);
      expect(r.options[r.answer]).toBe(r.gap);
      expect(new Set(r.options.map((o) => o.toLowerCase())).size).toBe(r.options.length);
    }
  });

  it('asks to order four lines of one verse, shuffled', () => {
    const order = rounds.find((r) => r.kind === 'order');
    expect(order).toBeDefined();
    if (order?.kind !== 'order') return;
    expect(order.lines).toHaveLength(4);
    expect(order.lines.every((l, i) => i === 0 || l === order.lines[i - 1] + 1)).toBe(true);
    expect(order.shuffled).not.toEqual(order.lines);
    expect([...order.shuffled].sort()).toEqual([...order.lines].sort());
  });

  it('plans the same rounds for the same seed', () => {
    expect(planSongRounds(SONG, 'es', seeded(7))).toEqual(rounds);
  });
});

describe('song links', () => {
  it('reads YouTube links of every kind', () => {
    for (const link of ['https://youtu.be/dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10', 'https://music.youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ']) {
      expect(youtubeId(link)).toBe('dQw4w9WgXcQ');
    }
    expect(youtubeId('https://vimeo.com/123')).toBeNull();
  });

  it('reads Spotify track links and URIs', () => {
    expect(spotifyTrackId('https://open.spotify.com/intl-es/track/6habFhsOp2NvshLv26DqMb?si=abc')).toBe('6habFhsOp2NvshLv26DqMb');
    expect(spotifyTrackId('spotify:track:6habFhsOp2NvshLv26DqMb')).toBe('6habFhsOp2NvshLv26DqMb');
    expect(spotifyTrackId('https://open.spotify.com/album/6habFhsOp2NvshLv26DqMb')).toBeNull();
  });
});

describe('artwork colours', () => {
  const pixels = (rgb: [number, number, number], n = 64) => {
    const data = new Uint8ClampedArray(n * 4);
    for (let i = 0; i < n; i++) data.set([...rgb, 255], i * 4);
    return data;
  };
  it('takes the cover’s colour, lighter and darker', () => {
    const p = paletteFromPixels(pixels([200, 40, 40]));
    expect(p.base).toMatch(/^#[0-9a-f]{6}$/);
    const red = (hex: string) => parseInt(hex.slice(1, 3), 16);
    expect(red(p.base)).toBeGreaterThan(parseInt(p.base.slice(3, 5), 16));
    expect(red(p.deep)).toBeLessThan(red(p.base));
    expect(red(p.soft)).toBeGreaterThan(red(p.base));
  });
  it('gives a black-and-white cover a quiet grey', () => {
    const p = paletteFromPixels(pixels([30, 30, 30]));
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(p.base.slice(i, i + 2), 16));
    expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThan(30);
  });
});
