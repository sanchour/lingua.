// The line to hear above a heard exercise (6-9): the learner's own recording of it where there is one, the device's voice otherwise.
// Slowly, or at the speed the session has reached (it steps up with every right answer), and with noise to listen through if asked.
import { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import type { ListenSource } from '@/core/contracts/exercise';
import { ClipPlayer, useClipAt } from '@/features/thesaurus/common/Clip';
import { SpeakButton } from '@/features/speech/SpeakButton';
import { startNoise } from '@/services/audio/noise';

export function ListenBar({ listen, lang, rate = 1 }: { listen: ListenSource; lang: string; rate?: number }) {
  const clip = useClipAt(listen.clip?.mediaId, listen.clip?.startMs, listen.clip?.endMs);
  const [noisy, setNoisy] = useState(false);
  useEffect(() => (noisy ? startNoise() : undefined), [noisy]);
  return (
    <div className="mb-6 flex flex-col items-center gap-2">
      {clip ? (
        <div className="flex items-end gap-5">
          <span className="flex flex-col items-center gap-1">
            <ClipPlayer clip={clip} large rate={0.7} />
            <span className="text-[12px] font-semibold text-ink-soft">Slowly</span>
          </span>
          <span className="flex flex-col items-center gap-1">
            <ClipPlayer clip={clip} large rate={rate} />
            <span className="text-[12px] font-semibold text-ink-soft">{rate === 1 ? 'As it was said' : `At ${rate.toFixed(1)}×`}</span>
          </span>
        </div>
      ) : clip === undefined && listen.clip ? (
        <span className="size-20" aria-hidden />
      ) : (
        <SpeakButton lang={lang} text={listen.text} size={34} label="Hear the line" className="size-20 rounded-full bg-sunken text-ink" />
      )}
      <p className="text-[12.5px] text-ink-faint">{clip ? 'From what you listened to. Play it as often as you like.' : 'Read aloud by your device’s voice. Play it as often as you like.'}</p>
      <button type="button" aria-pressed={noisy} onClick={() => setNoisy((n) => !n)} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-[12.5px] font-semibold text-ink-soft hover:bg-surface aria-pressed:border-accent/40 aria-pressed:bg-accent-soft aria-pressed:text-accent-text">
        {noisy ? <VolumeX size={13} aria-hidden /> : <Volume2 size={13} aria-hidden />}
        {noisy ? 'Noise on' : 'Add noise'}
      </button>
    </div>
  );
}
