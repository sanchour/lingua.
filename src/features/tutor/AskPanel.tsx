import { UiText, useUi } from '@/design/i18n/UiText';
// 6-15: The Ask Panel (The tutor, in context).
// A 440px desktop side drawer complying with the Lingua Design Handbook (p. 3456 & 3522).
// Features: contextual awareness, quick prompt chips, natural language questions, progressive hints,
// analogies, pronunciation, comparisons, audio pronunciation, and "Save as mini-lesson" to notes.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  BookmarkPlus,
  Check,
  Copy,
  Globe,
  GraduationCap,
  Lightbulb,
  Send,
  Settings as SettingsIcon,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';
import { useApp } from '@/app/context';
import { getLanguage } from '@/core/lang/languages';
import { suggestTutorActions } from '@/core/tutor/context';
import type { TutorActionKind, TutorContext, TutorResponse } from '@/core/tutor/types';
import { saveGrammarNote } from '@/data/grammarUserData';
import { DEFAULT_SETTINGS, TUTOR_PRESETS, useSettings } from '@/data/settings';
import { Badge, Button, IconButton } from '@/design/primitives';
import { fade, spring } from '@/design/motion';
import { askTutor } from '@/services/llm/tutor';
import { speak } from '@/services/speech/voice';
import { toast, useUI } from '@/state/ui';

