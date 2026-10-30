import { UiText, useUi } from '@/design/i18n/UiText';
import { useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { ChevronLeft, ChevronRight, LoaderCircle, RefreshCw, ScanText } from 'lucide-react';
import { db } from '@/data/db';
import { blobUrl, getChapter, setPageBubbles } from '@/data/library';
import type { Text } from '@/data/types';
import { Button } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { readBubbles, stopOcr } from '@/services/comics/ocr';
import { forgetChapterModels } from './model';
import type { ChapterModel } from './model';

// ── Reading the bubbles ─────────────────────────────────────────────────────

const reading = new Map<string, Promise<boolean>>();

/** Reads a page's bubbles once (the open page first, then the next one ahead of time). */
export function readComicPage(text: Pick<Text, 'id' | 'lang'>, index: number, onProgress?: (status: 'loading' | 'reading', fraction: number) => void, again = false): Promise<boolean> {
  const key = `${text.id}:${index}`;
  const busy = reading.get(key);
  if (busy && !again) return busy;
  const job = (async () => {
    const chapter = await getChapter(text.id, index);
    if (!chapter || (chapter.readAt && !again)) return false;
    const img = chapter.blocks.find((b) => b.t === 'img');
    const row = img?.t === 'img' ? await db.blobs.get(img.blobId) : undefined;
    if (!row) return false;
    const bubbles = await readBubbles(row.blob, text.lang, onProgress);
    await setPageBubbles(text.id, index, bubbles);
    forgetChapterModels(text.id);
    return true;
  })();
  reading.set(key, job);
  void job.finally(() => reading.delete(key)).catch(() => undefined);
  return job;
}

type Status = { state: 'idle' } | { state: 'busy'; step: 'loading' | 'reading'; fraction: number } | { state: 'failed'; message: string };

// ── The page: zoom, pan, swipe, bubbles ─────────────────────────────────────

interface View {
  s: number;
  x: number;
  y: number;
}

function ComicPage({ blobId, w, h, boxes, lit, onBubble, onTurn, rtl }: { blobId: string; w?: number; h?: number; boxes: Array<{ b: number; box: [number, number, number, number] }>; lit: number | null; onBubble: (b: number) => void; onTurn: (step: 1 | -1) => void; rtl: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setRoom({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [view, setView] = useState<View>({ s: 1, x: 0, y: 0 });
  const frameRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ x: number; y: number; t: number; moved: number; start: View; pinch?: { d: number; mx: number; my: number } } | null>(null);
  const lastTap = useRef(0);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setView({ s: 1, x: 0, y: 0 });
    void blobUrl(blobId).then((u) => {
      if (cancelled) return void (u && URL.revokeObjectURL(u));
      objectUrl = u;
      setUrl(u);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [blobId]);

  const clamp = (v: View): View => {
    const el = frameRef.current;
    if (!el) return v;
    const s = Math.min(4, Math.max(1, v.s));
    return { s, x: Math.min(0, Math.max(el.clientWidth * (1 - s), v.x)), y: Math.min(0, Math.max(el.clientHeight * (1 - s), v.y)) };
  };
  const local = (e: { clientX: number; clientY: number }) => {
    const r = frameRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  // Zooms by `factor` keeping the point under the finger where it is.
  const zoomAt = (v: View, px: number, py: number, s: number): View => clamp({ s, x: px - ((px - v.x) / v.s) * s, y: py - ((py - v.y) / v.s) * s });

  const down = (e: ReactPointerEvent) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // A pointer the browser no longer knows: the gesture works without capture.
    }
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    if (pointers.current.size === 1) gesture.current = { ...p, t: performance.now(), moved: 0, start: view };
    else if (pointers.current.size === 2 && gesture.current) {
      const [a, b] = [...pointers.current.values()];
      gesture.current.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
      gesture.current.start = view;
      gesture.current.moved += 100;
    }
  };
  const move = (e: ReactPointerEvent) => {
    const g = gesture.current;
    if (!g || !pointers.current.has(e.pointerId)) return;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    if (g.pinch && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const s = (g.start.s * Math.hypot(a.x - b.x, a.y - b.y)) / g.pinch.d;
      setView(zoomAt(g.start, g.pinch.mx, g.pinch.my, s));
      return;
    }
    g.moved = Math.max(g.moved, Math.hypot(p.x - g.x, p.y - g.y));
    if (view.s > 1) setView(clamp({ ...g.start, x: g.start.x + p.x - g.x, y: g.start.y + p.y - g.y }));
  };
  const up = (e: ReactPointerEvent) => {
    const g = gesture.current;
    const p = local(e);
    pointers.current.delete(e.pointerId);
    if (pointers.current.size > 0 || !g) return;
    gesture.current = null;
    const dt = performance.now() - g.t;
    const dx = p.x - g.x;
    // A quick sideways swipe at full size turns the page (the other way for right-to-left comics).
    if (g.start.s === 1 && !g.pinch && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(p.y - g.y) * 1.4 && dt < 600) {
      const forward = dx < 0 !== rtl;
      return onTurn(forward ? 1 : -1);
    }
    if (g.moved > 8 || g.pinch) return;
    const now = performance.now();
    if (now - lastTap.current < 300) {
      lastTap.current = 0;
      setView(view.s > 1 ? { s: 1, x: 0, y: 0 } : zoomAt(view, p.x, p.y, 2.5));
      return;
    }
    lastTap.current = now;
    // A tap on a bubble shows its words.
    const el = frameRef.current!;
    const fx = (p.x - view.x) / view.s / el.clientWidth;
    const fy = (p.y - view.y) / view.s / el.clientHeight;
    const hit = boxes.find(({ box: [x, y, bw, bh] }) => fx >= x && fx <= x + bw && fy >= y && fy <= y + bh);
    if (hit) onBubble(hit.b);
  };

  // A trackpad pinch (ctrl + wheel) zooms on desktop.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const p = local(e);
      setView((v) => zoomAt(v, p.x, p.y, v.s * Math.exp(-e.deltaY * 0.01)));
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  });

  // The page as large as fits, keeping its shape, so the bubbles' outlines sit on the picture.
  const ratio = w && h ? w / h : 2 / 3;
  const size = room.w / Math.max(1, room.h) > ratio ? { width: room.h * ratio, height: room.h } : { width: room.w, height: room.w / ratio };
  return (
    <div ref={outerRef} className="grid size-full place-items-center">
      <div
        ref={frameRef}
        className="relative touch-none overflow-hidden rounded-lg bg-sunken shadow-elev-2 select-none"
        style={size}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <div className="absolute inset-0 origin-top-left will-change-transform" style={{ transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.s})`, transition: gesture.current ? 'none' : 'transform 220ms var(--ease-out, ease-out)' }}>
          {url && <img src={url} alt="" draggable={false} className="size-full object-contain" />}
          {boxes.map(({ b, box: [x, y, bw, bh] }) => (
            <span
              key={b}
              className={cx('pointer-events-none absolute rounded-md border-2 transition-[opacity,border-color] duration-200', lit === b ? 'border-accent opacity-100' : 'border-accent/0 opacity-0')}
              style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: `${bw * 100}%`, height: `${bh * 100}%`, boxShadow: lit === b ? '0 0 0 9999px color-mix(in oklab, black 18%, transparent)' : undefined }}
              aria-hidden
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── The comic view: the page, and its words beside or under it ──────────────

export function ComicView({ text, model, ready, index, wide, onTurn, onPageRead, children }: { text: Text; model: ChapterModel | null | undefined; ready: boolean; index: number; wide: boolean; onTurn: (step: 1 | -1) => void; onPageRead: () => void; children: ReactNode }) {
  const translateUi = useUi();
  const [status, setStatus] = useState<Status>({ state: 'idle' });
  const [lit, setLit] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const rtl = text.lang === 'ja' || text.lang === 'ar' || text.lang === 'fa';
  const chapter = ready ? model?.chapter : undefined;
  const img = chapter?.blocks.find((b) => b.t === 'img');
  const boxes = (chapter?.blocks ?? []).flatMap((block, b) => (block.t !== 'img' && block.box ? [{ b, box: block.box }] : []));

  // The open page's bubbles are read when it opens; then the next page's, so turning is instant.
  const read = (again = false) => {
    if (!chapter) return;
    setStatus({ state: 'busy', step: 'loading', fraction: 0 });
    readComicPage(text, index, (step, fraction) => setStatus({ state: 'busy', step, fraction }), again)
      .then((changed) => {
        setStatus({ state: 'idle' });
        if (changed) onPageRead();
        if (index + 1 < text.chapterCount) void readComicPage(text, index + 1).catch(() => undefined);
      })
      .catch((error: unknown) => setStatus({ state: 'failed', message: error instanceof Error && error.message ? error.message : 'Check the connection: the first time, the language’s reading data is downloaded.' }));
  };
  useEffect(() => {
    setLit(null);
    if (chapter && !chapter.readAt) read();
    else setStatus({ state: 'idle' });
  }, [chapter?.id, chapter?.readAt]);
  useEffect(() => () => stopOcr(), []);

  // A bubble tapped on the page: its words light up in the list; hovering words lights their bubble.
  const showBubble = (b: number) => {
    setLit(b);
    const el = panelRef.current?.querySelector<HTMLElement>(`[data-b="${b}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.querySelectorAll('.is-lit').forEach((el) => el.classList.remove('is-lit'));
    if (lit !== null) panel.querySelector(`[data-b="${lit}"]`)?.classList.add('is-lit');
  }, [lit, chapter?.id]);
  const onHover = (e: ReactMouseEvent) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-b]')?.dataset.b;
    setLit(b === undefined ? null : Number(b));
  };

  const busy = status.state === 'busy';
  const words = boxes.length;
  return (
    <div
      className={cx('absolute inset-x-0 flex gap-4', wide ? 'flex-row px-[max(24px,calc((100vw-1400px)/2))]' : 'flex-col')}
      style={{ top: wide ? 76 : 'calc(env(safe-area-inset-top) + 52px)', bottom: wide ? 24 : 'env(safe-area-inset-bottom)' }}
    >
      <div className={cx('relative flex min-h-0 items-start justify-center', wide ? 'h-full flex-1' : 'h-[58%] shrink-0 px-3')}>
        {img?.t === 'img' ? (
          <ComicPage blobId={img.blobId} w={img.w} h={img.h} boxes={boxes} lit={lit} onBubble={showBubble} onTurn={onTurn} rtl={rtl} />
        ) : (
          <div className="grid size-full place-items-center">
            <LoaderCircle size={22} className="animate-spin text-ink-faint" aria-label={translateUi('Opening the page')} />
          </div>
        )}
      </div>

      <aside className={cx('flex min-h-0 flex-col', wide ? 'w-[min(420px,36vw)] shrink-0' : 'flex-1 border-t border-line/60 bg-bg')}>
        <div className={cx('flex items-center gap-2', wide ? 'pb-3' : 'px-5 pt-3 pb-1')}>
          <p className="min-w-0 flex-1 text-[12px] font-bold tracking-[0.14em] text-ink-faint uppercase tabular-nums"><UiText source={'Page {0} {1}{2}'} values={[index + 1, <span className="font-semibold opacity-70"><UiText source={'of {0}'} values={[text.chapterCount]} /></span>, ready && !busy && chapter?.readAt && <span className="font-semibold normal-case tracking-normal opacity-70"> · {words === 1 ? translateUi('1 bubble') : translateUi('{0} bubbles', [words])}</span>]} /></p>
          {ready && !busy && chapter?.readAt && (
            <button type="button" aria-label={translateUi('Read this page’s bubbles again')} title={translateUi('Read the bubbles again')} onClick={() => read(true)} className="grid size-9 place-items-center rounded-full text-ink-faint hover:bg-sunken hover:text-ink">
              <ScanText size={17} aria-hidden />
            </button>
          )}
          <button type="button" aria-label={rtl ? translateUi('Next page') : translateUi('Previous page')} onClick={() => onTurn(rtl ? 1 : -1)} className="grid size-9 place-items-center rounded-full text-ink-soft hover:bg-sunken hover:text-ink">
            <ChevronLeft size={19} aria-hidden />
          </button>
          <button type="button" aria-label={rtl ? translateUi('Previous page') : translateUi('Next page')} onClick={() => onTurn(rtl ? -1 : 1)} className="grid size-9 place-items-center rounded-full text-ink-soft hover:bg-sunken hover:text-ink">
            <ChevronRight size={19} aria-hidden />
          </button>
        </div>
        <div ref={panelRef} className={cx('min-h-0 flex-1 overflow-y-auto overscroll-contain', wide ? 'rounded-2xl border border-line/60 bg-surface px-5 py-4' : 'px-5 pb-6')} onMouseOver={onHover} onMouseLeave={() => setLit(null)}>
          {children}
          {busy && (
            <p className="flex items-center gap-2 py-4 text-[14px] text-ink-faint">
              <ScanText size={16} className="shrink-0 animate-pulse" aria-hidden />
              {status.step === 'loading' ? translateUi('Getting ready to read the bubbles (the first time, the language’s reading data downloads)…') : translateUi('Reading the bubbles… {0}%', [Math.round(status.fraction * 100)])}
            </p>
          )}
          {status.state === 'failed' && (
            <div className="py-4 text-[14px] text-ink-soft">
              <p><UiText source={'The bubbles couldn’t be read. {0}'} values={[status.message]} /></p>
              <Button size="sm" variant="secondary" icon={RefreshCw} className="mt-3" onClick={() => read(true)}><UiText source={'Try again'} /></Button>
            </div>
          )}
          {ready && !busy && status.state === 'idle' && chapter?.readAt && !words && (
            <div className="py-4 text-[14px] text-ink-soft">
              <p><UiText source={'No speech bubbles were found on this page.'} /></p>
              <button type="button" onClick={() => read(true)} className="mt-2 font-semibold text-ink underline underline-offset-2"><UiText source={'Read it again'} /></button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
