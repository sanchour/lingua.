import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, ChevronRight, EyeOff, Heart, LoaderCircle, Pause, Play, Radio, RefreshCw, X } from 'lucide-react';
import { useSavedStations, toggleFavorite } from '@/data/radio';
import type { RadioStation } from '@/data/types';
import { flagFor } from '@/design/flags';
import { Button, Card, SearchInput, Select } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { toggle, usePlayer } from '@/services/audio/engine';
import { playStation, stationMediaId } from '@/services/radio/play';
import { KIND_NAME, kindsOf, SECTION_NAME, sectionsOf, sortStations } from '@/services/radio/kinds';
import type { Kind, SectionId, StationSort } from '@/services/radio/kinds';
import { countriesOf, hiddenStations, hideStation, placesOf, searchStations, stationPlace, stationsFor, stationsIn } from '@/services/radio/stations';
import { getLanguage } from '@/core/lang/languages';
import { Artwork } from '../library/Artwork';
import { RadioMap } from './RadioMap';
import { Tuner } from './Tuner';
import { sonusBase } from '@/features/sonus/paths';

const label = 'text-[12px] font-bold tracking-[0.14em] text-ink-faint uppercase';
const ROW = 8;

/**
 * Sonus › Radio (Lingua 5.2-2): live stations really in the language. On the left the map and the
 * tuner, sticky; on the right the stations as tiles in sections (yours, talk and news first, music,
 * regional, everything), each with See all, or the country tuned to, or a search.
 */
