import { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { useSettings } from '@/data/settings';
import { cx } from '@/lib/cx';
import { speak, useCanSpeak } from '@/services/speech/tts';

/** Reads a word or sentence aloud with the device's voice (hidden when the device has none). */
export function SpeakButton({ text, lang, className, size = 18, label = 'Listen' }: { text: string; lang: string; className?: string; size?: number; label?: string }) {
  const can = useCanSpeak(lang);
  const settings = useSettings();
  const [playing, setPlaying] = useState(false);
  if (!can) return null;
  return (
    <button
      type="button"
      aria-label={label}
      onClick={async (e) => {
        e.stopPropagation();
        setPlaying(true);
        await speak(text, lang, { rate: settings?.speech.rate, voiceUri: settings?.speech.voices[lang] });
        setPlaying(false);
      }}
      className={cx(
        'no-callout grid size-10 shrink-0 place-items-center rounded-full text-ink-soft transition-[transform,background-color,color] hover:bg-sunken hover:text-ink active:scale-90',
        playing && 'bg-sage-soft text-sage-text',
        className,
      )}
    >
      <Volume2 size={size} aria-hidden />
    </button>
  );
}
