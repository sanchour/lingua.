import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import {
  AppWindow,
  ArrowRight,
  AudioLines,
  BookOpenText,
  Check,
  Coffee,
  CookingPot,
  ExternalLink,
  Flame,
  Footprints,
  Gamepad2,
  Hand,
  Hash,
  Keyboard,
  ListMusic,
  LockKeyhole,
  MapPinned,
  Mic,
  PenLine,
  Popcorn,
  Radio,
  Repeat1,
  RotateCcw,
  ShoppingBasket,
  Smartphone,
  StickyNote,
  Sunrise,
  Users,
  Utensils,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { streakOf } from '@/core/mundus/streak';
import type { Tip, TipIcon } from '@/core/mundus/tips';
import { tipsFor } from '@/core/mundus/tips';
import { toggleChallenge, useChallenges } from '@/data/challenges';
import { Card, Segmented } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { localDateKey } from '@/lib/format';
import { toast } from '@/state/ui';

export const TIP_ICONS: Record<TipIcon, LucideIcon> = {
  phone: Smartphone,
  apps: AppWindow,
  game: Gamepad2,
  keyboard: Keyboard,
  voice: AudioLines,
  labels: StickyNote,
  cook: CookingPot,
  walk: Footprints,
  song: Repeat1,
  spotify: ListMusic,
  list: ShoppingBasket,
  sun: Sunrise,
  film: Popcorn,
  wiki: BookOpenText,
  trip: MapPinned,
  radio: Radio,
  cafe: Coffee,
  meal: Utensils,
  count: Hash,
  mic: Mic,
  people: Users,
  lock: LockKeyhole,
  pen: PenLine,
  smile: Hand,
};

/** A soft colour per challenge, so the grid reads as a set of cards rather than a list. */
const HUES = ['#c86d51', '#6b8e78', '#5f87a8', '#b56fa0', '#d49b54', '#8a7fb0', '#4f93a0', '#c4707f'];
const hueOf = (id: string) => HUES[[...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % HUES.length];

const label = 'text-[12px] font-bold tracking-[0.14em] text-ink-faint uppercase';

type Show = 'all' | 'open' | 'done';

export function TipsView({ lang }: { lang: string }) {
  const tips = useMemo(() => tipsFor(lang), [lang]);
  const done = useChallenges(lang);
  const today = localDateKey();
  const [show, setShow] = useState<Show>('all');

  const byTip = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const row of done ?? []) map.set(row.tipId, [...(map.get(row.tipId) ?? []), row.date]);
    return map;
  }, [done]);
  const streak = useMemo(() => streakOf((done ?? []).map((r) => r.date), today), [done, today]);
  const tried = tips.filter((t) => byTip.has(t.id)).length;

  const visible = tips.filter((t) => (show === 'all' ? true : show === 'done' ? byTip.has(t.id) : !byTip.has(t.id) || (t.habit && !byTip.get(t.id)?.includes(today))));

  return (
    <div>
      <StreakCard days={streak.days} doneToday={streak.doneToday} tried={tried} total={tips.length} />
      <div className="mt-7 mb-5">
        <Segmented<Show>
          block
          label="Show"
          value={show}
          onChange={setShow}
          options={[
            { value: 'all', label: 'All' },
            { value: 'open', label: 'To try' },
            { value: 'done', label: 'Done' },
          ]}
        />
      </div>
      {visible.length ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((tip, i) => (
            <motion.li key={tip.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.soft, delay: 0.03 * Math.min(i, 10) }}>
              <FlipCard tip={tip} lang={lang} dates={byTip.get(tip.id) ?? []} today={today} />
            </motion.li>
          ))}
        </ul>
      ) : (
        <p className="py-10 text-center text-[15px] text-ink-soft">{show === 'done' ? 'Challenges you mark as done gather here.' : 'All done. Habits come back tomorrow.'}</p>
      )}
    </div>
  );
}

function StreakCard({ days, doneToday, tried, total }: { days: number; doneToday: boolean; tried: number; total: number }) {
  return (
    <Card className="flex items-center gap-5 p-5 sm:p-6">
      <div className={cx('grid size-16 shrink-0 place-items-center rounded-2xl sm:size-[72px]', days > 0 ? 'bg-accent-soft text-accent-text' : 'bg-sunken text-ink-faint')}>
        <div className="flex flex-col items-center leading-none">
          <Flame size={22} aria-hidden />
          <span className="mt-1 font-serif text-[22px] font-semibold tabular-nums">{days}</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className={label}>Beyond the app</p>
        <p className="mt-1 font-serif text-[20px] leading-snug font-semibold sm:text-[22px]">
          {days === 0 ? 'Take the language out for a walk.' : days === 1 ? (doneToday ? 'One day so far. Lovely start.' : 'One day so far: keep it going today.') : `${days} days in a row${doneToday ? '' : ': one more today keeps it alive'}.`}
        </p>
        <p className="mt-1 text-[14px] text-ink-soft">
          {tried} of {total} challenges tried. Tap a card to see how; mark it done when you have.
        </p>
      </div>
    </Card>
  );
}

