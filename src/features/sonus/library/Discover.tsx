import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Check, LoaderCircle, Plus, SearchX } from 'lucide-react';
import type { Feed } from '@/data/types';
import { SearchInput } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { searchPodcasts, subscribe, SUGGESTED_SEARCHES } from '@/services/sonus/podcasts';
import type { PodcastHit } from '@/services/sonus/podcasts';
import { toast } from '@/state/ui';
import { Artwork } from './Artwork';

// Results stay for the session, so switching tabs doesn't search again.
const cache = new Map<string, PodcastHit[]>();

/** Search Apple's podcast directory, with starting points for the language being studied. */
export function Discover({ lang, feeds }: { lang: string; feeds: Feed[] }) {
  const navigate = useNavigate();
  const suggestions = SUGGESTED_SEARCHES[lang] ?? SUGGESTED_SEARCHES.en;
  const [query, setQuery] = useState('');
  const [term, setTerm] = useState(suggestions[0]);
  const [hits, setHits] = useState<PodcastHit[] | null>(() => cache.get(suggestions[0]) ?? null);
  const [error, setError] = useState(false);
  const [following, setFollowing] = useState<string | null>(null);
  const followed = new Map(feeds.map((f) => [f.url, f.id]));

  useEffect(() => {
    const cached = cache.get(term);
    if (cached) return setHits(cached);
    let alive = true;
    setHits(null);
    setError(false);
    searchPodcasts(term)
      .then((found) => {
        cache.set(term, found);
        if (alive) setHits(found);
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [term]);

  // Search as you type, after a short pause.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const timer = window.setTimeout(() => setTerm(q), 450);
    return () => window.clearTimeout(timer);
  }, [query]);

  const follow = async (hit: PodcastHit) => {
    const existing = followed.get(hit.feedUrl);
    if (existing) return navigate(`/sonus/podcast/${existing}`);
    setFollowing(hit.feedUrl);
    try {
      const id = await subscribe(lang, hit.feedUrl);
      toast(`Following “${hit.title}”.`, { tone: 'success', action: { label: 'Open', onClick: () => navigate(`/sonus/podcast/${id}`) } });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'That podcast couldn’t be followed.', { tone: 'error' });
    } finally {
      setFollowing(null);
    }
  };

  return (
    <div>
      <SearchInput value={query} onChange={setQuery} placeholder="Search podcasts" />
      <div className="mt-3 flex flex-wrap gap-1.5">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setQuery('');
              setTerm(s);
            }}
            className={cx(
              'no-callout rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors',
              term === s ? 'border-accent/40 bg-accent-soft text-accent-text' : 'border-line bg-raised text-ink-soft hover:border-line-strong hover:text-ink',
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {error ? (
          <p className="py-10 text-center text-sm text-ink-soft">The podcast directory couldn’t be reached. Check your connection.</p>
        ) : !hits ? (
          <div className="grid place-items-center py-14 text-ink-faint">
            <LoaderCircle className="animate-spin" size={22} aria-label="Searching" />
          </div>
        ) : hits.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center text-ink-soft">
            <SearchX size={26} className="mb-2 text-ink-faint" aria-hidden />
            Nothing found for “{term}”.
          </div>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {hits.map((hit) => {
              const isFollowed = followed.has(hit.feedUrl);
              return (
                <li key={hit.feedUrl} className="flex items-center gap-3 rounded-2xl border border-line/70 bg-surface p-2.5">
                  <Artwork title={hit.title} coverUrl={hit.imageUrl} className="w-16" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[14.5px] leading-snug font-semibold">{hit.title}</p>
                    <p className="truncate text-[12.5px] text-ink-soft">{hit.author}</p>
                    {(hit.genre || hit.episodes) && (
                      <p className="truncate text-[11.5px] text-ink-faint">{[hit.genre, hit.episodes && `${hit.episodes} episodes`].filter(Boolean).join(' · ')}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void follow(hit)}
                    disabled={following === hit.feedUrl}
                    aria-label={isFollowed ? `Open ${hit.title}` : `Follow ${hit.title}`}
                    className={cx(
                      'grid size-10 shrink-0 place-items-center rounded-full transition-[transform,background-color] duration-150 active:scale-90',
                      isFollowed ? 'bg-sage-soft text-sage-text' : 'bg-raised text-ink shadow-elev-1 hover:bg-sunken',
                    )}
                  >
                    {following === hit.feedUrl ? <LoaderCircle size={17} className="animate-spin" aria-hidden /> : isFollowed ? <Check size={17} aria-hidden /> : <Plus size={18} aria-hidden />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
