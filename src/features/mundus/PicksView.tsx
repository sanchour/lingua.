import { memo, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { motion } from 'motion/react';
import { BookA, BookOpen, BookPlus, Captions, Check, ExternalLink, Film, Gamepad2, MonitorPlay, Music2, Podcast, Rss, Tv } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getLanguage } from '@/core/lang/languages';
import type { Level } from '@/core/lang/levels';
import { artistLinks, pickLinks, subtitleSearch } from '@/core/mundus/links';
import type { PickLink } from '@/core/mundus/links';
import { countryName, matchProviders, serviceById } from '@/core/mundus/services';
import { GROUP_KIND, inBand } from '@/core/mundus/types';
import type { LevelBand, Pick, PickGroup, PickKind, PickLevel, Picks } from '@/core/mundus/types';
import { Button, Card, Segmented } from '@/design/primitives';
import { spring } from '@/design/motion';
import { useLayout } from '@/design/hooks/useLayout';
import { cx } from '@/lib/cx';
import { discoverFor } from '@/features/cantus/discover';
import type { PickedArtist } from '@/features/cantus/discover';
import { pickImageQuery } from '@/services/mundus/images';
import type { ImageQuery } from '@/services/mundus/images';
import { posterUrl } from '@/services/mundus/tmdb';
import { Art } from './Art';
import { toast } from '@/state/ui';
import { addBookToCodex, addSubtitlesFor, followPodcast } from './actions';
import { pickKey, usePickLookups, useStreaming } from './hooks';
import type { PickLookup } from './hooks';
import { ServiceMark } from './ServiceBadge';
import { sonusBase } from '@/features/sonus/paths';

type Filter = PickGroup | 'music' | 'all';

/** The order sections appear in, with how each is named and drawn. */
const SECTIONS: Array<{ id: Exclude<Filter, 'all'>; label: string; short: string; icon: LucideIcon; hue: string }> = [
  { id: 'series', label: 'Series', short: 'Series', icon: Tv, hue: '#c86d51' },
  { id: 'films', label: 'Films', short: 'Films', icon: Film, hue: '#b56fa0' },
  { id: 'books', label: 'Books', short: 'Books', icon: BookOpen, hue: '#6b8e78' },
  { id: 'music', label: 'Music', short: 'Music', icon: Music2, hue: '#d49b54' },
  { id: 'podcasts', label: 'Podcasts', short: 'Podcasts', icon: Podcast, hue: '#5f87a8' },
  { id: 'youtube', label: 'YouTube', short: 'YouTube', icon: MonitorPlay, hue: '#cf6a6a' },
  { id: 'games', label: 'Video games', short: 'Games', icon: Gamepad2, hue: '#8a7fb0' },
  { id: 'dictionaries', label: 'Dictionaries', short: 'Dictionaries', icon: BookA, hue: '#9a8466' },
];

const ORDER: PickLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];
/** Whether a pick suits a learner now: its level at or below theirs (a beginner counts as A1). */
const readyFor = (pick: PickLevel, learner: Level) => ORDER.indexOf(pick) <= Math.max(0, ORDER.indexOf(learner as PickLevel));

/** Sonus's lyrics ease, as a level. */
const EASE_LEVEL: Record<PickedArtist['ease'], PickLevel> = { clear: 'A2', medium: 'B1', fast: 'B2' };

const tint = (hue: string): CSSProperties => ({
  background: `color-mix(in oklab, ${hue} 17%, var(--color-surface))`,
  color: `color-mix(in oklab, ${hue} 78%, var(--color-ink))`,
});

const label = 'text-[12px] font-bold tracking-[0.14em] text-ink-faint uppercase';
const enter = (i: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { ...spring.soft, delay: 0.03 * Math.min(i, 10) } });

