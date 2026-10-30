// Deep learning analytics panel for Ratio Overview (6-17, Catalogue Section 14, F0508, F0509, F0922, F1158, F1608).
// Each chart includes clear definitions and honest "what it doesn't say" guidance.

import { useState } from 'react';
import { BarChart2, Clock, HelpCircle, ShieldCheck, Volume2 } from 'lucide-react';
import type { CefrLevel } from '@/data/types';
import {
  calculateAssistedRatio,
  calculateCurriculumProgress,
  calculateDelayedRetention,
  calculateListeningAnalytics,
  calculateMistakeTrends,
  calculateSkillDistribution,
} from '@/core/ratio/analytics';
import type { ChartExplanation } from '@/core/ratio/analytics';
import type { EvidenceRow } from '@/core/contracts/learner';
import { cx } from '@/lib/cx';

export function AdvancedAnalyticsPanel({
  evidence,
  targetLevel = 'B1',
  knownWords = 0,
  grammarTopics = 0,
  listeningHours = 0,
  readingWords = 0,
  studyMinutesBySkill = {},
}: {
  evidence: readonly EvidenceRow[];
  targetLevel?: CefrLevel;
  knownWords?: number;
  grammarTopics?: number;
  listeningHours?: number;
  readingWords?: number;
  studyMinutesBySkill?: Record<string, number>;
}) {
  const [activeTab, setActiveTab] = useState<'skills' | 'memory' | 'curriculum' | 'listening' | 'errors'>('skills');

  const skillsData = calculateSkillDistribution(evidence, studyMinutesBySkill);
  const retentionData = calculateDelayedRetention(evidence);
  const assistedData = calculateAssistedRatio(evidence);
  const curriculumData = calculateCurriculumProgress(targetLevel, {
    words: knownWords,
    grammarTopics,
    listeningHours,
    readingWords,
  });
  const listeningData = calculateListeningAnalytics(evidence);
  const mistakeData = calculateMistakeTrends(evidence);

  return (
    <div className="space-y-5 rounded-3xl bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart2 size={20} className="text-sage" />
            <h3 className="font-serif text-[18px] font-semibold text-ink">Deep Learning Analytics</h3>
          </div>
          <p className="mt-0.5 text-[13px] text-ink-soft">
            Section 14 Analytics: multi-skill balance, delayed recall, assisted ratios, and CEFR progress.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap gap-1 rounded-xl border border-line bg-raised p-1 text-[12.5px] font-semibold">
          {[
            { id: 'skills', label: 'Skills' },
            { id: 'memory', label: 'Retention & Help' },
            { id: 'curriculum', label: 'CEFR Benchmark' },
            { id: 'listening', label: 'Listening Speeds' },
            { id: 'errors', label: 'Mistakes' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as any)}
              className={cx(
                'rounded-lg px-3 py-1.5 transition-colors',
                activeTab === t.id ? 'bg-surface text-ink shadow-xs' : 'text-ink-soft hover:text-ink',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Skills Breakdown */}
      {activeTab === 'skills' && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {skillsData.skills.map((s) => (
              <div key={s.skill} className="rounded-2xl border border-line bg-raised p-3.5">
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="font-semibold text-ink">{s.label}</span>
                  <span className="tabular-nums text-ink-faint">{s.minutes} min</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sunken">
                  <div
                    className="h-full rounded-full bg-sage"
                    style={{ width: `${Math.min(100, Math.round(s.share * 100))}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-ink-soft">
                  <span>{s.itemCount} items</span>
                  <span className="font-semibold text-ink">{Math.round(s.accuracy * 100)}% accuracy</span>
                </div>
              </div>
            ))}
          </div>

          <Callout explanation={skillsData.explanation} />
        </div>
      )}

      {/* Tab 2: Memory & Assisted vs Unassisted */}
      {activeTab === 'memory' && (
        <div className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            {/* Delayed Recall / Retention */}
            <div className="rounded-2xl border border-line bg-raised p-4">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-accent" />
                <h4 className="text-[14px] font-semibold text-ink">Delayed Recall vs Immediate Echo</h4>
              </div>
              <p className="mt-1 text-[12px] text-ink-soft">Retention percentage after sleep and time have elapsed.</p>

              <div className="mt-4 space-y-3">
                {[
                  { label: 'Same day (< 24 h)', rate: retentionData.sameDayRetention, note: 'Working memory echo' },
                  { label: '1 to 6 days', rate: retentionData.day1To6Retention, note: 'Early consolidation' },
                  { label: '7 to 29 days', rate: retentionData.day7To29Retention, note: 'Medium-term storage' },
                  { label: '30+ days', rate: retentionData.day30PlusRetention, note: 'Mature durable memory' },
                ].map((tier) => (
                  <div key={tier.label} className="text-[12.5px]">
                    <div className="flex justify-between">
                      <span className="font-medium text-ink">{tier.label}</span>
                      <span className="font-semibold tabular-nums text-ink">{Math.round(tier.rate * 100)}%</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-sunken">
                      <div className="h-full rounded-full bg-sage" style={{ width: `${Math.round(tier.rate * 100)}%` }} />
                    </div>
                    <span className="text-[10.5px] text-ink-faint">{tier.note}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Assisted vs Independent Answers */}
            <div className="rounded-2xl border border-line bg-raised p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-sage" />
                <h4 className="text-[14px] font-semibold text-ink">Independence from Scaffolding</h4>
              </div>
              <p className="mt-1 text-[12px] text-ink-soft">
                Answers solved unassisted vs those using hints or translations.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                <div className="rounded-xl border border-line bg-surface p-3">
                  <span className="font-serif text-[26px] font-bold text-ink tabular-nums">
                    {Math.round(assistedData.independenceRatio * 100)}%
                  </span>
                  <span className="block text-[11.5px] text-ink-soft">Unassisted answers</span>
                  <span className="mt-1 block text-[10.5px] text-sage">{assistedData.unassistedCount} answered alone</span>
                </div>
                <div className="rounded-xl border border-line bg-surface p-3">
                  <span className="font-serif text-[26px] font-bold text-accent text-opacity-90 tabular-nums">
                    {Math.round((1 - assistedData.independenceRatio) * 100)}%
                  </span>
                  <span className="block text-[11.5px] text-ink-soft">Assisted with hints</span>
                  <span className="mt-1 block text-[10.5px] text-ink-faint">{assistedData.assistedCount} used hints</span>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-surface p-3 text-[12px] text-ink-soft">
                <p>
                  Unassisted accuracy: <strong className="text-ink">{Math.round(assistedData.unassistedAccuracy * 100)}%</strong> · Assisted accuracy: <strong className="text-ink">{Math.round(assistedData.assistedAccuracy * 100)}%</strong>
                </p>
              </div>
            </div>
          </div>

          <Callout explanation={retentionData.explanation} />
        </div>
      )}

      {/* Tab 3: CEFR Benchmark */}
      {activeTab === 'curriculum' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-line bg-raised p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-[14px] font-semibold text-ink">
                  Target Proficiency Level: <span className="font-bold text-sage">{curriculumData.targetLevel}</span>
                </h4>
                <p className="text-[12px] text-ink-soft">Comparison of accumulated study volume against typical CEFR syllabi.</p>
              </div>
              <div className="text-right">
                <span className="font-serif text-[22px] font-bold text-ink tabular-nums">
                  {Math.round(curriculumData.overallReadiness * 100)}%
                </span>
                <span className="block text-[10.5px] text-ink-faint">Overall benchmark coverage</span>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              {curriculumData.items.map((it) => (
                <div key={it.area} className="rounded-xl border border-line bg-surface p-3">
                  <span className="block text-[12px] font-semibold text-ink">{it.label}</span>
                  <div className="my-1.5 flex items-baseline gap-1">
                    <span className="font-serif text-[18px] font-bold text-ink tabular-nums">
                      {it.current.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-ink-faint">/ {it.target.toLocaleString()} {it.unit}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-sunken">
                    <div
                      className="h-full rounded-full bg-sage"
                      style={{ width: `${Math.min(100, Math.round(it.fraction * 100))}%` }}
                    />
                  </div>
                  <span className="mt-1 block text-right font-mono text-[10px] text-ink-faint">
                    {Math.round(it.fraction * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <Callout explanation={curriculumData.explanation} />
        </div>
      )}

      {/* Tab 4: Listening Accents & Speeds */}
      {activeTab === 'listening' && (
        <div className="space-y-4">
          <div className="grid gap-5 md:grid-cols-2">
            {/* By Speed */}
            <div className="rounded-2xl border border-line bg-raised p-4">
              <div className="flex items-center gap-2">
                <Volume2 size={16} className="text-sage" />
                <h4 className="text-[14px] font-semibold text-ink">Comprehension by Playback Speed</h4>
              </div>
              <p className="mt-1 text-[12px] text-ink-soft">Accuracy across different playback tempos (F0509).</p>

              <div className="mt-4 space-y-2.5">
                {listeningData.bySpeed.map((sp) => (
                  <div key={sp.speed} className="flex items-center justify-between text-[13px]">
                    <span className="w-16 font-mono font-bold text-ink">{sp.speed}</span>
                    <div className="mx-3 h-2 flex-1 overflow-hidden rounded-full bg-sunken">
                      <div className="h-full rounded-full bg-sage" style={{ width: `${Math.round(sp.accuracy * 100)}%` }} />
                    </div>
                    <span className="w-12 text-right tabular-nums text-ink font-semibold">
                      {Math.round(sp.accuracy * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* By Accent */}
            <div className="rounded-2xl border border-line bg-raised p-4">
              <div className="flex items-center gap-2">
                <Volume2 size={16} className="text-accent" />
                <h4 className="text-[14px] font-semibold text-ink">Comprehension by Regional Accent</h4>
              </div>
              <p className="mt-1 text-[12px] text-ink-soft">Comprehension across dialects and accents (F0508).</p>

              <div className="mt-4 space-y-2.5">
                {listeningData.byAccent.map((acc) => (
                  <div key={acc.accent} className="flex items-center justify-between text-[13px]">
                    <span className="w-40 truncate text-ink-soft">{acc.label}</span>
                    <div className="mx-3 h-2 flex-1 overflow-hidden rounded-full bg-sunken">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(acc.accuracy * 100)}%` }} />
                    </div>
                    <span className="w-12 text-right tabular-nums text-ink font-semibold">
                      {Math.round(acc.accuracy * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Callout explanation={listeningData.explanation} />
        </div>
      )}

      {/* Tab 5: Mistake Trends */}
      {activeTab === 'errors' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-line bg-raised p-4">
            <h4 className="text-[14px] font-semibold text-ink">Mistake Categories Over Time</h4>
            <p className="text-[12px] text-ink-soft">Recent vs historical mistakes across the last 30 days (F1608).</p>

            {mistakeData.length === 0 ? (
              <p className="mt-4 text-center text-[13px] text-ink-faint">
                No recent mistakes recorded. Keep practicing to see error trends!
              </p>
            ) : (
              <div className="mt-4 space-y-2.5">
                {mistakeData.map((m) => (
                  <div key={m.category} className="flex items-center justify-between rounded-xl border border-line bg-surface p-2.5 text-[13px]">
                    <div>
                      <span className="font-semibold text-ink">{m.label}</span>
                      <span className="ml-2 rounded-full bg-sunken px-2 py-0.5 text-[11px] text-ink-faint">
                        {m.recentCount} recent · {m.previousCount} previous
                      </span>
                    </div>
                    <span
                      className={cx(
                        'rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase',
                        m.trend === 'improving' ? 'bg-sage/15 text-sage' : m.trend === 'frequent' ? 'bg-accent-soft text-accent-text' : 'bg-sunken text-ink-faint',
                      )}
                    >
                      {m.trend}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Callout({ explanation }: { explanation: ChartExplanation }) {
  return (
    <div className="rounded-2xl border border-line-strong bg-raised p-4 text-[12.5px] leading-relaxed">
      <div className="flex items-start gap-2">
        <HelpCircle size={15} className="mt-0.5 shrink-0 text-ink-soft" />
        <div className="space-y-1">
          <p>
            <strong className="text-ink">What this chart says:</strong>{' '}
            <span className="text-ink-soft">{explanation.whatItSays}</span>
          </p>
          <p>
            <strong className="text-ink">What it doesn't say:</strong>{' '}
            <span className="text-ink-faint">{explanation.whatItDoesNotSay}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
