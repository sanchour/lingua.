import { useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { Bike, ChevronDown, ChevronLeft, ExternalLink, Heart, LoaderCircle, Pause, Play, Radio, SkipBack, SkipForward } from 'lucide-react';
import { useApp } from '@/app/context';
import { db } from '@/data/db';
import { toggleFavorite, useSavedStations } from '@/data/radio';
import type { Media, RadioStation } from '@/data/types';
import { useLayout } from '@/design/hooks/useLayout';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { Card, Switch } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { toggle, usePlayer } from '@/services/audio/engine';
import { setLiveTranscript, useLive } from '@/services/radio/live';
import { playStation, stationMedia, stationMediaId } from '@/services/radio/play';
import { stationById, stationPlace } from '@/services/radio/stations';
import { KaraokeTranscript } from '../player/KaraokeTranscript';
import { Artwork } from '../library/Artwork';

/** Sonus › a station, full screen (from the mini player): what's on, your stations, and a live transcript. */
export default function StationPage() {
  const { stationId = '' } = useParams();
  const { language } = useApp();
  const saved = useLiveQuery(async () => (await db.stations.get(stationId)) ?? null, [stationId]);
  const [fetched, setFetched] = useState<RadioStation | null | undefined>(undefined);
  useEffect(() => {
    if (saved !== null) return;
    let alive = true;
    stationById(stationId).then(
      (s) => alive && setFetched(s),
      () => alive && setFetched(null),
    );
    return () => {
      alive = false;
    };
  }, [saved, stationId]);

  const station = saved ?? fetched;
  if (saved === undefined || (saved === null && fetched === undefined)) return null;
  if (!station) {
    return (
      <div className="grid min-h-[60dvh] place-items-center text-center">
        <div>
          <p className="font-serif text-xl">This station couldn’t be found.</p>
          <Link to="/sonus?tab=radio" className="mt-4 inline-block font-semibold text-accent-text">
            Back to Radio
          </Link>
        </div>
      </div>
    );
  }
  return <Station station={station} lang={saved?.lang ?? language.id} favorite={Boolean(saved?.favorite && !saved.deletedAt)} />;
}

function Station({ station, lang, favorite }: { station: RadioStation; lang: string; favorite: boolean }) {
  const { layout } = useLayout();
  const navigate = useNavigate();
  const mediaId = stationMediaId(station.id);
  const isOn = usePlayer((s) => s.media?.id === mediaId);
  const idle = useMemo(() => stationMedia(station, lang), [station.id, lang]);
  const media = usePlayer((s) => (s.media?.id === mediaId ? s.media : null)) ?? idle;
  const wide = layout === 'wide';
  const scrollRef = useRef<HTMLDivElement>(null);
  useHotkeys({ ' ': () => (isOn ? toggle() : playStation(station, lang)) });

  // Your stations, to step through with the arrows (favourites first, then the ones played lately).
  const yours = useSavedStations(lang) ?? [];
  const at = yours.findIndex((s) => s.id === station.id);
  const step = (by: number) => {
    if (yours.length < 2) return;
    const next = yours[(Math.max(0, at) + by + yours.length) % yours.length];
    playStation(next, lang);
    navigate(`/sonus/station/${next.id}`, { replace: true });
  };

  const controls = <Controls station={station} lang={lang} favorite={favorite} isOn={isOn} canStep={yours.length > 1} onStep={step} />;

  if (wide) {
    return (
      <div className="flex h-[calc(100dvh-8rem)] min-h-[520px] flex-col">
        <Link to="/sonus?tab=radio" className="mb-6 inline-flex shrink-0 items-center gap-1 self-start text-sm font-semibold text-ink-soft hover:text-ink">
          <ChevronLeft size={16} aria-hidden /> Radio
        </Link>
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(260px,320px)_minmax(0,1fr)] gap-12">
          <aside className="flex min-h-0 flex-col">
            <div className="min-h-[96px] flex-1 [container-type:size]">
              <Artwork title={station.name} coverUrl={station.favicon} className="block w-[min(100cqw,100cqh)] shadow-elev-2" rounded="rounded-3xl" />
            </div>
            <div className="shrink-0">
              <Details station={station} lang={lang} isOn={isOn} large />
              <div className="mt-6">{controls}</div>
            </div>
          </aside>
          <section aria-label="Live text" className="flex min-h-0 min-w-0 flex-col">
            <div ref={scrollRef} className="lyric-scroll -mr-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-4 pb-16">
              <LiveText media={media} isOn={isOn} scrollRef={scrollRef} />
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg">
      <header className="no-callout sticky top-0 z-20 flex items-center gap-1 bg-bg/90 px-2 pt-safe backdrop-blur-xl">
        <button type="button" aria-label="Close the station" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/sonus?tab=radio'))} className="grid size-11 place-items-center rounded-xl text-ink-soft">
          <ChevronDown size={24} aria-hidden />
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-[13px] font-semibold text-ink-soft">Radio</p>
        <span className="size-11" aria-hidden />
      </header>
      <div className="px-5 pb-[calc(env(safe-area-inset-bottom)+200px)]">
        <div className="mt-3 mb-7 flex items-center gap-4">
          <Artwork title={station.name} coverUrl={station.favicon} className="w-24" rounded="rounded-2xl" />
          <Details station={station} lang={lang} isOn={isOn} />
        </div>
        <LiveText media={media} isOn={isOn} />
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/92 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+14px)] backdrop-blur-xl">{controls}</div>
    </div>
  );
}

