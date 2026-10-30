import { UiText, useUi } from '@/design/i18n/UiText';
import { Link } from 'react-router';
import { ChevronRight, FlaskConical, Wrench } from 'lucide-react';
import { patchSetting } from '@/data/settings';
import { ToggleRow } from '@/design/primitives';
import { SettingsSection } from '../SettingsSection';

/** Settings › Developer: the tools for checking and reviewing Lingua, apart from the learner's settings. */
export function PerformanceSection({ perfHud, designNotes }: { perfHud: boolean; designNotes: boolean }) {
  const translateUi = useUi();
  return (
    <SettingsSection id="performance" icon={Wrench} title={translateUi('Developer tools')} description={translateUi('For checking and reviewing Lingua itself. None of this changes how you learn.')}>
      <Link to="/settings/lab" className="flex items-center gap-3 rounded-2xl border border-line bg-raised px-4 py-3.5 transition-colors hover:border-line-strong">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sage-soft text-sage-text">
          <FlaskConical size={19} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold"><UiText source={'Device lab'} /></span>
          <span data-hint="" className="block text-[13px] text-ink-soft"><UiText source={'Design notes, a replay of the first start, the look, layout checks, the app’s pieces, and this device.'} /></span>
        </span>
        <ChevronRight size={18} className="text-ink-faint" aria-hidden />
      </Link>
      <div className="mt-2 divide-y divide-line">
        <ToggleRow title={translateUi('Design notes')} description={translateUi('A small bar to pin notes to anything on screen, for Claude. Alt N picks an element.')} checked={designNotes} onChange={(on) => void patchSetting('ui', { designNotes: on })} />
        <ToggleRow title={translateUi('FPS monitor')} description={translateUi('A small live frame-rate readout in the corner of the screen. Lingua aims for a steady 60.')} checked={perfHud} onChange={(on) => void patchSetting('ui', { perfHud: on })} />
      </div>
    </SettingsSection>
  );
}
