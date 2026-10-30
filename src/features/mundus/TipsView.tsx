import { UiText, useUi } from '@/design/i18n/UiText';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import {
  AppWindow,
  ArrowRight,
  AudioLines,
  BookOpenText,
  Check,
  Clock,
  Coffee,
  CookingPot,
  Dices,
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
  ShoppingBasket,
  Smartphone,
  StickyNote,
  Sunrise,
  Users,
  Utensils,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { tipLevel, tipsByReach } from '@/core/mundus/guide';
import { streakOf } from '@/core/mundus/streak';
import type { Tip, TipIcon } from '@/core/mundus/tips';
import { tipOfTheDay, tipsFor } from '@/core/mundus/tips';
import { dealOne, doneThisWeek, MINUTES, tipMinutes, visibleTips, WHERES } from '@/core/mundus/try';
import type { DoneDates, TryFilter, Where } from '@/core/mundus/try';
import { toggleChallenge, useChallenges } from '@/data/challenges';
import { Drawer, Segmented } from '@/design/primitives';
import { spring } from '@/design/motion';
import { useApp } from '@/app/context';
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
const soft = (hue: string) => ({ background: `color-mix(in oklab, ${hue} 17%, var(--color-surface))`, color: `color-mix(in oklab, ${hue} 78%, var(--color-ink))` });

const label = 'text-[12px] font-bold tracking-[0.14em] text-ink-faint uppercase';
const chip = 'no-callout inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition-colors';

/**
 * Things to try (5.2-7): small challenges in a dense grid. Deal me one turns a card over, a tick stamps it and counts it
 * this week, and the time and place filters find one for the moment. Mundus marks the one to try today.
 */
export function TipsView({ lang }: { lang: string }) {
  const translateUi = useUi();
  const { language } = useApp();
  const tips = useMemo(() => tipsFor(lang), [lang]);
  const rows = useChallenges(lang);
  const today = localDateKey();
  const [filter, setFilter] = useState<TryFilter>({ show: 'all', minutes: 'any', where: 'any' });
  const [dealt, setDealt] = useState<string>();
  const [details, setDetails] = useState<string>();

  const byTip: DoneDates = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const row of rows ?? []) map.set(row.tipId, [...(map.get(row.tipId) ?? []), row.date]);
    return map;
  }, [rows]);
  const streak = useMemo(() => streakOf((rows ?? []).map((r) => r.date), today), [rows, today]);
  const week = doneThisWeek(byTip, today);
  const tried = tips.filter((t) => byTip.has(t.id)).length;

  // The one Mundus suggests today: the same tip its guide offers (a tip for the learner's stage, one a day).
  const todayId = useMemo(() => {
    const doneBefore = new Set([...byTip].filter(([, dates]) => dates.some((d) => d !== today)).map(([id]) => id));
    return tipOfTheDay(tipsByReach(tips, language.level).now, doneBefore, Math.floor(Date.now() / 86_400_000))?.id;
  }, [tips, byTip, today, language.level]);

  const visible = visibleTips(tips, byTip, today, filter);
  const dealtTip = tips.find((t) => t.id === dealt);
  const detailTip = tips.find((t) => t.id === details);
  const filtered = filter.minutes !== 'any' || filter.where !== 'any';

  const deal = () => {
    const next = dealOne(tips, byTip, today, filter, dealt);
    if (!next) toast('Nothing left to deal with these filters. Try another time or place.');
    setDealt(next?.id);
  };

  const mark = async (tip: Tip) => {
    const now = await toggleChallenge(lang, tip.id);
    if (now) toast(tip.habit ? 'Done for today.' : 'Challenge done. Lovely.', { tone: 'success' });
  };

  return (
    <div>
      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <StreakCard days={streak.days} doneToday={streak.doneToday} week={week} tried={tried} total={tips.length} onDeal={deal} />
        <DealtPanel tip={dealtTip} dates={dealtTip ? (byTip.get(dealtTip.id) ?? []) : []} today={today} onMark={(t) => void mark(t)} onAnother={deal} onOpen={setDetails} onClose={() => setDealt(undefined)} />
      </div>

      <div className="mt-6 mb-4 flex flex-wrap items-center gap-x-5 gap-y-3">
        <Segmented<TryFilter['show']>
          label={translateUi('Show')}
          value={filter.show}
          onChange={(show) => setFilter((f) => ({ ...f, show }))}
          options={[
            { value: 'all', label: translateUi('All') },
            { value: 'open', label: translateUi('To try') },
            { value: 'done', label: translateUi('Done') },
          ]}
        />
        <div role="group" aria-label={translateUi('How long')} className="flex items-center gap-1.5">
          <Clock size={15} className="text-ink-faint" aria-hidden />
          {MINUTES.map((m) => (
            <Chip key={m} on={filter.minutes === m} onClick={() => setFilter((f) => ({ ...f, minutes: f.minutes === m ? 'any' : m }))}><UiText source={'{0} min'} values={[m]} /></Chip>
          ))}
        </div>
        <div role="group" aria-label={translateUi('Where')} className="flex flex-wrap items-center gap-1.5">
          {WHERES.map((w) => (
            <Chip key={w.id} on={filter.where === w.id} onClick={() => setFilter((f) => ({ ...f, where: f.where === w.id ? 'any' : (w.id as Where) }))}>
              {w.label}
            </Chip>
          ))}
        </div>
        {filtered && (
          <button type="button" onClick={() => setFilter((f) => ({ ...f, minutes: 'any', where: 'any' }))} className="hit text-[13px] font-semibold text-ink-soft hover:text-ink"><UiText source={'Clear'} /></button>
        )}
      </div>

      {visible.length ? (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {visible.map((tip, i) => (
            <motion.li key={tip.id} layout="position" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.soft, delay: 0.02 * Math.min(i, 12) }}>
              <SmallCard tip={tip} dates={byTip.get(tip.id) ?? []} today={today} isToday={tip.id === todayId} dealt={tip.id === dealt} onOpen={() => setDetails(tip.id)} onMark={() => void mark(tip)} />
            </motion.li>
          ))}
        </ul>
      ) : (
        <p className="py-10 text-center text-[15px] text-ink-soft">{filter.show === 'done' ? translateUi('Challenges you mark as done gather here.') : filtered ? translateUi('Nothing matches. Try another time or place.') : translateUi('All done. Habits come back tomorrow.')}</p>
      )}

      <Drawer open={Boolean(detailTip)} onClose={() => setDetails(undefined)} title={detailTip?.title ?? ''}>
        {detailTip && <Detail tip={detailTip} dates={byTip.get(detailTip.id) ?? []} today={today} onMark={() => void mark(detailTip)} />}
      </Drawer>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={cx(chip, on ? 'border-transparent bg-inverse text-on-inverse' : 'border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink')}>
      {children}
    </button>
  );
}

