import { UiText, useUi } from '@/design/i18n/UiText';
import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Eye, Minimize2, Maximize2, Plus, Sliders, FileText, Trash2, X } from 'lucide-react';
import { Button } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { climb, factsOf, moveFractions, preview, TWEAKS, valueNow, wordsOf } from './inspect';
import { StyleInspector } from './StyleInspector';
import { KINDS, PRIORITIES } from './notes';
import type { DesignNote, ElementFacts, NoteKind, NotePatch, Priority, Tweak } from './notes';
import { cssPath, describe } from './selector';

const MARK = 'data-design-notes';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
type Fractions = { x: number; y: number; w: number; h: number };

/** A note being written: a new one from a pick or a drawn area, or one already pinned. */
export type Editor =
  | { kind: 'new'; rect: Rect; trail: Element[]; level: number; at: { x: number; y: number }; area?: Fractions }
  | { kind: 'edit'; rect: Rect; trail: Element[]; level: number; note: DesignNote };

/** What a saved card gives back: the patch, and for a new note where its pin sits. */
export type Saved = NotePatch & { text: string; selector: string; element: string; rect: Rect };

const rectOf = (el: Element): Rect => {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
};

/** A card beside the element when there's room, else below or above it, always inside the window. */
function cardPlace(rect: Rect, width: number, height: number): { left: number; top: number } {
  const gap = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = rect.x + rect.w + gap;
  let top = rect.y;
  if (left + width > vw - gap) {
    left = rect.x - width - gap;
    if (left < gap) {
      left = Math.min(Math.max(rect.x, gap), vw - width - gap);
      top = rect.y + rect.h + gap + height < vh ? rect.y + rect.h + gap : rect.y - height - gap;
    }
  }
  return { left: Math.max(gap, left), top: Math.min(Math.max(gap, top), vh - height - gap) };
}

const chip = 'rounded-full border px-2.5 py-1 text-[12px] font-semibold transition-colors';
const label = 'text-[11px] font-bold tracking-[0.08em] text-ink-faint uppercase';

/**
 * The note card (7-0b, more in 7-0c): the kind of change and how much it matters, the note, new words, tweaks with a
 * live preview, and what the element is. Bigger and Smaller choose the element around or inside; the chosen one stays
 * outlined (the parent draws it from `onElement`).
 */
