import { memo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { BookCheck, BookOpen, Ellipsis, Paperclip, Star, Trash2 } from 'lucide-react';
import { deleteText, updateText } from '@/data/library';
import type { ReadingProgress, Text } from '@/data/types';
import { Button, Dialog, MenuItem, Popover } from '@/design/primitives';
import { toast } from '@/state/ui';
import { BookCover } from './BookCover';

interface BookProps {
  text: Text;
  progress?: ReadingProgress;
  onAttach: (text: Text) => void;
}

/** A small status line: progress and comprehension, or what a shelf-only book needs. */
function BookMeta({ text, progress }: Pick<BookProps, 'text' | 'progress'>) {
  const known = text.stats ? Math.round(text.stats.knownShare * 100) : null;
  const pct = progress ? Math.round(progress.percent * 100) : 0;
  if (text.kind === 'shelfItem') {
    return (
      <>
        {text.goodreads?.rating ? (
          <span className="inline-flex items-center gap-0.5">
            <Star size={11} className="fill-current" aria-hidden /> {text.goodreads.rating}
          </span>
        ) : null}
        <span>Add an EPUB to read</span>
      </>
    );
  }
  return (
    <>
      {text.finishedAt ? <span className="text-sage-text">Finished</span> : pct > 0 ? <span>{pct}% read</span> : <span>New</span>}
      {known !== null && <span aria-label={`${known} percent of words known`}>· {known}% known</span>}
    </>
  );
}

/** Opens the book, or (for a Goodreads shelf entry) asks for its EPUB. */
function BookLink({ text, onAttach, className, children }: Pick<BookProps, 'text' | 'onAttach'> & { className?: string; children: ReactNode }) {
  if (text.kind === 'shelfItem') {
    return (
      <button type="button" onClick={() => onAttach(text)} className={className} aria-label={`${text.title}: attach an EPUB to read it`}>
        {children}
      </button>
    );
  }
  return (
    <Link to={`/codex/read/${text.id}`} className={className} aria-label={`Read ${text.title}`}>
      {children}
    </Link>
  );
}

function BookOptions({ text, onAttach }: Pick<BookProps, 'text' | 'onAttach'>) {
  const [confirm, setConfirm] = useState(false);
  const shelfOnly = text.kind === 'shelfItem';
  return (
    <>
      <Popover
        label="Book options"
        placement="bottom-end"
        className="w-56"
        trigger={(props) => (
          <button
            {...props}
            type="button"
            aria-label="Book options"
            className="-mr-1 grid size-8 shrink-0 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-surface hover:text-ink pointer-coarse:size-9"
          >
            <Ellipsis size={17} aria-hidden />
          </button>
        )}
      >
        {(close) => (
          <div className="space-y-0.5">
            {shelfOnly ? (
              <MenuItem
                icon={Paperclip}
                label="Attach an EPUB"
                onClick={() => {
                  close();
                  onAttach(text);
                }}
              />
            ) : (
              <MenuItem
                icon={text.finishedAt ? BookOpen : BookCheck}
                label={text.finishedAt ? 'Mark as reading' : 'Mark as finished'}
                onClick={() => {
                  close();
                  void updateText(text.id, text.finishedAt ? { finishedAt: undefined, shelf: 'reading' } : { finishedAt: Date.now(), shelf: 'read' });
                }}
              />
            )}
            <MenuItem
              icon={Trash2}
              label="Remove from library"
              danger
              onClick={() => {
                close();
                setConfirm(true);
              }}
            />
          </div>
        )}
      </Popover>

      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Remove this book?"
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Keep
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                setConfirm(false);
                await deleteText(text.id);
                toast('Removed from your library.');
              }}
            >
              Remove
            </Button>
          </>
        }
      >
        “{text.title}” and your reading position will be removed. Words you marked stay in your vocabulary.
      </Dialog>
    </>
  );
}

/** Cover view: the book standing on the shelf. */
export const BookCard = memo(function BookCard({ text, progress, onAttach }: BookProps) {
  const shelfOnly = text.kind === 'shelfItem';
  const pct = progress ? Math.round(progress.percent * 100) : 0;
  return (
    <div className="group relative">
      <BookLink text={text} onAttach={onAttach} className="block w-full text-left">
        <div className="relative transition-transform duration-200 ease-out group-hover:-translate-y-1 group-active:scale-[0.98]">
          <BookCover text={text} className={shelfOnly ? 'opacity-70 saturate-[0.85]' : undefined} />
          {!shelfOnly && pct > 0 && !text.finishedAt && (
            <div className="absolute inset-x-[10%] bottom-[5%] h-[3px] overflow-hidden rounded-full bg-black/25" aria-hidden>
              <div className="h-full origin-left bg-[#f8efe0]/90" style={{ transform: `scaleX(${pct / 100})` }} />
            </div>
          )}
        </div>
      </BookLink>

      <div className="mt-2.5 flex items-start gap-1">
        <div className="min-w-0 flex-1">
          <p lang={text.lang} className="line-clamp-2 text-[14px] leading-snug font-semibold">
            {text.title}
          </p>
          {text.author && <p className="truncate text-[12.5px] text-ink-soft">{text.author}</p>}
          <p className="mt-1 flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-faint">
            <BookMeta text={text} progress={progress} />
          </p>
        </div>
        <BookOptions text={text} onAttach={onAttach} />
      </div>
    </div>
  );
});

/** List view: one compact row per book, for long shelves. */
export const BookRow = memo(function BookRow({ text, progress, onAttach }: BookProps) {
  const shelfOnly = text.kind === 'shelfItem';
  const pct = progress ? progress.percent : 0;
  return (
    <div className="group flex items-center gap-3.5 rounded-2xl px-2 py-2 transition-colors hover:bg-surface/70">
      <BookLink text={text} onAttach={onAttach} className="flex min-w-0 flex-1 items-center gap-3.5 text-left">
        <BookCover text={text} size="sm" className={shelfOnly ? 'w-11 shrink-0 opacity-70 saturate-[0.85]' : 'w-11 shrink-0'} />
        <span className="min-w-0 flex-1">
          <span lang={text.lang} className="block truncate text-[15px] font-semibold">
            {text.title}
          </span>
          {text.author && <span className="block truncate text-[13px] text-ink-soft">{text.author}</span>}
          <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-faint">
            <BookMeta text={text} progress={progress} />
          </span>
        </span>
        {!shelfOnly && !text.finishedAt && pct > 0 && (
          <span className="hidden h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-sunken sm:block" aria-hidden>
            <span className="block h-full origin-left rounded-full bg-accent" style={{ transform: `scaleX(${Math.max(0.03, pct)})` }} />
          </span>
        )}
      </BookLink>
      <BookOptions text={text} onAttach={onAttach} />
    </div>
  );
});
