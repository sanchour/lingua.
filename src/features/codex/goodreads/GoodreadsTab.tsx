import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { BookCheck, BookOpen, ExternalLink, Feather, LayoutGrid, List, LoaderCircle, Paperclip, Search, SearchX, SlidersHorizontal, Star, Trash2, Upload } from 'lucide-react';
import { useApp } from '@/app/context';
import { inPublicDomain, plainTitle } from '@/core/parsers/goodreads';
import { deleteText, useLibrary } from '@/data/library';
import { patchSetting } from '@/data/settings';
import type { GoodreadsGroup, GoodreadsSort } from '@/data/settings';
import type { Text } from '@/data/types';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { useLayout } from '@/design/hooks/useLayout';
import { Button, buttonClasses, Drawer, IconButton, Popover, SearchInput, searchKey, Segmented, SortMenu, Switch } from '@/design/primitives';
import { fade } from '@/design/motion';
import { cx } from '@/lib/cx';
import { gutenbergBooks, importGutenberg, importWikisource, wikisourceSearch } from '@/services/discover/discover';
import type { FreeBook, SourceWork } from '@/services/discover/discover';
import { pickFile } from '@/services/files/files';
import { fillCovers } from '@/services/goodreads/covers';
import { adoptShelfItem, attachEpub } from '@/services/import/importers';
import { toast } from '@/state/ui';
import { BookCover } from '../library/BookCover';
import { addedTime, arrange, NO_FILTER, ownShelves, readTime, shelfOf, SHELVES } from './arrange';
import type { GoodreadsFilter, RatingFilter, ShelfName } from './arrange';
import { GoodreadsImport, useGoodreadsImport } from './GoodreadsImport';

const SORTS: Array<{ value: GoodreadsSort; label: string }> = [
  { value: 'added', label: 'Date added' },
  { value: 'read', label: 'Date read' },
  { value: 'rating', label: 'Your rating' },
  { value: 'author', label: 'Author' },
  { value: 'title', label: 'Title' },
  { value: 'year', label: 'Year published' },
];

const GROUPS: Array<{ value: GoodreadsGroup; label: string }> = [
  { value: 'shelf', label: 'Shelf' },
  { value: 'author', label: 'Author' },
  { value: 'yearRead', label: 'Year read' },
  { value: 'none', label: 'No groups' },
];

const RATINGS: Array<{ value: RatingFilter; label: string; ariaLabel: string }> = [
  { value: 'any', label: 'Any', ariaLabel: 'Any rating' },
  { value: '5', label: '5', ariaLabel: 'Five stars' },
  { value: '4', label: '4+', ariaLabel: 'Four stars or more' },
  { value: '3', label: '3+', ariaLabel: 'Three stars or more' },
  { value: 'none', label: 'None', ariaLabel: 'Not rated' },
];

const DAY = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' });
const day = (time: number | undefined) => (time === undefined ? '—' : DAY.format(time));

