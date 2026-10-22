import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { BookHeart, Eye, MessageCircleQuestion, Sparkles } from 'lucide-react';
import { useApp } from '@/app/context';
import { getLanguage } from '@/core/lang/languages';
import { plain } from '@/core/grammar/types';
import type { UnitOutline } from '@/core/course/outline';
import type { UnitContent } from '@/core/course/types';
import { createEntry, saveEntryText, saveReview } from '@/data/journal';
import { aiKeys } from '@/data/plan';
import type { JournalReview } from '@/data/types';
import { Button, Card } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { CorrectionList, ReviewSummary, ReviewText } from '@/features/codex/diarium/Review';
import type { LessonResult } from '@/features/lesson/kit';
import { SpeakButton } from '@/features/speech/SpeakButton';
import { StudyBar } from '@/features/thesaurus/study/StudyBar';
import { checkEntry } from '@/services/llm/journal';
import { toast } from '@/state/ui';

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

/** A message for someone who speaks the language: the task and the text, asking for corrections. */
export function speakerRequest(languageName: string, level: string, task: string, text: string): string {
  return `Could you correct my ${languageName}? I’m learning (about ${level}), and this is a writing task from my course.\n\nThe task: ${task}\n\nWhat I wrote:\n${text.trim()}\n\nThank you!`;
}

/**
 * Write: the unit's task in your own words. With an AI key, corrections, a more natural version and a
 * score; without, the model answer and what the unit asked for to compare with. Either way it can be
 * sent to someone who speaks the language, and kept in Diarium.
 */
export function WriteLesson({ unit, content, lang, onClose, onActive, onFinish }: Props) {
  const { settings, language } = useApp();
  const canCheck = Boolean(aiKeys(settings)[settings.llm.provider]?.trim() && settings.llm.model);
  const name = getLanguage(lang)?.name ?? lang;
  const [text, setText] = useState('');
  const [review, setReview] = useState<JournalReview | null>(null);
  const [checking, setChecking] = useState(false);
  const [model, setModel] = useState(false);
  const [kept, setKept] = useState(false);
  const startedAt = useRef(performance.now());
  const rtl = lang === 'ar';
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const enough = lang === 'zh' ? text.trim().length >= 8 : words >= 5;

  const check = async () => {
    setChecking(true);
    try {
      setReview(await checkEntry(lang, language.level, text, unit.write));
    } catch (error) {
      toast(error instanceof Error ? error.message : 'The check didn’t work this time.', { tone: 'error' });
    } finally {
      setChecking(false);
    }
  };

  const ask = async () => {
    try {
      await navigator.clipboard.writeText(speakerRequest(name, language.level === 'A0' ? 'A1' : language.level, unit.write, text));
      toast(`Copied. Paste it to a friend who speaks ${name}, or in a language exchange.`, { tone: 'success' });
    } catch {
      toast('Couldn’t copy. Select the text and copy it yourself.', { tone: 'error' });
    }
  };

  const keep = async () => {
    const id = await createEntry(lang, { text: unit.write });
    await saveEntryText(id, text, lang);
    if (review) await saveReview(id, review);
    setKept(true);
    toast('Kept in Diarium, in Mentis.', { tone: 'success' });
  };

  const finish = () => {
    const ms = performance.now() - startedAt.current;
    onActive(Math.min(ms, 30 * 60_000));
    const score = review ? review.scores.overall / 100 : 1;
    onFinish(score, { answered: 1, accuracy: score, ms, bestCombo: 0 }, [
      [lang === 'zh' ? 'Characters' : 'Words', String(lang === 'zh' ? text.trim().length : words)],
      ['Score', review ? String(review.scores.overall) : '—'],
      ['Time', minutes(ms)],
    ]);
  };

  return (
    <>
      <StudyBar title={`${unit.short} · Write`} progress={review || model ? 0.9 : enough ? 0.5 : 0.15} onClose={onClose} />
      <main className="mx-auto max-w-5xl px-5" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 76px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 48px)' }}>
        <motion.div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft}>
          <div>
            <p className={cx(eyebrow, 'text-sage-text')}>Write it yourself</p>
            <h1 className="mt-1 font-serif text-[clamp(1.5rem,3.4vw,2rem)] leading-tight font-semibold">{unit.write}</h1>
            <textarea
              lang={lang}
              dir={rtl ? 'rtl' : undefined}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setReview(null);
              }}
              placeholder={`Write in ${name}…`}
              rows={7}
              autoFocus
              className="mt-5 w-full resize-y rounded-2xl border border-line bg-raised px-4 py-3 font-serif text-[18px] leading-relaxed text-ink transition-colors placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="mr-auto text-[12.5px] font-semibold text-ink-faint tabular-nums">{lang === 'zh' ? `${text.trim().length} characters` : `${words} ${words === 1 ? 'word' : 'words'}`}</span>
              {canCheck && (
                <Button variant="secondary" icon={Sparkles} loading={checking} disabled={!enough || Boolean(review)} onClick={() => void check()}>
                  Check it
                </Button>
              )}
              <Button variant="ghost" icon={Eye} onClick={() => setModel((m) => !m)}>
                {model ? 'Hide the model answer' : 'Show a model answer'}
              </Button>
            </div>

            {review && (
              <motion.div className="mt-6 space-y-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft}>
                <ReviewSummary review={review} />
                <ReviewText review={review} lang={lang} />
                <CorrectionList review={review} lang={lang} />
              </motion.div>
            )}
            {model && (
              <Card className="mt-6 p-5">
                <div className="flex items-center gap-2">
                  <p className={cx(eyebrow, 'flex-1')}>One way to write it</p>
                  <SpeakButton lang={lang} text={content.model} size={17} />
                </div>
                <p lang={lang} dir={rtl ? 'rtl' : undefined} className="mt-2 font-serif text-[17px] leading-relaxed">
                  {content.model}
                </p>
              </Card>
            )}

            <div className="mt-8 flex flex-wrap gap-2 border-t border-line pt-5">
              <Button variant="ghost" icon={MessageCircleQuestion} disabled={!enough} onClick={() => void ask()}>
                Ask a speaker
              </Button>
              <Button variant="ghost" icon={BookHeart} disabled={!enough || kept} onClick={() => void keep()}>
                {kept ? 'Kept in Diarium' : 'Keep it in Diarium'}
              </Button>
              <Button className="ml-auto" disabled={!enough} onClick={finish}>
                Finish the lesson
              </Button>
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-20">
            <Card className="p-5">
              <p className={eyebrow}>Use what you learned</p>
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
            {!canCheck && (
              <p className="px-1 text-[12.5px] leading-relaxed text-ink-faint">
                With an AI key (Settings › AI), Check it corrects your text and shows a more natural version. Without one, compare with the model answer, or ask a speaker.
              </p>
            )}
          </aside>
        </motion.div>
      </main>
    </>
  );
}
