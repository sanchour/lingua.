import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, BookA } from 'lucide-react';
import type { GrammarStats } from '@/core/grammar/stats';
import { loadGrammarStats } from '@/data/grammar';
import { BarChart } from '@/design/charts/BarChart';
import { gradeColor } from '@/design/charts/Ring';
import { Panel, pct, Stat } from './common';

const monthLabel = (month: string) => new Date(`${month}-15T12:00:00`).toLocaleDateString(undefined, { month: 'short' });

/** Grammatica in Ratio, for one language: topics learned and mastered, the level reached, the weakest topics. */
export function GrammarPanel({ lang }: { lang: string }) {
  const [state, setState] = useState<{ lang: string; stats: GrammarStats | null }>();
  useEffect(() => {
    let alive = true;
    void loadGrammarStats(lang).then((stats) => alive && setState({ lang, stats }));
    return () => {
      alive = false;
    };
  }, [lang]);
  const stats = state?.lang === lang ? state.stats : undefined;
  if (!stats) return null;

  return (
    <Panel
      title="Grammar"
      icon={BookA}
      action={
        <Link to="/grammatica" className="hit inline-flex items-center gap-1 text-[13px] font-semibold text-ink-soft hover:text-ink">
          Grammatica <ArrowRight size={14} aria-hidden />
        </Link>
      }
    >
      <dl className="mb-5 grid grid-cols-3 gap-3">
        <Stat value={`${stats.learned} / ${stats.total}`} label="Learned" />
        <Stat value={stats.mastered} label="Mastered" />
        <Stat value={stats.level ?? '—'} label="Level" hint={stats.level ? 'every topic up to it learned' : 'learn every A1 topic first'} />
      </dl>
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-3 text-[13px] font-semibold text-ink-soft">Topics learned a month</p>
          <BarChart
            bars={stats.perMonth.map((m, i) => ({ label: monthLabel(m.month), values: [m.learned], current: i === stats.perMonth.length - 1 }))}
            colors={['var(--sage)']}
            names={['Topics learned']}
            height={110}
            labelEvery={1}
          />
        </div>
        <div>
          <p className="mb-2 text-[13px] font-semibold text-ink-soft">Needs work</p>
          {stats.weakest.length ? (
            <ul className="space-y-2">
              {stats.weakest.map((s) => (
                <li key={s.topic.id}>
                  <Link to={`/grammatica/${s.topic.id}/lesson?mode=practice`} className="group grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
                    <span className="truncate text-[14px] font-semibold group-hover:underline">{s.topic.title}</span>
                    <span className="text-[12.5px] text-ink-faint tabular-nums">
                      {pct(s.accuracy)} right · {s.answers}
                    </span>
                    <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-sunken">
                      <span className="block h-full origin-left rounded-full" style={{ transform: `scaleX(${s.accuracy})`, background: gradeColor(s.accuracy * 100) }} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13.5px] text-ink-soft">After five answers in a topic, the ones you miss most show here.</p>
          )}
        </div>
      </div>
    </Panel>
  );
}
