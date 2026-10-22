import { describe, expect, it } from 'vitest';
import type { Text } from '@/data/types';
import { arrange, NO_FILTER } from './arrange';

const book = (title: string, extra: Partial<Text> & { goodreads?: Text['goodreads'] } = {}): Text => ({
  id: title,
  lang: 'es',
  kind: 'shelfItem',
  source: 'goodreads',
  title,
  shelf: 'read',
  chapterCount: 0,
  wordCount: 0,
  createdAt: 0,
  updatedAt: 0,
  ...extra,
});

const BOOKS = [
  book('Niebla', { author: 'Miguel de Unamuno', goodreads: { rating: 4, year: 1914, dateRead: '2023/06/01', dateAdded: '2023/01/05', shelves: ['clásicos'] } }),
  book('Rayuela', { author: 'Julio Cortázar', shelf: 'to-read', goodreads: { year: 1963, dateAdded: '2024/02/10' } }),
  book('Ficciones', { author: 'Jorge Luis Borges', goodreads: { rating: 5, year: 1944, dateRead: '2021/11/20', dateAdded: '2021/10/01', shelves: ['clásicos', 'cuentos'] } }),
  book('Marianela', { author: 'Benito Pérez Galdós', kind: 'book', shelf: 'reading', goodreads: { rating: 3, year: 1878, dateAdded: '2022/05/05' } }),
];
const key = (s: string) => s.toLowerCase();
const titles = (groups: ReturnType<typeof arrange>) => groups.map((g) => [g.title, g.books.map((b) => b.title)]);

describe('Goodreads shelves: sort, group, filter', () => {
  it('groups by shelf in a fixed order, sorted inside', () => {
    expect(titles(arrange(BOOKS, { sort: 'added', group: 'shelf', filter: NO_FILTER, lang: 'es', key }))).toEqual([
      ['Currently reading', ['Marianela']],
      ['To read', ['Rayuela']],
      ['Read', ['Niebla', 'Ficciones']],
    ]);
  });

  it('groups by the year read, newest first, the unread last', () => {
    expect(titles(arrange(BOOKS, { sort: 'title', group: 'yearRead', filter: NO_FILTER, lang: 'es', key }))).toEqual([
      ['2023', ['Niebla']],
      ['2021', ['Ficciones']],
      ['Not read yet', ['Marianela', 'Rayuela']],
    ]);
  });

  it('sorts by rating and by year, books without one last', () => {
    expect(arrange(BOOKS, { sort: 'rating', group: 'none', filter: NO_FILTER, lang: 'es', key })[0].books.map((b) => b.title)).toEqual(['Ficciones', 'Niebla', 'Marianela', 'Rayuela']);
    expect(arrange(BOOKS, { sort: 'year', group: 'author', filter: NO_FILTER, lang: 'es', key }).map((g) => g.title)).toEqual(['Benito Pérez Galdós', 'Jorge Luis Borges', 'Julio Cortázar', 'Miguel de Unamuno']);
  });

  it('filters by rating, own shelf, text and search', () => {
    const only = (filter: Partial<typeof NO_FILTER>) => arrange(BOOKS, { sort: 'title', group: 'none', filter: { ...NO_FILTER, ...filter }, lang: 'es', key }).flatMap((g) => g.books.map((b) => b.title));
    expect(only({ rating: '4' })).toEqual(['Ficciones', 'Niebla']);
    expect(only({ rating: 'none' })).toEqual(['Rayuela']);
    expect(only({ own: 'cuentos' })).toEqual(['Ficciones']);
    expect(only({ withText: true })).toEqual(['Marianela']);
    expect(only({ shelf: 'to-read' })).toEqual(['Rayuela']);
    expect(only({ query: 'borges' })).toEqual(['Ficciones']);
    expect(only({ query: 'nothing' })).toEqual([]);
  });
});
