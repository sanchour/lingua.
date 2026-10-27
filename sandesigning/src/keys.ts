// Keyboard combinations: written as 'mod+shift+z' (mod is Ctrl, or ⌘ on a Mac), matched against key events by the
// key's place on the keyboard, so they work the same on every layout's letters.

export const MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

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

const NAMES: Record<string, string> = { mod: MAC ? '⌘' : 'Ctrl', alt: MAC ? '⌥' : 'Alt', shift: '⇧', arrowup: '↑', arrowdown: '↓', arrowleft: '←', arrowright: '→', escape: 'Esc', delete: 'Del', backspace: '⌫', enter: '↵', space: 'Space', tab: 'Tab' };

/** 'mod+shift+z' → the keys to show, one per key cap. */
export const capsOf = (combo: string): string[] => combo.split('+').map((p) => NAMES[p] ?? (p.length === 1 ? p.toUpperCase() : p[0].toUpperCase() + p.slice(1)));

export const kbd = (combo?: string) => (combo ? capsOf(combo).map((c) => `<kbd>${c.replace(/</g, '&lt;')}</kbd>`).join('') : '');
