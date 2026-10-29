// The line to hear above a heard exercise (6-9): the learner's own recording of it where there is one, the device's voice otherwise.
import type { ListenSource } from '@/core/contracts/exercise';
import { ClipPlayer, useClipAt } from '@/features/thesaurus/common/Clip';
import { SpeakButton } from '@/features/speech/SpeakButton';

export function ListenBar({ listen, lang }: { listen: ListenSource; lang: string }) {
  const clip = useClipAt(listen.clip?.mediaId, listen.clip?.startMs, listen.clip?.endMs);
  return (
    <div className="mb-6 flex flex-col items-center gap-2">
      {clip ? (
        <div className="flex items-end gap-5">
          <span className="flex flex-col items-center gap-1">
            <ClipPlayer clip={clip} large rate={0.7} />
            <span className="text-[12px] font-semibold text-ink-soft">Slowly</span>
          </span>
          <span className="flex flex-col items-center gap-1">
            <ClipPlayer clip={clip} large />
            <span className="text-[12px] font-semibold text-ink-soft">As it was said</span>
          </span>
        </div>
      ) : clip === undefined && listen.clip ? <span className="size-20" aria-hidden /> : <SpeakButton lang={lang} text={listen.text} size={34} label="Hear the line" className="size-20 rounded-full bg-sunken text-ink" />}
      <p className="text-[12.5px] text-ink-faint">{clip ? 'From what you listened to. Play it as often as you like.' : 'Read aloud by your device’s voice. Play it as often as you like.'}</p>
    </div>
  );
}
