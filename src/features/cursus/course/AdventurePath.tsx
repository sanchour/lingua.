import { UiText, useUi } from '@/design/i18n/UiText';
// Cursus › Course as an adventure (the user, 2026-10-25: "like HelloChinese and Duolingo"): one
// winding trail of round lessons, unit by unit, a line that fills as you go, a banner opening each
// unit and a trophy closing it, the levels as landmarks, and the next lesson bouncing where you are.
// Units ahead look locked; a click offers the unit check to jump there.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CalendarDays, Check, Coffee, Flag, Hand, HeartPulse, House, Lock, MapPin, MessageCircle, Mountain, ShoppingBag, Sun, Tent, Trophy, User, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { LESSONS, OUTLINE } from '@/core/course/outline';
import type { CourseLevel, LessonId, UnitId, UnitOutline } from '@/core/course/outline';
import type { NextLesson } from '@/data/course';
import type { CourseProgressRow } from '@/data/types';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { LESSON_ICON, lessonPath } from './parts';

/** Each unit's colour and picture: its stretch of the trail, its banner and its nodes. */
export const UNIT_LOOK: Record<UnitId, { hue: string; icon: LucideIcon }> = {
  hello: { hue: '#c86d51', icon: Hand },
  me: { hue: '#d49b54', icon: User },
  family: { hue: '#c4707f', icon: Users },
  cafe: { hue: '#a07858', icon: Coffee },
  day: { hue: '#5f87a8', icon: Sun },
  town: { hue: '#4f93a0', icon: MapPin },
  shopping: { hue: '#c98a4b', icon: ShoppingBag },
  home: { hue: '#9a8466', icon: House },
  weekend: { hue: '#6f9a5a', icon: Tent },
  health: { hue: '#cf6a6a', icon: HeartPulse },
  plans: { hue: '#8a7fb0', icon: CalendarDays },
  opinions: { hue: '#5e6fa8', icon: MessageCircle },
};

const LEVEL_NAME: Record<CourseLevel, string> = { A1: 'Beginner', A2: 'Elementary', B1: 'Intermediate' };

/** The trail swings left and right, like a path up a hill. */
const SWING = [0, 52, 84, 52, 0, -52, -84, -52];
const ROW = 104;
const WIDTH = 420;
const NODE = 72;

type State = 'done' | 'next' | 'open' | 'locked';

interface Stop {
  unit: UnitOutline;
  lesson: LessonId;
  state: State;
  /** Where on the trail: its place in the whole course, for the swing. */
  at: number;
}

/** A darker edge under each node, as if it could be pressed. */
const edge = (hue: string, amount = 28) => `color-mix(in oklab, ${hue} ${100 - amount}%, black)`;

export function AdventurePath({ progress, lessonsOf, next }: { progress: Map<string, CourseProgressRow>; lessonsOf: (unit: UnitId) => LessonId[]; next: NextLesson | null }) {
  const translateUi = useUi();
  const nextUnit = next ? OUTLINE.findIndex((u) => u.id === next.unit) : OUTLINE.length;
  const [open, setOpen] = useState<string | null>(null);
  const here = useRef<HTMLDivElement>(null);

  // Start where you are on the trail.
  useLayoutEffect(() => {
    here.current?.scrollIntoView({ block: 'center' });
  }, []);

  // A click anywhere else closes the lesson card; so does Escape.
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !(e.target as Element).closest?.('[data-stop]')) setOpen(null);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  let at = 0;
  return (
    <div className="mx-auto pb-16" style={{ maxWidth: WIDTH + 160 }}>
      {OUTLINE.map((unit, index) => {
        const row = progress.get(unit.id);
        const lessons = lessonsOf(unit.id);
        const stops: Stop[] = lessons.map((lesson) => ({
          unit,
          lesson,
          at: at++,
          state: row?.lessons[lesson] || row?.doneAt ? 'done' : next?.unit === unit.id && next.lesson === lesson ? 'next' : index <= nextUnit ? 'open' : 'locked',
        }));
        const firstOfLevel = OUTLINE.findIndex((u) => u.level === unit.level) === index;
        return (
          <section key={unit.id} aria-label={translateUi('Unit {0}: {1}', [index + 1, unit.title])}>
            {firstOfLevel && <Landmark level={unit.level} reached={index <= nextUnit} first={index === 0} />}
            <UnitBanner unit={unit} number={index + 1} done={lessons.filter((l) => row?.lessons[l]).length} of={lessons.length} complete={Boolean(row?.doneAt)} locked={index > nextUnit} />
            <Trail stops={stops} open={open} setOpen={setOpen} here={here} />
          </section>
        );
      })}
      <Landmark level={null} reached={!next} first={false} />
    </div>
  );
}