function Details({ station, lang, isOn, large = false }: { station: RadioStation; lang: string; isOn: boolean; large?: boolean }) {
  const status = usePlayer((s) => (isOn ? s.status : 'idle'));
  const error = usePlayer((s) => s.error);
  const nowPlaying = usePlayer((s) => (isOn ? s.nowPlaying : undefined));
  const place = stationPlace(station);
  return (
    <div className={cx('min-w-0', large && 'mt-5')}>
      <p className="flex items-center gap-1.5 text-[12px] font-bold tracking-[0.12em] uppercase">
        {status === 'playing' ? (
          <>
            <span className="relative flex size-2" aria-hidden>
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-accent" />
            </span>
            <span className="text-accent-text">Live</span>
          </>
        ) : (
          <span className="flex items-center gap-1.5 text-ink-faint">
            <Radio size={13} aria-hidden /> {status === 'loading' ? 'Tuning in…' : status === 'paused' ? 'Paused' : status === 'error' ? 'Off air' : 'Radio'}
          </span>
        )}
      </p>
      <h1 className={cx('mt-1 font-serif leading-tight font-semibold tracking-tight', large ? 'text-[26px]' : 'text-[20px]')}>{station.name}</h1>
      {place && <p className="mt-0.5 text-[13.5px] text-ink-soft">{place}</p>}
      {status === 'error' && error ? (
        <p className="mt-2 text-[13.5px] text-accent-text">{error}</p>
      ) : (
        nowPlaying && (
          <p lang={lang} className="mt-2 line-clamp-2 text-[14px] font-semibold">
            <span className="mr-1.5 text-[11px] font-bold tracking-[0.1em] text-ink-faint uppercase">On now</span>
            {nowPlaying}
          </p>
        )
      )}
      {station.tags.length > 0 && (
        <p className="mt-2 flex flex-wrap gap-1.5">
          {station.tags.slice(0, 4).map((t) => (
            <span key={t} className="rounded-full bg-sunken px-2.5 py-0.5 text-[12px] font-semibold text-ink-soft">
              {t}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

function Controls({ station, lang, favorite, isOn, canStep, onStep }: { station: RadioStation; lang: string; favorite: boolean; isOn: boolean; canStep: boolean; onStep: (by: number) => void }) {
  const status = usePlayer((s) => (isOn ? s.status : 'idle'));
  const playing = status === 'playing';
  const round = 'grid size-12 place-items-center rounded-full text-ink-soft transition-[transform,background-color,color] duration-150 hover:bg-surface hover:text-ink active:scale-90 disabled:opacity-35';
  return (
    <div>
      <div className="flex items-center justify-center gap-2">
        <button type="button" aria-label="Your previous station" title="Your previous station" disabled={!canStep} onClick={() => onStep(-1)} className={round}>
          <SkipBack size={22} strokeWidth={1.9} aria-hidden />
        </button>
        <button
          type="button"
          aria-label={playing ? 'Pause' : 'Play'}
          onClick={() => (isOn ? toggle() : playStation(station, lang))}
          className="mx-2 grid size-16 place-items-center rounded-full bg-inverse text-on-inverse shadow-elev-2 transition-transform duration-150 active:scale-90"
        >
          {status === 'loading' ? <LoaderCircle size={24} className="animate-spin" aria-hidden /> : playing ? <Pause size={24} className="fill-current" aria-hidden /> : <Play size={24} className="translate-x-0.5 fill-current" aria-hidden />}
        </button>
        <button type="button" aria-label="Your next station" title="Your next station" disabled={!canStep} onClick={() => onStep(1)} className={round}>
          <SkipForward size={22} strokeWidth={1.9} aria-hidden />
        </button>
      </div>
      <div className="mt-2 flex items-center justify-center gap-1">
        <button
          type="button"
          aria-pressed={favorite}
          aria-label={favorite ? 'Remove from your stations' : 'Add to your stations'}
          title={favorite ? 'In your stations' : 'Add to your stations'}
          onClick={() => void toggleFavorite(station, lang)}
          className={cx(round, 'size-11', favorite && 'text-accent')}
        >
          <Heart size={19} className={favorite ? 'fill-current' : undefined} aria-hidden />
        </button>
        <Link to="/sonus/commute" aria-label="Commute mode" title="Commute mode: big buttons, large text" className={cx(round, 'size-11', !isOn && 'pointer-events-none opacity-35')}>
          <Bike size={19} aria-hidden />
        </Link>
        {station.homepage && (
          <a href={station.homepage} target="_blank" rel="noreferrer" aria-label="The station’s website" title="The station’s website" className={cx(round, 'size-11')}>
            <ExternalLink size={18} aria-hidden />
          </a>
        )}
      </div>
    </div>
  );
}

const STATUS: Record<string, string> = {
  connecting: 'Tuning in to write it out…',
  listening: 'Listening along. Lines appear about fifteen seconds after they’re said.',
  writing: 'Writing out the last few seconds…',
  paused: 'Paused with the station.',
};

/** What's said on air, written out a little behind the sound; every word works as in Codex. */
export function LiveText({ media, isOn, scrollRef, large = false }: { media: Media; isOn: boolean; scrollRef?: RefObject<HTMLElement | null>; large?: boolean }) {
  const on = useLive((s) => s.on);
  const mine = useLive((s) => s.mediaId === media.id);
  const status = useLive((s) => s.status);
  const message = useLive((s) => s.message);
  const cues = useLive((s) => (s.mediaId === media.id ? s.cues : null));
  const endRef = useRef<HTMLDivElement>(null);
  const touchedAt = useRef(-Infinity);

  // New lines come in at the bottom; follow them unless the learner has just scrolled back.
  useEffect(() => {
    const mark = () => (touchedAt.current = performance.now());
    window.addEventListener('wheel', mark, { passive: true });
    window.addEventListener('touchmove', mark, { passive: true });
    return () => {
      window.removeEventListener('wheel', mark);
      window.removeEventListener('touchmove', mark);
    };
  }, []);
  const count = cues?.length ?? 0;
  useEffect(() => {
    if (!count || performance.now() - touchedAt.current < 6000) return;
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [count]);

  // Turned itself off for something only the learner can fix (a key): said even though it's off.
  const failed = mine && status === 'error' && message ? message : null;
  const note = failed ?? (!on ? null : !isOn ? 'Starts when this station plays.' : mine && status === 'blocked' ? message : (mine && message) || STATUS[status] || null);
  return (
    <div>
      <div className="mb-4 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-[12px] font-bold tracking-[0.14em] text-ink-faint uppercase">Live text</h2>
          {note && <p className={cx('mt-1 text-[13.5px] leading-snug', mine && (status === 'blocked' || status === 'error') ? 'text-accent-text' : 'text-ink-soft')}>{note}</p>}
          {failed && /Ordo › AI/.test(failed) && (
            <Link to="/ordo/ai" className="mt-1.5 inline-block text-[13.5px] font-semibold text-ink underline underline-offset-2">
              Add a key in Ordo
            </Link>
          )}
        </div>
        <Switch checked={on} onChange={setLiveTranscript} label="Write out what’s said" />
      </div>
      {cues?.length ? (
        <>
          <div className={large ? 'text-[1.15em]' : undefined}>
            <KaraokeTranscript media={media} cues={cues} live={false} gutter={false} docked={false} scrollRef={scrollRef} />
          </div>
          <div ref={endRef} className="h-px" />
        </>
      ) : (
        !on && (
          <Card className="p-4 text-[14px] leading-relaxed text-ink-soft">
            Turn on <span className="font-semibold text-ink">Live text</span> to have what’s said written out as it airs, with every word to tap, hover and save like in Codex. It uses Whisper: on Groq with your free key (Ordo › AI), or on this device (Ordo › Listening). The station is streamed a second time for it, and only stations whose servers allow it can be written out.
          </Card>
        )
      )}
      {on && isOn && mine && !cues?.length && (status === 'listening' || status === 'writing' || status === 'connecting') && (
        <div className="flex items-center gap-2 py-6 text-[14px] text-ink-faint">
          <LoaderCircle size={16} className="animate-spin" aria-hidden /> The first lines are on their way…
        </div>
      )}
    </div>
  );
}
