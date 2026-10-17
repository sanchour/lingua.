import { describe, expect, it } from 'vitest';
import { geniusSearchUrl, plainTitle, tidyLyrics } from './lyricSources';

describe('lyrics from other sources', () => {
  it('keeps only real verse breaks when every line is spaced out', () => {
    const text = 'Uno\n\nDos\n\nTres\n\nCuatro\n\n\nCinco\n\nSeis\n\nSiete\n\nOcho';
    expect(tidyLyrics(text).map((l) => l.text)).toEqual(['Uno', 'Dos', 'Tres', 'Cuatro', '', 'Cinco', 'Seis', 'Siete', 'Ocho']);
  });

  it('turns section labels into verse breaks and drops the French page heading', () => {
    expect(tidyLyrics('Paroles de la chanson X par Y\n[Verso 1]\nLa la\n[Chorus]\nLo lo').map((l) => l.text)).toEqual(['La la', '', 'Lo lo']);
  });

  it('searches by the plain title', () => {
    expect(plainTitle('Despacito (feat. Justin Bieber) - Remastered 2019')).toBe('Despacito');
    expect(geniusSearchUrl('Hasta la Raíz', 'Natalia Lafourcade')).toBe('https://genius.com/search?q=Hasta%20la%20Ra%C3%ADz%20Natalia%20Lafourcade');
  });
});
