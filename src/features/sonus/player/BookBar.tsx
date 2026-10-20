import { useNavigate } from 'react-router';
import { ChevronLeft, ChevronRight, Circle, CircleCheck } from 'lucide-react';
import { setLessonDone } from '@/data/books';
import type { Book } from '@/data/books';
import type { Media } from '@/data/types';
import { cx } from '@/lib/cx';
import { playPart } from '@/services/audio/engine';
import { ChaptersButton } from './Chapters';

const pill = 'flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-bold transition-colors';
const step = 'grid h-full w-9 place-items-center text-ink-soft transition-colors hover:text-ink disabled:opacity-35';

/** Under a book part's title: the parts on either side, its chapters, and "Lesson done" for a course. */
export function BookBar({ media, book, live, className }: { media: Media; book: Book | null | undefined; live: boolean; className?: string }) {
  const navigate = useNavigate();
  const at = book ? book.parts.findIndex((p) => p.id === media.id) : -1;
  const course = book?.kind === 'course';
  const unit = course ? 'lesson' : 'part';
  const done = Boolean(media.doneAt);

  // The part that's playing moves on through the player (and the page follows it); one that isn't
  // playing just opens the other part.
  const go = (dir: 1 | -1) => {
    const part = book?.parts[at + dir];
    if (!part) return;
    if (live) void playPart(dir);
    else navigate(`/sonus/play/${part.id}`, { replace: true });
  };

  return (
    <div className={cx('flex flex-wrap items-center gap-2', className)}>
      {book && at >= 0 && book.parts.length > 1 && (
        <div className="flex h-9 items-center overflow-hidden rounded-full border border-line bg-raised">
          <button type="button" aria-label={`Previous ${unit}`} title={`Previous ${unit}`} disabled={at === 0} onClick={() => go(-1)} className={step}>
            <ChevronLeft size={17} aria-hidden />
          </button>
          <span className="text-[13px] font-bold" aria-hidden>
            {course ? 'Lesson' : 'Part'}
          </span>
          <button type="button" aria-label={`Next ${unit}`} title={`Next ${unit}`} disabled={at === book.parts.length - 1} onClick={() => go(1)} className={step}>
            <ChevronRight size={17} aria-hidden />
          </button>
        </div>
      )}
      {(media.chapters?.length ?? 0) > 1 && <ChaptersButton media={media} live={live} className={cx(pill, 'border-line bg-raised hover:border-line-strong')} />}
      {course && (
        <button
          type="button"
          aria-pressed={done}
          onClick={() => void setLessonDone(media.id, !done)}
          className={cx(pill, done ? 'border-sage/40 bg-sage-soft text-sage-text' : 'border-line bg-raised hover:border-line-strong')}
        >
          {done ? <CircleCheck size={15} aria-hidden /> : <Circle size={15} aria-hidden />}
          Lesson done
        </button>
      )}
    </div>
  );
}
