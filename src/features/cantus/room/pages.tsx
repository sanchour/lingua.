// The room's music tabs: Today (a song for today, then rails) and Music (your songs, and new ones
// every day). Everything the music room in Sonus had, moved here.
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { Gamepad2, LoaderCircle, Music2, Play, Shuffle, Sparkles } from 'lucide-react';
import { useApp } from '@/app/context';
import { formatClock } from '@/core/audio/cues';
import { getLanguage } from '@/core/lang/languages';
import { songIdOf, useRecentSongs, useSavedSongs, useSong } from '@/data/songs';
import { cx } from '@/lib/cx';
import type { SongHit } from '@/services/cantus/catalog';
import { discoverFor } from '../discover';
import { hashOf, useExplore } from '../explore';
import { openByName, useCharts, useSpotifyLikes } from '../library';
import { SongArt } from '../SongArt';
import { gamesPath } from './nav';
import { useOpenSong } from './open';
import { ArtistTile, ChartTile, HitTile, Rail, RoomTitle, SkeletonTiles, smallPill, SongTile, StyleGrid } from './rails';

const searchFor = (term: string) => `/cantus/search?q=${encodeURIComponent(term)}`;

// ── Today ────────────────────────────────────────────────────────────────────────────────────────

export function TodayPage() {
  const lang = useApp().language.id;
  const navigate = useNavigate();
  const { explore, failed } = useExplore(lang);
  const recent = useRecentSongs(lang, 14);
  const picks = discoverFor(lang);
  // One of today's finds, the same all day.
  const hit = useMemo(() => {
    const finds = explore?.finds ?? [];
    return finds.length ? finds[hashOf(new Date().toISOString().slice(0, 10)) % finds.length] : null;
  }, [explore]);

  return (
    <>
      <RoomTitle>Today</RoomTitle>
      {hit ? <SongForToday hit={hit} lang={lang} /> : !failed && <div className="room-hero h-[220px] animate-pulse" aria-label="Finding a song for today" />}
      <Charts lang={lang} />
      {recent && recent.length > 0 && (
        <Rail title="Recently opened" label="Recently opened" limit={12}>
          {recent.map((s, i) => (
            <SongTile key={s.id} song={s} i={i} />
          ))}
        </Rail>
      )}
      {picks && picks.artists.length > 0 && (
        <Rail title="Artists to learn with" label="Artists to learn with" round>
          {picks.artists.map((a, i) => (
            <ArtistTile key={a.name} artist={a} i={i} onPick={() => navigate(searchFor(a.name))} />
          ))}
        </Rail>
      )}
      {picks && picks.styles.length > 0 && <StyleGrid styles={picks.styles} limit={6} onPick={(term) => navigate(searchFor(term))} />}
    </>
  );
}

