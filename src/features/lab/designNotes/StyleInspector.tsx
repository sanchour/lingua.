import { useState, useEffect, useRef, useCallback } from 'react';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify, RotateCcw, GripVertical } from 'lucide-react';
import { cx } from '@/lib/cx';
import { hex } from './inspect';
import type { Tweak } from './notes';

interface StyleInspectorProps {
  el: Element;
  onTweakChange: (prop: string, want: string) => void;
  onResetAll?: () => void;
  showBoxModel: boolean;
  onToggleBoxModel: (show: boolean) => void;
  currentTweaks?: Tweak[];
}

const FONT_FAMILIES = [
  { label: 'System UI', value: 'system-ui, -apple-system, sans-serif' },
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Geist', value: 'Geist, sans-serif' },
  { label: 'Serif', value: 'Georgia, Cambria, "Times New Roman", Times, serif' },
  { label: 'Monospace', value: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' },
];

const FONT_WEIGHTS = [
  { label: '100 Thin', value: '100' },
  { label: '200 Extra Light', value: '200' },
  { label: '300 Light', value: '300' },
  { label: '400 Regular', value: '400' },
  { label: '500 Medium', value: '500' },
  { label: '600 Semi Bold', value: '600' },
  { label: '700 Bold', value: '700' },
  { label: '800 Extra Bold', value: '800' },
  { label: '900 Black', value: '900' },
];

const DISPLAYS = ['block', 'flex', 'grid', 'inline-block', 'inline', 'none'] as const;
const BORDER_STYLES = ['solid', 'dashed', 'dotted', 'double', 'none'] as const;

const SHADOW_PRESETS = [
  { label: 'None', value: 'none' },
  { label: 'elev-1', value: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)' },
  { label: 'elev-2', value: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' },
  { label: 'elev-3', value: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' },
  { label: 'Soft glow', value: '0 0 16px rgba(99, 102, 241, 0.35)' },
  { label: 'Card shadow', value: '0 2px 8px -2px rgba(0, 0, 0, 0.12)' },
];

const SWATCH_PRESETS = [
  'var(--ink)',
  'var(--ink-soft)',
  'var(--ink-faint)',
  'var(--accent-fill)',
  'var(--bg)',
  'var(--raised)',
  'var(--surface)',
  '#ffffff',
  '#000000',
  '#f43f5e',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#6366f1',
];

/** Draggable number input with '||' drag handle */
function DragValueInput({
  value,
  onChange,
  unit = 'px',
  step = 1,
  min,
  max,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (val: string) => void;
  unit?: string;
  step?: number;
  min?: number;
  max?: number;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startNum: number; unitStr: string } | null>(null);

  const parseNumUnit = (valStr: string) => {
    const match = valStr.trim().match(/^(-?\d*\.?\d+)(.*)$/);
    if (!match) return { num: 0, u: unit };
    const n = parseFloat(match[1]);
    const u = match[2].trim() || unit;
    return { num: Number.isFinite(n) ? n : 0, u };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLSpanElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const { num, u } = parseNumUnit(value);
    dragRef.current = { startX: e.clientX, startNum: num, unitStr: u };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    let factor = step;
    if (e.shiftKey) factor = step * 10;
    if (e.altKey) factor = step * 0.1;

    let next = Math.round((dragRef.current.startNum + dx * factor) * 10) / 10;
    if (min !== undefined && next < min) next = min;
    if (max !== undefined && next > max) next = max;

    onChange(`${next}${dragRef.current.unitStr}`);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (dragRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      dragRef.current = null;
      setDragging(false);
    }
  };

  return (
    <div className="relative flex items-center min-w-0">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="w-full rounded-lg border border-line-strong bg-bg py-1 pr-6 pl-2 text-[12px] font-mono outline-none focus:border-accent text-ink"
      />
      <span
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        title="Drag left/right to adjust value (Shift: 10x, Alt: 0.1x)"
        className={cx(
          'absolute right-1 flex h-6 w-5 cursor-ew-resize select-none items-center justify-center rounded text-ink-faint hover:text-ink hover:bg-surface/80',
          dragging && 'text-accent-text bg-accent-soft'
        )}
      >
        <GripVertical size={11} aria-hidden />
      </span>
    </div>
  );
}

export function StyleInspector({
  el,
  onTweakChange,
  onResetAll,
  showBoxModel,
  onToggleBoxModel,
  currentTweaks = [],
}: StyleInspectorProps) {
  // Store initial computed and inline styles for full reset
  const originalsRef = useRef<Map<string, { value: string; priority: string }>>(new Map());
  const appliedRef = useRef<Set<string>>(new Set());

  // Snapshot initial inline styles when el changes
  useEffect(() => {
    if (!(el instanceof HTMLElement || el instanceof SVGElement)) return;
    const keys = [
      'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing',
      'text-align', 'text-transform', 'text-decoration-line', 'color', 'background-color',
      'display', 'width', 'height', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
      'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
      'border-color', 'border-style', 'border-width', 'opacity', 'border-radius',
      'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius',
      'box-shadow'
    ];
    const snap = new Map<string, { value: string; priority: string }>();
    for (const k of keys) {
      snap.set(k, {
        value: el.style.getPropertyValue(k),
        priority: el.style.getPropertyPriority(k),
      });
    }
    originalsRef.current = snap;
    appliedRef.current.clear();
  }, [el]);

  // Read live computed styles from element
  const getStyles = useCallback(() => {
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      fontFamily: cs.fontFamily,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      fontStyle: cs.fontStyle,
      lineHeight: cs.lineHeight === 'normal' ? '1.5' : cs.lineHeight,
      letterSpacing: cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing,
      textAlign: cs.textAlign,
      textTransform: cs.textTransform,
      textDecoration: cs.textDecorationLine || cs.textDecoration || 'none',
      color: cs.color,
      backgroundColor: cs.backgroundColor,
      display: cs.display,
      width: `${Math.round(rect.width)}px`,
      height: `${Math.round(rect.height)}px`,
      marginTop: cs.marginTop,
      marginRight: cs.marginRight,
      marginBottom: cs.marginBottom,
      marginLeft: cs.marginLeft,
      paddingTop: cs.paddingTop,
      paddingRight: cs.paddingRight,
      paddingBottom: cs.paddingBottom,
      paddingLeft: cs.paddingLeft,
      borderColor: cs.borderTopColor,
      borderStyle: cs.borderTopStyle,
      borderWidth: cs.borderTopWidth,
      opacity: Math.round(parseFloat(cs.opacity || '1') * 100) + '%',
      borderRadius: cs.borderRadius,
      btlr: cs.borderTopLeftRadius,
      btrr: cs.borderTopRightRadius,
      bbrr: cs.borderBottomRightRadius,
      bblr: cs.borderBottomLeftRadius,
      boxShadow: cs.boxShadow,
    };
  }, [el]);

  const [state, setState] = useState(getStyles);
  const [splitCorners, setSplitCorners] = useState(false);

  // Sync state if element or tweak changes
  useEffect(() => {
    setState(getStyles());
  }, [el, currentTweaks, getStyles]);

  // Apply a style change live to the element and inform parent
  const applyStyle = (cssProp: string, val: string, tweakName?: string) => {
    if (!(el instanceof HTMLElement || el instanceof SVGElement)) return;
    appliedRef.current.add(cssProp);
    if (!val || val === 'initial') {
      const orig = originalsRef.current.get(cssProp);
      if (orig?.value) el.style.setProperty(cssProp, orig.value, orig.priority);
      else el.style.removeProperty(cssProp);
    } else {
      el.style.setProperty(cssProp, val, 'important');
    }
    setState(getStyles());
    if (tweakName) {
      onTweakChange(tweakName, val);
    }
  };

  const resetAll = () => {
    if (!(el instanceof HTMLElement || el instanceof SVGElement)) return;
    for (const [prop, { value, priority }] of originalsRef.current.entries()) {
      if (value) el.style.setProperty(prop, value, priority);
      else el.style.removeProperty(prop);
    }
    appliedRef.current.clear();
    setState(getStyles());
    onResetAll?.();
  };

  // Format color to hex for the input[type=color]
  const toColorPickerHex = (cssVal: string) => {
    const h = hex(cssVal);
    if (h.startsWith('#') && h.length === 7) return h;
    return '#000000';
  };

  return (
    <div className="space-y-4 text-[12px] text-ink select-none">
      {/* Reset & Box Model Bar */}
      <div className="flex items-center justify-between border-b border-line pb-2">
        <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-[11.5px] text-ink-soft hover:text-ink">
          <input
            type="checkbox"
            checked={showBoxModel}
            onChange={(e) => onToggleBoxModel(e.target.checked)}
            className="rounded border-line-strong accent-accent"
          />
          <span>Show paddings and margins</span>
        </label>
        <button
          type="button"
          onClick={resetAll}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-faint hover:text-accent-text"
          title="Reset all inspected styles on this element"
        >
          <RotateCcw size={12} aria-hidden />
          <span>Reset</span>
        </button>
      </div>

      {/* 1. TYPOGRAPHY */}
      <section className="space-y-2">
        <h4 className="text-[10.5px] font-bold tracking-wider text-ink-faint uppercase">Typography</h4>
        
        {/* Font family dropdown */}
        <div className="grid grid-cols-[80px_1fr] items-center gap-2">
          <span className="text-ink-soft">Font</span>
          <select
            value={FONT_FAMILIES.some((f) => state.fontFamily.includes(f.value.split(',')[0])) ? state.fontFamily : 'custom'}
            onChange={(e) => applyStyle('font-family', e.target.value, 'typeface')}
            className="w-full rounded-lg border border-line-strong bg-bg px-2 py-1 text-[12px] text-ink outline-none focus:border-accent"
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f.label} value={f.value}>
                {f.label}
              </option>
            ))}
            <option value="custom" disabled>
              {state.fontFamily.split(',')[0].replace(/['"]/g, '')} (Current)
            </option>
          </select>
        </div>

        {/* Size & Weight */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <span className="text-[11px] text-ink-faint">Size</span>
            <DragValueInput
              value={state.fontSize}
              onChange={(val) => applyStyle('font-size', val, 'type size')}
              step={1}
              min={1}
              ariaLabel="Font size"
            />
          </div>
          <div className="space-y-1">
            <span className="text-[11px] text-ink-faint">Weight</span>
            <select
              value={state.fontWeight}
              onChange={(e) => applyStyle('font-weight', e.target.value, 'weight')}
              className="w-full rounded-lg border border-line-strong bg-bg px-2 py-1 text-[12px] text-ink outline-none focus:border-accent"
            >
              {FONT_WEIGHTS.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Style (T / I), Line Height, Letter Spacing */}
        <div className="grid grid-cols-[auto_1fr_1fr] items-end gap-2">
          <div className="space-y-1">
            <span className="text-[11px] text-ink-faint">Style</span>
            <div className="flex rounded-lg border border-line-strong bg-bg p-0.5">
              <button
                type="button"
                onClick={() => applyStyle('font-style', 'normal')}
                className={cx(
                  'size-6 rounded font-semibold text-[12px] transition-colors',
                  state.fontStyle !== 'italic' ? 'bg-accent-fill text-on-accent' : 'text-ink-soft hover:text-ink'
                )}
                title="Normal style"
              >
                T
              </button>
              <button
                type="button"
                onClick={() => applyStyle('font-style', 'italic')}
                className={cx(
                  'size-6 rounded font-serif italic font-semibold text-[12px] transition-colors',
                  state.fontStyle === 'italic' ? 'bg-accent-fill text-on-accent' : 'text-ink-soft hover:text-ink'
                )}
                title="Italic style"
              >
                I
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[11px] text-ink-faint">Line Height</span>
            <DragValueInput
              value={state.lineHeight}
              onChange={(val) => applyStyle('line-height', val, 'line height')}
              step={0.1}
              min={0.5}
              unit=""
              ariaLabel="Line height"
            />
          </div>
          <div className="space-y-1">
            <span className="text-[11px] text-ink-faint">Spacing</span>
            <DragValueInput
              value={state.letterSpacing}
              onChange={(val) => applyStyle('letter-spacing', val, 'letter spacing')}
              step={0.5}
              ariaLabel="Letter spacing"
            />
          </div>
        </div>

        {/* Alignment, Case, Decoration */}
        <div className="space-y-2 pt-1 border-t border-line/60">
          {/* Alignment */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-ink-faint">Alignment</span>
            <div className="flex rounded-lg border border-line-strong bg-bg p-0.5">
              {[
                { id: 'left', icon: AlignLeft, label: 'Align Left' },
                { id: 'center', icon: AlignCenter, label: 'Align Center' },
                { id: 'right', icon: AlignRight, label: 'Align Right' },
                { id: 'justify', icon: AlignJustify, label: 'Justify' },
              ].map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => applyStyle('text-align', id)}
                  title={label}
                  className={cx(
                    'grid size-6 place-items-center rounded transition-colors',
                    state.textAlign === id ? 'bg-accent-fill text-on-accent' : 'text-ink-soft hover:text-ink'
                  )}
                >
                  <Icon size={12} aria-hidden />
                </button>
              ))}
            </div>
          </div>

          {/* Case */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-ink-faint">Case</span>
            <div className="flex rounded-lg border border-line-strong bg-bg p-0.5">
              {[
                { id: 'none', label: '—', title: 'None' },
                { id: 'capitalize', label: 'Aa', title: 'Capitalize' },
                { id: 'uppercase', label: 'AA', title: 'Uppercase' },
                { id: 'lowercase', label: 'aa', title: 'Lowercase' },
              ].map(({ id, label, title }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => applyStyle('text-transform', id)}
                  title={title}
                  className={cx(
                    'grid size-6 place-items-center rounded font-semibold text-[11px] transition-colors',
                    state.textTransform === id ? 'bg-accent-fill text-on-accent' : 'text-ink-soft hover:text-ink'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Decoration */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-ink-faint">Decoration</span>
            <div className="flex rounded-lg border border-line-strong bg-bg p-0.5">
              {[
                { id: 'none', label: '—', title: 'None', cls: '' },
                { id: 'underline', label: 'U', title: 'Underline', cls: 'underline' },
                { id: 'line-through', label: 'S', title: 'Strikethrough', cls: 'line-through' },
                { id: 'overline', label: 'O', title: 'Overline', cls: 'overline' },
              ].map(({ id, label, title, cls }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => applyStyle('text-decoration-line', id)}
                  title={title}
                  className={cx(
                    'grid size-6 place-items-center rounded font-semibold text-[11px] transition-colors',
                    cls,
                    state.textDecoration.includes(id) || (id === 'none' && (!state.textDecoration || state.textDecoration === 'none'))
                      ? 'bg-accent-fill text-on-accent'
                      : 'text-ink-soft hover:text-ink'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. COLOR */}
      <section className="space-y-2 border-t border-line pt-3">
        <h4 className="text-[10.5px] font-bold tracking-wider text-ink-faint uppercase">Color</h4>
        <div className="flex items-center gap-2">
          {/* Swatch with color picker input overlay */}
          <label className="relative size-6 shrink-0 cursor-pointer rounded-full border border-line-strong overflow-hidden shadow-sm">
            <span
              className="absolute inset-0 block"
              style={{ backgroundColor: state.color }}
            />
            <input
              type="color"
              value={toColorPickerHex(state.color)}
              onChange={(e) => applyStyle('color', e.target.value, 'colour')}
              className="absolute inset-0 opacity-0 cursor-pointer size-full"
              aria-label="Pick text color"
            />
          </label>
          <input
            type="text"
            value={state.color}
            onChange={(e) => applyStyle('color', e.target.value, 'colour')}
            placeholder="e.g. #18181b or --ink"
            aria-label="Text color value"
            className="flex-1 rounded-lg border border-line-strong bg-bg px-2 py-1 font-mono text-[12px] text-ink outline-none focus:border-accent"
          />
        </div>
      </section>

      {/* 3. BACKGROUND */}
      <section className="space-y-2 border-t border-line pt-3">
        <h4 className="text-[10.5px] font-bold tracking-wider text-ink-faint uppercase">Background</h4>
        <div className="flex items-center gap-2">
          {/* Checkerboard swatch for transparency */}
          <label
            className="relative size-6 shrink-0 cursor-pointer rounded-full border border-line-strong overflow-hidden shadow-sm"
            style={{
              backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
              backgroundSize: '8px 8px',
              backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
            }}
          >
            <span
              className="absolute inset-0 block"
              style={{ backgroundColor: state.backgroundColor }}
            />
            <input
              type="color"
              value={toColorPickerHex(state.backgroundColor)}
              onChange={(e) => applyStyle('background-color', e.target.value, 'background')}
              className="absolute inset-0 opacity-0 cursor-pointer size-full"
              aria-label="Pick background color"
            />
          </label>
          <input
            type="text"
            value={state.backgroundColor}
            onChange={(e) => applyStyle('background-color', e.target.value, 'background')}
            placeholder="e.g. transparent or #ffffff"
            aria-label="Background color value"
            className="flex-1 rounded-lg border border-line-strong bg-bg px-2 py-1 font-mono text-[12px] text-ink outline-none focus:border-accent"
          />
        </div>
        {/* Quick swatches */}
        <div className="flex flex-wrap gap-1 pt-1">
          {SWATCH_PRESETS.map((swatch) => (
            <button
              key={swatch}
              type="button"
              onClick={() => applyStyle('background-color', swatch, 'background')}
              style={{ backgroundColor: swatch }}
              title={swatch}
              className="size-4 rounded-full border border-line hover:scale-110 transition-transform"
            />
          ))}
          <button
            type="button"
            onClick={() => applyStyle('background-color', 'transparent', 'background')}
            className="rounded px-1.5 py-0.5 text-[10.5px] font-semibold text-ink-faint border border-line hover:text-ink"
          >
            None
          </button>
        </div>
      </section>

      {/* 4. LAYOUT */}
      <section className="space-y-2 border-t border-line pt-3">
        <h4 className="text-[10.5px] font-bold tracking-wider text-ink-faint uppercase">Layout</h4>
        
        {/* Display dropdown */}
        <div className="grid grid-cols-[80px_1fr] items-center gap-2">
          <span className="text-ink-soft">Display</span>
          <select
            value={DISPLAYS.includes(state.display as (typeof DISPLAYS)[number]) ? state.display : 'block'}
            onChange={(e) => applyStyle('display', e.target.value)}
            className="w-full rounded-lg border border-line-strong bg-bg px-2 py-1 text-[12px] text-ink outline-none focus:border-accent"
          >
            {DISPLAYS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Width & Height */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <span className="text-[11px] text-ink-faint">Width</span>
            <DragValueInput
              value={state.width}
              onChange={(val) => applyStyle('width', val, 'width')}
              step={1}
              ariaLabel="Width"
            />
          </div>
          <div className="space-y-1">
            <span className="text-[11px] text-ink-faint">Height</span>
            <DragValueInput
              value={state.height}
              onChange={(val) => applyStyle('height', val, 'height')}
              step={1}
              ariaLabel="Height"
            />
          </div>
        </div>

        {/* Margins 2x2 Grid */}
        <div className="space-y-1 pt-1">
          <span className="text-[11px] text-ink-faint">Margin (Top · Right · Bottom · Left)</span>
          <div className="grid grid-cols-4 gap-1.5">
            <DragValueInput
              value={state.marginTop}
              onChange={(v) => {
                applyStyle('margin-top', v);
                onTweakChange('margin', `${v} ${state.marginRight} ${state.marginBottom} ${state.marginLeft}`);
              }}
              placeholder="top"
              ariaLabel="Margin top"
            />
            <DragValueInput
              value={state.marginRight}
              onChange={(v) => {
                applyStyle('margin-right', v);
                onTweakChange('margin', `${state.marginTop} ${v} ${state.marginBottom} ${state.marginLeft}`);
              }}
              placeholder="right"
              ariaLabel="Margin right"
            />
            <DragValueInput
              value={state.marginBottom}
              onChange={(v) => {
                applyStyle('margin-bottom', v);
                onTweakChange('margin', `${state.marginTop} ${state.marginRight} ${v} ${state.marginLeft}`);
              }}
              placeholder="bottom"
              ariaLabel="Margin bottom"
            />
            <DragValueInput
              value={state.marginLeft}
              onChange={(v) => {
                applyStyle('margin-left', v);
                onTweakChange('margin', `${state.marginTop} ${state.marginRight} ${state.marginBottom} ${v}`);
              }}
              placeholder="left"
              ariaLabel="Margin left"
            />
          </div>
        </div>

        {/* Paddings 2x2 Grid */}
        <div className="space-y-1">
          <span className="text-[11px] text-ink-faint">Padding (Top · Right · Bottom · Left)</span>
          <div className="grid grid-cols-4 gap-1.5">
            <DragValueInput
              value={state.paddingTop}
              onChange={(v) => {
                applyStyle('padding-top', v);
                onTweakChange('padding', `${v} ${state.paddingRight} ${state.paddingBottom} ${state.paddingLeft}`);
              }}
              placeholder="top"
              ariaLabel="Padding top"
            />
            <DragValueInput
              value={state.paddingRight}
              onChange={(v) => {
                applyStyle('padding-right', v);
                onTweakChange('padding', `${state.paddingTop} ${v} ${state.paddingBottom} ${state.paddingLeft}`);
              }}
              placeholder="right"
              ariaLabel="Padding right"
            />
            <DragValueInput
              value={state.paddingBottom}
              onChange={(v) => {
                applyStyle('padding-bottom', v);
                onTweakChange('padding', `${state.paddingTop} ${state.paddingRight} ${v} ${state.paddingLeft}`);
              }}
              placeholder="bottom"
              ariaLabel="Padding bottom"
            />
            <DragValueInput
              value={state.paddingLeft}
              onChange={(v) => {
                applyStyle('padding-left', v);
                onTweakChange('padding', `${state.paddingTop} ${state.paddingRight} ${state.paddingBottom} ${v}`);
              }}
              placeholder="left"
              ariaLabel="Padding left"
            />
          </div>
        </div>
      </section>

      {/* 5. BORDER */}
      <section className="space-y-2 border-t border-line pt-3">
        <h4 className="text-[10.5px] font-bold tracking-wider text-ink-faint uppercase">Border</h4>
        
        {/* Border color */}
        <div className="flex items-center gap-2">
          <label className="relative size-6 shrink-0 cursor-pointer rounded-full border border-line-strong overflow-hidden shadow-sm">
            <span
              className="absolute inset-0 block"
              style={{ backgroundColor: state.borderColor }}
            />
            <input
              type="color"
              value={toColorPickerHex(state.borderColor)}
              onChange={(e) => applyStyle('border-color', e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer size-full"
              aria-label="Pick border color"
            />
          </label>
          <input
            type="text"
            value={state.borderColor}
            onChange={(e) => applyStyle('border-color', e.target.value)}
            placeholder="e.g. #000000 or --line"
            aria-label="Border color value"
            className="flex-1 rounded-lg border border-line-strong bg-bg px-2 py-1 font-mono text-[12px] text-ink outline-none focus:border-accent"
          />
        </div>

        {/* Style & Width */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <span className="text-[11px] text-ink-faint">Style</span>
            <select
              value={BORDER_STYLES.includes(state.borderStyle as (typeof BORDER_STYLES)[number]) ? state.borderStyle : 'solid'}
              onChange={(e) => applyStyle('border-style', e.target.value)}
              className="w-full rounded-lg border border-line-strong bg-bg px-2 py-1 text-[12px] text-ink outline-none focus:border-accent"
            >
              {BORDER_STYLES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <span className="text-[11px] text-ink-faint">Width</span>
            <DragValueInput
              value={state.borderWidth}
              onChange={(val) => applyStyle('border-width', val)}
              step={1}
              min={0}
              ariaLabel="Border width"
            />
          </div>
        </div>
      </section>

      {/* 6. APPEARANCE */}
      <section className="space-y-2 border-t border-line pt-3">
        <h4 className="text-[10.5px] font-bold tracking-wider text-ink-faint uppercase">Appearance</h4>
        
        {/* Opacity */}
        <div className="grid grid-cols-[80px_1fr] items-center gap-2">
          <span className="text-ink-soft">Opacity</span>
          <DragValueInput
            value={state.opacity}
            onChange={(val) => {
              const num = parseFloat(val);
              if (Number.isFinite(num)) {
                const normalized = num > 1 ? `${Math.min(100, Math.max(0, num)) / 100}` : `${num}`;
                applyStyle('opacity', normalized, 'opacity');
              }
            }}
            step={5}
            min={0}
            max={100}
            unit="%"
            ariaLabel="Opacity"
          />
        </div>

        {/* All Corners (Border Radius) with 4-corner expand toggle */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-ink-soft">All Corners</span>
            <button
              type="button"
              onClick={() => setSplitCorners(!splitCorners)}
              className="text-[11px] font-semibold text-accent-text hover:underline"
            >
              {splitCorners ? 'Single value' : 'Individual 4 corners'}
            </button>
          </div>

          {!splitCorners ? (
            <DragValueInput
              value={state.borderRadius}
              onChange={(val) => applyStyle('border-radius', val, 'corners')}
              step={1}
              min={0}
              ariaLabel="Border radius all corners"
            />
          ) : (
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              <DragValueInput
                value={state.btlr}
                onChange={(v) => {
                  applyStyle('border-top-left-radius', v);
                  onTweakChange('corners', `${v} ${state.btrr} ${state.bbrr} ${state.bblr}`);
                }}
                placeholder="TL"
                ariaLabel="Border top left radius"
              />
              <DragValueInput
                value={state.btrr}
                onChange={(v) => {
                  applyStyle('border-top-right-radius', v);
                  onTweakChange('corners', `${state.btlr} ${v} ${state.bbrr} ${state.bblr}`);
                }}
                placeholder="TR"
                ariaLabel="Border top right radius"
              />
              <DragValueInput
                value={state.bbrr}
                onChange={(v) => {
                  applyStyle('border-bottom-right-radius', v);
                  onTweakChange('corners', `${state.btlr} ${state.btrr} ${v} ${state.bblr}`);
                }}
                placeholder="BR"
                ariaLabel="Border bottom right radius"
              />
              <DragValueInput
                value={state.bblr}
                onChange={(v) => {
                  applyStyle('border-bottom-left-radius', v);
                  onTweakChange('corners', `${state.btlr} ${state.btrr} ${state.bbrr} ${v}`);
                }}
                placeholder="BL"
                ariaLabel="Border bottom left radius"
              />
            </div>
          )}
        </div>
      </section>

      {/* 7. SHADOW */}
      <section className="space-y-2 border-t border-line pt-3">
        <h4 className="text-[10.5px] font-bold tracking-wider text-ink-faint uppercase">Shadow</h4>
        <select
          value={SHADOW_PRESETS.some((s) => s.value === state.boxShadow) ? state.boxShadow : 'custom'}
          onChange={(e) => {
            if (e.target.value !== 'custom') {
              applyStyle('box-shadow', e.target.value, 'shadow');
            }
          }}
          className="w-full rounded-lg border border-line-strong bg-bg px-2 py-1 text-[12px] text-ink outline-none focus:border-accent"
        >
          {SHADOW_PRESETS.map((p) => (
            <option key={p.label} value={p.value}>
              {p.label}
            </option>
          ))}
          <option value="custom">Custom</option>
        </select>
        <input
          type="text"
          value={state.boxShadow}
          onChange={(e) => applyStyle('box-shadow', e.target.value, 'shadow')}
          placeholder="e.g. 0 4px 6px -1px rgba(0, 0, 0, 0.1)"
          aria-label="Box shadow custom CSS"
          className="w-full rounded-lg border border-line-strong bg-bg px-2 py-1 font-mono text-[11px] text-ink outline-none focus:border-accent"
        />
      </section>
    </div>
  );
}
