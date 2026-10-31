import { useEffect, useState } from 'react';

interface BoxModelOverlayProps {
  el: Element;
}

export function BoxModelOverlay({ el }: BoxModelOverlayProps) {
  const [metrics, setMetrics] = useState<{
    rect: DOMRect;
    mt: number;
    mr: number;
    mb: number;
    ml: number;
    pt: number;
    pr: number;
    pb: number;
    pl: number;
    bt: number;
    br: number;
    bb: number;
    bl: number;
  } | null>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!el.isConnected) return;
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      setMetrics({
        rect,
        mt: parseFloat(cs.marginTop) || 0,
        mr: parseFloat(cs.marginRight) || 0,
        mb: parseFloat(cs.marginBottom) || 0,
        ml: parseFloat(cs.marginLeft) || 0,
        pt: parseFloat(cs.paddingTop) || 0,
        pr: parseFloat(cs.paddingRight) || 0,
        pb: parseFloat(cs.paddingBottom) || 0,
        pl: parseFloat(cs.paddingLeft) || 0,
        bt: parseFloat(cs.borderTopWidth) || 0,
        br: parseFloat(cs.borderRightWidth) || 0,
        bb: parseFloat(cs.borderBottomWidth) || 0,
        bl: parseFloat(cs.borderLeftWidth) || 0,
      });
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    schedule();
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    const interval = window.setInterval(schedule, 200);

    return () => {
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      window.clearInterval(interval);
      cancelAnimationFrame(frame);
    };
  }, [el]);

  if (!metrics) return null;

  const { rect, mt, mr, mb, ml, pt, pr, pb, pl, bt, br, bb, bl } = metrics;

  // Margin box
  const marginX = rect.left - ml;
  const marginY = rect.top - mt;
  const marginW = rect.width + ml + mr;
  const marginH = rect.height + mt + mb;

  // Content box
  const contentW = Math.max(0, rect.width - bl - br - pl - pr);
  const contentH = Math.max(0, rect.height - bt - bb - pt - pb);

  const badgeStyle = 'px-1 py-0.2 rounded font-mono text-[10px] font-semibold pointer-events-none select-none';

  return (
    <div className="pointer-events-none fixed inset-0 z-[119] overflow-hidden" aria-hidden="true" lang="en">
      {/* 1. Margin band (Orange / Amber) */}
      {(mt > 0 || mr > 0 || mb > 0 || ml > 0) && (
        <div
          className="absolute border border-dashed border-amber-500/70 bg-amber-500/20"
          style={{
            left: `${marginX}px`,
            top: `${marginY}px`,
            width: `${marginW}px`,
            height: `${marginH}px`,
          }}
        >
          {mt > 0 && (
            <span
              className={`absolute top-0.5 left-1/2 -translate-x-1/2 bg-amber-600/90 text-white ${badgeStyle}`}
            >
              margin-top: {Math.round(mt)}px
            </span>
          )}
          {mb > 0 && (
            <span
              className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 bg-amber-600/90 text-white ${badgeStyle}`}
            >
              margin-bottom: {Math.round(mb)}px
            </span>
          )}
          {ml > 0 && (
            <span
              className={`absolute left-0.5 top-1/2 -translate-y-1/2 bg-amber-600/90 text-white ${badgeStyle}`}
            >
              {Math.round(ml)}
            </span>
          )}
          {mr > 0 && (
            <span
              className={`absolute right-0.5 top-1/2 -translate-y-1/2 bg-amber-600/90 text-white ${badgeStyle}`}
            >
              {Math.round(mr)}
            </span>
          )}
        </div>
      )}

      {/* 2. Border & Padding box (Green) */}
      <div
        className="absolute border border-green-600/60 bg-green-500/25"
        style={{
          left: `${rect.left}px`,
          top: `${rect.top}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
        }}
      >
        {pt > 0 && (
          <span
            className={`absolute top-0.5 left-1/2 -translate-x-1/2 bg-green-700/90 text-white ${badgeStyle}`}
          >
            padding-top: {Math.round(pt)}px
          </span>
        )}
        {pb > 0 && (
          <span
            className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 bg-green-700/90 text-white ${badgeStyle}`}
          >
            padding-bottom: {Math.round(pb)}px
          </span>
        )}
        {pl > 0 && (
          <span
            className={`absolute left-0.5 top-1/2 -translate-y-1/2 bg-green-700/90 text-white ${badgeStyle}`}
          >
            {Math.round(pl)}
          </span>
        )}
        {pr > 0 && (
          <span
            className={`absolute right-0.5 top-1/2 -translate-y-1/2 bg-green-700/90 text-white ${badgeStyle}`}
          >
            {Math.round(pr)}
          </span>
        )}

        {/* 3. Content box (Blue) */}
        <div
          className="absolute flex items-center justify-center border border-blue-500/70 bg-blue-500/30"
          style={{
            left: `${bl + pl}px`,
            top: `${bt + pt}px`,
            width: `${contentW}px`,
            height: `${contentH}px`,
          }}
        >
          <span className={`bg-blue-600/90 text-white shadow-sm ${badgeStyle}`}>
            {Math.round(contentW)} × {Math.round(contentH)}
          </span>
        </div>
      </div>
    </div>
  );
}
