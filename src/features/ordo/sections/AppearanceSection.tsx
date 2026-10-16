import { Monitor, Moon, Sparkles, SlidersHorizontal, Sun, Waves, Wind } from 'lucide-react';
import { AnimatePresence, motion as m } from 'motion/react';
import { patchSetting, setSetting } from '@/data/settings';
import type { MotionPref, ThemePref } from '@/data/settings';
import { Segmented } from '@/design/primitives';
import { fade } from '@/design/motion';
import { SettingsSection } from '../SettingsSection';

const MOTION_NOTES: Record<MotionPref, string> = {
  system: 'Follows your device: if it asks for less motion, Lingua moves less too.',
  reduced: 'Calm and still. Things fade in place instead of sliding or springing.',
  full: 'Rich and liquid: pages glide in, lists reorder smoothly, everything settles softly. Smoothest on 120 Hz screens.',
};

export function AppearanceSection({ theme, motion }: { theme: ThemePref; motion: MotionPref }) {
  return (
    <SettingsSection id="appearance" icon={SlidersHorizontal} title="Preferences" description="How Lingua looks and moves.">
      <p className="mb-2 text-[15px] font-semibold">Theme</p>
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
      <p className="mt-2 text-[13px] text-ink-soft">Paper for daylight, Nocturne for the evening. On iPhone, the status bar colour updates the next time you open Lingua.</p>

      <p className="mt-6 mb-2 text-[15px] font-semibold">Motion</p>
      <Segmented<MotionPref>
        label="Motion"
        value={motion}
        onChange={(value) => void patchSetting('ui', { motion: value })}
        block
        options={[
          { value: 'system', label: 'System', icon: Waves },
          { value: 'reduced', label: 'Reduced', icon: Wind },
          { value: 'full', label: 'Full', icon: Sparkles },
        ]}
      />
      <div className="relative mt-2 min-h-[2.6em] text-[13px] text-ink-soft">
        <AnimatePresence mode="wait" initial={false}>
          <m.p key={motion} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade}>
            {MOTION_NOTES[motion]}
          </m.p>
        </AnimatePresence>
      </div>
    </SettingsSection>
  );
}
