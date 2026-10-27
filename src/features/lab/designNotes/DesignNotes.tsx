import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Check, ClipboardCopy, List, MousePointerClick, Move, PenLine } from 'lucide-react';
import { getLanguage } from '@/core/lang/languages';
import { useActiveLanguage } from '@/data/languages';
import { useSettings } from '@/data/settings';
import { isEditable } from '@/design/hooks/useHotkeys';
import { Button } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { useDevLab } from '../devLab';
import { copyNotes } from './copy';
import { climb } from './inspect';
import { NoteCard } from './NoteCard';
import type { Editor, Rect, Saved } from './NoteCard';
import { notesOn, priorityCount, roomFor, useDesignNotes } from './notes';
import type { DesignNote } from './notes';
import { describe } from './selector';

/** Everything the tool draws carries this attribute, so picking never picks the tool itself. */
const MARK = 'data-design-notes';
const inTool = (target: EventTarget | null) => target instanceof Element && Boolean(target.closest(`[${MARK}]`));

/** The bar's corner, the panel's side and the Markdown box's place: the mini player and downloads use corners too. */
const CORNERS = {
  br: { bar: 'right-4 bottom-4', panel: 'right-4 top-4 bottom-16', box: 'right-4 bottom-16' },
  bl: { bar: 'left-4 bottom-4', panel: 'left-4 top-4 bottom-16', box: 'left-4 bottom-16' },
  tl: { bar: 'left-4 top-4', panel: 'left-4 top-16 bottom-4', box: 'left-4 top-16' },
  tr: { bar: 'right-4 top-4', panel: 'right-4 top-16 bottom-4', box: 'right-4 top-16' },
} as const;
type Corner = keyof typeof CORNERS;
const CORNER_KEY = 'lingua.designNotes.corner';
function savedCorner(): Corner {
  try {
    const value = localStorage.getItem(CORNER_KEY);
    return value && value in CORNERS ? (value as Corner) : 'br';
  } catch {
    return 'br';
  }
}

const rectOf = (el: Element): Rect => {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
};

/** The element a note was pinned to, if it is still on the page. */
function find(note: DesignNote): Element | null {
  try {
    const el = document.querySelector(note.selector);
    return el && !inTool(el) ? el : null;
  } catch {
    return null;
  }
}

/** The smallest element (not the tool's) holding the whole rectangle: an area is kept relative to it. */
function around(box: Rect): Element {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  let el: Element | null = document.elementsFromPoint(cx, cy).find((e) => !inTool(e)) ?? null;
  while (el && el.tagName !== 'BODY') {
    const r = el.getBoundingClientRect();
    if (r.left <= box.x + 1 && r.top <= box.y + 1 && r.right >= box.x + box.w - 1 && r.bottom >= box.y + box.h - 1) return el;
    el = el.parentElement;
  }
  return document.querySelector('main') ?? document.body;
}

function lightNow(): string {
  const { theme, palette } = document.documentElement.dataset;
  const name = palette ? palette[0].toUpperCase() + palette.slice(1) : '';
  return `${theme === 'nocturne' ? 'Nocturne' : 'Paper'}${name ? `, ${name}` : ''}`;
}

const place = (box: HTMLElement, r: Rect) => {
  box.style.width = `${r.w}px`;
  box.style.height = `${r.h}px`;
  box.style.transform = `translate(${r.x}px, ${r.y}px)`;
};

/**
 * Settings › Lab › Design notes (7-0b, 7-0c): Alt N (or Pick) outlines the element under the pointer; ↑ and ↓ choose
 * the element around or inside it; a click pins a note to it instead of doing what it does; Shift and drag marks an
 * area. Pins and areas follow their elements, moved by transform only. Notes stay on this device and are copied for
 * Claude as Markdown.
 */
