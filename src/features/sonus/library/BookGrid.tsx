import { useUi } from '@/design/i18n/UiText';
import { Link } from 'react-router';
import { BookHeadphones, GraduationCap } from 'lucide-react';
import type { Book } from '@/data/books';
import type { PlaybackProgress } from '@/data/types';
import { Artwork } from './Artwork';

type Progress = Map<string, PlaybackProgress> | undefined;

/** Where the learner is in a book: the part, the lessons done, or finished. */
export function bookWhere(book: Book, progress: Progress): string {
  if (book.kind === 'course') return `${book.done} of ${plural(book.parts.length, 'lesson')} done`;
  if (book.parts.length > 1) {
    const at = book.lastPlayedAt ? book.parts.findIndex((p) => p.lastPlayedAt === book.lastPlayedAt) : -1;
    return at < 0 ? `${book.parts.length} parts` : `Part ${at + 1} of ${book.parts.length}`;
  }
  return progress?.get(book.parts[0].id)?.completed ? 'Finished' : (book.author ?? 'Audiobook');
}

/** How much of the book is heard (or, for a course, done), 0 to 1. */
export function bookShare(book: Book, progress: Progress): number {
  if (book.kind === 'course') return book.parts.length ? book.done / book.parts.length : 0;
  if (!book.durationMs) return 0;
  let heard = 0;
  for (const p of book.parts) {
    const at = progress?.get(p.id);
    heard += at?.completed ? (p.durationMs ?? 0) : (at?.positionMs ?? 0);
  }
  return Math.min(1, heard / book.durationMs);
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** A small cover for a shelf that scrolls sideways. */
export function BookTile({ book, progress }: { book: Book; progress: Progress }) {
  return (
    <Link to={`/sonus/book/${book.id}`} className="group block">
      <Artwork title={book.title} coverBlobId={book.coverBlobId} coverUrl={book.coverUrl} className="block w-full transition-transform group-active:scale-[0.97]" rounded="rounded-xl" />
      <span lang={book.lang} className="mt-1.5 block truncate text-[13.5px] font-semibold">
        {book.title}
      </span>
      <span className="flex items-center gap-1 truncate text-[12.5px] text-ink-soft">
        <BookHeadphones size={12} className="shrink-0 text-sage-text" aria-hidden /> {bookWhere(book, progress)}
      </span>
    </Link>
  );
}

/** The learner's books as a grid of covers, like the podcasts they follow, each with how far in they are. */
export function BookGrid({ books, progress }: { books: Book[]; progress: Progress }) {
  const translateUi = useUi();
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
      {books.map((b) => {
        const share = bookShare(b, progress);
        const Icon = b.kind === 'course' ? GraduationCap : BookHeadphones;
        return (
          <Link key={b.id} to={`/sonus/book/${b.id}`} className="group block">
            <span className="relative block transition-transform duration-200 ease-out group-hover:-translate-y-1 group-active:scale-[0.98]">
              <Artwork title={b.title} coverBlobId={b.coverBlobId} coverUrl={b.coverUrl} className="w-full" rounded="rounded-2xl" />
              {share > 0 && (
                <span className="absolute inset-x-2.5 bottom-2.5 h-1 overflow-hidden rounded-full bg-black/35 backdrop-blur-sm" aria-hidden>
                  <span className="block h-full origin-left rounded-full bg-white" style={{ transform: `scaleX(${Math.max(0.03, share)})` }} />
                </span>
              )}
            </span>
            <p lang={b.lang} className="mt-2.5 line-clamp-2 text-[14px] leading-snug font-semibold">
              {b.title}
            </p>
            {b.author && <p className="truncate text-[12.5px] text-ink-soft">{b.author}</p>}
            <p className="mt-0.5 flex items-center gap-1 text-[11.5px] font-semibold text-ink-faint">
              <Icon size={12} className="shrink-0 text-sage-text" aria-hidden />
              <span className="truncate">{bookWhere(b, progress) === b.author ? translateUi('Audiobook') : bookWhere(b, progress)}</span>
            </p>
          </Link>
        );
      })}
    </div>
  );
}
