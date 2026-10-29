import { useState } from 'react';
import { ArrowRight, CheckCircle2, RefreshCw, Repeat, Sparkles } from 'lucide-react';
import { Card, Button, Badge } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { TRANSLATION_PAIRS } from '@/core/exercise/translate';
import { analyzeBackTranslation } from '@/core/exercise/translateViews';

interface BackTranslationViewProps {
  selectedLang: string;
}

export function BackTranslationView({ selectedLang }: BackTranslationViewProps) {
  const availableTasks = TRANSLATION_PAIRS.filter((p) => p.toLang === selectedLang);
  const [taskIndex, setTaskIndex] = useState(0);

  // Phases: 1 (Forward), 2 (Back), 3 (Comparison)
  const [phase, setPhase] = useState<1 | 2 | 3>(1);

  const [forwardText, setForwardText] = useState('');
  const [backText, setBackText] = useState('');

  const currentTask = availableTasks[taskIndex] ?? availableTasks[0];

  const handleForwardSubmit = () => {
    if (!forwardText.trim()) return;
    setPhase(2);
  };

  const handleBackSubmit = () => {
    if (!backText.trim()) return;
    setPhase(3);
  };

  const handleReset = () => {
    setForwardText('');
    setBackText('');
    setPhase(1);
  };

  const handleNextSentence = () => {
    if (taskIndex < availableTasks.length - 1) {
      setTaskIndex(taskIndex + 1);
    } else {
      setTaskIndex(0);
    }
    handleReset();
  };

  if (!currentTask) {
    return (
      <Card className="p-8 text-center text-sand-500">
        No sentences available for back-translation in this language.
      </Card>
    );
  }

  const analysis = phase === 3 ? analyzeBackTranslation(currentTask.source, backText) : null;

  return (
    <div className="space-y-6">
      {/* Step Progress Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-sand-50/70 p-3 rounded-xl border border-sand-200/60 dark:bg-sand-900/30 dark:border-sand-800/60">
        <div className="flex items-center gap-2">
          <Repeat className="w-4 h-4 text-terracotta-600 dark:text-terracotta-400" />
          <span className="text-xs font-semibold text-sand-700 dark:text-sand-300">
            Back-Translation Exercise (Round-Trip Fidelity)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span
              className={cx(
                'px-2 py-0.5 rounded text-[11px] font-mono',
                phase === 1
                  ? 'bg-terracotta-500 text-white font-bold'
                  : 'bg-sand-200 text-sand-600 dark:bg-sand-800 dark:text-sand-400',
              )}
            >
              1. Forward
            </span>
            <span className="text-sand-400">→</span>
            <span
              className={cx(
                'px-2 py-0.5 rounded text-[11px] font-mono',
                phase === 2
                  ? 'bg-terracotta-500 text-white font-bold'
                  : 'bg-sand-200 text-sand-600 dark:bg-sand-800 dark:text-sand-400',
              )}
            >
              2. Back
            </span>
            <span className="text-sand-400">→</span>
            <span
              className={cx(
                'px-2 py-0.5 rounded text-[11px] font-mono',
                phase === 3
                  ? 'bg-sage-600 text-white font-bold'
                  : 'bg-sand-200 text-sand-600 dark:bg-sand-800 dark:text-sand-400',
              )}
            >
              3. Drift Analysis
            </span>
          </div>

          <span className="text-xs text-sand-400">
            {taskIndex + 1} of {availableTasks.length}
          </span>
        </div>
      </div>

      {/* Main Card */}
      <Card className="p-6 space-y-6 border-sand-300/70 dark:border-sand-800/70">
        {phase === 1 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-sand-400">
                Step 1: Translate into {selectedLang.toUpperCase()}
              </span>
              <p className="font-serif text-2xl text-sand-900 dark:text-sand-100 p-4 bg-sand-50/50 rounded-xl dark:bg-sand-900/30">
                "{currentTask.source}"
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-sand-600 dark:text-sand-400">
                Your translation into {selectedLang.toUpperCase()}:
              </label>
              <textarea
                rows={2}
                value={forwardText}
                onChange={(e) => setForwardText(e.target.value)}
                placeholder="Type your translation here..."
                className="w-full p-3 font-serif text-lg rounded-xl border border-sand-300 bg-white focus:outline-none focus:ring-2 focus:ring-terracotta-500/30 focus:border-terracotta-500 dark:border-sand-700 dark:bg-sand-950 dark:text-sand-100"
              />
            </div>

            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={handleForwardSubmit}
                disabled={!forwardText.trim()}
              >
                Next: Translate Back to English
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {phase === 2 && (
          <div className="space-y-5">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-sand-400">
                  Step 2: Back-Translation into English
                </span>
                <Badge tone="neutral">
                  <span className="text-[10px] font-mono">Original English hidden</span>
                </Badge>
              </div>
              <p className="text-xs text-sand-500">
                Without looking at the original English, translate your foreign version back into English to test semantic fidelity.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-terracotta-50/40 border border-terracotta-200/50 dark:bg-terracotta-950/20 dark:border-terracotta-900/40 space-y-1">
              <span className="text-xs font-semibold text-terracotta-800 dark:text-terracotta-300">
                Your Foreign Sentence:
              </span>
              <p className="font-serif text-xl text-sand-900 dark:text-sand-100">
                "{forwardText}"
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-sand-600 dark:text-sand-400">
                Translate back into English:
              </label>
              <textarea
                rows={2}
                value={backText}
                onChange={(e) => setBackText(e.target.value)}
                placeholder="Type the English back-translation..."
                className="w-full p-3 font-serif text-lg rounded-xl border border-sand-300 bg-white focus:outline-none focus:ring-2 focus:ring-terracotta-500/30 focus:border-terracotta-500 dark:border-sand-700 dark:bg-sand-950 dark:text-sand-100"
              />
            </div>

            <div className="flex justify-between items-center">
              <Button variant="secondary" onClick={() => setPhase(1)}>
                Back to Step 1
              </Button>
              <Button
                variant="primary"
                onClick={handleBackSubmit}
                disabled={!backText.trim()}
              >
                Analyze Drift & Compare
                <Sparkles className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {phase === 3 && analysis && (
          <div className="space-y-6">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-sand-400">
                  Step 3: Round-Trip Drift Analysis
                </span>
                <span
                  className={cx(
                    'px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider',
                    analysis.verdict === 'preserved'
                      ? 'bg-sage-100 text-sage-800 dark:bg-sage-950 dark:text-sage-200'
                      : analysis.verdict === 'slight_shift'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200',
                  )}
                >
                  {analysis.verdict === 'preserved'
                    ? 'Meaning Preserved'
                    : analysis.verdict === 'slight_shift'
                    ? 'Slight Lexical Shift'
                    : 'Semantic Drift Detected'}
                </span>
              </div>
              <p className="text-xs text-sand-500">
                Comparing original English with round-trip back-translation.
              </p>
            </div>

            {/* Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-sand-50/70 border border-sand-200 dark:bg-sand-900/30 dark:border-sand-800 space-y-1.5">
                <span className="text-xs font-semibold text-sand-500 uppercase font-mono">
                  1. Original English Prompt:
                </span>
                <p className="font-serif text-lg text-sand-900 dark:text-sand-100">
                  "{currentTask.source}"
                </p>
              </div>

              <div className="p-4 rounded-xl bg-sand-50/70 border border-sand-200 dark:bg-sand-900/30 dark:border-sand-800 space-y-1.5">
                <span className="text-xs font-semibold text-sand-500 uppercase font-mono">
                  2. Your Back-Translation:
                </span>
                <p className="font-serif text-lg text-sand-900 dark:text-sand-100">
                  "{backText}"
                </p>
              </div>
            </div>

            {/* Intermediate foreign translation */}
            <div className="p-3 rounded-lg bg-sand-50/40 border border-sand-200/50 text-xs text-sand-600 dark:text-sand-400 flex items-center justify-between">
              <div>
                <span className="font-semibold">Intermediate {selectedLang.toUpperCase()}: </span>
                <span className="font-serif italic text-sand-800 dark:text-sand-200">"{forwardText}"</span>
              </div>
              <div className="text-[11px] font-mono text-sand-400">
                Model: "{currentTask.expected}"
              </div>
            </div>

            {/* Verdict Note */}
            <div className="p-4 rounded-xl bg-sand-50 border border-sand-200/80 dark:bg-sand-900/40 dark:border-sand-800/70 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-sand-800 dark:text-sand-200">
                <CheckCircle2 className="w-4 h-4 text-terracotta-600" />
                <span>Round-Trip Evaluation:</span>
              </div>
              <p className="text-xs text-sand-700 dark:text-sand-300 font-serif leading-relaxed pl-6">
                {analysis.note}
              </p>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button variant="secondary" onClick={handleReset}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Try Again
              </Button>

              <Button variant="primary" onClick={handleNextSentence}>
                Next Sentence
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
