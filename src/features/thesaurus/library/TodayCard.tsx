import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Layers, Puzzle, Sparkles, TextCursorInput, Zap } from 'lucide-react';
import { useToday } from '@/data/stats';
import { useDueSummary } from '@/data/study';
import { buttonClasses, Card, Popover } from '@/design/primitives';
import { PlusChip } from '@/features/plans/Locked';
import { useGate } from '@/features/plans/PlanRoute';

/** Ludus's ways to play, from every deck. */
const LUDUS_PLAYS = [
  { to: '/thesaurus/study/all?mode=ludus', icon: Puzzle, title: 'A lesson', detail: 'Games with your cards: choose, match, build, listen, type' },
  { to: '/thesaurus/study/all?mode=ludus&lightning=1', icon: Zap, title: 'Lightning round', detail: 'As many as you can in a minute' },
  { to: '/thesaurus/study/all?mode=ludus&kind=sentences', icon: TextCursorInput, title: 'Sentences with a gap', detail: 'Real sentences with one word missing, your words first' },
];

const DAY = 86_400_000;

/**
 * What's waiting today across every deck: a ring that fills as the day's work gets done,
 * the two ways to study it, and a quiet strip with the week ahead.
 */
export function TodayCard({ lang, hasDecks, forecast, onDiscover }: { lang: string; hasDecks: boolean; forecast?: number[]; onDiscover: () => void }) {
  const today = useDueSummary(lang);
  const activity = useToday(lang);
  const ludusGate = useGate('ludus');
  if (!today) return <Card className="h-[132px]" />;

  if (!hasDecks) {
    return (
      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sage-soft text-sage-text">
          <Sparkles size={22} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-serif text-lg font-semibold">Your treasury is empty, for now</p>
          <p className="text-sm text-ink-soft">Start with a ready-made deck, make your own, or mark words as Learning while you read.</p>
        </div>
        <button type="button" onClick={onDiscover} className={buttonClasses('secondary', 'md')}>
          Browse ready-made decks
        </button>
      </Card>
    );
  }

  const waiting = today.due + today.fresh;
  const done = activity?.reviews ?? 0;
  const share = done + waiting > 0 ? done / (done + waiting) : 1;
  const ahead = forecast?.some(Boolean) ? forecast : undefined;

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Ring value={share} label={waiting === 0 ? '✓' : waiting.toLocaleString()} />
          <div className="min-w-0">
            <p className="text-[12px] font-bold tracking-[0.12em] text-sage-text uppercase">Today</p>
            <p className="font-serif text-xl leading-tight font-semibold">{waiting === 0 ? 'All caught up' : waiting === 1 ? '1 card waiting' : `${waiting.toLocaleString()} cards waiting`}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-ink-soft">
              {today.due > 0 && <Dot tone="accent">{today.due.toLocaleString()} to review</Dot>}
              {today.fresh > 0 && <Dot tone="sage">{today.fresh.toLocaleString()} new</Dot>}
              {done > 0 && <span>{done.toLocaleString()} done today</span>}
              {waiting === 0 && done === 0 && <span>Nothing is due. Practise freely with Ludus.</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {ludusGate ? (
            <button type="button" onClick={ludusGate} className={buttonClasses(waiting > 0 ? 'secondary' : 'primary', 'md')}>
              <Puzzle size={17} aria-hidden />
              Ludus
              <PlusChip feature="ludus" />
            </button>
          ) : (
            <Popover
              label="Ludus"
              placement="bottom-end"
              trigger={(props) => (
                <button type="button" {...props} className={buttonClasses(waiting > 0 ? 'secondary' : 'primary', 'md')}>
                  <Puzzle size={17} aria-hidden />
                  Ludus
                </button>
              )}
            >
              {(close) => (
                <div className="w-72 p-1.5">
                  {LUDUS_PLAYS.map((play) => (
                    <Link key={play.to} to={play.to} onClick={close} className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface">
                      <play.icon size={17} aria-hidden className="mt-0.5 shrink-0 text-ink-soft" />
                      <span>
                        <span className="block text-[14px] font-semibold">{play.title}</span>
                        <span className="block text-[12.5px] leading-snug text-ink-soft">{play.detail}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </Popover>
          )}
          {waiting > 0 && (
            <Link to="/thesaurus/study/all?mode=recall" className={buttonClasses('primary', 'md')}>
              <Layers size={17} aria-hidden />
              Review
            </Link>
          )}
        </div>
      </div>
      {ahead && <WeekAhead forecast={ahead} />}
    </Card>
  );
}

function Dot({ tone, children }: { tone: 'accent' | 'sage'; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={tone === 'accent' ? 'size-2 rounded-full bg-accent' : 'size-2 rounded-full bg-sage'} aria-hidden />
      {children}
    </span>
  );
}

/** Today's progress: the arc is the share of today's cards already done. */
function Ring({ value, label }: { value: number; label: string }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative grid size-[68px] shrink-0 place-items-center">
      <svg viewBox="0 0 68 68" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="34" cy="34" r={r} fill="none" stroke="var(--line)" strokeWidth="5" />
        {value > 0 && (
          <circle
            cx="34"
            cy="34"
            r={r}
            fill="none"
            stroke="var(--sage)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${c * Math.min(1, value)} ${c}`}
            className="transition-[stroke-dasharray] duration-700 ease-out"
          />
        )}
      </svg>
      <span className="font-serif text-[22px] leading-none font-semibold tabular-nums">{label}</span>
    </span>
  );
}

/** Seven slim bars: reviews coming due on each of the next days. */
function WeekAhead({ forecast }: { forecast: number[] }) {
  const peak = Math.max(1, ...forecast);
  const day = (i: number) => (i === 0 ? 'Tmrw' : new Date(Date.now() + (i + 1) * DAY).toLocaleDateString('en', { weekday: 'short' }));
  return (
    <div className="mt-5 flex items-end gap-4 border-t border-line pt-4">
      <p className="shrink-0 pb-0.5 text-[11.5px] font-bold tracking-[0.1em] text-ink-faint uppercase">Week ahead</p>
      <div className="flex h-10 flex-1 items-end gap-1.5 sm:gap-2.5" role="img" aria-label={forecast.map((n, i) => `${day(i)} ${n}`).join(', ')}>
        {forecast.map((n, i) => (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${day(i)}: ${n} ${n === 1 ? 'review' : 'reviews'}`}>
            <span className="w-full max-w-7 rounded-[4px] bg-sage/60" style={{ height: `${Math.max(n ? 4 : 2, (n / peak) * 24)}px`, opacity: n ? 1 : 0.35 }} />
            <span className="text-[10.5px] font-semibold text-ink-faint">{day(i)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
