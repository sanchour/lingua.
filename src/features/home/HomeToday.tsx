import { Link } from 'react-router';
import { motion } from 'motion/react';
import { Check, ChevronRight, Flame, X } from 'lucide-react';
import { useApp } from '@/app/context';
import { PageHeader } from '@/app/PageHeader';
import { getLanguage } from '@/core/lang/languages';
import { useToday } from '@/data/stats';
import { useDueSummary } from '@/data/study';
import { patchSetting } from '@/data/settings';
import { useVocabularyCounts } from '@/data/words';
import { Card } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { MundusHomeCard } from '@/features/mundus/HomeCard';
import { GrammarHomeCard } from '@/features/grammatica/links';
import { LettersCard } from '@/features/grammatica/letters/LettersCard';
import { usePlan } from '@/features/plans/usePlan';
import { useUI } from '@/state/ui';
import { studyMinutes, useHomeFacts } from './facts';
import type { HomeFacts } from './facts';
import { enter, FIRST, greeting, label, TONE, useNextSteps, WeekCard } from './HomeClassic';

const DATE = new Intl.DateTimeFormat('en', { weekday: 'long', day: 'numeric', month: 'long' });

/** Today's minutes by room, in the rooms' tones, for the ribbon and its legend. */
const ROOMS = [
  { key: 'readMs', name: 'Reading', tone: 'bg-accent' },
  { key: 'listenMs', name: 'Listening', tone: 'bg-sage' },
  { key: 'watchMs', name: 'Watching', tone: 'bg-accent/50' },
  { key: 'writeMs', name: 'Writing', tone: 'bg-ink-faint' },
] as const;

/** Days in a row the goal was met, today counting only once it is. */
function streakOf(week: HomeFacts['week']): number {
  let streak = 0;
  for (let i = week.length - 1; i >= 0; i--) {
    if (week[i].met) streak++;
    else if (i < week.length - 1) break;
  }
  return streak;
}

/**
 * Home, Today (5.1-2c), as a square grid: the day's goal as a ribbon split by room with next up
 * under it, beside the week and four numbers; a new learner's first steps in one row; Cursus and
 * Mundus in equal columns. A Lingua+ button sits top right on the free plan only. The layout before
 * it stays one setting away (HomeClassic).
 */
export function HomeToday() {
  const { language, settings } = useApp();
  const plan = usePlan();
  const openPlans = useUI((s) => s.openPlans);
  const target = getLanguage(language.id);
  const facts = useHomeFacts(language.id);
  const steps = facts?.firstSteps;
  const showSteps = Boolean(steps) && Object.values(steps ?? {}).some((d) => !d) && !settings.ui.firstStepsHidden;
  const name = settings.learner.name?.trim();
  const goal = language.dailyGoal.readMinutes;

  return (
    <>
      <PageHeader
        title={`${greeting(new Date().getHours())}${name ? `, ${name}` : ''}`}
        eyebrow={`${DATE.format(new Date())} · ${target?.endonym ?? language.id} · ${language.level}${language.goal ? ` → ${language.goal}` : ''}`}
        actions={
          plan === 'free' ? (
            <button
              type="button"
              onClick={() => openPlans()}
              className="inline-flex h-9 items-center gap-1 rounded-full border border-accent/40 px-4 text-[13.5px] font-semibold transition-colors hover:border-accent hover:bg-accent-soft"
            >
              Lingua<span className="text-accent-text">+</span>
            </button>
          ) : undefined
        }
      />
      {/* A square grid: every row's cards share one height, and whatever is shorter stretches inside its card. */}
      <div className="grid grid-cols-12 gap-5">
        <motion.div {...enter(0)} className="col-span-12 min-w-0 lg:col-span-8">
          <TodayCard lang={language.id} level={language.level} goal={goal} enjoys={settings.learner.enjoys} />
        </motion.div>
        <div className="col-span-12 flex min-w-0 flex-col gap-5 lg:col-span-4">
          <motion.div {...enter(1)}>
            <Link to="/ratio" aria-label="This week, in Ratio" className="block rounded-3xl transition-transform hover:-translate-y-0.5">
              <WeekCard facts={facts} goal={goal} />
            </Link>
          </motion.div>
          <motion.div {...enter(2)} className="flex-1">
            <NumbersCard lang={language.id} facts={facts} />
          </motion.div>
        </div>
        {showSteps && (
          <motion.div {...enter(2)} className="col-span-12">
            <FirstStepsStrip steps={steps!} />
          </motion.div>
        )}
        {/* Cursus (grammar and the alphabet, as each language has them) and Mundus, in equal columns. */}
        <div className="col-span-12 grid min-w-0 auto-cols-fr grid-flow-col gap-5">
          <motion.div {...enter(3)} className="empty:hidden [&>*]:h-full">
            <GrammarHomeCard lang={language.id} level={language.level} />
          </motion.div>
          <motion.div {...enter(3)} className="empty:hidden [&>*]:h-full">
            <LettersCard lang={language.id} level={language.level} home />
          </motion.div>
          <motion.div {...enter(4)} className="empty:hidden [&>*]:h-full">
            <MundusHomeCard />
          </motion.div>
        </div>
      </div>
    </>
  );
}

