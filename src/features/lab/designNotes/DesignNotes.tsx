import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Check, ClipboardCopy, List, MousePointerClick, Move, PenLine, Trash2, X } from 'lucide-react';
import { getLanguage } from '@/core/lang/languages';
import { useActiveLanguage } from '@/data/languages';
import { useSettings } from '@/data/settings';
import { isEditable } from '@/design/hooks/useHotkeys';
import { Button } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { copyNotes } from './copy';
import { notesOn, roomFor, useDesignNotes } from './notes';
import type { DesignNote } from './notes';
import { cssPath, describe } from './selector';

/** Everything the tool draws carries this attribute, so picking never picks the tool itself. */
const MARK = 'data-design-notes';
const inTool = (target: EventTarget | null) => target instanceof Element && Boolean(target.closest(`[${MARK}]`));

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
type Editor = { kind: 'new'; rect: Rect; at: { x: number; y: number }; element: string; selector: string } | { kind: 'edit'; rect: Rect; note: DesignNote };

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

function lightNow(): string {
  const { theme, palette } = document.documentElement.dataset;
  const name = palette ? palette[0].toUpperCase() + palette.slice(1) : '';
  return `${theme === 'nocturne' ? 'Nocturne' : 'Paper'}${name ? `, ${name}` : ''}`;
}

/** A card beside the element when there's room, else below or above it, always inside the window. */
function cardPlace(rect: Rect, width = 320, height = 236): { left: number; top: number } {
  const gap = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = rect.x + rect.w + gap;
  let top = rect.y;
  if (left + width > vw - gap) {
    left = Math.min(Math.max(rect.x, gap), vw - width - gap);
    top = rect.y + rect.h + gap + height < vh ? rect.y + rect.h + gap : rect.y - height - gap;
  }
  return { left: Math.max(gap, left), top: Math.min(Math.max(gap, top), vh - height - gap) };
}

/**
 * Settings › Lab › Design notes (7-0b): Alt N (or Pick) outlines the element under the pointer; a click pins a note
 * to it instead of doing what it does. Pins follow their elements, moved by transform only. Notes stay on this
 * device and are copied for Claude as Markdown.
 */
