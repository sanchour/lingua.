import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Award,
  BookOpen,
  Clock,
  Feather,
  Flag,
  Flame,
  GraduationCap,
  Layers,
  MessagesSquare,
  Pencil,
  Plane,
  Plus,
  Sprout,
  StickyNote,
  Target,
  Timer,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useApp } from '@/app/context';
import { blobUrl } from '@/data/library';
import { CEFR_LEVELS, checkAllMilestones, goalProgress, removeGoal, removeMoment, removeStudyLog, useCapabilities, useGoals, useJourney, useStudyLogs, LOG_ACTIVITIES } from '@/data/journey';
import { useLanguages } from '@/data/languages';
import { paceOf } from '@/data/ratio';
import type { Pace } from '@/data/ratio';
import type { CefrLevel, Goal, JourneyEvent } from '@/data/types';
import { LineChart } from '@/design/charts/LineChart';
import { gradeColor, Ring } from '@/design/charts/Ring';
import { Button, IconButton } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { hours, langName, Panel, shortDate } from '../common';
import { GoalDrawer, LogTimeDrawer, MomentDrawer } from './forms';

const KIND_ICON: Record<string, LucideIcon> = {
  started: Flag,
  words: Sprout,
  book: BookOpen,
  hours: Clock,
  streak: Flame,
  journal: Feather,
  grade: Award,
  level: TrendingUp,
  deck: Layers,
  class: GraduationCap,
  tutoring: Users,
  exam: Award,
  trip: Plane,
  conversation: MessagesSquare,
  note: StickyNote,
};

const iconOf = (e: JourneyEvent) => (e.kind === 'manual' ? (KIND_ICON[e.category ?? 'note'] ?? StickyNote) : (KIND_ICON[e.kind] ?? Flag));

