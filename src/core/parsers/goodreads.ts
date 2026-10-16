import { parseCsvObjects } from './csv';

export interface GoodreadsBook {
  bookId?: string;
  title: string;
  author?: string;
  isbn13?: string;
  rating?: number;
  shelf: 'to-read' | 'reading' | 'read';
  dateRead?: string;
  shelves: string[];
}

/** Goodreads writes ISBNs as ="0439023483" so spreadsheets keep leading zeros. */
const cleanIsbn = (value: string | undefined) => value?.replace(/^="?|"$/g, '').trim() || undefined;

const SHELF: Record<string, GoodreadsBook['shelf']> = { 'to-read': 'to-read', 'currently-reading': 'reading', read: 'read' };

/** Parses a Goodreads "Export Library" CSV (My Books → Import and export). */
export function parseGoodreadsCsv(text: string): GoodreadsBook[] {
  const rows = parseCsvObjects(text);
  if (rows.length && !('Title' in rows[0] && 'Exclusive Shelf' in rows[0])) {
    throw new Error('This CSV doesn’t look like a Goodreads library export.');
  }
  return rows
    .filter((r) => r.Title?.trim())
    .map((r) => {
      const rating = Number(r['My Rating']);
      return {
        bookId: r['Book Id']?.trim() || undefined,
        title: r.Title.trim(),
        author: r.Author?.trim() || undefined,
        isbn13: cleanIsbn(r.ISBN13) ?? cleanIsbn(r.ISBN),
        rating: rating > 0 ? rating : undefined,
        shelf: SHELF[r['Exclusive Shelf']?.trim()] ?? 'to-read',
        dateRead: r['Date Read']?.trim() || undefined,
        shelves: (r.Bookshelves ?? '').split(',').map((s) => s.trim()).filter(Boolean),
      };
    });
}
