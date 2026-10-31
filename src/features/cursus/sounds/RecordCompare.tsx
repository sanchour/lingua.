import { UiText, useUi } from '@/design/i18n/UiText';
// Record and compare (6-10): say a word, and see it beside the model: the loudness over time and the pitch of the voice. Honest by design:
// it shows the shapes, and whether the device understood the word; it gives no score. Recordings stay on this device and are not kept.
import { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { letterHints } from '@/core/sounds/articulation';
import { beatsOf, nPVI, strongestWord, syllablesIn } from '@/core/sounds/rhythm';
import type { Beat } from '@/core/sounds/rhythm';
import { contourInSemitones, endDirection, pitchContour, spectrogram, waveformPeaks, type Spectrogram } from '@/core/sounds/pitch';
import { speechMatch } from '@/core/course/speech';
import { canRecord, useRecorder } from '@/features/speech/useRecorder';
import { recognitionSupported, listenOnce } from '@/services/speech/recognition';
import { findRecording, recordingBlob } from '@/services/speech/recordings';
import { cx } from '@/lib/cx';

interface Shape {
  peaks: number[];
  pitch: Array<number | null>;
  url: string;
  blob: Blob;
  seconds: number;
  beats: Beat[];
  spec: Spectrogram;
}

async function shapeOf(blob: Blob): Promise<Shape> {
  const ctx = new AudioContext();
  try {
    const audio = await ctx.decodeAudioData(await blob.arrayBuffer());
    const samples = audio.getChannelData(0);
    const contour = pitchContour(samples, audio.sampleRate);
    return { peaks: waveformPeaks(samples, 80), pitch: contourInSemitones(contour), beats: beatsOf(samples, audio.sampleRate, contour), url: URL.createObjectURL(blob), blob, seconds: audio.duration, spec: spectrogram(samples, audio.sampleRate) };
  } finally {
    void ctx.close();
  }
}

/** Loudness at each frequency over time: dark is quiet, bright is loud; the bottom is low sounds (vowels), the top is high ones (s, sh, f). */
function SpectrogramView({ spec, label }: { spec: Spectrogram; label: string }) {
  const translateUi = useUi();
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const g = canvas?.getContext('2d');
    if (!canvas || !g || !spec.frames.length) return;
    const bins = spec.frames[0].length;
    canvas.width = spec.frames.length;
    canvas.height = bins;
    const img = g.createImageData(canvas.width, bins);
    spec.frames.forEach((frame, x) => {
      for (let y = 0; y < bins; y++) {
        const v = frame[bins - 1 - y];
        const k = (y * canvas.width + x) * 4;
        img.data[k] = 255 * Math.min(1, v * 1.6);
        img.data[k + 1] = 190 * v * v;
        img.data[k + 2] = 90 * v * v * v;
        img.data[k + 3] = 255;
      }
    });
    g.putImageData(img, 0, 0);
  }, [spec]);
  return <canvas ref={ref} role="img" aria-label={translateUi('{0}: which frequencies are loud, over time', [label])} className="mt-2 h-24 w-full rounded-xl bg-black" />;
}

function EndNote({ shape, want }: { shape: Shape; want: 'rise' | 'fall' }) {
  const got = endDirection(shape.pitch);
  if (!got) return <p className="mt-2 text-[13.5px] text-ink-soft"><UiText source={'Not enough of your voice was heard to see which way it goes at the end. Say it a little louder.'} /></p>;
  const word = { rise: 'rose', fall: 'fell', level: 'stayed level' }[got];
  return (
    <p className="mt-2 text-[13.5px] text-ink-soft"><UiText source={'{0}: your voice {1}{2} (Measured from your recording; a guide, not a mark.)'} values={[want === 'rise' ? <UiText source={'A question rises at the end'} /> : <UiText source={'A statement falls at the end'} />, word, got === want ? <UiText source={', as it should.'} /> : '. Try again, and let it ' + (want === 'rise' ? 'go up' : 'come down') + ' on the last word.']} /></p>
  );
}