export default function RadioTab({ lang, flag }: { lang: string; flag?: string }) {
  const [loaded, setLoaded] = useState<RadioStation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoaded(null);
    setError(null);
    stationsFor(lang).then(
      (s) => alive && setLoaded(s),
      (e: Error) => alive && setError(e.message),
    );
    return () => {
      alive = false;
    };
  }, [lang, attempt]);

  // "Not in Spanish": hidden on this device.
  const [hidden, setHidden] = useState(() => hiddenStations(lang));
  useEffect(() => setHidden(hiddenStations(lang)), [lang]);
  const visible = (list: RadioStation[] | null) => list && list.filter((s) => !hidden.has(s.id));
  const stations = useMemo(() => visible(loaded), [loaded, hidden]); // eslint-disable-line react-hooks/exhaustive-deps
  const hide = (s: RadioStation) => {
    hideStation(lang, s.id);
    setHidden(hiddenStations(lang));
  };

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

  const [seeAll, setSeeAll] = useState<SectionId | null>(null);
  useEffect(() => setSeeAll(null), [lang, country, query]);

  const media = usePlayer((s) => s.media);
  const live = media?.kind === 'radio' ? media : null;
  const playingStation = live ? ((stations ?? []).find((s) => stationMediaId(s.id) === live.id) ?? saved?.find((s) => stationMediaId(s.id) === live.id)) : undefined;
  const playingAt = playingStation?.lat !== undefined && playingStation.lon !== undefined ? { lat: playingStation.lat, lon: playingStation.lon } : null;

  const name = getLanguage(lang)?.name ?? lang;
  const fav = (s: RadioStation) => void toggleFavorite(s, lang);
  const chosenCountry = countries.find((c) => c.code === country);
  const sections = useMemo(() => sectionsOf(stations ?? [], visible(saved ?? []) ?? []), [stations, saved, hidden]); // eslint-disable-line react-hooks/exhaustive-deps
  const tile = { lang, langName: name, favorites, onFavorite: fav, onHide: hide };

  const chooseCountry = (code: string | null) => {
    setPlaceKey(null);
    setCountry(code);
  };

  let right: React.ReactNode;
  if (query.trim()) {
    right = <StationGrid title={`Stations for “${query.trim()}”`} stations={visible(results)} loading={searching || !results} empty="No stations match that. Try a city, a style or part of a name." {...tile} />;
  } else if (place) {
    right = <StationGrid title={place.label} stations={visible(place.stations)} onClose={() => setPlaceKey(null)} {...tile} />;
  } else if (chosenCountry) {
    right = <StationGrid title={chosenCountry.name} stations={visible(countryList)} loading={!countryList} onClose={() => chooseCountry(null)} {...tile} />;
  } else if (seeAll) {
    const section = sections.find((s) => s.id === seeAll);
    right = <StationGrid title={SECTION_NAME[seeAll]} stations={section?.stations ?? []} onClose={() => setSeeAll(null)} back {...tile} />;
  } else if (!stations) {
    right = error ? null : <LoaderCircle size={22} className="mx-auto my-16 animate-spin text-ink-faint" aria-label="Finding stations" />;
  } else if (!stations.length) {
    right = <p className="py-10 text-[15px] text-ink-soft">No stations in {name} yet.</p>;
  } else {
    right = (
      <div className="space-y-9">
        {sections.map((s) => (
          <section key={s.id} aria-label={SECTION_NAME[s.id]}>
            <div className="mb-3 flex items-baseline gap-3">
              <h2 className={label}>{SECTION_NAME[s.id]}</h2>
              <span className="text-[12px] text-ink-faint tabular-nums">{s.stations.length}</span>
              {s.stations.length > ROW && (
                <button type="button" onClick={() => setSeeAll(s.id)} className="ml-auto inline-flex items-center gap-0.5 text-[13px] font-semibold text-accent-text hover:underline">
                  See all <ChevronRight size={14} aria-hidden />
                </button>
              )}
            </div>
            <Tiles stations={s.stations.slice(0, ROW)} {...tile} />
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)] xl:grid-cols-[minmax(340px,420px)_minmax(0,1fr)]">
      <aside className="space-y-3 lg:sticky lg:top-6" aria-label="Map and tuner">
        {stations && countries.length > 0 ? (
          <RadioMap
            stations={stations}
            places={places}
            countries={countries}
            country={country}
            place={placeKey}
            playing={playingAt}
            onCountry={(code) => chooseCountry(code)}
            onPlace={(p) => setPlaceKey(p?.key ?? null)}
            caption={`${stations.length} stations in ${name} · ${countries.length === 1 ? '1 country' : `${countries.length} countries`}`}
          />
        ) : (
          <div className="grid aspect-[4/3] w-full place-items-center rounded-3xl border border-line/70 bg-sunken p-6 text-center text-ink-soft">
            {error ? (
              <div>
                <p className="text-[15px]">{error}</p>
                <Button variant="secondary" icon={RefreshCw} className="mt-3" onClick={() => setAttempt((n) => n + 1)}>
                  Try again
                </Button>
              </div>
            ) : stations ? (
              <p className="text-[15px]">No stations in {name} say where they are yet.</p>
            ) : (
              <LoaderCircle size={24} className="animate-spin text-ink-faint" aria-label="Finding stations" />
            )}
          </div>
        )}
        {countries.length > 1 && <Tuner countries={countries} value={country} onTune={chooseCountry} />}
        <p className="px-1 text-[12px] leading-snug text-ink-faint">Stations from radio-browser.info, an open directory kept by listeners: only secure streams, and only stations in {name}.</p>
      </aside>

      <div className="min-w-0 space-y-6">
        {live && <OnAir lang={lang} saved={saved?.find((s) => stationMediaId(s.id) === live.id)} favorite={(id) => favorites.has(id)} onFavorite={fav} />}
        <SearchInput value={query} onChange={setQuery} placeholder="Search stations or styles (jazz, news…)" onClose={query ? () => setQuery('') : undefined} />
        {right}
      </div>
    </div>
  );
}

interface TileProps {
  lang: string;
  langName: string;
  favorites: Set<string>;
  onFavorite: (s: RadioStation) => void;
  onHide: (s: RadioStation) => void;
}

/** A full grid: kind chips and a sort, every station (tiles off screen aren't drawn). */
function StationGrid({ title, stations, loading, empty, onClose, back, ...tile }: TileProps & { title: string; stations: RadioStation[] | null; loading?: boolean; empty?: string; onClose?: () => void; back?: boolean }) {
  const [kind, setKind] = useState<Kind | null>(null);
  const [sort, setSort] = useState<StationSort>('listened');
  const kinds = useMemo(() => {
    const seen = new Set<Kind>();
    for (const s of stations ?? []) for (const k of kindsOf(s)) seen.add(k);
    return (Object.keys(KIND_NAME) as Kind[]).filter((k) => seen.has(k));
  }, [stations]);
  const list = useMemo(() => sortStations((stations ?? []).filter((s) => !kind || kindsOf(s).includes(kind)), sort), [stations, kind, sort]);
  return (
    <section aria-label={title}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {back && onClose && (
          <button type="button" onClick={onClose} aria-label="Back to all sections" className="grid size-9 place-items-center rounded-full text-ink-soft hover:bg-sunken hover:text-ink">
            <ArrowLeft size={18} aria-hidden />
          </button>
        )}
        <h2 className="min-w-0 truncate font-serif text-[22px] leading-tight font-semibold">{title}</h2>
        {stations && <span className="text-[13px] text-ink-faint tabular-nums">{list.length === 1 ? '1 station' : `${list.length} stations`}</span>}
        <div className="ml-auto flex items-center gap-2">
          <div className="w-40">
            <Select<StationSort> label="Sort" hideLabel value={sort} onChange={setSort} options={[{ value: 'listened', label: 'Most listened' }, { value: 'name', label: 'Name' }, { value: 'quality', label: 'Sound quality' }]} />
          </div>
          {onClose && !back && (
            <button type="button" aria-label="Close" onClick={onClose} className="grid size-9 place-items-center rounded-full text-ink-faint hover:bg-sunken hover:text-ink">
              <X size={17} aria-hidden />
            </button>
          )}
        </div>
      </div>
      {kinds.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Kinds">
          {[null, ...kinds].map((k) => (
            <button
              key={k ?? 'all'}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={cx('h-8 rounded-full border px-3 text-[13px] font-semibold transition-colors', kind === k ? 'border-transparent bg-inverse text-on-inverse' : 'border-line bg-raised text-ink-soft hover:border-line-strong hover:text-ink')}
            >
              {k ? KIND_NAME[k] : 'All'}
            </button>
          ))}
        </div>
      )}
      {loading && !list.length ? <LoaderCircle size={20} className="mx-auto my-10 animate-spin text-ink-faint" aria-label="Loading" /> : list.length ? <Tiles stations={list} {...tile} /> : <p className="py-6 text-[15px] text-ink-soft">{empty ?? 'No stations here yet.'}</p>}
    </section>
  );
}

