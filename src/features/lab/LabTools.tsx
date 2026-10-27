import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Bell, Database, Grid3x3, Monitor, Palette as PaletteIcon, Play, RotateCcw } from 'lucide-react';
import { useApp } from '@/app/context';
import { FIRST, PAGE_NAMES } from '@/app/onboarding/pages';
import { getLanguage } from '@/core/lang/languages';
import { db } from '@/data/db';
import { patchSetting, setSetting } from '@/data/settings';
import type { MotionPref, Settings, ThemePref } from '@/data/settings';
import { NOCTURNE_PALETTES, PAPER_PALETTES } from '@/design/palettes';
import type { Palette } from '@/design/palettes';
import { Badge, Button, Segmented, ToggleRow } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { toast } from '@/state/ui';
import { useDevLab } from './devLab';
import { Facts, LabCard } from './LabCard';

/** Replay the first start from the beginning or any page, with the language already chosen; nothing is saved. */
export function ReplayCard() {
  const startReplay = useDevLab((s) => s.startReplay);
  const { language } = useApp();
  return (
    <LabCard icon={Play} title="Replay the first start" description={`From the beginning or any page, with ${getLanguage(language.id)?.name ?? language.id} already chosen. Nothing is saved, the light chosen in it is put back, and Esc or “Leave the replay” ends it.`}>
      <Button icon={Play} onClick={() => void startReplay(0)}>
        From the beginning
      </Button>
      <p className="mt-4 mb-2 text-[12px] font-bold tracking-[0.08em] text-ink-faint uppercase">Or from a page</p>
      <div className="flex flex-wrap gap-1.5">
        {FIRST.map((page, i) => (
          <button key={page} type="button" onClick={() => void startReplay(i)} className="rounded-full border border-line px-3 py-1.5 text-[13px] font-semibold text-ink-soft transition-colors hover:border-accent hover:text-ink">
            <span className="mr-1.5 text-ink-faint tabular-nums">{i + 1}</span>
            {PAGE_NAMES[page]}
          </button>
        ))}
      </div>
    </LabCard>
  );
}

/** Home's first steps, once put away, shown again. */
export function FirstStepsCard() {
  const { settings } = useApp();
  const hidden = settings.ui.firstStepsHidden;
  return (
    <LabCard icon={RotateCcw} title="Home’s first steps" description="The row of first steps a new learner sees on Home. They show while some are still to do.">
      <div className="flex items-center gap-3">
        <Button variant="secondary" disabled={!hidden} onClick={() => void patchSetting('ui', { firstStepsHidden: false }).then(() => toast('Home’s first steps are back.', { tone: 'success' }))}>
          Show them again
        </Button>
        <Badge tone={hidden ? 'neutral' : 'sage'}>{hidden ? 'Put away' : 'Showing'}</Badge>
      </div>
    </LabCard>
  );
}

function Swatches<Id extends string>({ list, chosen, onChoose }: { list: Array<Palette<Id>>; chosen: Id; onChoose: (id: Id) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {list.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onChoose(p.id)}
          aria-pressed={p.id === chosen}
          title={p.name}
          className={cx('flex items-center gap-1.5 rounded-full border py-1 pr-3 pl-1 text-[12.5px] font-semibold transition-colors', p.id === chosen ? 'border-accent text-ink' : 'border-line text-ink-soft hover:border-line-strong hover:text-ink')}
        >
          <span className="relative size-6 overflow-hidden rounded-full border border-black/10" style={{ background: p.swatch[0] }}>
            <span className="absolute right-0 bottom-0 size-3 rounded-tl-full" style={{ background: p.swatch[1] }} />
          </span>
          {p.name}
        </button>
      ))}
    </div>
  );
}

/** The look at a click: the light, every palette, motion and the language touches. The real settings. */
export function LookCard() {
  const { settings } = useApp();
  const setPalette = (patch: Partial<Settings['palette']>) => void patchSetting('palette', patch);
  return (
    <LabCard icon={PaletteIcon} title="The look" description="The real settings, changed here without leaving the Lab.">
      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-[13px] font-semibold">Light</p>
          <Segmented<ThemePref>
            label="Light"
            value={settings.theme}
            onChange={(theme) => void setSetting('theme', theme)}
            options={[
              { value: 'system', label: 'Device' },
              { value: 'paper', label: 'Paper' },
              { value: 'nocturne', label: 'Nocturne' },
            ]}
          />
        </div>
        <div>
          <p className="mb-1.5 text-[13px] font-semibold">Paper palettes</p>
          <Swatches list={PAPER_PALETTES} chosen={settings.palette.paper} onChoose={(paper) => setPalette({ paper })} />
        </div>
        <div>
          <p className="mb-1.5 text-[13px] font-semibold">Nocturne palettes</p>
          <Swatches list={NOCTURNE_PALETTES} chosen={settings.palette.nocturne} onChoose={(nocturne) => setPalette({ nocturne })} />
        </div>
        <div>
          <p className="mb-1.5 text-[13px] font-semibold">Motion</p>
          <Segmented<MotionPref>
            label="Motion"
            value={settings.ui.motion}
            onChange={(motion) => void patchSetting('ui', { motion })}
            options={[
              { value: 'system', label: 'Device' },
              { value: 'full', label: 'Full' },
              { value: 'reduced', label: 'Reduced' },
            ]}
          />
        </div>
        <ToggleRow title="The language’s touches" description="A touch of the studied language in the design." checked={settings.ui.flavour !== false} onChange={(flavour) => void patchSetting('ui', { flavour })} />
      </div>
    </LabCard>
  );
}

