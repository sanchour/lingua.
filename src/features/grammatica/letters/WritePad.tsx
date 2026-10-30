import { UiText } from '@/design/i18n/UiText';
// A square to draw a letter in, with a finger, a pen or the mouse (Lingua 3.0-8, part 5). Tracing
// shows the letter faintly underneath; writing from memory shows it only after the check. The
// letter is drawn by the same font into a small grid, and the ink is compared with it (ink.ts).
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Eraser } from 'lucide-react';
import { scoreInk } from '@/core/script/ink';
import type { InkScore, Mask } from '@/core/script/ink';
import { cx } from '@/lib/cx';

/** The grid the comparison runs on, and the slack (in grid pixels) the ink may stray. */
const GRID = 140;
const SLACK = 5;
/** The letter's size in the square, and the pen's width, as shares of the square. */
const GLYPH = 0.66;
const PEN = 0.05;

type Point = [number, number];

export interface WritePadHandle {
  check: () => InkScore | null;
  clear: () => void;
}

interface Props {
  glyph: string;
  lang: string;
  mode: 'trace' | 'write';
  /** After the check: the letter is shown, and the ink coloured. */
  result: 'right' | 'wrong' | null;
  onInk: (has: boolean) => void;
  /** A serif face for characters (Mandarin, kanji), the sans for letters. */
  serif?: boolean;
}

function drawGlyph(ctx: CanvasRenderingContext2D, size: number, glyph: string, family: string, color: string) {
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `400 ${Math.round(size * GLYPH)}px ${family}`;
  // Centre on the glyph's own ink, not the font's line box, so every script sits in the middle.
  const m = ctx.measureText(glyph);
  const dy = (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  const dx = (m.actualBoundingBoxLeft - m.actualBoundingBoxRight) / 2;
  ctx.fillText(glyph, size / 2 + dx, size / 2 + dy);
}

function maskOf(canvas: HTMLCanvasElement): Mask {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const out = new Uint8Array(canvas.width * canvas.height);
  for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + 3] > 96 ? 1 : 0;
  return { w: canvas.width, h: canvas.height, data: out };
}

function strokePaths(ctx: CanvasRenderingContext2D, strokes: Point[][], scale: number, width: number, color: string) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const s of strokes) {
    if (s.length === 1) {
      ctx.beginPath();
      ctx.arc(s[0][0] * scale, s[0][1] * scale, width / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    s.forEach(([x, y], i) => (i ? ctx.lineTo(x * scale, y * scale) : ctx.moveTo(x * scale, y * scale)));
    ctx.stroke();
  }
}

export const WritePad = forwardRef<WritePadHandle, Props>(function WritePad({ glyph, lang, mode, result, onInk, serif }, ref) {
  const box = useRef<HTMLDivElement>(null);
  const guide = useRef<HTMLCanvasElement>(null);
  const ink = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Point[][]>([]);
  const drawing = useRef(false);
  const [size, setSize] = useState(0);
  const [family, setFamily] = useState('');

  // The square's size follows the layout; the font is the one the page uses for this language.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setSize(Math.round(el.getBoundingClientRect().width));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    setFamily(getComputedStyle(el).fontFamily);
    return () => ro.disconnect();
  }, []);

  const dpr = typeof window === 'undefined' ? 1 : Math.min(2, window.devicePixelRatio || 1);
  const showGuide = mode === 'trace' || result !== null;

  const paintGuide = useCallback(() => {
    const c = guide.current;
    if (!c || !size || !family) return;
    const ctx = c.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const color = getComputedStyle(c).color;
    drawGlyph(ctx, c.width, glyph, family, color);
  }, [glyph, family, size]);

  const paintInk = useCallback(() => {
    const c = ink.current;
    if (!c || !size) return;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    strokePaths(ctx, strokes.current, dpr, size * PEN * dpr, getComputedStyle(c).color);
  }, [dpr, size]);

  useEffect(() => {
    void document.fonts?.ready.then(paintGuide);
    paintGuide();
  }, [paintGuide, showGuide]);
  useEffect(paintInk, [paintInk, result]);

  const clear = useCallback(() => {
    strokes.current = [];
    paintInk();
    onInk(false);
  }, [paintInk, onInk]);

  // A new letter starts with a clean square.
  useEffect(() => {
    strokes.current = [];
    paintInk();
  }, [glyph, mode, paintInk]);

  useImperativeHandle(
    ref,
    () => ({
      clear,
      check: () => {
        if (!strokes.current.length || !size || !family) return null;
        const letter = document.createElement('canvas');
        letter.width = letter.height = GRID;
        drawGlyph(letter.getContext('2d')!, GRID, glyph, family, '#000');
        const drawn = document.createElement('canvas');
        drawn.width = drawn.height = GRID;
        strokePaths(drawn.getContext('2d')!, strokes.current, GRID / size, GRID * PEN, '#000');
        return scoreInk(maskOf(letter), maskOf(drawn), mode, SLACK);
      },
    }),
    [clear, glyph, family, mode, size],
  );

  const point = (e: React.PointerEvent): Point => {
    const r = ink.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  return (
    // Small enough to sit, with its Clear button, between the header and the Check bar.
    <div className="mx-auto w-full max-w-[min(340px,max(200px,calc(100dvh-320px)))]">
      <div
        ref={box}
        lang={lang}
        className={cx(
          'relative aspect-square w-full touch-none rounded-3xl border-2 border-dashed bg-raised select-none',
          serif ? 'font-serif' : 'font-sans',
          result === 'right' ? 'border-sage' : result === 'wrong' ? 'border-accent' : 'border-line-strong',
        )}
      >
        {/* Faint cross-hairs, as on handwriting paper. */}
        <span className="pointer-events-none absolute inset-x-6 top-1/2 border-t border-dashed border-line" aria-hidden />
        <span className="pointer-events-none absolute inset-y-6 left-1/2 border-l border-dashed border-line" aria-hidden />
        <canvas
          ref={guide}
          width={size * dpr}
          height={size * dpr}
          className={cx('absolute inset-0 size-full transition-opacity', result ? 'text-ink-faint opacity-60' : 'text-line-strong opacity-70', !showGuide && 'opacity-0')}
          aria-hidden
        />
        <canvas
          ref={ink}
          width={size * dpr}
          height={size * dpr}
          role="img"
          aria-label={mode === 'trace' ? `Trace ${glyph} here` : 'Write the letter here'}
          className={cx('absolute inset-0 size-full cursor-crosshair', result === 'right' ? 'text-sage' : result === 'wrong' ? 'text-accent' : 'text-ink')}
          onPointerDown={(e) => {
            if (result) return;
            // Keep the stroke when the pen leaves the square; some pointers can't be captured.
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              /* drawing still works without capture */
            }
            drawing.current = true;
            strokes.current.push([point(e)]);
            paintInk();
            onInk(true);
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return;
            const events = 'getCoalescedEvents' in e.nativeEvent ? e.nativeEvent.getCoalescedEvents() : [];
            const last = strokes.current[strokes.current.length - 1];
            if (events.length) for (const ev of events) last.push(point(ev as unknown as React.PointerEvent));
            else last.push(point(e));
            paintInk();
          }}
          onPointerUp={() => (drawing.current = false)}
          onPointerCancel={() => (drawing.current = false)}
        />
      </div>
      <div className="mt-2 flex justify-end">
        <button type="button" onClick={clear} disabled={Boolean(result)} className="hit inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-soft hover:text-ink disabled:opacity-40"><UiText source={'{0} Clear'} values={[<Eraser size={15} aria-hidden />]} /></button>
      </div>
    </div>
  );
});
