import { describe, expect, it } from 'vitest';
import { bodySizeOf, joinAcrossPages, linesToBlocks, pagesToChapters, piecesToLines, repeatedLines } from './pdfText';
import type { PdfPiece } from './pdfText';

const piece = (str: string, x: number, y: number, size = 10, eol = false): PdfPiece => ({ str, x, y, width: str.length * size * 0.5, size, eol });

describe('piecesToLines', () => {
  it('joins pieces on one baseline, with a space where there is a gap', () => {
    const lines = piecesToLines([piece('Cada', 0, 700), piece('tarde', 24, 700), piece('paseamos.', 0, 686)]);
    expect(lines.map((l) => l.text)).toEqual(['Cada tarde', 'paseamos.']);
  });
});

describe('linesToBlocks', () => {
  const lines = piecesToLines([
    piece('Capítulo uno', 0, 760, 16, true),
    piece('El perro duerme en la ca-', 0, 730, 10, true),
    piece('sa toda la tarde y no se', 0, 717, 10, true),
    piece('mueve.', 0, 704, 10, true),
    piece('Otro párrafo empieza aquí.', 0, 680, 10, true),
    piece('12', 0, 40, 10, true),
  ]);

  it('finds headings, joins lines, undoes hyphens and drops page numbers', () => {
    expect(linesToBlocks(lines, 10, new Set())).toEqual([
      { t: 'h', text: 'Capítulo uno' },
      { t: 'p', text: 'El perro duerme en la casa toda la tarde y no se mueve.' },
      { t: 'p', text: 'Otro párrafo empieza aquí.' },
    ]);
  });

  it('drops running headers seen on many pages', () => {
    const words = ['uno', 'dos', 'tres', 'cuatro', 'cinco'];
    const page = (w: string, n: number) => piecesToLines([piece('Mi libro', 0, 800, 9, true), piece(`Texto ${w}.`, 0, 700, 10, true), piece(String(n + 1), 0, 40, 9, true)]);
    const pages = words.map(page);
    const skip = repeatedLines(pages);
    expect(linesToBlocks(pages[2], bodySizeOf(pages), skip)).toEqual([{ t: 'p', text: 'Texto tres.' }]);
  });
});

describe('chapters', () => {
  const pages = [[{ t: 'p' as const, text: 'Uno.' }], [{ t: 'p' as const, text: 'Dos.' }], [{ t: 'p' as const, text: 'Tres.' }]];

  it('starts chapters at the bookmarks', () => {
    const chapters = pagesToChapters(pages, [
      { title: 'I', page: 0 },
      { title: 'II', page: 2 },
    ]);
    expect(chapters.map((c) => [c.title, c.blocks.length])).toEqual([
      ['I', 2],
      ['II', 1],
    ]);
  });

  it('joins a paragraph cut by a page break', () => {
    const joined = joinAcrossPages([[{ t: 'p', text: 'El perro duerme en la' }], [{ t: 'p', text: 'casa.' }, { t: 'p', text: 'Fin.' }]]);
    expect(joined).toEqual([[{ t: 'p', text: 'El perro duerme en la casa.' }], [{ t: 'p', text: 'Fin.' }]]);
  });
});