/** A level reached along the way: A1 at the start, then A2 and B1, and the summit at the end. */
function Landmark({ level, reached, first }: { level: CourseLevel | null; reached: boolean; first: boolean }) {
  const translateUi = useUi();
  const Icon = level ? (first ? Flag : Mountain) : Trophy;
  return (
    <div className={cx('flex flex-col items-center text-center', first ? 'mb-6' : 'my-10')}>
      <span
        className={cx('grid size-14 place-items-center rounded-2xl', reached ? 'bg-accent text-on-accent shadow-elev-1' : 'bg-sunken text-ink-faint')}
        style={reached ? { boxShadow: `0 5px 0 ${edge('var(--accent)')}` } : undefined}
        aria-hidden
      >
        <Icon size={26} />
      </span>
      <p className="mt-3 font-serif text-xl font-semibold">{level ? `${level} · ${LEVEL_NAME[level]}` : translateUi('The summit: B1 reached')}</p>
      <p className="mt-0.5 text-[13px] text-ink-faint">
        {level ? (first ? translateUi('Your adventure starts here.') : reached ? translateUi('You’ve reached this part of the trail.') : translateUi('Further up the trail.')) : reached ? translateUi('Every unit done. Well walked.') : translateUi('At the end of the trail.')}
      </p>
    </div>
  );
}

function UnitBanner({ unit, number, done, of, complete, locked }: { unit: UnitOutline; number: number; done: number; of: number; complete: boolean; locked: boolean }) {

  const { hue, icon: Icon } = UNIT_LOOK[unit.id];
  const ink = locked ? undefined : '#fffaf2';
  return (
    <div
      className={cx('relative mx-auto flex items-center gap-4 overflow-hidden rounded-3xl px-5 py-4', locked ? 'bg-sunken text-ink-soft' : '')}
      style={locked ? undefined : { background: edge(hue, 12), color: ink, boxShadow: `0 6px 0 ${edge(hue, 40)}` }}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] font-bold tracking-[0.14em] uppercase opacity-85"><UiText source={'Unit {0} · {1}{2}'} values={[number, unit.level, complete ? ' · done' : locked ? '' : ` · ${done} of ${of}`]} /></p>
        <h2 className="mt-0.5 font-serif text-[21px] leading-tight font-semibold">{unit.title}</h2>
        <p className="mt-1 text-[13px] leading-snug opacity-85">{unit.canDo.join(' · ')}</p>
      </div>
      <span className={cx('grid size-14 shrink-0 place-items-center rounded-2xl', locked ? 'bg-bg text-ink-faint' : 'bg-white/18')} aria-hidden>
        {complete ? <Check size={28} strokeWidth={3} /> : locked ? <Lock size={24} /> : <Icon size={28} />}
      </span>
      {!locked && !complete && (
        <span className="absolute inset-x-0 bottom-0 h-1 bg-black/15">
          <span className="block h-full origin-left bg-white/70" style={{ transform: `scaleX(${done / of})` }} />
        </span>
      )}
    </div>
  );
}