const SIZES = [
  [1280, 800],
  [1366, 768],
  [1440, 900],
] as const;

function useWindowSize() {
  const read = () => ({ inner: `${window.innerWidth} × ${window.innerHeight}`, outer: `${window.outerWidth} × ${window.outerHeight}` });
  const [size, setSize] = useState(read);
  useEffect(() => {
    const on = () => setSize(read());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return size;
}

/** The layout checks: the grid and the measure, outlines on every box, and the three check sizes. */
export function LayoutCard() {
  const { grid, outlines, setGrid, setOutlines } = useDevLab();
  const size = useWindowSize();
  const standalone = window.matchMedia('(display-mode: standalone)').matches;

  const resize = (w: number, h: number) => {
    const before = window.outerWidth;
    window.resizeTo(w, h);
    window.setTimeout(() => {
      if (window.outerWidth !== before || window.outerWidth === w) return;
      toast(`This window can’t be resized from the page. Open one at ${w} × ${h} instead?`, {
        action: { label: 'Open', onClick: () => void window.open(location.href, `lingua-${w}`, `popup,width=${w},height=${h}`) },
      });
    }, 250);
  };

  return (
    <LabCard icon={Grid3x3} title="Layout" description="For this session only, on every page; a chip at the top turns them off anywhere.">
      <ToggleRow title="Grid and measure" description="A 4 px grid with an 8 px beat, and the 720 px reading measure on the page’s column." checked={grid} onChange={setGrid} />
      <ToggleRow title="Outlines" description="An outline on every box, to see the boxes and where they don’t line up." checked={outlines} onChange={setOutlines} />
      <div className="mt-4 border-t border-line pt-4">
        <div className="mb-3 flex items-center gap-2">
          <Monitor size={16} className="text-ink-soft" aria-hidden />
          <p className="text-[13px] font-semibold">The check sizes</p>
          <span className="ml-auto text-[12px] text-ink-faint tabular-nums">
            page {size.inner} · window {size.outer}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SIZES.map(([w, h]) => (
            <Button key={w} size="sm" variant="secondary" onClick={() => resize(w, h)}>
              {w} × {h}
            </Button>
          ))}
        </div>
        <p className="mt-2 text-[12.5px] text-ink-soft">{standalone ? 'Resizes the installed app’s window.' : 'In a browser tab a page can’t resize its window, so a window of that size opens instead.'}</p>
      </div>
    </LabCard>
  );
}

/** A toast of each kind. */
export function ToastsCard() {
  return (
    <LabCard icon={Bell} title="Toasts" description="One of each kind, as the app shows them.">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => toast('A plain toast: something happened.')}>
          Plain
        </Button>
        <Button size="sm" variant="secondary" onClick={() => toast('Saved. Everything went well.', { tone: 'success' })}>
          Success
        </Button>
        <Button size="sm" variant="secondary" onClick={() => toast('That didn’t work. Please try again.', { tone: 'error' })}>
          Error
        </Button>
        <Button size="sm" variant="secondary" onClick={() => toast('A toast with an action.', { action: { label: 'Undo', onClick: () => toast('Undone.') } })}>
          With an action
        </Button>
        <Button size="sm" variant="secondary" onClick={() => toast('This one stays until it is closed.', { duration: 0 })}>
          Stays
        </Button>
      </div>
    </LabCard>
  );
}

/** The translation and AI caches, cleared; learning data stays. */
export function CachesCard() {
  const counts = useLiveQuery(async () => ({ translations: await db.translationCache.count(), ai: await db.llmCache.count() }), []);
  const clear = async (which: 'translations' | 'ai') => {
    await (which === 'translations' ? db.translationCache.clear() : db.llmCache.clear());
    toast(which === 'translations' ? 'The translation cache is empty.' : 'The AI cache is empty.', { tone: 'success' });
  };
  return (
    <LabCard icon={Database} title="Caches" description="Answers kept so they needn’t be asked for again. Clearing them keeps every word, deck and book.">
      <Facts
        rows={[
          ['Translations', counts ? String(counts.translations) : '…'],
          ['AI answers', counts ? String(counts.ai) : '…'],
        ]}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" disabled={!counts?.translations} onClick={() => void clear('translations')}>
          Clear translations
        </Button>
        <Button size="sm" variant="secondary" disabled={!counts?.ai} onClick={() => void clear('ai')}>
          Clear AI answers
        </Button>
      </div>
    </LabCard>
  );
}
