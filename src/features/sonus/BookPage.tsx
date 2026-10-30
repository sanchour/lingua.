import { UiText, useUi } from '@/design/i18n/UiText';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpenText, Check, Circle, CircleCheck, Ellipsis, GraduationCap, Headphones, Pause, Pencil, Play, Trash2, X } from 'lucide-react';
import { BackLink } from '@/app/BackLink';
import { formatClock, formatDuration } from '@/core/audio/cues';
import { continuePart, deleteBook, setLessonDone, updateBook, useBook } from '@/data/books';
import type { Book } from '@/data/books';
import { db } from '@/data/db';
import { useLibrary } from '@/data/library';
import { usePlaybackMap } from '@/data/media';
import type { Media, PlaybackProgress } from '@/data/types';
import { Button, Dialog, Drawer, MenuItem, Popover } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { loadMedia, unlockAudio, usePlayer } from '@/services/audio/engine';
import { readAlongBook, stopReadAlong } from '@/services/sonus/readAlong';
import { toast } from '@/state/ui';
import { Artwork } from './library/Artwork';
import { sonusBase, sonusHome } from '@/features/sonus/paths';

const field = 'h-11 w-full rounded-xl border border-line bg-bg px-3.5 text-[15px]';
const fieldLabel = 'mb-1.5 block text-[13px] font-bold tracking-wide text-ink-soft uppercase';

