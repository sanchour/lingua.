import { UiText, useUi } from '@/design/i18n/UiText';
import { useState } from 'react';
import { BookOpen, Layers, Sparkles } from 'lucide-react';
import { Card, Badge } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { ALIGNMENT_PAIRS, type AlignmentPair, type TokenLink } from '@/core/exercise/translateViews';

interface AlignmentViewProps {
  selectedLang: string;
}

export function AlignmentView({ selectedLang }: AlignmentViewProps) {
  const translateUi = useUi();
  const pairs = ALIGNMENT_PAIRS.filter((p) => p.toLang === selectedLang);
  const [selectedPairIndex, setSelectedPairIndex] = useState(0);
  const [hoveredLink, setHoveredLink] = useState<TokenLink | null>(null);
  const [hoveredSourceIdx, setHoveredSourceIdx] = useState<number | null>(null);
  const [hoveredTargetIdx, setHoveredTargetIdx] = useState<number | null>(null);

  const currentPair: AlignmentPair | undefined = pairs[selectedPairIndex] ?? pairs[0];

  if (!currentPair) {
    return (
      <Card className="p-8 text-center text-sand-500"><UiText source={'No alignment pairs available for this language yet.'} /></Card>
    );
  }

  // Active link helper
  const activeLink = hoveredLink ?? (
    hoveredSourceIdx !== null
      ? currentPair.links.find((l) => l.sourceIndices.includes(hoveredSourceIdx))
      : hoveredTargetIdx !== null
      ? currentPair.links.find((l) => l.targetIndices.includes(hoveredTargetIdx))
      : null
  );

  return (
    <div className="space-y-6">
      {/* Pair picker header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-sand-50/70 p-3 rounded-xl border border-sand-200/60 dark:bg-sand-900/30 dark:border-sand-800/60">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-terracotta-600 dark:text-terracotta-400" />
          <span className="text-xs font-semibold text-sand-700 dark:text-sand-300"><UiText source={'Word-by-Word Alignment & Sentence Structure'} /></span>
        </div>

        {pairs.length > 1 && (
          <div className="flex items-center gap-1.5">
            {pairs.map((p, i) => (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedPairIndex(i);
                  setHoveredLink(null);
                  setHoveredSourceIdx(null);
                  setHoveredTargetIdx(null);
                }}
                className={cx(
                  'px-2.5 py-1 text-xs rounded-lg border transition-all',
                  selectedPairIndex === i
                    ? 'border-terracotta-500 bg-terracotta-50 text-terracotta-800 font-semibold dark:bg-terracotta-950/40 dark:text-terracotta-200'
                    : 'border-sand-200 bg-white text-sand-600 hover:border-sand-300 dark:border-sand-800 dark:bg-sand-900 dark:text-sand-400',
                )}
              ><UiText source={'Sentence {0}'} values={[i + 1]} /></button>
            ))}
          </div>
        )}
      </div>

      {/* Main Interactive Visualizer Card */}
      <Card className="p-6 space-y-8 border-sand-300/70 dark:border-sand-800/70">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sand-400 uppercase tracking-wider"><UiText source={'Interactive Cross-Language Token Mapping'} /></span>
            <Badge tone="neutral">
              <span className="text-[10px] font-mono uppercase"><UiText source={'Hover words to trace syntax'} /></span>
            </Badge>
          </div>
          <p className="text-xs text-sand-500"><UiText source={'Hover over tokens on either row to trace semantic correspondence and structural word-order shifts.'} /></p>
        </div>

        {/* Alignment Canvas */}
        <div className="relative py-6 px-4 bg-sand-50/50 rounded-2xl border border-sand-200/50 dark:bg-sand-900/20 dark:border-sand-800/50 space-y-10">
          {/* Source Tokens Row */}
          <div className="space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-wider text-sand-400"><UiText source={'Source (English):'} /></div>
            <div className="flex flex-wrap gap-2.5 items-center">
              {currentPair.sourceTokens.map((token, idx) => {
                const isLinked = activeLink?.sourceIndices.includes(idx);
                return (
                  <button
                    key={idx}
                    onMouseEnter={() => setHoveredSourceIdx(idx)}
                    onMouseLeave={() => setHoveredSourceIdx(null)}
                    className={cx(
                      'px-3 py-1.5 rounded-xl font-serif text-lg transition-all duration-200 border cursor-pointer select-none',
                      isLinked
                        ? 'bg-terracotta-500 text-white border-terracotta-600 shadow-sm scale-105'
                        : 'bg-white text-sand-800 border-sand-200 hover:border-sand-400 dark:bg-sand-900 dark:text-sand-100 dark:border-sand-700',
                    )}
                  >
                    {token}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Center Connector Arcs Indicator */}
          <div className="flex items-center justify-center gap-2 py-1 text-xs text-sand-400">
            <div className="h-px bg-sand-200 flex-1 dark:bg-sand-800" />
            <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-sand-100 dark:bg-sand-800">
              {activeLink ? (activeLink.label ?? translateUi('Aligned link')) : translateUi('↕ syntax alignment')}
            </span>
            <div className="h-px bg-sand-200 flex-1 dark:bg-sand-800" />
          </div>

          {/* Target Tokens Row */}
          <div className="space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-wider text-sand-400"><UiText source={'Target ({0}):'} values={[selectedPairIndex >= 0 ? selectedLang.toUpperCase() : '']} /></div>
            <div className="flex flex-wrap gap-2.5 items-center">
              {currentPair.targetTokens.map((token, idx) => {
                const isLinked = activeLink?.targetIndices.includes(idx);
                return (
                  <button
                    key={idx}
                    onMouseEnter={() => setHoveredTargetIdx(idx)}
                    onMouseLeave={() => setHoveredTargetIdx(null)}
                    className={cx(
                      'px-3 py-1.5 rounded-xl font-serif text-lg transition-all duration-200 border cursor-pointer select-none',
                      isLinked
                        ? 'bg-sage-600 text-white border-sage-700 shadow-sm scale-105'
                        : 'bg-white text-sand-800 border-sand-200 hover:border-sand-400 dark:bg-sand-900 dark:text-sand-100 dark:border-sand-700',
                    )}
                  >
                    {token}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Link Detail Card */}
        {activeLink && (
          <div className="p-4 rounded-xl bg-terracotta-50/60 border border-terracotta-200/70 dark:bg-terracotta-950/30 dark:border-terracotta-900/50 space-y-1.5 transition-all">
            <div className="flex items-center gap-2 text-xs font-semibold text-terracotta-900 dark:text-terracotta-200">
              <Sparkles className="w-4 h-4 text-terracotta-600" />
              <span><UiText source={'Token Correspondence:'} /></span>
              <span className="font-serif text-sm font-bold">
                "{activeLink.sourceIndices.map((i) => currentPair.sourceTokens[i]).join(' ')}"
                {' ↔ '}
                "{activeLink.targetIndices.map((i) => currentPair.targetTokens[i]).join(' ')}"
              </span>
            </div>
            {activeLink.note && (
              <p className="text-xs text-terracotta-950/80 dark:text-terracotta-300 font-serif leading-relaxed pl-6">
                {activeLink.note}
              </p>
            )}
          </div>
        )}

        {/* Structural Shift Explanatory Card */}
        {currentPair.shiftNote && (
          <div className="p-4 rounded-xl bg-sand-50/80 border border-sand-200/70 dark:bg-sand-900/40 dark:border-sand-800/60 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-sand-800 dark:text-sand-200">
              <BookOpen className="w-4 h-4 text-sand-600 dark:text-sand-400" />
              <span><UiText source={'Sentence Structure Contrast:'} /></span>
            </div>
            <p className="text-xs text-sand-700 dark:text-sand-300 leading-relaxed font-serif pl-6">
              {currentPair.shiftNote}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
