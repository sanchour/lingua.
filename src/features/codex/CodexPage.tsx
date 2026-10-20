import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, BookOpenText, Feather, LayoutGrid, Library, List, Plus, Search, SearchX, Sparkles } from 'lucide-react';
import { useApp } from '@/app/context';
import { useFullMotion } from '@/app/motion';
import { PageHeader } from '@/app/PageHeader';
import { SAMPLES } from '@/core/lang/samples';
import { refreshTextStats, useAllProgress, useLibrary } from '@/data/library';
import { patchSetting } from '@/data/settings';
import type { LibrarySort } from '@/data/settings';
import type { ReadingProgress, Text } from '@/data/types';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { useLayout } from '@/design/hooks/useLayout';
import { Button, buttonClasses, Card, IconButton, SearchInput, searchKey, Segmented, SortMenu } from '@/design/primitives';
import { fade, spring } from '@/design/motion';
import { attachEpub } from '@/services/import/importers';
import { pickFile } from '@/services/files/files';
import { toast } from '@/state/ui';
import { DiariumHome, NewEntryButton } from './diarium/DiariumHome';
import { BookCard, BookRow } from './library/BookCard';
import { BookCover } from './library/BookCover';
import { useImporter } from './library/useImporter';
import { MundusLink } from '@/features/mundus/MundusLink';

type Group = 'reading' | 'next' | 'finished' | 'wishlist';
type Filter = 'all' | Group;

const GROUPS: Array<{ id: Group; title: string; hint?: string }> = [
  { id: 'reading', title: 'Reading' },
  { id: 'next', title: 'Up next' },
  { id: 'wishlist', title: 'Wishlist', hint: 'From Goodreads. Add the EPUB to start reading.' },
  { id: 'finished', title: 'Finished' },
];

const SORTS: Array<{ value: LibrarySort; label: string }> = [
  { value: 'recent', label: 'Recently read' },
  { value: 'added', label: 'Recently added' },
  { value: 'title', label: 'Title' },
  { value: 'author', label: 'Author' },
  { value: 'progress', label: 'Progress' },
  { value: 'known', label: 'Easiest first' },
];

function groupOf(t: Text, progress: Map<string, ReadingProgress> | undefined): Group {
  if (t.finishedAt || (t.kind === 'shelfItem' && t.shelf === 'read')) return 'finished';
  if (t.kind === 'shelfItem') return 'wishlist';
  return (progress?.get(t.id)?.percent ?? 0) > 0 ? 'reading' : 'next';
}

function sorter(sort: LibrarySort, progress: Map<string, ReadingProgress> | undefined, lang: string): (a: Text, b: Text) => number {
  const collator = new Intl.Collator(lang, { sensitivity: 'base', numeric: true });
  switch (sort) {
    case 'added':
      return (a, b) => b.createdAt - a.createdAt;
    case 'title':
      return (a, b) => collator.compare(a.title, b.title);
    case 'author':
      return (a, b) => collator.compare(a.author ?? '￿', b.author ?? '￿') || collator.compare(a.title, b.title);
    case 'progress':
      return (a, b) => (progress?.get(b.id)?.percent ?? 0) - (progress?.get(a.id)?.percent ?? 0);
    case 'known':
      return (a, b) => (b.stats?.knownShare ?? -1) - (a.stats?.knownShare ?? -1);
    default:
      return (a, b) => (b.lastOpenedAt ?? b.createdAt) - (a.lastOpenedAt ?? a.createdAt);
  }
}

