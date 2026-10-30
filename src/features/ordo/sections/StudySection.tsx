import { UiText, useUi } from '@/design/i18n/UiText';
import { Download, GraduationCap, Moon } from 'lucide-react';
import { patchSetting } from '@/data/settings';
import type { HabitSettings, Settings } from '@/data/settings';
import { Button, Slider, ToggleRow } from '@/design/primitives';
import { downloadFile } from '@/services/files/files';
import { createStudyCalendarIcs, requestNotificationPermission } from '@/services/notifications/reminders';
import { toast } from '@/state/ui';
import { SettingsSection } from '../SettingsSection';
import { useDraft } from '../useDraft';
import { cx } from '@/lib/cx';

const DAYS_OF_WEEK = [
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
  { id: 0, label: 'Sun' },
];

export function StudySection({
  study,
  habits,
  langName = 'Target Language',
}: {
  study: Settings['study'];
  habits?: HabitSettings;
  langName?: string;
}) {
  const translateUi = useUi();
  const currentHabits = habits ?? {
    streakEnabled: true,
    restDays: [],
    flexibleWeeklyMinutes: 120,
    remindersEnabled: false,
    reminderTimes: ['19:30'],
    quietHours: { enabled: true, start: '22:00', end: '08:00' },
    rewards: [],
  };

  const [newPerDay, setNewPerDay] = useDraft(study.newPerDay, (v) => void patchSetting('study', { newPerDay: v }));
  const [retention, setRetention] = useDraft(Math.round(study.desiredRetention * 100), (v) => void patchSetting('study', { desiredRetention: v / 100 }));
  const [weeklyMins, setWeeklyMins] = useDraft(currentHabits.flexibleWeeklyMinutes, (v) => void patchSetting('habits', { flexibleWeeklyMinutes: v }));

  const toggleRestDay = (dayId: number) => {
    const active = currentHabits.restDays.includes(dayId);
    const updated = active ? currentHabits.restDays.filter((d) => d !== dayId) : [...currentHabits.restDays, dayId];
    void patchSetting('habits', { restDays: updated });
  };

  const handleToggleReminders = async (enabled: boolean) => {
    if (enabled) {
      const perm = await requestNotificationPermission();
      if (perm !== 'granted') {
        toast('Notification permission was not granted by your browser.', { tone: 'error' });
      }
    }
    void patchSetting('habits', { remindersEnabled: enabled });
  };

  const exportIcs = () => {
    const icsContent = createStudyCalendarIcs({
      languageName: langName,
      reminderTimes: currentHabits.reminderTimes,
      restDays: currentHabits.restDays,
      weeklyTargetMinutes: currentHabits.flexibleWeeklyMinutes,
    });
    downloadFile(new File([icsContent], `${langName.toLowerCase()}-study-schedule.ics`, { type: 'text/calendar' }));
    toast('Study calendar (.ics) downloaded.', { tone: 'success' });
  };

  return (
    <SettingsSection id="study" icon={GraduationCap} title={translateUi('Study')} description={translateUi('How flashcards, habits, goals and reminders behave.')}>
      <Slider label={translateUi('New cards a day, for new decks')} value={newPerDay} min={0} max={60} onChange={setNewPerDay} />
      <Slider label={translateUi('Remember, for new decks')} value={retention} min={80} max={97} onChange={setRetention} format={(v) => `${v}%`} />

      <div className="divide-y divide-line">
        <ToggleRow
          title={translateUi('Ludus counts as review')}
          description={translateUi('Answers on due cards move them along the schedule. Extra practice never does.')}
          checked={study.ludusAffectsSchedule}
          onChange={(v) => void patchSetting('study', { ludusAffectsSchedule: v })}
        />
        <ToggleRow
          title={translateUi('Settled cards become Known')}
          description={translateUi('When a card’s interval reaches three weeks, its word stops being highlighted in your books.')}
          checked={study.autoPromoteMature}
          onChange={(v) => void patchSetting('study', { autoPromoteMature: v })}
        />
        <ToggleRow
          title={translateUi('Streak tracking')}
          description={translateUi('Show consecutive goal days and milestones. Turn off for a zero-pressure learning environment without counters.')}
          checked={currentHabits.streakEnabled}
          onChange={(v) => void patchSetting('habits', { streakEnabled: v })}
        />
      </div>

      {/* Rest Days */}
      <div className="mt-4 rounded-2xl border border-line bg-raised p-4">
        <label className="block text-[13px] font-semibold text-ink"><UiText source={'Rest days'} /></label>
        <p className="mt-0.5 text-[12px] text-ink-soft"><UiText source={'Designate rest days where not studying will never break your streak or trigger reminders.'} /></p>
        <div className="mt-3 flex flex-wrap gap-2">
          {DAYS_OF_WEEK.map((d) => {
            const isRest = currentHabits.restDays.includes(d.id);
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => toggleRestDay(d.id)}
                className={cx(
                  'h-8 w-11 rounded-lg border text-[12px] font-semibold transition-colors',
                  isRest ? 'border-sage bg-sage text-bg' : 'border-line bg-surface text-ink-soft hover:text-ink',
                )}
              >
                <UiText source={d.label} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Flexible Weekly Target */}
      <div className="mt-4">
        <Slider
          label={translateUi('Flexible weekly target')}
          value={weeklyMins}
          min={30}
          max={600}
          step={15}
          format={(v) => `${v} min / week`}
          onChange={setWeeklyMins}
        />
        <p className="-mt-1 text-[12px] text-ink-faint"><UiText source={'Bending targets distribute smoothly across your active study days, accommodating rest days.'} /></p>
      </div>

      {/* Reminders & Quiet Hours */}
      <div className="mt-4 divide-y divide-line rounded-2xl border border-line bg-raised p-4">
        <ToggleRow
          title={translateUi('Study reminders')}
          description={translateUi('Desktop notifications at chosen times. Suppressed automatically during quiet hours.')}
          checked={currentHabits.remindersEnabled}
          onChange={(v) => void handleToggleReminders(v)}
        />

        {currentHabits.remindersEnabled && (
          <div className="pt-3 space-y-3">
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-medium text-ink"><UiText source={'Reminder time'} /></span>
              <input
                type="time"
                value={currentHabits.reminderTimes[0] ?? '19:30'}
                onChange={(e) => void patchSetting('habits', { reminderTimes: [e.target.value] })}
                className="h-8 rounded-lg border border-line bg-surface px-2 font-mono text-[13px] outline-none"
              />
            </div>

            <div className="flex items-center justify-between text-[13px]">
              <div className="flex items-center gap-2">
                <Moon size={15} className="text-ink-soft" />
                <span className="font-medium text-ink"><UiText source={'Quiet hours window'} /></span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[12.5px]">
                <input
                  type="time"
                  value={currentHabits.quietHours.start}
                  onChange={(e) =>
                    void patchSetting('habits', {
                      quietHours: { ...currentHabits.quietHours, start: e.target.value },
                    })
                  }
                  className="h-8 rounded-lg border border-line bg-surface px-1.5 outline-none"
                />
                <span className="text-ink-faint"><UiText source={'to'} /></span>
                <input
                  type="time"
                  value={currentHabits.quietHours.end}
                  onChange={(e) =>
                    void patchSetting('habits', {
                      quietHours: { ...currentHabits.quietHours, end: e.target.value },
                    })
                  }
                  className="h-8 rounded-lg border border-line bg-surface px-1.5 outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Study Calendar Export */}
      <div className="mt-4 flex items-center justify-between rounded-2xl border border-line bg-surface p-4">
        <div>
          <p className="text-[13.5px] font-semibold text-ink"><UiText source={'Export study calendar'} /></p>
          <p className="text-[12px] text-ink-soft"><UiText source={'Add your recurring study routine to Apple Calendar, Google Calendar or Outlook (.ics).'} /></p>
        </div>
        <Button variant="secondary" icon={Download} onClick={exportIcs}><UiText source={'Download .ics'} /></Button>
      </div>
    </SettingsSection>
  );
}
