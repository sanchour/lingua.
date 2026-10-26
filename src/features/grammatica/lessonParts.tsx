// The parts of a grammar lesson around its drills: "See it" before (examples first), and the
// topic's whole rule in a side panel after a mistake.
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { openingExamples } from '@/core/grammar/types';
import type { Topic } from '@/core/grammar/types';
import { useLayout } from '@/design/hooks/useLayout';
import { Button, Card, Drawer, Kbd } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { CompareView, eyebrow, Rich, SentenceLine, TableView, WatchOut } from './parts';

/**
 * Examples first. A topic's first lesson shows three sentences with the form marked (each can be
 * played), then the rule and the comparison, beside them on a wide screen. Later lessons show one
 * sentence and the one-line reason.
 */
export function SeeIt({ topic, lang, full, onStart }: { topic: Topic; lang: string; full: boolean; onStart: () => void }) {
  const { layout, pointer } = useLayout();
  const examples = openingExamples(topic).slice(0, full ? 3 : 1);
  const wide = layout === 'wide' && full;
  return (
    <motion.main
      className={cx('mx-auto px-5', wide ? 'max-w-5xl' : 'max-w-2xl')}
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 72px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 96px)' }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring.soft}
    >
      <p className={cx(eyebrow, 'text-sage-text')}>{full ? 'See it first' : 'Remember'}</p>
      <h1 className="mt-1 font-serif text-[clamp(1.7rem,4vw,2.3rem)] leading-tight font-semibold">{topic.title}</h1>
      <p className="mt-1 text-[16px] leading-snug text-ink-soft">{topic.summary}</p>

      <div className={cx('mt-7 gap-8', wide ? 'grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-start' : 'space-y-7')}>
        <Card className="divide-y divide-line/60 p-0">
          {examples.map((ex, i) => (
            <motion.div key={ex.s} className="px-4 py-4 sm:px-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.soft, delay: 0.1 + i * 0.12 }}>
              <SentenceLine example={ex} lang={lang} size="lg" />
            </motion.div>
          ))}
        </Card>
        <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
          {full ? (
            <>
              <div className="space-y-3 text-[16px] leading-relaxed text-ink-soft">
                {topic.rule.map((p) => (
                  <p key={p}>
                    <Rich text={p} lang={lang} />
                  </p>
                ))}
              </div>
              {topic.compare && <CompareView compare={topic.compare} lang={lang} />}
            </>
          ) : (
            <p className="text-[16px] leading-relaxed text-ink-soft">
              <Rich text={topic.why} lang={lang} />
            </p>
          )}
        </motion.div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
        <div className={cx('mx-auto flex items-center justify-end gap-3 px-5 pt-4', wide ? 'max-w-5xl' : 'max-w-2xl')}>
          <p className="hidden min-w-0 flex-1 text-sm text-ink-soft sm:block">{full ? 'Read them aloud, then try it yourself.' : 'Now use it.'}</p>
          <Button size="lg" className="min-w-40 flex-1 sm:flex-none" onClick={onStart}>
            Start
            {pointer === 'fine' ? <Kbd tone="inverse">Enter</Kbd> : <ArrowRight size={18} aria-hidden />}
          </Button>
        </div>
      </div>
    </motion.main>
  );
}

/** The topic's rule, comparison, tables and "watch out", over the lesson (a side panel on a desktop). */
export function RuleSheet({ topic, lang, onClose }: { topic: Topic | null; lang: string; onClose: () => void }) {
  return (
    <Drawer open={Boolean(topic)} onClose={onClose} title={topic?.title ?? ''} description={topic?.summary}>
      {topic && (
        <div className="space-y-6 pb-2">
          <div className="space-y-3 text-[15.5px] leading-relaxed text-ink-soft">
            {topic.rule.map((p) => (
              <p key={p}>
                <Rich text={p} lang={lang} />
              </p>
            ))}
          </div>
          {topic.compare && (
            <section>
              <h3 className={cx(eyebrow, 'mb-2')}>{topic.compare.title}</h3>
              <CompareView compare={topic.compare} lang={lang} />
            </section>
          )}
          {(topic.tables ?? []).map((t, i) => (
            <TableView key={i} table={t} lang={lang} />
          ))}
          {topic.watch && <WatchOut>{topic.watch}</WatchOut>}
        </div>
      )}
    </Drawer>
  );
}
