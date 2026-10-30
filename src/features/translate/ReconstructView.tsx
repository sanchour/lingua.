import { UiText, useUi } from '@/design/i18n/UiText';
import { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle2, RotateCcw, Shuffle, Sparkles, Undo2, XCircle } from 'lucide-react';
import { Card, Button, Badge } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { TRANSLATION_PAIRS } from '@/core/exercise/translate';
import { scrambleWords, checkReconstruction } from '@/core/exercise/translateViews';

interface ReconstructViewProps {
  selectedLang: string;
}

export function ReconstructView({ selectedLang }: ReconstructViewProps) {
  const translateUi = useUi();
  const availableTasks = TRANSLATION_PAIRS.filter((p) => p.toLang === selectedLang);
  const [taskIndex, setTaskIndex] = useState(0);

  // Phases: 1 (Translate into foreign), 2 (Reconstruct original English)
  const [phase, setPhase] = useState<1 | 2>(1);

  const [translationInput, setTranslationInput] = useState('');
  const [availableTiles, setAvailableTiles] = useState<string[]>([]);
  const [assembledTiles, setAssembledTiles] = useState<string[]>([]);
  const [reconstructResult, setReconstructResult] = useState<'success' | 'incorrect' | null>(null);

  const currentTask = availableTasks[taskIndex] ?? availableTasks[0];

  useEffect(() => {
    if (currentTask) {
      const { tiles } = scrambleWords(currentTask.source);
      setAvailableTiles(tiles);
      setAssembledTiles([]);
      setReconstructResult(null);
      setTranslationInput('');
      setPhase(1);
    }
  }, [taskIndex, currentTask]);

  if (!currentTask) {
    return (
      <Card className="p-8 text-center text-sand-500"><UiText source={'No sentences available for reconstruction in this language.'} /></Card>
    );
  }

  const handleTranslateSubmit = () => {
    if (!translationInput.trim()) return;
    setPhase(2);
  };

  const handleTileClick = (word: string, indexInAvailable: number) => {
    setAssembledTiles((prev) => [...prev, word]);
    setAvailableTiles((prev) => prev.filter((_, idx) => idx !== indexInAvailable));
    setReconstructResult(null);
  };

  const handleUndo = () => {
    if (assembledTiles.length === 0) return;
    const lastWord = assembledTiles[assembledTiles.length - 1];
    setAssembledTiles((prev) => prev.slice(0, -1));
    setAvailableTiles((prev) => [...prev, lastWord]);
    setReconstructResult(null);
  };

  const handleResetTiles = () => {
    const { tiles } = scrambleWords(currentTask.source);
    setAvailableTiles(tiles);
    setAssembledTiles([]);
    setReconstructResult(null);
  };

  const handleVerifyReconstruction = () => {
    const isCorrect = checkReconstruction(assembledTiles, currentTask.source);
    setReconstructResult(isCorrect ? 'success' : 'incorrect');
  };

  const handleNextTask = () => {
    if (taskIndex < availableTasks.length - 1) {
      setTaskIndex(taskIndex + 1);
    } else {
      setTaskIndex(0);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-sand-50/70 p-3 rounded-xl border border-sand-200/60 dark:bg-sand-900/30 dark:border-sand-800/60">
        <div className="flex items-center gap-2">
          <Shuffle className="w-4 h-4 text-terracotta-600 dark:text-terracotta-400" />
          <span className="text-xs font-semibold text-sand-700 dark:text-sand-300"><UiText source={'Translate, Then Reconstruct the Original'} /></span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cx(
              'px-2 py-0.5 rounded text-[11px] font-mono',
              phase === 1
                ? 'bg-terracotta-500 text-white font-bold'
                : 'bg-sand-200 text-sand-600 dark:bg-sand-800 dark:text-sand-400',
            )}
          ><UiText source={'1. Translate'} /></span>
          <span className="text-sand-400">→</span>
          <span
            className={cx(
              'px-2 py-0.5 rounded text-[11px] font-mono',
              phase === 2
                ? 'bg-terracotta-500 text-white font-bold'
                : 'bg-sand-200 text-sand-600 dark:bg-sand-800 dark:text-sand-400',
            )}
          ><UiText source={'2. Rebuild Original'} /></span>
        </div>
      </div>

      <Card className="p-6 space-y-6 border-sand-300/70 dark:border-sand-800/70">
        {phase === 1 ? (
          <div className="space-y-5">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-sand-400"><UiText source={'Phase 1: Translate into {0}'} values={[selectedLang.toUpperCase()]} /></span>
              <p className="font-serif text-2xl text-sand-900 dark:text-sand-100 p-4 bg-sand-50/50 rounded-xl dark:bg-sand-900/30">
                "{currentTask.source}"
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-sand-600 dark:text-sand-400"><UiText source={'Your translation into {0}:'} values={[selectedLang.toUpperCase()]} /></label>
              <textarea
                rows={2}
                value={translationInput}
                onChange={(e) => setTranslationInput(e.target.value)}
                placeholder={translateUi('Type in {0}...', [selectedLang.toUpperCase()])}
                className="w-full p-3 font-serif text-lg rounded-xl border border-sand-300 bg-white focus:outline-none focus:ring-2 focus:ring-terracotta-500/30 focus:border-terracotta-500 dark:border-sand-700 dark:bg-sand-950 dark:text-sand-100"
              />
            </div>

            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={handleTranslateSubmit}
                disabled={!translationInput.trim()}
              ><UiText source={'Proceed to Rebuild Original{0}'} values={[<ArrowRight className="w-4 h-4 ml-1" />]} /></Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-sand-400"><UiText source={'Phase 2: Reconstruct Original from Memory & Translation'} /></span>
                <Badge tone="neutral">
                  <span className="text-[10px] font-mono"><UiText source={'English hidden'} /></span>
                </Badge>
              </div>
              <p className="text-xs text-sand-500"><UiText source={'Using your translation below, tap the scrambled word tiles in exact order to rebuild the original English prompt.'} /></p>
            </div>

            {/* Translation memory anchor */}
            <div className="p-4 rounded-xl bg-terracotta-50/50 border border-terracotta-200/60 dark:bg-terracotta-950/20 dark:border-terracotta-900/40 space-y-1">
              <span className="text-xs font-semibold text-terracotta-800 dark:text-terracotta-300"><UiText source={'Your Translation ({0}):'} values={[selectedLang.toUpperCase()]} /></span>
              <p className="font-serif text-xl text-sand-900 dark:text-sand-100">
                "{translationInput}"
              </p>
            </div>

            {/* Assembled sentence drop area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-sand-600 dark:text-sand-400">
                <span><UiText source={'Reconstructed English Sentence:'} /></span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleUndo}
                    disabled={assembledTiles.length === 0}
                    className="text-xs text-sand-500 hover:text-sand-800 disabled:opacity-40 inline-flex items-center gap-1"
                  ><UiText source={'{0} Undo'} values={[<Undo2 className="w-3.5 h-3.5" />]} /></button>
                  <button
                    onClick={handleResetTiles}
                    disabled={assembledTiles.length === 0}
                    className="text-xs text-sand-500 hover:text-sand-800 disabled:opacity-40 inline-flex items-center gap-1"
                  ><UiText source={'{0} Reset'} values={[<RotateCcw className="w-3.5 h-3.5" />]} /></button>
                </div>
              </div>

              <div className="min-h-[64px] p-4 rounded-xl border border-dashed border-sand-300 bg-sand-50/50 dark:border-sand-700 dark:bg-sand-900/20 flex flex-wrap gap-2 items-center">
                {assembledTiles.length === 0 ? (
                  <span className="text-xs text-sand-400 italic"><UiText source={'Tap words below to assemble the original English sentence in order...'} /></span>
                ) : (
                  assembledTiles.map((word, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-lg bg-terracotta-500 text-white font-serif text-base font-medium shadow-sm animate-in fade-in zoom-in-95 duration-150"
                    >
                      {word}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Available scrambled word tiles */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-sand-500 uppercase font-mono block"><UiText source={'Available Word Tiles:'} /></span>
              <div className="flex flex-wrap gap-2">
                {availableTiles.map((word, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleTileClick(word, idx)}
                    className="px-3.5 py-2 rounded-xl bg-white border border-sand-200 text-sand-800 hover:border-terracotta-400 hover:bg-terracotta-50/30 text-base font-serif shadow-sm transition-all cursor-pointer dark:bg-sand-900 dark:border-sand-700 dark:text-sand-200 active:scale-95"
                  >
                    {word}
                  </button>
                ))}
              </div>
            </div>

            {/* Verification result */}
            {reconstructResult && (
              <div
                className={cx(
                  'p-4 rounded-xl border flex items-center gap-3',
                  reconstructResult === 'success'
                    ? 'bg-sage-50 border-sage-200 text-sage-900 dark:bg-sage-950/30 dark:border-sage-800 dark:text-sage-200'
                    : 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-200',
                )}
              >
                {reconstructResult === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-sage-600 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <div className="flex-1 text-sm font-medium">
                  {reconstructResult === 'success' ? (
                    <div>
                      <span><UiText source={'Perfect reconstruction! Both directions aligned successfully.'} /></span>
                      <div className="font-serif text-base font-semibold mt-1">
                        "{currentTask.source}" ↔ "{currentTask.expected}"
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span><UiText source={'Not quite in original word order. Try adjusting the tiles.'} /></span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex justify-between items-center pt-2">
              <Button variant="secondary" onClick={() => setPhase(1)}><UiText source={'Back to Translation'} /></Button>

              {reconstructResult === 'success' ? (
                <Button variant="primary" onClick={handleNextTask}><UiText source={'Next Sentence{0}'} values={[<ArrowRight className="w-4 h-4 ml-1" />]} /></Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleVerifyReconstruction}
                  disabled={availableTiles.length > 0}
                ><UiText source={'Verify Reconstructed Sentence{0}'} values={[<Sparkles className="w-4 h-4 ml-1" />]} /></Button>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
