import { UiText, useUi } from '@/design/i18n/UiText';
import { sectionKey, SECTIONS } from '@/app/sections';
import { useApp } from '@/app/context';
import { patchSetting } from '@/data/settings';
import { Button, Dialog, Kbd, Segmented } from '@/design/primitives';
import { useUI } from '@/state/ui';

export type KeyboardStyle = 'auto' | 'mac' | 'windows';

export function isMacKeyboard(style: KeyboardStyle = 'auto'): boolean {
  if (style === 'mac') return true;
  if (style === 'windows') return false;
  if (typeof navigator !== 'undefined') {
    const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
    const p = (nav.userAgentData?.platform || nav.platform || '').toLowerCase();
    return p.includes('mac') || p.includes('iphone') || p.includes('ipad');
  }
  return false;
}

export function formatKeySymbol(key: string, isMac: boolean): string {
  const lower = key.toLowerCase();
  if (lower === 'alt' || lower === 'opt' || lower === 'option') return isMac ? '⌥' : 'Alt';
  if (lower === 'ctrl' || lower === 'control' || lower === 'cmd' || lower === 'command' || lower === 'mod') return isMac ? '⌘' : 'Ctrl';
  if (lower === 'shift') return isMac ? '⇧' : 'Shift';
  if (lower === 'esc' || lower === 'escape') return isMac ? '⎋' : 'Esc';
  if (lower === 'enter' || lower === 'return') return isMac ? '⏎' : 'Enter';
  if (lower === 'backspace') return isMac ? '⌫' : 'Backspace';
  if (lower === 'del' || lower === 'delete') return isMac ? '⌦' : 'Del';
  return key;
}

const GENERAL: Array<[string[], string]> = [
  [['Mod', 'Shift', 'E'], 'Explain a selected cultural or historical reference'],
  [['['], 'Collapse or expand the sidebar'],
  [['?'], 'Show keyboard shortcuts'],
  [['/'], 'Search books or decks'],
  [['Esc'], 'Close a drawer or dialog'],
];

export const READER_SHORTCUTS: Array<[string[], string]> = [
  [['←', '→'], 'Previous / next page'],
  [['Click'], 'A word: known; double-click: learning'],
  [['K'], 'Mark the hovered word known'],
  [['L'], 'Mark the hovered word learning'],
  [['X'], 'Reset the hovered word to unseen'],
  [['Right-click'], 'Open a word’s details'],
  [['D'], 'Open the hovered word’s details'],
  [['S'], 'Translate the hovered word’s sentence'],
];

export const STUDY_SHORTCUTS: Array<[string[], string]> = [
  [['Space'], 'Turn the card, then Good'],
  [['1', '4'], 'Again · Hard · Good · Easy'],
  [['Z'], 'Undo the last answer'],
  [['E'], 'Edit the card'],
  [['Enter'], 'Ludus: check, then continue'],
];

export const LISTENING_SHORTCUTS: Array<[string[], string]> = [
  [['Space'], 'Play or pause'],
  [['←', '→'], 'Skip back / forward'],
  [['↑', '↓'], 'Previous / next sentence'],
  [['R'], 'Repeat each sentence on or off'],
  [['Click'], 'A word: known, double-click: learning · its time: jump there'],
];

export const WATCHING_SHORTCUTS: Array<[string[], string]> = [
  [['Space'], 'Play or pause'],
  [['←', '→'], 'Back / forward 5 seconds'],
  [['↑', '↓'], 'Previous / next line'],
  [['R'], 'Repeat the line'],
  [['S'], 'Save the line as a card'],
  [['C'], 'English line: show, blur, hide'],
  [['P'], 'Pause after each line'],
  [['F'], 'Full screen'],
];

/** Every desktop shortcut, grouped. Shown in Settings and in the `?` dialog. */
export function ShortcutList({ style }: { style?: KeyboardStyle }) {
  const translateUi = useUi();
  let appStyle: KeyboardStyle = 'auto';
  try {
    const app = useApp();
    appStyle = app.settings.ui.keyboardStyle ?? 'auto';
  } catch {
    // Outside App context
  }
  const isMac = isMacKeyboard(style ?? appStyle);

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <Group isMac={isMac} title={translateUi('Navigate')} rows={[...SECTIONS.slice(0, 10).map((s, i): [string[], string] => [['Alt', String(sectionKey(i))], s.name]), ...GENERAL]} />
      <Group isMac={isMac} title={translateUi('Reading')} rows={READER_SHORTCUTS} />
      <Group isMac={isMac} title={translateUi('Studying')} rows={STUDY_SHORTCUTS} />
      <Group isMac={isMac} title={translateUi('Listening')} rows={LISTENING_SHORTCUTS} />
      <Group isMac={isMac} title={translateUi('Watching')} rows={WATCHING_SHORTCUTS} />
    </div>
  );
}

function Group({ title, rows, isMac }: { title: string; rows: Array<[string[], string]>; isMac: boolean }) {
  return (
    <div>
      <h3 className="mb-2.5 text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase">{title}</h3>
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-ink">
        {rows.map(([keys, label]) => (
          <div key={label} className="contents">
            <dt className="flex gap-1">
              {keys.map((k) => (
                <Kbd key={k}>{formatKeySymbol(k, isMac)}</Kbd>
              ))}
            </dt>
            <dd className="text-sm">{label}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function ShortcutsDialog() {
  const translateUi = useUi();
  const open = useUI((s) => s.shortcutsOpen);
  const setOpen = useUI((s) => s.setShortcutsOpen);
  let keyboardStyle: KeyboardStyle = 'auto';
  try {
    const app = useApp();
    keyboardStyle = app.settings.ui.keyboardStyle ?? 'auto';
  } catch {
    // Outside App context
  }

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      title={translateUi('Keyboard shortcuts')}
      maxWidth="max-w-2xl"
      actions={
        <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto">
          <Segmented<KeyboardStyle>
            label={translateUi('Command symbols')}
            value={keyboardStyle}
            onChange={(val) => void patchSetting('ui', { keyboardStyle: val })}
            options={[
              { value: 'auto', label: translateUi('Auto') },
              { value: 'mac', label: translateUi('Mac (⌘ ⌥)') },
              { value: 'windows', label: translateUi('Win (Ctrl Alt)') },
            ]}
          />
          <Button variant="secondary" onClick={() => setOpen(false)} data-autofocus><UiText source={'Done'} /></Button>
        </div>
      }
    >
      <div className="mt-3 max-h-[calc(100dvh-12rem)] overflow-y-auto pr-1">
        <ShortcutList style={keyboardStyle} />
      </div>
    </Dialog>
  );
}