export function Iter() {
  const { language } = useApp();
  const languages = useLanguages();
  const events = useJourney();
  const goals = useGoals();
  const logs = useStudyLogs();
  const capabilities = useCapabilities();
  const [filter, setFilter] = useState<string>('all');
  const [drawer, setDrawer] = useState<'log' | 'moment' | 'goal' | null>(null);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalKind, setGoalKind] = useState<Goal['kind']>('level');
  const [paces, setPaces] = useState<Map<string, Pace>>(new Map());

  useEffect(() => void checkAllMilestones(), []);
  const goalLangs = useMemo(() => [...new Set((goals ?? []).map((g) => g.lang))].join(','), [goals]);
  useEffect(() => {
    const ids = goalLangs ? goalLangs.split(',') : [];
    void Promise.all(ids.map(async (id) => [id, await paceOf(id)] as const)).then((list) => setPaces(new Map(list)));
  }, [goalLangs, logs?.length]);

  const levelOf = (lang: string): CefrLevel => (capabilities?.find((c) => c.id === lang)?.level ?? (languages?.find((l) => l.id === lang)?.level as CefrLevel | undefined) ?? 'A0');
  const shown = (events ?? []).filter((e) => filter === 'all' || e.lang === filter);
  const byYear = useMemo(() => {
    const out = new Map<number, JourneyEvent[]>();
    for (const e of shown) {
      const y = new Date(e.at).getFullYear();
      if (!out.has(y)) out.set(y, []);
      out.get(y)!.push(e);
    }
    return [...out];
  }, [shown]);

  // Level history from Tabula: one step line per language that has changed level.
  const levelSeries = useMemo(() => {
    const changes = (events ?? []).filter((e) => e.kind === 'level' && typeof e.value === 'number');
    const langs = [...new Set(changes.map((e) => e.lang))];
    const colors = ['var(--sage)', 'var(--accent)', 'color-mix(in oklab, var(--sage) 50%, var(--ink-faint))', 'color-mix(in oklab, var(--accent) 50%, var(--sunken))'];
    return langs.slice(0, 4).map((lang, i) => {
      const list = changes.filter((e) => e.lang === lang).sort((a, b) => a.at - b.at);
      const cap = capabilities?.find((c) => c.id === lang);
      const first = list[0];
      const startLevel = CEFR_LEVELS.indexOf((first.category as CefrLevel) ?? 'A0');
      const start = cap?.started ? new Date(`${cap.started}T12:00:00`).getTime() : first.at - 30 * 86_400_000;
      const points = [{ x: Math.min(start, first.at - 1), y: Math.max(0, startLevel) }, ...list.map((e) => ({ x: e.at, y: e.value! }))];
      points.push({ x: Date.now(), y: points.at(-1)!.y });
      return { name: cap?.name ?? langName(lang), color: colors[i], points };
    });
  }, [events, capabilities]);

  const goalCards = (goals ?? []).map((g) => {
    const pace = paces.get(g.lang);
    const progress = pace ? goalProgress(g, { level: levelOf(g.lang === '*' ? language.id : g.lang), ...pace, hours: pace.hours + (capabilities?.find((c) => c.id === g.lang)?.extraHours ?? 0) }) : null;
    return { goal: g, progress };
  });
  const hasReadingChallenge = (goals ?? []).some((g) => g.kind === 'books-year');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button icon={Timer} onClick={() => setDrawer('log')}>
          Log time
        </Button>
        <Button variant="secondary" icon={Plus} onClick={() => setDrawer('moment')}>
          Add a moment
        </Button>
        <Button
          variant="ghost"
          icon={Target}
          onClick={() => {
            setEditingGoal(null);
            setGoalKind('level');
            setDrawer('goal');
          }}
        >
          New goal
        </Button>
      </div>

      {/* Goals */}
      {(goalCards.length > 0 || !hasReadingChallenge) && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {goalCards.map(({ goal, progress }) => (
            <div key={goal.id} className="group relative flex gap-4 rounded-3xl border border-line/70 bg-surface p-5">
              <Ring value={progress?.fraction ?? 0} size={64} stroke={6} color={gradeColor((progress?.fraction ?? 0) * 100)}>
                <span className="text-[13px] font-bold tabular-nums">{Math.round((progress?.fraction ?? 0) * 100)}%</span>
              </Ring>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold tracking-wide text-ink-faint uppercase">{goal.lang === '*' ? 'All languages' : langName(goal.lang)}</p>
                <p className="font-serif text-[18px] leading-snug font-semibold">{progress?.label ?? '…'}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{progress?.projection}</p>
              </div>
              <div className="absolute top-3 right-3 flex opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                <IconButton
                  icon={Pencil}
                  label="Edit goal"
                  size="sm"
                  onClick={() => {
                    setEditingGoal(goal);
                    setDrawer('goal');
                  }}
                />
                <IconButton icon={Trash2} label="Remove goal" size="sm" onClick={() => void removeGoal(goal.id)} />
              </div>
            </div>
          ))}
          {!hasReadingChallenge && (
            <button
              type="button"
              onClick={() => {
                setEditingGoal(null);
                setGoalKind('books-year');
                setDrawer('goal');
              }}
              className="flex items-center gap-4 rounded-3xl border border-dashed border-line-strong p-5 text-left transition-colors hover:bg-surface"
            >
              <span className="grid size-16 shrink-0 place-items-center rounded-full bg-sage-soft text-sage-text">
                <BookOpen size={24} aria-hidden />
              </span>
              <span>
                <span className="block font-serif text-[18px] font-semibold">{new Date().getFullYear()} reading challenge</span>
                <span className="block text-[13px] text-ink-soft">How many books will you read in your languages this year?</span>
              </span>
            </button>
          )}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Timeline */}
        <Panel title="Your journey" icon={Flag}>
          {(languages?.length ?? 0) > 1 && (
            <div className="-mt-1 mb-5 flex flex-wrap gap-1.5">
              {[{ id: 'all', label: 'All' }, ...(languages ?? []).map((l) => ({ id: l.id, label: langName(l.id) }))].map((o) => (
                <button key={o.id} type="button" onClick={() => setFilter(o.id)} className={cx('h-8 rounded-full border px-3 text-[12.5px] font-semibold', filter === o.id ? 'border-ink bg-inverse text-on-inverse' : 'border-line text-ink-soft hover:text-ink')}>
                  {o.label}
                </button>
              ))}
            </div>
          )}
          {!shown.length && <p className="py-8 text-center text-[15px] text-ink-soft">Your milestones will gather here: first words, books, hours and streaks.</p>}
          <div className="space-y-8">
            {byYear.map(([year, list]) => (
              <section key={year}>
                <h3 className="mb-4 font-serif text-xl font-semibold">{year}</h3>
                <ol className="relative ml-4 border-l border-line">
                  {list.map((e) => (
                    <TimelineItem key={e.id} event={e} showLang={filter === 'all' && (languages?.length ?? 0) > 1} />
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </Panel>

        <div className="space-y-5">
          {levelSeries.length > 0 && (
            <Panel title="Level over time" icon={TrendingUp}>
              <LineChart series={levelSeries} step formatX={(x) => new Date(x).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })} yMax={6} yTicks={CEFR_LEVELS.map((l, i) => ({ y: i, label: l })).filter((_, i) => i % 2 === 0 || i === 6)} height={150} />
            </Panel>
          )}
          <Panel title="Study log" icon={Timer}>
            {!logs?.length ? (
              <p className="text-[14px] leading-relaxed text-ink-soft">Classes, tutors and conversations count too. Log them and your hours, goals and statistics include them.</p>
            ) : (
              <ul className="-mx-1 space-y-1">
                {logs.slice(0, 12).map((l) => (
                  <li key={l.id} className="group flex items-center gap-3 rounded-xl px-1 py-1.5">
                    <span className="w-14 shrink-0 text-[12.5px] font-semibold text-ink-faint tabular-nums">{shortDate(l.at)}</span>
                    <span className="min-w-0 flex-1 truncate text-[14px]">
                      <span className="font-semibold">{LOG_ACTIVITIES.find((a) => a.id === l.activity)?.label}</span>
                      <span className="text-ink-soft">
                        {' '}
                        · {langName(l.lang)}
                        {l.note ? ` · ${l.note}` : ''}
                      </span>
                    </span>
                    <span className="text-[13px] font-semibold tabular-nums">{hours(l.minutes)}</span>
                    <IconButton icon={Trash2} label="Remove" size="sm" onClick={() => void removeStudyLog(l.id)} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <LogTimeDrawer open={drawer === 'log'} onClose={() => setDrawer(null)} languages={languages ?? []} lang={language.id} />
      <MomentDrawer open={drawer === 'moment'} onClose={() => setDrawer(null)} languages={languages ?? []} lang={language.id} />
      <GoalDrawer open={drawer === 'goal'} onClose={() => setDrawer(null)} languages={languages ?? []} lang={language.id} editing={editingGoal} startKind={goalKind} />
    </div>
  );
}

function TimelineItem({ event: e, showLang }: { event: JourneyEvent; showLang: boolean }) {
  const Icon = iconOf(e);
  const [photo, setPhoto] = useState<string | null>(null);
  useEffect(() => {
    if (!e.photoBlobId) return;
    let url: string | null = null;
    void blobUrl(e.photoBlobId).then((u) => {
      url = u;
      setPhoto(u);
    });
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [e.photoBlobId]);
  const milestone = e.kind !== 'manual';
  return (
    <li className="group relative mb-6 pl-8 last:mb-0">
      <span className={cx('absolute top-0 -left-[15px] grid size-[30px] place-items-center rounded-full ring-4 ring-surface', milestone ? 'bg-sage-soft text-sage-text' : 'bg-accent-soft text-accent-text')}>
        <Icon size={15} aria-hidden />
      </span>
      <p className="text-[12px] font-semibold text-ink-faint">
        {new Date(e.at).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}
        {showLang && ` · ${langName(e.lang)}`}
      </p>
      <p className="font-serif text-[17px] leading-snug font-semibold">{e.title}</p>
      {e.detail && <p className="mt-0.5 text-[14px] text-ink-soft">{e.detail}</p>}
      {photo && <img src={photo} alt="" className="mt-2 max-h-48 rounded-2xl object-cover" />}
      {!milestone && (
        <button type="button" onClick={() => void removeMoment(e.id)} className="mt-1 text-[12px] font-semibold text-ink-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-accent-text focus:opacity-100">
          Remove
        </button>
      )}
    </li>
  );
}
