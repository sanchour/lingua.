import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  HIGH_CONTRAST_NOCTURNE,
  HIGH_CONTRAST_PAPER,
} from './contrast';

describe('contrast (6-25 slice 2.1)', () => {
  it('ensures all text in HIGH_CONTRAST_PAPER is >= 7:1 against all surfaces', () => {
    const surfaces = [
      HIGH_CONTRAST_PAPER.bg,
      HIGH_CONTRAST_PAPER.surface,
      HIGH_CONTRAST_PAPER.raised,
      HIGH_CONTRAST_PAPER.sunken,
    ];
    const texts = [
      { name: 'ink', color: HIGH_CONTRAST_PAPER.ink },
      { name: 'inkSoft', color: HIGH_CONTRAST_PAPER.inkSoft },
      { name: 'inkFaint', color: HIGH_CONTRAST_PAPER.inkFaint },
      { name: 'accentText', color: HIGH_CONTRAST_PAPER.accentText },
      { name: 'sageText', color: HIGH_CONTRAST_PAPER.sageText },
    ];

    for (const surface of surfaces) {
      for (const { name, color } of texts) {
        const ratio = contrastRatio(color, surface);
        expect(
          ratio,
          `Expected ${name} (${color}) against surface (${surface}) to have contrast >= 7.0, got ${ratio.toFixed(2)}`,
        ).toBeGreaterThanOrEqual(7.0);
      }
    }
  });

  it('ensures all text in HIGH_CONTRAST_NOCTURNE is >= 7:1 against all surfaces', () => {
    const surfaces = [
      HIGH_CONTRAST_NOCTURNE.bg,
      HIGH_CONTRAST_NOCTURNE.surface,
      HIGH_CONTRAST_NOCTURNE.raised,
      HIGH_CONTRAST_NOCTURNE.sunken,
    ];
    const texts = [
      { name: 'ink', color: HIGH_CONTRAST_NOCTURNE.ink },
      { name: 'inkSoft', color: HIGH_CONTRAST_NOCTURNE.inkSoft },
      { name: 'inkFaint', color: HIGH_CONTRAST_NOCTURNE.inkFaint },
      { name: 'accentText', color: HIGH_CONTRAST_NOCTURNE.accentText },
      { name: 'sageText', color: HIGH_CONTRAST_NOCTURNE.sageText },
    ];

    for (const surface of surfaces) {
      for (const { name, color } of texts) {
        const ratio = contrastRatio(color, surface);
        expect(
          ratio,
          `Expected ${name} (${color}) against surface (${surface}) to have contrast >= 7.0, got ${ratio.toFixed(2)}`,
        ).toBeGreaterThanOrEqual(7.0);
      }
    }
  });

  it('ensures onAccent has >= 7:1 contrast against accent', () => {
    const paperRatio = contrastRatio(HIGH_CONTRAST_PAPER.onAccent, HIGH_CONTRAST_PAPER.accent);
    expect(paperRatio).toBeGreaterThanOrEqual(7.0);

    const nocturneRatio = contrastRatio(HIGH_CONTRAST_NOCTURNE.onAccent, HIGH_CONTRAST_NOCTURNE.accent);
    expect(nocturneRatio).toBeGreaterThanOrEqual(7.0);
  });
});
