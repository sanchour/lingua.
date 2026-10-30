// A Chinese character drawn stroke by stroke (6-23): an animation, the order as a row of steps, and the parts it is built from.
import { useEffect, useId, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { isKanji, loadReadings, loadStrokes, medianLength, medianPath, strokeCount } from '@/core/script/strokes';
import type { CharReadings } from '@/core/script/hanzi';
import { WriteCheck } from './WriteCheck';
import type { StrokeData, StrokeSet } from '@/core/script/strokes';
import { cx } from '@/lib/cx';

const DRAW_MS = 550;
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Strokes 0..upto drawn in full, the stroke `partial` of the way through the next one. */
function Glyph({ data, upto, partial = 1, size, current = true }: { data: StrokeData; upto: number; partial?: number; size: number; current?: boolean }) {
  const id = useId();
  if (isKanji(data))
    return (
      <svg viewBox="0 0 109 109" width={size} height={size} aria-hidden className="shrink-0">
        {data.p.map((d, i) => (
          <path key={i} d={d} pathLength={1} fill="none" stroke="currentColor" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" opacity={i > upto ? 0.1 : i === upto && current ? 1 : 0.55} strokeDasharray={i === upto ? 1 : undefined} strokeDashoffset={i === upto ? 1 - partial : undefined} />
        ))}
      </svg>
    );
  return (
    <svg viewBox="0 0 1024 1024" width={size} height={size} aria-hidden className="shrink-0">
      <g transform="scale(1, -1) translate(0, -900)">
        {data.s.map((d, i) => {
          if (i > upto) return <path key={i} d={d} fill="currentColor" opacity={0.08} />;
          if (i < upto || partial >= 1) return <path key={i} d={d} fill="currentColor" opacity={i === upto && current ? 1 : 0.55} />;
          const L = medianLength(data.m[i]);
          return (
            <g key={i}>
              <path d={d} fill="currentColor" opacity={0.08} />
              <clipPath id={`${id}-${i}`}><path d={d} /></clipPath>
              <path d={medianPath(data.m[i])} clipPath={`url(#${id}-${i})`} fill="none" stroke="currentColor" strokeWidth={140} strokeLinecap="round" strokeDasharray={L + 140} strokeDashoffset={(L + 140) * (1 - partial)} />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

export function StrokeOrder({ char, set = 'zh', onOpen }: { char: string; set?: StrokeSet; onOpen?: (c: string) => void }) {
  const [all, setAll] = useState<Record<string, StrokeData> | null | undefined>();
  const data = all?.[char];
  const [readings, setReadings] = useState<Record<string, CharReadings>>({});
  useEffect(() => {
    void loadReadings().then(setReadings, () => undefined);
  }, []);
  const rd = readings[char];
  const [step, setStep] = useState(0);
  const [partial, setPartial] = useState(1);
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);
  useEffect(() => {
    let live = true;
    loadStrokes(set).then((a) => live && setAll(a), () => live && setAll(null));
    return () => {
      live = false;
    };
  }, [set]);
  useEffect(() => {
    cancelAnimationFrame(raf.current);
    setStep(0);
    setPartial(1);
    setPlaying(false);
  }, [char]);
  const total = data ? strokeCount(data) : 0;

  useEffect(() => {
    if (!playing || !data) return;
    let start = performance.now();
    let i = step;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / DRAW_MS);
      setStep(i);
      setPartial(p);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else if (i + 1 < strokeCount(data)) {
        i += 1;
        start = now;
        raf.current = requestAnimationFrame(tick);
      } else setPlaying(false);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // The animation owns step and partial while it runs; it starts from the step shown when Play is pressed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, data]);

  if (all === undefined) return <p className="text-[14px] text-ink-faint">Loading strokes…</p>;
  if (all === null) return <p className="text-[14px] text-ink-faint">The stroke data could not be loaded (it needs a connection the first time).</p>;
  if (!data) return <p className="text-[14px] text-ink-faint">No stroke data for {char}: it holds the {Object.keys(all).length} most used characters.</p>;

  const play = () => {
    if (reduced()) {
      setStep(total - 1);
      setPartial(1);
      return;
    }
    if (!playing) {
      setStep(partial >= 1 && step >= total - 1 ? 0 : step);
      setPartial(0);
    }
    setPlaying((p) => !p);
  };
  const parts = [...(data.c ?? '')];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-5">
        <div className="rounded-2xl border border-line/70 bg-surface p-2 text-ink">
          <Glyph data={data} upto={step} partial={playing ? partial : 1} size={176} />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5 text-[14.5px]">
          <p className="text-ink-soft">Stroke {step + 1} of {total}</p>
          {rd?.d && (isKanji(data) || !data.e) && <p>{rd.d}</p>}
          {rd && (rd.on?.length || rd.kun?.length) && set === 'ja' && <p className="text-ink-soft">{rd.on?.length ? `On: ${rd.on.join(', ')}` : ''}{rd.on?.length && rd.kun?.length ? ' · ' : ''}{rd.kun?.length ? `Kun: ${rd.kun.join(', ')}` : ''}</p>}
          {rd?.ko?.length && <p className="text-ink-soft">Korean hanja reading: <span lang="ko">{rd.ko.join(', ')}</span></p>}
          {!isKanji(data) && data.e && <p>{data.e}</p>}
          {!isKanji(data) && data.h && <p className="text-ink-soft">{data.h}</p>}
          {!isKanji(data) && data.r && <p className="text-ink-soft">Radical <span lang="zh" className="font-serif text-[18px] text-ink">{data.r}</span></p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={play} className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 text-[14px] hover:border-line-strong">
              {playing ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />}{playing ? 'Pause' : 'Play'}
            </button>
            <button type="button" onClick={() => { setPlaying(false); setStep(0); setPartial(1); }} className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 text-[14px] hover:border-line-strong">
              <RotateCcw size={15} aria-hidden />Start
            </button>
          </div>
        </div>
      </div>
      <ol className="flex flex-wrap gap-1.5" aria-label="Stroke order">
        {Array.from({ length: total }, (_, i) => (
          <li key={i}>
            <button type="button" aria-label={`Show stroke ${i + 1}`} aria-current={i === step} onClick={() => { setPlaying(false); setStep(i); setPartial(1); }} className={cx('grid place-items-center rounded-lg border p-0.5 text-ink', i === step ? 'border-accent-text bg-accent-soft' : 'border-line/60 bg-surface hover:border-line-strong')}>
              <Glyph data={data} upto={i} size={44} />
              <span className="text-[11px] text-ink-faint">{i + 1}</span>
            </button>
          </li>
        ))}
      </ol>
      <WriteCheck key={char} char={char} data={data} lang={set} />
      {parts.length > 0 && (
        <div>
          <p className="mb-1.5 text-[12.5px] font-semibold tracking-wide text-ink-faint uppercase">Built from</p>
          <ul className="flex flex-wrap gap-2">
            {parts.map((p, i) => (
              <li key={i}>
                <button type="button" lang={set} disabled={!onOpen || !all[p]} onClick={() => onOpen?.(p)} className="rounded-xl border border-line/70 bg-surface px-3 py-1.5 font-serif text-[24px] enabled:hover:border-line-strong disabled:opacity-70">
                  {p}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
