import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ExternalLink, FolderPlus, LoaderCircle, Search } from 'lucide-react';
import { BackLink } from '@/app/BackLink';
import { useApp } from '@/app/context';
import { formatDuration } from '@/core/audio/cues';
import { getLanguage } from '@/core/lang/languages';
import { Button, Card } from '@/design/primitives';
import { freeCourses } from '@/services/sonus/courses';
import { openLibrivoxBook, searchLibrivox } from '@/services/sonus/librivox';
import type { LibrivoxHit } from '@/services/sonus/librivox';
import { toast } from '@/state/ui';
import { AddBookDrawer } from './library/AddBookDrawer';
import { Artwork } from './library/Artwork';

const label = 'text-[12px] font-bold tracking-[0.14em] text-ink-faint uppercase';

/** Free audiobooks in the language (LibriVox, through archive.org) and good free courses. */
export default function AudiobooksPage() {
  const { language } = useApp();
  const lang = language.id;
  const name = getLanguage(lang)?.name ?? lang;
  const navigate = useNavigate();
  const [typed, setTyped] = useState('');
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<LibrivoxHit[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const courses = freeCourses(lang);

  // Typing waits a moment before asking; Enter asks at once.
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
    searchLibrivox(lang, { query, page })
      .then((r) => {
        if (!live) return;
        setHits((prev) => (page > 1 && prev ? [...prev, ...r.hits] : r.hits));
        setTotal(r.total);
      })
      .catch((e) => live && (toast(e instanceof Error ? e.message : 'LibriVox didn’t answer.', { tone: 'error' }), setHits((prev) => prev ?? [])))
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
      toast(e instanceof Error ? e.message : 'That book couldn’t be opened.', { tone: 'error' });
    } finally {
      setOpening(null);
    }
  };

  return (
    <>
      <BackLink to="/sonus">Sonus</BackLink>
      <h1 className="font-serif text-[30px] leading-tight font-semibold tracking-tight sm:text-[38px]">Audiobooks and courses</h1>
      <p className="mt-1 text-ink-soft">Free books in {name}, read by LibriVox’s volunteers, and courses worth your time.</p>

      <form
        className="relative mt-6 max-w-xl"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(typed.trim());
          setPage(1);
        }}
      >
        <Search size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-faint" aria-hidden />
        <input
          type="search"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="Title or author"
          aria-label="Search LibriVox"
          enterKeyHint="search"
          className="h-11 w-full rounded-xl border border-line bg-bg pr-3.5 pl-10 text-[15px]"
        />
      </form>

      <section aria-label="LibriVox" className="mt-6">
        {hits === null ? (
          <div className="grid place-items-center py-16 text-ink-faint">
            <LoaderCircle size={22} className="animate-spin" aria-hidden />
          </div>
        ) : hits.length ? (
          <>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
              {hits.map((hit) => (
                <li key={hit.identifier} className="min-w-0">
                  <button type="button" disabled={opening !== null} onClick={() => void open(hit)} className="group block w-full text-left">
                    <span className="relative block">
                      <Artwork title={hit.title} coverUrl={hit.coverUrl} className="block w-full transition-transform group-active:scale-[0.97]" rounded="rounded-xl" />
                      {opening === hit.identifier && (
                        <span className="absolute inset-0 grid place-items-center rounded-xl bg-black/40 text-white">
                          <LoaderCircle size={24} className="animate-spin" aria-hidden />
                        </span>
                      )}
                    </span>
                    <span lang={lang} className="mt-1.5 line-clamp-2 text-[13.5px] leading-snug font-semibold">
                      {hit.title}
                    </span>
                    <span className="block truncate text-[12.5px] text-ink-soft">{[hit.author, hit.runtimeMs && formatDuration(hit.runtimeMs)].filter(Boolean).join(' · ')}</span>
                  </button>
                </li>
              ))}
            </ul>
            {hits.length < total && (
              <div className="mt-6 flex justify-center">
                <Button variant="secondary" loading={loading} onClick={() => setPage((p) => p + 1)}>
                  Show more
                </Button>
              </div>
            )}
          </>
        ) : (
          <p className="py-10 text-center text-[15px] text-ink-soft">{query ? `Nothing on LibriVox for “${query}”.` : `LibriVox has no books in ${name} yet.`}</p>
        )}
      </section>

      <section aria-label="Free courses" className="mt-12 pb-10">
        <h2 className={label}>Free courses</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {courses.map((c) => (
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
            <span className="text-[15px] font-semibold">Your own course</span>
            <span className="mt-1.5 flex-1 text-[13.5px] leading-snug text-ink-soft">
              {courses.length ? 'Downloaded a course? Add its files or folder: lessons play in order and are marked done as you finish them.' : `No free course for ${name} is listed yet. Add one you have: lessons play in order and are marked done.`}
            </span>
            <Button variant="secondary" size="sm" icon={FolderPlus} className="mt-3 self-start" onClick={() => setAdding(true)}>
              Add a course
            </Button>
          </Card>
        </div>
      </section>
      <AddBookDrawer lang={lang} kind="course" open={adding} onClose={() => setAdding(false)} />
    </>
  );
}
