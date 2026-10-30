import { UiText, useUi } from '@/design/i18n/UiText';
import { useState, useMemo, useEffect, useRef } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Eye,
  Lightbulb,
  Sparkles,
  Timer,
  XCircle,
} from 'lucide-react';
import { useApp } from '@/app/context';
import { PageHeader } from '@/app/PageHeader';
import { Card, Button, Badge, Segmented } from '@/design/primitives';
import { cx } from '@/lib/cx';
import {
  buildTranslationExercise,
  getTranslationTasks,
  validateRequirements,
} from '@/core/exercise/translate';
import type { TranslationTask, TranslationCategory } from '@/core/exercise/translate';
import { judge } from '@/core/exercise/judge';
import type { Judgement } from '@/core/exercise/judge';
import { recordEvidence } from '@/data/learner';
import { AlignmentView } from './AlignmentView';
import { BackTranslationView } from './BackTranslationView';
import { ReconstructView } from './ReconstructView';
import { ContrastTableView } from './ContrastTableView';

const CORE_LANGUAGES = [
  { id: 'es', label: 'Spanish', flag: '🇪🇸' },
  { id: 'fr', label: 'French', flag: '🇫🇷' },
  { id: 'de', label: 'German', flag: '🇩🇪' },
  { id: 'it', label: 'Italian', flag: '🇮🇹' },
  { id: 'ru', label: 'Russian', flag: '🇷🇺' },
  { id: 'zh', label: 'Chinese', flag: '🇨🇳' },
];

type TranslateTab = 'practice' | 'align' | 'back' | 'reconstruct' | 'compare' | 'custom';

