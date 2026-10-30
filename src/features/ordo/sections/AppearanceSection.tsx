import { useSettings } from '@/data/settings';
import { UiText, useUi } from '@/design/i18n/UiText';
import { History, LayoutDashboard, Monitor, Moon, Sparkles, SlidersHorizontal, Sun, Waves, Wind } from 'lucide-react';
import { getLanguage } from '@/core/lang/languages';
import { flavourOf } from '@/design/flavours';
import { AnimatePresence, motion as m } from 'motion/react';
import { patchSetting, setSetting } from '@/data/settings';
import type { MotionPref, Settings, ThemePref } from '@/data/settings';
import { NOCTURNE_PALETTES, PAPER_PALETTES } from '@/design/palettes';
import type { Palette } from '@/design/palettes';
import { cx } from '@/lib/cx';
import { Segmented, Switch, ToggleRow } from '@/design/primitives';
import { fade } from '@/design/motion';
import { SettingsSection } from '../SettingsSection';

const MOTION_NOTES: Record<MotionPref, string> = {
  system: 'Follows your device: if it asks for less motion, Lingua moves less too.',
  reduced: 'Calm and still. Things fade in place instead of sliding or springing.',
  full: 'Rich and liquid: pages glide in, lists reorder smoothly, everything settles softly. Smoothest on 120 Hz screens.',
};

