import { sectionKey, SECTIONS } from '@/app/sections';
import { Button, Dialog, Kbd } from '@/design/primitives';
import { useUI } from '@/state/ui';

const GENERAL: Array<[string[], string]> = [
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
export function ShortcutList() {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <Group title="Navigate" rows={[...SECTIONS.slice(0, 10).map((s, i): [string[], string] => [['Alt', String(sectionKey(i))], s.name]), ...GENERAL]} />
      <Group title="Reading" rows={READER_SHORTCUTS} />
      <Group title="Studying" rows={STUDY_SHORTCUTS} />
      <Group title="Listening" rows={LISTENING_SHORTCUTS} />
      <Group title="Watching" rows={WATCHING_SHORTCUTS} />
    </div>
  );
}

function Group({ title, rows }: { title: string; rows: Array<[string[], string]> }) {
  return (
    <div>
      <h3 className="mb-2.5 text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase">{title}</h3>
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-ink">
        {rows.map(([keys, label]) => (
          <div key={label} className="contents">
            <dt className="flex gap-1">
              {keys.map((k) => (
                <Kbd key={k}>{k}</Kbd>
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
  const open = useUI((s) => s.shortcutsOpen);
  const setOpen = useUI((s) => s.setShortcutsOpen);
  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      title="Keyboard shortcuts"
      maxWidth="max-w-2xl"
      actions={
        <Button variant="secondary" onClick={() => setOpen(false)} data-autofocus>
          Done
        </Button>
      }
    >
      <div className="mt-3 max-h-[calc(100dvh-10rem)] overflow-y-auto pr-1">
        <ShortcutList />
      </div>
    </Dialog>
  );
}