export default function TranslatePracticePage() {
  const translateUi = useUi();
  const { language } = useApp();

  // Active language
  const [selectedLang, setSelectedLang] = useState<string>(
    CORE_LANGUAGES.some((c) => c.id === language.id) ? language.id : 'es',
  );

  // Tab: 'practice' | 'align' | 'back' | 'reconstruct' | 'custom'
  const [activeTab, setActiveTab] = useState<TranslateTab>('practice');

  // Category filter: 'all' | TranslationCategory
  const [categoryFilter, setCategoryFilter] = useState<'all' | TranslationCategory>('all');

  // Current task index
  const [taskIndex, setTaskIndex] = useState(0);

  // User input
  const [userTranslation, setUserTranslation] = useState('');

  // Hints revealed count
  const [hintsRevealed, setHintsRevealed] = useState(0);

  // Literal vs Natural toggle
  const [showLiteral, setShowLiteral] = useState(false);

  // Judgement state
  const [judgement, setJudgement] = useState<Judgement | null>(null);
  const [missingReq, setMissingReq] = useState<string | null>(null);

  // Challenge timer mode
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Custom passage mode state
  const [customSource, setCustomSource] = useState('');
  const [customTarget, setCustomTarget] = useState('');
  const [customSubmitted, setCustomSubmitted] = useState(false);

  // Tasks for current language & filter
  const tasks = useMemo(() => {
    let list = getTranslationTasks(selectedLang);
    if (categoryFilter !== 'all') {
      list = list.filter((t) => t.category === categoryFilter);
    }
    return list;
  }, [selectedLang, categoryFilter]);

  const currentTask: TranslationTask | undefined = tasks[taskIndex] ?? tasks[0];

  // Reset answer when changing task or filter
  useEffect(() => {
    setUserTranslation('');
    setHintsRevealed(0);
    setShowLiteral(false);
    setJudgement(null);
    setMissingReq(null);
    if (timerEnabled) setTimerSeconds(0);
  }, [taskIndex, selectedLang, categoryFilter, timerEnabled]);

  // Timer counter
  useEffect(() => {
    if (timerEnabled && !judgement) {
      timerRef.current = window.setInterval(() => {
        setTimerSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerEnabled, judgement]);

  const handleSubmit = () => {
    if (!currentTask || !userTranslation.trim()) return;

    // Validate requirements
    const reqCheck = validateRequirements(
      userTranslation,
      currentTask.requiredWord,
      currentTask.requiredPattern,
    );

    const spec = buildTranslationExercise(currentTask, 'accepted');
    const result = judge(spec.check, userTranslation.trim(), currentTask.toLang);

    if (!reqCheck.valid && reqCheck.missingRequirement) {
      setMissingReq(reqCheck.missingRequirement);
    } else {
      setMissingReq(null);
    }

    setJudgement(result);

    // Save evidence to learner record
    try {
      void recordEvidence({
        lang: currentTask.toLang as any,
        at: Date.now(),
        room: 'ludus',
        skill: 'writing',
        outcome: result.outcome === 'right' && reqCheck.valid ? 'right' : 'wrong',
        item: { type: 'pattern', patternId: `translate:${currentTask.id}` },
        assisted: hintsRevealed > 0,
      });
    } catch {
      // Ignore background persistence errors
    }
  };

  const handleNextTask = () => {
    if (taskIndex < tasks.length - 1) {
      setTaskIndex(taskIndex + 1);
    } else {
      setTaskIndex(0);
    }
  };

  const handleSelfOverride = (verdict: 'exact' | 'wrong') => {
    if (!judgement) return;
    setJudgement({
      ...judgement,
      verdict,
      outcome: verdict === 'exact' ? 'right' : 'wrong',
    });
  };

  const revealNextHint = () => {
    if (!currentTask?.hints) return;
    if (hintsRevealed < currentTask.hints.length) {
      setHintsRevealed((prev) => prev + 1);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Header */}
      <PageHeader
        title={translateUi('Translating & Comparing')}
        eyebrow="Cursus › Translate"
      />
      <p className="text-xs text-sand-500 font-serif -mt-3"><UiText source={'Translate sentences, dialogues and idioms with literal contrasts and requirement checks'} /></p>

      {/* Main Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sand-300/40 pb-3 dark:border-sand-800/40">
        <div className="flex items-center gap-2">
          <Segmented
            label={translateUi('Translation mode')}
            value={activeTab}
            onChange={(v) => setActiveTab(v as TranslateTab)}
            options={[
              { value: 'practice', label: translateUi('Practice Sets') },
              { value: 'align', label: translateUi('Word Alignment') },
              { value: 'back', label: translateUi('Back-Translation') },
              { value: 'reconstruct', label: translateUi('Rebuild Original') },
              { value: 'compare', label: translateUi('Compare Languages') },
              { value: 'custom', label: translateUi('Translate Your Own') },
            ]}
          />
        </div>

        {/* Core Language Switcher */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-sand-500 font-serif mr-1"><UiText source={'Target Language:'} /></span>
          {CORE_LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              onClick={() => {
                setSelectedLang(lang.id);
                setTaskIndex(0);
              }}
              className={cx(
                'inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border transition-all',
                selectedLang === lang.id
                  ? 'border-terracotta-500 bg-terracotta-50 text-terracotta-800 font-medium dark:bg-terracotta-950/40 dark:text-terracotta-200 dark:border-terracotta-600'
                  : 'border-sand-200 bg-white/60 text-sand-600 hover:border-sand-300 dark:border-sand-800 dark:bg-sand-900/40 dark:text-sand-400',
              )}
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'practice' && (
        <div className="space-y-6">
          {/* Controls bar: Category filter, challenge timer */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-sand-50/70 p-3 rounded-xl border border-sand-200/60 dark:bg-sand-900/30 dark:border-sand-800/60">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-sand-600 dark:text-sand-400 mr-1"><UiText source={'Kind:'} /></span>
              {(['all', 'sentence', 'idiom', 'slang', 'formal', 'dialogue', 'paragraph'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setCategoryFilter(cat);
                    setTaskIndex(0);
                  }}
                  className={cx(
                    'px-2 py-0.5 text-xs rounded-md transition-colors capitalize',
                    categoryFilter === cat
                      ? 'bg-sand-800 text-white dark:bg-sand-100 dark:text-sand-900 font-medium'
                      : 'text-sand-600 hover:bg-sand-200/50 dark:text-sand-400 dark:hover:bg-sand-800/50',
                  )}
                >
                  {cat === 'all' ? translateUi('All Kinds') : cat}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {/* Timer Toggle */}
              <button
                onClick={() => setTimerEnabled(!timerEnabled)}
                className={cx(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border transition-colors',
                  timerEnabled
                    ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-700'
                    : 'text-sand-600 border-sand-300/80 hover:bg-sand-100 dark:text-sand-400 dark:border-sand-700',
                )}
                title={translateUi('Translation challenge with a timer')}
              >
                <Timer className="w-3.5 h-3.5" />
                <span>{timerEnabled ? translateUi('Timer: {0}s', [timerSeconds]) : translateUi('Timed Round')}</span>
              </button>

              <span className="text-xs text-sand-500 font-serif">
                {tasks.length > 0 ? translateUi('{0} of {1}', [taskIndex + 1, tasks.length]) : translateUi('0 tasks')}
              </span>
            </div>
          </div>

          {currentTask ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Main Exercise Card (8 cols) */}
              <div className="lg:col-span-8 space-y-5">
                <Card className="p-6 space-y-5 shadow-sm border-sand-300/60 dark:border-sand-800/60">
                  {/* Task Meta Header */}
                  <div className="flex items-center justify-between text-xs text-sand-500 border-b border-sand-100 pb-3 dark:border-sand-800/60">
                    <div className="flex items-center gap-2">
                      <Badge tone="neutral">
                        <span className="uppercase font-mono text-[10px]">{currentTask.category ?? 'sentence'}</span>
                      </Badge>
                      {currentTask.level && (
                        <span className="font-semibold text-sand-600 dark:text-sand-300"><UiText source={'Level {0}'} values={[currentTask.level]} /></span>
                      )}
                      {currentTask.register && (
                        <span className="italic text-sand-500"><UiText source={'({0} register)'} values={[currentTask.register]} /></span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-serif"><UiText source={'English → {0}'} values={[CORE_LANGUAGES.find((c) => c.id === selectedLang)?.label]} /></span>
                    </div>
                  </div>

                  {/* Source prompt */}
                  <div className="space-y-3">
                    <span className="text-xs font-semibold tracking-wider text-sand-400 uppercase"><UiText source={'Translate this {0}:'} values={[currentTask.category ?? 'sentence']} /></span>

                    {currentTask.dialogue ? (
                      <div className="space-y-2 bg-sand-50/60 p-4 rounded-xl border border-sand-200/50 dark:bg-sand-900/40 dark:border-sand-800/40 font-serif text-lg leading-relaxed">
                        {currentTask.dialogue.map((line, i) => (
                          <div key={i} className="flex gap-2">
                            <span className="font-semibold text-terracotta-700 dark:text-terracotta-400">{line.speaker}:</span>
                            <span className="text-sand-800 dark:text-sand-200">{line.source}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="font-serif text-2xl text-sand-900 dark:text-sand-100 leading-relaxed font-normal p-3 bg-sand-50/50 rounded-xl dark:bg-sand-900/30">
                        "{currentTask.source}"
                      </div>
                    )}
                  </div>

                  {/* Required constraints */}
                  {currentTask.requiredWord && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/60 text-xs text-amber-900 dark:bg-amber-950/30 dark:border-amber-800/40 dark:text-amber-200">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                      <span><UiText source={'{0} Your translation must include{1}{2}'} values={[<strong><UiText source={'Required word:'} /></strong>, ' ', <code className="px-1.5 py-0.5 rounded bg-amber-100 font-mono dark:bg-amber-900/50">
                          {currentTask.requiredWord}
                        </code>]} /></span>
                    </div>
                  )}

                  {/* Input form */}
                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-sand-600 dark:text-sand-400"><UiText source={'Your Translation:'} /></label>
                    <textarea
                      rows={currentTask.category === 'paragraph' ? 4 : 2}
                      value={userTranslation}
                      onChange={(e) => setUserTranslation(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || currentTask.category !== 'paragraph')) {
                          e.preventDefault();
                          if (!judgement) handleSubmit();
                        }
                      }}
                      disabled={!!judgement}
                      placeholder={translateUi('Type in {0}...', [CORE_LANGUAGES.find((c) => c.id === selectedLang)?.label])}
                      className="w-full p-3 font-serif text-lg rounded-xl border border-sand-300 bg-white focus:outline-none focus:ring-2 focus:ring-terracotta-500/30 focus:border-terracotta-500 dark:border-sand-700 dark:bg-sand-950 dark:text-sand-100 transition-all disabled:opacity-80"
                    />

                    {/* Hints & Actions bar */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {currentTask.hints && currentTask.hints.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={revealNextHint}
                            disabled={hintsRevealed >= currentTask.hints.length || !!judgement}
                            className="text-xs text-sand-600 hover:text-sand-900 dark:text-sand-400"
                          >
                            <Lightbulb className="w-3.5 h-3.5 mr-1 text-amber-500" />
                            {hintsRevealed === 0
                              ? translateUi('Show Hint')
                              : translateUi('Hint ({0}/{1})', [hintsRevealed, currentTask.hints.length])}
                          </Button>
                        )}

                        {currentTask.literal && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowLiteral(!showLiteral)}
                            className="text-xs text-sand-600 hover:text-sand-900 dark:text-sand-400"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1 text-blue-500" />
                            {showLiteral ? translateUi('Hide Literal') : translateUi('Show Literal Translation')}
                          </Button>
                        )}
                      </div>

                      {!judgement ? (
                        <Button
                          variant="primary"
                          onClick={handleSubmit}
                          disabled={!userTranslation.trim()}
                        ><UiText source={'Check Answer{0}'} values={[<ArrowRight className="w-4 h-4 ml-1" />]} /></Button>
                      ) : (
                        <Button variant="primary" onClick={handleNextTask}><UiText source={'Next Task{0}'} values={[<ArrowRight className="w-4 h-4 ml-1" />]} /></Button>
                      )}
                    </div>
                  </div>

                  {/* Revealed Hints */}
                  {hintsRevealed > 0 && currentTask.hints && (
                    <div className="space-y-1.5 p-3 rounded-lg bg-amber-50/50 border border-amber-200/50 dark:bg-amber-950/20 dark:border-amber-800/30">
                      <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 block"><UiText source={'Hints:'} /></span>
                      {currentTask.hints.slice(0, hintsRevealed).map((h, i) => (
                        <div key={i} className="text-xs text-amber-900/90 dark:text-amber-200 flex items-start gap-1.5">
                          <span className="text-amber-500 font-bold">•</span>
                          <span>{h}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Literal translation toggle display */}
                  {showLiteral && currentTask.literal && (
                    <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-200/50 text-xs text-blue-900 dark:bg-blue-950/20 dark:border-blue-800/30 dark:text-blue-200">
                      <span className="font-semibold block mb-0.5"><UiText source={'Word-by-word literal sense:'} /></span>
                      <p className="font-serif italic text-sm text-blue-950 dark:text-blue-100">
                        "{currentTask.literal}"
                      </p>
                    </div>
                  )}

                  {/* Post-Judgement Result Details */}
                  {judgement && (
                    <div className="space-y-4 pt-4 border-t border-sand-200/70 dark:border-sand-800/70">
                      {/* Verdict Banner */}
                      <div
                        className={cx(
                          'p-4 rounded-xl border flex items-start gap-3',
                          judgement.verdict === 'exact' && !missingReq
                            ? 'bg-sage-50 border-sage-200 text-sage-900 dark:bg-sage-950/30 dark:border-sage-800 dark:text-sage-200'
                            : judgement.verdict === 'close' && !missingReq
                            ? 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200'
                            : 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-200',
                        )}
                      >
                        {judgement.verdict === 'exact' && !missingReq ? (
                          <CheckCircle2 className="w-5 h-5 text-sage-600 dark:text-sage-400 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        )}

                        <div className="space-y-1 flex-1">
                          <div className="font-semibold text-sm">
                            {judgement.verdict === 'exact' && !missingReq
                              ? translateUi('Excellent translation!')
                              : judgement.verdict === 'close' && !missingReq
                              ? translateUi('Very close!')
                              : missingReq
                              ? translateUi('Missing requirement')
                              : translateUi('Not quite')}
                          </div>
                          {missingReq && (
                            <div className="text-xs text-rose-800 dark:text-rose-300 font-medium">
                              {missingReq}
                            </div>
                          )}
                          <div className="text-xs opacity-90"><UiText source={'{0}Natural translation:'} values={[timerEnabled && `Completed in ${timerSeconds} seconds. `]} /></div>
                          <div className="font-serif text-lg font-medium text-sand-950 dark:text-sand-100">
                            {currentTask.expected}
                          </div>
                        </div>

                        {/* Self-Rating Override options */}
                        <div className="flex items-center gap-1.5 shrink-0 self-center">
                          <button
                            onClick={() => handleSelfOverride('exact')}
                            title={translateUi('Mark as correct')}
                            className="px-2 py-1 text-xs rounded bg-white/80 border border-sand-300 hover:bg-white text-sand-700 dark:bg-sand-900 dark:border-sand-700 dark:text-sand-300"
                          ><UiText source={'I was right'} /></button>
                          <button
                            onClick={() => handleSelfOverride('wrong')}
                            title={translateUi('Mark as wrong')}
                            className="px-2 py-1 text-xs rounded bg-white/80 border border-sand-300 hover:bg-white text-sand-700 dark:bg-sand-900 dark:border-sand-700 dark:text-sand-300"
                          ><UiText source={'Mark wrong'} /></button>
                        </div>
                      </div>

                      {/* Reference Translations Comparison (F0776) */}
                      {currentTask.accepted && currentTask.accepted.length > 0 && (
                        <div className="p-4 rounded-xl bg-sand-50/70 border border-sand-200/60 space-y-2.5 dark:bg-sand-900/30 dark:border-sand-800/60">
                          <div className="flex items-center justify-between text-xs font-semibold text-sand-600 dark:text-sand-400">
                            <span className="flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-terracotta-600 dark:text-terracotta-400" />
                              <span><UiText source={'Reference Translations Comparison:'} /></span>
                            </span>
                            <span className="text-[11px] font-mono text-sand-400"><UiText source={'{0} accepted references'} values={[currentTask.accepted.length]} /></span>
                          </div>

                          <div className="space-y-2">
                            <div className="p-2.5 rounded-lg bg-white/90 border border-sand-200 text-xs dark:bg-sand-950/60 dark:border-sand-800">
                              <div className="text-[10px] font-mono text-sand-400 uppercase tracking-wider mb-0.5"><UiText source={'Learner Translation:'} /></div>
                              <div className="font-serif text-base font-medium text-sand-900 dark:text-sand-100">{userTranslation}</div>
                            </div>

                            {currentTask.accepted.map((alt, i) => (
                              <div key={i} className="p-2.5 rounded-lg bg-white/70 border border-sand-200/80 text-xs dark:bg-sand-950/40 dark:border-sand-800/70 flex items-start gap-2">
                                <span className="font-mono text-terracotta-600 dark:text-terracotta-400 text-[10px] font-bold mt-0.5 shrink-0"><UiText source={'Ref {0}:'} values={[i + 1]} /></span>
                                <div className="space-y-0.5 flex-1">
                                  <div className="font-serif text-base text-sand-800 dark:text-sand-200">{alt}</div>
                                  <div className="text-[11px] text-sand-500 italic">
                                    {i === 0
                                      ? translateUi('Primary canonical translation')
                                      : i === 1
                                      ? translateUi('Colloquial / alternate phrasing')
                                      : translateUi('Stylistic / regional variation')}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Why Direct Translation Fails / Linguistic Notes */}
                      {(currentTask.whyDirectFails || currentTask.notes) && (
                        <div className="p-3.5 rounded-xl bg-terracotta-50/40 border border-terracotta-200/60 dark:bg-terracotta-950/20 dark:border-terracotta-900/40 space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-terracotta-800 dark:text-terracotta-300">
                            <BookOpen className="w-3.5 h-3.5" />
                            <span><UiText source={'Linguistic Insight:'} /></span>
                          </div>
                          {currentTask.whyDirectFails && (
                            <div className="text-xs text-terracotta-950 dark:text-terracotta-200 leading-relaxed">
                              <strong><UiText source={'Why direct fails:'} /></strong> {currentTask.whyDirectFails}
                            </div>
                          )}
                          {currentTask.notes && (
                            <div className="text-xs text-sand-700 dark:text-sand-300 leading-relaxed font-serif">
                              {currentTask.notes}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              </div>

              {/* Sidebar Guide (4 cols) */}
              <div className="lg:col-span-4 space-y-4">
                <Card className="p-4 space-y-3 bg-sand-50/60 border-sand-200/70 dark:bg-sand-900/30 dark:border-sand-800/60">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-sand-600 dark:text-sand-300"><UiText source={'Translation Principles'} /></h3>
                  <div className="text-xs text-sand-600 dark:text-sand-400 space-y-2 leading-relaxed">
                    <p><UiText source={'{0} Word-for-word calques often sound stiff or meaningless. Natural translation captures the idiom and register of the native speaker.'} values={[<strong><UiText source={'Natural vs. Literal:'} /></strong>]} /></p>
                    <p><UiText source={'{0} Watch for syntactic shifts (such as German verb-second placement or Romance subjunctive clauses) triggered by matrix verbs.'} values={[<strong><UiText source={'Subjunctive & V2 Rules:'} /></strong>]} /></p>
                    <p><UiText source={'{0} Pay attention to formal address (usted, vous, Sie, Lei, Вы, 您) vs informal speech.'} values={[<strong><UiText source={'Registers:'} /></strong>]} /></p>
                  </div>
                </Card>

                {/* Progress in current set */}
                <Card className="p-4 space-y-2 border-sand-200/70 dark:border-sand-800/60">
                  <div className="flex justify-between text-xs text-sand-600 dark:text-sand-400">
                    <span><UiText source={'Task Progress'} /></span>
                    <span className="font-semibold">{taskIndex + 1} / {tasks.length}</span>
                  </div>
                  <div className="w-full bg-sand-200 h-1.5 rounded-full overflow-hidden dark:bg-sand-800">
                    <div
                      className="bg-terracotta-600 h-full transition-all duration-300"
                      style={{ width: `${((taskIndex + 1) / Math.max(1, tasks.length)) * 100}%` }}
                    />
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            <Card className="p-8 text-center text-sand-500"><UiText source={'No tasks found for this filter. Try selecting "All Kinds".'} /></Card>
          )}
        </div>
      )}

      {activeTab === 'align' && (
        <AlignmentView selectedLang={selectedLang} />
      )}

      {activeTab === 'back' && (
        <BackTranslationView selectedLang={selectedLang} />
      )}

      {activeTab === 'reconstruct' && (
        <ReconstructView selectedLang={selectedLang} />
      )}

      {activeTab === 'compare' && (
        <ContrastTableView />
      )}

      {activeTab === 'custom' && (
        /* Custom Translation / Translate Your Own Text (F0778, F0389) */
        <Card className="p-6 space-y-6 max-w-3xl mx-auto border-sand-300/70 dark:border-sand-800/70">
          <div className="space-y-1">
            <h2 className="text-lg font-serif font-semibold text-sand-900 dark:text-sand-100"><UiText source={'Translate Your Own Passage'} /></h2>
            <p className="text-xs text-sand-600 dark:text-sand-400 leading-relaxed"><UiText source={'Paste or type any paragraph, excerpt, or sentence to practice translating into{0}{1}.'} values={[' ', CORE_LANGUAGES.find((c) => c.id === selectedLang)?.label]} /></p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-sand-600 dark:text-sand-400">
              <span><UiText source={'Source Text (English or other):'} /></span>
              <span className="font-mono text-[11px] text-sand-400"><UiText source={'{0} words ·{1}{2} chars'} values={[customSource.trim() ? customSource.trim().split(/\s+/).length : 0, ' ', customSource.length]} /></span>
            </div>
            <textarea
              rows={4}
              value={customSource}
              onChange={(e) => {
                setCustomSource(e.target.value);
                setCustomSubmitted(false);
              }}
              placeholder={translateUi('Paste a paragraph, literary excerpt, or conversation here...')}
              className="w-full p-3 font-serif text-base rounded-xl border border-sand-300 bg-white focus:outline-none focus:ring-2 focus:ring-terracotta-500/30 focus:border-terracotta-500 dark:border-sand-700 dark:bg-sand-950 dark:text-sand-100"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-sand-600 dark:text-sand-400">
              <span><UiText source={'Your Translation ({0}):'} values={[CORE_LANGUAGES.find((c) => c.id === selectedLang)?.label]} /></span>
              <span className="font-mono text-[11px] text-sand-400"><UiText source={'{0} words'} values={[customTarget.trim() ? customTarget.trim().split(/\s+/).length : 0]} /></span>
            </div>
            <textarea
              rows={4}
              value={customTarget}
              onChange={(e) => {
                setCustomTarget(e.target.value);
                setCustomSubmitted(false);
              }}
              placeholder={translateUi('Translate into {0}...', [CORE_LANGUAGES.find((c) => c.id === selectedLang)?.label])}
              className="w-full p-3 font-serif text-base rounded-xl border border-sand-300 bg-white focus:outline-none focus:ring-2 focus:ring-terracotta-500/30 focus:border-terracotta-500 dark:border-sand-700 dark:bg-sand-950 dark:text-sand-100"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setCustomSource('');
                setCustomTarget('');
                setCustomSubmitted(false);
              }}
              disabled={!customSource && !customTarget}
            ><UiText source={'Clear'} /></Button>

            <Button
              variant="primary"
              onClick={() => setCustomSubmitted(true)}
              disabled={!customSource.trim() || !customTarget.trim()}
            ><UiText source={'Complete Passage Translation{0}'} values={[<Check className="w-4 h-4 ml-1" />]} /></Button>
          </div>

          {customSubmitted && (
            <div className="p-4 rounded-xl bg-sage-50/70 border border-sage-200/80 space-y-3 dark:bg-sage-950/30 dark:border-sage-800">
              <div className="flex items-center gap-2 text-sage-800 dark:text-sage-200 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4 text-sage-600" />
                <span><UiText source={'Passage Translation Logged'} /></span>
              </div>
              <p className="text-xs text-sage-900/80 dark:text-sage-300 leading-relaxed font-serif"><UiText source={'You translated a {0}-word passage into{1}{2} ({3} words).'} values={[customSource.trim().split(/\s+/).length, ' ', CORE_LANGUAGES.find((c) => c.id === selectedLang)?.label, customTarget.trim().split(/\s+/).length]} /></p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