function StreakCard({ days, doneToday, week, tried, total, onDeal }: { days: number; doneToday: boolean; week: number; tried: number; total: number; onDeal: () => void }) {
  const translateUi = useUi();
  return (
    <div className="flex items-center gap-4 rounded-3xl border border-line/70 bg-surface p-4 sm:p-5">
      <div className={cx('grid size-14 shrink-0 place-items-center rounded-2xl', days > 0 ? 'bg-accent-soft text-accent-text' : 'bg-sunken text-ink-faint')}>
        <div className="flex flex-col items-center leading-none">
          <Flame size={18} aria-hidden />
          <span className="mt-0.5 font-serif text-[20px] font-semibold tabular-nums">{days}</span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className={label}><UiText source={'Beyond the app'} /></p>
        <p className="mt-0.5 font-serif text-[18px] leading-snug font-semibold">
          {week === 0 ? translateUi('Take the language out for a walk.') : week === 1 ? translateUi('One challenge this week.') : translateUi('{0} challenges this week.', [week])}
        </p>
        <p className="mt-0.5 text-[13px] text-ink-soft"><UiText source={'{0}{1} of {2} tried.'} values={[days > 1 ? `${days} days in a row${doneToday ? '' : ': one more today keeps it alive'}. ` : '', tried, total]} /></p>
      </div>
      <button type="button" onClick={onDeal} className="no-callout inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-inverse px-4 text-[14px] font-semibold text-on-inverse transition-transform active:scale-[0.97]"><UiText source={'{0} Deal me one'} values={[<Dices size={18} aria-hidden />]} /></button>
    </div>
  );
}