export default function CodexPage() {
  const { language, settings } = useApp();
  const lang = language.id;
  const texts = useLibrary(lang);
  const progress = useAllProgress();
  const { busy, run } = useImporter(lang);
  const navigate = useNavigate();
  const { pointer } = useLayout();
  const [filter, setFilter] = useState<Filter>('all');
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const { librarySort: sort, libraryView: view } = settings.ui;
  const [params, setParams] = useSearchParams();
  const tab: 'library' | 'diarium' = params.get('tab') === 'diarium' ? 'diarium' : 'library';

  useHotkeys({ '/': () => (searching ? searchRef.current?.focus() : setSearching(true)) }, pointer === 'fine' && tab === 'library' && Boolean(texts?.length));

  // Comprehension drifts as words become known; refresh quietly, one book at a time.
  useEffect(() => {
    if (!texts) return;
    let cancelled = false;
    const stale = texts.filter((t) => t.kind !== 'shelfItem' && (!t.stats || Date.now() - t.stats.computedAt > 120_000));
    void (async () => {
      for (const t of stale) {
        if (cancelled) return;
        await refreshTextStats(t.id);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Keyed on the number of books, not on every stats update (which would loop).
  }, [texts?.length, lang]);

  const current = useMemo(
    () => texts?.find((t) => t.kind !== 'shelfItem' && !t.finishedAt && progress?.has(t.id)),
    [texts, progress],
  );

  const grouped = useMemo(() => {
    const out = new Map<Group, Text[]>(GROUPS.map((g) => [g.id, []]));
    const q = searchKey(query.trim());
    const compare = sorter(sort, progress, lang);
    for (const t of texts ?? []) {
      if (q && !searchKey(`${t.title} ${t.author ?? ''}`).includes(q)) continue;
      out.get(groupOf(t, progress))!.push(t);
    }
    for (const list of out.values()) list.sort(compare);
    return out;
  }, [texts, progress, query, sort, lang]);

  // Filter chips only for shelves that have books (ignoring the search, so they don't jump).
  const inUse = useMemo(() => new Set((texts ?? []).map((t) => groupOf(t, progress))), [texts, progress]);
  useEffect(() => {
    if (filter !== 'all' && !inUse.has(filter)) setFilter('all');
  }, [filter, inUse]);

  const sections = GROUPS.filter((g) => (filter === 'all' || filter === g.id) && grouped.get(g.id)!.length > 0);
  const showHeadings = filter === 'all' && inUse.size > 1;
  const matches = sections.reduce((n, g) => n + grouped.get(g.id)!.length, 0);

  const attach = async (item: Text) => {
    const file = await pickFile('.epub,application/epub+zip');
    if (!file) return;
    try {
      const id = await attachEpub(item, file);
      navigate(`/codex/read/${id}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'That EPUB couldn’t be opened.', { tone: 'error' });
    }
  };

  const closeSearch = () => {
    setQuery('');
    setSearching(false);
  };

  return (
    <>
      <PageHeader
        title="Codex"
        actions={
          tab === 'diarium' ? (
            <NewEntryButton />
          ) : (
            <Link to="/codex/new" className={buttonClasses('primary', 'md')}>
              <Plus size={17} aria-hidden /> Add
            </Link>
          )
        }
      />
      <div className="-mt-2 mb-7">
        <Segmented<'library' | 'diarium'>
          label="Codex"
          value={tab}
          onChange={(next) => setParams(next === 'library' ? {} : { tab: next }, { replace: true })}
          options={[
            { value: 'library', label: 'Library', icon: Library },
            { value: 'diarium', label: 'Diarium', icon: Feather },
          ]}
        />
      </div>

      {tab === 'diarium' && <DiariumHome />}
      {tab === 'library' && (
        <>

      {texts && texts.length === 0 && <EmptyLibrary lang={lang} busy={busy === 'sample'} onSample={() => void run('sample')} />}

      {current && progress && !query && <ContinueCard text={current} progress={progress.get(current.id)!} />}

      {texts && texts.length > 0 && (
        <>
          <div className="mt-8 mb-6 flex h-11 items-center gap-2">
            <div className="relative h-full min-w-0 flex-1">
              <AnimatePresence mode="popLayout" initial={false}>
                {searching ? (
                  <motion.div key="search" className="absolute inset-0" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={fade}>
                    <SearchInput ref={searchRef} value={query} onChange={setQuery} placeholder="Search titles and authors" onClose={closeSearch} autoFocus />
                  </motion.div>
                ) : (
                  <motion.div key="filter" className="absolute inset-0 overflow-x-auto [scrollbar-width:none]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade}>
                    {inUse.size > 1 ? (
                      <Segmented<Filter>
                        label="Shelf"
                        value={filter}
                        onChange={setFilter}
                        options={[{ value: 'all', label: 'All' }, ...GROUPS.filter((g) => inUse.has(g.id)).map((g) => ({ value: g.id, label: g.title }))]}
                      />
                    ) : (
                      <p className="flex h-full items-center font-serif text-xl font-semibold">
                        Your shelf <span className="ml-2 font-sans text-sm font-bold text-ink-faint tabular-nums">{texts.length}</span>
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {!searching && <IconButton icon={Search} label="Search" shortcut="/" onClick={() => setSearching(true)} />}
            <SortMenu value={sort} options={SORTS} onChange={(librarySort) => void patchSetting('ui', { librarySort })}>
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
          </div>

          {query && (
            <p className="-mt-3 mb-5 text-[13px] font-semibold text-ink-faint" aria-live="polite">
              {matches === 0 ? '' : `${matches} ${matches === 1 ? 'book' : 'books'}`}
            </p>
          )}

          {matches === 0 && query ? (
            <div className="flex flex-col items-center py-14 text-center text-ink-soft">
              <SearchX size={28} className="mb-3 text-ink-faint" aria-hidden />
              <p className="font-semibold text-ink">Nothing on your shelves matches “{query.trim()}”</p>
              <p className="mt-1 text-sm">Try part of the title or the author’s surname.</p>
            </div>
          ) : (
            <div className="space-y-10">
              {sections.map((g) => (
                <section key={g.id} aria-label={g.title}>
                  {showHeadings && (
                    <header className="mb-4 flex items-baseline gap-2.5 border-b border-line pb-2">
                      <h2 className="font-serif text-xl font-semibold">{g.title}</h2>
                      <span className="text-sm font-bold text-ink-faint tabular-nums">{grouped.get(g.id)!.length}</span>
                      {g.hint && <span className="ml-auto hidden text-[12.5px] text-ink-faint sm:block">{g.hint}</span>}
                    </header>
                  )}
                  <Shelf texts={grouped.get(g.id)!} progress={progress} view={view} onAttach={(t) => void attach(t)} />
                </section>
              ))}
            </div>
          )}
        </>
      )}
      {texts && <MundusLink shelf="read">Books and news to read next</MundusLink>}
        </>
      )}
    </>
  );
}

function Shelf({ texts, progress, view, onAttach }: { texts: Text[]; progress?: Map<string, ReadingProgress>; view: 'grid' | 'list'; onAttach: (t: Text) => void }) {
  // Full motion: books glide to their new places when the sort or filter changes.
  const layout = useFullMotion() ? 'position' : undefined;
  if (view === 'list') {
    return (
      <div className="-mx-2 flex flex-col">
        {texts.map((t, i) => (
          <motion.div key={t.id} layout={layout} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.soft, delay: Math.min(i, 10) * 0.02, layout: spring.fluid }}>
            <BookRow text={t} progress={progress?.get(t.id)} onAttach={onAttach} />
          </motion.div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
      {texts.map((t, i) => (
        <motion.div key={t.id} layout={layout} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.soft, delay: Math.min(i, 10) * 0.03, layout: spring.fluid }}>
          <BookCard text={t} progress={progress?.get(t.id)} onAttach={onAttach} />
        </motion.div>
      ))}
    </div>
  );
}

function ContinueCard({ text, progress }: { text: Text; progress: ReadingProgress }) {
  const pct = Math.round(progress.percent * 100);
  return (
    <Card className="relative flex items-center gap-5 p-4 sm:p-5">
      <Link to={`/codex/read/${text.id}`} className="w-20 shrink-0 sm:w-24" aria-label={`Continue reading ${text.title}`}>
        <BookCover text={text} size="sm" />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-bold tracking-[0.12em] text-sage-text uppercase">Continue reading</p>
        <p lang={text.lang} className="mt-1 line-clamp-2 font-serif text-xl leading-tight font-semibold">
          {text.title}
        </p>
        {text.author && <p className="truncate text-sm text-ink-soft">{text.author}</p>}
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 max-w-48 flex-1 overflow-hidden rounded-full bg-sunken">
            <div className="h-full origin-left rounded-full bg-accent" style={{ transform: `scaleX(${Math.max(0.02, progress.percent)})` }} />
          </div>
          <span className="text-xs font-semibold text-ink-faint tabular-nums">{pct}%</span>
        </div>
      </div>
      <div className="hidden shrink-0 sm:block">
        <Link to={`/codex/read/${text.id}`} className={buttonClasses('primary', 'md')}>
          Continue <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
    </Card>
  );
}

function EmptyLibrary({ lang, busy, onSample }: { lang: string; busy: boolean; onSample: () => void }) {
  return (
    <Card className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-5 grid size-16 place-items-center rounded-2xl bg-sage-soft text-sage-text">
        <BookOpenText size={28} aria-hidden />
      </div>
      <h2 className="font-serif text-2xl font-semibold">Your shelves are waiting</h2>
      <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-ink-soft">
        Add a book, a text file or something you pasted. Or start with a short page, written for you.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link to="/codex/new" className={buttonClasses('primary', 'md')}>
          <Plus size={17} aria-hidden /> Add a book or text
        </Link>
        <Button variant="secondary" icon={Sparkles} onClick={onSample} loading={busy}>
          Read “{SAMPLES[lang]?.title ?? SAMPLES.en.title}”
        </Button>
      </div>
    </Card>
  );
}
