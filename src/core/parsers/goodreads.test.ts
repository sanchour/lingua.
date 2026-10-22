import { describe, expect, it } from 'vitest';
import { goodreadsTime, inPublicDomain, parseGoodreadsCsv, plainTitle, toGoodreadsCsv } from './goodreads';

describe('Goodreads shelves', () => {
  it('reads the dates and the year a book was first published', () => {
    const csv = [
      'Book Id,Title,Author,ISBN,ISBN13,My Rating,Year Published,Original Publication Year,Date Read,Date Added,Bookshelves,Exclusive Shelf',
      '3836,"Don Quixote (Don Quijote, #1-2)",Miguel de Cervantes Saavedra,="0060934344",="9780060934347",4,2003,1605,2021/03/07,2020/12/24,"classics, spanish",read',
      '77203,The Kite Runner,Khaled Hosseini,,,0,2004,,,2022/01/02,to-read,to-read',
    ].join('\n');
    const [quixote, kite] = parseGoodreadsCsv(csv);
    expect(quixote).toMatchObject({ year: 1605, dateRead: '2021/03/07', dateAdded: '2020/12/24', shelves: ['classics', 'spanish'] });
    expect(kite).toMatchObject({ year: 2004, rating: undefined, dateRead: undefined, isbn13: undefined });
    expect(goodreadsTime('2021/03/07')).toBe(new Date(2021, 2, 7).getTime());
    expect(goodreadsTime('')).toBeUndefined();
    expect(plainTitle(quixote.title)).toBe('Don Quixote');
    expect(plainTitle('(untitled)')).toBe('(untitled)');
  });

  it('knows which books are free to read', () => {
    const now = new Date(2026, 9, 22);
    expect(inPublicDomain(1605, now)).toBe(true);
    expect(inPublicDomain(1930, now)).toBe(true);
    expect(inPublicDomain(1931, now)).toBe(false);
    expect(inPublicDomain(undefined, now)).toBe(false);
  });
});

describe('toGoodreadsCsv', () => {
  it('writes finished books that read back as Goodreads rows', () => {
    const csv = toGoodreadsCsv([
      { title: 'Cien años de soledad', author: 'Gabriel García Márquez', isbn13: '9780307474728', rating: 5, finishedAt: new Date('2026-03-04T10:00:00').getTime(), addedAt: new Date('2026-01-02T10:00:00').getTime(), lang: 'es' },
      { title: 'Short stories, vol. "1"', finishedAt: new Date('2026-05-06T10:00:00').getTime(), addedAt: new Date('2026-05-01T10:00:00').getTime(), lang: 'ru' },
    ]);
    const rows = parseGoodreadsCsv(csv);
    expect(rows[0]).toMatchObject({ title: 'Cien años de soledad', author: 'Gabriel García Márquez', isbn13: '9780307474728', rating: 5, shelf: 'read', dateRead: '2026/03/04', shelves: ['read-in-es'] });
    expect(rows[1]).toMatchObject({ title: 'Short stories, vol. "1"', shelf: 'read', rating: undefined });
  });
});
