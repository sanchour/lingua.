// The reference recording of a sound (6-10, F0704): a button that plays it, and the speaker and licence beside it. Nothing shows for a sound
// that has none (tones, nasal vowels, aspirated and heavy consonants) or when Commons cannot be reached.
import { useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { UiText } from '@/design/i18n/UiText';
import { soundRecording } from '@/services/speech/ipaRecordings';
import type { SoundRecording as Recording } from '@/services/speech/ipaRecordings';
import type { Sound } from '@/core/sounds';

export function SoundRecording({ sound }: { sound: Sound }) {
  const [found, setFound] = useState<Recording | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    let alive = true;
    setFound(null);
    void soundRecording(sound).then((r) => alive && setFound(r));
    return () => {
      alive = false;
      audio.current?.pause();
    };
  }, [sound]);
  if (!found) return null;
  return (
    <div className="mt-3 flex flex-wrap items-start gap-x-3 gap-y-1.5">
      <button
        type="button"
        onClick={() => {
          audio.current?.pause();
          audio.current = new Audio(found.url);
          void audio.current.play().catch(() => undefined);
        }}
        className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-line px-4 text-[14px] font-semibold hover:bg-surface"
      >
        <Volume2 size={16} aria-hidden />
        <UiText source={'Hear the sound'} />
      </button>
      <p className="text-[11.5px] leading-snug text-ink-faint">
        <UiText source={'Recording by {0}, {1}, from '} values={[found.speaker, found.licence]} />
        <a href={found.page} target="_blank" rel="noreferrer" lang="en" className="underline underline-offset-2">
          Wikimedia Commons
        </a>
        . <UiText source={'The sound on its own: a language’s own version can differ a little.'} />
      </p>
    </div>
  );
}
