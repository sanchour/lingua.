import { memo, useState } from 'react';
import { Link } from 'react-router';
import { BookCheck, BookOpen, Ellipsis, Star, Trash2 } from 'lucide-react';
import { deleteText, updateText } from '@/data/library';
import type { ReadingProgress, Text } from '@/data/types';
import { Button, Dialog, Popover } from '@/design/primitives';
import { toast } from '@/state/ui';
import { BookCover } from './BookCover';

export const BookCard = memo(function BookCard({ text, progress, onAttach }: { text: Text; progress?: ReadingProgress; onAttach: (text: Text) => void }) {
  const [confirm, setConfirm] = useState(false);
  const shelfOnly = text.kind === 'shelfItem';
  const known = text.stats ? Math.round(text.stats.knownShare * 100) : null;
  const pct = progress ? Math.round(progress.percent * 100) : 0;

  const cover = (
    <div className="relative transition-transform duration-200 ease-out group-hover:-translate-y-1 group-active:scale-[0.98]">
      <BookCover text={text} className={shelfOnly ? 'opacity-70 saturate-[0.85]' : undefined} />
      {!shelfOnly && pct > 0 && !text.finishedAt && (
        <div className="absolute inset-x-[10%] bottom-[5%] h-[3px] overflow-hidden rounded-full bg-black/25" aria-hidden>
          <div className="h-full origin-left bg-white/90" style={{ transform: `scaleX(${pct / 100})` }} />
        </div>
      )}
    </div>
  );

  return (
    <div className="group relative">
      {shelfOnly ? (
        <button type="button" onClick={() => onAttach(text)} className="block w-full text-left" aria-label={`${text.title}: attach an EPUB to read it`}>
          {cover}
        </button>
      ) : (
        <Link to={`/codex/read/${text.id}`} className="block" aria-label={`Read ${text.title}`}>
          {cover}
        </Link>
      )}

      <div className="mt-2.5 flex items-start gap-1">
        <div className="min-w-0 flex-1">
          <p lang={text.lang} className="line-clamp-2 text-[14px] leading-snug font-semibold">
            {text.title}
          </p>
          {text.author && <p className="truncate text-[12.5px] text-ink-soft">{text.author}</p>}
          <p className="mt-1 flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-faint">
            {shelfOnly ? (
              <>
                {text.goodreads?.rating ? (
                  <span className="inline-flex items-center gap-0.5">
                    <Star size={11} className="fill-current" aria-hidden /> {text.goodreads.rating}
                  </span>
                ) : null}
                <span>Add an EPUB to read</span>
              </>
            ) : (
              <>
                {text.finishedAt ? <span className="text-sage-text">Finished</span> : pct > 0 ? <span>{pct}% read</span> : <span>New</span>}
                {known !== null && <span aria-label={`${known} percent of words known`}>· {known}% known</span>}
              </>
            )}
          </p>
        </div>
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
              {!shelfOnly && (
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
      </div>

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
    </div>
  );
});

function MenuItem({ icon: Icon, label, onClick, danger }: { icon: typeof Trash2; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors hover:bg-surface ${danger ? 'text-accent-text' : 'text-ink'}`}
    >
      <Icon size={16} aria-hidden />
      {label}
    </button>
  );
}