/** A row of theme swatches: the page colour with its accent, and the name below. */
export function PaletteRow({ title, palettes, value, onChange }: { title: string; palettes: Palette[]; value: string; onChange: (id: string) => void }) {
  const translateUi = useUi();
  return (
    <div className="mt-4">
      <p className="mb-2 text-[13px] font-semibold text-ink-soft">{title}</p>
      <div role="radiogroup" aria-label={translateUi('{0} themes', [title])} className="grid grid-cols-6 gap-1 sm:flex sm:flex-wrap sm:gap-3">
        {palettes.map((p) => {
          const selected = p.id === value;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(p.id)}
              className="flex min-w-11 flex-col items-center gap-1.5 rounded-xl py-1 transition-transform active:scale-95"
            >
              <span
                className={cx('grid size-10 place-items-center rounded-full border transition-shadow', selected ? 'border-transparent ring-2 ring-accent ring-offset-2 ring-offset-raised' : 'border-line-strong')}
                style={{ backgroundColor: p.swatch[0] }}
              >
                <span className="size-3.5 rounded-full" style={{ backgroundColor: p.swatch[1] }} />
              </span>
              <span className={cx('text-[12px] leading-none', selected ? 'font-semibold text-ink' : 'text-ink-soft')}>{p.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AppearanceSection({
  theme,
  motion,
  palette,
  homeLayout,
  flavour,
  hints,
  highContrast,
  colorBlindMode,
  lang,
}: {
  theme: ThemePref;
  motion: MotionPref;
  palette: Settings['palette'];
  homeLayout: Settings['ui']['homeLayout'];
  flavour: boolean;
  hints: boolean;
  highContrast?: boolean;
  colorBlindMode?: boolean;
  lang: string;
}) {
  const translateUi = useUi();
  const touch = flavourOf(lang);
  const settings = useSettings();
  return (
    <SettingsSection id="appearance" icon={SlidersHorizontal} title={translateUi('Preferences')} description={translateUi('How Lingua looks and moves.')}>
      <div className="mb-6"><ToggleRow title={translateUi('Lingua in the language')} description={translateUi('Interface translations work offline. Hover over translated text for English.')} checked={settings?.ui.interfaceLanguage === true} onChange={(on) => void patchSetting('ui', { interfaceLanguage: on })} /></div>
      <div>
        <p className="mb-2 text-[15px] font-semibold"><UiText source={'Theme'} /></p>
        <Segmented<ThemePref>
          label={translateUi('Theme')}
          value={theme}
          onChange={(value) => void setSetting('theme', value)}
          block
          options={[
            { value: 'paper', label: translateUi('Paper'), icon: Sun },
            { value: 'nocturne', label: translateUi('Nocturne'), icon: Moon },
            { value: 'system', label: translateUi('Device'), icon: Monitor },
          ]}
        />
        <p data-hint="" className="mt-2 text-[13px] text-ink-soft"><UiText source={'Paper for daylight, Nocturne for the evening. On iPhone, the status bar colour updates the next time you open Lingua.'} /></p>
        <PaletteRow title={translateUi('Paper')} palettes={PAPER_PALETTES} value={palette.paper} onChange={(id) => void patchSetting('palette', { paper: id as Settings['palette']['paper'] })} />
        <PaletteRow title={translateUi('Nocturne')} palettes={NOCTURNE_PALETTES} value={palette.nocturne} onChange={(id) => void patchSetting('palette', { nocturne: id as Settings['palette']['nocturne'] })} />
      </div>

      <div className="mt-6">
        <p className="mb-2 text-[15px] font-semibold"><UiText source={'Motion'} /></p>
        <Segmented<MotionPref>
          label={translateUi('Motion')}
          value={motion}
          onChange={(value) => void patchSetting('ui', { motion: value })}
          block
          options={[
            { value: 'system', label: translateUi('System'), icon: Waves },
            { value: 'reduced', label: translateUi('Reduced'), icon: Wind },
            { value: 'full', label: translateUi('Full'), icon: Sparkles },
          ]}
        />
        <div data-hint="" className="relative mt-2 min-h-[2.6em] text-[13px] text-ink-soft">
          <AnimatePresence mode="wait" initial={false}>
            <m.p key={motion} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade}>
              <UiText source={MOTION_NOTES[motion]} />
            </m.p>
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-6">
        <p className="mb-2 text-[15px] font-semibold"><UiText source={'Home layout'} /></p>
        <Segmented<Settings['ui']['homeLayout']>
          label={translateUi('Home layout')}
          value={homeLayout}
          onChange={(value) => void patchSetting('ui', { homeLayout: value })}
          block
          options={[
            { value: 'today', label: translateUi('Today'), icon: LayoutDashboard },
            { value: 'classic', label: translateUi('Classic'), icon: History },
          ]}
        />
        <p data-hint="" className="mt-2 text-[13px] text-ink-soft"><UiText source={'Today puts the day\'s goal and what\'s next up first, beside the week and your numbers, with Cursus and Mundus below. Classic is Home as it was before Lingua 5.'} /></p>
      </div>

      <div className="mt-6 flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold"><UiText source={'Language touches'} /></p>
          <p data-hint="" className="mt-1 text-[13px] text-ink-soft">
            {touch
              ? translateUi('A little of {0} in the design: {1}. Your theme and reading font stay as they are.', [getLanguage(lang)?.name ?? lang, touch.touch])
              : translateUi('A little of the language in the design, for French, Spanish, German, Russian, Mandarin and Arabic. Your theme and reading font stay as they are.')}
          </p>
        </div>
        <Switch label={translateUi('Language touches')} checked={flavour} onChange={(on) => void patchSetting('ui', { flavour: on })} />
      </div>

      <div className="mt-6">
        <ToggleRow
          title={translateUi('Tips and explanations')}
          description={translateUi('The small lines under a setting or a card that say what it is and what it does. Off keeps the pages quieter.')}
          checked={hints}
          onChange={(on) => void patchSetting('ui', { hints: on })}
        />
      </div>

      <div className="mt-6 space-y-4">
        <p className="text-[15px] font-semibold">Accessibility</p>
        <ToggleRow
          title="High contrast"
          description="Increases contrast across all surfaces and text to WCAG 2.1 AAA (7:1 text-to-background ratio) for maximum legibility."
          checked={Boolean(highContrast)}
          onChange={(on) => void patchSetting('ui', { highContrast: on })}
        />
        <ToggleRow
          title="Accessible indicators"
          description="Shows distinct shapes, glyphs, and patterns beside colors so state is never conveyed by color alone."
          checked={Boolean(colorBlindMode)}
          onChange={(on) => void patchSetting('ui', { colorBlindMode: on })}
        />
      </div>
    </SettingsSection>
  );
}
