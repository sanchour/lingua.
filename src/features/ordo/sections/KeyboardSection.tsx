import { UiText, useUi } from '@/design/i18n/UiText';
import { Keyboard } from 'lucide-react';
import { useApp } from '@/app/context';
import { patchSetting } from '@/data/settings';
import { Segmented } from '@/design/primitives';
import { ShortcutList, type KeyboardStyle } from '@/app/ShortcutsDialog';
import { SettingsSection } from '../SettingsSection';

export function KeyboardSection() {
  const translateUi = useUi();
  const { settings } = useApp();
  const keyboardStyle: KeyboardStyle = settings.ui.keyboardStyle ?? 'auto';

  return (
    <SettingsSection id="keyboard" icon={Keyboard} title={translateUi('Keyboard shortcuts')} description={translateUi('Press ? anywhere to see these again.')}>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[15px] font-semibold"><UiText source={'Command symbols'} /></p>
          <p data-hint="" className="text-[13px] text-ink-soft"><UiText source={'Choose whether modifier shortcuts show Mac (⌘ / ⌥) or Windows (Ctrl / Alt) symbols.'} /></p>
        </div>
        <Segmented<KeyboardStyle>
          label={translateUi('Command symbols')}
          value={keyboardStyle}
          onChange={(val) => void patchSetting('ui', { keyboardStyle: val })}
          options={[
            { value: 'auto', label: translateUi('Auto') },
            { value: 'mac', label: translateUi('Mac (⌘ ⌥)') },
            { value: 'windows', label: translateUi('Win (Ctrl Alt)') },
          ]}
        />
      </div>
      <ShortcutList style={keyboardStyle} />
    </SettingsSection>
  );
}
