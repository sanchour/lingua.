import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ArrowUpRight, BookCheck, LoaderCircle, Newspaper, RotateCcw } from 'lucide-react';
import { getLanguage } from '@/core/lang/languages';
import { NEWS_SOURCES } from '@/core/lang/news';
import type { NewsSource } from '@/core/lang/news';
import type { NewsItem } from '@/core/parsers/article';
import { useLibrary } from '@/data/library';
import { SearchInput } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { gutenbergBooks, importGutenberg, importWikipedia, importWikisource, wikipediaToday, wikisourceSearch } from '@/services/discover/discover';
import type { FreeBook, SourceWork, WikiArticle } from '@/services/discover/discover';
import { addArticle, latestNews, readArticle } from '@/services/news/news';
import { toast } from '@/state/ui';
import { BookCover } from '../library/BookCover';

type Load<T> = { state: 'loading' } | { state: 'ready'; items: T } | { state: 'failed'; message: string };

/** A list from the web, loaded when shown (and again on Try again). */
function useLoad<T>(load: () => Promise<T>, deps: unknown[]): [Load<T>, () => void] {
  const [result, setResult] = useState<Load<T>>({ state: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setResult({ state: 'loading' });
    load().then(
      (items) => live && setResult({ state: 'ready', items }),
      (error: unknown) => live && setResult({ state: 'failed', message: error instanceof Error ? error.message : 'That couldn’t be loaded.' }),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);
  return [result, () => setAttempt((a) => a + 1)];
}

/**
 * Discover (5.1-3a): free and legal reading from the web, on shelves with real covers, one click into
 * the library. Wikipedia's most read, the language's news, Project Gutenberg and Wikisource; links to
 * the picture-book and comic libraries that don't let apps read their files.
 */
export function DiscoverTab({ lang }: { lang: string }) {
  const navigate = useNavigate();
  const texts = useLibrary(lang);
  const onShelf = useMemo(() => new Map((texts ?? []).flatMap((t) => (t.sourceUrl ? [[t.sourceUrl, t] as const] : []))), [texts]);
  const [adding, setAdding] = useState<string | null>(null);
  // How far a Wikisource work's chapters have come in (a long work is many pages).
  const [progress, setProgress] = useState(0);
  const name = getLanguage(lang)?.name ?? lang;

  /** Adds something (one at a time), then opens it: articles in the reader, books on their page. */
  const add = async (url: string, work: () => Promise<string>, as: 'article' | 'book') => {
    const there = onShelf.get(url);
    if (there) return navigate(there.kind === 'article' ? `/codex/read/${there.id}` : `/codex/book/${there.id}`);
    if (adding) return;
    setAdding(url);
    setProgress(0);
    try {
      const id = await work();
      navigate(as === 'article' ? `/codex/read/${id}` : `/codex/book/${id}?new=1`);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'That couldn’t be added.', { tone: 'error' });
      setAdding(null);
    }
  };
  const status = (url: string) => (adding === url ? 'adding' : onShelf.has(url) ? 'shelved' : null);

  return (
    <div className="space-y-14">
      <WikipediaShelf lang={lang} name={name} status={status} onAdd={(a) => void add(a.url, () => importWikipedia(lang, a), 'article')} />
      <NewsShelf lang={lang} status={status} onAdd={(item) => void add(item.link, async () => addArticle(lang, await readArticle(item.link, lang), item.link), 'article')} />
      <BooksShelf
        lang={lang}
        name={name}
        status={status}
        onBook={(b) => void add(b.url, () => importGutenberg(lang, b), 'book')}
        progress={progress}
        onWork={(w) => void add(w.url, () => importWikisource(lang, w, setProgress), 'book')}
      />
      <PictureBooks name={name} />
    </div>
  );
}

type Status = (url: string) => 'adding' | 'shelved' | null;

function ShelfHeader({ title, note, children }: { title: string; note: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end gap-x-6 gap-y-3 border-b border-line pb-3">
      <div className="min-w-0 flex-1">
        <h2 className="font-serif text-[24px] leading-tight font-semibold">{title}</h2>
        <p className="mt-1 text-[13px] text-ink-faint">{note}</p>
      </div>
      {children}
    </header>
  );
}

function Failed({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <p className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-[14px] text-ink-soft">
      {message}
      <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 font-semibold text-accent-text hover:underline">
        <RotateCcw size={13} aria-hidden /> Try again
      </button>
    </p>
  );
}

/** What sits over an item while it is added, or once it is on the shelf. */
function Badge({ status }: { status: 'adding' | 'shelved' | null }) {
  if (!status) return null;
  return (
    <span className={cx('absolute top-2 right-2 z-10 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11.5px] font-bold shadow-elev-1', status === 'adding' ? 'bg-surface text-ink' : 'bg-sage-soft text-sage-text')}>
      {status === 'adding' ? <LoaderCircle size={12} className="animate-spin" aria-hidden /> : <BookCheck size={12} aria-hidden />}
      {status === 'adding' ? 'Adding…' : 'On your shelf'}
    </span>
  );
}

function WikipediaShelf({ lang, name, status, onAdd }: { lang: string; name: string; status: Status; onAdd: (a: WikiArticle) => void }) {
  const [list, retry] = useLoad(() => wikipediaToday(lang), [lang]);
  return (
    <section aria-label="Most read on Wikipedia">
      <ShelfHeader title="Most read on Wikipedia" note={`What ${name} speakers are reading today. Whole articles, without the lists of sources · CC BY-SA`} />
      {list.state === 'failed' && <Failed message={list.message} onRetry={retry} />}
      {list.state === 'ready' && !list.items.length && <p className="text-[14px] text-ink-soft">Nothing to show from this Wikipedia today.</p>}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {list.state === 'loading' && Array.from({ length: 8 }, (_, i) => <div key={i} className="h-60 animate-pulse rounded-2xl bg-sunken" />)}
        {list.state === 'ready' &&
          list.items.slice(0, list.items[0]?.featured ? 7 : 8).map((a, i) => (
            <motion.button
              key={a.url}
              type="button"
              onClick={() => onAdd(a)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring.soft, delay: Math.min(i, 8) * 0.03 }}
              className={cx(
                'group relative flex flex-col overflow-hidden rounded-2xl border border-line/70 bg-surface text-left transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-elev-2',
                a.featured && 'col-span-2 lg:row-span-1',
              )}
            >
              <Badge status={status(a.url)} />
              <div className={cx('w-full shrink-0 overflow-hidden bg-sunken', a.featured ? 'aspect-[2/1]' : 'aspect-[16/10]')}>
                {a.thumbnail && <img src={a.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />}
              </div>
              <div className="flex min-h-0 flex-1 flex-col p-4">
                {a.featured && <span className="mb-1 text-[11px] font-bold tracking-[0.14em] text-sage-text uppercase">Article of the day</span>}
                <span lang={lang} className="font-serif text-[17px] leading-snug font-semibold">
                  {a.title}
                </span>
                <span lang={lang} className={cx('mt-1.5 text-[13.5px] leading-relaxed text-ink-soft', a.featured ? 'line-clamp-3' : 'line-clamp-3')}>
                  {a.extract}
                </span>
              </div>
            </motion.button>
          ))}
      </div>
    </section>
  );
}

function NewsShelf({ lang, status, onAdd }: { lang: string; status: Status; onAdd: (item: NewsItem) => void }) {
  const sources = (NEWS_SOURCES[lang] ?? []).slice(0, 2);
  if (!sources.length) return null;
  return (
    <section aria-label="In the news">
      <ShelfHeader title="In the news" note="The latest stories, read with the article only (no menus or adverts). From the sources in News & links." />
      <div className={cx('grid gap-4', sources.length > 1 && 'lg:grid-cols-2')}>
        {sources.map((s) => (
          <NewsSourceCard key={s.id} source={s} lang={lang} status={status} onAdd={onAdd} />
        ))}
      </div>
    </section>
  );
}

function NewsSourceCard({ source, lang, status, onAdd }: { source: NewsSource; lang: string; status: Status; onAdd: (item: NewsItem) => void }) {
  const [list, retry] = useLoad(() => latestNews(source), [source.id]);
  return (
    <div className="rounded-3xl border border-line/70 bg-surface p-2">
      <p className="flex items-center gap-2 px-3 pt-2 pb-1 text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase">
        <Newspaper size={14} aria-hidden /> {source.name}
      </p>
      {list.state === 'loading' && <div className="m-2 h-52 animate-pulse rounded-2xl bg-sunken" />}
      {list.state === 'failed' && (
        <div className="p-2">
          <Failed message={list.message} onRetry={retry} />
        </div>
      )}
      {list.state === 'ready' && (
        <ul>
          {list.items.slice(0, 6).map((item) => {
            const s = status(item.link);
            return (
              <li key={item.link}>
                <button type="button" onClick={() => onAdd(item)} className="flex w-full items-start gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-raised">
                  <span lang={lang} className="min-w-0 flex-1 text-[14.5px] leading-snug font-semibold">
                    {item.title}
                  </span>
                  {s === 'adding' && <LoaderCircle size={15} className="mt-0.5 shrink-0 animate-spin text-ink-faint" aria-label="Adding" />}
                  {s === 'shelved' && <BookCheck size={15} className="mt-0.5 shrink-0 text-sage-text" aria-label="On your shelf" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function BooksShelf({ lang, name, status, progress, onBook, onWork }: { lang: string; name: string; status: Status; progress: number; onBook: (b: FreeBook) => void; onWork: (w: SourceWork) => void }) {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 450);
    return () => clearTimeout(t);
  }, [query]);
  const [books, retry] = useLoad(() => gutenbergBooks(lang, search), [lang, search]);
  const [works] = useLoad(() => wikisourceSearch(lang, search), [lang, search]);

  return (
    <section aria-label="Free books">
      <ShelfHeader title="Free books" note={`Classics in ${name} from Project Gutenberg and Wikisource, free of copyright. A book’s chapters come with it.`}>
        <SearchInput value={query} onChange={setQuery} placeholder="Search titles and authors" className="w-full sm:w-72" />
      </ShelfHeader>
      {books.state === 'failed' && <Failed message={books.message} onRetry={retry} />}
      {books.state === 'ready' && !books.items.length && (
        <p className="text-[14px] text-ink-soft">{search ? `No books on Project Gutenberg match “${search}”.` : `Project Gutenberg has no books in ${name} yet.`}</p>
      )}
      <div className="grid grid-cols-3 gap-x-5 gap-y-7 sm:grid-cols-4 lg:grid-cols-6">
        {books.state === 'loading' && Array.from({ length: 12 }, (_, i) => <div key={i} className="aspect-[2/3] animate-pulse rounded-[6px] bg-sunken" />)}
        {books.state === 'ready' &&
          books.items.slice(0, 18).map((b, i) => (
            <motion.button
              key={b.id}
              type="button"
              onClick={() => onBook(b)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring.soft, delay: Math.min(i, 12) * 0.025 }}
              className="group relative text-left"
            >
              <Badge status={status(b.url)} />
              <BookCover text={{ id: `pg-${b.id}`, title: b.title, author: b.author, lang, coverUrl: b.cover }} className="w-full transition-transform group-hover:-translate-y-1" />
              <span lang={lang} className="mt-2.5 line-clamp-2 block text-[13.5px] leading-snug font-semibold">
                {b.title}
              </span>
              {b.author && <span className="mt-0.5 line-clamp-1 block text-[12.5px] text-ink-faint">{b.author}</span>}
            </motion.button>
          ))}
      </div>
      {works.state === 'ready' && works.items.length > 0 && (
        <div className="mt-8">
          <p className="mb-2 text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase">On Wikisource</p>
          <ul className="divide-y divide-line/60 rounded-2xl border border-line/70 bg-surface">
            {works.items.map((w) => {
              const s = status(w.url);
              return (
                <li key={w.url}>
                  <button type="button" onClick={() => onWork(w)} className="flex w-full items-baseline gap-3 px-4 py-3 text-left transition-colors hover:bg-raised">
                    <span lang={lang} className="shrink-0 font-semibold">
                      {w.title}
                    </span>
                    <span lang={lang} className="min-w-0 flex-1 truncate text-[13px] text-ink-faint">
                      {w.snippet}
                    </span>
                    {s === 'adding' && (
                      <span className="flex shrink-0 items-center gap-1.5 text-[12px] font-semibold text-ink-faint tabular-nums">
                        {progress > 0 && `${Math.round(progress * 100)}%`}
                        <LoaderCircle size={15} className="animate-spin" aria-label="Adding" />
                      </span>
                    )}
                    {s === 'shelved' && <BookCheck size={15} className="shrink-0 text-sage-text" aria-label="On your shelf" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

const PICTURE_BOOKS = [
  { name: 'StoryWeaver', url: 'https://storyweaver.org.in/', what: 'Graded picture books in hundreds of languages, CC BY.' },
  { name: 'African Storybook', url: 'https://www.africanstorybook.org/', what: 'Picture books for young readers, CC BY.' },
  { name: 'Bloom Library', url: 'https://bloomlibrary.org/', what: 'Simple books made by communities, mostly CC BY.' },
  { name: 'Pepper&Carrot', url: 'https://www.peppercarrot.com/', what: 'A comic about a young witch, CC BY, in many languages.' },
];

/** These libraries don't let apps read their files: open them, download a book, add it here. */
function PictureBooks({ name }: { name: string }) {
  return (
    <section aria-label="Picture books and comics">
      <ShelfHeader title="Picture books and comics" note={`Free libraries with books in ${name}. Download one there (EPUB, PDF or CBZ), then add it with Add › Import a book or Import a comic.`} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PICTURE_BOOKS.map((p) => (
          <a key={p.name} href={p.url} target="_blank" rel="noreferrer" className="group flex flex-col rounded-2xl border border-line/70 bg-surface p-4 transition-colors hover:bg-raised">
            <span className="flex items-center gap-1.5 font-semibold">
              {p.name} <ArrowUpRight size={15} className="text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
            </span>
            <span className="mt-1 text-[13px] leading-snug text-ink-soft">{p.what}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
