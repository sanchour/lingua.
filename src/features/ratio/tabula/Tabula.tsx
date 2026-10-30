import { UiText, useUi } from '@/design/i18n/UiText';
import { useEffect, useMemo, useState } from 'react';
import { Reorder, useDragControls } from 'motion/react';
import { Clock, FileUp, GripVertical, ImageDown, Plus, Target } from 'lucide-react';
import { codeForLanguage, LANGUAGE_NAMES, parseNotionLanguages } from '@/core/parsers/notion';
import { addCapability, goalProgress, goalStatus, importCapabilities, reorderCapabilities, seedCapabilities, useCapabilities, useGoals } from '@/data/journey';
import type { GoalStatus } from '@/data/journey';
import { grammarLevels } from '@/data/grammar';
import { useLanguages } from '@/data/languages';
import { hoursSince, languageSummaries, paceOf } from '@/data/ratio';
import type { LanguageSummary, Pace } from '@/data/ratio';
import type { Capability, Goal } from '@/data/types';
import { useLayout } from '@/design/hooks/useLayout';
import { Button, Popover } from '@/design/primitives';
import { downloadFile, pickFile } from '@/services/files/files';
import { toast } from '@/state/ui';
import { cx } from '@/lib/cx';
import { GoalDrawer, LogTimeDrawer } from '../forms';
import { hours } from '../common';
import { CapabilityDrawer } from './CapabilityDrawer';
import { renderTableImage } from './image';
import { LEVEL_TINT, SKILLS, STATUS_LABEL } from './levels';

const COLUMNS = 'grid-cols-[22px_minmax(0,1.3fr)_64px_minmax(0,1fr)_minmax(0,1.5fr)_96px_minmax(0,1fr)]';

export function LevelPill({ level }: { level: Capability['level'] }) {
  return (
    <span className="inline-grid h-7 min-w-11 place-items-center rounded-lg px-2 text-[12.5px] font-bold" style={{ background: LEVEL_TINT[level].bg, color: LEVEL_TINT[level].fg }}>
      {level}
    </span>
  );
}

/** Four small segments, one per skill, filled to its level. */
function SkillBars({ capability }: { capability: Capability }) {
  const s = capability.skills;
  if (!s || !Object.values(s).some(Boolean)) return null;
  const order = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  return (
    <span className="flex gap-0.5" title={SKILLS.map(([k, n]) => `${n}: ${s[k] ?? '—'}`).join(' · ')}>
      {SKILLS.map(([k]) => (
        <span key={k} className="h-1.5 w-3.5 overflow-hidden rounded-full bg-sunken">
          <span className="block h-full origin-left rounded-full bg-sage" style={{ transform: `scaleX(${s[k] ? order.indexOf(s[k]!) / 6 : 0})` }} />
        </span>
      ))}
    </span>
  );
}

