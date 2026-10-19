import { describe, expect, it } from 'vitest';
import { hasInlineTranslation } from './lrclib';
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

describe('lyrics with a translation mixed in', () => {
  it('spots a translation after every line, and leaves backing vocals alone', () => {
    const mixed = ['[00:10.00] Donnez-moi une suite au Ritz, je n’en veux pas (Give me a suite at the Ritz, I don’t want it)', '[00:14.00] Des bijoux de chez Chanel, je n’en veux pas (Jewelry from Chanel, I don’t want it)', '[00:18.00] (Pa-pala, pa-pa-pala)', '[00:20.00] Donnez-moi une limousine, j’en ferais quoi ? (What would I do with a limousine?)', '[00:24.00] Offrez-moi du personnel, j’en ferais quoi ? (Give me staff, what would I do with them?)'];
    expect(hasInlineTranslation(mixed.join('\n'))).toBe(true);
    const sung = ['Je veux de l’amour, de la joie (de la joie)', 'Je veux d’la bonne humeur', 'Ce n’est pas votre argent qui fera mon bonheur', '(Pa-pala, pa-pa-pala)', 'Moi je veux crever la main sur le cœur', 'Allons ensemble, découvrir ma liberté'];
    expect(hasInlineTranslation(sung.join('\n'))).toBe(false);
  });
});
