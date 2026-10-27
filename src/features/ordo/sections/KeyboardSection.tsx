import { Keyboard } from 'lucide-react';
import { useApp } from '@/app/context';
import { patchSetting } from '@/data/settings';
import { Segmented } from '@/design/primitives';
import { ShortcutList, type KeyboardStyle } from '@/app/ShortcutsDialog';
import { SettingsSection } from '../SettingsSection';

export function KeyboardSection() {
  const { settings } = useApp();
  const keyboardStyle: KeyboardStyle = settings.ui.keyboardStyle ?? 'auto';

  return (
    <SettingsSection id="keyboard" icon={Keyboard} title="Keyboard shortcuts" description="Press ? anywhere to see these again.">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[15px] font-semibold">Command symbols</p>
          <p data-hint="" className="text-[13px] text-ink-soft">
            Choose whether modifier shortcuts show Mac (⌘ / ⌥) or Windows (Ctrl / Alt) symbols.
          </p>
        </div>
        <Segmented<KeyboardStyle>
          label="Command symbols"
          value={keyboardStyle}
          onChange={(val) => void patchSetting('ui', { keyboardStyle: val })}
          options={[
            { value: 'auto', label: 'Auto' },
            { value: 'mac', label: 'Mac (⌘ ⌥)' },
            { value: 'windows', label: 'Win (Ctrl Alt)' },
          ]}
        />
      </div>
      <ShortcutList style={keyboardStyle} />
    </SettingsSection>
  );
}