function SongForToday({ hit, lang }: { hit: SongHit; lang: string }) {
  const { opening, openHit } = useOpenSong(lang);
  // Kept already (opened before): its games are a tap away.
  const kept = useSong(songIdOf(lang, hit));
  const meta = [hit.artist, hit.genre, hit.durationMs && formatClock(hit.durationMs)].filter(Boolean).join(' · ');
  return (
    <section aria-label="Song for today" className="room-hero">
      <SongArt url={hit.artworkUrl} title={hit.title} className="room-hero-art shrink-0" rounded="rounded-2xl" size={600} />
      <div className="flex min-w-0 flex-col justify-center gap-2">
        <span className="text-[12px] font-extrabold tracking-[0.14em] text-[var(--room-rose)] uppercase">Song for today</span>
        <span lang={lang} className="room-hero-title line-clamp-2">
          {hit.title}
        </span>
        {meta && <span className="truncate text-[15px] text-[var(--room-soft)]">{meta}</span>}
        <div className="mt-3 flex flex-wrap gap-2.5">
          <button type="button" onClick={() => void openHit(hit)} className="room-pill-light flex h-11 items-center gap-2 rounded-full px-5 text-[15px] font-extrabold transition-transform active:scale-[0.97]">
            {opening ? <LoaderCircle size={17} className="animate-spin" aria-hidden /> : <Play size={17} className="fill-current" aria-hidden />} Sing along
          </button>
          {kept && kept.lines.filter((l) => l.text).length >= 4 && (
            <Link to={gamesPath(kept.id)} className="room-pill-glass flex h-11 items-center gap-2 rounded-full px-4 text-[14px] font-bold transition-transform active:scale-[0.97]">
              <Gamepad2 size={17} aria-hidden /> Song games
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

/** This week's charts in the language's countries. */
function Charts({ lang }: { lang: string }) {
  const charts = useCharts(lang);
  const { opening, open } = useOpenSong(lang);
  if (!charts?.songs.length) return null;
  const where = [...new Set(charts.songs.map((s) => s.where))];
  return (
    <Rail title="Most played now" label="Most played now" limit={12} aside={<span className="hidden truncate text-[12.5px] font-semibold text-ink-faint sm:inline">in {where.join(', ')}</span>}>
      {charts.songs.map((s, i) => {
        const key = `${s.title}|${s.artist}`;
        return <ChartTile key={key} song={s} rank={i + 1} i={i} lang={lang} busy={opening === key} onOpen={() => void open(key, () => openByName(lang, s.title, s.artist, { cover: s.cover, durationMs: s.durationMs }))} />;
      })}
    </Rail>
  );
}

// ── Explore ──────────────────────────────────────────────────────────────────────────────────────

/** Music: your songs, then new ones to explore. */
export function MusicPage() {
  const { language, settings } = useApp();
  const lang = language.id;
  const navigate = useNavigate();
  const { explore, loading, failed, shuffle } = useExplore(lang);
  const { opening, openHit } = useOpenSong(lang);
  const picks = discoverFor(lang);
  const pool = [...(explore?.finds ?? []), ...(explore?.style?.songs ?? [])];
  const surprise = () => pool.length && void openHit(pool[Math.floor(Math.random() * pool.length)]);
  const saved = useSavedSongs(lang);

  return (
    <>
      <RoomTitle>Music</RoomTitle>
      {saved && saved.length > 0 && (
        <Rail title="Your songs" label="Your songs" limit={12}>
          {saved.map((s, i) => (
            <SongTile key={s.id} song={s} i={i} />
          ))}
        </Rail>
      )}
      {explore?.finds.length ? (
        <Rail
          title="Explore today"
          label="Songs to explore"
          aside={
            <>
              <button type="button" onClick={surprise} disabled={!pool.length} className={smallPill}>
                <Sparkles size={14} className="text-[var(--room-rose)]" aria-hidden /> Surprise me
              </button>
              <button type="button" onClick={shuffle} disabled={loading} aria-label="Other songs" title="Other songs" className={cx(smallPill, 'w-8 justify-center px-0 pointer-coarse:w-10')}>
                {loading ? <LoaderCircle size={14} className="animate-spin" aria-hidden /> : <Shuffle size={14} aria-hidden />}
              </button>
            </>
          }
        >
          {explore.finds.map((hit, i) => (
            <HitTile key={hit.itunesId} hit={hit} i={i} lang={lang} busy={opening === String(hit.itunesId)} onOpen={() => void openHit(hit)} />
          ))}
        </Rail>
      ) : failed ? (
        <p className="room-section text-[14px] text-ink-soft">Apple’s music search didn’t answer, so there are no new songs to show. Check the connection and shuffle again.</p>
      ) : (
        <section className="room-section" aria-label="Songs to explore">
          <h2 className="room-head">Explore today</h2>
          <SkeletonTiles />
        </section>
      )}
      {explore?.style && (
        <Rail title={<>Style of the day · <span className="text-[var(--room-rose)]">{explore.style.name}</span></>} label={`Style of the day: ${explore.style.name}`}>
          {explore.style.songs.map((hit, i) => (
            <HitTile key={hit.itunesId} hit={hit} i={i} lang={lang} busy={opening === String(hit.itunesId)} onOpen={() => void openHit(hit)} />
          ))}
        </Rail>
      )}
      {picks && picks.styles.length > 0 && <StyleGrid styles={picks.styles} onPick={(term) => navigate(searchFor(term))} />}
      {picks && picks.artists.length > 0 && (
        <Rail title="Artists to learn with" label="Artists to learn with" round>
          {picks.artists.map((a, i) => (
            <ArtistTile key={a.name} artist={a} i={i} onPick={() => navigate(searchFor(a.name))} />
          ))}
        </Rail>
      )}
      {settings.spotify.refreshToken ? <SpotifyLikes lang={lang} /> : <SpotifyInvite />}
    </>
  );
}

function SpotifyInvite() {
  return (
    <section aria-label="Your Spotify" className="room-section flex items-center gap-4 rounded-[18px] border border-[var(--room-rim)] bg-[var(--room-fill)] p-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#1db954]/20 text-[#5fd38a]">
        <Music2 size={20} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">Your Spotify liked songs</span>
        <span className="block text-[13.5px] text-ink-soft">Connect your own free Spotify app and Lingua finds the ones sung in this language.</span>
      </span>
      <Link to="/settings/music" className={cx(smallPill, 'h-10')}>
        Set up
      </Link>
    </section>
  );
}

function SpotifyLikes({ lang }: { lang: string }) {
  const scan = useSpotifyLikes(lang, true);
  const { opening, open } = useOpenSong(lang);
  const checking = scan && !scan.done && (
    <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-faint">
      <LoaderCircle size={13} className="animate-spin" aria-hidden /> Checking {scan.checked} of {scan.total}
    </span>
  );
  if (scan?.tracks.length) {
    return (
      <Rail title="From your Spotify" label="From your Spotify" aside={checking} limit={12}>
        {scan.tracks.map((t, i) => {
          const cover = t.album?.images?.find((im) => (im.width ?? 0) <= 320)?.url ?? t.album?.images?.[0]?.url;
          const artist = t.artists.map((a) => a.name).join(', ');
          return <ChartTile key={t.id} song={{ title: t.name, artist, cover, durationMs: t.duration_ms, where: '' }} i={i} lang={lang} busy={opening === t.id} onOpen={() => void open(t.id, () => openByName(lang, t.name, t.artists[0]?.name ?? '', { spotifyId: t.id, cover, durationMs: t.duration_ms }))} />;
        })}
      </Rail>
    );
  }
  return (
    <section aria-label="From your Spotify" className="room-section">
      <div className="room-head">
        <h2 className="min-w-0 flex-1 truncate">From your Spotify</h2>
        {checking}
      </div>
      {scan?.error && <p className="text-[13.5px] text-[var(--room-rose)]">{scan.error}</p>}
      {scan?.done && !scan.error && <p className="text-[14px] text-ink-soft">None of your liked songs seem to be sung in {getLanguage(lang)?.name} yet.</p>}
    </section>
  );
}