export default function DesignNotes() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname + location.search;
  const language = useActiveLanguage();
  const settings = useSettings();
  const replaying = useDevLab((s) => s.replay !== null);
  // The first start lives at "/" too: its notes belong to it, not to Home (also while the Lab replays it).
  const room = settings?.meta.onboardedAt && language && !replaying ? roomFor(path) : 'First start';
  const notes = useDesignNotes((s) => s.notes);
  const { add, update, remove, clearDone } = useDesignNotes.getState();
  const pageNotes = useMemo(() => notesOn(notes, path, room), [notes, path, room]);
  const [picking, setPicking] = useState(false);
  const [panel, setPanel] = useState<'page' | 'all' | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [shown, setShown] = useState<string | null>(null);
  const [corner, setCorner] = useState<Corner>(savedCorner);
  const [chosen, setChosen] = useState<{ el: Element; area?: Rect } | null>(null);
  const corners = CORNERS[corner];
  const moveCorner = () => {
    const order = Object.keys(CORNERS) as Corner[];
    const next = order[(order.indexOf(corner) + 1) % order.length];
    setCorner(next);
    try {
      localStorage.setItem(CORNER_KEY, next);
    } catch {
      // Not remembered this time.
    }
  };
  const copy = async (list: DesignNote[]) => setShown(await copyNotes(list));
  const resume = useRef(false);
  const outline = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLDivElement>(null);
  const areaBox = useRef<HTMLDivElement>(null);
  const pins = useRef(new Map<string, HTMLButtonElement>());
  const areas = useRef(new Map<string, HTMLDivElement>());

  const closeEditor = () => {
    setEditor(null);
    if (resume.current) {
      resume.current = false;
      setPicking(true);
    }
  };
  const onElement = useCallback((el: Element | null, area?: Rect) => setChosen(el ? { el, area } : null), []);

  // Alt N picks (by the physical key, so any layout and a Mac's Option work), even from a text field, except on a
  // Mac, where Option N types the tilde of ñ. Esc closes one thing at a time.
  useEffect(() => {
    const mac = /mac/i.test(navigator.platform);
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyN' && !(mac && isEditable(e.target)) && !inTool(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        resume.current = false;
        setEditor(null);
        setPicking((on) => !on);
        return;
      }
      if (e.key !== 'Escape') return;
      if (editor) closeEditor();
      else if (shown) setShown(null);
      else if (picking) setPicking(false);
      else if (panel) setPanel(null);
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  // Picking: the outline follows the pointer, ↑ and ↓ move it out and in; Shift and drag draws an area. The page's
  // own presses and clicks are held back.
  useEffect(() => {
    if (!picking) return;
    let pointed: Element | null = null;
    let chain: { trail: Element[]; level: number } = { trail: [], level: 0 };
    let point = { x: 0, y: 0 };
    let drag: { x: number; y: number; box: Rect } | null = null;
    let swallowClick = false;
    let frame = 0;
    const current = () => chain.trail[chain.level] ?? null;
    const draw = () => {
      frame = 0;
      const box = outline.current;
      const tag = label.current;
      const dashed = areaBox.current;
      if (!box || !tag || !dashed) return;
      dashed.style.opacity = drag && drag.box.w > 2 ? '1' : '0';
      if (drag) place(dashed, drag.box);
      const el = current();
      if (!el || drag) {
        box.style.opacity = tag.style.opacity = '0';
        return;
      }
      const r = el.getBoundingClientRect();
      place(box, { x: r.left, y: r.top, w: r.width, h: r.height });
      tag.textContent = `${describe(el)} · ${Math.round(r.width)} × ${Math.round(r.height)}${chain.level ? ` · ↑${chain.level}` : ''}`;
      tag.style.transform = `translate(${Math.max(4, Math.min(r.left, window.innerWidth - 330))}px, ${r.top > 30 ? r.top - 28 : r.bottom + 6}px)`;
      box.style.opacity = tag.style.opacity = '1';
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const onMove = (e: PointerEvent) => {
      point = { x: e.clientX, y: e.clientY };
      if (drag) {
        drag.box = { x: Math.min(drag.x, e.clientX), y: Math.min(drag.y, e.clientY), w: Math.abs(e.clientX - drag.x), h: Math.abs(e.clientY - drag.y) };
        schedule();
        return;
      }
      const target = e.target instanceof Element && !inTool(e.target) ? e.target : null;
      if (target !== pointed) {
        pointed = target;
        chain = { trail: target ? [target] : [], level: 0 };
      }
      schedule();
    };
    const hold = (e: Event) => {
      if (inTool(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
    };
    const onDown = (e: PointerEvent) => {
      if (inTool(e.target)) return;
      hold(e);
      if (e.shiftKey && e.button === 0) drag = { x: e.clientX, y: e.clientY, box: { x: e.clientX, y: e.clientY, w: 0, h: 0 } };
    };
    const open = (editor: Editor) => {
      resume.current = true;
      setPicking(false);
      setEditor(editor);
    };
    const onUp = (e: PointerEvent) => {
      if (inTool(e.target)) return;
      hold(e);
      if (!drag) return;
      const box = drag.box;
      drag = null;
      schedule();
      if (box.w < 6 || box.h < 6) return;
      swallowClick = true;
      const el = around(box);
      const r = rectOf(el);
      const area = { x: (box.x - r.x) / (r.w || 1), y: (box.y - r.y) / (r.h || 1), w: box.w / (r.w || 1), h: box.h / (r.h || 1) };
      open({ kind: 'new', rect: box, trail: [el], level: 0, at: { x: area.x + area.w, y: area.y }, area });
    };
    const onClick = (e: MouseEvent) => {
      if (inTool(e.target) || !(e.target instanceof Element)) return;
      hold(e);
      if (swallowClick) {
        swallowClick = false;
        return;
      }
      const el = current() ?? e.target;
      const rect = rectOf(el);
      const at = { x: rect.w ? (e.clientX - rect.x) / rect.w : 1, y: rect.h ? (e.clientY - rect.y) / rect.h : 0 };
      open({ kind: 'new', rect, trail: chain.trail.length ? chain.trail : [el], level: chain.trail.length ? chain.level : 0, at });
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.key !== 'ArrowUp' && e.key !== 'ArrowDown') || isEditable(e.target) || !chain.trail.length) return;
      e.preventDefault();
      e.stopPropagation();
      chain = climb(chain.trail, chain.level, e.key === 'ArrowUp' ? 'up' : 'down', point) ?? chain;
      schedule();
    };
    const held = ['mousedown', 'mouseup', 'dblclick', 'auxclick', 'contextmenu'];
    document.addEventListener('pointermove', onMove, true);
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('pointerup', onUp, true);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', schedule, true);
    for (const type of held) document.addEventListener(type, hold, true);
    document.addEventListener('click', onClick, true);
    document.documentElement.setAttribute('data-design-picking', '');
    return () => {
      document.removeEventListener('pointermove', onMove, true);
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', schedule, true);
      for (const type of held) document.removeEventListener(type, hold, true);
      document.removeEventListener('click', onClick, true);
      document.documentElement.removeAttribute('data-design-picking');
      cancelAnimationFrame(frame);
      for (const ref of [outline, label, areaBox]) if (ref.current) ref.current.style.opacity = '0';
    };
  }, [picking]);

  // While a card is open its element stays outlined (and its area dashed), following the page.
  useEffect(() => {
    if (!chosen) return;
    let frame = 0;
    const draw = () => {
      frame = 0;
      const box = outline.current;
      const dashed = areaBox.current;
      if (!box || !dashed) return;
      const r = rectOf(chosen.el);
      place(box, r);
      box.style.opacity = '1';
      if (chosen.area) {
        place(dashed, { x: r.x + chosen.area.x * r.w, y: r.y + chosen.area.y * r.h, w: chosen.area.w * r.w, h: chosen.area.h * r.h });
        dashed.style.opacity = '1';
      } else dashed.style.opacity = '0';
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    draw();
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    const timer = window.setInterval(schedule, 300);
    return () => {
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      window.clearInterval(timer);
      cancelAnimationFrame(frame);
      if (outline.current) outline.current.style.opacity = '0';
      if (areaBox.current) areaBox.current.style.opacity = '0';
    };
  }, [chosen]);

  // Pins sit where they were clicked (an area's at its top right corner) and follow their elements, as do the areas:
  // on scroll, on resize, and now and then.
  useEffect(() => {
    if (!pageNotes.length) return;
    let frame = 0;
    const placePins = () => {
      frame = 0;
      for (const note of pageNotes) {
        const pin = pins.current.get(note.id);
        if (!pin) continue;
        const el = find(note);
        const r = el ? rectOf(el) : note.rect;
        const at = note.at ?? { x: 1, y: 0 };
        const x = Math.min(Math.max(r.x + r.w * at.x - 11, 4), window.innerWidth - 26);
        const y = Math.min(Math.max(r.y + r.h * at.y - 11, 4), window.innerHeight - 26);
        const hidden = Boolean(el) && r.w === 0 && r.h === 0;
        pin.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
        pin.style.opacity = hidden ? '0' : '1';
        pin.dataset.lost = el ? 'false' : 'true';
        const box = areas.current.get(note.id);
        if (box && note.area) {
          place(box, { x: r.x + note.area.x * r.w, y: r.y + note.area.y * r.h, w: note.area.w * r.w, h: note.area.h * r.h });
          box.style.opacity = hidden || !el ? '0' : '1';
        }
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(placePins);
    };
    placePins();
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    const timer = window.setInterval(schedule, 700);
    return () => {
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
      window.clearInterval(timer);
      cancelAnimationFrame(frame);
    };
  }, [pageNotes]);

  const openNote = (note: DesignNote) => {
    const el = find(note);
    resume.current = false;
    setPicking(false);
    setEditor({ kind: 'edit', rect: el ? rectOf(el) : note.rect, trail: el ? [el] : [], level: 0, note });
  };

  const save = (saved: Saved) => {
    if (!editor) return;
    if (editor.kind === 'new') {
      add({
        ...saved,
        path,
        room,
        window: { w: window.innerWidth, h: window.innerHeight },
        light: lightNow(),
        language: getLanguage(language?.id ?? '')?.name ?? '',
        version: __APP_VERSION__,
      });
    } else update(editor.note.id, saved);
    closeEditor();
  };

  const listed = panel === 'all' ? [...notes].sort((a, b) => (a.path === b.path ? a.createdAt - b.createdAt : a.path.localeCompare(b.path))) : pageNotes;
  const pill = 'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold transition-colors';

  return (
    <>
      {picking && (
        <style>{`[data-design-picking] *{cursor:crosshair!important}[data-design-picking] [${MARK}],[data-design-picking] [${MARK}] *{cursor:default!important}`}</style>
      )}
      <div ref={outline} className="pointer-events-none fixed top-0 left-0 z-[119] rounded-md border-2 border-accent bg-accent/5 opacity-0" aria-hidden />
      <div ref={areaBox} className="pointer-events-none fixed top-0 left-0 z-[119] rounded-sm border-2 border-dashed border-accent bg-accent/10 opacity-0" aria-hidden />
      <div ref={label} className="pointer-events-none fixed top-0 left-0 z-[121] max-w-[320px] truncate rounded-md bg-inverse px-2 py-1 text-[11.5px] font-semibold text-on-inverse opacity-0 shadow-elev-2" aria-hidden />

      {pageNotes
        .filter((note) => note.area)
        .map((note) => (
          <div
            key={note.id}
            ref={(el) => {
              if (el) areas.current.set(note.id, el);
              else areas.current.delete(note.id);
            }}
            aria-hidden
            className={cx('pointer-events-none fixed top-0 left-0 z-[118] rounded-sm border-[1.5px] border-dashed opacity-0', note.done ? 'border-sage' : 'border-accent bg-accent/5')}
          />
        ))}

      {pageNotes.map((note, i) => (
        <button
          key={note.id}
          type="button"
          {...{ [MARK]: '' }}
          ref={(el) => {
            if (el) pins.current.set(note.id, el);
            else pins.current.delete(note.id);
          }}
          onClick={() => openNote(note)}
          title={[note.priority, note.kinds?.join(', '), note.text].filter(Boolean).join(' · ')}
          aria-label={`Design note ${i + 1}: ${note.text}`}
          className={cx(
            'fixed top-0 left-0 z-[120] grid size-[22px] place-items-center rounded-full border-2 text-[11px] font-bold tabular-nums shadow-elev-2 data-[lost=true]:border-dashed',
            note.done ? 'border-sage bg-sage-soft text-sage-text' : note.priority === 'Could' ? 'border-raised bg-sage text-on-accent' : 'border-raised bg-accent-fill text-on-accent',
            !note.done && note.priority === 'Must' && 'ring-2 ring-accent/40',
          )}
          style={{ transform: `translate(${Math.round(note.rect.x + note.rect.w * (note.at?.x ?? 1) - 11)}px, ${Math.round(note.rect.y + note.rect.h * (note.at?.y ?? 0) - 11)}px)` }}
        >
          {note.done ? <Check size={12} strokeWidth={3} aria-hidden /> : i + 1}
        </button>
      ))}

      {editor && (
        <NoteCard
          key={editor.kind === 'edit' ? editor.note.id : `${editor.rect.x},${editor.rect.y},${editor.rect.w}`}
          editor={editor}
          path={path}
          room={room}
          onElement={onElement}
          onSave={save}
          onCancel={closeEditor}
          onDone={(id, done) => (update(id, { done }), closeEditor())}
          onDelete={(id) => (remove(id), closeEditor())}
        />
      )}

      {panel && (
        <aside {...{ [MARK]: '' }} aria-label="Design notes" className={cx('fixed z-[120] flex w-[340px] flex-col', corners.panel, 'overflow-hidden rounded-3xl border border-line bg-raised shadow-elev-3')}>
          <div className="flex items-center gap-2 border-b border-line px-4 pt-3 pb-2">
            <h2 className="font-serif text-[17px] font-semibold">Design notes</h2>
            <div className="ml-auto flex rounded-full bg-surface p-0.5 text-[12px] font-semibold">
              {(['page', 'all'] as const).map((scope) => (
                <button key={scope} type="button" onClick={() => setPanel(scope)} className={cx('rounded-full px-2.5 py-1', panel === scope ? 'bg-raised shadow-elev-1' : 'text-ink-soft hover:text-ink')}>
                  {scope === 'page' ? 'This page' : `All (${notes.length})`}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setPanel(null)} aria-label="Close" className="grid size-7 place-items-center rounded-lg text-ink-faint hover:bg-surface hover:text-ink">
              <span aria-hidden>×</span>
            </button>
          </div>
          {listed.length > 0 && <p className="border-b border-line px-4 py-1.5 text-[11.5px] text-ink-faint">Open: {priorityCount(listed)}</p>}
          <ol className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3">
            {!listed.length && <li className="px-2 py-8 text-center text-[13.5px] text-ink-soft">{panel === 'page' ? 'No notes on this page yet. Press Alt N, then click anything.' : 'No notes yet.'}</li>}
            {listed.map((note) => {
              const here = note.path === path;
              const number = notesOn(notes, note.path, note.room).indexOf(note) + 1;
              return (
                <li key={note.id} className={cx('rounded-2xl border border-line bg-bg px-3 py-2.5', note.done && 'opacity-60')}>
                  <div className="flex items-start gap-2">
                    <span className={cx('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[10.5px] font-bold', note.done ? 'bg-sage-soft text-sage-text' : 'bg-accent-fill text-on-accent')}>{number}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-semibold">
                        {note.area && <span className="mr-1 text-accent-text">Area in</span>}
                        {note.element}
                      </p>
                      {panel === 'all' && <p className="truncate text-[11.5px] text-ink-faint">{note.room} · {note.path}</p>}
                      {(note.priority || note.kinds?.length) && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {note.priority && <span className={cx('rounded-full px-1.5 py-px text-[10.5px] font-bold', note.priority === 'Must' ? 'bg-accent-fill text-on-accent' : note.priority === 'Should' ? 'bg-accent-soft text-accent-text' : 'bg-sage-soft text-sage-text')}>{note.priority}</span>}
                          {note.kinds?.map((k) => (
                            <span key={k} className="rounded-full border border-line px-1.5 py-px text-[10.5px] font-semibold text-ink-soft">
                              {k}
                            </span>
                          ))}
                        </div>
                      )}
                      {note.text && <p className="mt-1 text-[13.5px] leading-snug whitespace-pre-wrap">{note.text}</p>}
                      {note.words && <p className="mt-1 text-[12px] text-ink-soft">“{note.words.from}” → “{note.words.to}”</p>}
                      {note.tweaks?.map((t) => (
                        <p key={t.prop} className="mt-0.5 font-mono text-[11.5px] text-ink-soft">
                          {t.prop}: {t.now.replace(/`/g, '')} → {t.want}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1 pl-7 text-[12px] font-semibold">
                    <button type="button" onClick={() => (here ? openNote(note) : navigate(note.path))} className="rounded-lg px-2 py-1 text-accent-text hover:bg-accent-soft">
                      {here ? 'Edit' : 'Go there'}
                    </button>
                    <button type="button" onClick={() => update(note.id, { done: !note.done })} className="rounded-lg px-2 py-1 text-ink-soft hover:bg-surface hover:text-ink">
                      {note.done ? 'Open again' : 'Done'}
                    </button>
                    <button type="button" onClick={() => remove(note.id)} className="ml-auto rounded-lg px-2 py-1 text-ink-faint hover:bg-surface hover:text-ink">
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="flex items-center gap-2 border-t border-line px-3 py-2.5">
            <Button size="sm" icon={ClipboardCopy} onClick={() => void copy(listed)} disabled={!listed.length}>
              Copy for Claude
            </Button>
            <Button size="sm" variant="ghost" onClick={clearDone} disabled={!notes.some((n) => n.done)}>
              Clear done
            </Button>
          </div>
        </aside>
      )}

      {shown && (
        <div {...{ [MARK]: '' }} role="dialog" aria-label="Design notes as Markdown" className={cx('fixed z-[122] w-[460px]', corners.box, 'rounded-2xl border border-line bg-raised p-3 shadow-elev-3')}>
          <p className="mb-2 text-[12.5px] text-ink-soft">Select all (Ctrl A), copy, and paste into Claude.</p>
          <textarea readOnly autoFocus value={shown} rows={14} onFocus={(e) => e.currentTarget.select()} aria-label="Markdown" className="w-full resize-none rounded-xl border border-line bg-bg p-3 font-mono text-[11.5px] leading-relaxed" />
          <div className="mt-2 flex justify-end">
            <Button size="sm" variant="ghost" onClick={() => setShown(null)}>
              Close
            </Button>
          </div>
        </div>
      )}

      <div {...{ [MARK]: '' }} className={cx('fixed z-[120] flex items-center gap-0.5 rounded-full bg-inverse p-1 pl-3 text-on-inverse shadow-elev-3', corners.bar)}>
        <PenLine size={14} aria-hidden />
        <span className="mr-1 ml-1 text-[12px] font-semibold tabular-nums opacity-80">{pageNotes.length} here</span>
        {picking && <span className="mr-1 text-[11.5px] opacity-70">↑ ↓ around or inside · Shift drag an area</span>}
        <button type="button" aria-pressed={picking} onClick={() => setPicking((on) => !on)} title="Pick an element to note (Alt N)" className={cx(pill, picking ? 'bg-accent-fill text-on-accent' : 'hover:bg-on-inverse/10')}>
          <MousePointerClick size={15} aria-hidden /> Pick <kbd className="font-sans text-[10.5px] opacity-70">Alt N</kbd>
        </button>
        <button type="button" aria-pressed={panel !== null} onClick={() => setPanel((p) => (p ? null : 'page'))} className={cx(pill, panel ? 'bg-on-inverse/15' : 'hover:bg-on-inverse/10')}>
          <List size={15} aria-hidden /> Notes
        </button>
        <button type="button" onClick={() => void copy(notes)} title="Copy every note as Markdown for Claude" className={cx(pill, 'hover:bg-on-inverse/10')}>
          <ClipboardCopy size={15} aria-hidden /> Copy
        </button>
        <button type="button" onClick={moveCorner} title="Move to another corner" aria-label="Move the bar to another corner" className="grid size-8 place-items-center rounded-full opacity-70 transition-colors hover:bg-on-inverse/10 hover:opacity-100">
          <Move size={14} aria-hidden />
        </button>
      </div>
    </>
  );
}
