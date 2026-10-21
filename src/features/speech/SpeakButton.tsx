import { useContext, useEffect, useState } from 'react';
import { Loader2, Volume2 } from 'lucide-react';
import { AppContext } from '@/app/context';
import { cx } from '@/lib/cx';
import { resetSpeakers, speak, speakerFor, stopSpeaking } from '@/services/speech/voice';
import type { Speaker } from '@/services/speech/voice';
import { aiKeys } from '@/data/plan';
import { toast } from '@/state/ui';

/** Who speaks `lang` here, worked out again when the key, the flag or the voice settings change. */
export function useSpeaker(lang: string): { speaker: Speaker | null; flag?: string } {
  const app = useContext(AppContext);
  const flag = app?.language.id === lang ? app.language.flag : undefined;
  const key = app ? aiKeys(app.settings).gemini.trim() : '';
  const voice = app?.settings.voice;
  const [speaker, setSpeaker] = useState<Speaker | null>(null);
  useEffect(() => {
    let alive = true;
    resetSpeakers();
    void speakerFor(lang, flag).then((s) => alive && setSpeaker(s));
    return () => {
      alive = false;
    };
  }, [lang, flag, key, voice]);
  return { speaker, flag };
}

/** A speaker button that says `text` in a natural voice; nothing at all when there's no good voice. */
export function SpeakButton({ lang, text, size = 18, className, label = 'Listen' }: { lang: string; text: string; size?: number; className?: string; label?: string }) {
  const { speaker, flag } = useSpeaker(lang);
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle');
  useEffect(() => () => stopSpeaking(), []);
  if (!speaker || speaker.kind === 'none' || !text.trim()) return null;
  const say = () => {
    if (state !== 'idle') {
      stopSpeaking();
      setState('idle');
      return;
    }
    setState('loading');
    speak(lang, text, { flag, onStart: () => setState('playing') })
      .catch((e: unknown) => toast(e instanceof Error ? e.message : 'Couldn’t speak that.', { tone: 'error' }))
      .finally(() => setState('idle'));
  };
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        say();
      }}
      aria-label={state === 'idle' ? label : 'Stop'}
      title={speaker.kind === 'gemini' ? `${label} (${speaker.voice.name})` : label}
      className={cx('inline-grid shrink-0 place-items-center rounded-full transition-colors', state === 'playing' && 'text-accent-text', className)}
    >
      {state === 'loading' ? <Loader2 size={size} className="animate-spin" aria-hidden /> : <Volume2 size={size} aria-hidden />}
    </button>
  );
}
