import { Keyboard } from 'lucide-react';
import { ShortcutList } from '@/app/ShortcutsDialog';
import { SettingsSection } from '../SettingsSection';

export function KeyboardSection() {
  return (
    <SettingsSection id="keyboard" icon={Keyboard} title="Keyboard shortcuts" description="Press ? anywhere to see these again.">
      <ShortcutList />
    </SettingsSection>
  );
}
