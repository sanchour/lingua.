import { UiText, useUi } from '@/design/i18n/UiText';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookHeart, ChevronDown, MessageCircleQuestion, PenLine, Sparkles } from 'lucide-react';
import { afterTasks, taskPrompt } from '@/core/production/tasks';
import type { Lane, OwnTask } from '@/core/production/tasks';
import { useApp } from '@/app/context';
import { recordSession } from '@/data/activity';
import { Button, Drawer, Segmented } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { CorrectionList, ReviewSummary, ReviewText } from '@/features/codex/diarium/Review';
import { useOwnWriting } from './useOwnWriting';

interface Props {
  lang: string;
  tasks: OwnTask[];
  /** What it is about (a title): Diarium's prompt for the entry. */
  about?: string;
  /** Ratio's reference for the writing time. */
  refId?: string;
  autoFocus?: boolean;
}

/**
 * Writing in your own words about something: the tasks to choose from, the text, the AI check with
 * a key, and keeping it in Diarium or sending it to someone who speaks the language. The time spent
 * writing counts in Ratio as writing once the panel closes.
 */
export function OwnWords({ lang, tasks, about, refId, autoFocus }: Props) {
  const translateUi = useUi();
  const [taskId, setTaskId] = useState(tasks[0].id);
  const task = tasks.find((t) => t.id === taskId) ?? tasks[0];
  const w = useOwnWriting(lang, taskPrompt(task));
  const rtl = lang === 'ar';

  const first = useRef(0);
  const last = useRef(0);
  const enough = useRef(false);
  enough.current = w.enough;
  useEffect(
    () => () => {
      if (!enough.current || !first.current) return;
      void recordSession({ lang, type: 'write', refId, startedAt: first.current, endedAt: last.current, activeMs: Math.min(last.current - first.current, 30 * 60_000) });
    },
    [lang, refId],
  );

  return (
    <div className="text-left">
      {tasks.length > 1 && <Segmented label={translateUi('What to write')} value={task.id} onChange={setTaskId} options={tasks.map((t) => ({ value: t.id, label: t.label }))} />}
      <p className="mt-3 text-[15px] leading-snug text-ink">{task.task}</p>
      {task.quote && (
        <p lang={lang} dir={rtl ? 'rtl' : undefined} className="mt-2 font-serif text-[19px] leading-snug font-semibold">
          {task.quote}
        </p>
      )}
      <textarea
        lang={lang}
        dir={rtl ? 'rtl' : undefined}
        value={w.text}
        onChange={(e) => {
          const now = Date.now();
          if (!first.current) first.current = now;
          last.current = now;
          w.setText(e.target.value);
        }}
        placeholder={`Write in ${w.name}…`}
        rows={5}
        autoFocus={autoFocus}
        className="mt-3 w-full resize-y rounded-2xl border border-line bg-raised px-4 py-3 font-serif text-[17px] leading-relaxed text-ink transition-colors placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="mr-auto text-[12.5px] font-semibold text-ink-faint tabular-nums">
          {w.count} {lang === 'zh' ? translateUi('characters') : w.count === 1 ? translateUi('word') : translateUi('words')}
        </span>
        {w.canCheck && (
          <Button variant="secondary" size="sm" icon={Sparkles} loading={w.checking} disabled={!w.enough || Boolean(w.review)} onClick={() => void w.check()}><UiText source={'Check it'} /></Button>
        )}
        <Button variant="ghost" size="sm" icon={MessageCircleQuestion} disabled={!w.enough} onClick={() => void w.ask()}><UiText source={'Ask a speaker'} /></Button>
        <Button variant="ghost" size="sm" icon={BookHeart} disabled={!w.enough || w.kept} onClick={() => void w.keep(about ?? task.quote ?? task.task)}>
          {w.kept ? translateUi('Kept in Diarium') : translateUi('Keep in Diarium')}
        </Button>
      </div>
      {!w.canCheck && <p className="mt-2 text-[12.5px] leading-relaxed text-ink-faint"><UiText source={'With Max and an AI key (Settings › AI), Check it corrects your text. Without, ask a speaker.'} /></p>}
      {w.review && (
        <motion.div className="mt-5 space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft}>
          <ReviewSummary review={w.review} />
          <ReviewText review={w.review} lang={lang} />
          <CorrectionList review={w.review} lang={lang} />
        </motion.div>
      )}
    </div>
  );
}

/** The reader's end page: folded like "Check yourself" until asked for; retell the text or carry it on. */
export function OwnWordsFold({ lang, title, refId, className }: { lang: string; title: string; refId: string; className?: string }) {
  const { language } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <div className={cx('w-full rounded-3xl border border-line/70 bg-surface text-left', className)}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-3 rounded-3xl px-5 py-4 text-left transition-colors hover:bg-raised">
        <span className="min-w-0 flex-1">
          <span className="block font-semibold"><UiText source={'In your own words'} /></span>
          <span className="block text-[14px] text-ink-soft"><UiText source={'Retell it, or write what comes next, if you like. To keep in Diarium, or to have checked.'} /></span>
        </span>
        <ChevronDown size={18} className={cx('shrink-0 text-ink-faint transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring.soft} className="overflow-hidden">
            <div className="border-t border-line/60 px-5 pt-4 pb-5">
              <OwnWords lang={lang} tasks={afterTasks('read', title, language.level)} about={title} refId={refId} autoFocus />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * The players' way in: a button that opens the panel beside what is playing, to retell it or keep
 * one thing from it.
 */
export function OwnWordsButton({ lang, lane, title, refId, className }: { lang: string; lane: Lane; title: string; refId: string; className?: string }) {
  const translateUi = useUi();
  const { language } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" icon={PenLine} className={cx(className)} onClick={() => setOpen(true)}><UiText source={'In your own words'} /></Button>
      <Drawer open={open} onClose={() => setOpen(false)} title={translateUi('In your own words')} description={title}>
        <OwnWords lang={lang} tasks={afterTasks(lane, title, language.level)} about={title} refId={refId} autoFocus />
      </Drawer>
    </>
  );
}
