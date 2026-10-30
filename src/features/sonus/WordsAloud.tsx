import { interpolate } from '@/core/i18n/messages';
import { UiText, useUi } from '@/design/i18n/UiText';
// Your words, read aloud (6-9): the words you are learning, said one after another with their meaning and a sentence, in the
// device's voice, for the commute or the washing-up. It works from the cards you have, so it changes as they do.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { useApp } from '@/app/context';
import { BackLink } from '@/app/BackLink';
import { PageHeader } from '@/app/PageHeader';
import { getLanguage } from '@/core/lang/languages';
import { practiceNotes } from '@/data/practice';
import type { Note } from '@/data/types';
import { useSpeaker } from '@/features/speech/SpeakButton';
import { speak, stopSpeaking } from '@/services/speech/voice';

const pause = (ms: number, stopped: () => boolean) => new Promise<void>((resolve) => {
  const t = window.setTimeout(resolve, ms);
  const watch = window.setInterval(() => stopped() && (window.clearTimeout(t), window.clearInterval(watch), resolve()), 100);
  window.setTimeout(() => window.clearInterval(watch), ms + 50);
});

export default function WordsAloud() {
  const translateUi = useUi();
  const { language } = useApp();
  const lang = language.id;
  const { speaker, flag } = useSpeaker(lang);
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const run = useRef(0);

  useEffect(() => {
    void practiceNotes(lang).then(setNotes);
  }, [lang]);

  const stop = useCallback(() => {
    run.current++;
    stopSpeaking();
    setPlaying(false);
  }, []);
  useEffect(() => stop, [stop]);

  const play = useCallback(
    async (from: number) => {
      if (!notes?.length) return;
      const mine = ++run.current;
      const dead = () => run.current !== mine;
      setPlaying(true);
      for (let i = from; i < notes.length && !dead(); i++) {
        setAt(i);
        const n = notes[i];
        try {
          await speak(lang, n.term, { flag });
          if (dead()) break;
          await pause(900, dead);
          const sentence = n.example?.text ?? (n.context?.sentence && n.context.sentence !== n.term ? n.context.sentence : undefined);
          if (sentence && sentence.length < 160 && !dead()) {
            await speak(lang, sentence, { flag });
            await pause(900, dead);
          }
        } catch {
          break;
        }
        await pause(700, dead);
      }
      if (!dead()) setPlaying(false);
    },
    [notes, lang, flag],
  );

  const note = notes?.[at];
  const noVoice = !speaker || speaker.kind === 'none';
  return (
    <>
      <BackLink to="/sonus"><UiText source={'Sonus'} /></BackLink>
      <PageHeader title={translateUi('Your words, read aloud')} englishTitle={'Your words, read aloud'} eyebrow={translateUi('Listen to {0}', [translateUi(getLanguage(lang)?.name ?? lang)])} englishEyebrow={interpolate('Listen to {0}', [getLanguage(lang)?.name ?? lang])} />
      {!notes ? null : !notes.length ? (
        <p className="max-w-xl text-[15px] text-ink-soft"><UiText source={'You have no words with a meaning yet. Mark words while you read, or make a deck, and they will be read to you here.'} /></p>
      ) : (
        <div className="mx-auto max-w-xl py-6 text-center">
          <p className="text-[13px] text-ink-faint"><UiText source={'{0} of {1}'} values={[at + 1, notes.length]} /></p>
          <p lang={lang} className="mt-4 font-serif text-5xl">
            {note?.term}
          </p>
          <p className="mt-2 text-[17px] text-ink-soft">{note?.meaning}</p>
          {note?.example?.text && (
            <p lang={lang} className="mt-4 font-serif text-[18px] text-ink-soft italic">
              {note.example.text}
            </p>
          )}
          <div className="mt-8 flex items-center justify-center gap-3">
            <button type="button" aria-label={translateUi('Previous word')} onClick={() => (playing ? void play(Math.max(0, at - 1)) : setAt(Math.max(0, at - 1)))} className="grid size-12 place-items-center rounded-full text-ink-soft hover:bg-surface">
              <SkipBack size={22} aria-hidden />
            </button>
            <button type="button" aria-label={playing ? translateUi('Pause') : translateUi('Play')} disabled={noVoice} onClick={() => (playing ? stop() : void play(at))} className="grid size-16 place-items-center rounded-full bg-inverse text-on-inverse shadow-elev-2 disabled:opacity-40">
              {playing ? <Pause size={26} className="fill-current" aria-hidden /> : <Play size={26} className="translate-x-0.5 fill-current" aria-hidden />}
            </button>
            <button type="button" aria-label={translateUi('Next word')} onClick={() => (playing ? void play(Math.min(notes.length - 1, at + 1)) : setAt(Math.min(notes.length - 1, at + 1)))} className="grid size-12 place-items-center rounded-full text-ink-soft hover:bg-surface">
              <SkipForward size={22} aria-hidden />
            </button>
          </div>
          {noVoice && <p className="mt-4 text-[13px] text-accent-text"><UiText source={'There is no voice for this language on this device. Add one in Settings › Voices.'} /></p>}
        </div>
      )}
    </>
  );
}
