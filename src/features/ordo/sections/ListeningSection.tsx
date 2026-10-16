import { Headphones } from 'lucide-react';
import { patchSetting } from '@/data/settings';
import type { Settings } from '@/data/settings';
import { Select, Slider } from '@/design/primitives';
import { SettingsSection } from '../SettingsSection';
import { useDraft } from '../useDraft';

const SKIPS = [5, 10, 15, 30, 45, 60];

export function ListeningSection({ audio }: { audio: Settings['audio'] }) {
  const [rate, setRate] = useDraft(audio.rate, (v) => void patchSetting('audio', { rate: v }));
  const [repeat, setRepeat] = useDraft(Math.max(2, audio.sentenceRepeat), (v) => void patchSetting('audio', { sentenceRepeat: v }));
  const [gap, setGap] = useDraft(audio.repeatGapMs / 1000, (v) => void patchSetting('audio', { repeatGapMs: Math.round(v * 1000) }));
  const [proxy, setProxy] = useDraft(audio.downloadProxy, (v) => void patchSetting('audio', { downloadProxy: v.trim() }));

  return (
    <SettingsSection id="listening" icon={Headphones} title="Listening" description="How Sonus plays podcasts and audio, makes transcripts and saves episodes.">
      <Slider label="Speed for new episodes" value={rate} min={0.6} max={1.5} step={0.05} onChange={setRate} format={(v) => `${v.toFixed(2)}×`} />
      <div className="mt-2 grid gap-4 sm:grid-cols-2">
        <Select
          label="Skip back"
          value={String(audio.skipBackSec)}
          onChange={(v) => void patchSetting('audio', { skipBackSec: Number(v) })}
          options={SKIPS.map((s) => ({ value: String(s), label: `${s} seconds` }))}
        />
        <Select
          label="Skip forward"
          value={String(audio.skipFwdSec)}
          onChange={(v) => void patchSetting('audio', { skipFwdSec: Number(v) })}
          options={SKIPS.map((s) => ({ value: String(s), label: `${s} seconds` }))}
        />
      </div>

      <h3 className="mt-6 mb-1 text-[13px] font-bold tracking-wide text-ink-soft uppercase">Sentence repeats</h3>
      <p className="mb-2 text-[13px] text-ink-soft">With a transcript, the Repeat button in the player plays each sentence more than once, with a short pause to say it yourself.</p>
      <Slider label="Each sentence plays" value={repeat} min={2} max={5} onChange={setRepeat} format={(v) => `${v}×`} />
      <Slider label="Pause between repeats" value={gap} min={0} max={4} step={0.2} onChange={setGap} format={(v) => (v === 0 ? 'None' : `${v.toFixed(1)} s`)} />

      <h3 className="mt-6 mb-1 text-[13px] font-bold tracking-wide text-ink-soft uppercase">Transcripts</h3>
      <Select
        label="Whisper model"
        hideLabel
        value={audio.whisperModel}
        onChange={(whisperModel) => void patchSetting('audio', { whisperModel })}
        options={[
          { value: 'whisper-large-v3-turbo', label: 'Whisper large v3 turbo · fast (recommended)' },
          { value: 'whisper-large-v3', label: 'Whisper large v3 · most accurate, slower' },
        ]}
      />
      <p className="mt-2 text-[13px] text-ink-soft">Transcripts are made by Groq with the free key in AI & translation, with a timing for every word.</p>

      <h3 className="mt-6 mb-1 text-[13px] font-bold tracking-wide text-ink-soft uppercase">Downloads</h3>
      <p className="mb-2 text-[13px] leading-relaxed text-ink-soft">
        Most podcast hosts let Lingua save episodes offline. A few don’t allow apps to download; those still stream. If you run your own relay (for example a small Cloudflare Worker), put its address here, with{' '}
        <code className="rounded bg-sunken px-1">{'{url}'}</code> where the episode address goes.
      </p>
      <input
        value={proxy}
        onChange={(e) => setProxy(e.target.value)}
        placeholder="https://my-relay.example.workers.dev/?url={url}"
        inputMode="url"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className="h-11 w-full rounded-xl border border-line bg-raised px-3.5 text-[14px]"
        aria-label="Download relay address"
      />
    </SettingsSection>
  );
}