/** An audiobook or course: its parts (or one file's chapters), where to carry on, and read along. */
export default function BookPage() {
  const translateUi = useUi();
  const { bookId } = useParams();
  const navigate = useNavigate();
  const book = useBook(bookId);
  const playback = usePlaybackMap();
  const [sheet, setSheet] = useState<'rename' | 'read' | 'remove' | null>(null);

  if (book === null) {
    return (
      <div className="py-20 text-center">
        <p className="font-serif text-xl"><UiText source={'This book isn’t in Sonus any more.'} /></p>
        <Link to={sonusHome()} className="mt-4 inline-block font-semibold text-accent-text"><UiText source={'Back to Sonus'} /></Link>
      </div>
    );
  }
  if (!book) return null;

  const course = book.kind === 'course';
  const unit = course ? 'Lesson' : 'Part';
  const next = continuePart(book, playback);
  const started = book.parts.some((p) => p.lastPlayedAt);
  const single = book.parts.length === 1 ? book.parts[0] : null;
  const chapters = single && (single.chapters?.length ?? 0) > 1 ? single.chapters! : null;
  const summary = [
    course ? `${book.parts.length} ${book.parts.length === 1 ? 'lesson' : 'lessons'} · ${book.done} done` : chapters ? `${chapters.length} chapters` : `${book.parts.length} ${book.parts.length === 1 ? 'part' : 'parts'}`,
    book.durationMs && formatDuration(book.durationMs),
  ].filter(Boolean);
  const description = book.parts.find((p) => p.description)?.description;

  const play = (part: Media, startMs?: number) => {
    unlockAudio();
    void loadMedia(part, { autoplay: true, startMs });
    navigate(`${sonusBase()}/play/${part.id}`);
  };

  // "Continue part 7 at 12:30" when there's a place to go back to.
  const nextAt = playback?.get(next.id);
  const resumeMs = nextAt && !nextAt.completed && nextAt.positionMs > 5000 ? nextAt.positionMs : 0;
  const continueLabel = started ? `Continue ${unit.toLowerCase()} ${book.parts.indexOf(next) + 1}${resumeMs ? ` at ${formatClock(resumeMs)}` : ''}` : 'Start';

  return (
    <>
      <BackLink to="/sonus?tab=books"><UiText source={'Audiobooks'} /></BackLink>

      <div className="grid items-start gap-10 lg:grid-cols-[320px_minmax(0,1fr)] xl:gap-14">
      <header className="flex flex-col gap-5 lg:sticky lg:top-6">
        <Artwork title={book.title} coverBlobId={book.coverBlobId} coverUrl={book.coverUrl} className="w-48 shadow-elev-2 lg:w-full" rounded="rounded-3xl" />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase">
            {course ? <GraduationCap size={14} aria-hidden /> : <Headphones size={14} aria-hidden />} {course ? translateUi('Course') : translateUi('Audiobook')}
          </p>
          <h1 lang={book.lang} className="mt-1 font-serif text-[28px] leading-tight font-semibold tracking-tight text-balance">
            {book.title}
          </h1>
          {book.author && <p className="mt-1 text-ink-soft">{book.author}</p>}
          <p className="mt-1 text-[13px] font-semibold text-ink-faint">{summary.join(' · ')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button icon={Play} size="lg" className="flex-1" onClick={() => play(next, resumeMs || undefined)}>
            {continueLabel}
          </Button>
          <Popover
            label={translateUi('Book options')}
            placement="bottom-end"
            className="w-64"
            trigger={(props) => (
              <button {...props} type="button" aria-label={translateUi('Book options')} className="grid size-10 place-items-center rounded-xl text-ink-soft transition-colors hover:bg-surface hover:text-ink">
                <Ellipsis size={18} aria-hidden />
              </button>
            )}
          >
            {(close) => (
              <div className="space-y-0.5">
                <MenuItem icon={Pencil} label={translateUi('Rename')} onClick={() => (close(), setSheet('rename'))} />
                <MenuItem
                  icon={course ? Headphones : GraduationCap}
                  label={course ? translateUi('Make it an audiobook') : translateUi('Make it a course')}
                  onClick={() => (close(), void updateBook(book.id, { kind: course ? 'audiobook' : 'course' }))}
                />
                <MenuItem icon={BookOpenText} label={translateUi('Read along with an ebook')} onClick={() => (close(), setSheet('read'))} />
                <MenuItem icon={Trash2} label={translateUi('Remove')} danger onClick={() => (close(), setSheet('remove'))} />
              </div>
            )}
          </Popover>
        </div>
        {book.readAlongTextId && <ReadingAlong book={book} />}
        {description && <p className="line-clamp-6 text-[14px] leading-relaxed whitespace-pre-line text-ink-soft">{description}</p>}
      </header>

      <section aria-label={chapters ? translateUi('Chapters') : course ? translateUi('Lessons') : translateUi('Parts')} className="min-w-0">
      <h2 className="mb-3 flex items-baseline gap-3 border-b border-line pb-2 font-serif text-xl font-semibold">
        {chapters ? translateUi('Chapters') : course ? translateUi('Lessons') : translateUi('Parts')}
        <span className="font-sans text-[13px] font-semibold text-ink-faint">{chapters ? chapters.length : book.parts.length}</span>
      </h2>
      <div className="-mx-2 flex flex-col">
        {chapters && single
          ? chapters.map((c, i) => (
              <button key={i} type="button" onClick={() => play(single, c.startMs)} className="flex items-center gap-3.5 rounded-2xl px-2 py-3 text-left transition-colors hover:bg-surface/70">
                <span className="w-7 shrink-0 text-center text-[13px] font-bold text-ink-faint tabular-nums">{i + 1}</span>
                <span lang={book.lang} className="min-w-0 flex-1 truncate text-[15px] font-semibold">
                  {c.title}
                </span>
                <span className="shrink-0 text-[12.5px] text-ink-faint tabular-nums">{formatClock(c.startMs)}</span>
              </button>
            ))
          : book.parts.map((part, i) => <PartRow key={part.id} part={part} n={i + 1} course={course} progress={playback?.get(part.id)} onPlay={() => play(part)} />)}
      </div>
      </section>
      </div>

      <RenameDrawer book={book} open={sheet === 'rename'} onClose={() => setSheet(null)} />
      <ReadAlongDrawer book={book} open={sheet === 'read'} onClose={() => setSheet(null)} />
      <Dialog
        open={sheet === 'remove'}
        onClose={() => setSheet(null)}
        title={translateUi('Remove this {0}?', [course ? 'course' : 'audiobook'])}
        actions={
          <>
            <Button variant="ghost" onClick={() => setSheet(null)}><UiText source={'Keep'} /></Button>
            <Button
              variant="danger"
              onClick={async () => {
                setSheet(null);
                await deleteBook(book.id);
                navigate('/sonus?tab=books');
              }}
            ><UiText source={'Remove'} /></Button>
          </>
        }
      ><UiText source={'Its audio, transcripts and places are removed from this device. Words you marked stay.'} /></Dialog>
    </>
  );
}

/** A part: its number (or a tick once finished, bars while playing), title, length, a thin line for how far you got, play on hover. */
function PartRow({ part, n, course, progress, onPlay }: { part: Media; n: number; course: boolean; progress?: PlaybackProgress; onPlay: () => void }) {
  const translateUi = useUi();
  const playing = usePlayer((s) => s.media?.id === part.id && s.status === 'playing');
  const fraction = progress?.completed ? 1 : progress && part.durationMs ? Math.min(1, progress.positionMs / part.durationMs) : 0;
  const done = Boolean(part.doneAt);
  const finished = Boolean(progress?.completed);
  return (
    <div className={cx('group relative flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-surface/70', course && done && 'opacity-60', playing && 'bg-accent-soft hover:bg-accent-soft')}>
      {course && (
        <button
          type="button"
          aria-pressed={done}
          aria-label={done ? translateUi('Lesson {0} done; mark it not done', [n]) : translateUi('Mark lesson {0} done', [n])}
          onClick={() => void setLessonDone(part.id, !done)}
          className={cx('grid size-10 shrink-0 place-items-center rounded-full', done ? 'text-sage-text' : 'text-ink-faint hover:text-ink')}
        >
          {done ? <CircleCheck size={22} aria-hidden /> : <Circle size={22} aria-hidden />}
        </button>
      )}
      <Link to={`${sonusBase()}/play/${part.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        {!course && (
          <span className={cx('grid w-7 shrink-0 place-items-center text-[13px] font-bold tabular-nums', playing ? 'text-accent-text' : finished ? 'text-sage-text' : 'text-ink-faint')}>
            {playing ? (
              <span className="flex h-3.5 items-end gap-[2px]" aria-label={translateUi('Playing')}>
                {[0, 1, 2].map((b) => (
                  <span key={b} className="radio-bar h-full w-[2.5px] origin-bottom rounded-full bg-current" style={{ animationDelay: `${b * -0.3}s` }} />
                ))}
              </span>
            ) : finished ? (
              <Check size={15} strokeWidth={2.6} aria-label={translateUi('Finished')} />
            ) : (
              n
            )}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span lang={part.lang} className={cx('line-clamp-2 text-[15px] leading-snug font-semibold', playing && 'text-accent-text')}>
            {part.title}
          </span>
          <span className="mt-0.5 flex items-center gap-2 text-[12.5px] text-ink-faint tabular-nums">
            {part.durationMs ? formatDuration(part.durationMs) : null}
            {fraction > 0 && fraction < 1 && progress ? <span><UiText source={'· {0} in'} values={[formatClock(progress.positionMs)]} /></span> : null}
          </span>
        </span>
      </Link>
      {fraction > 0 && fraction < 1 && (
        <span className="pointer-events-none absolute inset-x-3 bottom-0.5 h-0.5 overflow-hidden rounded-full bg-sunken" aria-hidden>
          <span className="block h-full rounded-full bg-accent" style={{ width: `${fraction * 100}%` }} />
        </span>
      )}
      <button
        type="button"
        aria-label={translateUi('Play {0}', [part.title])}
        onClick={onPlay}
        className={cx(
          'grid size-10 shrink-0 place-items-center rounded-full bg-surface text-ink transition-[transform,background-color,opacity] duration-150 hover:bg-sunken focus-visible:opacity-100 active:scale-90',
          playing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
      >
        {playing ? <Pause size={17} className="fill-current" aria-hidden /> : <Play size={17} className="translate-x-px fill-current" aria-hidden />}
      </button>
    </div>
  );
}

function ReadingAlong({ book }: { book: Book }) {
  const text = useLiveQuery(() => (book.readAlongTextId ? db.texts.get(book.readAlongTextId) : undefined), [book.readAlongTextId]);
  return (
    <p className="mt-5 flex flex-wrap items-center gap-2 text-[14px] text-ink-soft">
      <BookOpenText size={16} className="text-sage-text" aria-hidden />
      <span className="min-w-0"><UiText source={'Read along: {0}'} values={[<span className="font-semibold text-ink">{text?.title ?? 'a text in Codex'}</span>]} /></span>
      <button type="button" onClick={() => void stopReadAlong(book.id)} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[13px] font-semibold text-ink-soft hover:bg-surface hover:text-ink"><UiText source={'{0} Stop'} values={[<X size={14} aria-hidden />]} /></button>
    </p>
  );
}

function RenameDrawer({ book, open, onClose }: { book: Book; open: boolean; onClose: () => void }) {
  const translateUi = useUi();
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author ?? '');
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={translateUi('Rename')}
      footer={
        <Button block size="lg" disabled={!title.trim()} onClick={() => void updateBook(book.id, { title, author }).then(onClose)}><UiText source={'Save'} /></Button>
      }
    >
      <div className="space-y-5">
        <label className="block">
          <span className={fieldLabel}><UiText source={'Title'} /></span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} data-autofocus className={field} />
        </label>
        <label className="block">
          <span className={fieldLabel}><UiText source={'Author'} /></span>
          <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder={translateUi('Optional')} className={field} />
        </label>
      </div>
    </Drawer>
  );
}

function ReadAlongDrawer({ book, open, onClose }: { book: Book; open: boolean; onClose: () => void }) {
  const translateUi = useUi();
  const texts = useLibrary(book.lang)?.filter((t) => t.kind === 'book' || t.kind === 'article');
  const [busy, setBusy] = useState<string | null>(null);

  const choose = async (textId: string) => {
    setBusy(textId);
    try {
      const n = await readAlongBook(book.id, textId);
      const total = book.parts.length;
      if (n.timed) toast(`Matched ${n.timed} of ${total} ${total === 1 ? 'part' : 'parts'}.${n['no-transcript'] ? ` ${n['no-transcript']} ${n['no-transcript'] === 1 ? 'has' : 'have'} no transcript yet.` : ''}`, { tone: 'success' });
      else if (n['not-found']) toast('The text wasn’t found in these parts.', { tone: 'error' });
      else toast('Saved. Parts get the book’s text once they’re transcribed.', { tone: 'success' });
      onClose();
    } finally {
      setBusy(null);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={translateUi('Read along with an ebook')}
      description={translateUi('Pick the ebook. Parts with a transcript get the book’s own sentences, timed to the reading; parts without one get them once they’re transcribed.')}
    >
      {texts?.length ? (
        <ul className="-mx-1 space-y-0.5">
          {texts.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void choose(t.id)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface disabled:opacity-60"
              >
                <BookOpenText size={18} className="shrink-0 text-ink-faint" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span lang={t.lang} className="block truncate text-[15px] font-semibold">
                    {t.title}
                  </span>
                  {t.author && <span className="block truncate text-[12.5px] text-ink-soft">{t.author}</span>}
                </span>
                {busy === t.id ? <span className="text-[12.5px] text-ink-faint"><UiText source={'Matching…'} /></span> : book.readAlongTextId === t.id && <Check size={16} className="text-accent-text" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[14.5px] text-ink-soft"><UiText source={'Add the ebook to Codex first (Codex › Add › File: EPUB, PDF or text).'} /></p>
      )}
    </Drawer>
  );
}
