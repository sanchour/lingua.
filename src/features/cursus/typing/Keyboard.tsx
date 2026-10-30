import { UiText } from '@/design/i18n/UiText';
// The keyboard on screen: the language's layout on the physical keys, each finger's keys tinted
// (as keybr does), and the next key to press lit.
import { memo } from 'react';
import { fingerFor, keyLabel, ROWS } from '@/core/typing/layouts';
import type { Finger, LayoutId } from '@/core/typing/layouts';
import { cx } from '@/lib/cx';

/** A soft tint per finger, mixed into the page so it suits Paper and Nocturne alike. */
const FINGER_HUE: Record<Finger, string> = {
  'left pinky': '#c4707f',
  'left ring': '#d49b54',
  'left middle': '#6f9a5a',
  'left index': '#5f87a8',
  'right index': '#8a7fb0',
  'right middle': '#6f9a5a',
  'right ring': '#d49b54',
  'right pinky': '#c4707f',
  thumb: '#9a8466',
};

const INDENT = ['0px', '26px', '40px', '18px'];

export const Keyboard = memo(function Keyboard({ layout, next, shift, rtl }: { layout: LayoutId; next: string | null; shift: boolean; rtl?: boolean }) {
  const key = (code: string, wide?: string) => {
    const lit = code === next;
    const hue = FINGER_HUE[fingerFor(code)];
    const label = keyLabel(layout, code);
    return (
      <span
        key={code}
        className={cx(
          'relative grid h-11 place-items-center rounded-lg text-[15px] font-semibold transition-[transform,background-color,box-shadow] duration-100',
          lit ? 'text-on-accent' : label ? 'text-ink' : 'text-ink-faint',
        )}
        style={{
          width: wide ?? '44px',
          background: lit ? 'var(--accent)' : `color-mix(in oklab, ${hue} 13%, var(--raised))`,
          boxShadow: lit ? `0 3px 0 color-mix(in oklab, var(--accent) 70%, black)` : `0 2px 0 color-mix(in oklab, ${hue} 30%, var(--line-strong))`,
          transform: lit ? 'translateY(-1px)' : undefined,
        }}
        dir={rtl ? 'rtl' : undefined}
      >
        {label}
        {(code === 'KeyF' || code === 'KeyJ') && <span className="absolute bottom-1.5 h-0.5 w-3 rounded-full bg-current opacity-40" aria-hidden />}
      </span>
    );
  };
  const shiftKey = (side: string) => (
    <span
      key={side}
      className={cx('grid h-11 place-items-center rounded-lg text-[12px] font-semibold', shift && next ? 'bg-accent text-on-accent' : 'bg-sunken text-ink-faint')}
      style={{ width: side === 'left' ? '46px' : '96px' }}
    ><UiText source={'shift'} /></span>
  );
  return (
    <div className="mx-auto w-fit select-none" aria-hidden>
      {ROWS.map((row, i) => (
        <div key={i} className="mb-1.5 flex gap-1.5" style={{ paddingLeft: INDENT[i] }}>
          {i === 3 && shiftKey('left')}
          {row.filter((c) => c !== 'Backslash' || keyLabel(layout, c)).map((code) => key(code))}
          {i === 3 && shiftKey('right')}
        </div>
      ))}
      <div className="flex justify-center">{key('Space', '300px')}</div>
    </div>
  );
});
