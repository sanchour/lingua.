import { describe, expect, it } from 'vitest';
import { parseGoodreadsCsv, toGoodreadsCsv } from './goodreads';

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
