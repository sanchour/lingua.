import { UiText, useUi } from '@/design/i18n/UiText';
import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router';
import { BookOpenText, ChevronRight, Database, GraduationCap, Languages, Palette, Sparkles, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useApp } from '@/app/context';
import { getLanguage } from '@/core/lang/languages';
import { patchSetting, setSetting } from '@/data/settings';
import type { MotionPref, Settings, ThemePref } from '@/data/settings';
import { NOCTURNE_PALETTES, PAPER_PALETTES } from '@/design/palettes';
import { Button, Segmented, Slider, ToggleRow } from '@/design/primitives';
import { formatDateTime } from '@/lib/format';
import { PaletteRow } from './sections/AppearanceSection';
import { useDraft } from './useDraft';

/** A soft card with a coloured tile, like the groups' on the overview. */
function Block({ icon: Icon, color, title, children }: { icon: LucideIcon; color: string; title: string; children: ReactNode }) {
  const tile = { backgroundColor: `color-mix(in oklab, ${color} 24%, var(--surface))`, color: `color-mix(in oklab, ${color} 72%, var(--ink))` } as CSSProperties;
  return (
    <section aria-label={title} className="rounded-[28px] border border-line/70 bg-surface p-6">
      <h2 className="mb-4 flex items-center gap-3 font-serif text-[21px] leading-tight font-semibold">
        <span className="grid size-9 shrink-0 place-items-center rounded-[11px]" style={tile} aria-hidden>
          <Icon size={18} />
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function More({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="mt-3 inline-flex items-center gap-1 text-[13.5px] font-semibold text-accent-text hover:underline">
      {children}
      <ChevronRight size={15} aria-hidden />
    </Link>
  );
}

/**
 * Settings, the simple way: one calm page with only what most people ever change. Everything else is a click away
 * (Everything, at the top), and the developer's tools stand apart at the bottom.
 */
export function SimpleSettings() {
  const translateUi = useUi();
  const { settings, language } = useApp();
  const { reader, study, ui, meta } = settings;
  const [size, setSize] = useDraft(reader.sizePx, (sizePx) => void patchSetting('reader', { sizePx }));
  const [perDay, setPerDay] = useDraft(study.newPerDay, (newPerDay) => void patchSetting('study', { newPerDay }));
  const name = getLanguage(language.id)?.name ?? language.id;

  return (
    <div className="mx-auto grid max-w-4xl gap-5 lg:grid-cols-2">
      <Block icon={Languages} color="#9d8fcb" title={translateUi('Your language')}>
        <p className="text-[17px]">
          <span className="font-semibold">{name}</span>
          <span className="text-ink-soft"><UiText source={' · level {0}'} values={[language.level]} /></span>
        </p>
        <More to="/settings/languages"><UiText source={'Level, goal, voice, another language'} /></More>
      </Block>

      <Block icon={Palette} color="#c9a650" title={translateUi('Look')}>
        <Segmented<ThemePref>
          label={translateUi('Theme')}
          value={settings.theme}
          onChange={(value) => void setSetting('theme', value)}
          block
          options={[
            { value: 'paper', label: translateUi('Paper') },
            { value: 'nocturne', label: translateUi('Nocturne') },
            { value: 'system', label: translateUi('Device') },
          ]}
        />
        <PaletteRow title={translateUi('Paper')} palettes={PAPER_PALETTES} value={settings.palette.paper} onChange={(id) => void patchSetting('palette', { paper: id as Settings['palette']['paper'] })} />
        <PaletteRow title={translateUi('Nocturne')} palettes={NOCTURNE_PALETTES} value={settings.palette.nocturne} onChange={(id) => void patchSetting('palette', { nocturne: id as Settings['palette']['nocturne'] })} />
      </Block>

      <Block icon={BookOpenText} color="#c98a6b" title={translateUi('Reading')}>
        <Slider label={translateUi('Text size')} value={size} min={15} max={30} onChange={setSize} format={(v) => `${v} px`} />
        <p className="mt-3 mb-2 text-[15px] font-semibold"><UiText source={'Page style'} /></p>
        <Segmented
          label={translateUi('Page style')}
          value={reader.mode}
          onChange={(mode) => void patchSetting('reader', { mode })}
          block
          options={[
            { value: 'paged', label: translateUi('Page flip') },
            { value: 'scroll', label: translateUi('Smooth scroll') },
          ]}
        />
      </Block>

      <Block icon={GraduationCap} color="#7f9f7a" title={translateUi('Study')}>
        <Slider label={translateUi('New cards a day')} value={perDay} min={0} max={60} onChange={setPerDay} />
        <p data-hint="" className="text-[13px] text-ink-soft"><UiText source={'For new decks. Fewer is gentler; reviews always come first.'} /></p>
      </Block>

      <Block icon={Sparkles} color="#cf8299" title={translateUi('Comfort')}>
        <p className="mb-2 text-[15px] font-semibold"><UiText source={'Motion'} /></p>
        <Segmented<MotionPref>
          label={translateUi('Motion')}
          value={ui.motion}
          onChange={(motion) => void patchSetting('ui', { motion })}
          block
          options={[
            { value: 'system', label: translateUi('Device') },
            { value: 'reduced', label: translateUi('Calm') },
            { value: 'full', label: translateUi('Lively') },
          ]}
        />
        <div className="mt-2 divide-y divide-line">
          <ToggleRow title={translateUi('Tips and explanations')} description={translateUi('The small lines that say what a setting does.')} checked={ui.hints} onChange={(hints) => void patchSetting('ui', { hints })} />
          <ToggleRow title={translateUi('Sounds in lessons')} checked={settings.lessons.sounds} onChange={(sounds) => void patchSetting('lessons', { sounds })} />
        </div>
      </Block>

      <Block icon={Database} color="#5f9e96" title={translateUi('Your data')}>
        <p className="text-[15px]">{meta.lastBackupAt ? translateUi('Last backup {0}.', [formatDateTime(meta.lastBackupAt)]) : translateUi('No backup yet.')}</p>
        <p data-hint="" className="mt-0.5 text-[13px] text-ink-soft"><UiText source={'Everything stays on this device. A backup keeps it safe and moves it to another one.'} /></p>
        <More to="/settings/data"><UiText source={'Back up, sync and storage'} /></More>
      </Block>

      <div className="flex flex-wrap items-center gap-3 rounded-[28px] border border-dashed border-line-strong px-6 py-4 lg:col-span-2">
        <p className="min-w-0 flex-1 text-[14.5px] text-ink-soft"><UiText source={'Want to fine-tune more, like the questions at the end of a text, fonts, flashcards or AI?'} /></p>
        <Button variant="secondary" onClick={() => void patchSetting('ui', { settingsMode: 'full' })}><UiText source={'Show everything'} /></Button>
      </div>

      <Link to="/settings/developer" className="flex items-center gap-2 justify-self-start px-2 text-[13px] font-semibold text-ink-faint hover:text-ink lg:col-span-2"><UiText source={'{0} Developer tools'} values={[<Wrench size={14} aria-hidden />]} /></Link>
    </div>
  );
}
