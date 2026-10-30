// Real-life communication goals and real-world language encounters log (6-17, F0837, F0840).
// Bridges the digital study space to the real world: ordering food, asking directions, spontaneous conversations.

import { useState } from 'react';
import { CheckCircle2, Circle, Compass, MessageCircle, Plus, Trash2 } from 'lucide-react';
import { db } from '@/data/db';
import { useGoals, saveGoal, removeGoal } from '@/data/journey';
import type { Goal } from '@/data/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button, Drawer } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { toast } from '@/state/ui';

export const PRESET_REAL_LIFE_GOALS = [
  'Order a coffee or meal completely in the target language',
  'Ask a local for directions on the street and understand the response',
  'Understand a public transit or airport announcement without subtitles',
  'Make a phone call, booking, or restaurant reservation',
  'Engage in a 5-minute spontaneous casual chat with a native speaker',
  'Read a local newspaper headline, metro sign, or museum plaque',
  'Explain your hobby or profession to someone in the language',
  'Tell a joke or funny personal anecdote that lands naturally',
];

export function RealLifeGoalsPanel({ lang }: { lang: string }) {
  const allGoals = useGoals();
  const realGoals = (allGoals ?? []).filter((g) => g.lang === lang && g.kind === 'real-life');

  const encounters = useLiveQuery(
    async () => (await db.journeyEvents.where('lang').equals(lang).toArray()).filter((e) => e.kind === 'encounter'),
    [lang],
  );

  const [addGoalOpen, setAddGoalOpen] = useState(false);
  const [logEncounterOpen, setLogEncounterOpen] = useState(false);

  const toggleGoalComplete = async (goal: Goal) => {
    const isCompleted = Boolean(goal.completedAt);
    await saveGoal({
      ...goal,
      completedAt: isCompleted ? undefined : Date.now(),
    });
    toast(isCompleted ? 'Goal marked active.' : 'Real-life goal accomplished! 🎉', { tone: 'success' });
  };

  return (
    <div className="space-y-4 rounded-3xl bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Compass size={20} className="text-accent" />
            <h3 className="font-serif text-[18px] font-semibold text-ink">Real-life goals & encounters</h3>
          </div>
          <p className="mt-0.5 text-[13px] text-ink-soft">
            Language lives in encounters, not just drills. Track practical communication milestones.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" icon={MessageCircle} onClick={() => setLogEncounterOpen(true)}>
            Log encounter
          </Button>
          <Button variant="ghost" icon={Plus} onClick={() => setAddGoalOpen(true)}>
            Add goal
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Goals Checklist */}
        <div>
          <p className="mb-2.5 text-[12px] font-bold tracking-wider text-ink-faint uppercase">Communication Checklist</p>
          {realGoals.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line p-4 text-center">
              <p className="text-[13px] text-ink-soft">No real-life goals set yet.</p>
              <Button size="sm" variant="secondary" className="mt-2" icon={Plus} onClick={() => setAddGoalOpen(true)}>
                Pick practical goals
              </Button>
            </div>
          ) : (
            <ul className="space-y-2">
              {realGoals.map((g) => {
                const done = Boolean(g.completedAt);
                return (
                  <li
                    key={g.id}
                    className={cx(
                      'flex items-center justify-between rounded-xl border p-3 transition-colors',
                      done ? 'border-line bg-surface/50 text-ink-faint' : 'border-line-strong bg-raised text-ink',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => void toggleGoalComplete(g)}
                      className="flex flex-1 items-center gap-3 text-left"
                    >
                      {done ? <CheckCircle2 size={18} className="text-sage" /> : <Circle size={18} className="text-ink-faint" />}
                      <span className={cx('text-[14px] font-medium', done && 'line-through')}>{String(g.target)}</span>
                    </button>
                    <Button size="sm" variant="ghost" icon={Trash2} onClick={() => void removeGoal(g.id)} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Encounters Log */}
        <div>
          <p className="mb-2.5 text-[12px] font-bold tracking-wider text-ink-faint uppercase">Recorded Encounters</p>
          {(encounters ?? []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line p-4 text-center">
              <p className="text-[13px] text-ink-soft">No encounters logged yet.</p>
              <p className="mt-1 text-[12px] text-ink-faint">Did you chat with a barista or hear an accent today?</p>
              <Button size="sm" variant="secondary" className="mt-2" icon={MessageCircle} onClick={() => setLogEncounterOpen(true)}>
                Record an encounter
              </Button>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {(encounters ?? []).slice(0, 5).map((e) => (
                <li key={e.id} className="rounded-xl border border-line bg-raised p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[13.5px] font-semibold text-ink">{e.title}</p>
                    <span className="text-[11px] text-ink-faint">
                      {new Date(e.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  {e.detail && <p className="mt-1 text-[12.5px] text-ink-soft">{e.detail}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Add Goal Drawer */}
      <AddRealLifeGoalDrawer open={addGoalOpen} onClose={() => setAddGoalOpen(false)} lang={lang} />

      {/* Log Encounter Drawer */}
      <LogEncounterDrawer open={logEncounterOpen} onClose={() => setLogEncounterOpen(false)} lang={lang} />
    </div>
  );
}

function AddRealLifeGoalDrawer({ open, onClose, lang }: { open: boolean; onClose: () => void; lang: string }) {
  const [customText, setCustomText] = useState('');

  const pickPreset = async (text: string) => {
    await saveGoal({
      lang,
      kind: 'real-life',
      target: text,
    });
    toast('Goal added to checklist.');
    onClose();
  };

  const addCustom = async () => {
    if (!customText.trim()) return;
    await saveGoal({
      lang,
      kind: 'real-life',
      target: customText.trim(),
    });
    setCustomText('');
    toast('Custom real-life goal added.');
    onClose();
  };

  return (
    <Drawer open={open} onClose={onClose} title="Add real-life communication goal" description="Tangible milestones beyond the app.">
      <div className="space-y-5">
        <div>
          <label className="block text-[12px] font-bold text-ink-faint uppercase">Write your own goal</label>
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              placeholder="e.g. Chat with my Spanish neighbor about the garden"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              className="h-10 flex-1 rounded-xl border border-line bg-surface px-3 text-[14px] outline-none"
            />
            <Button variant="secondary" onClick={() => void addCustom()} disabled={!customText.trim()}>
              Add
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[12px] font-bold tracking-wider text-ink-faint uppercase">Or choose common practical goals</p>
          <div className="space-y-1.5">
            {PRESET_REAL_LIFE_GOALS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => void pickPreset(preset)}
                className="flex w-full items-center justify-between rounded-xl border border-line bg-surface p-3 text-left text-[13.5px] font-medium text-ink transition-colors hover:border-ink hover:bg-raised"
              >
                <span>{preset}</span>
                <Plus size={14} className="text-ink-faint" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </Drawer>
  );
}

function LogEncounterDrawer({ open, onClose, lang }: { open: boolean; onClose: () => void; lang: string }) {
  const [situation, setSituation] = useState('');
  const [detail, setDetail] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const save = async () => {
    if (!situation.trim()) return;
    await db.journeyEvents.add({
      id: crypto.randomUUID(),
      lang,
      kind: 'encounter',
      at: new Date(`${date}T12:00:00`).getTime(),
      title: situation.trim(),
      detail: detail.trim() || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    toast('Encounter recorded in your journey!', { tone: 'success' });
    setSituation('');
    setDetail('');
    onClose();
  };

  return (
    <Drawer open={open} onClose={onClose} title="Log a real-world encounter" description="Celebrate moments you used or encountered the language in daily life.">
      <div className="space-y-4">
        <div>
          <label className="block text-[12px] font-bold text-ink-faint uppercase">What happened / Where?</label>
          <input
            type="text"
            placeholder="e.g. Ordered espresso at local Italian café, overheard French tourists"
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            className="mt-1 h-10 w-full rounded-xl border border-line bg-surface px-3 text-[14px] outline-none"
          />
        </div>
        <div>
          <label className="block text-[12px] font-bold text-ink-faint uppercase">How did it feel / Notes</label>
          <textarea
            rows={3}
            placeholder="e.g. Understood their greeting right away; took a moment to recall the word for receipt."
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-surface p-3 text-[14px] outline-none"
          />
        </div>
        <div>
          <label className="block text-[12px] font-bold text-ink-faint uppercase">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 h-10 w-full rounded-xl border border-line bg-surface px-3 text-[14px] outline-none"
          />
        </div>
        <Button block onClick={() => void save()} disabled={!situation.trim()}>
          Save encounter
        </Button>
      </div>
    </Drawer>
  );
}
