import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { Ellipsis, MessagesSquare, PenLine, RotateCcw, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { BackLink } from '@/app/BackLink';
import { useDockBottom } from '@/app/dock';
import { useApp } from '@/app/context';
import { countWords } from '@/core/text/tokenizer';
import { bumpDaily, recordSession } from '@/data/activity';
import { acceptCorrections, deleteEntry, saveEntryText, saveReview, useJournalEntry } from '@/data/journal';
import type { JournalEntry } from '@/data/types';
import { useLayout } from '@/design/hooks/useLayout';
import { getReaderFont, readerFontStack } from '@/design/fonts';
import { Button, buttonClasses, Dialog, MenuItem, Popover, Segmented } from '@/design/primitives';
import { spring } from '@/design/motion';
import { LlmError, PROVIDERS } from '@/services/llm/client';
import { checkEntry } from '@/services/llm/journal';
import { cx } from '@/lib/cx';
import { aiBlock } from '@/data/plan';
import { MaxLink } from '@/features/plans/Locked';
import { toast, useUI } from '@/state/ui';
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const review = entry.review;
  const stale = Boolean(review && review.text.trim() !== text.trim());
  const [mode, setMode] = useState<Mode>(review && !stale ? 'review' : 'write');
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const words = countWords(text, lang);
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
    setSaved(false);
    window.clearTimeout(pending.current);
    pending.current = window.setTimeout(flush, SAVE_DELAY);
    const now = performance.now();
    const a = activity.current;
    if (a.last) a.ms += Math.min(now - a.last, IDLE_GAP);
    a.last = now;
  };

  // Writing time and words written count towards today (statistics, goal and streak).
  const activity = useRef({ ms: 0, last: 0, startedAt: Date.now(), startWords: countWords(entry.text, lang) });
  useEffect(() => {
    const a = activity.current;
    const record = () => {
      if (pending.current !== undefined) flush();
      const added = countWords(latest.current, lang) - a.startWords;
      if (added > 0) void bumpDaily(lang, { wordsWritten: added });
      void recordSession({ lang, type: 'write', refId: entry.id, startedAt: a.startedAt, endedAt: Date.now(), activeMs: Math.round(a.ms) });
      a.ms = 0;
      a.last = 0;
      a.startWords = countWords(latest.current, lang);
      a.startedAt = Date.now();
    };
    const onHide = () => document.visibilityState === 'hidden' && record();
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      record();
    };
  }, [entry.id, lang, flush]);

  // The page grows with the text, like paper.
  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, wide ? 360 : 260)}px`;
  }, [text, mode, wide]);

  useEffect(() => {
    if (mode === 'write' && !entry.text) window.setTimeout(() => areaRef.current?.focus(), 150);
  }, [mode, entry.text]);

  const check = async () => {
    if (pending.current !== undefined) flush();
    setChecking(true);
    try {
      const result = await checkEntry(lang, language.level, text.trim(), entry.prompt);
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

  const useCorrected = async () => {
    await acceptCorrections(entry.id, lang);
    setText(entry.review!.corrected);
    toast('The corrected text is now your entry. The changes stay visible here.', { tone: 'success' });
  };

  const date = new Date(`${entry.date}T12:00:00`);
  // "Talk about this" opens Sermo with the entry's prompt, or its first sentence, as the topic.
  const talkTopic = (entry.prompt ?? entry.text.split(/(?<=[.!?。！？])\s*/)[0] ?? '').trim().slice(0, 80);
  const fontStyle = { '--entry-font': readerFontStack(getReaderFont(settings.reader.font), lang) } as CSSProperties;

  return (
    <div className="pb-36" style={fontStyle}>
      <BackLink to="/mentis/diarium">Diarium</BackLink>
      <header className="mb-7 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold tracking-[0.14em] text-sage-text uppercase">{date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          {entry.prompt ? (
            <>
              <h1 lang={lang} className="mt-2 font-serif text-[26px] leading-snug font-semibold sm:text-[30px]">
                {entry.prompt}
              </h1>
              {entry.promptEn && <p className="mt-1.5 text-[14px] text-ink-faint italic">{entry.promptEn}</p>}
            </>
          ) : (
            <h1 className="mt-2 font-serif text-[30px] leading-tight font-semibold">Dear diary</h1>
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
            <div className="w-56 p-1.5">
              <MenuItem
                icon={Trash2}
                danger
                label="Delete entry"
                onClick={() => {
                  close();
                  setConfirmDelete(true);
                }}
              />
            </div>
          )}
        </Popover>
      </header>

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
            <textarea
              ref={areaRef}
              lang={lang}
              value={text}
              onChange={(e) => onChange(e.target.value)}
              onBlur={() => pending.current !== undefined && flush()}
              placeholder="Start writing. A few sentences are plenty."
              aria-label="Your entry"
              spellCheck={false}
              className="block w-full resize-none overflow-hidden bg-transparent text-[19px] leading-[1.85] outline-none placeholder:text-ink-faint [font-family:var(--entry-font)]"
            />
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
              <div className="flex flex-wrap gap-2">
                {review.corrected.trim() !== text.trim() && (
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

      {/* Floating bar: words, saving, and the check */}
      {(mode === 'write' || !review) && (
        <div className="pointer-events-none fixed inset-x-0 z-20 flex justify-center px-4 lg:pl-[var(--sidebar-w,0px)]" style={{ bottom: dockBottom }}>
          <div className="pointer-events-auto flex w-full max-w-2xl items-center gap-3 rounded-3xl border border-line/80 bg-raised/95 p-2 pl-4 shadow-elev-3 backdrop-blur-xl">
            <div className="min-w-0 flex-1 text-[13px] leading-tight text-ink-faint">
              <span className="font-semibold text-ink-soft tabular-nums">
                {words} {words === 1 ? 'word' : 'words'}
              </span>
              <span className="ml-2">{saved ? 'Saved' : 'Saving…'}</span>
              <p className="hidden truncate sm:block">{hasAi ? `Checking sends this entry to ${provider}.` : block === 'max' ? 'Corrections come with Lingua+ Max.' : 'Add a free AI key in Settings to get corrections.'}</p>
            </div>
            {stale && review && (
              <button type="button" onClick={() => setMode('review')} className="hidden px-2 text-[13px] font-semibold text-ink-soft hover:text-ink sm:block">
                Last review
              </button>
            )}
            {hasAi ? (
              <Button icon={review && stale ? RotateCcw : Sparkles} onClick={() => void check()} loading={checking} disabled={words < 3 || (Boolean(review) && !stale)}>
                {review && stale ? 'Check again' : 'Check my writing'}
              </Button>
            ) : block === 'max' ? (
              <MaxLink className={buttonClasses('secondary', 'md')}>Lingua+ Max</MaxLink>
            ) : (
              <Link to="/settings/ai" className={buttonClasses('secondary', 'md')}>
                Set up AI
              </Link>
            )}
          </div>
        </div>
      )}

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this entry?"
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                void deleteEntry(entry.id);
                navigate('/mentis/diarium', { replace: true });
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        Its text and corrections will be removed. Cards already added to the Journal deck stay.
      </Dialog>
    </div>
  );
}