/** One unit's stretch: the line behind (dotted ahead, filled where you've been) and its stops. */
function Trail({ stops, open, setOpen, here }: { stops: Stop[]; open: string | null; setOpen: (id: string | null) => void; here: React.RefObject<HTMLDivElement | null> }) {
  const { hue, icon: UnitIcon } = UNIT_LOOK[stops[0].unit.id];
  const points = stops.map((s, i) => ({ x: WIDTH / 2 + SWING[s.at % SWING.length], y: ROW * i + ROW / 2 + 24 }));
  const height = ROW * stops.length + 48;
  const line = points.map((p, i) => (i ? `C ${points[i - 1].x} ${points[i - 1].y + ROW / 2}, ${p.x} ${p.y - ROW / 2}, ${p.x} ${p.y}` : `M ${p.x} ${p.y}`)).join(' ');
  const reached = stops.reduce((n, s, i) => (s.state === 'done' || s.state === 'next' ? i : n), -1);
  const walked = reached > 0 ? points.slice(0, reached + 1).map((p, i, all) => (i ? `C ${all[i - 1].x} ${all[i - 1].y + ROW / 2}, ${p.x} ${p.y - ROW / 2}, ${p.x} ${p.y}` : `M ${p.x} ${p.y}`)).join(' ') : '';
  // The unit's picture sits beside the trail where it swings away, halfway down.
  const middle = points[Math.floor(points.length / 2)];
  const side = middle.x >= WIDTH / 2 ? -1 : 1;
  return (
    <div className="relative mx-auto" style={{ width: WIDTH, height }}>
      <svg className="pointer-events-none absolute inset-0" width={WIDTH} height={height} aria-hidden>
        <path d={line} fill="none" stroke="var(--line-strong)" strokeWidth={6} strokeLinecap="round" strokeDasharray="1 14" />
        {walked && <path d={walked} fill="none" stroke={hue} strokeOpacity={0.55} strokeWidth={8} strokeLinecap="round" />}
      </svg>
      <span
        className="pointer-events-none absolute grid size-24 place-items-center rounded-full"
        style={{ left: middle.x + side * 150 - 48, top: middle.y - 48, background: `color-mix(in oklab, ${hue} 14%, transparent)`, color: `color-mix(in oklab, ${hue} 70%, var(--ink))` }}
        aria-hidden
      >
        <UnitIcon size={40} strokeWidth={1.6} />
      </span>
      {stops.map((s, i) => (
        <StopNode key={s.lesson} stop={s} x={points[i].x} y={points[i].y} open={open === `${s.unit.id}:${s.lesson}`} onToggle={() => setOpen(open === `${s.unit.id}:${s.lesson}` ? null : `${s.unit.id}:${s.lesson}`)} here={s.state === 'next' ? here : undefined} />
      ))}
    </div>
  );
}

