// Keyboard combinations: written as 'mod+shift+z' (mod is Ctrl on Windows/Linux, ⌘ on Mac), matched against key events by the
// key's place on the keyboard, so they work the same on every layout's letters.

export type KeyboardPlatform = 'auto' | 'mac' | 'windows';

export function getKeyboardPlatform(): KeyboardPlatform {
  try {
    const v = localStorage.getItem('sandesigner.keyboard');
    if (v === 'mac' || v === 'windows') return v;
  } catch {}
  return 'auto';
}

export function setKeyboardPlatform(p: KeyboardPlatform): void {
  try {
    localStorage.setItem('sandesigner.keyboard', p);
  } catch {}
}

export function isMac(): boolean {
  const p = getKeyboardPlatform();
  if (p === 'mac') return true;
  if (p === 'windows') return false;
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);
}

export const MAC = isMac();

const CODES: Record<string, string> = { Slash: '/', BracketLeft: '[', BracketRight: ']', Quote: "'", Backslash: '\\', Equal: '=', Minus: '-', Comma: ',', Period: '.', Semicolon: ';', Backquote: '`', Space: 'space' };

export const comboOf = (e: KeyboardEvent): string => {
  // "?" is wherever the layout puts it.
  if (e.key === '?') return [(e.ctrlKey || e.metaKey) && 'mod', e.altKey && 'alt', 'shift+/'].filter(Boolean).join('+');
  let k = e.key.toLowerCase();
  if (e.code.startsWith('Key')) k = e.code.slice(3).toLowerCase();
  else if (e.code.startsWith('Digit')) k = e.code.slice(5);
  else if (e.code.startsWith('Numpad') && /\d$/.test(e.code)) k = e.code.slice(-1);
  else if (CODES[e.code]) k = CODES[e.code];
  return [(e.ctrlKey || e.metaKey) && 'mod', e.altKey && 'alt', e.shiftKey && 'shift', k].filter(Boolean).join('+');
};

/** 'mod+shift+z' → the keys to show, one per key cap. */
export const capsOf = (combo: string): string[] => {
  const mac = isMac();
  const names: Record<string, string> = {
    mod: mac ? '⌘' : 'Ctrl',
    alt: mac ? '⌥' : 'Alt',
    shift: '⇧',
    arrowup: '↑',
    arrowdown: '↓',
    arrowleft: '←',
    arrowright: '→',
    escape: 'Esc',
    delete: mac ? '⌦' : 'Del',
    backspace: mac ? '⌫' : 'Backspace',
    enter: mac ? '⏎' : 'Enter',
    space: 'Space',
    tab: 'Tab',
  };
  return combo.split('+').map((p) => names[p] ?? (p.length === 1 ? p.toUpperCase() : p[0].toUpperCase() + p.slice(1)));
};

export const kbd = (combo?: string) => (combo ? capsOf(combo).map((c) => `<kbd>${c.replace(/</g, '&lt;')}</kbd>`).join('') : '');