export function Tabula() {
  const translateUi = useUi();
  const rows = useCapabilities();
  const studied = useLanguages();
  const { layout } = useLayout();
  const wide = layout === 'wide';
  const [order, setOrder] = useState<string[]>([]);
  const [open, setOpen] = useState<Capability | null>(null);
  const [summaries, setSummaries] = useState<Map<string, LanguageSummary>>(new Map());
  const [yearHours, setYearHours] = useState(0);
  const [grammar, setGrammar] = useState<Map<string, { level: string | null; learned: number }>>(new Map());
  const [newName, setNewName] = useState('');
  const goals = useGoals();
  const [paces, setPaces] = useState<Map<string, Pace>>(new Map());
  const [goalDrawer, setGoalDrawer] = useState<{ lang: string; goal: Goal | null } | null>(null);
  const [logOpen, setLogOpen] = useState(false);

  useEffect(() => void seedCapabilities(), []);
  useEffect(() => setOrder((rows ?? []).map((r) => r.id)), [rows]);
  useEffect(() => {
    const ids = (studied ?? []).map((l) => l.id);
    void languageSummaries(ids).then((list) => setSummaries(new Map(list.map((s) => [s.lang, s]))));
    void hoursSince(new Date(new Date().getFullYear(), 0, 1).getTime()).then(setYearHours);
    void grammarLevels(ids).then(setGrammar);
  }, [studied]);

  const goalLangs = useMemo(() => [...new Set((goals ?? []).map((g) => g.lang))].join(','), [goals]);
  useEffect(() => {
    const ids = goalLangs ? goalLangs.split(',') : [];
    void Promise.all(ids.map(async (id) => [id, await paceOf(id)] as const)).then((list) => setPaces(new Map(list)));
  }, [goalLangs, goals]);

  const byId = useMemo(() => new Map((rows ?? []).map((r) => [r.id, r])), [rows]);
  const ordered = order.map((id) => byId.get(id)).filter((r): r is Capability => Boolean(r));
  const advanced = ordered.filter((r) => r.level === 'C1' || r.level === 'C2').length;
  const live = (c: Capability) => {
    const s = summaries.get(c.id);
    const extra = c.extraHours ?? 0;
    const g = grammar.get(c.id);
    if (!s && !extra) return null;
    const grammarNote = g?.level ? `grammar ${g.level}` : g?.learned ? `${g.learned} grammar ${g.learned === 1 ? 'topic' : 'topics'}` : null;
    return [s ? `${s.known.toLocaleString()} words` : null, grammarNote, hours(((s?.hours ?? 0) + extra) * 60)].filter(Boolean).join(' · ');
  };

  /** A language's goal: its level goal first, else a weekly one; reading challenges sit above the table. */
  const goalFor = (c: Capability): RowGoal | undefined => {
    const mine = (goals ?? []).filter((g) => g.lang === c.id && g.kind !== 'books-year');
    const goal = mine.find((g) => g.kind === 'level') ?? mine[0];
    const pace = paces.get(c.id);
    if (!goal || !pace) return undefined;
    const p = goalProgress(goal, { level: c.level, ...pace, hours: pace.hours + (c.extraHours ?? 0) });
    return { goal, label: p.label, fraction: p.fraction, status: goalStatus(goal, p) };
  };
  const challenges = (goals ?? []).filter((g) => g.kind === 'books-year');

  const importNotion = async () => {
    const file = await pickFile('.csv,text/csv');
    if (!file) return;
    try {
      const { added, updated } = await importCapabilities(parseNotionLanguages(await file.text()));
      toast({ source: 'Imported: {0} added, {1} updated.', values: [String(added), String(updated)] }, { tone: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'That file couldn’t be read.', { tone: 'error' });
    }
  };

  const shareImage = async () => {
    const blob = await renderTableImage(ordered, live);
    downloadFile(new File([blob], 'my-languages.png', { type: 'image/png' }));
  };

  const add = async (close: () => void) => {
    const name = newName.trim();
    if (!name) return;
    const id = codeForLanguage(name);
    if (byId.has(id)) toast({ source: '{0} is already in your table.', values: [String(LANGUAGE_NAMES[id] ?? name)] });
    else await addCapability(LANGUAGE_NAMES[id] ?? name, id);
    setNewName('');
    close();
  };

  if (!rows) return <div className="h-64 animate-pulse rounded-3xl bg-surface" />;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <p className="w-full font-serif text-[19px] sm:w-auto sm:min-w-0 sm:flex-1">
          {ordered.length} {ordered.length === 1 ? translateUi('language') : translateUi('languages')}
          {advanced > 0 && <span className="text-ink-soft"><UiText source={' · {0} at C1+'} values={[advanced]} /></span>}
          <span className="text-ink-soft"><UiText source={' · {0} this year'} values={[hours(yearHours * 60)]} /></span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Popover
            label={translateUi('Add a language')}
            placement="bottom-end"
            trigger={(props) => (
              <Button {...props} icon={Plus} variant="secondary"><UiText source={'Add'} /></Button>
            )}
          >
            {(close) => (
              <form
                className="flex w-72 gap-2 p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void add(close);
                }}
              >
                <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={translateUi('e.g. Dutch, Arabic')} aria-label={translateUi('Language')} className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-raised px-3 text-[14.5px] outline-none focus:border-ink" />
                <Button type="submit"><UiText source={'Add'} /></Button>
              </form>
            )}
          </Popover>
          <Button variant="ghost" icon={Target} onClick={() => setGoalDrawer({ lang: ordered[0]?.id ?? '', goal: null })} disabled={!ordered.length}><UiText source={'Goal'} /></Button>
          <Button variant="ghost" icon={Clock} onClick={() => setLogOpen(true)} disabled={!ordered.length}><UiText source={'Log time'} /></Button>
          <Button variant="ghost" icon={FileUp} onClick={() => void importNotion()}><UiText source={'Notion CSV'} /></Button>
          <Button variant="ghost" icon={ImageDown} onClick={() => void shareImage()} disabled={!ordered.length}><UiText source={'Image'} /></Button>
        </div>
      </div>

      {challenges.map((g) => {
        const pace = paces.get(g.lang);
        if (!pace) return null;
        const p = goalProgress(g, { level: 'A0', ...pace });
        return (
          <button key={g.id} type="button" onClick={() => setGoalDrawer({ lang: g.lang === '*' ? (ordered[0]?.id ?? '') : g.lang, goal: g })} className="mb-5 flex w-full items-center gap-4 rounded-2xl border border-line/70 bg-surface px-4 py-3 text-left">
            <Target size={18} className="shrink-0 text-ink-faint" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-semibold"><UiText source={'Reading challenge · {0}'} values={[p.label]} /></span>
              <span className="block truncate text-[13px] text-ink-soft">{p.projection}</span>
            </span>
            <span className="h-1.5 w-28 shrink-0 overflow-hidden rounded-full bg-sunken">
              <span className="block h-full rounded-full bg-sage" style={{ width: `${p.fraction * 100}%` }} />
            </span>
          </button>
        );
      })}

      {wide && (
        <div className={`grid ${COLUMNS} gap-3 border-b border-line px-3 pb-2 text-[11.5px] font-bold tracking-wide text-ink-faint uppercase`}>
          <span />
          <span><UiText source={'Language'} /></span>
          <span><UiText source={'Level'} /></span>
          <span><UiText source={'Status'} /></span>
          <span><UiText source={'Method'} /></span>
          <span><UiText source={'Started'} /></span>
          <span><UiText source={'In Lingua'} /></span>
        </div>
      )}
      <Reorder.Group
        axis="y"
        values={order}
        onReorder={setOrder}
        className={wide ? '' : 'space-y-2.5'}
        as="ul"
      >
        {ordered.map((c) => (
          <Row key={c.id} capability={c} wide={wide} live={live(c)} goal={goalFor(c)} onGoal={(goal) => setGoalDrawer({ lang: c.id, goal: goal ?? null })} onOpen={() => setOpen(c)} onDrop={() => void reorderCapabilities(order)} />
        ))}
      </Reorder.Group>
      {!ordered.length && <p className="py-10 text-center text-ink-soft"><UiText source={'Add the languages you speak, even ones Lingua doesn’t teach.'} /></p>}
      <p className="mt-5 text-[12.5px] text-ink-faint"><UiText source={'Drag the handle to reorder. Tap a language for skills, certificates and notes. Notion: export your table as CSV (Dutch or English columns).'} /></p>

      <LogTimeDrawer open={logOpen} onClose={() => setLogOpen(false)} languages={studied ?? []} lang={ordered[0]?.id ?? ''} />
      <GoalDrawer open={goalDrawer !== null} onClose={() => setGoalDrawer(null)} languages={studied ?? []} lang={goalDrawer?.lang ?? ''} editing={goalDrawer?.goal} />
      <CapabilityDrawer capability={open} onClose={() => setOpen(null)} live={open ? (live(open) ?? undefined) : undefined} />
    </div>
  );
}