export function NoteCard({
  editor,
  path,
  room,
  onElement,
  onSave,
  onCancel,
  onDone,
  onDelete,
}: {
  editor: Editor;
  path: string;
  room: string;
  onElement: (el: Element | null, area?: Fractions, showBoxModel?: boolean) => void;
  onSave: (saved: Saved) => void;
  onCancel: () => void;
  onDone: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const translateUi = useUi();
  const note = editor.kind === 'edit' ? editor.note : null;
  const [chain, setChain] = useState({ trail: editor.trail, level: editor.level });
  const el = chain.trail[chain.level] ?? null;
  const [tab, setTab] = useState<'inspect' | 'note'>(el ? 'inspect' : 'note');
  const [showBoxModel, setShowBoxModel] = useState(false);
  const [area, setArea] = useState<Fractions | undefined>(editor.kind === 'new' ? editor.area : editor.note.area);
  const [at, setAt] = useState(editor.kind === 'new' ? editor.at : (editor.note.at ?? { x: 1, y: 0 }));
  const [text, setText] = useState(note?.text ?? '');
  const [kinds, setKinds] = useState<NoteKind[]>(note?.kinds ?? []);
  const [priority, setPriority] = useState<Priority | undefined>(note?.priority);
  const original = useMemo(() => note?.words?.from ?? (el ? wordsOf(el) : null), [note, el]);
  const [words, setWords] = useState<string | null>(note?.words?.to ?? null);
  const [tweaks, setTweaks] = useState<Tweak[]>(note?.tweaks ?? []);
  const [previewing, setPreviewing] = useState(false);
  const [place] = useState(() => cardPlace(editor.rect, 380, Math.min(620, window.innerHeight - 24)));

  // The page draws the chosen element's outline (and the area and box model) while the card is open.
  useEffect(() => onElement(el, area, showBoxModel), [el, area, showBoxModel, onElement]);
  useEffect(() => () => onElement(null), [onElement]);

  // Preview: the wanted values on the element, until it is turned off, the element changes, or the card closes.
  useEffect(() => {
    if (!previewing || !el) return;
    return preview(el, tweaks);
  }, [previewing, el, tweaks]);

  // What the element is, read with no preview on it (the preview effect runs after this).
  const facts: ElementFacts | null = useMemo(() => (el ? factsOf(el) : (note?.facts ?? null)), [el, note]);
  const name = el ? describe(el) : (note?.element ?? '');

  const move = (dir: 'up' | 'down') => {
    if (!el) return;
    const next = climb(chain.trail, chain.level, dir);
    if (!next) return;
    const target = next.trail[next.level];
    const from = el.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    if (area) setArea(moveFractions(area, from, to));
    const spot = moveFractions({ ...at, w: 0, h: 0 }, from, to);
    setAt({ x: spot.x, y: spot.y });
    setTweaks((list) => list.map((t) => ({ ...t, now: valueNow(target, t.prop) })));
    setChain(next);
  };

  const addTweak = (prop: string) => {
    if (!prop || tweaks.some((t) => t.prop === prop)) return;
    setTweaks((list) => [...list, { prop, now: el ? valueNow(el, prop) : '', want: '' }]);
  };

  const handleTweakChange = (prop: string, want: string) => {
    setTweaks((list) => {
      const idx = list.findIndex((t) => t.prop === prop);
      if (idx >= 0) {
        if (!want.trim()) return list.filter((_, i) => i !== idx);
        return list.map((t, i) => (i === idx ? { ...t, want } : t));
      }
      if (!want.trim()) return list;
      return [...list, { prop, now: el ? valueNow(el, prop) : '', want }];
    });
  };

  const wordsChanged = original !== null && words !== null && words.trim() !== original.trim();
  const usefulTweaks = tweaks.filter((t) => t.want.trim());
  const canSave = Boolean(text.trim() || wordsChanged || usefulTweaks.length || kinds.length);

  const save = () => {
    if (!canSave) return;
    const selector = el ? cssPath(el) || 'body' : (note?.selector ?? 'body');
    onSave({
      text: text.trim(),
      kinds,
      priority,
      words: wordsChanged ? { from: original!, to: words!.trim() } : undefined,
      tweaks: usefulTweaks,
      selector,
      element: name,
      rect: el ? rectOf(el) : editor.rect,
      facts: facts ?? undefined,
      area,
      at,
    });
  };

  return (
    <div
      {...{ [MARK]: '' }}
      role="dialog"
      aria-label={translateUi('Design note')}
      className="fixed z-[121] flex w-[380px] flex-col overflow-hidden rounded-2xl border border-line bg-raised shadow-elev-3"
      style={{ left: place.left, top: place.top, maxHeight: Math.min(620, window.innerHeight - 24) }}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          save();
        }
      }}
    >
      <div className="flex items-start gap-2 border-b border-line px-3 pt-3 pb-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-semibold">
            {area && <span className="mr-1 rounded bg-accent-soft px-1 text-[11px] text-accent-text"><UiText source={'Area in'} /></span>}
            {name || translateUi('Element')}
          </p>
          <p className="truncate text-[11.5px] text-ink-faint">
            {el ? `${facts?.size} · ` : translateUi('Not on this page now · ')}
            {room} · {path}
          </p>
        </div>
        <div className="flex shrink-0 gap-0.5">
          <button type="button" onClick={() => move('up')} disabled={!el} title={translateUi('The element around this one (↑ while picking)')} className="grid size-7 place-items-center rounded-lg text-ink-soft hover:bg-surface hover:text-ink disabled:opacity-40">
            <Maximize2 size={14} aria-hidden />
            <span className="sr-only"><UiText source={'Bigger'} /></span>
          </button>
          <button type="button" onClick={() => move('down')} disabled={!el} title={translateUi('An element inside this one (↓ while picking)')} className="grid size-7 place-items-center rounded-lg text-ink-soft hover:bg-surface hover:text-ink disabled:opacity-40">
            <Minimize2 size={14} aria-hidden />
            <span className="sr-only"><UiText source={'Smaller'} /></span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      {el && (
        <div className="flex border-b border-line bg-surface/50 p-1">
          <button
            type="button"
            onClick={() => setTab('inspect')}
            className={cx(
              'flex-1 flex items-center justify-center gap-1.5 py-1 text-[12px] font-semibold rounded-lg transition-colors',
              tab === 'inspect' ? 'bg-raised text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
            )}
          >
            <Sliders size={13} aria-hidden />
            <span><UiText source={"Inspect & Test"} /></span>
          </button>
          <button
            type="button"
            onClick={() => setTab('note')}
            className={cx(
              'flex-1 flex items-center justify-center gap-1.5 py-1 text-[12px] font-semibold rounded-lg transition-colors',
              tab === 'note' ? 'bg-raised text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
            )}
          >
            <FileText size={13} aria-hidden />
            <span><UiText source={"Note"} /> {usefulTweaks.length ? `(${usefulTweaks.length})` : ''}</span>
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-3">
        {tab === 'inspect' && el ? (
          <StyleInspector
            el={el}
            onTweakChange={handleTweakChange}
            onResetAll={() => setTweaks([])}
            showBoxModel={showBoxModel}
            onToggleBoxModel={setShowBoxModel}
            currentTweaks={tweaks}
          />
        ) : (
          <>
            <div>
              <p className={label}><UiText source={'Kind'} /></p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {KINDS.map((k) => {
                  const on = kinds.includes(k);
                  return (
                    <button key={k} type="button" aria-pressed={on} onClick={() => setKinds((list) => (on ? list.filter((x) => x !== k) : [...list, k]))} className={cx(chip, on ? 'border-accent bg-accent-soft text-accent-text' : 'border-line text-ink-soft hover:border-line-strong hover:text-ink')}>
                      {k}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className={label}><UiText source={'Priority'} /></p>
              <div className="mt-1.5 flex gap-1">
                {PRIORITIES.map((p) => {
                  const on = priority === p;
                  return (
                    <button key={p} type="button" aria-pressed={on} onClick={() => setPriority(on ? undefined : p)} className={cx(chip, 'min-w-16', on ? (p === 'Must' ? 'border-accent bg-accent-fill text-on-accent' : p === 'Should' ? 'border-accent bg-accent-soft text-accent-text' : 'border-sage bg-sage-soft text-sage-text') : 'border-line text-ink-soft hover:border-line-strong hover:text-ink')}>
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder={translateUi('What should change here?')}
              aria-label={translateUi('Note')}
              className="w-full resize-y rounded-xl border border-line-strong bg-bg px-3 py-2 text-[14px] leading-snug outline-none placeholder:text-ink-faint focus:border-accent"
            />

            {original !== null && (
              <div>
                <div className="flex items-center justify-between">
                  <p className={label}><UiText source={'Words'} /></p>
                  {words === null ? (
                    <button type="button" onClick={() => setWords(original)} className="text-[12px] font-semibold text-accent-text hover:underline"><UiText source={'Edit the words'} /></button>
                  ) : (
                    <button type="button" onClick={() => setWords(null)} className="text-[12px] font-semibold text-ink-faint hover:text-ink"><UiText source={'Keep them'} /></button>
                  )}
                </div>
                {words !== null && (
                  <>
                    <p className="mt-1 line-clamp-2 text-[12px] text-ink-faint"><UiText source={'Now: “{0}”'} values={[original]} /></p>
                    <textarea value={words} onChange={(e) => setWords(e.target.value)} rows={2} aria-label={translateUi('New words')} className="mt-1 w-full resize-y rounded-xl border border-line-strong bg-bg px-3 py-2 text-[13.5px] leading-snug outline-none focus:border-accent" />
                  </>
                )}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between gap-2">
                <p className={label}><UiText source={'Tweaks'} /></p>
                {tweaks.length > 0 && el && (
                  <button type="button" aria-pressed={previewing} onClick={() => setPreviewing((on) => !on)} className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold', previewing ? 'bg-accent-fill text-on-accent' : 'text-accent-text hover:bg-accent-soft')}><UiText source={'{0} Preview'} values={[<Eye size={13} aria-hidden />]} /></button>
                )}
              </div>
              {tweaks.length > 0 && (
                <ul className="mt-1.5 space-y-1.5">
                  {tweaks.map((t, i) => (
                    <li key={t.prop} className="grid grid-cols-[88px_1fr_auto] items-center gap-1.5 text-[12.5px]">
                      <span className="truncate font-semibold" title={t.prop}>
                        {t.prop}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[11px] text-ink-faint" title={t.now}><UiText source={'now {0}'} values={[t.now || '—']} /></p>
                        <input
                          value={t.want}
                          onChange={(e) => setTweaks((list) => list.map((x, j) => (j === i ? { ...x, want: e.target.value } : x)))}
                          placeholder={translateUi('wanted, e.g. 17 or --ink')}
                          aria-label={translateUi('Wanted {0}', [t.prop])}
                          className="w-full rounded-lg border border-line-strong bg-bg px-2 py-1 font-mono text-[12px] outline-none focus:border-accent"
                        />
                      </div>
                      <button type="button" onClick={() => setTweaks((list) => list.filter((_, j) => j !== i))} aria-label={translateUi('Remove {0}', [t.prop])} className="grid size-6 place-items-center rounded-md text-ink-faint hover:bg-surface hover:text-ink">
                        <X size={13} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <label className="mt-1.5 inline-flex items-center gap-1 rounded-lg border border-dashed border-line-strong px-2 py-1 text-[12px] font-semibold text-ink-soft focus-within:border-accent hover:text-ink">
                <Plus size={13} aria-hidden />
                <select value="" onChange={(e) => addTweak(e.target.value)} aria-label={translateUi('Add a tweak')} className="bg-transparent outline-none">
                  <option value="">{translateUi('Add a tweak')}</option>
                  {TWEAKS.filter((t) => !tweaks.some((x) => x.prop === t.name)).map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {facts && (
              <details className="group rounded-xl bg-surface/70 px-3 py-2 text-[12px]">
                <summary className="flex cursor-pointer list-none items-center gap-1 font-semibold text-ink-soft"><UiText source={'{0} What it is'} values={[<ChevronDown size={13} className="transition-transform group-open:rotate-180" aria-hidden />]} /></summary>
                <dl className="mt-2 grid grid-cols-[72px_1fr] gap-x-2 gap-y-1">
                  {(
                    [
                      ['Tag', `<${facts.tag}>`],
                      ['Component', facts.component],
                      ['Classes', facts.classes],
                      ['Size', facts.size],
                      ['Type', facts.type],
                      ['Colour', facts.colour],
                      ['Background', facts.background],
                      ['Border', facts.border],
                      ['Padding', facts.padding],
                      ['Margin', facts.margin],
                      ['Gap', facts.gap],
                      ['Corners', facts.corners],
                    ] as Array<[string, string | undefined]>
                  )
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k} className="contents">
                        <dt className="text-ink-faint">{k}</dt>
                        <dd className="min-w-0 font-mono text-[11.5px] break-words">{v!.replace(/`/g, '')}</dd>
                      </div>
                    ))}
                </dl>
              </details>
            )}
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-t border-line px-3 py-2.5">
        <Button size="sm" onClick={save} disabled={!canSave}><UiText source={'Save'} /></Button>
        <Button size="sm" variant="ghost" onClick={onCancel}><UiText source={'Cancel'} /></Button>
        {note && (
          <>
            <Button size="sm" variant="ghost" icon={Check} onClick={() => onDone(note.id, !note.done)}>
              {note.done ? translateUi('Open again') : translateUi('Done')}
            </Button>
            <Button size="sm" variant="ghost" icon={Trash2} onClick={() => onDelete(note.id)}><UiText source={'Delete'} /></Button>
          </>
        )}
        {!note && <span className="ml-auto text-[11px] text-ink-faint"><UiText source={'Ctrl Enter saves'} /></span>}
      </div>
    </div>
  );
}
