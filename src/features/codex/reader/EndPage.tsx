import { motion } from 'motion/react';
import { Button } from '@/design/primitives';
import { spring } from '@/design/motion';
import type { CheckItem } from '@/core/text/checks';
import { OwnWordsFold } from '@/features/production/OwnWords';
import { CheckYourself } from './CheckYourself';
import { GoalRing } from './readingGoal';
import type { SessionStats } from './useReadingSession';

interface EndPageProps {
  lang: string;
  /** The text's id, for Ratio. */
  refId: string;
  title: string;
  author?: string;
  stats: SessionStats;
  /** Today's reading, this sitting included, and the daily goal (minutes). */
  todayMs: number;
  goal: number;
  finished: boolean;
  /** "Check yourself": none when the text is too short to ask about; `source` is the text for the AI's story questions. */
  checks: CheckItem[];
  source: string;
  onFinish: () => void;
  onKeepReading: () => void;
}

const duration = (ms: number) => {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return { value: String(Math.max(1, Math.round(ms / 1000))), unit: 'seconds' };
  if (minutes < 60) return { value: String(minutes), unit: minutes === 1 ? 'minute' : 'minutes' };
  return { value: `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`, unit: 'hours' };
};

/** After the last page of a book or a text: a quiet page with what this sitting came to. */
export function EndPage({ lang, refId, title, author, stats, todayMs, goal, finished, checks, source, onFinish, onKeepReading }: EndPageProps) {
  const time = duration(stats.activeMs);
  const numbers = [
    { value: time.value, label: time.unit === 'hours' ? 'hours read' : `${time.unit} read` },
    stats.pages > 0 ? { value: stats.pages.toLocaleString(), label: stats.pages === 1 ? 'page' : 'pages' } : { value: stats.wordsRead.toLocaleString(), label: 'words read' },
    { value: stats.newWords.toLocaleString(), label: stats.newWords === 1 ? 'new word met' : 'new words met' },
    { value: stats.lookedUp.toLocaleString(), label: stats.lookedUp === 1 ? 'word looked up' : 'words looked up' },
  ];
  const todayMinutes = Math.floor(todayMs / 60_000);

  return (
    <motion.div
      className="fixed inset-0 z-40 overflow-y-auto bg-bg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      role="dialog"
      aria-modal="true"
      aria-label="The end"
    >
      <div className="mx-auto flex min-h-full max-w-2xl flex-col items-center justify-center px-6 py-16 text-center" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 48px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 48px)' }}>
        <motion.p className="text-[12px] font-bold tracking-[0.22em] text-sage-text uppercase" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.soft, delay: 0.1 }}>
          The end
        </motion.p>
        <motion.h1
          lang={lang}
          className="mt-4 font-serif text-[34px] leading-tight font-semibold tracking-tight text-balance sm:text-[44px]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring.soft, delay: 0.18 }}
        >
          {title}
        </motion.h1>
        {author && (
          <motion.p className="mt-2 font-serif text-[17px] text-ink-soft italic" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.26 }}>
            {author}
          </motion.p>
        )}

        <motion.div className="flourish my-10 h-px w-16 bg-line-strong" aria-hidden initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ ...spring.soft, delay: 0.32 }} />

        <dl className="grid w-full grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
          {numbers.map((n, i) => (
            <motion.div key={n.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.soft, delay: 0.4 + i * 0.07 }}>
              <dd className="font-serif text-[40px] leading-none font-semibold tabular-nums">{n.value}</dd>
              <dt className="mt-2 text-[13px] text-ink-soft">{n.label}</dt>
            </motion.div>
          ))}
        </dl>

        <motion.div className="mt-10 flex items-center gap-3 rounded-2xl bg-surface px-4 py-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }}>
          <GoalRing value={todayMs / (goal * 60_000)} size={36} />
          <p className="text-left text-[14px] leading-snug">
            <span className="font-semibold tabular-nums">
              {todayMinutes} of {goal} minutes
            </span>{' '}
            <span className="text-ink-soft">{todayMinutes >= goal ? 'read today. Your goal is reached.' : 'read today.'}</span>
          </p>
        </motion.div>

        {checks.length > 0 && (
          <motion.div className="w-full max-w-xl" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.soft, delay: 0.8 }}>
            <CheckYourself lang={lang} refId={refId} words={checks} source={source} />
          </motion.div>
        )}

        <motion.div className="w-full max-w-xl" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.soft, delay: 0.82 }}>
          <OwnWordsFold lang={lang} title={title} refId={refId} className={checks.length > 0 ? 'mt-4' : 'mt-10'} />
        </motion.div>

        <motion.div className="mt-10 flex w-full max-w-xs flex-col gap-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.soft, delay: 0.85 }}>
          <Button size="lg" onClick={onFinish} block>
            {finished ? 'Back to the shelves' : 'Mark as finished'}
          </Button>
          <Button variant="ghost" onClick={onKeepReading} block>
            Keep reading
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
