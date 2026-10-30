import { UiText, useUi } from '@/design/i18n/UiText';
// The room's shelves: rails of artwork that scroll sideways (a grid after "See all"), and the
// tiles that fill them: your songs, songs to explore with a preview, the charts, artists, styles.
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, LoaderCircle, Pause, Play } from 'lucide-react';
import type { Song } from '@/data/types';
import { useLayout } from '@/design/hooks/useLayout';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import type { SongHit } from '@/services/cantus/catalog';
import type { PickedArtist } from '../discover';
import { EASE_LABEL } from '../discover';
import type { ChartSong } from '../library';
import { SongArt } from '../SongArt';
import { songPath } from './nav';
import { usePreview } from './open';

export const enter = (i: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { ...spring.soft, delay: 0.04 * Math.min(i, 8) } });

/** The page's large title. */
export function RoomTitle({ children }: { children: ReactNode }) {
  return <h1 className="room-title">{children}</h1>;
}

const quiet = 'text-[13px] font-semibold text-ink-faint transition-colors hover:text-ink';

/**
 * A shelf: its title, then a row that scrolls sideways. With more than `limit` items, "See all"
 * shows every one in a grid. On a mouse, two arrows move the row a screen at a time.
 */
export function Rail({ title, aside, label, round = false, limit, children }: { title: ReactNode; aside?: ReactNode; label: string; round?: boolean; limit?: number; children: ReactNode[] }) {
  const translateUi = useUi();
  const { pointer } = useLayout();
  const [all, setAll] = useState(false);
  const more = limit !== undefined && children.length > limit;
  const shown = more && !all ? children.slice(0, limit) : children;
  const rowRef = useRef<HTMLUListElement>(null);
  const [ends, setEnds] = useState({ start: true, end: false });

  const arrows = pointer === 'fine' && !all;
  useEffect(() => {
    const row = rowRef.current;
    if (!arrows || !row) return;
    const measure = () => {
      const start = row.scrollLeft <= 2;
      const end = row.scrollLeft + row.clientWidth >= row.scrollWidth - 2;
      setEnds((e) => (e.start === start && e.end === end ? e : { start, end }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    row.addEventListener('scroll', measure, { passive: true });
    return () => {
      ro.disconnect();
      row.removeEventListener('scroll', measure);
    };
  }, [arrows, shown.length]);
  const page = (dir: 1 | -1) => rowRef.current?.scrollBy({ left: dir * rowRef.current.clientWidth * 0.8, behavior: 'smooth' });

  return (
    <section aria-label={label} className="room-section">
      <div className="room-head">
        <h2 className="min-w-0 truncate">{title}</h2>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {aside}
          {more && (
            <button type="button" onClick={() => setAll((v) => !v)} className={cx(quiet, 'hit relative')}>
              {all ? translateUi('Show less') : translateUi('See all')}
            </button>
          )}
          {arrows && !(ends.start && ends.end) && (
            <span className="flex gap-1">
              <RailArrow label={translateUi('Back')} icon={ChevronLeft} disabled={ends.start} onClick={() => page(-1)} />
              <RailArrow label={translateUi('More')} icon={ChevronRight} disabled={ends.end} onClick={() => page(1)} />
            </span>
          )}
        </div>
      </div>
      <ul ref={rowRef} className={cx(all ? 'room-grid' : 'room-rail', round && 'is-round')}>
        {shown}
      </ul>
    </section>
  );
}

function RailArrow({ label, icon: Icon, disabled, onClick }: { label: string; icon: typeof ChevronLeft; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className="grid size-7 place-items-center rounded-full bg-[var(--room-fill)] text-ink-soft transition-colors hover:bg-[var(--room-fill-strong)] hover:text-ink disabled:opacity-35">
      <Icon size={16} aria-hidden />
    </button>
  );
}

/** A tile's two lines under the artwork. */
function Caption({ title, sub, lang }: { title: string; sub?: string; lang?: string }) {
  return (
    <>
      <span lang={lang} className="mt-2 block truncate text-[14px] font-bold">
        {title}
      </span>
      {sub && <span className="block truncate text-[12.5px] text-ink-faint">{sub}</span>}
    </>
  );
}

function Busy() {
  return (
    <span className="absolute inset-0 grid place-items-center rounded-xl bg-black/35 text-white">
      <LoaderCircle size={20} className="animate-spin" aria-hidden />
    </span>
  );
}

/** One of your songs: recently opened, saved, or played most. */
export function SongTile({ song, plays = false, i }: { song: Song; plays?: boolean; i: number }) {
  return (
    <motion.li {...enter(i)}>
      <Link to={songPath(song.id)} className="group block" style={song.palette ? ({ '--song': song.palette.base } as CSSProperties) : undefined}>
        <span className="relative block">
          <SongArt url={song.artworkUrl} title={song.title} className="room-art w-full transition-transform duration-150 group-active:scale-[0.97]" rounded="rounded-xl" size={400} />
          {plays && <span className="absolute top-1.5 left-1.5 rounded-full bg-black/55 px-1.5 text-[11.5px] font-bold text-white tabular-nums">{song.plays}×</span>}
        </span>
        <Caption title={song.title} sub={song.artist} lang={song.lang} />
      </Link>
    </motion.li>
  );
}

/** A song to explore: tap it to open it with its lyrics, or its round button to hear 30 seconds first. */
export function HitTile({ hit, busy, onOpen, i, lang }: { hit: SongHit; busy: boolean; onOpen: () => void; i: number; lang: string }) {
  const translateUi = useUi();
  const { playing, toggle } = usePreview(hit.previewUrl);
  return (
    <motion.li {...enter(i)} className="relative">
      <button type="button" onClick={onOpen} className="group block w-full text-left">
        <span className="relative block">
          <SongArt url={hit.artworkUrl} title={hit.title} className="room-art w-full transition-transform duration-150 group-active:scale-[0.97]" rounded="rounded-xl" size={400} />
          {busy && <Busy />}
        </span>
        <Caption title={hit.title} sub={hit.artist} lang={lang} />
      </button>
      {hit.previewUrl && (
        <span className="pointer-events-none absolute inset-x-0 top-0 aspect-square">
          {/* 44px to tap, a 36px disc to see. */}
          <button type="button" onClick={toggle} aria-label={playing ? translateUi('Stop the preview') : translateUi('Hear a preview of {0}', [hit.title])} className="group/play pointer-events-auto absolute right-0 bottom-0 grid size-11 place-items-center">
            <span className={cx('grid size-9 place-items-center rounded-full text-white shadow-elev-1 transition-transform group-active/play:scale-90', playing ? 'bg-[var(--cantus)]' : 'bg-black/55 group-hover/play:bg-black/70')}>
              {playing ? <Pause size={15} className="fill-current" aria-hidden /> : <Play size={15} className="translate-x-px fill-current" aria-hidden />}
            </span>
          </button>
        </span>
      )}
    </motion.li>
  );
}

/** A song from this week's charts, with its place when it has one. */
export function ChartTile({ song, rank, busy, onOpen, i, lang }: { song: ChartSong; rank?: number; busy: boolean; onOpen: () => void; i: number; lang: string }) {
  return (
    <motion.li {...enter(i)}>
      <button type="button" onClick={onOpen} className="group block w-full text-left">
        <span className="relative block">
          <SongArt url={song.cover} title={song.title} className="room-art w-full transition-transform duration-150 group-active:scale-[0.97]" rounded="rounded-xl" size={400} />
          {rank !== undefined && <span className="absolute top-1.5 left-1.5 grid min-w-6 place-items-center rounded-full bg-black/55 px-1.5 text-[11.5px] font-bold text-white tabular-nums">{rank}</span>}
          {busy && <Busy />}
        </span>
        <Caption title={song.title} sub={song.artist} lang={lang} />
      </button>
    </motion.li>
  );
}

/** A colour for a name that stays the same every day. */
export function hueOf(name: string): number {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

const initialOf = (name: string) => name.replace(/^(the|los|las|la|le|les|die|il|i)\s+/i, '').charAt(0);

/** An artist picked for learners: a round tile with their initial; tapping finds their songs. */
export function ArtistTile({ artist, onPick, i }: { artist: PickedArtist; onPick: () => void; i: number }) {
  return (
    <motion.li {...enter(i)}>
      <button type="button" onClick={onPick} title={artist.why} className="group block w-full text-center">
        <span className="room-face transition-transform duration-150 group-active:scale-[0.97]" style={{ '--hue': hueOf(artist.name) } as CSSProperties} aria-hidden>
          {initialOf(artist.name)}
        </span>
        <span className="mt-2 block truncate text-[13.5px] font-bold">{artist.name}</span>
        <span className={cx('block text-[12px]', artist.ease === 'clear' ? 'text-sage-text' : artist.ease === 'fast' ? 'text-[var(--room-rose)]' : 'text-ink-faint')}><UiText source={'{0} to follow'} values={[EASE_LABEL[artist.ease]]} /></span>
      </button>
    </motion.li>
  );
}

// Hues that sit well together on the dark ground; each style keeps its place in the language's list.
const STYLE_HUES = [350, 20, 45, 160, 210, 280, 320, 75, 190, 250, 5, 130];

/** Styles to explore: coloured tiles; tapping one searches for songs in that style. */
export function StyleGrid({ styles, onPick, limit }: { styles: Array<[name: string, term: string]>; onPick: (term: string) => void; limit?: number }) {
  const translateUi = useUi();
  const [all, setAll] = useState(false);
  const more = limit !== undefined && styles.length > limit;
  const shown = more && !all ? styles.slice(0, limit) : styles;
  return (
    <section aria-label={translateUi('Styles to explore')} className="room-section">
      <div className="room-head">
        <h2 className="min-w-0 truncate"><UiText source={'Styles to explore'} /></h2>
        {more && (
          <button type="button" onClick={() => setAll((v) => !v)} className={cx(quiet, 'hit relative ml-auto')}>
            {all ? translateUi('Show less') : translateUi('See all')}
          </button>
        )}
      </div>
      <div className="room-styles">
        {shown.map(([name, term], i) => (
          <motion.button key={term} {...enter(i)} type="button" onClick={() => onPick(term)} className="room-style" style={{ '--hue': STYLE_HUES[styles.findIndex((s) => s[1] === term) % STYLE_HUES.length] } as CSSProperties}>
            {name}
          </motion.button>
        ))}
      </div>
    </section>
  );
}

/** Tiles still on their way. */
export function SkeletonTiles({ round = false, label = 'Finding songs' }: { round?: boolean; label?: string }) {
  return (
    <ul className={cx('room-rail', round && 'is-round')} aria-label={label}>
      {Array.from({ length: 7 }, (_, i) => (
        <li key={i}>
          <div className={cx('aspect-square w-full animate-pulse bg-[var(--room-fill)]', round ? 'rounded-full' : 'rounded-xl')} />
          <div className="mt-2.5 h-3.5 w-3/4 animate-pulse rounded bg-[var(--room-fill)]" />
          <div className="mt-1.5 h-3 w-1/2 animate-pulse rounded bg-[var(--room-fill)]" />
        </li>
      ))}
    </ul>
  );
}

/** A small glass button beside a shelf's title. */
export const smallPill = 'room-pill-glass inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-[transform,background-color] active:scale-[0.97] disabled:opacity-50 pointer-coarse:h-10';
