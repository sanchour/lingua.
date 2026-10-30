import { UiText, useUi } from '@/design/i18n/UiText';
import { useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { BookHeart, Eye, MessageCircleQuestion, Sparkles } from 'lucide-react';
import { plain } from '@/core/grammar/types';
import type { UnitOutline } from '@/core/course/outline';
import type { UnitContent } from '@/core/course/types';
import { courseTasks, taskPrompt } from '@/core/production/tasks';
import { Button, Card, Segmented } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { CorrectionList, ReviewSummary, ReviewText } from '@/features/codex/diarium/Review';
import type { LessonResult } from '@/features/lesson/kit';
import { useOwnWriting } from '@/features/production/useOwnWriting';
import { SpeakButton } from '@/features/speech/SpeakButton';
import { StudyBar } from '@/features/thesaurus/study/StudyBar';

interface Props {
  unit: UnitOutline;
  content: UnitContent;
  lang: string;
  onClose: () => void;
  onActive: (ms: number) => void;
  onFinish: (score: number, result: LessonResult, tiles: Array<[string, string]>) => void;
}

const minutes = (ms: number) => (ms < 60_000 ? `${Math.max(1, Math.round(ms / 1000))} s` : `${Math.round(ms / 60_000)} min`);

const eyebrow = 'text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase';

/**
 * Write: in your own words, the unit's task, a scene to describe, or one of its questions to answer.
 * With an AI key, corrections, a more natural version and a score; without, the model answer (for
 * the task) and the unit's phrases to compare with. Either way it can be sent to someone who speaks
 * the language, and kept in Diarium.
 */
export function WriteLesson({ unit, content, lang, onClose, onActive, onFinish }: Props) {
  const translateUi = useUi();
  const tasks = useMemo(() => courseTasks(unit, content), [unit, content]);
  const [taskId, setTaskId] = useState(tasks[0].id);
  const task = tasks.find((t) => t.id === taskId) ?? tasks[0];
  const w = useOwnWriting(lang, taskPrompt(task));
  const [model, setModel] = useState(false);
  const startedAt = useRef(performance.now());
  const rtl = lang === 'ar';

  const finish = () => {
    const ms = performance.now() - startedAt.current;
    onActive(Math.min(ms, 30 * 60_000));
    const score = w.review ? w.review.scores.overall / 100 : 1;
    onFinish(score, { answered: 1, accuracy: score, ms, bestCombo: 0 }, [
      [lang === 'zh' ? 'Characters' : 'Words', String(w.count)],
      ['Score', w.review ? String(w.review.scores.overall) : '—'],
      ['Time', minutes(ms)],
    ]);
  };

  return (
    <>
      <StudyBar title={translateUi('{0} · Write', [unit.short])} progress={w.review || model ? 0.9 : w.enough ? 0.5 : 0.15} onClose={onClose} />
      <main className="mx-auto max-w-5xl px-5" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 76px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 48px)' }}>
        <motion.div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft}>
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className={cx(eyebrow, 'text-sage-text')}><UiText source={'Write it yourself'} /></p>
              <Segmented
                label={translateUi('What to write')}
                value={task.id}
                onChange={(id) => {
                  setTaskId(id);
                  setModel(false);
                }}
                options={tasks.map((t) => ({ value: t.id, label: t.label }))}
              />
            </div>
            <h1 className="mt-2 font-serif text-[clamp(1.5rem,3.4vw,2rem)] leading-tight font-semibold">{task.task}</h1>
            {task.quote && (
              <div className="mt-3 flex items-center gap-2">
                <SpeakButton lang={lang} text={task.quote} size={18} />
                <p lang={lang} dir={rtl ? 'rtl' : undefined} className="font-serif text-[22px] leading-snug font-semibold">
                  {task.quote}
                </p>
              </div>
            )}
            <textarea
              lang={lang}
              dir={rtl ? 'rtl' : undefined}
              value={w.text}
              onChange={(e) => w.setText(e.target.value)}
              placeholder={`Write in ${w.name}…`}
              rows={7}
              autoFocus
              className="mt-5 w-full resize-y rounded-2xl border border-line bg-raised px-4 py-3 font-serif text-[18px] leading-relaxed text-ink transition-colors placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="mr-auto text-[12.5px] font-semibold text-ink-faint tabular-nums">
                {w.count} {lang === 'zh' ? translateUi('characters') : w.count === 1 ? translateUi('word') : translateUi('words')}
              </span>
              {w.canCheck && (
                <Button variant="secondary" icon={Sparkles} loading={w.checking} disabled={!w.enough || Boolean(w.review)} onClick={() => void w.check()}><UiText source={'Check it'} /></Button>
              )}
              {task.id === 'task' && (
                <Button variant="ghost" icon={Eye} onClick={() => setModel((m) => !m)}>
                  {model ? translateUi('Hide the model answer') : translateUi('Show a model answer')}
                </Button>
              )}
            </div>

            {w.review && (
              <motion.div className="mt-6 space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft}>
                <ReviewSummary review={w.review} />
                <ReviewText review={w.review} lang={lang} />
                <CorrectionList review={w.review} lang={lang} />
              </motion.div>
            )}
            {model && task.id === 'task' && (
              <Card className="mt-6 p-5">
                <div className="flex items-center gap-2">
                  <p className={cx(eyebrow, 'flex-1')}><UiText source={'One way to write it'} /></p>
                  <SpeakButton lang={lang} text={content.model} size={17} />
                </div>
                <p lang={lang} dir={rtl ? 'rtl' : undefined} className="mt-2 font-serif text-[17px] leading-relaxed">
                  {content.model}
                </p>
              </Card>
            )}

            <div className="mt-8 flex flex-wrap gap-2 border-t border-line pt-5">
              <Button variant="ghost" icon={MessageCircleQuestion} disabled={!w.enough} onClick={() => void w.ask()}><UiText source={'Ask a speaker'} /></Button>
              <Button variant="ghost" icon={BookHeart} disabled={!w.enough || w.kept} onClick={() => void w.keep(task.quote ?? task.task)}>
                {w.kept ? translateUi('Kept in Diarium') : translateUi('Keep it in Diarium')}
              </Button>
              <Button className="ml-auto" disabled={!w.enough} onClick={finish}><UiText source={'Finish the lesson'} /></Button>
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-20">
            <Card className="p-5">
              <p className={eyebrow}><UiText source={'Use what you learned'} /></p>
              <ul className="mt-2 space-y-2">
                {content.phrases.slice(0, 5).map((p) => (
                  <li key={p.s}>
                    <p lang={lang} dir={rtl ? 'rtl' : undefined} className="text-[15px] leading-snug font-semibold">
                      {plain(p.s)}
                    </p>
                    <p className="text-[12.5px] text-ink-soft italic">{p.en}</p>
                  </li>
                ))}
              </ul>
            </Card>
            {!w.canCheck && (
              <p className="px-1 text-[12.5px] leading-relaxed text-ink-faint"><UiText source={'With an AI key (Settings › AI), Check it corrects your text and shows a more natural version. Without one, compare with the model answer, or ask a speaker.'} /></p>
            )}
          </aside>
        </motion.div>
      </main>
    </>
  );
}
