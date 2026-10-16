import { Link } from 'react-router';
import { ChevronRight, FlaskConical, Gauge } from 'lucide-react';
import { patchSetting } from '@/data/settings';
import { ToggleRow } from '@/design/primitives';
import { SettingsSection } from '../SettingsSection';

export function PerformanceSection({ perfHud }: { perfHud: boolean }) {
  return (
    <SettingsSection id="performance" icon={Gauge} title="Performance" description="Lingua aims for a steady 60 frames per second.">
      <ToggleRow
        title="FPS monitor"
        description="A small live frame-rate readout in the corner of the screen."
        checked={perfHud}
        onChange={(on) => void patchSetting('ui', { perfHud: on })}
      />
      <Link
        to="/ordo/lab"
        className="mt-2 flex items-center gap-3 rounded-2xl border border-line bg-raised px-4 py-3 transition-colors hover:border-line-strong"
      >
        <FlaskConical size={18} className="text-sage-text" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Device lab</span>
          <span className="block text-[13px] text-ink-soft">Test background audio, storage, sharing and smoothness on this device.</span>
        </span>
        <ChevronRight size={18} className="text-ink-faint" aria-hidden />
      </Link>
    </SettingsSection>
  );
}