export function PicksView({ lang, picks, level }: { lang: string; picks: Picks; level: Level }) {
  const [params, setParams] = useSearchParams();
  const requested = params.get('kind');
  const filter: Filter = SECTIONS.some((s) => s.id === requested) ? (requested as Filter) : 'all';
  const setFilter = (next: Filter) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (next === 'all') p.delete('kind');
        else p.set('kind', next);
        return p;
      },
      { replace: true },
    );
  const [band, setBand] = useState<LevelBand>('all');
  const { layout } = useLayout();
  const streaming = useStreaming();
  const lookups = usePickLookups(lang, picks, streaming.country, streaming.services.length ? streaming.token : '');
  const artists = discoverFor(lang)?.artists ?? [];

  const visible = SECTIONS.filter((s) => filter === 'all' || s.id === filter);

  const wide = layout === 'wide';
  return (
    <div className={wide ? 'grid grid-cols-[200px_minmax(0,1fr)] gap-10' : ''}>
      <div className={wide ? 'sticky top-24 space-y-6 self-start' : 'mb-6 space-y-3'}>
        <div className={wide ? 'flex flex-col gap-0.5' : 'flex flex-wrap gap-2'} role="group" aria-label="Kinds">
          <Chip row={wide} active={filter === 'all'} onClick={() => setFilter('all')}>
            All
          </Chip>
          {SECTIONS.map((s) => (
            <Chip key={s.id} row={wide} active={filter === s.id} onClick={() => setFilter(s.id)} icon={s.icon}>
              {wide ? s.label : s.short}
            </Chip>
          ))}
        </div>
        {wide ? (
          <div role="group" aria-label="Level" className="flex flex-col gap-0.5 border-t border-line pt-5">
            {LEVEL_ROWS.map(([value, name]) => (
              <Chip key={value} row active={band === value} onClick={() => setBand(value)}>
                {name}
              </Chip>
            ))}
          </div>
        ) : (
          <Segmented<LevelBand>
          block
          label="Level"
          value={band}
          onChange={setBand}
          options={[
            { value: 'all', label: 'Any level' },
            { value: 'beginner', label: 'A1–A2' },
            { value: 'intermediate', label: 'B1–B2' },
            { value: 'advanced', label: 'C1' },
          ]}
        />
        )}
      </div>

      <div className="min-w-0">
      <ServicesLine services={streaming.services} country={streaming.country} hasToken={Boolean(streaming.token)} />

      <div className="space-y-10">
        {visible.map((section) => {
          if (section.id === 'music') {
            const list = artists.filter((a) => inBand(EASE_LEVEL[a.ease], band));
            if (!list.length) return filter === 'music' ? <Empty key="music" /> : null;
            return (
              <Section key="music" title={section.label} icon={section.icon} hue={section.hue} count={list.length}>
                {list.map((a, i) => (
                  <motion.li key={a.name} {...enter(i)}>
                    <ArtistCard artist={a} level={level} hue={section.hue} />
                  </motion.li>
                ))}
              </Section>
            );
          }
          const group = section.id;
          const list = picks[group].filter((p) => inBand(p.level, band));
          const note = picks.notes?.[group];
          if (!list.length && !note) return filter === group ? <Empty key={group} /> : null;
          return (
            <Section key={group} title={section.label} icon={section.icon} hue={section.hue} count={list.length} note={note}>
              {list.map((p, i) => (
                <motion.li key={pickKey(p)} {...enter(i)}>
                  <PickCard pick={p} kind={GROUP_KIND[group]} lang={lang} level={level} hue={section.hue} icon={section.icon} lookup={lookups.get(pickKey(p))} />
                </motion.li>
              ))}
            </Section>
          );
        })}
      </div>
      </div>
    </div>
  );
}

const LEVEL_ROWS: Array<[LevelBand, string]> = [
  ['all', 'Any level'],
  ['beginner', 'Beginner · A1–A2'],
  ['intermediate', 'Intermediate · B1–B2'],
  ['advanced', 'Advanced · C1'],
];