function StopNode({ stop, x, y, open, onToggle, here }: { stop: Stop; x: number; y: number; open: boolean; onToggle: () => void; here?: React.RefObject<HTMLDivElement | null> }) {
  const translateUi = useUi();
  const reduce = useReducedMotion();
  const { hue } = UNIT_LOOK[stop.unit.id];
  const check = stop.lesson === 'check';
  const Icon = stop.state === 'locked' ? Lock : stop.state === 'done' && !check ? Check : check ? Trophy : LESSON_ICON[stop.lesson];
  const size = stop.state === 'next' ? NODE + 10 : check ? NODE + 4 : NODE;
  const lit = stop.state === 'done' || stop.state === 'next';
  const face: CSSProperties = lit
    ? { background: check && stop.state === 'done' ? '#d4a33c' : hue, color: '#fffaf2', ['--edge' as string]: edge(check && stop.state === 'done' ? '#d4a33c' : hue) }
    : stop.state === 'open'
      ? { background: `color-mix(in oklab, ${hue} 22%, var(--raised))`, color: edge(hue, 20), ['--edge' as string]: `color-mix(in oklab, ${hue} 40%, var(--line-strong))` }
      : { background: 'var(--sunken)', color: 'var(--ink-faint)', ['--edge' as string]: 'var(--line-strong)' };
  const label = `${LESSONS[stop.lesson].title}${stop.state === 'done' ? ', done' : stop.state === 'next' ? ', next' : stop.state === 'locked' ? ', locked' : ''}`;
  return (
    <div ref={here} data-stop className="absolute" style={{ left: x - size / 2, top: y - size / 2, width: size, height: size, zIndex: open ? 20 : 1 }}>
      {stop.state === 'next' && (
        <motion.span
          className="pointer-events-none absolute left-1/2 z-10 rounded-xl border-2 bg-raised px-3 py-1 text-[12.5px] font-extrabold tracking-[0.08em] whitespace-nowrap uppercase"
          style={{ top: -46, x: '-50%', borderColor: 'var(--line)', color: edge(hue, 20) }}
          animate={reduce ? undefined : { y: [0, -6, 0] }}
          transition={reduce ? undefined : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          {stop.at === 0 ? translateUi('Start') : translateUi('Continue')}
        </motion.span>
      )}
      {stop.state === 'next' && <span className="pointer-events-none absolute -inset-2.5 rounded-full border-4" style={{ borderColor: `color-mix(in oklab, ${hue} 35%, transparent)` }} aria-hidden />}
      <button
        type="button"
        onClick={onToggle}
        aria-label={label}
        aria-expanded={open}
        title={LESSONS[stop.lesson].title}
        className={cx(
          'grid size-full place-items-center rounded-full transition-[transform,box-shadow,filter] duration-100 ease-out',
          '[box-shadow:0_7px_0_var(--edge)] hover:brightness-105 active:translate-y-[5px] active:[box-shadow:0_2px_0_var(--edge)]',
          check && 'rounded-[28%]',
        )}
        style={face}
      >
        <Icon size={stop.state === 'next' ? 32 : 28} strokeWidth={stop.state === 'done' && !check ? 3.2 : 2.2} aria-hidden />
      </button>
      <AnimatePresence>{open && <StopCard stop={stop} />}</AnimatePresence>
    </div>
  );
}

/** What a click on a stop says: the lesson, and the way in (or why not yet, and the jump). */
function StopCard({ stop }: { stop: Stop }) {
  const translateUi = useUi();
  const { hue } = UNIT_LOOK[stop.unit.id];
  const lesson = LESSONS[stop.lesson];
  const locked = stop.state === 'locked';
  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.97 }}
      transition={spring.snappy}
      className="absolute top-[calc(100%+18px)] w-64 rounded-2xl border border-line bg-raised p-4 shadow-elev-2"
      style={{ x: '-50%', left: '50%' }}
    >
      <p className="text-[11.5px] font-bold tracking-[0.12em] uppercase" style={{ color: locked ? 'var(--ink-faint)' : edge(hue, 20) }}>
        {stop.unit.short} · {lesson.title}
      </p>
      <p className="mt-1 text-[14px] leading-snug font-semibold">{locked ? translateUi('Further along the trail') : `${lesson.aim}.`}</p>
      {locked ? (
        <>
          <p className="mt-1 text-[13px] text-ink-soft"><UiText source={'Finish the units before this one, or show you know them already.'} /></p>
          <Link to={lessonPath(stop.unit.id, 'check')} className="mt-3 flex h-10 items-center justify-center gap-1.5 rounded-xl border-2 border-line text-[13.5px] font-bold hover:bg-sunken"><UiText source={'{0} Jump here: take the unit check'} values={[<Flag size={14} aria-hidden />]} /></Link>
        </>
      ) : (
        <Link
          to={lessonPath(stop.unit.id, stop.lesson)}
          className="mt-3 flex h-10 items-center justify-center rounded-xl text-[14px] font-extrabold tracking-[0.04em] uppercase transition-transform active:translate-y-[3px]"
          style={{ background: hue, color: '#fffaf2', boxShadow: `0 4px 0 ${edge(hue)}` }}
        >
          {stop.state === 'done' ? translateUi('Practise again') : stop.state === 'next' ? (stop.at === 0 ? translateUi('Start') : translateUi('Continue')) : translateUi('Start')}
        </Link>
      )}
    </motion.div>
  );
}
