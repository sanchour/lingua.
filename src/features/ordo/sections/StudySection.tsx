import { useUi } from '@/design/i18n/UiText';
import { GraduationCap } from 'lucide-react';
import { patchSetting } from '@/data/settings';
import type { Settings } from '@/data/settings';
import { Slider, ToggleRow } from '@/design/primitives';
import { SettingsSection } from '../SettingsSection';
import { useDraft } from '../useDraft';

export function StudySection({ study }: { study: Settings['study'] }) {
  const translateUi = useUi();
  const [newPerDay, setNewPerDay] = useDraft(study.newPerDay, (v) => void patchSetting('study', { newPerDay: v }));
  const [retention, setRetention] = useDraft(Math.round(study.desiredRetention * 100), (v) => void patchSetting('study', { desiredRetention: v / 100 }));

  return (
    <SettingsSection id="study" icon={GraduationCap} title={translateUi('Study')} description={translateUi('How flashcards and Ludus behave. Each deck can change its own pace in its settings.')}>
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
      </div>
    </SettingsSection>
  );
}
