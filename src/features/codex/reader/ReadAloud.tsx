import { useEffect, useRef, useState } from 'react';
import type { Chapter } from '@/data/types';
import { Button } from '@/design/primitives';
import { UiText } from '@/design/i18n/UiText';
import { speak, stopSpeaking } from '@/services/speech/voice';
import { useSpeaker } from '@/features/speech/SpeakButton';

export function ReadAloud({ chapter, lang, follow, onPlaying }: { chapter: Chapter; lang: string; follow: (block: number, start: number, end: number) => void; onPlaying?: (playing: boolean) => void }) {
  const { speaker, flag } = useSpeaker(lang);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');
  const run = useRef(0);
  const controls = useRef<HTMLDivElement>(null);
  const stop = () => { run.current++; stopSpeaking(); setPlaying(false); follow(-1, 0, 0); };
  useEffect(() => { onPlaying?.(playing); }, [playing, onPlaying]);
  useEffect(() => () => { run.current++; stopSpeaking(); follow(-1, 0, 0); onPlaying?.(false); }, [chapter.id]);
  useEffect(() => {
    if (!playing) return;
    const pointer = (e: PointerEvent) => { if (!controls.current?.contains(e.target as Node)) stop(); };
    const key = (e: KeyboardEvent) => { if (['Escape', 'ArrowLeft', 'ArrowRight'].includes(e.key)) stop(); };
    const hidden = () => { if (document.hidden) stop(); };
    document.addEventListener('pointerdown', pointer); document.addEventListener('keydown', key); document.addEventListener('visibilitychange', hidden);
    return () => { document.removeEventListener('pointerdown', pointer); document.removeEventListener('keydown', key); document.removeEventListener('visibilitychange', hidden); };
  }, [playing]);
  const start = async () => {
    const id = ++run.current;
    setPlaying(true); setError('');
    try {
      for (const [b, block] of chapter.blocks.entries()) {
        if (block.t === 'img') continue;
        for (const sentence of new Intl.Segmenter(lang, { granularity: 'sentence' }).segment(block.text)) {
          if (id !== run.current) return;
          await speak(lang, sentence.segment, { flag, onStart: () => { if (id !== run.current) stopSpeaking(); else follow(b, sentence.index, sentence.index + sentence.segment.length); } });
        }
      }
    } catch (e) { if (id === run.current) setError(e instanceof Error ? e.message : 'Could not read this chapter aloud.'); }
    finally { if (id === run.current) { setPlaying(false); follow(-1, 0, 0); } }
  };
  return <div ref={controls} className="flex items-center gap-2">
    <Button size="sm" variant="ghost" disabled={!speaker || speaker.kind === 'none'} onClick={() => playing ? stop() : void start()}><UiText source={playing ? 'Stop reading aloud' : 'Read chapter aloud'} /></Button>
    {error && <span role="alert" className="max-w-56 text-xs text-accent-text"><UiText source={error} /></span>}
  </div>;
}
