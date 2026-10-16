import { Monitor, Moon, Palette, Sun } from 'lucide-react';
import { setSetting } from '@/data/settings';
import type { ThemePref } from '@/data/settings';
import { Segmented } from '@/design/primitives';
import { SettingsSection } from '../SettingsSection';

export function AppearanceSection({ theme }: { theme: ThemePref }) {
  return (
    <SettingsSection id="appearance" icon={Palette} title="Appearance" description="Paper for daylight, Nocturne for the evening.">
      <Segmented<ThemePref>
        label="Theme"
        value={theme}
        onChange={(value) => void setSetting('theme', value)}
        block
        options={[
          { value: 'paper', label: 'Paper', icon: Sun },
          { value: 'nocturne', label: 'Nocturne', icon: Moon },
          { value: 'system', label: 'Device', icon: Monitor },
        ]}
      />
      <p className="mt-3 text-[13px] text-ink-soft">On iPhone, the status bar colour updates the next time you open Lingua.</p>
    </SettingsSection>
  );
}