/** Codex › Goodreads (5.1-3a): the imported shelves, sorted, grouped and filtered, with covers from Open Library. */
export function GoodreadsTab({ lang }: { lang: string }) {
  const { settings } = useApp();
  const texts = useLibrary(lang);
  const books = useMemo(() => texts?.filter((t) => t.goodreads), [texts]);
  const { goodreadsSort: sort, goodreadsGroup: group, libraryView: view } = settings.ui;
  const [filter, setFilter] = useState<GoodreadsFilter>(NO_FILTER);
  const [searching, setSearching] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const { pointer } = useLayout();
  const reimport = useGoodreadsImport(lang);
  const count = books?.length ?? 0;
  const set = (patch: Partial<GoodreadsFilter>) => setFilter((f) => ({ ...f, ...patch }));

  // Covers from Open Library, asked for once per book while the tab is open.
  useEffect(() => {
    if (!count) return;
    const controller = new AbortController();
    fillCovers(lang, controller.signal).catch(() => undefined);
    return () => controller.abort();
  }, [lang, count]);

  useHotkeys({ '/': () => (searching ? searchRef.current?.focus() : setSearching(true)) }, pointer === 'fine' && count > 0);

  const groups = useMemo(() => (books ? arrange(books, { sort, group, filter, lang, key: searchKey }) : []), [books, sort, group, filter, lang]);
  const inUse = useMemo(() => new Set((books ?? []).map(shelfOf)), [books]);
  const own = useMemo(() => [...new Set((books ?? []).flatMap(ownShelves))].sort((a, b) => a.localeCompare(b)), [books]);
  const shown = groups.reduce((n, g) => n + g.books.length, 0);
  const narrowed = filter.rating !== 'any' || filter.own !== null || filter.withText;
  const open = books?.find((b) => b.id === openId);

  useEffect(() => {
    if (filter.shelf !== 'all' && !inUse.has(filter.shelf)) set({ shelf: 'all' });
  }, [filter.shelf, inUse]);

  if (!books) return null;
  if (!books.length) {
    return (
      <div className="mt-8">
        <GoodreadsImport lang={lang} />
      </div>
    );
  }

  return (
    <>
      <div className="mt-8 mb-6 flex h-11 items-center gap-2">
        <div className="relative h-full min-w-0 flex-1">
          <AnimatePresence mode="popLayout" initial={false}>
            {searching ? (
              <motion.div key="search" className="absolute inset-0" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={fade}>
                <SearchInput
                  ref={searchRef}
                  value={filter.query}
                  onChange={(query) => set({ query })}
                  placeholder="Search titles and authors"
                  onClose={() => {
                    set({ query: '' });
                    setSearching(false);
                  }}
                  autoFocus
                />
              </motion.div>
            ) : (
              <motion.div key="shelves" className="absolute inset-0 overflow-x-auto [scrollbar-width:none]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade}>
                <Segmented<ShelfName | 'all'>
                  label="Shelf"
                  value={filter.shelf}
                  onChange={(shelf) => set({ shelf })}
                  options={[{ value: 'all', label: `All ${count}` }, ...SHELVES.filter((s) => inUse.has(s.id)).map((s) => ({ value: s.id, label: s.title }))]}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {!searching && <IconButton icon={Search} label="Search" shortcut="/" onClick={() => setSearching(true)} />}
        <FilterMenu filter={filter} own={own} narrowed={narrowed} onChange={set} />
        <SortMenu<GoodreadsSort, GoodreadsGroup>
          value={sort}
          options={SORTS}
          onChange={(goodreadsSort) => void patchSetting('ui', { goodreadsSort })}
          group={{ value: group, options: GROUPS, onChange: (goodreadsGroup) => void patchSetting('ui', { goodreadsGroup }) }}
        >
          <Segmented<'grid' | 'list'>
            label="Show as"
            block
            value={view}
            onChange={(libraryView) => void patchSetting('ui', { libraryView })}
            options={[
              { value: 'grid', label: 'Covers', icon: LayoutGrid },
              { value: 'list', label: 'List', icon: List },
            ]}
          />
        </SortMenu>
        <IconButton icon={reimport.busy ? LoaderCircle : Upload} label="Import a newer Goodreads export" onClick={() => void reimport.choose()} disabled={reimport.busy} />
      </div>

      {(narrowed || filter.query) && (
        <p className="-mt-3 mb-5 flex items-center gap-3 text-[13px] font-semibold text-ink-faint" aria-live="polite">
          {shown} {shown === 1 ? 'book' : 'books'}
          {narrowed && (
            <button type="button" className="text-accent-text hover:underline" onClick={() => set({ rating: 'any', own: null, withText: false })}>
              Clear filters
            </button>
          )}
        </p>
      )}

      {shown === 0 ? (
        <div className="flex flex-col items-center py-14 text-center text-ink-soft">
          <SearchX size={28} className="mb-3 text-ink-faint" aria-hidden />
          <p className="font-semibold text-ink">No books on these shelves match</p>
          <p className="mt-1 text-sm">Try another shelf, or clear the filters.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map((g) => (
            <section key={g.id} aria-label={g.title || 'Your Goodreads books'}>
              {g.title && (
                <header className="mb-4 flex items-baseline gap-2.5 border-b border-line pb-2">
                  <h2 className="font-serif text-xl font-semibold">{g.title}</h2>
                  <span className="text-sm font-bold text-ink-faint tabular-nums">{g.books.length}</span>
                </header>
              )}
              {view === 'list' ? (
                <BookTable books={g.books} sort={sort} onOpen={(b) => setOpenId(b.id)} />
              ) : (
                <div className="grid grid-cols-3 gap-x-5 gap-y-8 md:grid-cols-5 xl:grid-cols-6">
                  {g.books.map((b) => (
                    <BookTile key={b.id} book={b} onOpen={() => setOpenId(b.id)} />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      <BookDrawer book={open} onClose={() => setOpenId(null)} />
    </>
  );
}

function FilterMenu({ filter, own, narrowed, onChange }: { filter: GoodreadsFilter; own: string[]; narrowed: boolean; onChange: (patch: Partial<GoodreadsFilter>) => void }) {
  return (
    <Popover label="Filter" placement="bottom-end" className="w-72" trigger={(props) => <IconButton {...props} icon={SlidersHorizontal} label="Filter" active={narrowed} />}>
      <div className="space-y-4 p-1.5">
        <div>
          <p className="mb-1.5 text-[11.5px] font-bold tracking-[0.1em] text-ink-faint uppercase">Your rating</p>
          <Segmented<RatingFilter> label="Your rating" block value={filter.rating} onChange={(rating) => onChange({ rating })} options={RATINGS} />
        </div>
        {own.length > 0 && (
          <div>
            <p className="mb-1.5 text-[11.5px] font-bold tracking-[0.1em] text-ink-faint uppercase">Your shelves</p>
            <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
              {own.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={filter.own === s}
                  onClick={() => onChange({ own: filter.own === s ? null : s })}
                  className={cx(
                    'rounded-full border px-2.5 py-1 text-[12.5px] font-semibold transition-colors',
                    filter.own === s ? 'border-accent bg-accent-soft text-accent-text' : 'border-line text-ink-soft hover:border-line-strong hover:text-ink',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        <label className="flex cursor-pointer items-center gap-3">
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Only books to read here</span>
            <span className="block text-[12.5px] text-ink-faint">With their EPUB or a free edition</span>
          </span>
          <Switch checked={filter.withText} onChange={(withText) => onChange({ withText })} label="Only books to read here" />
        </label>
      </div>
    </Popover>
  );
}

function Stars({ value, size = 11 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-px text-accent-text" role="img" aria-label={`Rated ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= value ? 'fill-current' : 'opacity-30'} aria-hidden />
      ))}
    </span>
  );
}

const BookTile = memo(function BookTile({ book, onOpen }: { book: Text; onOpen: () => void }) {
  const { rating, year } = book.goodreads ?? {};
  return (
    <button type="button" onClick={onOpen} className="group block w-full text-left [content-visibility:auto] [contain-intrinsic-size:auto_320px]" aria-label={`${book.title}: details`}>
      <div className="relative transition-transform duration-200 ease-out group-hover:-translate-y-1 group-active:scale-[0.98]">
        <BookCover text={book} lazy />
        {book.kind !== 'shelfItem' && (
          <span className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-raised/90 text-sage-text shadow-elev-1" title="Here to read">
            <BookOpen size={13} aria-hidden />
          </span>
        )}
      </div>
      <p className="mt-2.5 line-clamp-2 text-[14px] leading-snug font-semibold">{book.title}</p>
      {book.author && <p className="truncate text-[12.5px] text-ink-soft">{book.author}</p>}
      {(rating || year) && (
        <p className="mt-1 flex items-center gap-2 text-[11.5px] font-semibold text-ink-faint">
          {rating ? <Stars value={rating} /> : null}
          {year && <span className="tabular-nums">{year}</span>}
        </p>
      )}
    </button>
  );
});

const COLUMNS = 'grid grid-cols-[minmax(0,1fr)_6rem_4rem_7rem_7rem] items-center gap-4';

/** The list view: a table of the shelf, its headings sorting it. */
function BookTable({ books, sort, onOpen }: { books: Text[]; sort: GoodreadsSort; onOpen: (book: Text) => void }) {
  const heading = (value: GoodreadsSort, label: string) => (
    <button type="button" onClick={() => void patchSetting('ui', { goodreadsSort: value })} aria-pressed={sort === value} className={cx('text-left transition-colors hover:text-ink', sort === value && 'text-ink')}>
      {label}
    </button>
  );
  return (
    <div className="-mx-2">
      <div className={cx(COLUMNS, 'px-2 pb-2 text-[11.5px] font-bold tracking-[0.08em] text-ink-faint uppercase')}>
        <span className="flex gap-3 pl-14">
          {heading('title', 'Title')}
          {heading('author', 'Author')}
        </span>
        {heading('rating', 'Rating')}
        {heading('year', 'Year')}
        {heading('read', 'Read')}
        {heading('added', 'Added')}
      </div>
      {books.map((b) => (
        <button key={b.id} type="button" onClick={() => onOpen(b)} className={cx(COLUMNS, 'w-full rounded-2xl px-2 py-2 text-left transition-colors [content-visibility:auto] [contain-intrinsic-size:auto_60px] hover:bg-surface/70')}>
          <span className="flex min-w-0 items-center gap-3.5">
            <BookCover text={b} size="sm" lazy className="w-10 shrink-0" />
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold">{b.title}</span>
              <span className="flex items-center gap-1.5 truncate text-[13px] text-ink-soft">
                {b.kind !== 'shelfItem' && <BookOpen size={13} className="shrink-0 text-sage-text" aria-label="Here to read" />}
                {b.author}
              </span>
            </span>
          </span>
          <span>{b.goodreads?.rating ? <Stars value={b.goodreads.rating} /> : <span className="text-ink-faint">—</span>}</span>
          <span className="text-sm text-ink-soft tabular-nums">{b.goodreads?.year ?? '—'}</span>
          <span className="text-sm text-ink-soft tabular-nums">{day(readTime(b))}</span>
          <span className="text-sm text-ink-soft tabular-nums">{day(addedTime(b))}</span>
        </button>
      ))}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[11.5px] font-bold tracking-[0.08em] text-ink-faint uppercase">{label}</dt>
      <dd className="mt-0.5 text-[14.5px]">{children}</dd>
    </div>
  );
}

/** A book's details, and the ways to read it here: its EPUB, or a free edition when it is old enough. */
function BookDrawer({ book, onClose }: { book: Text | undefined; onClose: () => void }) {
  // The last book shown stays while the drawer slides away.
  const last = useRef(book);
  if (book) last.current = book;
  const b = book ?? last.current;
  const navigate = useNavigate();
  const [finding, setFinding] = useState(false);
  useEffect(() => setFinding(false), [book?.id]);
  if (!b) return null;

  const { rating, year, bookId } = b.goodreads ?? {};
  const shelfOnly = b.kind === 'shelfItem';
  const own = ownShelves(b);
  const read = readTime(b);
  const open = (id: string) => {
    onClose();
    navigate(`/codex/read/${id}`);
  };
  const attach = async () => {
    const file = await pickFile('.epub,application/epub+zip');
    if (!file) return;
    try {
      open(await attachEpub(b, file));
    } catch (error) {
      toast(error instanceof Error ? error.message : 'That EPUB couldn’t be opened.', { tone: 'error' });
    }
  };

  return (
    <Drawer
      open={Boolean(book)}
      onClose={onClose}
      title={b.title}
      description={b.author}
      footer={
        <div className="flex items-center gap-2">
          {bookId && (
            <a href={`https://www.goodreads.com/book/show/${encodeURIComponent(bookId)}`} target="_blank" rel="noreferrer" className={buttonClasses('ghost', 'md')}>
              <ExternalLink size={16} aria-hidden /> On Goodreads
            </a>
          )}
          {shelfOnly && (
            <Button
              variant="ghost"
              icon={Trash2}
              className="ml-auto"
              onClick={async () => {
                onClose();
                await deleteText(b.id);
                toast('Removed from your Goodreads shelves here.');
              }}
            >
              Remove
            </Button>
          )}
        </div>
      }
    >
      <div className="flex gap-5">
        <BookCover text={b} size="lg" className="w-32 shrink-0" />
        <dl className="min-w-0 flex-1 space-y-3">
          <Fact label="Shelf">{SHELVES.find((s) => s.id === shelfOf(b))!.title}</Fact>
          {rating ? (
            <Fact label="Your rating">
              <Stars value={rating} size={15} />
            </Fact>
          ) : null}
          {year && <Fact label="First published">{year}</Fact>}
          {read !== undefined && <Fact label="Read">{day(read)}</Fact>}
          <Fact label="Added">{day(addedTime(b))}</Fact>
        </dl>
      </div>
      {own.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-1.5" aria-label="Your shelves">
          {own.map((s) => (
            <span key={s} className="rounded-full bg-sunken px-2.5 py-1 text-[12.5px] font-semibold text-ink-soft">
              {s}
            </span>
          ))}
        </div>
      )}

      <div className="mt-6 space-y-2">
        {!shelfOnly ? (
          <Link to={`/codex/read/${b.id}`} onClick={onClose} className={buttonClasses('primary', 'md', true)}>
            <BookOpen size={17} aria-hidden /> Read
          </Link>
        ) : (
          <>
            <Button icon={Paperclip} block onClick={() => void attach()}>
              Add the EPUB
            </Button>
            {(year === undefined || inPublicDomain(year)) && !finding && (
              <Button variant="secondary" icon={Feather} block onClick={() => setFinding(true)}>
                Find a free edition
              </Button>
            )}
            {year !== undefined && !inPublicDomain(year) && <p className="pt-1 text-center text-[12.5px] text-ink-faint">Published in {year}: not free to read yet, so no free edition.</p>}
          </>
        )}
      </div>
      {finding && shelfOnly && <FreeEditions book={b} onAdded={open} />}
    </Drawer>
  );
}

/**
 * Free editions on Project Gutenberg and Wikisource in the language: by title and the author's
 * surname, else by the surname (a title from Goodreads may be a translation's), else by title.
 */
function FreeEditions({ book, onAdded }: { book: Text; onAdded: (id: string) => void }) {
  const [found, setFound] = useState<{ books: FreeBook[]; works: SourceWork[]; failed: boolean } | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const title = plainTitle(book.title);
    const surname = book.author?.trim().split(/\s+/).at(-1);
    const queries = [...new Set([surname && `${title} ${surname}`, surname, title].filter((q): q is string => Boolean(q)))];
    void (async () => {
      let result = { books: [] as FreeBook[], works: [] as SourceWork[], failed: false };
      for (const q of queries) {
        const [g, w] = await Promise.allSettled([gutenbergBooks(book.lang, q), wikisourceSearch(book.lang, q)]);
        result = { books: g.status === 'fulfilled' ? g.value.slice(0, 9) : [], works: w.status === 'fulfilled' ? w.value.slice(0, 8) : [], failed: g.status === 'rejected' && w.status === 'rejected' };
        if (result.books.length || result.works.length) break;
      }
      if (!cancelled) setFound(result);
    })();
    return () => {
      cancelled = true;
    };
  }, [book.id, book.author, book.title, book.lang]);

  const add = async (key: string, run: () => Promise<string>) => {
    setAdding(key);
    setProgress(0);
    try {
      const id = await run();
      await adoptShelfItem(book, id);
      onAdded(id);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'That edition couldn’t be added.', { tone: 'error' });
      setAdding(null);
    }
  };

  if (!found) {
    return (
      <p className="mt-6 flex items-center justify-center gap-2 text-sm text-ink-faint">
        <LoaderCircle size={15} className="animate-spin" aria-hidden /> Looking on Project Gutenberg and Wikisource…
      </p>
    );
  }
  if (!found.books.length && !found.works.length) {
    return <p className="mt-6 text-center text-sm text-ink-soft">{found.failed ? 'Project Gutenberg and Wikisource didn’t answer. Try again in a moment.' : 'No free edition found in this language.'}</p>;
  }
  return (
    <div className="mt-6">
      <p className="mb-2 text-[11.5px] font-bold tracking-[0.1em] text-ink-faint uppercase">Free editions · choose one to read</p>
      <ul className="space-y-0.5">
        {found.books.map((f) => (
          <li key={`g${f.id}`}>
            <button type="button" disabled={adding !== null} onClick={() => void add(`g${f.id}`, () => importGutenberg(book.lang, f))} className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-surface disabled:opacity-60">
              <BookCover text={{ id: `g${f.id}`, title: f.title, author: f.author, lang: book.lang, coverUrl: f.cover }} size="sm" className="w-9 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{f.title}</span>
                <span className="block truncate text-[12.5px] text-ink-soft">{f.author ? `${f.author} · ` : ''}Project Gutenberg</span>
              </span>
              {adding === `g${f.id}` && <LoaderCircle size={15} className="shrink-0 animate-spin text-ink-faint" aria-label="Adding" />}
            </button>
          </li>
        ))}
        {found.works.map((w) => (
          <li key={`w${w.url}`}>
            <button type="button" disabled={adding !== null} onClick={() => void add(`w${w.url}`, () => importWikisource(book.lang, w, setProgress))} className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-surface disabled:opacity-60">
              <span className="grid aspect-[2/3] w-9 shrink-0 place-items-center rounded-[5px] bg-sunken text-ink-faint">
                <BookCheck size={15} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{w.title}</span>
                <span className="block truncate text-[12.5px] text-ink-soft">Wikisource</span>
              </span>
              {adding === `w${w.url}` && (
                <span className="flex shrink-0 items-center gap-1.5 text-[12px] font-semibold text-ink-faint tabular-nums">
                  {progress > 0 && `${Math.round(progress * 100)}%`}
                  <LoaderCircle size={15} className="animate-spin" aria-label="Adding" />
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
