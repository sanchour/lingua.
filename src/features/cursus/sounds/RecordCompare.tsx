// Record and compare (6-10): say a word, and see it beside the model: the loudness over time and the pitch of the voice. Honest by design:
// it shows the shapes, and whether the device understood the word; it gives no score. Recordings stay on this device and are not kept.
import { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { contourInSemitones, pitchContour, waveformPeaks } from '@/core/sounds/pitch';
import { canRecord, useRecorder } from '@/features/speech/useRecorder';
import { recognitionSupported, listenOnce } from '@/services/speech/recognition';
import { findRecording, recordingBlob } from '@/services/speech/recordings';
import { cx } from '@/lib/cx';

interface Shape {
  peaks: number[];
  pitch: Array<number | null>;
  url: string;
}

async function shapeOf(blob: Blob): Promise<Shape> {
  const ctx = new AudioContext();
  try {
    const audio = await ctx.decodeAudioData(await blob.arrayBuffer());
    const samples = audio.getChannelData(0);
    return { peaks: waveformPeaks(samples, 80), pitch: contourInSemitones(pitchContour(samples, audio.sampleRate)), url: URL.createObjectURL(blob) };
  } finally {
    void ctx.close();
  }
}

function Shapes({ label, shape, tone }: { label: string; shape: Shape; tone: 'model' | 'yours' }) {
  const color = tone === 'model' ? 'var(--sage)' : 'var(--accent)';
  const maxSemi = Math.max(6, ...shape.pitch.filter((x): x is number => x !== null));
  const n = shape.pitch.length || 1;
  const line = shape.pitch.map((p, i) => (p === null ? null : `${(i / n) * 320},${114 - (p / maxSemi) * 50}`));
  // Gaps in the voice break the line into pieces.
  const pieces: string[][] = [[]];
  for (const pt of line) (pt === null ? pieces.push([]) : pieces[pieces.length - 1].push(pt));
  return (
    <div>
      <p className="mb-1 flex items-center gap-2 text-[12.5px] font-semibold text-ink-faint">
        {label}
        <audio src={shape.url} controls className="h-7" aria-label={`Play ${label}`} />
      </p>
      <svg viewBox="0 0 320 120" className="w-full rounded-xl bg-surface" role="img" aria-label={`${label}: loudness above, pitch below`}>
        {shape.peaks.map((p, i) => (
          <rect key={i} x={(i / shape.peaks.length) * 320 + 1} y={30 - p * 28} width={320 / shape.peaks.length - 2} height={Math.max(1, p * 56)} fill={color} opacity="0.55" rx="1" />
        ))}
        {pieces.filter((p) => p.length > 1).map((p, i) => (
          <polyline key={i} points={p.join(' ')} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </svg>
    </div>
  );
}

export function RecordCompare({ lang, words }: { lang: string; words: string[] }) {
  const [word, setWord] = useState(words[0] ?? '');
  const [model, setModel] = useState<Shape | null | 'none'>(null);
  const [yours, setYours] = useState<Shape | null>(null);
  const [heard, setHeard] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { status, start, stop } = useRecorder(8000);
  const recognition = useRef<{ stop: () => void } | null>(null);

  // The model: a real person's recording of the word (Wikimedia Commons), where there is one.
  useEffect(() => {
    let alive = true;
    setModel(null);
    setYours(null);
    setHeard(null);
    void (async () => {
      const found = await findRecording(lang, word, null).catch(() => null);
      if (!found) return alive && setModel('none');
      const shape = await shapeOf(await recordingBlob(lang, word, found)).catch(() => null);
      if (alive) setModel(shape ?? 'none');
    })();
    return () => {
      alive = false;
    };
  }, [lang, word]);

  if (!canRecord() || !words.length) return null;
  const recording = status === 'recording';

  const go = async () => {
    setError(null);
    setHeard(null);
    try {
      await start();
      if (recognitionSupported()) {
        const l = listenOnce(lang);
        recognition.current = l;
        l.result.then((alts) => setHeard(alts[0] ?? ''), () => setHeard(null));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The microphone didn’t start.');
    }
  };
  // Shadowing: the real speaker plays and you say it with them, both at once (headphones, or the microphone hears the speaker too).
  const shadow = async () => {
    if (!model || model === 'none') return;
    await go();
    const player = new Audio(model.url);
    player.addEventListener('ended', () => window.setTimeout(() => void finish(), 700), { once: true });
    void player.play().catch(() => void finish());
  };
  const finish = async () => {
    recognition.current?.stop();
    const blob = await stop();
    if (blob) setYours(await shapeOf(blob).catch(() => null));
  };
  const understood = heard !== null && heard.toLocaleLowerCase(lang).replace(/[^\p{L}]/gu, '') === word.toLocaleLowerCase(lang).replace(/[^\p{L}]/gu, '');

  return (
    <section aria-labelledby="rc-h" className="rounded-3xl border border-line bg-raised p-5">
      <h2 id="rc-h" className="font-serif text-2xl font-semibold">
        Say it, and see it
      </h2>
      <p className="mt-1 max-w-2xl text-[14px] text-ink-soft">
        Choose a word, say it (or shadow it: say it together with the speaker, with headphones on), and see how loud and how high your voice goes beside a real speaker’s. The shapes are a mirror, not a mark: what counts is being understood. Your recording stays on this device and is not kept.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Word">
        {words.map((w) => (
          <button key={w} type="button" role="radio" aria-checked={w === word} onClick={() => setWord(w)} lang={lang} className={cx('rounded-full border px-3 py-1 font-serif text-[16px]', w === word ? 'border-accent bg-accent-soft' : 'border-line hover:bg-surface')}>
            {w}
          </button>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={() => void (recording ? finish() : go())} className={cx('flex h-11 items-center gap-2 rounded-xl px-4 text-[14px] font-semibold', recording ? 'bg-accent-fill text-on-accent' : 'bg-inverse text-on-inverse')}>
          {recording ? <Square size={15} className="fill-current" aria-hidden /> : <Mic size={16} aria-hidden />}
          {recording ? 'Stop' : `Say “${word}”`}
        </button>
        {model && model !== 'none' && !recording && (
          <button type="button" onClick={() => void shadow()} title="The real speaker plays and you say it with them. Use headphones." className="flex h-11 items-center gap-2 rounded-xl border border-line px-4 text-[14px] font-semibold hover:bg-surface">
            Shadow it
          </button>
        )}
        {heard !== null && (
          <p className={cx('text-[14px]', understood ? 'text-sage-text' : 'text-ink-soft')} role="status">
            {understood ? 'The device understood you.' : heard ? `The device heard “${heard}”.` : 'The device heard nothing.'}
          </p>
        )}
      </div>
      {error && <p className="mt-2 text-[13px] text-accent-text">{error}</p>}
      <div className="mt-4 space-y-4">
        {model && model !== 'none' ? <Shapes label="A real speaker" shape={model} tone="model" /> : <p className="self-center text-[13px] text-ink-faint">{model === 'none' ? 'There is no recording of this word to compare with. Your own still shows its shape.' : 'Looking for a recording…'}</p>}
        {yours && <Shapes label="You" shape={yours} tone="yours" />}
      </div>
    </section>
  );
}