export function AskPanel() {
  const translateUi = useUi();
  const open = useUI((s) => s.tutorOpen);
  const close = useUI((s) => s.closeTutor);
  const tutorContext = useUI((s) => s.tutorContext);
  const { language } = useApp();
  const lang = tutorContext?.lang ?? language.id;
  const langName = getLanguage(lang)?.name ?? lang;
  const settings = useSettings() ?? DEFAULT_SETTINGS;
  const navigate = useNavigate();

  const [activeContext, setActiveContext] = useState<TutorContext | null>(null);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TutorResponse | null>(null);
  const [revealedHint2, setRevealedHint2] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedLesson, setSavedLesson] = useState(false);
  const [playingExample, setPlayingExample] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Sync active context when open or changed
  useEffect(() => {
    if (open) {
      const initial: TutorContext = tutorContext ?? {
        kind: 'general',
        lang,
      };
      setActiveContext(initial);
      setRevealedHint2(false);
      setSavedLesson(false);

      // If initial question provided, execute right away
      if (initial.initialQuestion) {
        setQuestion(initial.initialQuestion);
        void handleRunAction(initial, 'custom_question', initial.initialQuestion);
      } else {
        // Auto run default quick action if word or grammar provided without question
        if (initial.kind === 'word' && !result) {
          void handleRunAction(initial, 'explain_nuance');
        } else if (initial.kind === 'grammar' && !result) {
          void handleRunAction(initial, 'grammar_simple');
        } else if (initial.kind === 'exercise' && !result) {
          void handleRunAction(initial, 'give_hint');
        }
      }

      // Focus input after open
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open, tutorContext]);

  // Global Alt+T shortcut to toggle tutor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        if (open) {
          close();
        } else {
          useUI.getState().openTutor();
        }
      } else if (e.key === 'Escape' && open) {
        close();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, close]);

  const handleRunAction = async (ctx: TutorContext, action: TutorActionKind, customQ?: string) => {
    setLoading(true);
    setRevealedHint2(false);
    setSavedLesson(false);
    try {
      const res = await askTutor(lang, ctx, action, customQ);
      setResult(res);
    } catch (err: any) {
      toast(err?.message ?? 'Could not reach tutor. Check your connection or API key.', { tone: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || !activeContext) return;
    void handleRunAction(activeContext, 'custom_question', trimmed);
  };

  const handlePlayAudio = async (text: string, index: number) => {
    setPlayingExample(index);
    try {
      await speak(lang, text);
    } finally {
      setPlayingExample(null);
    }
  };

  const handleSaveMiniLesson = async () => {
    if (!result) return;
    const topicId = activeContext?.topicId ?? `tutor-lesson-${Date.now()}`;
    const formatted =
      `# ${result.title}\n\n` +
      `*${result.summary}*\n\n` +
      `${result.explanation}\n\n` +
      (result.analogy ? `> 💡 **Analogy:** ${result.analogy}\n\n` : '') +
      (result.examples.length > 0
        ? `### Examples\n` +
          result.examples.map((ex) => `- **${ex.target}** — *${ex.translation}*`).join('\n') +
          '\n\n'
        : '') +
      (result.comparison
        ? `### Comparison: ${result.comparison.itemA} vs ${result.comparison.itemB}\n${result.comparison.difference}\n\n`
        : '') +
      `---\n*Saved from Lingua Contextual Tutor (${settings.tutor.preset} preset) on ${new Date().toLocaleDateString()}*`;

    await saveGrammarNote(lang, topicId, formatted);
    setSavedLesson(true);
    toast('Saved mini-lesson to your notes!', { tone: 'success' });
  };

  const handleCopyExplanation = async () => {
    if (!result) return;
    const text = `${result.title}\n\n${result.explanation}\n\n${result.examples.map((e) => `${e.target} - ${e.translation}`).join('\n')}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast('Copied explanation to clipboard', { duration: 2000 });
  };

  const actionChips = activeContext ? suggestTutorActions(activeContext) : [];
  const presetConfig = TUTOR_PRESETS[settings.tutor.preset] ?? TUTOR_PRESETS.teacher;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          {/* Subtle click-away scrim */}
          <motion.div
            className="absolute inset-0 bg-ink/10 backdrop-blur-[1px] pointer-events-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fade}
            onClick={close}
            aria-hidden
          />

          {/* 440px Desktop Side Panel */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={translateUi('The Contextual Tutor')}
            tabIndex={-1}
            className="pointer-events-auto absolute top-3 right-3 bottom-3 flex w-[min(440px,calc(100vw-24px))] flex-col rounded-3xl border border-line bg-raised shadow-elev-3 outline-none"
            initial={{ x: '108%' }}
            animate={{ x: 0 }}
            exit={{ x: '108%' }}
            transition={spring.sheet}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="grid size-8 place-items-center rounded-xl bg-accent-soft text-accent-text">
                  <GraduationCap size={18} aria-hidden />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif text-[16px] font-semibold text-ink"><UiText source={'The Tutor'} /></h2>
                    <Badge tone="accent"><UiText source={presetConfig.name} /></Badge>
                  </div>
                  <p className="truncate text-[12px] text-ink-soft">
                    {activeContext?.word
                      ? translateUi('Exploring "{0}"', [activeContext.word])
                      : activeContext?.topicTitle
                        ? activeContext.topicTitle
                        : translateUi('Ready for questions in {0}', [translateUi(langName)])}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <IconButton
                  icon={SettingsIcon}
                  label={translateUi('Tutor Settings')}
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    close();
                    navigate('/ordo?section=ai');
                  }}
                />
                <IconButton icon={X} label={translateUi('Close Tutor')} size="sm" variant="ghost" onClick={close} />
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Active Context Card */}
              {activeContext && activeContext.kind !== 'general' && (
                <div className="rounded-2xl border border-line bg-paper/70 p-3.5 text-[13px]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold tracking-wider text-[11px] text-ink-soft uppercase"><UiText source={'Active on screen ({0})'} values={[activeContext.kind]} /></span>
                    {activeContext.room && <span className="text-[11px] text-ink-faint">{activeContext.room}</span>}
                  </div>

                  {activeContext.word && (
                    <div className="font-serif text-lg font-semibold text-ink">{activeContext.word}</div>
                  )}

                  {activeContext.sentence && (
                    <p className="mt-1 font-serif italic text-ink-soft">"{activeContext.sentence}"</p>
                  )}

                  {activeContext.translation && (
                    <p className="mt-0.5 text-[12px] text-ink-faint"><UiText source={'Meaning: {0}'} values={[activeContext.translation]} /></p>
                  )}

                  {activeContext.userAnswer && (
                    <div className="mt-2 flex flex-col gap-0.5 rounded-lg bg-raised p-2 text-[12px]">
                      <div className="flex items-center gap-1.5 text-accent-text">
                        <AlertCircle size={13} />
                        <span><UiText source={'Submitted: "{0}"'} values={[activeContext.userAnswer]} /></span>
                      </div>
                      {activeContext.correctAnswer && (
                        <div className="flex items-center gap-1.5 text-sage-text">
                          <Check size={13} />
                          <span><UiText source={'Expected: "{0}"'} values={[activeContext.correctAnswer]} /></span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Quick Action Chips */}
              {actionChips.length > 0 && (
                <div>
                  <div className="mb-2 text-[11.5px] font-bold tracking-wider text-ink-soft uppercase"><UiText source={'Suggested Questions'} /></div>
                  <div className="flex flex-wrap gap-1.5">
                    {actionChips.map((chip) => (
                      <button
                        key={chip.action}
                        type="button"
                        onClick={() => activeContext && handleRunAction(activeContext, chip.action)}
                        disabled={loading}
                        className="rounded-full border border-line bg-paper px-3 py-1 text-[12px] font-medium text-ink transition-all hover:border-accent hover:bg-accent-soft/40 hover:text-accent-text disabled:opacity-50"
                      >
                        <UiText source={chip.label} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Natural Language Question Form */}
              <form onSubmit={handleCustomSubmit} className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={
                    activeContext?.word
                      ? translateUi('Ask about "{0}"...', [activeContext.word])
                      : translateUi('Ask any question or grammar rule...')
                  }
                  className="h-10 w-full rounded-xl border border-line bg-paper pr-10 pl-3.5 text-[13px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!question.trim() || loading}
                  aria-label={translateUi('Send question')}
                  className="absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-ink-soft hover:bg-raised hover:text-ink disabled:opacity-30"
                >
                  <Send size={14} />
                </button>
              </form>

              {/* Loading State */}
              {loading && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent-text animate-pulse">
                    <Sparkles size={22} className="animate-spin" />
                  </div>
                  <p className="mt-3 text-[13.5px] font-medium text-ink"><UiText source={'Consulting your tutor...'} /></p>
                  <p className="text-[12px] text-ink-soft"><UiText source={'Synthesizing grammar and examples for {0}'} values={[translateUi(langName)]} /></p>
                </div>
              )}

              {/* Response Display */}
              {!loading && result && (
                <div className="space-y-4 pt-2">
                  {/* Title & Summary */}
                  <div>
                    <h3 className="font-serif text-lg font-bold text-ink">{result.title}</h3>
                    {result.summary && (
                      <p className="mt-1 text-[13px] font-medium leading-snug text-ink-soft">
                        {result.summary}
                      </p>
                    )}
                  </div>

                  {/* Progressive Hints (F0984) */}
                  {result.hint && (
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                      <div className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-300 text-[13px]">
                        <Lightbulb size={15} />
                        <span><UiText source={'Progressive Clue'} /></span>
                      </div>
                      <p className="mt-2 text-[13px] leading-relaxed text-ink">
                        {result.hint.level1}
                      </p>

                      {result.hint.level2 && !revealedHint2 && (
                        <button
                          type="button"
                          onClick={() => setRevealedHint2(true)}
                          className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/20 px-3 py-1 text-[12px] font-medium text-amber-900 dark:text-amber-100 transition-colors hover:bg-amber-500/30"
                        ><UiText source={'Reveal closer clue'} /></button>
                      )}

                      {revealedHint2 && result.hint.level2 && (
                        <div className="mt-3 border-t border-amber-500/20 pt-2 text-[13px] leading-relaxed text-ink">
                          <span className="font-bold text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-300 block mb-0.5"><UiText source={'Closer Clue:'} /></span>
                          {result.hint.level2}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Why Incorrect (F0967) */}
                  {result.whyIncorrect && (
                    <div className="rounded-2xl border border-line bg-paper p-4">
                      <div className="flex items-center gap-1.5 text-accent-text font-semibold text-[13px]">
                        <AlertCircle size={15} />
                        <span><UiText source={'Why this was incorrect'} /></span>
                      </div>
                      <p className="mt-2 text-[13px] leading-relaxed text-ink">
                        {result.whyIncorrect}
                      </p>
                    </div>
                  )}

                  {/* Analogy Callout (F0981) */}
                  {result.analogy && (
                    <div className="rounded-2xl border border-line bg-paper p-4">
                      <div className="flex items-center gap-1.5 text-ink font-semibold text-[13px]">
                        <Lightbulb size={15} className="text-accent-text" />
                        <span><UiText source={'Real-World Analogy'} /></span>
                      </div>
                      <p className="mt-2 text-[13px] italic leading-relaxed text-ink-soft">
                        "{result.analogy}"
                      </p>
                    </div>
                  )}

                  {/* Main Explanation */}
                  <div className="rounded-2xl border border-line bg-paper p-4">
                    <p className="text-[13.5px] leading-relaxed text-ink whitespace-pre-line">
                      {result.explanation}
                    </p>

                    {/* Nuances list (F0957) */}
                    {result.nuances && result.nuances.length > 0 && (
                      <div className="mt-3 border-t border-line pt-3">
                        <span className="text-[11.5px] font-bold tracking-wider text-ink-soft uppercase block mb-1.5"><UiText source={'Nuances & Usage Notes'} /></span>
                        <ul className="space-y-1 text-[13px] text-ink-soft">
                          {result.nuances.map((nuance, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-accent-text">•</span>
                              <span>{nuance}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Pronunciation & Stress (F0963) */}
                  {result.pronunciation && (
                    <div className="rounded-2xl border border-line bg-paper p-4 text-[13px]">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-ink"><UiText source={'Pronunciation & Stress'} /></span>
                        <Badge tone="sage">{result.pronunciation.ipa}</Badge>
                      </div>
                      <p className="mt-2 text-ink-soft">{result.pronunciation.tips}</p>
                      {result.pronunciation.stressPattern && (
                        <p className="mt-1 text-[12px] text-ink-faint"><UiText source={'Stress: {0}'} values={[result.pronunciation.stressPattern]} /></p>
                      )}
                    </div>
                  )}

                  {/* Comparison Table (F0962) */}
                  {result.comparison && (
                    <div className="rounded-2xl border border-line bg-paper p-4 text-[13px]">
                      <div className="font-semibold text-ink"><UiText source={'Comparing {0} vs {1}'} values={[result.comparison.itemA, result.comparison.itemB]} /></div>
                      <p className="mt-1 text-ink-soft">{result.comparison.difference}</p>

                      {result.comparison.table && result.comparison.table.length > 0 && (
                        <div className="mt-3 overflow-x-auto">
                          <table className="w-full text-left text-[12px]">
                            <thead>
                              <tr className="border-b border-line text-ink-soft">
                                <th className="pb-1.5 font-medium"><UiText source={'Feature'} /></th>
                                <th className="pb-1.5 font-medium">{result.comparison.itemA}</th>
                                <th className="pb-1.5 font-medium">{result.comparison.itemB}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                              {result.comparison.table.map((row, idx) => (
                                <tr key={idx}>
                                  <td className="py-1.5 font-medium text-ink">{row.feature}</td>
                                  <td className="py-1.5 text-ink-soft">{row.a}</td>
                                  <td className="py-1.5 text-ink-soft">{row.b}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Example Sentences with Audio (F0958, F0968, F1001) */}
                  {result.examples.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[11.5px] font-bold tracking-wider text-ink-soft uppercase"><UiText source={'Examples in Context'} /></div>
                      {result.examples.map((ex, i) => (
                        <div
                          key={i}
                          className="flex items-start justify-between gap-3 rounded-xl border border-line bg-paper p-3 text-[13px]"
                        >
                          <div className="min-w-0">
                            <p className="font-serif font-medium text-ink">{ex.target}</p>
                            <p className="mt-0.5 text-[12px] text-ink-soft">{ex.translation}</p>
                            {ex.note && <p className="mt-0.5 text-[11px] text-ink-faint">{ex.note}</p>}
                          </div>
                          <button
                            type="button"
                            onClick={() => handlePlayAudio(ex.target, i)}
                            disabled={playingExample === i}
                            title={translateUi('Hear pronunciation')}
                            aria-label={translateUi('Hear pronunciation')}
                            className="mt-0.5 grid size-7 flex-shrink-0 place-items-center rounded-lg text-ink-soft hover:bg-raised hover:text-ink"
                          >
                            <Volume2 size={15} className={playingExample === i ? 'text-accent animate-pulse' : ''} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Cultural & Regional Notes (F0964, F0965) */}
                  {(result.culturalNote || result.regionalNote) && (
                    <div className="flex items-start gap-2.5 rounded-2xl border border-line bg-paper p-3.5 text-[12.5px] text-ink-soft">
                      <Globe size={16} className="text-ink flex-shrink-0 mt-0.5" />
                      <div>
                        {result.regionalNote && <p className="font-medium text-ink">{result.regionalNote}</p>}
                        {result.culturalNote && <p className="mt-0.5">{result.culturalNote}</p>}
                      </div>
                    </div>
                  )}

                  {/* Matched Grammar Topic Links (F0222, F1012) */}
                  {result.matchedGrammarTopicIds && result.matchedGrammarTopicIds.length > 0 && (
                    <div className="rounded-2xl border border-line bg-paper p-3.5">
                      <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink mb-2">
                        <BookOpen size={14} className="text-accent-text" />
                        <span><UiText source={'Connected Grammatica Lessons'} /></span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {result.matchedGrammarTopicIds.map((tid) => (
                          <button
                            key={tid}
                            type="button"
                            onClick={() => {
                              close();
                              navigate(`/cursus?topic=${tid}`);
                            }}
                            className="flex items-center gap-1 rounded-lg border border-line bg-raised px-2.5 py-1 text-[12px] font-medium text-accent-text hover:border-line-strong hover:bg-paper"
                          >
                            <span><UiText source={'Topic: {0}'} values={[tid]} /></span>
                            <ArrowRight size={12} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Encouragement (F0991) */}
                  <p className="text-center text-[12px] text-ink-faint italic py-1">
                    "{result.encouragement}"
                  </p>
                </div>
              )}
            </div>

            {/* Footer Action Bar */}
            {result && !loading && (
              <div className="border-t border-line px-5 py-3 flex items-center justify-between gap-2 bg-paper/50">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={savedLesson ? Check : BookmarkPlus}
                  onClick={handleSaveMiniLesson}
                  disabled={savedLesson}
                >
                  {savedLesson ? translateUi('Saved to Notes') : translateUi('Keep as Mini-Lesson')}
                </Button>

                <div className="flex items-center gap-1">
                  <IconButton
                    icon={copied ? Check : Copy}
                    label={translateUi('Copy explanation')}
                    size="sm"
                    variant="ghost"
                    onClick={handleCopyExplanation}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setQuestion('');
                      inputRef.current?.focus();
                    }}
                  ><UiText source={'Follow-up'} /></Button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
