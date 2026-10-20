import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Captions, ExternalLink, Star } from 'lucide-react';
import { subtitleSearch, youtubeSearch } from '@/core/mundus/links';
import { countryName, matchProviders, serviceById, serviceLink } from '@/core/mundus/services';
import type { Pick } from '@/core/mundus/types';
import { Button, Drawer } from '@/design/primitives';
import { addSubtitlesFor } from '@/features/mundus/actions';
import { useStreaming } from '@/features/mundus/hooks';
import { ServiceMark } from '@/features/mundus/ServiceBadge';
import { posterUrl, titleDetails, whereToWatch } from '@/services/mundus/tmdb';
import type { TitleType, TmdbTitle, WhereToWatch } from '@/services/mundus/tmdb';
import { toast } from '@/state/ui';

/** A title from TMDB's lists, or one of Mundus's picks (found on TMDB when there is a key). */
export interface SheetTitle {
  tmdb?: TmdbTitle;
  pick?: Pick;
  type?: TitleType;
}

const label = 'mb-2 text-[12px] font-bold tracking-[0.14em] text-ink-faint uppercase';

/**
 * A series or film: what it is (in the language when TMDB has it), which of your services stream it
 * in your country (each opens the service), other ways to watch, and "Add its subtitles".
 */
export function TitleSheet({ lang, title, onClose }: { lang: string; title: SheetTitle | null; onClose: () => void }) {
  const navigate = useNavigate();
  const { services, country, token } = useStreaming();
  const [details, setDetails] = useState<TmdbTitle | null>(null);
  const [where, setWhere] = useState<WhereToWatch | null>(null);
  const [busy, setBusy] = useState(false);

  const tmdb = title?.tmdb;
  useEffect(() => {
    setDetails(null);
    setWhere(null);
    if (!tmdb || !token) return;
    let alive = true;
    void titleDetails(tmdb.type, tmdb.id, lang, token)
      .then((d) => alive && setDetails(d))
      .catch(() => undefined);
    void whereToWatch(tmdb.type, tmdb.id, country, token)
      .then((w) => alive && setWhere(w))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [tmdb, lang, country, token]);

  const name = title?.pick?.title ?? details?.title ?? tmdb?.title ?? '';
  const original = details?.original ?? tmdb?.original;
  const overview = details?.overview ?? tmdb?.overview ?? '';
  const poster = posterUrl((details ?? tmdb)?.posterPath, 'w342');
  const yours = where ? matchProviders(where.stream, services) : (title?.pick?.on ?? []).filter((id) => services.includes(id));
  const others = where ? where.stream.filter((p) => !yours.some((id) => serviceById(id)?.tmdb.test(p.provider_name))) : [];
  const year = title?.pick?.year ?? tmdb?.year;

  const addSubtitles = async () => {
    setBusy(true);
    try {
      const id = await addSubtitlesFor(lang, name);
      if (id) {
        onClose();
        navigate(`/visio/watch/${id}`);
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Those subtitles couldn’t be read.', { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      open={Boolean(title)}
      onClose={onClose}
      title={name}
      description={[original && original !== name ? original : null, year, title?.pick?.by].filter(Boolean).join(' · ') || undefined}
      footer={
        <Button block size="lg" icon={Captions} loading={busy} onClick={() => void addSubtitles()}>
          Add its subtitles
        </Button>
      }
    >
      <div className="flex gap-4">
        {poster && <img src={poster} alt="" className="aspect-[2/3] w-28 shrink-0 self-start rounded-2xl object-cover shadow-elev-1 sm:w-32" />}
        <div className="min-w-0 flex-1">
          {title?.pick && <p className="text-[14.5px] leading-relaxed text-ink">{title.pick.why}</p>}
          {overview && (
            <p lang={details?.overviewLang ?? lang} className="mt-2 line-clamp-[10] text-[14px] leading-relaxed text-ink-soft">
              {overview}
            </p>
          )}
          {(details ?? tmdb)?.rating ? (
            <p className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink-faint">
              <Star size={13} aria-hidden /> {(details ?? tmdb)!.rating!.toFixed(1)} on TMDB
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-6">
        <p className={label}>On your services in {countryName(country)}</p>
        {yours.length ? (
          <div className="flex flex-wrap gap-2">
            {yours.map((id) => {
              const s = serviceById(id)!;
              return (
                <a key={id} href={serviceLink(s, name, lang)} target="_blank" rel="noopener noreferrer" className="no-callout inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-raised px-3.5 text-[14px] font-semibold transition-colors hover:border-line-strong">
                  <ServiceMark service={s} size={22} /> Open in {s.name}
                </a>
              );
            })}
          </div>
        ) : (
          <p className="text-[14px] text-ink-soft">{services.length ? (where || !token ? 'None of your services has it here.' : 'Looking…') : 'Choose your services above to see where it streams for you.'}</p>
        )}
      </div>

      {others.length > 0 && (
        <div className="mt-5">
          <p className={label}>Also streams on</p>
          <p className="text-[14px] text-ink-soft">{others.map((p) => p.provider_name).join(' · ')}</p>
        </div>
      )}
      {where && where.rentOrBuy.length > 0 && (
        <div className="mt-5">
          <p className={label}>To rent or buy</p>
          <p className="text-[14px] text-ink-soft">{where.rentOrBuy.slice(0, 6).map((p) => p.provider_name).join(' · ')}</p>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {where?.link && <SheetLink href={where.link}>Every way to watch</SheetLink>}
        <SheetLink href={youtubeSearch(`${name}${year ? ` ${year}` : ''} trailer`)}>Trailer</SheetLink>
        <SheetLink href={subtitleSearch(title?.pick?.en ?? name, lang)}>Find subtitles</SheetLink>
      </div>
      <p className="mt-4 text-[12.5px] leading-relaxed text-ink-faint">
        Streaming services protect their video, so it plays in their own app; with its subtitles in Visio you can read along, look up words and save lines as cards beside it.
      </p>
    </Drawer>
  );
}

function SheetLink({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="no-callout inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-[13px] font-semibold text-ink-soft transition-colors hover:border-line-strong hover:text-ink pointer-coarse:h-10">
      {children} <ExternalLink size={13} aria-hidden />
    </a>
  );
}
