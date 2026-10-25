import { describe, expect, it } from 'vitest';
import { appIconUrl, MARKS } from './marks';
import { SERVICES } from './services';

describe('service marks', () => {
  it('gives every service a real mark, and no mark without a service', () => {
    const ids = new Set(SERVICES.map((s) => s.id));
    for (const s of SERVICES) expect(MARKS[s.id], s.id).toBeTruthy();
    for (const id of Object.keys(MARKS)) expect(ids.has(id), id).toBe(true);
  });

  it('draws glyphs in a 24-unit box with both colours, and asks Apple for icons by size', () => {
    for (const art of Object.values(MARKS)) {
      if ('glyph' in art) {
        expect(art.glyph).toMatch(/^[mM]/);
        expect(art.bg).toMatch(/^#[0-9A-F]{6}$/);
        expect(art.fg).toMatch(/^#[0-9A-F]{6}$/);
      } else expect(art.app).toMatch(/^Purple\d+\/v4\/.+\.png$/);
    }
    expect(appIconUrl('Purple1/v4/a/b.png', 64)).toBe('https://is1-ssl.mzstatic.com/image/thumb/Purple1/v4/a/b.png/64x64bb.png');
  });
});
