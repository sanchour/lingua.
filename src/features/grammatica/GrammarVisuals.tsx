import { useState } from 'react';
import type {
  GrammarTimelineData,
  GrammarTimelinePoint,
  WordOrderData,
  DecisionNode,
  DecisionBranch,
  SentenceDiagramData,
  MorphologyBreakdownData,
} from '@/core/grammar/types';
import { cx } from '@/lib/cx';
import { isRtl } from '@/core/lang/languages';
import { ChevronRight, HelpCircle, ArrowRight } from 'lucide-react';

/** Fine-line Tense Timeline (F0217) drawn according to handbook guidelines. */
export function TenseTimeline({ timeline, lang }: { timeline: GrammarTimelineData; lang: string }) {
  const [selectedPoint, setSelectedPoint] = useState<GrammarTimelinePoint | null>(timeline.points[0] ?? null);
  const rtl = isRtl(lang);

  // Map position strings to horizontal percentage along 0..100
  const posMap: Record<string, number> = {
    'past-far': 15,
    past: 30,
    'past-recent': 42,
    now: 58,
    'future-near': 75,
    future: 88,
  };

  return (
    <div className="rounded-2xl border border-line/70 bg-card p-4 sm:p-5">
      {timeline.title && (
        <h3 className="mb-3 text-[14px] font-semibold text-ink-soft">{timeline.title}</h3>
      )}

      {/* SVG Fine-line timeline */}
      <div className="relative my-4 overflow-hidden rounded-xl border border-line/40 bg-sunken/40 px-3 py-6 sm:px-6">
        <svg
          viewBox="0 0 600 80"
          className="h-20 w-full overflow-visible"
          role="img"
          aria-label={timeline.title ?? 'Tense Timeline'}
        >
          <defs>
            <marker
              id="timeline-arrow"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="currentColor" className="text-ink-faint" />
            </marker>
          </defs>

          {/* Main timeline axis - fine line */}
          <line
            x1="20"
            y1="40"
            x2="580"
            y2="40"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            className="text-line"
            markerEnd="url(#timeline-arrow)"
          />

          {/* "Past" and "Future" zone labels */}
          <text x="30" y="20" className="fill-ink-faint text-[10px] uppercase tracking-wider font-semibold">
            Past
          </text>
          <text x="530" y="20" className="fill-ink-faint text-[10px] uppercase tracking-wider font-semibold">
            Future
          </text>

          {/* "Now" vertical marker */}
          <line
            x1="350"
            y1="25"
            x2="350"
            y2="55"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeDasharray="2 2"
            strokeLinecap="round"
            className="text-accent"
          />
          <circle cx="350" cy="40" r="4.5" fill="var(--bg)" stroke="var(--accent)" strokeWidth="1.5" />
          <text x="350" y="70" textAnchor="middle" className="fill-accent-text text-[11px] font-bold">
            Now
          </text>

          {/* Interactive event points along the line */}
          {timeline.points.map((pt, i) => {
            const pct = posMap[pt.position] ?? 50;
            const cxPos = 20 + (pct / 100) * 540;
            const isSelected = selectedPoint === pt;

            if (pt.kind === 'continuous' || pt.kind === 'habitual') {
              return (
                <g
                  key={i}
                  className="cursor-pointer transition-opacity hover:opacity-90"
                  onClick={() => setSelectedPoint(pt)}
                >
                  {/* Shaded interval bracket */}
                  <rect
                    x={cxPos - 45}
                    y="32"
                    width="90"
                    height="16"
                    rx="8"
                    fill="var(--accent)"
                    fillOpacity={isSelected ? '0.22' : '0.10'}
                    stroke="var(--accent)"
                    strokeWidth="1"
                    strokeDasharray="3 2"
                  />
                  <circle cx={cxPos} cy="40" r="3" fill="var(--accent)" />
                  <text
                    x={cxPos}
                    y="22"
                    textAnchor="middle"
                    className={cx('text-[11px] font-medium transition-colors', isSelected ? 'fill-accent-text font-bold' : 'fill-ink-soft')}
                  >
                    {pt.tense}
                  </text>
                </g>
              );
            }

            return (
              <g
                key={i}
                className="cursor-pointer transition-opacity hover:opacity-90"
                onClick={() => setSelectedPoint(pt)}
              >
                <line
                  x1={cxPos}
                  y1="30"
                  x2={cxPos}
                  y2="50"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  className={isSelected ? 'text-accent' : 'text-ink-soft'}
                />
                <circle
                  cx={cxPos}
                  cy="40"
                  r={isSelected ? '5.5' : '4'}
                  fill={isSelected ? 'var(--accent)' : 'var(--bg)'}
                  stroke={isSelected ? 'var(--accent)' : 'currentColor'}
                  strokeWidth="1.4"
                  className={isSelected ? '' : 'text-ink-soft'}
                />
                <text
                  x={cxPos}
                  y="22"
                  textAnchor="middle"
                  className={cx('text-[11px] transition-colors', isSelected ? 'fill-accent-text font-bold' : 'fill-ink-soft font-medium')}
                >
                  {pt.tense}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Point details and active example */}
      {selectedPoint && (
        <div className="rounded-xl border border-line/60 bg-sunken/30 p-3.5 transition-all">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[13.5px] font-semibold text-ink">{selectedPoint.label}</span>
            <span className="rounded bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent-text uppercase tracking-wider">
              {selectedPoint.tense}
            </span>
          </div>
          {selectedPoint.example && (
            <p
              lang={lang}
              dir={rtl ? 'rtl' : undefined}
              className="mt-2 font-serif text-[15px] italic text-ink"
            >
              “{selectedPoint.example}”
            </p>
          )}
        </div>
      )}

      {timeline.note && (
        <p className="mt-2.5 text-[12.5px] leading-snug text-ink-faint">{timeline.note}</p>
      )}
    </div>
  );
}

/** Fine-line Word Order Visualizer (F0215). */
export function WordOrderVisualizer({ wordOrder, lang }: { wordOrder: WordOrderData; lang: string }) {
  const rtl = isRtl(lang);

  return (
    <div className="rounded-2xl border border-line/70 bg-card p-4 sm:p-5">
      {wordOrder.title && (
        <h3 className="mb-3 text-[14px] font-semibold text-ink-soft">{wordOrder.title}</h3>
      )}

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-center gap-2 sm:gap-2.5 py-1">
          {wordOrder.slots.map((slot, i) => (
            <div key={i} className="flex items-center gap-2 sm:gap-2.5">
              <div
                className={cx(
                  'flex flex-col rounded-xl px-3.5 py-2.5 transition-colors sm:px-4 sm:py-3',
                  slot.highlight
                    ? 'border-2 border-accent bg-accent-soft/30 text-ink shadow-xs'
                    : slot.optional
                      ? 'border border-dashed border-line/80 bg-sunken/30 text-ink-soft'
                      : 'border border-line/80 bg-sunken/60 text-ink',
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span className={cx('text-[12px] font-bold tracking-wide uppercase', slot.highlight ? 'text-accent-text' : 'text-ink-faint')}>
                    {slot.role}
                  </span>
                  {slot.optional && (
                    <span className="rounded bg-sunken px-1 text-[10px] text-ink-faint">opt</span>
                  )}
                </div>
                {slot.example && (
                  <span
                    lang={lang}
                    dir={rtl ? 'rtl' : undefined}
                    className={cx('mt-1 font-serif text-[15px]', slot.highlight ? 'font-bold text-accent-text' : 'text-ink')}
                  >
                    {slot.example}
                  </span>
                )}
              </div>

              {i < wordOrder.slots.length - 1 && (
                <ArrowRight
                  size={16}
                  strokeWidth={1.4}
                  className="shrink-0 text-ink-faint"
                  aria-hidden
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {wordOrder.note && (
        <p className="mt-2.5 text-[12.5px] leading-snug text-ink-faint">{wordOrder.note}</p>
      )}
    </div>
  );
}

/** Grammar Decision Tree (F0216) helper to render branching choices. */
export function GrammarDecisionTree({ node, lang }: { node: DecisionNode; lang: string }) {
  const [history, setHistory] = useState<Array<{ question: string; answer: 'yes' | 'no' }>>([]);
  const [currentNode, setCurrentNode] = useState<DecisionNode>(node);
  const [resolvedBranch, setResolvedBranch] = useState<DecisionBranch | null>(null);

  const choose = (answer: 'yes' | 'no') => {
    const branch = answer === 'yes' ? currentNode.yes : currentNode.no;
    setHistory([...history, { question: currentNode.question, answer }]);
    if (branch.next) {
      setCurrentNode(branch.next);
      setResolvedBranch(null);
    } else {
      setResolvedBranch(branch);
    }
  };

  const reset = () => {
    setHistory([]);
    setCurrentNode(node);
    setResolvedBranch(null);
  };

  return (
    <div className="rounded-2xl border border-line/70 bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-[14px] font-semibold text-ink-soft">
          <HelpCircle size={16} className="text-accent" aria-hidden />
          Grammar Decision Guide
        </h3>
        {history.length > 0 && (
          <button
            type="button"
            onClick={reset}
            className="text-[12px] font-semibold text-accent-text hover:underline"
          >
            Start over
          </button>
        )}
      </div>

      {/* Path Breadcrumbs */}
      {history.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[12px] text-ink-faint">
          {history.map((h, i) => (
            <span key={i} className="flex items-center gap-1">
              <span>{h.answer === 'yes' ? 'Yes' : 'No'}</span>
              {i < history.length - 1 && <ChevronRight size={12} />}
            </span>
          ))}
        </div>
      )}

      {/* Current Step */}
      {!resolvedBranch ? (
        <div className="rounded-xl border border-line/70 bg-sunken/40 p-4">
          <p className="text-[15px] font-medium leading-snug text-ink">{currentNode.question}</p>
          <div className="mt-3.5 flex gap-2.5">
            <button
              type="button"
              onClick={() => choose('yes')}
              className="rounded-lg border border-accent/40 bg-accent-soft/40 px-4 py-2 text-[13.5px] font-semibold text-accent-text hover:bg-accent-soft transition-colors"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => choose('no')}
              className="rounded-lg border border-line/80 bg-card px-4 py-2 text-[13.5px] font-medium text-ink hover:bg-sunken transition-colors"
            >
              No
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-accent/40 bg-accent-soft/25 p-4 animate-in fade-in">
          <span className="text-[11px] font-bold uppercase tracking-wider text-accent-text">
            Recommended rule
          </span>
          <p className="mt-1 text-[16px] font-semibold text-ink">{resolvedBranch.result}</p>
          {resolvedBranch.rule && (
            <p className="mt-1.5 text-[14px] leading-snug text-ink-soft">{resolvedBranch.rule}</p>
          )}
          {resolvedBranch.example && (
            <p lang={lang} className="mt-2 font-serif text-[15px] italic text-ink">
              “{resolvedBranch.example}”
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Sentence Structure Diagram (F0214). */
export function SentenceStructureDiagram({ diagram, lang }: { diagram: SentenceDiagramData; lang: string }) {
  const rtl = isRtl(lang);

  return (
    <div className="rounded-2xl border border-line/70 bg-card p-4 sm:p-5">
      {diagram.title && (
        <h3 className="mb-2 text-[14px] font-semibold text-ink-soft">{diagram.title}</h3>
      )}

      <p lang={lang} dir={rtl ? 'rtl' : undefined} className="font-serif text-[18px] font-medium text-ink">
        {diagram.sentence}
      </p>
      {diagram.translation && (
        <p className="mt-0.5 text-[13.5px] text-ink-soft">{diagram.translation}</p>
      )}

      {/* Visual Word Hierarchy / Structure grid */}
      <div className="mt-4 flex flex-wrap gap-2.5">
        {diagram.nodes.map((node, i) => (
          <div
            key={i}
            className="flex flex-col rounded-xl border border-line/60 bg-sunken/40 px-3 py-2 text-center"
          >
            <span lang={lang} dir={rtl ? 'rtl' : undefined} className="font-serif text-[16px] font-semibold text-ink">
              {node.word}
            </span>
            <span className="mt-1 rounded bg-card px-1.5 py-0.5 text-[11px] font-medium text-ink-faint">
              {node.role}
            </span>
          </div>
        ))}
      </div>

      {diagram.note && (
        <p className="mt-2.5 text-[12.5px] leading-snug text-ink-faint">{diagram.note}</p>
      )}
    </div>
  );
}

/** Morphology Breakdowns (F0218). */
export function MorphologyBreakdownView({ breakdowns, lang }: { breakdowns: MorphologyBreakdownData[]; lang: string }) {
  const rtl = isRtl(lang);

  return (
    <div className="space-y-3">
      {breakdowns.map((b, idx) => (
        <div key={idx} className="rounded-2xl border border-line/70 bg-card p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h4 lang={lang} dir={rtl ? 'rtl' : undefined} className="font-serif text-[19px] font-bold text-ink">
              {b.word}
            </h4>
            <span className="text-[13px] text-ink-soft">{b.translation}</span>
          </div>

          {/* Morphological Morpheme Blocks */}
          <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
            {b.parts.map((p, i) => {
              const isEnding = p.type === 'ending' || p.type === 'suffix';
              const isStem = p.type === 'stem';
              return (
                <div
                  key={i}
                  className={cx(
                    'flex flex-col rounded-xl px-3 py-2 border transition-colors',
                    isEnding
                      ? 'border-accent/40 bg-accent-soft/30 text-accent-text'
                      : isStem
                        ? 'border-line/80 bg-sunken/60 text-ink font-semibold'
                        : 'border-line/60 bg-sunken/30 text-ink-soft',
                  )}
                >
                  <span lang={lang} dir={rtl ? 'rtl' : undefined} className="font-serif text-[16px] leading-tight">
                    {p.text}
                  </span>
                  <div className="mt-1 flex items-center gap-1 text-[10.5px]">
                    <span className="font-bold uppercase tracking-wider opacity-75">{p.type}</span>
                    {p.meaning && <span className="opacity-90">({p.meaning})</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {b.note && <p className="mt-2.5 text-[12.5px] text-ink-faint">{b.note}</p>}
        </div>
      ))}
    </div>
  );
}
