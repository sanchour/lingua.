import { useEffect, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { Check, Flag } from 'lucide-react';
import { frequencyBand, JOURNEY_STAGES } from '@/core/lang/starter';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';

/** A stop counts as reached once this share of its words is known. */
const REACHED = 0.8;
const STEP = 132;
const HEIGHT = 196;
const PAD = 70;

interface JourneyProps {
  milestones: readonly number[];
  progress: Map<number, number> | undefined;
  added: (milestone: number) => boolean;
  onOpen: (milestone: number) => void;
}

/**
 * The most common words as a road: each stop is the next band of words, the trail fills in as
 * they become known, and a flag marks where you are now.
 */
export function VocabularyJourney({ milestones, progress, added, onOpen }: JourneyProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const width = PAD * 2 + STEP * (milestones.length - 1);
  const points = milestones.map((_, i) => ({ x: PAD + i * STEP, y: i % 2 ? HEIGHT * 0.66 : HEIGHT * 0.3 }));

  // Smooth curve through the stops.
  const path = points.reduce((d, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const mid = (prev.x + p.x) / 2;
    return `${d} C ${mid} ${prev.y}, ${mid} ${p.y}, ${p.x} ${p.y}`;
  }, '');

  // Where you are: the first stop not yet reached (the trail is drawn up to it, part-way by progress).
  const here = Math.max(0, milestones.findIndex((m) => (progress?.get(m) ?? 0) < REACHED));
  const allDone = progress !== undefined && milestones.every((m) => (progress.get(m) ?? 0) >= REACHED);
  const hereIndex = allDone ? milestones.length - 1 : here;
  const share = progress?.get(milestones[hereIndex]) ?? 0;
  const trailX = allDone ? width : points[Math.max(0, hereIndex - 1)].x + (hereIndex === 0 ? 0 : STEP * Math.min(1, share / REACHED));

  // About how many of the most common words you know, counted band by band.
  const knownWords = useMemo(
    () =>
      milestones.reduce((sum, m) => {
        const [from, to] = frequencyBand(m);
        return sum + Math.round((progress?.get(m) ?? 0) * (to - from + 1));
      }, 0),
    [milestones, progress],
  );
  const next = milestones[hereIndex];

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || progress === undefined) return;
    el.scrollTo({ left: Math.max(0, points[hereIndex].x - el.clientWidth / 2), behavior: 'auto' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress === undefined, hereIndex]);

  return (
    <div>
      <p className="mb-1 max-w-xl text-[15px] leading-relaxed text-ink-soft">
        {progress === undefined ? (
          ' '
        ) : allDone ? (
          <>You know the 10,000 most common words. The whole road is yours.</>
        ) : (
          <>
            You know about <span className="font-semibold text-ink">{knownWords.toLocaleString('en')}</span> of the {milestones.at(-1)!.toLocaleString('en')} most common words. Next stop:{' '}
            <span className="font-semibold text-ink">{JOURNEY_STAGES[next]?.name}</span>, to {JOURNEY_STAGES[next]?.lets}.
          </>
        )}
      </p>

      <div ref={scrollRef} className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <div className="relative" style={{ width, height: HEIGHT + 40 }}>
          <svg width={width} height={HEIGHT} className="absolute inset-x-0 top-0" aria-hidden>
            <defs>
              <clipPath id="journey-walked">
                <motion.rect
                  x={0}
                  y={0}
                  width={width}
                  height={HEIGHT}
                  style={{ originX: 0, transformBox: 'fill-box' }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: trailX / width }}
                  transition={{ ...spring.gentle, delay: 0.2 }}
                />
              </clipPath>
            </defs>
            <path d={path} fill="none" stroke="var(--line-strong)" strokeWidth={3} strokeDasharray="2 9" strokeLinecap="round" />
            <path d={path} fill="none" stroke="var(--sage)" strokeWidth={5} strokeLinecap="round" clipPath="url(#journey-walked)" />
          </svg>

          {milestones.map((m, i) => {
            const p = points[i];
            const value = progress?.get(m) ?? 0;
            const reached = value >= REACHED;
            const isHere = i === hereIndex && !allDone;
            const stage = JOURNEY_STAGES[m];
            return (
              <div key={m} className="absolute" style={{ left: p.x, top: p.y, transform: 'translate(-50%, -50%)' }}>
                {isHere && (
                  <motion.span
                    className="pointer-events-none absolute -top-11 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-accent-fill px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-on-accent shadow-elev-2"
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Flag size={11} aria-hidden /> You are here
                  </motion.span>
                )}
                <button
                  type="button"
                  onClick={() => onOpen(m)}
                  className="no-callout group flex flex-col items-center gap-1.5 transition-transform duration-150 active:scale-95"
                  aria-label={`${stage?.name ?? `Top ${m}`}: top ${m.toLocaleString('en')} words, ${Math.round(value * 100)}% known${added(m) ? ', added' : ''}`}
                >
                  <Stop label={m >= 1000 ? `${m / 1000}k` : String(m)} value={value} reached={reached} here={isHere} added={added(m)} />
                  <span className="text-center leading-tight">
                    <span className={cx('block text-[12.5px] font-semibold whitespace-nowrap', reached ? 'text-sage-text' : isHere ? 'text-ink' : 'text-ink-soft group-hover:text-ink')}>{stage?.name}</span>
                    <span className="block text-[11px] font-semibold text-ink-faint tabular-nums">{Math.round(value * 100)}% known</span>
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** One stop: a round stamp with a ring for how much of the band is known. */
function Stop({ label, value, reached, here, added }: { label: string; value: number; reached: boolean; here: boolean; added: boolean }) {
  const r = 29;
  const c = 2 * Math.PI * r;
  return (
    <span
      className={cx(
        'relative grid size-[68px] place-items-center rounded-full shadow-elev-1 transition-transform duration-200 group-hover:-translate-y-0.5',
        reached ? 'bg-[color-mix(in_oklab,var(--sage)_16%,var(--raised))]' : 'bg-raised',
        here && 'ring-4 ring-accent/25',
      )}
    >
      <svg viewBox="0 0 68 68" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="34" cy="34" r={r} fill="none" stroke="var(--line)" strokeWidth="4" />
        {value > 0 && <circle cx="34" cy="34" r={r} fill="none" stroke="var(--sage)" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${c * Math.min(1, value)} ${c}`} />}
      </svg>
      <span className={cx('font-serif text-[18px] font-semibold tabular-nums', reached && 'text-sage-text')}>{label}</span>
      {added && (
        <span className="absolute -right-0.5 -bottom-0.5 grid size-5 place-items-center rounded-full bg-sage text-bg" title="Added">
          <Check size={12} strokeWidth={3} aria-hidden />
        </span>
      )}
    </span>
  );
}