function FlipCard({ tip, lang, dates, today }: { tip: Tip; lang: string; dates: string[]; today: string }) {
  const [flipped, setFlipped] = useState(false);
  const [platform, setPlatform] = useState(0);
  const backRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLButtonElement>(null);
  const Icon = TIP_ICONS[tip.icon];
  const hue = hueOf(tip.id);
  const doneToday = dates.includes(today);
  const done = dates.length > 0;
  const steps = tip.platforms ? tip.platforms[platform]?.steps : tip.steps;

  const flip = (to: boolean) => {
    setFlipped(to);
    // Move focus with the card so keyboard users land on the side they turned to.
    window.setTimeout(() => (to ? backRef.current : frontRef.current)?.focus({ preventScroll: true }), 60);
  };

  const mark = async () => {
    const now = await toggleChallenge(lang, tip.id);
    if (now) toast(tip.habit ? 'Done for today.' : 'Challenge done. Lovely.', { tone: 'success' });
  };

  const markButton = (
    <button
      type="button"
      onClick={() => void mark()}
      aria-pressed={tip.habit ? doneToday : done}
      className={cx(
        'no-callout inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-semibold transition-[background-color,color,transform] duration-150 active:scale-[0.96] pointer-coarse:h-10',
        (tip.habit ? doneToday : done) ? 'bg-sage text-on-accent' : 'bg-inverse text-on-inverse',
      )}
    >
      <Check size={15} strokeWidth={2.6} aria-hidden />
      {tip.habit ? (doneToday ? 'Done today' : 'Did it today') : done ? 'Done' : 'Mark done'}
    </button>
  );

  return (
    <div className="h-full [perspective:1200px]">
      <motion.div className="relative grid h-full [transform-style:preserve-3d]" initial={false} animate={{ rotateY: flipped ? 180 : 0 }} transition={spring.gentle}>
        {/* Front */}
        <button
          ref={frontRef}
          type="button"
          onClick={() => flip(true)}
          aria-label={`${tip.title}: show how`}
          inert={flipped}
          className="col-start-1 row-start-1 flex min-h-[188px] flex-col rounded-3xl border border-line/70 bg-surface p-5 text-left [backface-visibility:hidden] transition-colors hover:border-line-strong"
        >
          <span className="flex w-full items-start justify-between gap-3">
            <span className="grid size-11 place-items-center rounded-2xl" style={{ background: `color-mix(in oklab, ${hue} 17%, var(--color-surface))`, color: `color-mix(in oklab, ${hue} 78%, var(--color-ink))` }}>
              <Icon size={21} aria-hidden />
            </span>
            {done ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-sage-soft px-2.5 py-0.5 text-[11.5px] font-bold text-sage-text">
                <Check size={12} strokeWidth={3} aria-hidden />
                {tip.habit ? `${dates.length}×` : 'Done'}
              </span>
            ) : (
              <span className="rounded-full bg-sunken px-2.5 py-0.5 text-[11.5px] font-bold text-ink-faint">{tip.habit ? 'Habit' : 'Once'}</span>
            )}
          </span>
          <span className="mt-4 block font-serif text-[19px] leading-snug font-semibold">{tip.title}</span>
          <span className="mt-1.5 block text-[14px] leading-snug text-ink-soft">{tip.teaser}</span>
          <span className="mt-auto flex items-center gap-1 pt-4 text-[13px] font-semibold text-accent-text">
            How <ArrowRight size={14} aria-hidden />
          </span>
        </button>

        {/* Back */}
        <div
          ref={backRef}
          tabIndex={-1}
          // The face turned away stays out of the tab order and away from screen readers.
          inert={!flipped}
          className="col-start-1 row-start-1 flex min-h-[188px] flex-col rounded-3xl border border-line/70 bg-raised p-5 outline-none [backface-visibility:hidden] [transform:rotateY(180deg)]"
        >
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 font-serif text-[17px] leading-snug font-semibold">{tip.title}</p>
            <button type="button" onClick={() => flip(false)} aria-label="Turn back" className="-mt-1 -mr-1 grid size-9 shrink-0 place-items-center rounded-full text-ink-faint transition-colors hover:bg-surface hover:text-ink">
              <RotateCcw size={16} aria-hidden />
            </button>
          </div>
          {tip.platforms && (
            <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Where">
              {tip.platforms.map((p, i) => (
                <button
                  key={p.name}
                  type="button"
                  role="tab"
                  aria-selected={i === platform}
                  onClick={() => setPlatform(i)}
                  className={cx('h-8 rounded-full px-3 text-[12.5px] font-semibold transition-colors pointer-coarse:h-9', i === platform ? 'bg-inverse text-on-inverse' : 'bg-sunken text-ink-soft hover:text-ink')}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
          <ol className="mt-3 space-y-1.5 text-[14px] leading-snug text-ink-soft">
            {steps?.map((s, i) => (
              <li key={s} className="flex gap-2">
                <span className="mt-px grid size-5 shrink-0 place-items-center rounded-full bg-sunken text-[11px] font-bold text-ink-faint tabular-nums">{i + 1}</span>
                <span className="min-w-0">{s}</span>
              </li>
            ))}
          </ol>
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
            {markButton}
            {tip.action?.to && (
              <Link to={tip.action.to} className="no-callout inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-[13.5px] font-semibold text-ink-soft transition-colors hover:text-ink pointer-coarse:h-10">
                {tip.action.label} <ArrowRight size={14} aria-hidden />
              </Link>
            )}
            {tip.action?.href && (
              <a href={tip.action.href} target="_blank" rel="noopener noreferrer" className="no-callout inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-[13.5px] font-semibold text-ink-soft transition-colors hover:text-ink pointer-coarse:h-10">
                {tip.action.label} <ExternalLink size={13} aria-hidden />
              </a>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
