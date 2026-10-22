import { parseCsvObjects } from './csv';

export interface GoodreadsBook {
  bookId?: string;
  title: string;
  author?: string;
  isbn13?: string;
  rating?: number;
  shelf: 'to-read' | 'reading' | 'read';
  dateRead?: string;
  dateAdded?: string;
  /** The year it was first published (else this edition's year). */
  year?: number;
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
      const year = Number(r['Original Publication Year']) || Number(r['Year Published']);
      return {
        bookId: r['Book Id']?.trim() || undefined,
        title: r.Title.trim(),
        author: r.Author?.trim() || undefined,
        isbn13: cleanIsbn(r.ISBN13) ?? cleanIsbn(r.ISBN),
        rating: rating > 0 ? rating : undefined,
        shelf: SHELF[r['Exclusive Shelf']?.trim()] ?? 'to-read',
        dateRead: r['Date Read']?.trim() || undefined,
        dateAdded: r['Date Added']?.trim() || undefined,
        year: year > 0 ? year : undefined,
        shelves: (r.Bookshelves ?? '').split(',').map((s) => s.trim()).filter(Boolean),
      };
    });
}

/** A Goodreads date ("2019/05/12") as a timestamp. */
export function goodreadsTime(date: string | undefined): number | undefined {
  const m = /^(\d{4})\/(\d{1,2})\/(\d{1,2})/.exec(date ?? '');
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime() : undefined;
}

/** Free to read where Project Gutenberg is (the United States): published 96 years ago or more. */
export const inPublicDomain = (year: number | undefined, now = new Date()) => year !== undefined && year <= now.getFullYear() - 96;

/** A title as it is searched for, without Goodreads' series note: "Dune (Dune, #1)" → "Dune". */
export const plainTitle = (title: string) => title.replace(/\s*\([^()]*\)\s*$/, '').trim() || title;

export interface FinishedBook {
  title: string;
  author?: string;
  isbn13?: string;
  bookId?: string;
  rating?: number;
  finishedAt: number;
  addedAt: number;
  lang: string;
}

const csvCell = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
const slashDate = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Books finished in Lingua as a CSV that Goodreads' importer accepts (My Books → Import and export).
 * Each book is shelved as read, with its date, and tagged with the language it was read in.
 */
export function toGoodreadsCsv(books: FinishedBook[]): string {
  const header = ['Book Id', 'Title', 'Author', 'ISBN13', 'My Rating', 'Date Read', 'Date Added', 'Bookshelves', 'Exclusive Shelf'];
  const rows = books.map((b) => [b.bookId ?? '', b.title, b.author ?? '', b.isbn13 ? `="${b.isbn13}"` : '', b.rating ? String(b.rating) : '0', slashDate(b.finishedAt), slashDate(b.addedAt), `read-in-${b.lang}`, 'read']);
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
}
