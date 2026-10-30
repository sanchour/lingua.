import { UiText, useUi } from '@/design/i18n/UiText';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { AlertTriangle, ArrowRight, Check, Flame, Layers, Sparkles } from 'lucide-react';
import type { Grammar, GrammarLevel, Topic } from '@/core/grammar/types';
import { topicsOf } from '@/core/grammar/types';
import type { TopicState } from '@/core/grammar/progress';
import { getPrerequisites } from '@/core/grammar/prerequisites';
import { cx } from '@/lib/cx';

export interface TopicMapProps {
  grammar: Grammar;
  states: Map<string, TopicState>;
  learnedIds: Set<string>;
  weakSpots?: Array<{ topic: Topic; lapses: number; due: number }>;
  nextId?: string;
  lang: string;
}

interface NodePosition {
  topic: Topic;
  x: number;
  y: number;
  levelIndex: number;
  orderInLevel: number;
}

const LEVELS: GrammarLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

export function TopicMap({
  grammar,
  states,
  learnedIds,
  weakSpots = [],
  nextId,
}: TopicMapProps) {
  const translateUi = useUi();
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(nextId ?? null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [levelFilter, setLevelFilter] = useState<'all' | GrammarLevel>('all');

  const allTopics = useMemo(() => topicsOf(grammar), [grammar]);

  // Error count map from weak spots
  const errorMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of weakSpots) {
      if (w.lapses > 0) {
        map.set(w.topic.id, (map.get(w.topic.id) ?? 0) + w.lapses);
      }
    }
    return map;
  }, [weakSpots]);

  // Group topics by level
  const topicsByLevel = useMemo(() => {
    const map = new Map<GrammarLevel, Topic[]>();
    for (const lvl of LEVELS) map.set(lvl, []);
    for (const t of allTopics) {
      const arr = map.get(t.level) ?? [];
      arr.push(t);
      map.set(t.level, arr);
    }
    return map;
  }, [allTopics]);

  // Active levels to display
  const activeLevels = useMemo(
    () => (levelFilter === 'all' ? LEVELS : [levelFilter]),
    [levelFilter],
  );

  // Compute node coordinates
  const { nodes, edges, width, height } = useMemo(() => {
    const colWidth = 260;
    const nodeHeight = 64;
    const gapY = 22;
    const paddingX = 40;
    const paddingTop = 60;

    const nodePositions = new Map<string, NodePosition>();
    let maxTopicsInCol = 1;

    activeLevels.forEach((lvl, colIdx) => {
      const list = topicsByLevel.get(lvl) ?? [];
      maxTopicsInCol = Math.max(maxTopicsInCol, list.length);
      list.forEach((topic, rowIdx) => {
        const x = paddingX + colIdx * colWidth + 100;
        const y = paddingTop + rowIdx * (nodeHeight + gapY) + nodeHeight / 2;
        nodePositions.set(topic.id, {
          topic,
          x,
          y,
          levelIndex: colIdx,
          orderInLevel: rowIdx,
        });
      });
    });

    const totalWidth = Math.max(800, paddingX * 2 + activeLevels.length * colWidth);
    const totalHeight = paddingTop + maxTopicsInCol * (nodeHeight + gapY) + 80;

    // Prerequisite edges
    const edgeList: Array<{ from: NodePosition; to: NodePosition; isHighlighted: boolean }> = [];
    for (const node of nodePositions.values()) {
      const prereqs = getPrerequisites(grammar, node.topic);
      for (const p of prereqs) {
        const fromPos = nodePositions.get(p.id);
        if (fromPos) {
          const isHighlighted =
            selectedTopicId === node.topic.id || selectedTopicId === p.id;
          edgeList.push({
            from: fromPos,
            to: node,
            isHighlighted,
          });
        }
      }
    }

    return {
      nodes: [...nodePositions.values()],
      edges: edgeList,
      width: totalWidth,
      height: totalHeight,
    };
  }, [activeLevels, topicsByLevel, grammar, selectedTopicId]);

  const selectedTopic = useMemo(
    () => (selectedTopicId ? allTopics.find((t) => t.id === selectedTopicId) : null),
    [selectedTopicId, allTopics],
  );

  const selectedState = selectedTopic ? states.get(selectedTopic.id) : undefined;

  const selectedPrereqs = useMemo(
    () => (selectedTopic ? getPrerequisites(grammar, selectedTopic) : []),
    [selectedTopic, grammar],
  );

  const selectedDependents = useMemo(() => {
    if (!selectedTopic) return [];
    return allTopics.filter((t) => {
      const p = getPrerequisites(grammar, t);
      return p.some((pt) => pt.id === selectedTopic.id);
    });
  }, [selectedTopic, allTopics, grammar]);

  return (
    <div className="space-y-4">
      {/* Map Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-card p-3 sm:p-4">
        {/* Level Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setLevelFilter('all')}
            className={cx(
              'rounded-xl px-3 py-1.5 text-[12.5px] font-semibold transition-colors',
              levelFilter === 'all'
                ? 'bg-ink text-bg'
                : 'bg-sunken text-ink-soft hover:bg-sunken/80',
            )}
          ><UiText source={'All levels'} /></button>
          {LEVELS.map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setLevelFilter(lvl)}
              className={cx(
                'rounded-xl px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors',
                levelFilter === lvl
                  ? 'bg-ink text-bg'
                  : 'bg-sunken text-ink-soft hover:bg-sunken/80',
              )}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* Heatmap Toggle & Legend */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={cx(
              'flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12.5px] font-semibold transition-colors',
              showHeatmap
                ? 'border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400'
                : 'border-line text-ink-soft hover:bg-sunken',
            )}
          ><UiText source={'{0}Error heatmap'} values={[<Flame size={15} aria-hidden />]} /></button>
        </div>
      </div>

      {/* SVG Map Canvas with Horizontal Scroll */}
      <div className="relative overflow-x-auto rounded-3xl border border-line bg-sunken/30 shadow-inner">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: `${width}px`, height: `${height}px`, minWidth: '100%' }}
          className="select-none"
          role="img"
          aria-label={translateUi('Grammar topic map')}
        >
          <defs>
            {/* Standard Edge Arrow */}
            <marker
              id="map-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 2 L 8 5 L 0 8 z" fill="currentColor" className="text-line" />
            </marker>

            {/* Highlighted Edge Arrow */}
            <marker
              id="map-arrow-active"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--accent)" />
            </marker>
          </defs>

          {/* Level Column Headers */}
          {activeLevels.map((lvl, colIdx) => {
            const x = 40 + colIdx * 260 + 100;
            return (
              <g key={lvl}>
                <line
                  x1={x}
                  y1={20}
                  x2={x}
                  y2={height - 20}
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  className="text-line/40"
                />
                <text
                  x={x}
                  y={35}
                  textAnchor="middle"
                  className="fill-ink-faint text-[13px] font-bold tracking-widest uppercase"
                >{translateUi('Level {0}', [lvl])}</text>
              </g>
            );
          })}

          {/* Directed Prerequisite Edges */}
          {edges.map((e, idx) => {
            const x1 = e.from.x + 90;
            const y1 = e.from.y;
            const x2 = e.to.x - 90;
            const y2 = e.to.y;
            const midX = (x1 + x2) / 2;

            return (
              <path
                key={idx}
                d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke={e.isHighlighted ? 'var(--accent)' : 'currentColor'}
                strokeWidth={e.isHighlighted ? 2.2 : 1.2}
                strokeOpacity={e.isHighlighted ? 1 : 0.45}
                markerEnd={e.isHighlighted ? 'url(#map-arrow-active)' : 'url(#map-arrow)'}
                className={e.isHighlighted ? '' : 'text-line'}
              />
            );
          })}

          {/* Topic Nodes */}
          {nodes.map(({ topic, x, y }) => {
            const isLearned = learnedIds.has(topic.id);
            const isSelected = selectedTopicId === topic.id;
            const isNext = nextId === topic.id;
            const errors = errorMap.get(topic.id) ?? 0;
            const hasHeat = showHeatmap && errors > 0;

            const cardW = 180;
            const cardH = 54;
            const rx = x - cardW / 2;
            const ry = y - cardH / 2;

            // Heat level styling
            let heatFill = 'var(--bg)';
            let heatStroke = 'currentColor';
            if (hasHeat) {
              if (errors >= 5) {
                heatFill = '#ef444433';
                heatStroke = '#ef4444';
              } else if (errors >= 3) {
                heatFill = '#f9731633';
                heatStroke = '#f97316';
              } else {
                heatFill = '#f59e0b25';
                heatStroke = '#f59e0b';
              }
            }

            return (
              <g
                key={topic.id}
                tabIndex={0}
                role="button"
                aria-label={`${topic.title} (${topic.level})`}
                onClick={() => setSelectedTopicId(topic.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setSelectedTopicId(topic.id);
                }}
                className="cursor-pointer outline-none transition-all focus-visible:opacity-100"
              >
                {/* Node Box */}
                <rect
                  x={rx}
                  y={ry}
                  width={cardW}
                  height={cardH}
                  rx="14"
                  fill={hasHeat ? heatFill : isLearned ? 'var(--sage-soft)' : 'var(--bg)'}
                  stroke={
                    isSelected
                      ? 'var(--accent)'
                      : hasHeat
                        ? heatStroke
                        : isLearned
                          ? 'var(--sage)'
                          : isNext
                            ? 'var(--accent)'
                            : 'currentColor'
                  }
                  strokeWidth={isSelected || isNext ? 2.4 : 1.3}
                  className={cx(
                    'transition-colors',
                    isSelected || isNext || hasHeat || isLearned ? '' : 'text-line',
                  )}
                />

                {/* Status Dot / Checkmark */}
                {isLearned ? (
                  <circle cx={rx + 18} cy={y} r="8" fill="var(--sage)" />
                ) : isNext ? (
                  <circle cx={rx + 18} cy={y} r="6" fill="var(--accent)" />
                ) : (
                  <circle cx={rx + 18} cy={y} r="4" fill="currentColor" className="text-line" />
                )}

                {/* Topic Title */}
                <text
                  x={rx + 34}
                  y={y - 2}
                  className={cx(
                    'text-[12.5px] font-semibold tracking-tight transition-colors',
                    isSelected ? 'fill-accent-text' : 'fill-ink',
                  )}
                >
                  {topic.title.length > 17 ? `${topic.title.slice(0, 16)}…` : topic.title}
                </text>

                {/* Level and Error Indicator */}
                <text x={rx + 34} y={y + 14} className="fill-ink-faint text-[10.5px]">
                  {topic.level} · {topic.category ?? translateUi('grammar')}
                </text>

                {/* Heatmap Error Badge */}
                {hasHeat && (
                  <g transform={`translate(${rx + cardW - 22}, ${ry + 8})`}>
                    <circle cx="6" cy="6" r="8" fill={heatStroke} />
                    <text
                      x="6"
                      y="9.5"
                      textAnchor="middle"
                      fill="#ffffff"
                      className="text-[9.5px] font-bold"
                    >
                      {errors}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Topic Inspector Drawer/Card */}
      {selectedTopic && (
        <div className="rounded-3xl border border-line bg-card p-5 sm:p-6 animate-in fade-in">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-sunken px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                  {selectedTopic.level}
                </span>
                <span className="text-[12px] font-medium text-ink-faint">
                  {selectedTopic.category ?? translateUi('grammar')}
                </span>
                {learnedIds.has(selectedTopic.id) && (
                  <span className="flex items-center gap-1 text-[11.5px] font-semibold text-sage-text"><UiText source={'{0}Learned'} values={[<Check size={13} strokeWidth={2.6} />]} /></span>
                )}
                {nextId === selectedTopic.id && (
                  <span className="flex items-center gap-1 text-[11.5px] font-semibold text-accent-text"><UiText source={'{0}Next recommended'} values={[<Sparkles size={13} />]} /></span>
                )}
                {selectedState && selectedState.step > 1 && !learnedIds.has(selectedTopic.id) && (
                  <span className="text-[12px] font-medium text-ink-soft"><UiText source={'Step {0} of 5'} values={[selectedState.step - 1]} /></span>
                )}
              </div>

              <h3 className="mt-2 text-xl font-bold text-ink">{selectedTopic.title}</h3>
              <p className="mt-1 text-[14.5px] leading-relaxed text-ink-soft">
                {selectedTopic.summary}
              </p>
            </div>

            <Link
              to={`/cursus/grammatica/${selectedTopic.id}`}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-[14px] font-semibold text-bg transition-opacity hover:opacity-90"
            >
              <span><UiText source={'Go to lesson'} /></span>
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Prerequisites and Dependents Links */}
          <div className="mt-5 grid gap-4 border-t border-line/60 pt-4 sm:grid-cols-2">
            <div>
              <span className="text-[11.5px] font-bold uppercase tracking-wider text-ink-faint"><UiText source={'Prerequisites (Before this)'} /></span>
              {selectedPrereqs.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedPrereqs.map((p) => {
                    const isMet = learnedIds.has(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedTopicId(p.id)}
                        className={cx(
                          'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12.5px] font-medium transition-colors',
                          isMet
                            ? 'border-sage/40 bg-sage-soft/30 text-sage-text'
                            : 'border-line bg-sunken/40 text-ink-soft hover:bg-sunken',
                        )}
                      >
                        {isMet ? <Check size={12} strokeWidth={2.5} /> : null}
                        <span>{p.title}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-1 text-[13px] text-ink-faint"><UiText source={'No prerequisites · Foundation topic'} /></p>
              )}
            </div>

            <div>
              <span className="text-[11.5px] font-bold uppercase tracking-wider text-ink-faint"><UiText source={'Unlocks (Dependents)'} /></span>
              {selectedDependents.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedDependents.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setSelectedTopicId(d.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-sunken/40 px-2.5 py-1 text-[12.5px] font-medium text-ink-soft hover:bg-sunken transition-colors"
                    >
                      <Layers size={12} />
                      <span>{d.title}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-[13px] text-ink-faint"><UiText source={'Terminal topic or advanced rule'} /></p>
              )}
            </div>
          </div>

          {/* Error count if heatmap shows mistakes */}
          {(errorMap.get(selectedTopic.id) ?? 0) > 0 && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-500/10 p-3 text-[13.5px] text-amber-700 dark:text-amber-400">
              <AlertTriangle size={16} className="shrink-0" />
              <span><UiText source={'{0} recorded on this topic in exercises. A review is recommended.'} values={[<strong><UiText source={'{0} mistakes'} values={[errorMap.get(selectedTopic.id)]} /></strong>]} /></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
