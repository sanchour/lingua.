import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { BookHeadphones, ExternalLink, FolderPlus, GraduationCap, LoaderCircle, SearchX } from 'lucide-react';
import { formatDuration } from '@/core/audio/cues';
import { getLanguage } from '@/core/lang/languages';
import { useBooks } from '@/data/books';
import type { BookKind } from '@/data/books';
import { usePlaybackMap } from '@/data/media';
import { Button, Card, SearchInput } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { freeCourses } from '@/services/sonus/courses';
import { openLibrivoxBook, searchLibrivox } from '@/services/sonus/librivox';
import type { LibrivoxHit } from '@/services/sonus/librivox';
import { toast } from '@/state/ui';
import { AddBookDrawer } from './AddBookDrawer';
import { Artwork } from './Artwork';
import { BookGrid } from './BookGrid';

const label = 'text-[12px] font-bold tracking-[0.14em] text-ink-faint uppercase';

/** Sonus's Audiobooks: the learner's books and courses, then free books from LibriVox and free courses. */
export default function BooksTab({ lang }: { lang: string }) {
  const name = getLanguage(lang)?.name ?? lang;
  const books = useBooks(lang);
  const playback = usePlaybackMap();
  const [adding, setAdding] = useState<BookKind | null>(null);
  const audiobooks = books?.filter((b) => b.kind !== 'course') ?? [];
  const courses = books?.filter((b) => b.kind === 'course') ?? [];
  // LibriVox's own catalogue goes under its search here, not among the courses.
  const catalogue = freeCourses(lang).find((c) => c.by === 'LibriVox');
  const listed = freeCourses(lang).filter((c) => c !== catalogue);

  const add = (kind: BookKind, text: string) => (
    <Button variant="ghost" size="sm" icon={FolderPlus} onClick={() => setAdding(kind)}>
      {text}
    </Button>
  );

  return (
    <div className="space-y-12 pb-10">
      <section aria-label="Your audiobooks">
        <div className="mb-4 flex items-center gap-3">
          <h2 className={cx(label, 'flex-1')}>Your audiobooks</h2>
          {add('audiobook', 'Add your own')}
        </div>
        {audiobooks.length ? (
          <BookGrid books={audiobooks} progress={playback} />
        ) : (
          books && (
            <div className="flex items-start gap-4 rounded-3xl border border-line bg-surface p-5">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sage-soft text-sage-text">
                <BookHeadphones size={22} aria-hidden />
              </span>
              <p className="text-[15px] leading-relaxed text-ink-soft">
                <span className="block font-semibold text-ink">Whole books, part by part</span>
                Books you start appear here, with chapters, a sleep timer and the book’s text to read along. Find a free one in {name} below, or add your own files or folder.
              </p>
            </div>
          )
        )}
      </section>

      {courses.length > 0 && (
        <section aria-label="Your courses">
          <div className="mb-4 flex items-center gap-3">
            <h2 className={cx(label, 'flex-1')}>Your courses</h2>
            {add('course', 'Add a course')}
          </div>
          <BookGrid books={courses} progress={playback} />
        </section>
      )}

      <section aria-label="Free audiobooks" className="scroll-mt-24">
        <h2 className={cx(label, 'mb-4')}>Free audiobooks · LibriVox</h2>
        <Librivox lang={lang} name={name} />
        {catalogue && (
          <a href={catalogue.url} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-1 text-[13.5px] font-semibold text-ink-soft hover:text-ink">
            LibriVox’s whole {name} catalogue, short works too <ExternalLink size={14} aria-hidden />
          </a>
        )}
      </section>

      <section aria-label="Free courses">
        <h2 className={cx(label, 'mb-4')}>Free courses</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {listed.map((c) => (
            <Card key={c.url} className="flex flex-col p-4 sm:p-5">
              <span className="text-[15px] font-semibold">{c.name}</span>
              <span className="text-[12.5px] text-ink-faint">{c.by}</span>
              <span className="mt-1.5 flex-1 text-[13.5px] leading-snug text-ink-soft">{c.detail}</span>
              <a href={c.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 self-start text-[13.5px] font-semibold text-accent-text hover:underline">
                Open <ExternalLink size={14} aria-hidden />
              </a>
            </Card>
          ))}
          <Card className="flex flex-col p-4 sm:p-5">
            <span className="flex items-center gap-2 text-[15px] font-semibold">
              <GraduationCap size={17} className="text-sage-text" aria-hidden /> Your own course
            </span>
            <span className="mt-1.5 flex-1 text-[13.5px] leading-snug text-ink-soft">
              {listed.length
                ? 'Downloaded a course? Add its files or folder: lessons play in order and are marked done as you finish them.'
                : `No free course for ${name} is listed yet. Add one you have: lessons play in order and are marked done.`}
            </span>
            <Button variant="secondary" size="sm" icon={FolderPlus} className="mt-3 self-start" onClick={() => setAdding('course')}>
              Add a course
            </Button>
          </Card>
        </div>
      </section>

      <AddBookDrawer lang={lang} kind={adding ?? 'audiobook'} open={adding !== null} onClose={() => setAdding(null)} />
    </div>
  );
}

/** LibriVox's books in the language, the most listened first, or a search by title or author. */
function Librivox({ lang, name }: { lang: string; name: string }) {
  const navigate = useNavigate();
  const [typed, setTyped] = useState('');
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<LibrivoxHit[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);

  // Typing waits a moment before asking.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setQuery(typed.trim());
      setPage(1);
    }, 500);
    return () => window.clearTimeout(t);
  }, [typed]);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setFailed(false);
    searchLibrivox(lang, { query, page })
      .then((r) => {
        if (!live) return;
        setHits((prev) => (page > 1 && prev ? [...prev, ...r.hits] : r.hits));
        setTotal(r.total);
      })
      .catch(() => live && (setFailed(true), setHits((prev) => prev ?? [])))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [lang, query, page]);

  const open = async (hit: LibrivoxHit) => {
    setOpening(hit.identifier);
    try {
      navigate(`/sonus/book/${await openLibrivoxBook(lang, hit.identifier)}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'That book couldn’t be opened.', {
        tone: 'error',
      });
    } finally {
      setOpening(null);
    }
  };

  return (
    <div>
      <SearchInput value={typed} onChange={setTyped} placeholder="Search by title or author" className="max-w-xl" />
      <div className="mt-6">
        {failed && !hits?.length ? (
          <p className="py-10 text-center text-sm text-ink-soft">LibriVox couldn’t be reached. Check your connection.</p>
        ) : hits === null ? (
          <div className="grid place-items-center py-14 text-ink-faint">
            <LoaderCircle size={22} className="animate-spin" aria-label="Searching" />
          </div>
        ) : hits.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center text-ink-soft">
            <SearchX size={26} className="mb-2 text-ink-faint" aria-hidden />
            {query ? `Nothing on LibriVox for “${query}”.` : `LibriVox has no books in ${name} yet.`}
          </div>
        ) : (
          <>
            <ul className={cx('grid grid-cols-2 gap-x-5 gap-y-7 transition-opacity sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5', loading && page === 1 && 'opacity-60')}>
              {hits.map((hit) => (
                <li key={hit.identifier} className="min-w-0">
                  <button type="button" disabled={opening !== null} onClick={() => void open(hit)} className="group block w-full text-left">
                    <span className="relative block transition-transform duration-200 ease-out group-hover:-translate-y-1 group-active:scale-[0.98]">
                      <Artwork title={hit.title} coverUrl={hit.coverUrl} className="block w-full" rounded="rounded-2xl" />
                      {opening === hit.identifier && (
                        <span className="absolute inset-0 grid place-items-center rounded-2xl bg-black/40 text-white">
                          <LoaderCircle size={24} className="animate-spin" aria-hidden />
                        </span>
                      )}
                    </span>
                    <span lang={lang} className="mt-2.5 line-clamp-2 text-[14px] leading-snug font-semibold">
                      {hit.title}
                    </span>
                    {hit.author && <span className="block truncate text-[12.5px] text-ink-soft">{hit.author}</span>}
                    {hit.runtimeMs ? <span className="mt-0.5 block text-[11.5px] font-semibold text-ink-faint">{formatDuration(hit.runtimeMs)}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
            {hits.length < total && (
              <div className="mt-8 flex justify-center">
                <Button variant="secondary" loading={loading} onClick={() => setPage((p) => p + 1)}>
                  Show more
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
