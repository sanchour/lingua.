import { useEffect, useMemo, useState } from 'react';
import { AudioLines, Heart, LoaderCircle, Pause, Play, Radio, RefreshCw, X } from 'lucide-react';
import { useSavedStations, toggleFavorite } from '@/data/radio';
import type { RadioStation } from '@/data/types';
import { flagFor } from '@/design/flags';
import { Button, Card, SearchInput } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { toggle, usePlayer } from '@/services/audio/engine';
import { playStation, stationMediaId } from '@/services/radio/play';
import { countriesOf, placesOf, searchStations, stationPlace, stationsFor, stationsIn } from '@/services/radio/stations';
import { getLanguage } from '@/core/lang/languages';
import { Artwork } from '../library/Artwork';
import { NightSky } from './NightSky';

const label = 'text-[12px] font-bold tracking-[0.14em] text-ink-faint uppercase';

/** Sonus › Radio: live stations in the language, on a night-sky map, by country, searched, and your favourites. */
export default function RadioTab({ lang, flag }: { lang: string; flag?: string }) {
  const [stations, setStations] = useState<RadioStation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setStations(null);
    setError(null);
    stationsFor(lang).then(
      (s) => alive && setStations(s),
      (e: Error) => alive && setError(e.message),
    );
    return () => {
      alive = false;
    };
  }, [lang, attempt]);

  const saved = useSavedStations(lang);
  const favorites = useMemo(() => new Set((saved ?? []).filter((s) => s.favorite).map((s) => s.id)), [saved]);
  const places = useMemo(() => placesOf(stations ?? []), [stations]);
  const [placeKey, setPlaceKey] = useState<string | null>(null);
  const place = places.find((p) => p.key === placeKey) ?? null;

  // Countries, the flag's own first.
  const home = flagFor(lang, flag).toUpperCase();
  const countries = useMemo(() => {
    const list = countriesOf(stations ?? []);
    const own = list.findIndex((c) => c.code === home);
    return own > 0 ? [list[own], ...list.slice(0, own), ...list.slice(own + 1)] : list;
  }, [stations, home]);
  const [country, setCountry] = useState<string | null>(null);
  const [countryList, setCountryList] = useState<RadioStation[] | null>(null);
  useEffect(() => {
    if (!country) return setCountryList(null);
    let alive = true;
    const local = (stations ?? []).filter((s) => s.countryCode === country);
    setCountryList(local);
    stationsIn(lang, country).then(
      (more) => {
        if (!alive) return;
        const ids = new Set(more.map((s) => s.id));
        setCountryList([...more, ...local.filter((s) => !ids.has(s.id))]);
      },
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, [country, lang, stations]);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RadioStation[] | null>(null);
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    const q = query.trim();
    setResults(null);
    if (!q) return;
    let alive = true;
    const timer = window.setTimeout(() => {
      setSearching(true);
      searchStations(lang, q)
        .then((r) => alive && setResults(r), () => alive && setResults([]))
        .finally(() => alive && setSearching(false));
    }, 350);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [query, lang]);

  const [shown, setShown] = useState(30);
  useEffect(() => setShown(30), [country, query, lang]);

  const media = usePlayer((s) => s.media);
  const live = media?.kind === 'radio' ? media : null;
  const playingPlace = live ? places.find((p) => p.stations.some((s) => stationMediaId(s.id) === live.id))?.key : null;

  const name = getLanguage(lang)?.name ?? lang;
  const list = query.trim() ? results : country ? countryList : stations;
  const heading = query.trim() ? `Stations for “${query.trim()}”` : country ? `In ${countries.find((c) => c.code === country)?.name ?? country}` : 'Most listened';
  const fav = (s: RadioStation) => void toggleFavorite(s, lang);

  return (
    <div className="space-y-8">
      {live && <OnAir lang={lang} saved={saved?.find((s) => stationMediaId(s.id) === live.id)} favorite={(id) => favorites.has(id)} onFavorite={fav} />}

      <section aria-label="Map of stations">
        {stations && places.length > 0 ? (
          <NightSky places={places} selected={placeKey} playing={playingPlace} onSelect={(p) => setPlaceKey(p?.key ?? null)} caption={`${stations.length} stations in ${name} · tap a light`} />
        ) : (
          <div className="grid aspect-[4/3] w-full place-items-center rounded-3xl bg-[radial-gradient(ellipse_at_50%_35%,#1b2442,#0a0e1c_72%)] p-6 text-center text-white/70 sm:aspect-[2/1]">
            {error ? (
              <div>
                <p className="text-[15px]">{error}</p>
                <Button variant="secondary" icon={RefreshCw} className="mt-3" onClick={() => setAttempt((n) => n + 1)}>
                  Try again
                </Button>
              </div>
            ) : stations ? (
              <p className="text-[15px]">No stations in {name} have a place on the map yet. They’re listed below.</p>
            ) : (
              <LoaderCircle size={24} className="animate-spin" aria-label="Finding stations" />
            )}
          </div>
        )}
        {place && (
          <Card className="mt-3 p-3 sm:p-4">
            <div className="mb-1 flex items-center gap-2 px-2">
              <p className="min-w-0 flex-1 truncate font-semibold">
                {place.label} <span className="font-normal text-ink-faint">· {place.stations.length === 1 ? '1 station' : `${place.stations.length} stations`}</span>
              </p>
              <button type="button" aria-label="Close" onClick={() => setPlaceKey(null)} className="grid size-9 place-items-center rounded-full text-ink-faint hover:bg-sunken hover:text-ink">
                <X size={17} aria-hidden />
              </button>
            </div>
            <ul className="max-h-80 overflow-y-auto">
              {place.stations.map((s) => (
                <StationRow key={s.id} station={s} lang={lang} favorite={favorites.has(s.id)} onFavorite={fav} />
              ))}
            </ul>
          </Card>
        )}
      </section>

      <SearchInput value={query} onChange={setQuery} placeholder="Search stations or styles (jazz, news…)" onClose={query ? () => setQuery('') : undefined} />

      {!query.trim() && saved && saved.length > 0 && (
        <section aria-label="Your stations">
          <h2 className={cx(label, 'mb-2')}>Your stations</h2>
          <ul className="-mx-2">
            {saved.slice(0, 8).map((s) => (
              <StationRow key={s.id} station={s} lang={lang} favorite={Boolean(s.favorite)} onFavorite={fav} />
            ))}
          </ul>
        </section>
      )}

      {!query.trim() && countries.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Countries">
          <Chip active={!country} onClick={() => setCountry(null)}>
            All
          </Chip>
          {countries.slice(0, 11).map((c) => (
            <Chip key={c.code} active={country === c.code} onClick={() => setCountry(country === c.code ? null : c.code)}>
              {c.name}
            </Chip>
          ))}
        </div>
      )}

      <section aria-label={heading}>
        <h2 className={cx(label, 'mb-2')}>{heading}</h2>
        {!list ? (
          searching || !error ? (
            <LoaderCircle size={20} className="mx-auto my-8 animate-spin text-ink-faint" aria-label="Loading" />
          ) : null
        ) : list.length ? (
          <>
            <ul className="-mx-2">
              {list.slice(0, shown).map((s) => (
                <StationRow key={s.id} station={s} lang={lang} favorite={favorites.has(s.id)} onFavorite={fav} />
              ))}
            </ul>
            {list.length > shown && (
              <Button variant="secondary" className="mt-3" onClick={() => setShown((n) => n + 40)}>
                Show more
              </Button>
            )}
          </>
        ) : (
          <p className="py-6 text-[15px] text-ink-soft">{query.trim() ? 'No stations match that. Try a city, a style or part of a name.' : 'No stations here yet.'}</p>
        )}
      </section>
      <p className="text-[12.5px] text-ink-faint">Stations from radio-browser.info, an open directory kept by listeners. Only secure streams are shown.</p>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        'inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13.5px] font-semibold transition-colors',
        active ? 'border-transparent bg-inverse text-on-inverse' : 'border-line bg-raised text-ink-soft hover:border-line-strong hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}

function FavoriteButton({ station, favorite, onFavorite }: { station: RadioStation; favorite: boolean; onFavorite: (s: RadioStation) => void }) {
  return (
    <button
      type="button"
      aria-pressed={favorite}
      aria-label={favorite ? `Remove ${station.name} from your stations` : `Add ${station.name} to your stations`}
      onClick={() => onFavorite(station)}
      className={cx('grid size-10 shrink-0 place-items-center rounded-full hover:bg-sunken', favorite ? 'text-accent' : 'text-ink-faint hover:text-ink')}
    >
      <Heart size={18} className={favorite ? 'fill-current' : undefined} aria-hidden />
    </button>
  );
}

export function StationRow({ station, lang, favorite, onFavorite }: { station: RadioStation; lang: string; favorite: boolean; onFavorite: (s: RadioStation) => void }) {
  const id = stationMediaId(station.id);
  const state = usePlayer((s) => (s.media?.id === id ? s.status : null));
  const detail = [stationPlace(station), ...station.tags.slice(0, 2)].filter(Boolean).join(' · ');
  return (
    <li className="flex items-center gap-1 rounded-2xl px-2 hover:bg-sunken/60">
      <button type="button" onClick={() => playStation(station, lang)} aria-label={`${state === 'playing' ? 'Pause' : 'Play'} ${station.name}`} className="flex min-w-0 flex-1 items-center gap-3 py-2 text-left">
        <span className="relative block shrink-0">
          <Artwork title={station.name} coverUrl={station.favicon} className="block w-12" rounded="rounded-xl" />
          {state && (
            <span className="absolute inset-0 grid place-items-center rounded-xl bg-black/50 text-white">
              {state === 'loading' ? <LoaderCircle size={18} className="animate-spin" aria-hidden /> : state === 'playing' ? <AudioLines size={18} aria-hidden /> : <Play size={16} className="fill-current" aria-hidden />}
            </span>
          )}
        </span>
        <span className="min-w-0">
          <span className={cx('block truncate font-semibold', state && 'text-accent-text')}>{station.name}</span>
          {detail && <span className="block truncate text-[13px] text-ink-soft">{detail}</span>}
        </span>
      </button>
      <FavoriteButton station={station} favorite={favorite} onFavorite={onFavorite} />
    </li>
  );
}

/** The station on now: its name, what's playing when it says, play and pause, the heart. */
function OnAir({ lang, saved, favorite, onFavorite }: { lang: string; saved?: RadioStation; favorite: (id: string) => boolean; onFavorite: (s: RadioStation) => void }) {
  const media = usePlayer((s) => s.media);
  const status = usePlayer((s) => s.status);
  const error = usePlayer((s) => s.error);
  const nowPlaying = usePlayer((s) => s.nowPlaying);
  if (!media) return null;
  const playing = status === 'playing';
  return (
    <Card className="flex items-center gap-4 p-4 sm:p-5">
      <Artwork title={media.title} coverUrl={media.coverUrl} className="w-16 sm:w-20" rounded="rounded-2xl" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[12px] font-bold tracking-[0.12em] text-sage-text uppercase">
          <Radio size={13} aria-hidden /> {status === 'error' ? 'Off air' : playing ? 'Live now' : status === 'loading' ? 'Tuning in…' : 'Paused'}
        </p>
        <p className="mt-0.5 truncate font-serif text-xl leading-tight font-semibold">{media.title}</p>
        <p lang={nowPlaying ? lang : undefined} className={cx('truncate text-sm', status === 'error' ? 'text-accent-text' : 'text-ink-soft')}>
          {status === 'error' ? error : (nowPlaying ?? media.artist)}
        </p>
      </div>
      {saved && <FavoriteButton station={saved} favorite={favorite(saved.id)} onFavorite={onFavorite} />}
      <button
        type="button"
        aria-label={playing ? 'Pause' : 'Play'}
        onClick={toggle}
        className="grid size-14 shrink-0 place-items-center rounded-full bg-inverse text-on-inverse shadow-elev-2 transition-transform duration-150 active:scale-90"
      >
        {status === 'loading' ? <LoaderCircle size={22} className="animate-spin" aria-hidden /> : playing ? <Pause size={22} className="fill-current" aria-hidden /> : <Play size={22} className="translate-x-0.5 fill-current" aria-hidden />}
      </button>
    </Card>
  );
}