/** The card turned over by "Deal me one": big enough to read and do, until it is done or closed. */
function DealtPanel({ tip, dates, today, onMark, onAnother, onOpen, onClose }: { tip?: Tip; dates: readonly string[]; today: string; onMark: (t: Tip) => void; onAnother: () => void; onOpen: (id: string) => void; onClose: () => void }) {
  const translateUi = useUi();
  const Icon = tip ? TIP_ICONS[tip.icon] : Dices;
  const hue = tip ? hueOf(tip.id) : '#9a8466';
  const done = tip ? (tip.habit ? dates.includes(today) : dates.length > 0) : false;
  return (
    <div className="relative min-h-36 [perspective:1000px]">
      <AnimatePresence mode="wait" initial={false}>
        {tip ? (
          <motion.div key={tip.id} initial={{ rotateY: -90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} exit={{ rotateY: 90, opacity: 0 }} transition={spring.gentle} className="flex h-full gap-4 rounded-3xl border border-line/70 bg-raised p-4 sm:p-5">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl" style={soft(hue)}>
              <Icon size={26} aria-hidden />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <p className={label}><UiText source={'Dealt · {0} min'} values={[tipMinutes(tip)]} /></p>
              <h3 className="mt-0.5 font-serif text-[20px] leading-snug font-semibold">{tip.title}</h3>
              <p className="mt-1 text-[14px] leading-snug text-ink-soft">{tip.teaser}</p>
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                <button type="button" onClick={() => onMark(tip)} aria-pressed={done} className={cx(chip, 'h-9', done ? 'border-transparent bg-sage text-on-accent' : 'border-transparent bg-inverse text-on-inverse')}>
                  <Check size={15} strokeWidth={2.6} aria-hidden /> {done ? translateUi('Done') : translateUi('I did it')}
                </button>
                <button type="button" onClick={() => onOpen(tip.id)} className={cx(chip, 'h-9 border-line bg-surface text-ink-soft hover:text-ink')}><UiText source={'How {0}'} values={[<ArrowRight size={14} aria-hidden />]} /></button>
                <button type="button" onClick={onAnother} className={cx(chip, 'h-9 border-line bg-surface text-ink-soft hover:text-ink')}><UiText source={'{0} Another'} values={[<Dices size={14} aria-hidden />]} /></button>
              </div>
            </div>
            <button type="button" onClick={onClose} aria-label={translateUi('Put it back')} className="-mt-1 -mr-1 grid size-8 shrink-0 place-items-center rounded-full text-ink-faint transition-colors hover:bg-sunken hover:text-ink">
              <X size={16} aria-hidden />
            </button>
          </motion.div>
        ) : (
          <motion.div key="back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full items-center gap-4 rounded-3xl border border-dashed border-line p-4 text-ink-soft sm:p-5">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-sunken text-ink-faint">
              <Dices size={26} aria-hidden />
            </span>
            <p className="text-[14.5px] leading-snug"><UiText source={'Not sure what to try? Deal one: it turns over a challenge you haven’t done, for the time and place you chose below.'} /></p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** A small card: what it is, how long, and a tick. A tick stamps it. */
function SmallCard({ tip, dates, today, isToday, dealt, onOpen, onMark }: { tip: Tip; dates: readonly string[]; today: string; isToday: boolean; dealt: boolean; onOpen: () => void; onMark: () => void }) {
  const translateUi = useUi();
  const Icon = TIP_ICONS[tip.icon];
  const hue = hueOf(tip.id);
  const done = dates.length > 0;
  const doneNow = tip.habit ? dates.includes(today) : done;
  return (
    <div className={cx('group relative flex h-full flex-col rounded-2xl border bg-surface transition-[border-color,opacity,box-shadow]', dealt ? 'border-accent shadow-elev-1' : 'border-line/70 hover:border-line-strong', doneNow && 'opacity-75')}>
      <button type="button" onClick={onOpen} aria-label={translateUi('{0}: show how', [tip.title])} className="no-callout flex flex-1 flex-col rounded-2xl p-3.5 text-left">
        <span className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-xl" style={soft(hue)}>
            <Icon size={16} aria-hidden />
          </span>
          <span className="rounded-full bg-sunken px-2 py-0.5 text-[11.5px] font-bold text-ink-faint tabular-nums"><UiText source={'{0} min'} values={[tipMinutes(tip)]} /></span>
          {isToday && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11.5px] font-bold text-accent-text"><UiText source={'Today'} /></span>}
        </span>
        <span className="mt-2.5 line-clamp-2 block text-[14.5px] leading-snug font-semibold">{tip.title}</span>
        <span className="mt-1 line-clamp-2 block text-[12.5px] leading-snug text-ink-soft">{tip.teaser}</span>
        {tip.habit && dates.length > 0 && <span className="mt-1.5 text-[11.5px] font-bold text-sage-text"><UiText source={'{0}× so far'} values={[dates.length]} /></span>}
      </button>
      <button
        type="button"
        onClick={onMark}
        aria-pressed={doneNow}
        aria-label={doneNow ? translateUi('{0}: done, undo', [tip.title]) : translateUi('{0}: mark done', [tip.title])}
        className={cx('absolute top-2.5 right-2.5 grid size-8 place-items-center rounded-full border transition-[background-color,border-color,transform] active:scale-90', doneNow ? 'border-transparent bg-sage text-on-accent' : 'border-line bg-raised text-ink-faint hover:border-line-strong hover:text-ink')}
      >
        <Check size={15} strokeWidth={2.6} aria-hidden />
      </button>
      {doneNow && (
        <span aria-hidden className="pointer-events-none absolute right-3 bottom-3 -rotate-12 rounded-md border-2 border-sage px-1.5 py-0.5 text-[11px] font-extrabold tracking-widest text-sage uppercase">
          {tip.habit ? translateUi('Today') : translateUi('Done')}
        </span>
      )}
    </div>
  );
}

/** The back of a card: how to do it, in steps, with a mark and where to go. */
function Detail({ tip, dates, today, onMark }: { tip: Tip; dates: readonly string[]; today: string; onMark: () => void }) {
  const translateUi = useUi();
  const [platform, setPlatform] = useState(0);
  const steps = tip.platforms ? tip.platforms[platform]?.steps : tip.steps;
  const done = tip.habit ? dates.includes(today) : dates.length > 0;
  const level = tipLevel(tip);
  return (
    <div>
      <p className="text-[15px] leading-relaxed text-ink-soft">{tip.teaser}</p>
      <p className="mt-2 text-[12.5px] font-semibold text-ink-faint"><UiText source={'About {0} minutes{1}'} values={[tipMinutes(tip), level !== 'A1' ? ` · from ${level}` : '']} /></p>
      {tip.platforms && (
        <div className="mt-4 flex flex-wrap gap-1.5" role="tablist" aria-label={translateUi('Where')}>
          {tip.platforms.map((p, i) => (
            <button key={p.name} type="button" role="tab" aria-selected={i === platform} onClick={() => setPlatform(i)} className={cx('h-8 rounded-full px-3 text-[12.5px] font-semibold transition-colors', i === platform ? 'bg-inverse text-on-inverse' : 'bg-sunken text-ink-soft hover:text-ink')}>
              {p.name}
            </button>
          ))}
        </div>
      )}
      <ol className="mt-4 space-y-2.5 text-[15px] leading-snug">
        {steps?.map((s, i) => (
          <li key={s} className="flex gap-2.5">
            <span className="mt-px grid size-6 shrink-0 place-items-center rounded-full bg-sunken text-[12px] font-bold text-ink-faint tabular-nums">{i + 1}</span>
            <span className="min-w-0 text-ink-soft">{s}</span>
          </li>
        ))}
      </ol>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button type="button" onClick={onMark} aria-pressed={done} className={cx(chip, 'h-10 px-4 text-[14px]', done ? 'border-transparent bg-sage text-on-accent' : 'border-transparent bg-inverse text-on-inverse')}>
          <Check size={15} strokeWidth={2.6} aria-hidden /> {tip.habit ? (done ? translateUi('Done today') : translateUi('Did it today')) : done ? translateUi('Done') : translateUi('Mark done')}
        </button>
        {tip.action?.to && (
          <Link to={tip.action.to} className={cx(chip, 'h-10 border-line px-4 text-[14px] text-ink-soft hover:text-ink')}>
            {tip.action.label} <ArrowRight size={14} aria-hidden />
          </Link>
        )}
        {tip.action?.href && (
          <a href={tip.action.href} target="_blank" rel="noopener noreferrer" className={cx(chip, 'h-10 border-line px-4 text-[14px] text-ink-soft hover:text-ink')}>
            {tip.action.label} <ExternalLink size={13} aria-hidden />
          </a>
        )}
      </div>
    </div>
  );
}
