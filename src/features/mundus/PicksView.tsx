import { memo, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router';
import { BookPlus, Captions, Check, ExternalLink, Rss } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Level } from '@/core/lang/levels';
import { pickLinks, subtitleSearch } from '@/core/mundus/links';
import type { PickLink } from '@/core/mundus/links';
import { countryName, matchProviders, serviceById } from '@/core/mundus/services';
import type { Pick, PickKind, PickLevel, Picks } from '@/core/mundus/types';
import { Button } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { pickImageQuery } from '@/services/mundus/images';
import type { ImageQuery } from '@/services/mundus/images';
import { posterUrl } from '@/services/mundus/tmdb';
import { Art } from './Art';
import { toast } from '@/state/ui';
import { addBookToCodex, addSubtitlesFor, followPodcast } from './actions';
import { useStreaming } from './hooks';
import type { PickLookup } from './hooks';
import { ServiceMark } from './ServiceBadge';
import { sonusBase } from '@/features/sonus/paths';

// The pick card: Mundus's guide opens one for a step, and Home's today card shows it. (Explore, in Explora, has its own tiles and side bar.)

const ORDER: PickLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];
/** Whether a pick suits a learner now: its level at or below theirs (a beginner counts as A1). */
export const readyFor = (pick: PickLevel, learner: Level) => ORDER.indexOf(pick) <= Math.max(0, ORDER.indexOf(learner as PickLevel));

export const tint = (hue: string): CSSProperties => ({
  background: `color-mix(in oklab, ${hue} 17%, var(--color-surface))`,
  color: `color-mix(in oklab, ${hue} 78%, var(--color-ink))`,
});

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

export function LinkPill({ link }: { link: PickLink }) {
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
