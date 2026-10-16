import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/design/primitives';
import { spring } from '@/design/motion';

export interface SummaryStats {
  cards: number;
  /** 0–1, answers without a miss. */
  accuracy: number;
  ms: number;
}

const minutes = (ms: number) => (ms < 60_000 ? `${Math.max(1, Math.round(ms / 1000))} s` : `${Math.round(ms / 60_000)} min`);

/** The end of a session: what was done, kindly, and where to go next. */
export function Summary({ title, stats, onAgain, againLabel, onDone }: { title: string; stats: SummaryStats; onAgain?: () => void; againLabel?: string; onDone: () => void }) {
  return (
    <motion.div className="mx-auto flex max-w-md flex-col items-center px-6 text-center" initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={spring.gentle}>
      <motion.span
        className="mb-6 grid size-20 place-items-center rounded-full bg-sage-soft text-sage-text"
        initial={{ scale: 0.6, rotate: -12 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ ...spring.gentle, delay: 0.08 }}
      >
        <Sparkles size={34} aria-hidden />
      </motion.span>
      <h1 className="font-serif text-3xl font-semibold">{title}</h1>
      <dl className="mt-8 grid w-full grid-cols-3 gap-3">
        {[
          ['Cards', String(stats.cards)],
          ['Recalled', `${Math.round(stats.accuracy * 100)}%`],
          ['Time', minutes(stats.ms)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-surface px-3 py-4">
            <dd className="font-serif text-2xl font-semibold tabular-nums">{value}</dd>
            <dt className="mt-0.5 text-[12px] font-bold tracking-wide text-ink-faint uppercase">{label}</dt>
          </div>
        ))}
      </dl>
      {/* Always stacked: the next step first, a quiet way out beneath it. */}
      <div className="mt-8 flex w-full flex-col gap-2">
        {onAgain && (
          <Button size="lg" block onClick={onAgain}>
            {againLabel ?? 'Another round'}
          </Button>
        )}
        <Button size="lg" variant={onAgain ? 'ghost' : 'primary'} block onClick={onDone}>
          Done
        </Button>
      </div>
    </motion.div>
  );
}
