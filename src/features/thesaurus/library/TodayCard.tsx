import { Link } from 'react-router';
import { Layers, Puzzle, TextCursorInput, Zap } from 'lucide-react';
import type { DeckCounts } from '@/data/decks';
import { useToday } from '@/data/stats';
import { buttonClasses, Card, Popover } from '@/design/primitives';
import { PlusChip } from '@/features/plans/Locked';
import { useGate } from '@/features/plans/PlanRoute';
import { cx } from '@/lib/cx';
import { CARD_STATES, REVIEW } from './states';

/** Ludus's ways to play, from every deck. */
const LUDUS_PLAYS = [
  { to: '/thesaurus/study/all?mode=ludus', icon: Puzzle, title: 'A lesson', detail: 'Games with your cards: choose, match, build, listen, type' },
  { to: '/thesaurus/study/all?mode=ludus&lightning=1', icon: Zap, title: 'Lightning round', detail: 'As many as you can in a minute' },
  { to: '/thesaurus/study/all?mode=ludus&kind=sentences', icon: TextCursorInput, title: 'Sentences with a gap', detail: 'Real sentences with one word missing, your words first' },
];

const DAY = 86_400_000;

interface TodayCardProps {
  lang: string;
  /** Today's work summed over every deck. */
  totals: DeckCounts | undefined;
  forecast?: number[];
  /** In the sticky rail beside My decks (wide windows): stacked; otherwise one row. */
  rail?: boolean;
}

/**
 * What's waiting today across every deck (5.1-3b): a ring split into new, learning and to review,
 * one big Study with Ludus beside it, and the week ahead as a small bar line.
 */
export function TodayCard({ lang, totals, forecast, rail = false }: TodayCardProps) {
  const activity = useToday(lang);
  const ludusGate = useGate('ludus');
  if (!totals) return <Card className={rail ? 'h-[380px]' : 'h-[132px]'} />;

  const waiting = totals.new + totals.learning + totals.due;
  const done = activity?.reviews ?? 0;
  const ahead = forecast?.some(Boolean) ? forecast : undefined;
  const ludusClass = cx(buttonClasses(waiting > 0 ? 'secondary' : 'primary', rail ? 'lg' : 'md'), rail && waiting === 0 && 'flex-1');

  return (
    <Card className="p-5 sm:p-6">
      <p className="text-[12px] font-bold tracking-[0.12em] text-sage-text uppercase">Today</p>
      <div className={cx('mt-3 flex gap-5', rail ? 'flex-col' : 'flex-col sm:flex-row sm:items-center')}>
        <div className="flex min-w-0 flex-1 items-center gap-5">
          <Ring totals={totals} waiting={waiting} />
          <ul className="min-w-0 space-y-1.5 text-[13.5px]">
            {waiting === 0 ? (
              <li className="font-serif text-lg leading-tight font-semibold">All caught up</li>
            ) : (
              CARD_STATES.map((s) => (
                <li key={s.key} className={cx('flex items-center gap-2', !totals[s.key] && 'opacity-45')}>
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden />
                  <span className="font-bold tabular-nums">{totals[s.key].toLocaleString()}</span>
                  <span className="text-ink-soft">{s.label}</span>
                </li>
              ))
            )}
            {done > 0 ? <li className="pt-0.5 text-[12.5px] text-ink-faint">{done.toLocaleString()} done today</li> : waiting === 0 && <li className="text-[12.5px] text-ink-soft">Nothing is due. Practise freely with Ludus.</li>}
          </ul>
        </div>
        <div className="flex gap-2">
          {waiting > 0 && (
            <Link to="/thesaurus/study/all?mode=recall" className={cx(buttonClasses('primary', rail ? 'lg' : 'md'), rail && 'flex-1')}>
              <Layers size={18} aria-hidden />
              Study
            </Link>
          )}
          {ludusGate ? (
            <button type="button" onClick={ludusGate} className={ludusClass}>
              <Puzzle size={17} aria-hidden />
              Ludus
              <PlusChip feature="ludus" />
            </button>
          ) : (
            <Popover
              label="Ludus"
              placement="bottom-end"
              trigger={(props) => (
                <button type="button" {...props} className={ludusClass}>
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
        </div>
      </div>
      {ahead && <WeekAhead forecast={ahead} />}
    </Card>
  );
}

/** Today's work as a ring in three colours, the count in the middle; a full sage ring once it's all done. */
function Ring({ totals, waiting }: { totals: DeckCounts; waiting: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const parts = CARD_STATES.map((s) => ({ ...s, n: totals[s.key] })).filter((p) => p.n > 0);
  const gap = parts.length > 1 ? 3 : 0;
  let start = 0;
  return (
    <span className="relative grid size-[104px] shrink-0 place-items-center">
      <svg viewBox="0 0 104 104" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="52" cy="52" r={r} fill="none" stroke={waiting ? 'var(--line)' : 'var(--sage)'} strokeWidth="9" />
        {parts.map((p) => {
          const len = (c * p.n) / waiting;
          const arc = <circle key={p.key} cx="52" cy="52" r={r} fill="none" stroke={p.color} strokeWidth="9" strokeDasharray={`${Math.max(0.5, len - gap)} ${c}`} strokeDashoffset={-start} className="transition-[stroke-dasharray,stroke-dashoffset] duration-700 ease-out" />;
          start += len;
          return arc;
        })}
      </svg>
      <span className="text-center">
        <span className="block font-serif text-[26px] leading-none font-semibold tabular-nums">{waiting === 0 ? '✓' : waiting.toLocaleString()}</span>
        <span className="mt-1 block text-[11px] font-bold tracking-[0.08em] text-ink-faint uppercase">{waiting === 0 ? 'done' : 'to do'}</span>
      </span>
    </span>
  );
}

/** Seven slim bars: reviews coming due on each of the next days. */
function WeekAhead({ forecast }: { forecast: number[] }) {
  const peak = Math.max(1, ...forecast);
  const total = forecast.reduce((a, b) => a + b, 0);
  const day = (i: number) => (i === 0 ? 'Tmrw' : new Date(Date.now() + (i + 1) * DAY).toLocaleDateString('en', { weekday: 'short' }));
  return (
    <div className="mt-5 border-t border-line pt-4">
      <p className="mb-2 flex items-baseline justify-between text-[11.5px] font-bold tracking-[0.1em] text-ink-faint uppercase">
        Week ahead
        <span className="font-semibold tracking-normal normal-case tabular-nums">
          {total.toLocaleString()} {total === 1 ? 'review' : 'reviews'}
        </span>
      </p>
      <div className="flex h-12 items-end gap-1.5" role="img" aria-label={forecast.map((n, i) => `${day(i)} ${n}`).join(', ')}>
        {forecast.map((n, i) => (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${day(i)}: ${n} ${n === 1 ? 'review' : 'reviews'}`}>
            <span className="w-full max-w-7 rounded-[4px]" style={{ height: `${Math.max(n ? 4 : 2, (n / peak) * 30)}px`, opacity: n ? 0.75 : 0.3, background: REVIEW }} />
            <span className="text-[10.5px] font-semibold text-ink-faint">{day(i)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
