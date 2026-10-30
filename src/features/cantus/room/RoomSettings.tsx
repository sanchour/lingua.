import { UiText, useUi } from '@/design/i18n/UiText';
// Sonus+'s own settings (Lingua 5.2-3): a gear in the room's header, in the room's dark. Only
// settings that change something here: how episodes and books play, and the songs' translation line.
// They're the same settings as Settings › Listening and Music, kept in one place for the room.
import { Settings2 } from 'lucide-react';
import { useApp } from '@/app/context';
import { patchSetting } from '@/data/settings';
import type { Settings } from '@/data/settings';
import { Popover, Segmented, Select, Slider } from '@/design/primitives';
import { useDraft } from '@/features/ordo/useDraft';

const SKIPS = [5, 10, 15, 30, 45, 60];
const heading = 'mb-2 text-[12px] font-bold tracking-[0.12em] text-[var(--room-muted)] uppercase';

export function RoomSettings() {
  const translateUi = useUi();
  return (
    <Popover
      label={translateUi('Sonus+ settings')}
      placement="bottom-end"
      className="w-[340px]"
      trigger={(props) => (
        <button {...props} type="button" aria-label={translateUi('Sonus+ settings')} title={translateUi('Sonus+ settings')} className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--room-fill)] text-[var(--room-soft)] transition-colors hover:bg-[var(--room-fill-strong)] hover:text-[var(--room-ink)] pointer-coarse:size-11">
          <Settings2 size={18} aria-hidden />
        </button>
      )}
    >
      {() => <RoomSettingsBody />}
    </Popover>
  );
}

function RoomSettingsBody() {
  const translateUi = useUi();
  const { settings } = useApp();
  const { audio, cantus } = settings;
  const [rate, setRate] = useDraft(audio.rate, (v) => void patchSetting('audio', { rate: v }));
  return (
    <div className="space-y-5 p-1">
      <section>
        <h3 className={heading}><UiText source={'Listening'} /></h3>
        <Slider label={translateUi('Speed for episodes and books')} value={rate} min={0.6} max={1.5} step={0.05} onChange={setRate} format={(v) => `${v.toFixed(2)}×`} />
        <div className="mt-2 grid grid-cols-2 gap-3">
          <Select label={translateUi('Skip back')} value={String(audio.skipBackSec)} onChange={(v) => void patchSetting('audio', { skipBackSec: Number(v) })} options={SKIPS.map((s) => ({ value: String(s), label: `${s} s` }))} />
          <Select label={translateUi('Skip forward')} value={String(audio.skipFwdSec)} onChange={(v) => void patchSetting('audio', { skipFwdSec: Number(v) })} options={SKIPS.map((s) => ({ value: String(s), label: `${s} s` }))} />
        </div>
      </section>
      <section>
        <h3 className={heading}><UiText source={'Lyrics'} /></h3>
        <Segmented<Settings['cantus']['translation']>
          label={translateUi('English under each line')}
          value={cantus.translation}
          onChange={(translation) => void patchSetting('cantus', { translation })}
          block
          options={[
            { value: 'show', label: translateUi('Shown') },
            { value: 'blur', label: translateUi('Blurred') },
            { value: 'hide', label: translateUi('Hidden') },
          ]}
        />
        <p className="mt-1.5 text-[12.5px] text-[var(--room-muted)]"><UiText source={'Blurred lines clear when you click them: try the song first, then check.'} /></p>
      </section>
    </div>
  );
}
