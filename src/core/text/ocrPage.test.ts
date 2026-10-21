import { describe, expect, it } from 'vitest';
import { joinLines, pageParagraphs } from './ocrPage';
import type { OcrLine } from './ocrPage';

/** A line of a page set 40 px high at 64 px intervals, starting at `x` and as wide as its text. */
const at = (row: number, text: string, { x = 120, confidence = 90 } = {}): OcrLine => ({ text, confidence, bbox: { x0: x, y0: 150 + row * 64, x1: x + text.length * 19, y1: 190 + row * 64 } });

describe('a page read by OCR', () => {
  it('joins lines and mends words broken over two', () => {
    expect(joinLines(['Era una noche os-', 'cura y fría, y la ', '  ciudad dormía.'], 'es')).toBe('Era una noche oscura y fría, y la ciudad dormía.');
    expect(joinLines(['Die Nord-', 'Süd-Verbindung'], 'de')).toBe('Die Nord- Süd-Verbindung');
    expect(joinLines(['我们今天', '去学校。'], 'zh')).toBe('我们今天去学校。');
  });

  it('finds the paragraphs by where the lines sit', () => {
    const lines = [
      at(0, 'Capítulo uno'),
      // a blank line
      at(2, 'Mi hermana trabaja en una ciudad grande.'),
      at(3, 'Cada mañana toma el tren y lee un li-'),
      at(4, 'bro nuevo. Hoy llueve mucho en la ciu-'),
      at(5, 'dad, y ella compra un paraguas rojo.'),
      // an indented first line, no gap
      at(6, 'Camina despacio hacia la oficina,', { x: 170 }),
      at(7, 'porque tiene tiempo y le gusta mirar la'),
      at(8, 'calle. Al llegar, saluda a todos.'),
      at(9, '— ¿Hay alguien?'),
      at(10, 'ñ;l ii ¡l', { confidence: 30 }),
      at(12, '12', { x: 560 }),
    ];
    expect(pageParagraphs(lines, 'es')).toEqual([
      'Capítulo uno',
      'Mi hermana trabaja en una ciudad grande. Cada mañana toma el tren y lee un libro nuevo. Hoy llueve mucho en la ciudad, y ella compra un paraguas rojo.',
      'Camina despacio hacia la oficina, porque tiene tiempo y le gusta mirar la calle. Al llegar, saluda a todos.',
      '— ¿Hay alguien?',
    ]);
  });

  it('starts again at a second column', () => {
    const lines = [
      at(0, 'La primera columna sigue aquí'),
      at(1, 'y termina en esta línea'),
      at(0, 'La segunda columna empieza', { x: 700 }),
      at(1, 'arriba otra vez y sigue', { x: 700 }),
      at(2, 'en la tercera línea', { x: 700 }),
    ];
    expect(pageParagraphs(lines, 'es')).toEqual(['La primera columna sigue aquí y termina en esta línea', 'La segunda columna empieza arriba otra vez y sigue en la tercera línea']);
  });
});