/** A new learner's first steps as one row across the page: a turn around every room. */
function FirstStepsStrip({ steps }: { steps: HomeFacts['firstSteps'] }) {
  const done = FIRST.filter((f) => steps[f.key]).length;
  return (
    <Card className="p-5 sm:px-6">
      <div className="mb-3 flex items-center gap-3">
        <p className={label}>First steps</p>
        <p className="min-w-0 flex-1 text-[13.5px] text-ink-soft">
          {done} of {FIRST.length} done: one turn around every room.
        </p>
        <button
          type="button"
          aria-label="Hide first steps"
          onClick={() => void patchSetting('ui', { firstStepsHidden: true })}
          className="-my-2 grid size-9 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-surface hover:text-ink"
        >
          <X size={17} aria-hidden />
        </button>
      </div>
      <ul className="grid grid-cols-5 gap-2.5">
        {FIRST.map((f) => {
          const ok = steps[f.key];
          return (
            <li key={f.key}>
              <Link
                to={f.to}
                className={cx(
                  'flex h-full items-center gap-2.5 rounded-2xl border px-3 py-2.5 transition-colors',
                  ok ? 'pointer-events-none border-transparent bg-sunken' : 'border-line hover:border-line-strong hover:bg-surface',
                )}
              >
                <span className={cx('grid size-6 shrink-0 place-items-center rounded-full border-2', ok ? 'border-sage bg-sage text-on-accent' : 'border-line-strong')}>
                  {ok && <Check size={13} strokeWidth={3} aria-hidden />}
                </span>
                <span className={cx('text-[13.5px] leading-snug', ok ? 'text-ink-faint line-through decoration-1' : 'font-semibold')}>{f.title}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function TodayCard({ lang, level, goal, enjoys }: { lang: string; level: Parameters<typeof useNextSteps>[1]; goal: number; enjoys: Parameters<typeof useNextSteps>[2] }) {
  const today = useToday(lang);
  const steps = useNextSteps(lang, level, enjoys, 4);
  const minutes = studyMinutes(today);
  const left = Math.max(0, Math.ceil(goal - minutes));
  const scale = Math.max(goal, minutes) || 1;
  const parts = ROOMS.map((r) => ({ ...r, minutes: (today?.[r.key] ?? 0) / 60_000 })).filter((r) => r.minutes >= 0.5);

  return (
    <Card className="flex h-full flex-col p-6 sm:p-7">
      <div className="flex items-baseline justify-between gap-4">
        <p className={label}>Today</p>
        <p className="text-[13.5px] font-semibold text-ink-soft">{minutes === 0 ? 'A fresh page.' : left === 0 ? 'Goal reached. Lovely.' : `${left} ${left === 1 ? 'minute' : 'minutes'} to go`}</p>
      </div>
      <p className="mt-2 font-serif text-[34px] leading-none font-semibold tabular-nums">
        {Math.floor(minutes)} <span className="text-[18px] font-normal text-ink-soft">of {goal} minutes</span>
      </p>

      {/* The ribbon: the goal across the page, filled by room; it grows in once, by transform only. */}
      <motion.div
        className="relative mt-4 flex h-3 origin-left overflow-hidden rounded-full bg-sunken"
        initial={{ scaleX: 0.6, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={spring.soft}
        role="img"
        aria-label={`${Math.floor(minutes)} of ${goal} minutes today${parts.length ? `: ${parts.map((p) => `${p.name.toLowerCase()} ${Math.round(p.minutes)}`).join(', ')}` : ''}`}
      >
        {parts.map((p) => (
          <span key={p.key} className={cx('h-full border-r-2 border-raised last:border-r-0', p.tone)} style={{ width: `${(p.minutes / scale) * 100}%` }} />
        ))}
        {minutes > goal && <span className="absolute inset-y-0 w-0.5 bg-ink/40" style={{ left: `${(goal / scale) * 100}%` }} aria-hidden />}
      </motion.div>
      <p className="mt-2.5 flex min-h-5 flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-soft">
        {parts.length ? (
          parts.map((p) => (
            <span key={p.key} className="inline-flex items-center gap-1.5">
              <span className={cx('size-2 rounded-full', p.tone)} aria-hidden /> {p.name} {Math.round(p.minutes)} min
            </span>
          ))
        ) : (
          <span>Read, listen, watch or write: it all counts.</span>
        )}
        {today?.reviews ? <span>{today.reviews} {today.reviews === 1 ? 'card' : 'cards'} reviewed</span> : null}
      </p>

      <div className="mt-6 flex-1 border-t border-line pt-4">
        <p className={cx(label, 'mb-1')}>Next up</p>
        <ul className="-mx-2">
          {(steps ?? []).map((s) => (
            <li key={s.key}>
              <Link to={s.to} className="group flex items-center gap-3.5 rounded-2xl px-2 py-2 transition-colors hover:bg-surface">
                {s.art ?? (
                  <span className={cx('grid size-9 shrink-0 place-items-center rounded-xl', TONE[s.tone])}>
                    <s.icon size={18} aria-hidden />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span lang={s.key === 'review' || s.key === 'write' || s.key.startsWith('find') ? undefined : lang} className="block truncate text-[14.5px] font-semibold">
                    {s.title}
                  </span>
                  <span className="block truncate text-[12.5px] text-ink-soft">{s.detail}</span>
                </span>
                <ChevronRight size={17} className="shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

/** Four quiet numbers under the week, two by two: the streak, words known, minutes this week, cards due. */
function NumbersCard({ lang, facts }: { lang: string; facts?: HomeFacts }) {
  const counts = useVocabularyCounts(lang);
  const due = useDueSummary(lang);
  const week = facts?.week ?? [];
  const streak = streakOf(week);
  const minutes = Math.round(week.reduce((n, d) => n + d.minutes, 0));
  const stats = [
    { value: streak, label: streak === 1 ? 'day in a row' : 'days in a row', icon: streak > 0 },
    { value: (counts?.known ?? 0).toLocaleString(), label: 'words known' },
    { value: minutes.toLocaleString(), label: 'min this week' },
    { value: (due?.due ?? 0).toLocaleString(), label: 'cards due' },
  ];
  return (
    <Link to="/ratio" className="block h-full rounded-3xl transition-transform hover:-translate-y-0.5">
      {/* A card's frame without its padding, so the four cells meet at the middle. */}
      <div className="grid h-full grid-cols-2 grid-rows-2 overflow-hidden rounded-3xl border border-line/70 bg-surface">
        {stats.map((s, i) => (
          <div key={s.label} className={cx('flex flex-col justify-center px-5 py-3.5', i % 2 === 0 && 'border-r border-line', i < 2 && 'border-b border-line')}>
            <p className="flex items-center gap-1.5 font-serif text-[24px] leading-none font-semibold tabular-nums">
              {s.icon && <Flame size={18} className="text-accent-text" aria-hidden />}
              {s.value}
            </p>
            <p className="mt-1 text-[12.5px] font-semibold text-ink-soft">{s.label}</p>
          </div>
        ))}
      </div>
    </Link>
  );
}