export default function DesignNotes() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname + location.search;
  const language = useActiveLanguage();
  const settings = useSettings();
  // The first start lives at "/" too: its notes belong to it, not to Home.
  const room = settings?.meta.onboardedAt && language ? roomFor(path) : 'First start';
  const notes = useDesignNotes((s) => s.notes);
  const { add, update, remove, clearDone } = useDesignNotes.getState();
  const pageNotes = useMemo(() => notesOn(notes, path, room), [notes, path, room]);
  const [picking, setPicking] = useState(false);
  const [panel, setPanel] = useState<'page' | 'all' | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [shown, setShown] = useState<string | null>(null);
  const [corner, setCorner] = useState<Corner>(savedCorner);
  const place = CORNERS[corner];
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
  const pins = useRef(new Map<string, HTMLButtonElement>());

  const closeEditor = () => {
    setEditor(null);
    if (resume.current) {
      resume.current = false;
      setPicking(true);
    }
  };

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

  // Picking: the outline follows the pointer; the page's own presses and clicks are held back.
  useEffect(() => {
    if (!picking) return;
    let hovered: Element | null = null;
    let frame = 0;
    const draw = () => {
      frame = 0;
      const box = outline.current;
      const tag = label.current;
      if (!box || !tag) return;
      if (!hovered) {
        box.style.opacity = tag.style.opacity = '0';
        return;
      }
      const r = hovered.getBoundingClientRect();
      box.style.width = `${r.width}px`;
      box.style.height = `${r.height}px`;
      box.style.transform = `translate(${r.left}px, ${r.top}px)`;
      tag.textContent = describe(hovered);
      tag.style.transform = `translate(${Math.max(4, Math.min(r.left, window.innerWidth - 270))}px, ${r.top > 30 ? r.top - 28 : r.bottom + 6}px)`;
      box.style.opacity = tag.style.opacity = '1';
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const onMove = (e: PointerEvent) => {
      hovered = e.target instanceof Element && !inTool(e.target) ? e.target : null;
      schedule();
    };
    const hold = (e: Event) => {
      if (inTool(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
    };
    const onClick = (e: MouseEvent) => {
      if (inTool(e.target) || !(e.target instanceof Element)) return;
      hold(e);
      resume.current = true;
      setPicking(false);
      const rect = rectOf(e.target);
      const at = { x: rect.w ? (e.clientX - rect.x) / rect.w : 1, y: rect.h ? (e.clientY - rect.y) / rect.h : 0 };
      setEditor({ kind: 'new', rect, at, element: describe(e.target), selector: cssPath(e.target) });
    };
    const held = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'dblclick', 'auxclick', 'contextmenu'];
    document.addEventListener('pointermove', onMove, true);
    window.addEventListener('scroll', schedule, true);
    for (const type of held) document.addEventListener(type, hold, true);
    document.addEventListener('click', onClick, true);
    document.documentElement.setAttribute('data-design-picking', '');
    return () => {
      document.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('scroll', schedule, true);
      for (const type of held) document.removeEventListener(type, hold, true);
      document.removeEventListener('click', onClick, true);
      document.documentElement.removeAttribute('data-design-picking');
      cancelAnimationFrame(frame);
      if (outline.current) outline.current.style.opacity = '0';
      if (label.current) label.current.style.opacity = '0';
    };
  }, [picking]);

  // Pins sit on their elements' top right corners and follow them: on scroll, on resize, and now and then.
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
        pin.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
        pin.style.opacity = el && r.w === 0 && r.h === 0 ? '0' : '1';
        pin.dataset.lost = el ? 'false' : 'true';
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
    setEditor({ kind: 'edit', rect: el ? rectOf(el) : note.rect, note });
  };

  const save = (text: string) => {
    if (!editor) return;
    if (editor.kind === 'new') {
      add({
        path,
        room,
        selector: editor.selector,
        element: editor.element,
        text,
        rect: editor.rect,
        at: editor.at,
        window: { w: window.innerWidth, h: window.innerHeight },
        light: lightNow(),
        language: getLanguage(language?.id ?? '')?.name ?? '',
        version: __APP_VERSION__,
      });
    } else update(editor.note.id, { text });
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
      <div ref={label} className="pointer-events-none fixed top-0 left-0 z-[121] max-w-[260px] truncate rounded-md bg-inverse px-2 py-1 text-[11.5px] font-semibold text-on-inverse opacity-0 shadow-elev-2" aria-hidden />

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
          title={note.text}
          aria-label={`Design note ${i + 1}: ${note.text}`}
          className={cx(
            'fixed top-0 left-0 z-[120] grid size-[22px] place-items-center rounded-full border-2 text-[11px] font-bold tabular-nums shadow-elev-2 data-[lost=true]:border-dashed',
            note.done ? 'border-sage bg-sage-soft text-sage-text' : 'border-raised bg-accent-fill text-on-accent',
          )}
          style={{ transform: `translate(${Math.round(note.rect.x + note.rect.w * (note.at?.x ?? 1) - 11)}px, ${Math.round(note.rect.y + note.rect.h * (note.at?.y ?? 0) - 11)}px)` }}
        >
          {note.done ? <Check size={12} strokeWidth={3} aria-hidden /> : i + 1}
        </button>
      ))}

      {editor && <NoteCard key={editor.kind === 'edit' ? editor.note.id : editor.selector} editor={editor} path={path} room={room} onSave={save} onCancel={closeEditor} onDone={(id, done) => (update(id, { done }), closeEditor())} onDelete={(id) => (remove(id), closeEditor())} />}

      {panel && (
        <aside {...{ [MARK]: '' }} aria-label="Design notes" className={cx('fixed z-[120] flex w-[340px] flex-col', place.panel, 'overflow-hidden rounded-3xl border border-line bg-raised shadow-elev-3')}>
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
              <X size={16} aria-hidden />
            </button>
          </div>
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
                      <p className="truncate text-[12.5px] font-semibold">{note.element}</p>
                      {panel === 'all' && <p className="truncate text-[11.5px] text-ink-faint">{note.room} · {note.path}</p>}
                      <p className="mt-1 text-[13.5px] leading-snug whitespace-pre-wrap">{note.text}</p>
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
        <div {...{ [MARK]: '' }} role="dialog" aria-label="Design notes as Markdown" className={cx('fixed z-[122] w-[460px]', place.box, 'rounded-2xl border border-line bg-raised p-3 shadow-elev-3')}>
          <p className="mb-2 text-[12.5px] text-ink-soft">Select all (Ctrl A), copy, and paste into Claude.</p>
          <textarea readOnly autoFocus value={shown} rows={14} onFocus={(e) => e.currentTarget.select()} aria-label="Markdown" className="w-full resize-none rounded-xl border border-line bg-bg p-3 font-mono text-[11.5px] leading-relaxed" />
          <div className="mt-2 flex justify-end">
            <Button size="sm" variant="ghost" onClick={() => setShown(null)}>
              Close
            </Button>
          </div>
        </div>
      )}

      <div {...{ [MARK]: '' }} className={cx('fixed z-[120] flex items-center gap-0.5 rounded-full bg-inverse p-1 pl-3 text-on-inverse shadow-elev-3', place.bar)}>
        <PenLine size={14} aria-hidden />
        <span className="mr-1 ml-1 text-[12px] font-semibold tabular-nums opacity-80">{pageNotes.length} here</span>
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

function NoteCard({
  editor,
  path,
  room,
  onSave,
  onCancel,
  onDone,
  onDelete,
}: {
  editor: Editor;
  path: string;
  room: string;
  onSave: (text: string) => void;
  onCancel: () => void;
  onDone: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [text, setText] = useState(editor.kind === 'edit' ? editor.note.text : '');
  const place = cardPlace(editor.rect);
  const note = editor.kind === 'edit' ? editor.note : null;
  const save = () => text.trim() && onSave(text.trim());
  return (
    <div {...{ [MARK]: '' }} role="dialog" aria-label="Design note" className="fixed z-[121] w-80 rounded-2xl border border-line bg-raised p-3 shadow-elev-3" style={{ left: place.left, top: place.top }}>
      <p className="truncate text-[12.5px] font-semibold">{note ? note.element : editor.kind === 'new' ? editor.element : ''}</p>
      <p className="truncate text-[11.5px] text-ink-faint">
        {room} · {path}
      </p>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            save();
          }
        }}
        rows={4}
        placeholder="What should change here?"
        aria-label="Note"
        className="mt-2 w-full resize-none rounded-xl border border-line-strong bg-bg px-3 py-2 text-[14px] leading-snug outline-none placeholder:text-ink-faint focus:border-accent"
      />
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Button size="sm" onClick={save} disabled={!text.trim()}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        {note && (
          <>
            <Button size="sm" variant="ghost" icon={Check} onClick={() => onDone(note.id, !note.done)}>
              {note.done ? 'Open again' : 'Done'}
            </Button>
            <Button size="sm" variant="ghost" icon={Trash2} onClick={() => onDelete(note.id)}>
              Delete
            </Button>
          </>
        )}
        {!note && <span className="ml-auto text-[11px] text-ink-faint">Ctrl Enter saves</span>}
      </div>
    </div>
  );
}
