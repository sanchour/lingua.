import { GraduationCap } from 'lucide-react';
import { patchSetting } from '@/data/settings';
import type { Settings } from '@/data/settings';
import { Slider, ToggleRow } from '@/design/primitives';
import { SettingsSection } from '../SettingsSection';
import { useDraft } from '../useDraft';

export function StudySection({ study }: { study: Settings['study'] }) {
  const [newPerDay, setNewPerDay] = useDraft(study.newPerDay, (v) => void patchSetting('study', { newPerDay: v }));
  const [retention, setRetention] = useDraft(Math.round(study.desiredRetention * 100), (v) => void patchSetting('study', { desiredRetention: v / 100 }));

  return (
    <SettingsSection id="study" icon={GraduationCap} title="Study" description="How flashcards and Ludus behave. Each deck can change its own pace in its settings.">
      <Slider label="New cards a day, for new decks" value={newPerDay} min={0} max={60} onChange={setNewPerDay} />
      <Slider label="Remember, for new decks" value={retention} min={80} max={97} onChange={setRetention} format={(v) => `${v}%`} />
      <div className="divide-y divide-line">
        <ToggleRow
          title="Ludus counts as review"
          description="Answers on due cards move them along the schedule. Extra practice never does."
          checked={study.ludusAffectsSchedule}
          onChange={(v) => void patchSetting('study', { ludusAffectsSchedule: v })}
        />
        <ToggleRow
          title="Settled cards become Known"
          description="When a card’s interval reaches three weeks, its word stops being highlighted in your books."
          checked={study.autoPromoteMature}
          onChange={(v) => void patchSetting('study', { autoPromoteMature: v })}
        />
      </div>
    </SettingsSection>
  );
}