function Shapes({ label, shape, tone }: { label: string; shape: Shape; tone: 'model' | 'yours' }) {
  const translateUi = useUi();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = slow ? 0.6 : 1;
  }, [slow, shape.url]);
  const color = tone === 'model' ? 'var(--sage)' : 'var(--accent)';
  const maxSemi = Math.max(6, ...shape.pitch.filter((x): x is number => x !== null));
  const n = shape.pitch.length || 1;
  const line = shape.pitch.map((p, i) => (p === null ? null : `${(i / n) * 320},${114 - (p / maxSemi) * 50}`));
  // Gaps in the voice break the line into pieces.
  const pieces: string[][] = [[]];
  for (const pt of line) (pt === null ? pieces.push([]) : pieces[pieces.length - 1].push(pt));
  return (
    <div>
      <p className="mb-1 flex flex-wrap items-center gap-2 text-[12.5px] font-semibold text-ink-faint">
        {label}
        <audio ref={audioRef} src={shape.url} controls className="h-7" aria-label={translateUi('Play {0}', [label])} />
        <button type="button" aria-pressed={slow} onClick={() => setSlow((x) => !x)} className={cx('rounded-full border px-2.5 py-0.5 text-[12px]', slow ? 'border-accent bg-accent-soft' : 'border-line hover:bg-surface')}><UiText source={'Slow'} /></button>
        <span className="font-normal">{shape.seconds.toFixed(2)} s</span>
      </p>
      <svg viewBox="0 0 320 120" className="w-full rounded-xl bg-surface" role="img" aria-label={translateUi('{0}: loudness above, pitch below, and a tick for each syllable', [label])}>
        {shape.peaks.map((p, i) => (
          <rect key={i} x={(i / shape.peaks.length) * 320 + 1} y={30 - p * 28} width={320 / shape.peaks.length - 2} height={Math.max(1, p * 56)} fill={color} opacity="0.55" rx="1" />
        ))}
        {shape.beats.map((b, i) => (
          <line key={`b${i}`} x1={(b.ms / 1000 / (shape.seconds || 1)) * 320} x2={(b.ms / 1000 / (shape.seconds || 1)) * 320} y1={118} y2={118 - 8 - b.level * 10} stroke={color} strokeWidth="1.6" opacity="0.8" />
        ))}
        {pieces.filter((p) => p.length > 1).map((p, i) => (
          <polyline key={i} points={p.join(' ')} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </svg>
      <SpectrogramView spec={shape.spec} label={label} />
    </div>
  );
}

const understoodNow = (heard: string, word: string, lang: string) => speechMatch(word, [heard], lang).score === 1;

/** For sentences said as a statement or a question: which way the voice should go at the end. */
export type EndExpect = Record<string, 'rise' | 'fall'>;

/** For an answer said with one word stressed: the sentence and its stressed word. */
export type StressExpect = Record<string, string>;

const TIMED: Record<string, string> = {
  es: 'Spanish is described as syllable-timed: the beats come about evenly.',
  fr: 'French is described as syllable-timed: the beats come about evenly.',
  zh: 'Mandarin is described as syllable-timed: the beats come about evenly.',
  de: 'German is described as stress-timed: the beats come unevenly, the stressed ones leading and the others squeezed.',
  ru: 'Russian is described as stress-timed: the beats come unevenly, the stressed ones leading and the others squeezed.',
  ar: 'Arabic is usually described as stress-timed: the beats come unevenly.',
};

function BeatNotes({ shape, sentence, stressed, lang }: { shape: Shape; sentence: string; stressed?: string; lang: string }) {
  const translateUi = useUi();
  const evenness = nPVI(shape.beats);
  // Mandarin has no spaces: cut the sentence around the stressed word.
  const cut = stressed ? sentence.indexOf(stressed) : -1;
  const words = (/\s/.test(sentence) || cut < 0 ? sentence.split(/\s+/) : [sentence.slice(0, cut), stressed!, sentence.slice(cut + stressed!.length)]).filter(Boolean);
  const at = stressed ? strongestWord(words, lang, shape.beats) : null;
  const want = stressed ? words.findIndex((w) => w.replace(/[^\p{L}]/gu, '').toLocaleLowerCase() === stressed.toLocaleLowerCase()) : -1;
  return (
    <div className="mt-2 space-y-1 text-[13.5px] text-ink-soft">
      {stressed && (
        <p>
          {syllablesIn(words[0] ?? '', lang) === null
            ? translateUi('Arabic is written without its short vowels, so the syllables of a sentence cannot be counted from the letters. Look for the tallest tick in the picture and listen for it.')
            : at === null || want < 0
            ? translateUi('Your syllables could not be matched to the words well enough to say which one you stressed. Say it again, a little louder and clearly.')
            : at === want
              ? translateUi('The strongest syllable of your sentence was in “{0}”, the word to stress.', [words[at]])
              : translateUi('The strongest syllable of your sentence was in “{0}”; the question asks for “{1}”. Try again, with more weight on it.', [words[at], words[want]])}
        </p>
      )}
      {evenness !== null && (
        <p><UiText source={'Your {0} beats were {1}. {2}'} values={[shape.beats.length, evenness < 30 ? <UiText source={'very even'} /> : evenness < 50 ? <UiText source={'fairly even'} /> : <UiText source={'uneven: short and long gaps alternate'} />, TIMED[lang] ?? '']} /></p>
      )}
      <p className="text-[12px] text-ink-faint"><UiText source={'Found from loudness and pitch in your recording: a guide, not a mark.'} /></p>
    </div>
  );
}

export function RecordCompare({ lang, words, expect, stress }: { lang: string; words: string[]; expect?: EndExpect; stress?: StressExpect }) {
  const translateUi = useUi();
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

  // The audio behind each shape is let go when it is replaced or the page closes.
  useEffect(() => () => (model && model !== 'none' ? URL.revokeObjectURL(model.url) : undefined), [model]);
  useEffect(() => () => (yours ? URL.revokeObjectURL(yours.url) : undefined), [yours]);

  if (!canRecord() || !words.length) return null;
  const hints = heard && !understoodNow(heard, word, lang) ? letterHints(word, heard) : null;
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
  const understood = heard !== null && understoodNow(heard, word, lang);

  return (
    <section aria-labelledby="rc-h" className="rounded-3xl border border-line bg-raised p-5">
      <h2 id="rc-h" className="font-serif text-2xl font-semibold"><UiText source={'Say it, and see it'} /></h2>
      <p className="mt-1 max-w-2xl text-[14px] text-ink-soft"><UiText source={'Choose a word, say it (or shadow it: say it together with the speaker, with headphones on), and see how loud and how high your voice goes beside a real speaker’s. The shapes are a mirror, not a mark: what counts is being understood. Your recording stays on this device and is not kept.'} /></p>
      <div className="mt-3 flex flex-wrap items-center gap-2" role="radiogroup" aria-label={translateUi('Word')}>
        {words.map((w) => (
          <button key={w} type="button" role="radio" aria-checked={w === word} onClick={() => setWord(w)} lang={lang} className={cx('rounded-full border px-3 py-1 font-serif text-[16px]', w === word ? 'border-accent bg-accent-soft' : 'border-line hover:bg-surface')}>
            {w}
          </button>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={() => void (recording ? finish() : go())} className={cx('flex h-11 items-center gap-2 rounded-xl px-4 text-[14px] font-semibold', recording ? 'bg-accent-fill text-on-accent' : 'bg-inverse text-on-inverse')}>
          {recording ? <Square size={15} className="fill-current" aria-hidden /> : <Mic size={16} aria-hidden />}
          {recording ? translateUi('Stop') : translateUi('Say “{0}”', [word])}
        </button>
        {model && model !== 'none' && !recording && (
          <button type="button" onClick={() => void shadow()} title={translateUi('The real speaker plays and you say it with them. Use headphones.')} className="flex h-11 items-center gap-2 rounded-xl border border-line px-4 text-[14px] font-semibold hover:bg-surface"><UiText source={'Shadow it'} /></button>
        )}
        {heard !== null && (
          <p className={cx('text-[14px]', understood ? 'text-sage-text' : 'text-ink-soft')} role="status">
            {understood ? translateUi('The device understood you.') : heard ? translateUi('The device heard “{0}”.', [heard]) : translateUi('The device heard nothing.')}
          </p>
        )}
        {yours && !recording && (
          <button type="button" onClick={() => setModel({ ...yours, url: URL.createObjectURL(yours.blob) })} title={translateUi('Your recording becomes the one to compare with, to hear your own progress.')} className="flex h-11 items-center rounded-xl border border-line px-4 text-[14px] font-semibold hover:bg-surface"><UiText source={'Use mine as the model'} /></button>
        )}
      </div>
      {hints && (hints.missing.length > 0 || hints.extra.length > 0) && (
        <p className="mt-2 text-[13.5px] text-ink-soft"><UiText source={'Where it differed from “{0}”:{1}{2} look those sounds up above and try again slowly. (A guess from what the device wrote down, not a measurement.)'} values={[word, hints.missing.length > 0 && <><UiText source={' the device didn’t hear {0};'} values={[hints.missing.map((c) => `“${c}”`).join(', ')]} /></>, hints.extra.length > 0 && <><UiText source={' it heard {0} that isn’t there;'} values={[hints.extra.map((c) => `“${c}”`).join(', ')]} /></>]} /></p>
      )}
      {yours && expect?.[word] && <EndNote shape={yours} want={expect[word]} />}
      {yours && yours.beats.length >= 2 && (stress?.[word] || yours.beats.length >= 4) && <BeatNotes shape={yours} sentence={word} stressed={stress?.[word]} lang={lang} />}
      {model && model !== 'none' && yours && (
        <p className="mt-2 text-[13.5px] text-ink-soft">
          {yours.seconds > model.seconds * 1.25 ? translateUi('You took {0}× as long as the speaker: try a little quicker.', [(yours.seconds / model.seconds).toFixed(1)]) : yours.seconds < model.seconds * 0.8 ? translateUi('You were {0}× quicker than the speaker: try slowing down so each sound is clear.', [(model.seconds / yours.seconds).toFixed(1)]) : translateUi('Your length is close to the speaker’s.')}
        </p>
      )}
      {error && <p className="mt-2 text-[13px] text-accent-text">{error}</p>}
      <div className="mt-4 space-y-4">
        {model && model !== 'none' ? <Shapes label={translateUi('A real speaker')} shape={model} tone="model" /> : <p className="self-center text-[13px] text-ink-faint">{model === 'none' ? translateUi('There is no recording of this word to compare with. Your own still shows its shape.') : translateUi('Looking for a recording…')}</p>}
        {yours && <Shapes label={translateUi('You')} shape={yours} tone="yours" />}
      </div>
    </section>
  );
}
