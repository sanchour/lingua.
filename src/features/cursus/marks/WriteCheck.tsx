import { UiText, useUi } from '@/design/i18n/UiText';
// "Write it": draw a character on a pad and have the strokes compared with the real ones, in order and direction (6-23).
import { useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { checkStrokes, hanziLines } from '@/core/script/hanzi';
import type { Pt, StrokeCheck } from '@/core/script/hanzi';
import { isKanji } from '@/core/script/strokes';
import type { StrokeData } from '@/core/script/strokes';

/** A kanji's centre lines in a unit square, sampled along each path in the browser. */
function kanjiLines(paths: string[]): Pt[][] {
  return paths.map((d) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    el.setAttribute('d', d);
    const len = el.getTotalLength();
    return Array.from({ length: 16 }, (_, i) => {
      const p = el.getPointAtLength((len * i) / 15);
      return [p.x / 109, p.y / 109] as Pt;
    });
  });
}

export function WriteCheck({ char, data, lang }: { char: string; data: StrokeData; lang: string }) {
  const translateUi = useUi();
  const [strokes, setStrokes] = useState<Pt[][]>([]);
  const [result, setResult] = useState<StrokeCheck | null>(null);
  const [guide, setGuide] = useState(true);
  const pad = useRef<SVGSVGElement>(null);
  const drawing = useRef(false);
  const at = (e: PointerEvent): Pt => {
    const r = pad.current!.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  };
  const clear = () => { setStrokes([]); setResult(null); };
  const check = () => setResult(checkStrokes(strokes, isKanji(data) ? kanjiLines(data.p) : hanziLines(data.m)));
  const total = isKanji(data) ? data.p.length : data.s.length;
  return (
    <div>
      <p className="mb-1.5 text-[12.5px] font-semibold tracking-wide text-ink-faint uppercase"><UiText source={'Write it'} /></p>
      <div className="flex flex-wrap items-start gap-4">
        <svg
          ref={pad}
          viewBox="0 0 1 1"
          width={220}
          height={220}
          role="img"
          aria-label={translateUi('A pad to write {0}', [char])}
          className="touch-none rounded-2xl border border-line bg-surface text-ink"
          onPointerDown={(e) => { drawing.current = true; e.currentTarget.setPointerCapture(e.pointerId); setResult(null); setStrokes((s) => [...s, [at(e)]]); }}
          onPointerMove={(e) => { if (drawing.current) setStrokes((s) => [...s.slice(0, -1), [...s[s.length - 1], at(e)]]); }}
          onPointerUp={() => { drawing.current = false; }}
        >
          {guide && <text x={0.5} y={0.5} textAnchor="middle" dominantBaseline="central" fontSize={0.8} fill="currentColor" opacity={0.1} lang={lang}>{char}</text>}
          {strokes.map((s, i) => (
            <polyline key={i} points={s.map((p) => p.join(',')).join(' ')} fill="none" stroke={result ? (result.ok[i] ? 'var(--sage-text)' : 'var(--accent-text)') : 'currentColor'} strokeWidth={0.035} strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </svg>
        <div className="max-w-xs space-y-2 text-[14px]">
          <p className="text-ink-soft"><UiText source={'Draw the {0} strokes in order; each is compared with the real stroke, its place and direction.'} values={[total]} /></p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={check} disabled={!strokes.length} className="rounded-xl border border-line px-3 py-1.5 enabled:hover:border-line-strong disabled:opacity-50"><UiText source={'Check'} /></button>
            <button type="button" onClick={clear} className="rounded-xl border border-line px-3 py-1.5 hover:border-line-strong"><UiText source={'Clear'} /></button>
            <button type="button" aria-pressed={guide} onClick={() => setGuide((g) => !g)} className="rounded-xl border border-line px-3 py-1.5 hover:border-line-strong"><UiText source={'{0} guide'} values={[guide ? <UiText source={'Hide'} /> : <UiText source={'Show'} />]} /></button>
          </div>
          {result && (
            <p role="status">
              {result.drawn !== result.total ? translateUi('You drew {0} strokes; the character has {1}. ', [result.drawn, result.total]) : ''}
              {result.ok.every(Boolean) && result.drawn === result.total ? translateUi('Every stroke matches, in order.') : translateUi('Strokes that match: {0} of {1}. {2}', [result.ok.filter(Boolean).length, result.total, result.ok.findIndex((x) => !x) >= 0 ? `Look again at stroke ${result.ok.findIndex((x) => !x) + 1} (shown in the accent colour).` : ''])}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
