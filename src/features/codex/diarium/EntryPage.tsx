import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { Ellipsis, MessagesSquare, PenLine, RotateCcw, Sparkles, TextCursorInput, Trash2, Wand2 } from 'lucide-react';
import { BackLink } from '@/app/BackLink';
import { useDockBottom } from '@/app/dock';
import { useApp } from '@/app/context';
import { toPlain } from '@/core/journal/markdown';
import { WRITING_TASKS } from '@/core/journal/tasks';
import { emptyPage, salutation } from '@/core/journal/salutations';
import { getLanguage } from '@/core/lang/languages';
import { bumpDaily, recordSession } from '@/data/activity';
import { acceptCorrections, deleteEntry, entryWords, restoreEntry, saveEntryText, saveReview, updateEntry, useJournalEntry } from '@/data/journal';
import type { JournalEntry } from '@/data/types';
import { useLayout } from '@/design/hooks/useLayout';
import { getReaderFont, readerFontStack } from '@/design/fonts';
import { Button, buttonClasses, MenuItem, Popover, Segmented } from '@/design/primitives';
import { spring } from '@/design/motion';
import { LlmError, PROVIDERS } from '@/services/llm/client';
import { checkEntry } from '@/services/llm/journal';
import { appendSpoken } from '@/services/transcribe/dictate';
import { cx } from '@/lib/cx';
import { aiBlock } from '@/data/plan';
import { MaxLink } from '@/features/plans/Locked';
import { toast, useUI } from '@/state/ui';
import { DiaryEditor } from './DiaryEditor';
import type { DiaryEditorHandle } from './DiaryEditor';
import { DictateButton } from './Dictate';
import { WritingSession } from './WritingSession';
import { WritingMeasures } from './WritingMeasures';
import { WritingHelp } from './WritingHelp';
import { WritingFeedback } from './WritingFeedback';
import { CorrectionList, ReviewSummary, ReviewText } from './Review';

const SAVE_DELAY = 500;
/** Pauses longer than this between keystrokes don't count as writing time. */
const IDLE_GAP = 30_000;

export default function EntryPage() {
  const { entryId } = useParams();
  const entry = useJournalEntry(entryId);
  if (entry === undefined) return null;
  if (entry === null || entry.deletedAt) {
    return (
      <div className="py-20 text-center">
        <p className="font-serif text-2xl font-semibold">This entry isn’t here any more</p>
        <Link to="/mentis/diarium" className="mt-4 inline-block font-semibold text-accent-text">
          Back to Diarium
        </Link>
      </div>
    );
  }
  return <Entry key={entry.id} entry={entry} />;
}

type Mode = 'write' | 'review';

