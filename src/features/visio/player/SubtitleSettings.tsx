import { Settings2 } from 'lucide-react';
import { useApp } from '@/app/context';
import { patchSetting } from '@/data/settings';
import type { Settings } from '@/data/settings';
import { Popover, Segmented, Slider, ToggleRow } from '@/design/primitives';
import { cx } from '@/lib/cx';

/** How your own subtitle line shows, auto-pause, and the subtitle size. */
export function SubtitleSettings({ className, dark = false }: { className?: string; dark?: boolean }) {
  const { settings } = useApp();
  const visio = settings.visio;
  const set = (patch: Partial<Settings['visio']>) => void patchSetting('visio', patch);
  return (
    <Popover
      label="Subtitle settings"
      placement="top-end"
      className="w-80"
      trigger={(props) => (
        <button
          {...props}
          type="button"
          aria-label="Subtitle settings"
          className={cx(
            'grid size-10 shrink-0 place-items-center rounded-xl transition-colors',
            dark ? 'text-white/90 hover:bg-white/15' : 'text-ink-soft hover:bg-surface hover:text-ink',
            className,
          )}
        >
          <Settings2 size={19} aria-hidden />
        </button>
      )}
    >
      {() => (
        <div className="space-y-4 p-1">
          <div>
            <p className="mb-2 text-[12.5px] font-bold tracking-wide text-ink-soft uppercase">English line</p>
            <Segmented
              label="English line"
              block
              value={visio.native}
              onChange={(native) => set({ native })}
              options={[
                { value: 'show', label: 'Show' },
                { value: 'blur', label: 'Blur' },
                { value: 'after', label: 'After' },
                { value: 'hide', label: 'Hide' },
              ]}
            />
            <p className="mt-1.5 text-[12.5px] text-ink-faint">Blurred lines sharpen when you hover or tap them. After: the English comes once the line has been heard.</p>
          </div>
          <ToggleRow title="Less help each time" description="Each time you watch it to the end, the English line goes from shown to blurred, to after the line, to hidden." checked={visio.native === 'adaptive'} onChange={(on) => set({ native: on ? 'adaptive' : 'blur' })} />
          <ToggleRow title="Pause after each line" description="Time to read, repeat or save it." checked={visio.autoPause} onChange={(autoPause) => set({ autoPause })} />
          <Slider label="Subtitle size" value={visio.subtitleScale} min={0.8} max={1.6} step={0.05} onChange={(subtitleScale) => set({ subtitleScale })} format={(v) => `${Math.round(v * 100)}%`} />
        </div>
      )}
    </Popover>
  );
}
