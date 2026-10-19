import { describe, expect, it } from 'vitest';
import { comicSource, comicTitle, pageOrder } from '@/services/import/comic';
import { bubblesFrom, isNoise, joinLines, sentenceCase } from './bubbles';
import type { OcrParagraph } from './bubbles';

const para = (text: string, x0: number, y0: number, x1: number, y1: number, confidence = 90): OcrParagraph => ({ text, confidence, bbox: { x0, y0, x1, y1 }, lines: text.split('\n').map((t) => ({ text: t, bbox: { x0, y0, x1, y1 } })) });

describe('comic bubbles', () => {
  it('joins a bubble’s lines, mending words broken at a line’s end', () => {
    expect(joinLines(['¿DÓNDE ESTÁ EL', 'TESO-', 'RO?'], 'es')).toBe('¿DÓNDE ESTÁ EL TESORO?');
    expect(joinLines(['où est le tré-', 'sor ?'], 'fr')).toBe('où est le trésor ?');
    expect(joinLines(['宝物は', 'どこ？'], 'ja')).toBe('宝物はどこ？');
  });

  it('turns comic capitals into sentences, but keeps German nouns', () => {
    expect(sentenceCase('¿DÓNDE ESTÁ EL TESORO? ¡NO LO SÉ!', 'es')).toBe('¿Dónde está el tesoro? ¡No lo sé!');
    expect(sentenceCase('I THINK I CAN. WHERE IS IT?', 'en')).toBe('I think I can. Where is it?');
    expect(sentenceCase('ГДЕ КЛАД?', 'ru')).toBe('Где клад?');
    expect(sentenceCase('WO IST DER SCHATZ?', 'de')).toBe('WO IST DER SCHATZ?');
    expect(sentenceCase('Already normal text.', 'es')).toBe('Already normal text.');
  });

  it('keeps a capital on words the dictionary doesn’t know, likely names', () => {
    const known = new Set(['buenos', 'días', 'quieres', 'un', 'café']);
    expect(sentenceCase('¡BUENOS DÍAS, MARÍA! ¿QUIERES UN CAFÉ, PEPE?', 'es', (w) => known.has(w))).toBe('¡Buenos días, María! ¿Quieres un café, Pepe?');
  });

  it('drops bits of the drawing read as letters', () => {
    expect(isNoise('|| ~ /_', 80)).toBe(true);
    expect(isNoise('III', 80)).toBe(true);
    expect(isNoise('Hola', 30)).toBe(true);
    expect(isNoise('¡Hola!', 88)).toBe(false);
  });

  it('puts bubbles in reading order, row by row, and right to left for manga', () => {
    const page = [para('SEGUNDO', 600, 110, 900, 180), para('PRIMERO', 100, 100, 400, 170), para('TERCERO', 300, 900, 700, 980), para('~ |', 50, 500, 60, 520)];
    const es = bubblesFrom(page, 1000, 1500, 'es');
    expect(es.map((b) => b.text)).toEqual(['Primero', 'Segundo', 'Tercero']);
    expect(es[0].box[0]).toBeCloseTo(0.094, 2);
    expect(es[0].box[2]).toBeCloseTo(0.312, 2);
    const ja = bubblesFrom([para('二番', 100, 100, 300, 200), para('一番', 700, 100, 900, 200)], 1000, 1500, 'ja');
    expect(ja.map((b) => b.text)).toEqual(['一番', '二番']);
  });

  it('joins one bubble read as two paragraphs', () => {
    const page = [para('¿Y AHORA', 100, 100, 400, 140), para('QUÉ HACEMOS?', 110, 150, 390, 190)];
    expect(bubblesFrom(page, 1000, 1500, 'es').map((b) => b.text)).toEqual(['¿Y ahora qué hacemos?']);
  });
});

describe('comic files', () => {
  it('knows a comic when it sees one', () => {
    const file = (name: string, type = '') => new File([''], name, { type });
    expect(comicSource([file('Tintin.cbz')])).toBe('archive');
    expect(comicSource([file('old.cbr')])).toBe('archive');
    expect(comicSource([file('scan.pdf', 'application/pdf')])).toBe('pdf');
    expect(comicSource([file('01.jpg', 'image/jpeg'), file('02.png', 'image/png')])).toBe('images');
    expect(comicSource([file('book.epub')])).toBeNull();
  });

  it('orders pages by number and skips hidden files', () => {
    const names = ['p10.jpg', 'p2.jpg', 'p1.jpg', '__MACOSX/._p1.jpg', '.DS_Store', 'notes.txt', 'p3.webp'];
    expect(pageOrder(names.map((name) => ({ name }))).map((e) => e.name)).toEqual(['p1.jpg', 'p2.jpg', 'p3.webp', 'p10.jpg']);
  });

  it('makes a title from the file name', () => {
    expect(comicTitle('Astérix_01_-_Astérix_le_Gaulois.cbz')).toBe('Astérix 01 - Astérix le Gaulois');
  });
});
