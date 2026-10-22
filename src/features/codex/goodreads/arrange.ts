import { goodreadsTime } from '@/core/parsers/goodreads';
import type { Text } from '@/data/types';
import type { GoodreadsGroup, GoodreadsSort } from '@/data/settings';

export type ShelfName = 'reading' | 'to-read' | 'read';
export type RatingFilter = 'any' | '5' | '4' | '3' | 'none';

export interface GoodreadsFilter {
  shelf: ShelfName | 'all';
  rating: RatingFilter;
  /** One of the learner's own Goodreads shelves. */
  own: string | null;
  /** Only books whose text is here (an EPUB, a free edition). */
  withText: boolean;
  query: string;
}

export const NO_FILTER: GoodreadsFilter = { shelf: 'all', rating: 'any', own: null, withText: false, query: '' };

export const SHELVES: Array<{ id: ShelfName; title: string }> = [
  { id: 'reading', title: 'Currently reading' },
  { id: 'to-read', title: 'To read' },
  { id: 'read', title: 'Read' },
];

/** Where a Goodreads book stands: finished in Lingua counts as read. */
export const shelfOf = (t: Text): ShelfName => (t.finishedAt ? 'read' : (t.shelf ?? 'to-read'));

/** The learner's own shelves, besides the three every book is on. */
export const ownShelves = (t: Text) => (t.goodreads?.shelves ?? []).filter((s) => s !== 'read' && s !== 'to-read' && s !== 'currently-reading');

export const readTime = (t: Text) => goodreadsTime(t.goodreads?.dateRead) ?? t.finishedAt;
export const addedTime = (t: Text) => goodreadsTime(t.goodreads?.dateAdded) ?? t.createdAt;

export function matches(t: Text, f: GoodreadsFilter, key: (s: string) => string): boolean {
  if (f.shelf !== 'all' && shelfOf(t) !== f.shelf) return false;
  const rating = t.goodreads?.rating;
  if (f.rating === 'none' ? rating : f.rating !== 'any' && (rating ?? 0) < Number(f.rating)) return false;
  if (f.own && !ownShelves(t).includes(f.own)) return false;
  if (f.withText && t.kind === 'shelfItem') return false;
  return !f.query || key(`${t.title} ${t.author ?? ''}`).includes(key(f.query));
}

/** Newest first for dates and ratings, the alphabet for names, oldest first for years; books without the value last. */
export function sorter(sort: GoodreadsSort, lang: string): (a: Text, b: Text) => number {
  const collator = new Intl.Collator(lang, { sensitivity: 'base', numeric: true });
  const byTitle = (a: Text, b: Text) => collator.compare(a.title, b.title);
  const last = (value: (t: Text) => number | undefined, dir: 1 | -1) => (a: Text, b: Text) => {
    const x = value(a);
    const y = value(b);
    if (x === undefined || y === undefined) return x === y ? byTitle(a, b) : x === undefined ? 1 : -1;
    return (x - y) * dir || byTitle(a, b);
  };
  switch (sort) {
    case 'read':
      return last(readTime, -1);
    case 'rating':
      return last((t) => t.goodreads?.rating, -1);
    case 'year':
      return last((t) => t.goodreads?.year, 1);
    case 'author':
      return (a, b) => collator.compare(a.author ?? '￿', b.author ?? '￿') || byTitle(a, b);
    case 'title':
      return byTitle;
    default:
      return (a, b) => addedTime(b) - addedTime(a) || byTitle(a, b);
  }
}

export interface BookGroup {
  id: string;
  title: string;
  books: Text[];
}

/** The books that pass the filter, sorted, in groups (one untitled group when not grouped). */
export function arrange(books: Text[], { sort, group, filter, lang, key }: { sort: GoodreadsSort; group: GoodreadsGroup; filter: GoodreadsFilter; lang: string; key: (s: string) => string }): BookGroup[] {
  const compare = sorter(sort, lang);
  const shown = books.filter((t) => matches(t, filter, key)).sort(compare);
  if (group === 'none') return shown.length ? [{ id: 'all', title: '', books: shown }] : [];

  const groups = new Map<string, BookGroup>();
  const put = (id: string, title: string, t: Text) => {
    if (!groups.has(id)) groups.set(id, { id, title, books: [] });
    groups.get(id)!.books.push(t);
  };
  for (const t of shown) {
    if (group === 'shelf') put(shelfOf(t), SHELVES.find((s) => s.id === shelfOf(t))!.title, t);
    else if (group === 'author') put(t.author ?? '', t.author ?? 'Author unknown', t);
    else {
      const time = readTime(t);
      const year = time === undefined ? '' : String(new Date(time).getFullYear());
      put(year, year || (shelfOf(t) === 'read' ? 'Read, date unknown' : 'Not read yet'), t);
    }
  }

  const collator = new Intl.Collator(lang, { sensitivity: 'base', numeric: true });
  const order: (a: BookGroup, b: BookGroup) => number =
    group === 'shelf'
      ? (a, b) => SHELVES.findIndex((s) => s.id === a.id) - SHELVES.findIndex((s) => s.id === b.id)
      : group === 'author'
        ? (a, b) => (a.id === '' ? 1 : b.id === '' ? -1 : collator.compare(a.id, b.id))
        : (a, b) => (a.id === '' ? 1 : b.id === '' ? -1 : Number(b.id) - Number(a.id));
  return [...groups.values()].sort(order);
}
