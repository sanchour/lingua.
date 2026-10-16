import { describe, expect, it } from 'vitest';
import { countWords, sentenceAt } from '@/core/text/tokenizer';
import { parseCsv } from './csv';
import { parseGoodreadsCsv } from './goodreads';
import { decodeText, splitIntoParts, textToChapters } from './text';

describe('parseCsv', () => {
  it('handles quotes, doubled quotes, commas and newlines in fields', () => {
    const rows = parseCsv('a,b,c\r\n"x, y","he said ""hi""","line\nbreak"\n');
    expect(rows).toEqual([
      ['a', 'b', 'c'],
      ['x, y', 'he said "hi"', 'line\nbreak'],
    ]);
  });
});

describe('parseGoodreadsCsv', () => {
  it('reads shelves, ratings and ISBNs', () => {
    const csv =
      'Book Id,Title,Author,ISBN,ISBN13,My Rating,Exclusive Shelf,Date Read,Bookshelves\n' +
      '123,"Мастер и Маргарита",Михаил Булгаков,"=""0141180145""","=""9780141180144""",5,read,2025/03/01,"russian, favourites"\n' +
      '456,Το καπλάνι της βιτρίνας,Άλκη Ζέη,,,0,to-read,,\n';
    const books = parseGoodreadsCsv(csv);
    expect(books).toHaveLength(2);
    expect(books[0]).toMatchObject({ title: 'Мастер и Маргарита', isbn13: '9780141180144', rating: 5, shelf: 'read', shelves: ['russian', 'favourites'] });
    expect(books[1]).toMatchObject({ shelf: 'to-read', rating: undefined });
  });

  it('rejects other CSV files', () => {
    expect(() => parseGoodreadsCsv('front,back\nдом,house\n')).toThrow();
  });
});

describe('decodeText', () => {
  it('reads UTF-8 and falls back to Windows-1251 for Russian', () => {
    expect(decodeText(new TextEncoder().encode('﻿Привет'), 'ru')).toBe('Привет');
    const cp1251 = new Uint8Array([0xcf, 0xf0, 0xe8, 0xe2, 0xe5, 0xf2]); // "Привет"
    expect(decodeText(cp1251, 'ru')).toBe('Привет');
  });
});

describe('textToChapters / splitIntoParts', () => {
  it('splits chapters at chapter headings in several languages', () => {
    const text = 'Intro line.\n\nГлава 1\n\nПервый абзац.\n\nВторой абзац.\n\nΚεφάλαιο 2\n\nΚείμενο.';
    const chapters = textToChapters(text, 'Book');
    expect(chapters.map((c) => c.title)).toEqual(['Book', 'Глава 1', 'Κεφάλαιο 2']);
    expect(chapters[1].blocks).toEqual([
      { t: 'h', text: 'Глава 1' },
      { t: 'p', text: 'Первый абзац.' },
      { t: 'p', text: 'Второй абзац.' },
    ]);
  });

  it('treats single line breaks as paragraphs when a file has no blank lines', () => {
    expect(textToChapters('one\ntwo\nthree')[0].blocks).toHaveLength(3);
  });

  it('splits long chapters into parts at paragraph boundaries', () => {
    const blocks = Array.from({ length: 10 }, (_, i) => ({ t: 'p' as const, text: `word `.repeat(400) + i }));
    const parts = splitIntoParts({ title: 'Long', blocks }, (t) => countWords(t, 'en'), 1000);
    expect(parts.map((p) => p.blocks.length)).toEqual([2, 2, 2, 2, 2]);
    expect(parts.every((p) => p.wordCount <= 1000)).toBe(true);
  });
});

describe('sentenceAt', () => {
  it('returns the sentence containing an offset', () => {
    const text = 'Он пришёл домой. Она читала книгу! Было тихо.';
    expect(sentenceAt(text, text.indexOf('книгу'), 'ru')).toBe('Она читала книгу!');
  });
});
