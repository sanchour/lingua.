// Each core language's standard keyboard, read from the physical key (KeyboardEvent.code), so a
// learner can practise on an English keyboard before installing the layout. Dead keys (French ^ and
// ¨, Spanish ´ and ¨) work as on the real layout: press it, then the letter.

export type LayoutId = 'azerty' | 'qwertz' | 'es' | 'jcuken' | 'arabic' | 'pinyin';

/** The keyboard's rows by physical key, as drawn on screen. */
export const ROWS: string[][] = [
  ['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal'],
  ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight'],
  ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote', 'Backslash'],
  ['IntlBackslash', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash'],
];

export type Finger = 'left pinky' | 'left ring' | 'left middle' | 'left index' | 'right index' | 'right middle' | 'right ring' | 'right pinky' | 'thumb';

/** Which finger presses each key in touch typing. */
export function fingerFor(code: string): Finger {
  if (code === 'Space') return 'thumb';
  const row = ROWS.find((r) => r.includes(code));
  if (!row) return 'right pinky';
  // The number row and the bottom row start one key further left (` and the ISO key belong to the pinky).
  const i = row.indexOf(code) - (row === ROWS[0] || row === ROWS[3] ? 1 : 0);
  const fingers: Finger[] = ['left pinky', 'left ring', 'left middle', 'left index', 'left index', 'right index', 'right index', 'right middle', 'right ring', 'right pinky'];
  return i < 0 ? 'left pinky' : (fingers[i] ?? 'right pinky');
}

/** What a key types: unshifted, shifted; a value starting with "dead:" waits for the next key. */
type KeyMap = Record<string, [string, string?]>;

const QWERTY: KeyMap = Object.fromEntries('qwertyuiopasdfghjklzxcvbnm'.split('').map((c) => [`Key${c.toUpperCase()}`, [c, c.toUpperCase()]]));

const LAYOUTS: Record<LayoutId, { name: string; keys: KeyMap; dead?: Record<string, Record<string, string>> }> = {
  azerty: {
    name: 'French AZERTY',
    keys: {
      ...QWERTY,
      KeyQ: ['a', 'A'], KeyW: ['z', 'Z'], KeyA: ['q', 'Q'], KeyZ: ['w', 'W'], Semicolon: ['m', 'M'], KeyM: [',', '?'],
      Digit2: ['é'], Digit7: ['è'], Digit9: ['ç'], Digit0: ['à'], Quote: ['ù', '%'], BracketLeft: ['dead:^', 'dead:¨'],
    },
    dead: {
      '^': { a: 'â', e: 'ê', i: 'î', o: 'ô', u: 'û' },
      '¨': { e: 'ë', i: 'ï', u: 'ü', y: 'ÿ' },
    },
  },
  qwertz: {
    name: 'German QWERTZ',
    keys: { ...QWERTY, KeyY: ['z', 'Z'], KeyZ: ['y', 'Y'], Semicolon: ['ö', 'Ö'], Quote: ['ä', 'Ä'], BracketLeft: ['ü', 'Ü'], Minus: ['ß', '?'] },
  },
  es: {
    name: 'Spanish',
    keys: { ...QWERTY, Semicolon: ['ñ', 'Ñ'], Quote: ['dead:´', 'dead:¨'], Equal: ['¡', '¿'] },
    dead: {
      '´': { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú' },
      '¨': { u: 'ü' },
    },
  },
  jcuken: {
    name: 'Russian ЙЦУКЕН',
    keys: Object.fromEntries(
      [...'йцукенгшщзхъфывапролджэячсмитьбю'].map((c, i) => [
        ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period'][i],
        [c, c.toUpperCase()],
      ]).concat([['Backquote', ['ё', 'Ё']]]),
    ) as KeyMap,
  },
  arabic: {
    name: 'Arabic 101',
    keys: {
      KeyQ: ['ض'], KeyW: ['ص'], KeyE: ['ث'], KeyR: ['ق'], KeyT: ['ف'], KeyY: ['غ', 'إ'], KeyU: ['ع'], KeyI: ['ه'], KeyO: ['خ'], KeyP: ['ح'], BracketLeft: ['ج'], BracketRight: ['د'],
      KeyA: ['ش'], KeyS: ['س'], KeyD: ['ي'], KeyF: ['ب'], KeyG: ['ل', 'أ'], KeyH: ['ا', 'آ'], KeyJ: ['ت'], KeyK: ['ن'], KeyL: ['م'], Semicolon: ['ك'], Quote: ['ط'],
      KeyZ: ['ئ'], KeyX: ['ء'], KeyC: ['ؤ'], KeyV: ['ر'], KeyN: ['ى'], KeyM: ['ة'], Comma: ['و'], Period: ['ز'], Slash: ['ظ'], Backquote: ['ذ'],
    },
  },
  pinyin: { name: 'Pinyin (QWERTY, ü on V)', keys: { ...QWERTY, KeyV: ['ü', 'Ü'] } },
};

export const LANG_LAYOUT: Record<string, LayoutId> = { fr: 'azerty', de: 'qwertz', es: 'es', ru: 'jcuken', ar: 'arabic', zh: 'pinyin' };
export const layoutName = (id: LayoutId) => LAYOUTS[id].name;

/** The label a key shows on screen in this layout. */
export function keyLabel(layout: LayoutId, code: string): string {
  const k = LAYOUTS[layout].keys[code]?.[0];
  return k?.startsWith('dead:') ? k.slice(5) : (k ?? '');
}

/** Typing on a layout: a key gives a character, starts a dead key, or nothing. */
export function pressKey(layout: LayoutId, code: string, shift: boolean, dead: string | null): { char?: string; dead: string | null } {
  if (code === 'Space') return { char: dead ?? ' ', dead: null };
  const key = LAYOUTS[layout].keys[code];
  const out = key ? (shift ? (key[1] ?? key[0]) : key[0]) : undefined;
  if (!out) return { dead };
  if (out.startsWith('dead:')) return { dead: out.slice(5) };
  if (dead) return { char: LAYOUTS[layout].dead?.[dead]?.[out] ?? out, dead: null };
  return { char: out, dead: null };
}

/** The keys to press for a character, in order (a dead key first for ê, á…), or [] if none types it. */
export function keysFor(layout: LayoutId, char: string): Array<{ code: string; shift: boolean }> {
  if (char === ' ') return [{ code: 'Space', shift: false }];
  const { keys, dead } = LAYOUTS[layout];
  for (const [code, [plain, shifted]] of Object.entries(keys)) {
    if (plain === char) return [{ code, shift: false }];
    if (shifted === char) return [{ code, shift: true }];
  }
  for (const [mark, table] of Object.entries(dead ?? {})) {
    const base = Object.entries(table).find(([, c]) => c === char)?.[0];
    if (!base) continue;
    const deadKey = Object.entries(keys).find(([, [p, s]]) => p === `dead:${mark}` || s === `dead:${mark}`);
    if (!deadKey) continue;
    return [{ code: deadKey[0], shift: deadKey[1][1] === `dead:${mark}` && deadKey[1][0] !== `dead:${mark}` }, ...keysFor(layout, base)];
  }
  return [];
}

/** How to type a letter English keyboards lack, said when it unlocks. */
export function howToType(layout: LayoutId, char: string): string | null {
  const keys = keysFor(layout, char);
  if (!keys.length || /^[a-z]$/.test(char)) return null;
  const name = (k: { code: string; shift: boolean }) => `${k.shift ? 'Shift + ' : ''}${k.code.replace(/^Key|^Digit/, '')}`;
  if (keys.length > 1) return `On the ${layoutName(layout)} layout: ${keyLabel(layout, keys[0].code) || name(keys[0])} (the ${name(keys[0])} key), then ${keys.slice(1).map(name).join(' then ')}. On your own keyboard it may be a long press, or a dead key.`;
  return `On the ${layoutName(layout)} layout it’s the key where an English keyboard has ${name(keys[0])}.`;
}