/** A filter: a pill, or on desktop a row in the side list. */
function Chip({ active, onClick, icon: Icon, row, children }: { active: boolean; onClick: () => void; icon?: LucideIcon; row?: boolean; children: string }) {
  if (row) {
    return (
      <button type="button" aria-pressed={active} onClick={onClick} className={cx('flex h-9 items-center gap-2.5 rounded-lg px-3 text-left text-[14px] font-semibold transition-colors', active ? 'bg-inverse text-on-inverse' : 'text-ink-soft hover:bg-sunken hover:text-ink')}>
        {Icon && <Icon size={16} aria-hidden />}
        {children}
      </button>
    );
  }
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        'no-callout inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13.5px] font-semibold transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97] pointer-coarse:h-10',
        active ? 'border-transparent bg-inverse text-on-inverse' : 'border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink',
      )}
    >
      {Icon && <Icon size={15} aria-hidden />}
      {children}
    </button>
  );
}

function Section({ title, icon: Icon, hue, count, note, children }: { title: string; icon: LucideIcon; hue: string; count: number; note?: string; children: React.ReactNode }) {
  return (
    <section aria-label={title}>
      <div className="mb-3 flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-xl" style={tint(hue)}>
          <Icon size={16} aria-hidden />
        </span>
        <h2 className="font-serif text-[21px] font-semibold">{title}</h2>
        {count > 0 && <span className="text-[13px] font-semibold text-ink-faint tabular-nums">{count}</span>}
      </div>
      {note && <p className="mb-3 max-w-2xl text-[14px] text-ink-soft">{note}</p>}
      {count > 0 && <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">{children}</ul>}
    </section>
  );
}

function Empty() {
  return <p className="py-10 text-center text-[15px] text-ink-soft">Nothing at this level here yet. Try another level.</p>;
}

function ServicesLine({ services, country, hasToken }: { services: string[]; country: string; hasToken: boolean }) {
  return (
    <Link
      to="/visio?tab=services"
      className="mb-8 flex items-center gap-3 rounded-2xl border border-dashed border-line px-4 py-3 text-[14px] text-ink-soft transition-colors hover:border-line-strong hover:bg-surface"
    >
      {services.length ? (
        <>
          <span className="flex shrink-0 -space-x-1">
            {services.slice(0, 5).map((id) => (
              <ServiceMark key={id} service={id} size={22} className="ring-2 ring-bg" />
            ))}
          </span>
          <span className="min-w-0 flex-1">
            Your services in {countryName(country)}
            {hasToken ? ': series and films show where they stream.' : '. Add a free TMDB key in Visio › Services to see where each one streams.'}
          </span>
        </>
      ) : (
        <span className="min-w-0 flex-1">Which streaming services do you have? Choose them in Visio › Services and the picks show what’s on them.</span>
      )}
      <span className="shrink-0 font-semibold text-accent-text">Services</span>
    </Link>
  );
}

function LevelPill({ value, ready }: { value: PickLevel; ready: boolean }) {
  return (
    <span
      title={ready ? 'At your level' : `From ${value}`}
      className={cx('shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-bold tabular-nums', ready ? 'bg-sage-soft text-sage-text' : 'bg-sunken text-ink-soft')}
    >
      {value === 'A1' ? 'A1' : `${value}+`}
    </span>
  );
}

function LinkPill({ link }: { link: PickLink }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="no-callout inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-bg/60 px-3 text-[13px] font-semibold text-ink-soft transition-colors hover:border-line-strong hover:text-ink pointer-coarse:h-10"
    >
      {link.service ? <ServiceMark service={link.service} size={16} /> : <ExternalLink size={13} aria-hidden />}
      {link.label}
    </a>
  );
}

