import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { plain } from '@/core/grammar/types';
import type { UnitOutline } from '@/core/course/outline';
import type { UnitContent } from '@/core/course/types';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { useLayout } from '@/design/hooks/useLayout';
import { Button, Card, Kbd } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { SpeakButton } from '@/features/speech/SpeakButton';

const eyebrow = 'text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase';

/** Before the exercises: every word (or phrase) of the unit, to hear and read through once. */
export function CourseIntro({ part, unit, content, lang, onStart }: { part: 'words' | 'phrases'; unit: UnitOutline; content: UnitContent; lang: string; onStart: () => void }) {
  const { pointer } = useLayout();
  useHotkeys({ Enter: onStart }, true);
  const rtl = lang === 'ar';
  const rows =
    part === 'words'
      ? content.words.map(([term, meaning, reading]) => ({ text: term, en: meaning, reading }))
      : content.phrases.map((p) => ({ text: plain(p.s), en: p.en, reading: p.reading }));
  return (
    <motion.main
      className="mx-auto max-w-5xl px-5"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 72px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 120px)' }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.soft}
    >
      <p className={cx(eyebrow, 'text-sage-text')}>{part === 'words' ? 'The words' : 'The phrases'}</p>
      <h1 className="mt-1 font-serif text-[clamp(1.7rem,4vw,2.3rem)] leading-tight font-semibold">{unit.title}</h1>
      <p className="mt-1 text-[16px] leading-snug text-ink-soft">{part === 'words' ? 'Listen to each word and say it after the voice. Then the exercises.' : 'These are the phrases the unit is about. Listen, read them aloud, then use them.'}</p>

      <Card className={cx('mt-7 grid p-0', part === 'words' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1')}>
        {rows.map((r, i) => (
          <motion.div
            key={r.text}
            // Right to left: the Arabic and its sound on the right, the English on the left of the same line.
            className={cx('flex items-center gap-3 border-b border-line/60 px-4 py-3 sm:px-5', rtl && 'flex-row-reverse')}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.soft, delay: 0.04 + Math.min(i, 12) * 0.03 }}
          >
            <SpeakButton lang={lang} text={r.text} size={17} className="shrink-0" />
            <div className={cx('min-w-0 flex-1', rtl && 'flex flex-row-reverse items-center justify-between gap-4')}>
              <p lang={lang} dir={rtl ? 'rtl' : undefined} className={cx('font-serif leading-snug font-semibold', part === 'words' ? 'text-[19px]' : 'text-[18px]', rtl && 'text-right')}>
                {r.text}
              </p>
              {r.reading && <p className="text-[13px] text-ink-soft">{r.reading}</p>}
              <p className="text-[14px] text-ink-soft italic">{r.en}</p>
            </div>
          </motion.div>
        ))}
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
        <div className="mx-auto flex max-w-5xl items-center justify-end gap-3 px-5 pt-4">
          <p className="hidden min-w-0 flex-1 text-sm text-ink-soft sm:block">{rows.length} {part}. Each comes back in the exercises.</p>
          <Button size="lg" className="min-w-40 flex-1 sm:flex-none" onClick={onStart}>
            Start
            {pointer === 'fine' ? <Kbd tone="inverse">Enter</Kbd> : <ArrowRight size={18} aria-hidden />}
          </Button>
        </div>
      </div>
    </motion.main>
  );
}