function Entry({ entry }: { entry: JournalEntry }) {
  const { language, settings } = useApp();
  const lang = entry.lang;
  const navigate = useNavigate();
  const { layout } = useLayout();
  const wide = layout === 'wide';
  const dockBottom = useDockBottom();
  const [text, setText] = useState(entry.text);
  const [saved, setSaved] = useState(true);
  const [checking, setChecking] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [portfolioTopic, setPortfolioTopic] = useState(entry.portfolio?.topic ?? '');
  const [selectedWord, setSelectedWord] = useState('');
  const review = entry.review;
  const plain = toPlain(text);
  const stale = Boolean(review && review.text.trim() !== plain.trim());
  const [mode, setMode] = useState<Mode>(review && !stale ? 'review' : 'write');
  const editorRef = useRef<DiaryEditorHandle>(null);
  const words = entryWords(text, lang);
  const provider = PROVIDERS[settings.llm.provider].name;
  const block = aiBlock(settings, settings.llm.provider);
  const hasAi = !block && Boolean(settings.llm.model);
  const openPlans = useUI((s) => s.openPlans);

  // Saves shortly after typing stops, and on leaving.
  const pending = useRef<number | undefined>(undefined);
  const latest = useRef(text);
  latest.current = text;
  const flush = useCallback(() => {
    window.clearTimeout(pending.current);
    pending.current = undefined;
    void saveEntryText(entry.id, latest.current, lang).then(() => setSaved(true));
  }, [entry.id, lang]);
  const onChange = (value: string) => {
    setText(value);
    latest.current = value;
    setSaved(false);
    window.clearTimeout(pending.current);
    pending.current = window.setTimeout(flush, SAVE_DELAY);
    const now = performance.now();
    const a = activity.current;
    if (a.last) a.ms += Math.min(now - a.last, IDLE_GAP);
    a.last = now;
  };

  // Writing time and words written count towards today (statistics, goal and streak).
  const activity = useRef({ ms: 0, last: 0, startedAt: Date.now(), startWords: entryWords(entry.text, lang) });
  useEffect(() => {
    const a = activity.current;
    const record = () => {
      if (pending.current !== undefined) flush();
      const added = entryWords(latest.current, lang) - a.startWords;
      if (added > 0) void bumpDaily(lang, { wordsWritten: added });
      void recordSession({ lang, type: 'write', refId: entry.id, startedAt: a.startedAt, endedAt: Date.now(), activeMs: Math.round(a.ms) });
      a.ms = 0;
      a.last = 0;
      a.startWords = entryWords(latest.current, lang);
      a.startedAt = Date.now();
    };
    const onHide = () => document.visibilityState === 'hidden' && record();
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      record();
    };
  }, [entry.id, lang, flush]);

  useEffect(() => {
    if (mode === 'write' && !entry.text) window.setTimeout(() => editorRef.current?.focus(), 150);
  }, [mode, entry.text]);

  const check = async () => {
    if (pending.current !== undefined) flush();
    setChecking(true);
    try {
      const result = await checkEntry(lang, language.level, plain.trim(), entry.prompt);
      await saveReview(entry.id, result);
      setMode('review');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      if (error instanceof LlmError && error.kind === 'no-plan') {
        toast(error.message, { action: { label: 'See Lingua+ Max', onClick: () => openPlans('ai') } });
      } else if (error instanceof LlmError && error.kind === 'no-key') {
        toast(error.message, { tone: 'error', action: { label: 'Open Settings', onClick: () => navigate('/settings/ai') } });
      } else toast(error instanceof Error ? error.message : 'The check didn’t work. Try again.', { tone: 'error' });
    } finally {
      setChecking(false);
    }
  };

  // What was said goes after what is written, counts as writing time, and the caret waits at its end to correct it.
  const speak = (spoken: string, ms: number) => {
    const next = appendSpoken(latest.current, spoken, lang);
    onChange(next);
    editorRef.current?.setText(next);
    activity.current.ms += ms;
  };

  // Corrections go back paragraph by paragraph, so headings and lists stay.
  const useCorrected = async () => {
    const next = await acceptCorrections(entry.id, lang);
    if (next === undefined) return;
    setText(next);
    toast('The corrected text is now your entry. The changes stay visible here.', { tone: 'success' });
  };

  const remove = () => {
    void deleteEntry(entry.id);
    navigate('/mentis/diarium', { replace: true });
    toast('Entry deleted.', { action: { label: 'Undo', onClick: () => void restoreEntry(entry.id).then(() => navigate(`/mentis/diarium/${entry.id}`)) } });
  };

  const date = new Date(`${entry.date}T12:00:00`);
  // "Talk about this" opens Sermo with the entry's prompt, or its first sentence, as the topic.
  const talkTopic = (entry.prompt ?? plain.split(/(?<=[.!?。！？])\s*/)[0] ?? '').trim().slice(0, 80);
  const fontStyle = { '--entry-font': readerFontStack(getReaderFont(settings.reader.font), lang) } as CSSProperties;
  const rtl = Boolean(getLanguage(lang)?.rtl);
  // A title from Rename comes first, then the day's prompt, then "Dear diary" in the language (or the date in it).
  const task = WRITING_TASKS.find((t) => t.id === entry.writingTaskId);
  const heading = entry.title || task?.title || entry.prompt || salutation(lang, date);
  const saving = (
    <span className="text-[13px] text-ink-faint">
      <span className="font-semibold text-ink-soft tabular-nums">
        {words} {words === 1 ? 'word' : 'words'}
      </span>
      <span className="ml-2">{saved ? 'Saved' : 'Saving…'}</span>
    </span>
  );

  return (
    <div className={hasAi ? 'pb-36' : 'pb-16'} style={fontStyle}>
      <BackLink to="/mentis/diarium">Diarium</BackLink>
      <header className="mb-7 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold tracking-[0.14em] text-sage-text uppercase">{date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          {renaming ? (
            <RenameField
              value={entry.title ?? ''}
              placeholder={entry.prompt || salutation(lang, date)}
              onDone={(title) => {
                setRenaming(false);
                if (title !== undefined && title !== (entry.title ?? '')) void updateEntry(entry.id, { title: title || undefined });
              }}
            />
          ) : (
            <h1 lang={entry.title || task ? undefined : lang} onDoubleClick={() => setRenaming(true)} className="mt-2 font-serif text-[26px] leading-snug font-semibold sm:text-[30px]">
              {heading}
            </h1>
          )}
          {entry.prompt && (entry.title || task) && (
            <p lang={task ? undefined : lang} className="mt-1.5 whitespace-pre-line text-[15px] text-ink-soft">
              {entry.prompt}
            </p>
          )}
          {entry.promptEn && !entry.title && <p className="mt-1.5 text-[14px] text-ink-faint italic">{entry.promptEn}</p>}
          <p className="mt-1.5 text-[13px] text-ink-faint">A few sentences a day is plenty.</p>
          {!hasAi && mode === 'write' && (
            <div className="mt-3 flex items-center gap-3">
              {saving}
              <DictateButton lang={lang} onSpoken={speak} />
            </div>
          )}
        </div>
        {talkTopic && (
          <Link to={`/mentis/sermo?topic=${encodeURIComponent(talkTopic)}`} className={cx(buttonClasses('secondary', 'md'), 'shrink-0')}>
            <MessagesSquare size={16} aria-hidden /> Talk about this
          </Link>
        )}
        <Popover
          label="Entry options"
          placement="bottom-end"
          trigger={(props) => (
            <button type="button" {...props} aria-label="Entry options" className="grid size-10 shrink-0 place-items-center rounded-xl text-ink-soft hover:bg-surface hover:text-ink">
              <Ellipsis size={19} aria-hidden />
            </button>
          )}
        >
          {(close) => (
            <div className="w-64 p-1.5">
              <MenuItem
                icon={TextCursorInput}
                label="Rename"
                onClick={() => {
                  close();
                  setRenaming(true);
                }}
              />
              <MenuItem
                icon={Trash2}
                danger
                label="Delete entry"
                onClick={() => {
                  close();
                  remove();
                }}
              />
              {!hasAi && (
                <p className="mt-1 border-t border-line px-3 pt-2.5 pb-1.5 text-[12.5px] leading-snug text-ink-faint">
                  {block === 'max' ? (
                    <>
                      Corrections and explanations come with <MaxLink className="font-semibold text-accent-text">Lingua+ Max</MaxLink>.
                    </>
                  ) : (
                    <>
                      For corrections, add an AI key in{' '}
                      <Link to="/settings/ai" className="font-semibold text-accent-text">
                        Settings
                      </Link>
                      .
                    </>
                  )}
                </p>
              )}
            </div>
          )}
        </Popover>
      </header>
      {mode === 'write' && <WritingSession taskId={entry.writingTaskId} words={words} />}
      {!hasAi && <p className="mb-4 text-sm text-ink-faint">Writing feedback needs Lingua+ Max and an AI key in Settings. Local writing tools work without them.</p>}
      <WritingMeasures text={text} lang={lang} />
      <details className="mb-6 rounded-xl border border-line p-4 text-sm">
        <summary className="cursor-pointer font-semibold">{entry.portfolio ? 'Kept in your portfolio' : 'Keep in your portfolio'}</summary>
        <div className="mt-3 flex items-end gap-3">
          <label className="flex-1 text-ink-soft">Topic<input value={portfolioTopic} onChange={(e) => setPortfolioTopic(e.target.value)} maxLength={120} className="mt-1 block w-full rounded-xl border border-line bg-raised p-2 text-ink" /></label>
          <Button variant="secondary" size="sm" disabled={!words} onClick={() => void updateEntry(entry.id, { portfolio: { level: entry.portfolio?.level ?? language.level, topic: portfolioTopic.trim(), at: entry.portfolio?.at ?? Date.now() } }).then(() => toast('Kept in your portfolio.', { tone: 'success' })).catch(() => toast('Could not save the portfolio choice.', { tone: 'error' }))}>{entry.portfolio ? 'Save topic' : `Keep at ${language.level}`}</Button>
          {entry.portfolio && <Button variant="ghost" size="sm" onClick={() => void updateEntry(entry.id, { portfolio: undefined }).then(() => toast('Removed from the portfolio. Your entry is still here.')).catch(() => toast('Could not change the portfolio.', { tone: 'error' }))}>Remove from portfolio</Button>}
        </div>
      </details>

      {review && (
        <div className="mb-7">
          <Segmented<Mode>
            label="Mode"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'write', label: 'Write', icon: PenLine },
              { value: 'review', label: 'Review', icon: Sparkles },
            ]}
          />
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {mode === 'write' || !review ? (
          <motion.div key="write" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring.soft}>
            <div className="grid grid-cols-[minmax(0,1fr)_320px] items-start gap-6">
              <DiaryEditor ref={editorRef} value={text} lang={lang} rtl={rtl} placeholder={emptyPage(lang)} onChange={onChange} onWord={setSelectedWord} onBlur={() => pending.current !== undefined && flush()} />
              <WritingHelp lang={lang} selected={selectedWord} />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="review"
            className={wide ? 'grid grid-cols-[minmax(0,1fr)_340px] items-start gap-10' : 'space-y-9'}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={spring.soft}
          >
            {!wide && <ReviewSummary review={review} />}
            <div className="min-w-0 space-y-9">
              <ReviewText review={review} lang={lang} />
              <WritingFeedback review={review} lang={lang} />
              <div className="flex flex-wrap gap-2">
                {review.corrected.trim() !== plain.trim() && (
                  <Button variant="secondary" icon={Wand2} onClick={() => void useCorrected()}>
                    Use the corrected text
                  </Button>
                )}
                <Button variant="ghost" icon={PenLine} onClick={() => setMode('write')}>
                  Keep writing
                </Button>
              </div>
              {!wide && <CorrectionList review={review} lang={lang} />}
            </div>
            {wide && (
              <aside className="sticky top-6 space-y-8">
                <ReviewSummary review={review} />
                <CorrectionList review={review} lang={lang} />
              </aside>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating bar with AI: words, saving, dictation and the check. Without AI these sit in the header. */}
      {hasAi && (mode === 'write' || !review) && (
        <div className="pointer-events-none fixed inset-x-0 z-20 flex justify-center px-4 lg:pl-[var(--sidebar-w,0px)]" style={{ bottom: dockBottom }}>
          <div className="pointer-events-auto flex w-full max-w-2xl items-center gap-3 rounded-3xl border border-line/80 bg-raised/95 p-2 pl-4 shadow-elev-3 backdrop-blur-xl">
            <div className="min-w-0 flex-1 leading-tight">
              {saving}
              <p className="hidden truncate text-[13px] text-ink-faint sm:block">Checking sends this entry to {provider}.</p>
            </div>
            {stale && review && (
              <button type="button" onClick={() => setMode('review')} className="hidden px-2 text-[13px] font-semibold text-ink-soft hover:text-ink sm:block">
                Last review
              </button>
            )}
            <DictateButton lang={lang} onSpoken={speak} />
            <Button icon={review && stale ? RotateCcw : Sparkles} onClick={() => void check()} loading={checking} disabled={words < 3 || (Boolean(review) && !stale)}>
              {review && stale ? 'Check again' : 'Check my writing'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** The entry's title, edited in place: Enter keeps it, Escape leaves it as it was, empty goes back to the heading. */
function RenameField({ value, placeholder, onDone }: { value: string; placeholder: string; onDone: (title?: string) => void }) {
  const [title, setTitle] = useState(value);
  const done = useRef(false);
  const finish = (result?: string) => {
    if (done.current) return;
    done.current = true;
    onDone(result);
  };
  return (
    <input
      autoFocus
      value={title}
      placeholder={placeholder}
      aria-label="Title"
      onChange={(e) => setTitle(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={() => finish(title.trim())}
      onKeyDown={(e) => {
        if (e.key === 'Enter') finish(title.trim());
        if (e.key === 'Escape') finish();
      }}
      className="mt-2 -ml-2 w-full rounded-lg bg-surface px-2 py-0.5 font-serif text-[26px] leading-snug font-semibold ring-2 ring-accent/40 outline-none sm:text-[30px]"
    />
  );
}
