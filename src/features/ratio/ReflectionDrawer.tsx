import { UiText, useUi } from '@/design/i18n/UiText';
// Weekly goal review, reflection prompts, habit formation and restart plans (6-17, F1128, F1170, F1171, F1173, F1174).

import { useState } from 'react';
import { Check, Heart } from 'lucide-react';
import { db } from '@/data/db';
import { HABIT_FORMATION_PLANS, RESTART_PLANS, REFLECTION_PROMPTS } from '@/core/ratio/analytics';
import type { HabitPlanTemplate } from '@/core/ratio/analytics';
import { patchSetting, useSettings } from '@/data/settings';
import { Button, Drawer } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { toast } from '@/state/ui';

export function ReflectionDrawer({
  open,
  onClose,
  lang,
  initialTab = 'reflect',
}: {
  open: boolean;
  onClose: () => void;
  lang: string;
  initialTab?: 'reflect' | 'habits' | 'restart';
}) {
  const translateUi = useUi();
  const [tab, setTab] = useState<'reflect' | 'habits' | 'restart'>(initialTab);
  const settings = useSettings();
  const activePlan = settings?.habits?.activePlan;

  // Reflection form state
  const [promptIdx, setPromptIdx] = useState(0);
  const [reflectionText, setReflectionText] = useState('');

  const currentPrompt = REFLECTION_PROMPTS[promptIdx % REFLECTION_PROMPTS.length];

  const saveReflection = async () => {
    if (!reflectionText.trim()) return;
    await db.journeyEvents.add({
      id: crypto.randomUUID(),
      lang,
      kind: 'reflection',
      at: Date.now(),
      title: 'Weekly Reflection',
      detail: `${currentPrompt}\n\n${reflectionText.trim()}`,
      category: 'reflection',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    setReflectionText('');
    toast('Reflection recorded in your learning journey.', { tone: 'success' });
    onClose();
  };

  const activatePlan = async (template: HabitPlanTemplate, type: 'habit' | 'restart') => {
    await patchSetting('habits', {
      activePlan: {
        type,
        title: template.title,
        description: template.description,
        steps: template.steps.map((s) => ({ ...s, done: false })),
        startedAt: Date.now(),
      },
    });
    toast({ source: 'Activated plan: "{0}"', values: [String(template.title)] }, { tone: 'success' });
    onClose();
  };

  const completeStep = async (stepIndex: number) => {
    if (!activePlan) return;
    const updatedSteps = activePlan.steps.map((s, idx) => (idx === stepIndex ? { ...s, done: !s.done } : s));
    await patchSetting('habits', {
      activePlan: {
        ...activePlan,
        steps: updatedSteps,
      },
    });
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        tab === 'reflect'
          ? translateUi('Weekly Review & Reflection')
          : tab === 'habits'
            ? translateUi('Habit Formation Routines')
            : translateUi('Welcome Back: Re-entry')
      }
      description={
        tab === 'reflect'
          ? translateUi('Take two quiet minutes to acknowledge your growth and notice how the language feels.')
          : tab === 'habits'
            ? translateUi('Anchor language practice to familiar rituals so consistency becomes effortless.')
            : translateUi('Return gently after a pause without the overwhelm of an overdue review mountain.')
      }
    >
      <div className="space-y-6">
        {/* Tab switcher */}
        <div className="flex rounded-xl border border-line bg-raised p-1 text-[13px] font-semibold">
          <button
            type="button"
            onClick={() => setTab('reflect')}
            className={cx('flex-1 rounded-lg py-1.5 transition-colors', tab === 'reflect' ? 'bg-surface text-ink shadow-xs' : 'text-ink-soft')}
          ><UiText source={'Reflect'} /></button>
          <button
            type="button"
            onClick={() => setTab('habits')}
            className={cx('flex-1 rounded-lg py-1.5 transition-colors', tab === 'habits' ? 'bg-surface text-ink shadow-xs' : 'text-ink-soft')}
          ><UiText source={'Habit Plans'} /></button>
          <button
            type="button"
            onClick={() => setTab('restart')}
            className={cx('flex-1 rounded-lg py-1.5 transition-colors', tab === 'restart' ? 'bg-surface text-ink shadow-xs' : 'text-ink-soft')}
          ><UiText source={'Restart Plan'} /></button>
        </div>

        {/* Tab 1: Reflection */}
        {tab === 'reflect' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-line-strong bg-raised p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-bold tracking-wider text-accent uppercase"><UiText source={'Reflection Prompt'} /></span>
                <button
                  type="button"
                  onClick={() => setPromptIdx((i) => i + 1)}
                  className="text-[12px] font-semibold text-ink-soft hover:text-ink hover:underline"
                ><UiText source={'Different question'} /></button>
              </div>
              <p className="mt-2 font-serif text-[16px] leading-snug font-medium text-ink">{currentPrompt}</p>
            </div>

            <div>
              <label className="block text-[12px] font-bold text-ink-faint uppercase"><UiText source={'Your thoughts'} /></label>
              <textarea
                rows={5}
                placeholder={translateUi('Write freely. What words did you encounter? What felt natural? What sparked curiosity?')}
                value={reflectionText}
                onChange={(e) => setReflectionText(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-line bg-surface p-3.5 text-[14px] leading-relaxed outline-none focus:border-ink"
              />
            </div>

            <Button block onClick={() => void saveReflection()} disabled={!reflectionText.trim()}><UiText source={'Save weekly reflection'} /></Button>
          </div>
        )}

        {/* Tab 2: Habit Plans */}
        {tab === 'habits' && (
          <div className="space-y-4">
            {activePlan?.type === 'habit' && (
              <div className="rounded-2xl border border-sage bg-sage/10 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-semibold text-ink"><UiText source={'Active Habit Routine: {0}'} values={[<UiText source={activePlan.title} />]} /></p>
                  <span className="text-[11px] font-bold text-sage uppercase"><UiText source={'In Progress'} /></span>
                </div>
                <ul className="mt-3 space-y-2">
                  {activePlan.steps.map((st, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-[13px]">
                      <button
                        type="button"
                        onClick={() => void completeStep(i)}
                        className={cx(
                          'flex size-5 items-center justify-center rounded-full border transition-colors',
                          st.done ? 'border-sage bg-sage text-bg' : 'border-line-strong bg-surface',
                        )}
                      >
                        {st.done && <Check size={12} />}
                      </button>
                      <span className={cx(st.done ? 'text-ink-faint line-through' : 'font-medium text-ink')}>
                        <UiText source={st.label} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-3">
              {HABIT_FORMATION_PLANS.map((plan) => (
                <div key={plan.id} className="rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-serif text-[15px] font-semibold text-ink"><UiText source={plan.title} /></p>
                      <p className="text-[12.5px] text-ink-soft"><UiText source={plan.subtitle} /></p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => void activatePlan(plan, 'habit')}><UiText source={'Start routine'} /></Button>
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-faint">{plan.description}</p>
                  <div className="mt-3 rounded-xl bg-raised px-3 py-1.5 text-[11.5px] font-medium text-ink-soft">
                    <span className="font-bold text-ink"><UiText source={'Habit Anchor:'} /></span> {plan.anchor}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Restart Plans */}
        {tab === 'restart' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-line-strong bg-raised p-4">
              <div className="flex items-center gap-2">
                <Heart size={18} className="text-accent" />
                <p className="font-serif text-[15px] font-semibold text-ink"><UiText source={'Language learning is for life'} /></p>
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-soft"><UiText source={'Breaks happen to every learner. Coming back should feel welcoming and gentle, not like paying a debt of overdue flashcards.'} /></p>
            </div>

            {activePlan?.type === 'restart' && (
              <div className="rounded-2xl border border-accent bg-accent-soft p-4">
                <p className="text-[14px] font-semibold text-ink"><UiText source={'Active Restart: {0}'} values={[<UiText source={activePlan.title} />]} /></p>
                <ul className="mt-3 space-y-2">
                  {activePlan.steps.map((st, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-[13px]">
                      <button
                        type="button"
                        onClick={() => void completeStep(i)}
                        className={cx(
                          'flex size-5 items-center justify-center rounded-full border transition-colors',
                          st.done ? 'border-accent bg-accent text-on-accent' : 'border-line-strong bg-surface',
                        )}
                      >
                        {st.done && <Check size={12} />}
                      </button>
                      <span className={cx(st.done ? 'text-ink-faint line-through' : 'font-medium text-ink')}>
                        <UiText source={st.label} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-3">
              {RESTART_PLANS.map((plan) => (
                <div key={plan.id} className="rounded-2xl border border-line bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-serif text-[15px] font-semibold text-ink"><UiText source={plan.title} /></p>
                      <p className="text-[12.5px] text-ink-soft"><UiText source={plan.subtitle} /></p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => void activatePlan(plan, 'restart')}><UiText source={'Activate plan'} /></Button>
                  </div>
                  <p className="mt-2 text-[13px] text-ink-soft">{plan.description}</p>
                  <ul className="mt-3 space-y-1.5">
                    {plan.steps.map((s) => (
                      <li key={s.day} className="flex items-center gap-2 text-[12.5px] text-ink-soft">
                        <span className="grid size-4 place-items-center rounded-full bg-sunken font-mono text-[10px] font-bold">
                          {s.day}
                        </span>
                        <span><UiText source={s.label} /></span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