const KIND_GROUP: Record<PickKind, keyof Omit<Picks, 'notes'>> = { series: 'series', film: 'films', book: 'books', game: 'games', podcast: 'podcasts', youtube: 'youtube', dictionary: 'dictionaries' };
const imageFor = (pick: Pick, kind: PickKind, lang: string): ImageQuery => pickImageQuery(pick, KIND_GROUP[kind], lang);

export const PickCard = memo(function PickCard({
  pick,
  kind,
  lang,
  level,
  hue,
  icon: Icon,
  lookup,
}: {
  pick: Pick;
  kind: PickKind;
  lang: string;
  level: Level;
  hue: string;
  icon: LucideIcon;
  lookup?: PickLookup;
}) {
  const navigate = useNavigate();
  const streaming = useStreaming();
  const [busy, setBusy] = useState(false);
  const links = useMemo(() => pickLinks(pick, kind, { lang, country: streaming.country, services: streaming.services }), [pick, kind, lang, streaming.country, streaming.services]);
  const screen = kind === 'series' || kind === 'film';
  const tall = screen || kind === 'book';
  const poster = posterUrl(lookup?.title.posterPath, 'w185');

  // Which of the learner's services carry it: TMDB's answer for their country when there is one,
  // else the services it is known to belong to.
  const mine = screen ? (lookup ? matchProviders(lookup.where.stream, streaming.services) : (pick.on ?? []).filter((id) => streaming.services.includes(id))) : [];
  const checkedNone = screen && lookup && streaming.services.length > 0 && mine.length === 0;

  const run = async (job: () => Promise<void>) => {
    setBusy(true);
    try {
      await job();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'That didn’t work. Try again in a moment.', { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const action =
    kind === 'book' ? (
      <Button
        size="sm"
        variant="secondary"
        icon={BookPlus}
        loading={busy}
        onClick={() =>
          void run(async () => {
            const added = await addBookToCodex(lang, pick);
            toast(added ? `“${pick.title}” is on your Codex wishlist.` : 'It’s already in Codex.', { tone: added ? 'success' : 'default', action: { label: 'Codex', onClick: () => navigate('/codex') } });
          })
        }
      >
        Add to Codex
      </Button>
    ) : kind === 'podcast' ? (
      <Button
        size="sm"
        variant="secondary"
        icon={Rss}
        loading={busy}
        onClick={() =>
          void run(async () => {
            const feedId = await followPodcast(lang, pick);
            if (feedId) toast(`Following “${pick.title}” in Sonus.`, { tone: 'success', action: { label: 'Open', onClick: () => navigate(`${sonusBase()}/podcast/${feedId}`) } });
            else toast('Apple’s podcast directory doesn’t have it under that name. Try Spotify or Apple Podcasts.', { duration: 6000 });
          })
        }
      >
        Follow in Sonus
      </Button>
    ) : screen ? (
      <Button
        size="sm"
        variant="secondary"
        icon={Captions}
        loading={busy}
        onClick={() =>
          void run(async () => {
            const id = await addSubtitlesFor(lang, pick.title);
            if (id) navigate(`/visio/watch/${id}`);
          })
        }
      >
        Add its subtitles
      </Button>
    ) : null;

  return (
    <article className="flex h-full gap-4 rounded-3xl border border-line/70 bg-surface p-4 sm:p-5">
      <div className={cx('shrink-0', tall ? 'w-16 sm:w-[72px]' : 'w-12 sm:w-14')}>
        {poster ? (
          <img src={poster} alt="" loading="lazy" decoding="async" className="aspect-[2/3] w-full rounded-xl object-cover shadow-elev-1" />
        ) : (
          <div className={cx('w-full overflow-hidden rounded-xl shadow-elev-1', tall ? 'aspect-[2/3]' : 'aspect-square')} aria-hidden>
            <Art
              query={imageFor(pick, kind, lang)}
              fit={kind === 'dictionary' ? 'contain' : 'cover'}
              fallback={
                <span className="grid size-full place-items-center" style={tint(hue)}>
                  <Icon size={tall ? 22 : 20} strokeWidth={1.8} />
                </span>
              }
            />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-2">
          <h3 lang={kind === 'dictionary' ? undefined : lang} className="min-w-0 flex-1 font-serif text-[17px] leading-snug font-semibold">
            {pick.title}
          </h3>
          <LevelPill value={pick.level} ready={readyFor(pick.level, level)} />
        </div>
        {(pick.en || pick.by || pick.year) && (
          <p className="mt-0.5 truncate text-[12.5px] text-ink-faint">{[pick.en, pick.by, pick.year].filter(Boolean).join(' · ')}</p>
        )}
        <p className="mt-1.5 text-[14px] leading-snug text-ink-soft">{pick.why}</p>
        {mine.length > 0 && (
          <p className="mt-2 inline-flex items-center gap-1.5 self-start rounded-full bg-sage-soft px-2.5 py-1 text-[12px] font-bold text-sage-text">
            <Check size={13} strokeWidth={3} aria-hidden /> On your {mine.map((id) => serviceById(id)?.name).join(', ')}
          </p>
        )}
        {checkedNone && <p className="mt-2 text-[12.5px] font-semibold text-ink-faint">Not on your services in {countryName(streaming.country)}</p>}
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
          {action}
          {links.map((l) => (
            <LinkPill key={l.label} link={l} />
          ))}
          {screen && lookup?.where.link && <LinkPill link={{ label: 'Where to watch', url: lookup.where.link }} />}
          {screen && <LinkPill link={{ label: 'Find subtitles', url: subtitleSearch(pick.en ?? pick.title, lang) }} />}
        </div>
      </div>
    </article>
  );
});

function ArtistCard({ artist, level, hue }: { artist: PickedArtist; level: Level; hue: string }) {
  const value = EASE_LEVEL[artist.ease];
  return (
    <article className="flex h-full gap-4 rounded-3xl border border-line/70 bg-surface p-4 sm:p-5">
      <span className="grid size-12 shrink-0 place-items-center rounded-full font-serif text-[20px] font-semibold sm:size-14" style={tint(hue)} aria-hidden>
        {artist.name.replace(/^(the|los|las|la|le|les|die|il|i)\s+/i, '').charAt(0)}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-2">
          <h3 className="min-w-0 flex-1 font-serif text-[17px] leading-snug font-semibold">{artist.name}</h3>
          <LevelPill value={value} ready={readyFor(value, level)} />
        </div>
        <p className="mt-1.5 text-[14px] leading-snug text-ink-soft">{artist.why}</p>
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
          <Link to={`/sonus?tab=music&q=${encodeURIComponent(artist.name)}`} className="no-callout inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-raised px-3 text-[13px] font-semibold transition-colors hover:border-line-strong hover:bg-surface pointer-coarse:h-10">
            <Music2 size={15} aria-hidden /> Songs in Sonus
          </Link>
          {artistLinks(artist.name).map((l) => (
            <LinkPill key={l.label} link={l} />
          ))}
        </div>
      </div>
    </article>
  );
}

/** For a language without hand-picked recommendations (the beta languages). */
export function NoPicks({ lang }: { lang: string }) {
  const name = getLanguage(lang)?.name ?? lang;
  return (
    <Card className="p-6 sm:p-8">
      <p className={label}>Beta language</p>
      <h2 className="mt-1 font-serif text-2xl font-semibold">Picks by hand come with the twenty main languages</h2>
      <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink-soft">
        For {name}, Visio › Services lists series and films made in {name} that stream on your services (with a free TMDB key), and Beyond the app works in any language.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link to="/visio?tab=services" className="no-callout inline-flex h-10 items-center gap-2 rounded-xl bg-inverse px-4 text-sm font-semibold text-on-inverse">
          <Tv size={17} aria-hidden /> Visio › Services
        </Link>
      </div>
    </Card>
  );
}
