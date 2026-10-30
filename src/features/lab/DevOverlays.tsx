import { UiText, useUi } from '@/design/i18n/UiText';
import { useEffect, useRef } from 'react';
import { Grid3x3, SquareDashed, X } from 'lucide-react';
import { cx } from '@/lib/cx';
import { useDevLab } from './devLab';

const LINE = 'rgb(214 69 69 / 0.09)';
const BEAT = 'rgb(214 69 69 / 0.2)';
const MEASURE = 720;

/**
 * The Device lab's layout overlays (7-0d), on every page for this session: a 4 px grid with an 8 px beat and the
 * 720 px reading measure centred on the page's column, and an outline on every box. A small chip turns them off
 * from anywhere. Nothing here takes a click (the chip aside).
 */
export default function DevOverlays() {
  const translateUi = useUi();
  const { grid, outlines, setGrid, setOutlines } = useDevLab();
  const measure = useRef<HTMLDivElement>(null);

  // The measure sits on the column the page's content is in (the desktop shell's), else the window's middle.
  useEffect(() => {
    if (!grid) return;
    let frame = 0;
    const draw = () => {
      frame = 0;
      const box = measure.current;
      if (!box) return;
      const column = document.querySelector('main > div');
      const r = column?.getBoundingClientRect();
      const middle = r && r.width ? r.left + r.width / 2 : window.innerWidth / 2;
      box.style.transform = `translateX(${Math.round(middle - MEASURE / 2)}px)`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    draw();
    window.addEventListener('resize', schedule);
    const timer = window.setInterval(schedule, 500);
    return () => {
      window.removeEventListener('resize', schedule);
      window.clearInterval(timer);
      cancelAnimationFrame(frame);
    };
  }, [grid]);

  if (!grid && !outlines) return null;
  const chip = 'inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[11.5px] font-semibold transition-colors';
  return (
    <>
      {outlines && <style>{translateUi('body *:not([data-design-notes]):not([data-design-notes] *):not([data-dev-lab]):not([data-dev-lab] *){outline:1px solid rgb(214 69 69 / .4)!important;outline-offset:-1px}', [])}</style>}
      {grid && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-[117]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(to right, ${BEAT} 1px, transparent 1px), linear-gradient(to bottom, ${BEAT} 1px, transparent 1px), linear-gradient(to right, ${LINE} 1px, transparent 1px), linear-gradient(to bottom, ${LINE} 1px, transparent 1px)`,
              backgroundSize: '8px 8px, 8px 8px, 4px 4px, 4px 4px',
            }}
          />
          <div ref={measure} className="absolute inset-y-0 left-0 border-x-2 border-dashed border-[rgb(70_110_214/0.55)] bg-[rgb(70_110_214/0.04)]" style={{ width: MEASURE }}>
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-[rgb(70_110_214)] px-1.5 py-px font-mono text-[10.5px] font-semibold text-white"><UiText source={'720 px'} /></span>
          </div>
        </div>
      )}
      <div data-dev-lab="" className="fixed top-3 left-1/2 z-[123] flex -translate-x-1/2 items-center gap-0.5 rounded-full bg-inverse p-0.5 pl-2.5 text-on-inverse shadow-elev-3">
        <span className="mr-1 text-[11px] font-bold tracking-[0.08em] uppercase opacity-70"><UiText source={'Lab'} /></span>
        <button type="button" aria-pressed={grid} onClick={() => setGrid(!grid)} className={cx(chip, grid ? 'bg-on-inverse/20' : 'opacity-60 hover:opacity-100')}><UiText source={'{0} Grid'} values={[<Grid3x3 size={13} aria-hidden />]} /></button>
        <button type="button" aria-pressed={outlines} onClick={() => setOutlines(!outlines)} className={cx(chip, outlines ? 'bg-on-inverse/20' : 'opacity-60 hover:opacity-100')}><UiText source={'{0} Outlines'} values={[<SquareDashed size={13} aria-hidden />]} /></button>
        <button type="button" onClick={() => (setGrid(false), setOutlines(false))} aria-label={translateUi('Turn the overlays off')} className="grid size-7 place-items-center rounded-full opacity-70 hover:bg-on-inverse/10 hover:opacity-100">
          <X size={14} aria-hidden />
        </button>
      </div>
    </>
  );
}