function Tiles({ stations, ...tile }: TileProps & { stations: RadioStation[] }) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(136px,1fr))] gap-x-4 gap-y-5">
      {stations.map((s) => (
        <StationTile key={s.id} station={s} {...tile} />
      ))}
    </ul>
  );
}

const initials = (name: string) =>
  name
    .replace(/^(radio|rádio|радио|راديو|fm)\s+/i, '')
    .split(/\s+/)
    .filter((w) => /\p{L}|\p{N}/u.test(w))
    .slice(0, 2)
    .map((w) => [...w][0]?.toUpperCase())
    .join('');

/** Moving bars on the station playing (transforms only). */
function Bars() {
  return (
    <span className="flex h-5 items-end gap-[3px]" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="radio-bar h-full w-[3px] origin-bottom rounded-full bg-current" style={{ animationDelay: `${i * -0.23}s` }} />
      ))}
    </span>
  );
}

function StationTile({ station, lang, langName, favorites, onFavorite, onHide }: TileProps & { station: RadioStation }) {
  const id = stationMediaId(station.id);
  const state = usePlayer((s) => (s.media?.id === id ? s.status : null));
  const favorite = favorites.has(station.id);
  const kinds = kindsOf(station).slice(0, 2);
  const where = station.state ?? station.country;
  return (
    <li className="group relative [contain-intrinsic-size:auto_210px] [content-visibility:auto]">
      <button type="button" onClick={() => playStation(station, lang)} aria-label={`${state === 'playing' ? 'Pause' : 'Play'} ${station.name}`} className="block w-full text-left">
        <span className="relative block">
          <Artwork title={station.name} coverUrl={station.favicon} className="w-full bg-raised transition-transform duration-200 group-hover:-translate-y-0.5" rounded="rounded-2xl" fallback={<span className="font-serif text-[30px] font-semibold tracking-tight">{initials(station.name) || '·'}</span>} />
          <span className={cx('absolute inset-0 grid place-items-center rounded-2xl bg-black/45 text-white transition-opacity', state ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
            {state === 'loading' ? <LoaderCircle size={22} className="animate-spin" aria-hidden /> : state === 'playing' ? <Bars /> : <Play size={22} className="fill-current" aria-hidden />}
          </span>
        </span>
        <span className={cx('mt-2 block truncate text-[14px] font-semibold', state && 'text-accent-text')}>{station.name}</span>
        {where && <span className="block truncate text-[12.5px] text-ink-soft">{where}</span>}
        {kinds.length > 0 && (
          <span className="mt-1 flex gap-1">
            {kinds.map((k) => (
              <span key={k} className="rounded-full bg-sunken px-2 py-0.5 text-[11px] font-semibold text-ink-soft">
                {KIND_NAME[k]}
              </span>
            ))}
          </span>
        )}
      </button>
      <div className={cx('absolute top-1.5 right-1.5 flex gap-1 transition-opacity', favorite ? 'opacity-100' : 'opacity-0 group-focus-within:opacity-100 group-hover:opacity-100')}>
        <button
          type="button"
          aria-label={`Not in ${langName}: hide ${station.name}`}
          title={`Not in ${langName}`}
          onClick={() => onHide(station)}
          className={cx('grid size-8 place-items-center rounded-full bg-raised/90 text-ink-faint shadow-elev-1 backdrop-blur hover:text-ink', favorite && 'hidden group-hover:grid')}
        >
          <EyeOff size={15} aria-hidden />
        </button>
        <button
          type="button"
          aria-pressed={favorite}
          aria-label={favorite ? `Remove ${station.name} from your stations` : `Add ${station.name} to your stations`}
          onClick={() => onFavorite(station)}
          className={cx('grid size-8 place-items-center rounded-full bg-raised/90 shadow-elev-1 backdrop-blur', favorite ? 'text-accent' : 'text-ink-faint hover:text-ink')}
        >
          <Heart size={15} className={favorite ? 'fill-current' : undefined} aria-hidden />
        </button>
      </div>
      <span className="sr-only">{stationPlace(station)}</span>
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
      <Link to={`${sonusBase()}/station/${media.id.replace(/^radio:/, '')}`} aria-label={`Open ${media.title}`} className="shrink-0">
        <Artwork title={media.title} coverUrl={media.coverUrl} className="w-16 sm:w-20" rounded="rounded-2xl" />
      </Link>
      <Link to={`${sonusBase()}/station/${media.id.replace(/^radio:/, '')}`} className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[12px] font-bold tracking-[0.12em] text-sage-text uppercase">
          <Radio size={13} aria-hidden /> {status === 'error' ? 'Off air' : playing ? 'Live now' : status === 'loading' ? 'Tuning in…' : 'Paused'}
        </p>
        <p className="mt-0.5 truncate font-serif text-xl leading-tight font-semibold">{media.title}</p>
        <p lang={nowPlaying ? lang : undefined} className={cx('truncate text-sm', status === 'error' ? 'text-accent-text' : 'text-ink-soft')}>
          {status === 'error' ? error : (nowPlaying ?? media.artist)}
        </p>
      </Link>
      {saved && (
        <button
          type="button"
          aria-pressed={favorite(saved.id)}
          aria-label={favorite(saved.id) ? `Remove ${saved.name} from your stations` : `Add ${saved.name} to your stations`}
          onClick={() => onFavorite(saved)}
          className={cx('grid size-10 shrink-0 place-items-center rounded-full hover:bg-sunken', favorite(saved.id) ? 'text-accent' : 'text-ink-faint hover:text-ink')}
        >
          <Heart size={18} className={favorite(saved.id) ? 'fill-current' : undefined} aria-hidden />
        </button>
      )}
      <button
        type="button"
        aria-label={playing ? 'Pause' : 'Play'}
        onClick={toggle}
        className="grid size-14 shrink-0 place-items-center rounded-full bg-inverse text-on-inverse shadow-elev-2 transition-transform duration-150 active:scale-90"
      >
        {status === 'loading' ? <LoaderCircle size={22} className="animate-spin" aria-hidden /> : playing ? <Pause size={22} className="fill-current" aria-hidden /> : <Play size={22} className="translate-x-0.5 fill-current" aria-hidden />}
      </button>
      <Link to={`${sonusBase()}/station/${media.id.replace(/^radio:/, '')}`} className="hidden sm:block" aria-label="Open the station">
        <ChevronRight size={18} className="text-ink-faint" aria-hidden />
      </Link>
    </Card>
  );
}