interface RowGoal {
  goal: Goal;
  label: string;
  fraction: number;
  status: GoalStatus;
}

/** A language's goal as a slim bar and a word on how it is going, or a quiet way to set one. */
function GoalLine({ goal, onGoal }: { goal?: RowGoal; onGoal: (goal?: Goal) => void }) {
  return (
    <button type="button" onClick={() => onGoal(goal?.goal)} className="mt-1 flex max-w-full items-center gap-2 text-left text-[12.5px]">
      {goal ? (
        <>
          <span className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-sunken">
            <span className="block h-full rounded-full bg-sage" style={{ width: `${goal.fraction * 100}%` }} />
          </span>
          <span className="min-w-0 truncate text-ink-soft">{goal.label}</span>
          {goal.status !== 'open' && <span className={cx('shrink-0 font-bold', goal.status === 'behind' ? 'text-accent-text' : 'text-sage-text')}>{goal.status}</span>}
        </>
      ) : (
        <span className="text-ink-faint hover:text-ink"><UiText source={'+ Set a goal'} /></span>
      )}
    </button>
  );
}

function Row({ capability: c, wide, live, goal, onGoal, onOpen, onDrop }: { capability: Capability; wide: boolean; live: string | null; goal?: RowGoal; onGoal: (goal?: Goal) => void; onOpen: () => void; onDrop: () => void }) {
  const translateUi = useUi();
  const controls = useDragControls();
  const handle = (
    <button
      type="button"
      aria-label={translateUi('Move {0}', [c.name])}
      onPointerDown={(e) => controls.start(e)}
      className="grid size-7 cursor-grab touch-none place-items-center rounded-lg text-ink-faint hover:bg-surface hover:text-ink active:cursor-grabbing pointer-coarse:size-10"
    >
      <GripVertical size={16} aria-hidden />
    </button>
  );
  const started = c.started ? new Date(`${c.started}T12:00:00`).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—';
  return (
    <Reorder.Item value={c.id} dragListener={false} dragControls={controls} onDragEnd={onDrop} as="li" className="relative list-none bg-bg">
      {wide ? (
        <div className={`grid ${COLUMNS} items-center gap-3 border-b border-line px-3 py-3`}>
          {handle}
          <div className="min-w-0">
            <button type="button" onClick={onOpen} className="flex min-w-0 items-center gap-2 text-left">
              <span className="truncate font-serif text-[17px] font-semibold hover:underline">{c.name}</span>
              <SkillBars capability={c} />
            </button>
            <GoalLine goal={goal} onGoal={onGoal} />
          </div>
          <LevelPill level={c.level} />
          <span className="truncate text-[14px] text-ink-soft">{STATUS_LABEL[c.status]}</span>
          <span className="flex min-w-0 flex-wrap gap-1">
            {c.methods.map((m) => (
              <span key={m} className="rounded-full bg-sunken px-2.5 py-0.5 text-[12px] font-semibold text-ink-soft">
                {m}
              </span>
            ))}
          </span>
          <span className="text-[13.5px] text-ink-soft tabular-nums">{started}</span>
          <span className="truncate text-[13px] text-ink-faint">{live ?? '—'}</span>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-line/70 bg-surface p-3.5">
          {handle}
          <div className="min-w-0 flex-1">
            <button type="button" onClick={onOpen} className="block w-full min-w-0 text-left">
              <span className="flex items-center gap-2">
                <span className="truncate font-serif text-[18px] font-semibold">{c.name}</span>
                <SkillBars capability={c} />
              </span>
              <span className="mt-0.5 block truncate text-[13px] text-ink-soft">
                {STATUS_LABEL[c.status]}
                {c.methods.length ? ` · ${c.methods.join(', ')}` : ''}
              </span>
              {live && <span className="mt-0.5 block truncate text-[12.5px] text-ink-faint">{live}</span>}
            </button>
            <GoalLine goal={goal} onGoal={onGoal} />
          </div>
          <LevelPill level={c.level} />
        </div>
      )}
    </Reorder.Item>
  );
}
