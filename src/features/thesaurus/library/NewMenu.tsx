import { UiText, useUi } from '@/design/i18n/UiText';
import { useState } from 'react';
import { FileSpreadsheet, FolderPlus, Layers, ListPlus, Package, Plus, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLayout } from '@/design/hooks/useLayout';
import { Button, Drawer, Popover } from '@/design/primitives';

export type NewAction = 'deck' | 'folder' | 'list' | 'make' | 'csv' | 'apkg';

const OPTIONS: Array<{ action: NewAction; icon: LucideIcon; title: string; detail: string }> = [
  { action: 'deck', icon: Layers, title: 'New deck', detail: 'Add your own cards' },
  { action: 'folder', icon: FolderPlus, title: 'New folder', detail: 'Group decks together' },
  { action: 'list', icon: ListPlus, title: 'From a list or text', detail: 'Paste words, or a text to pick words from' },
  { action: 'make', icon: Sparkles, title: 'Made by Max', detail: 'A story, sentences, a dialogue or a word list' },
  { action: 'csv', icon: FileSpreadsheet, title: 'Import CSV', detail: 'A spreadsheet of words and meanings' },
  { action: 'apkg', icon: Package, title: 'Import Anki deck', detail: 'An .apkg file, with its progress' },
];

export function NewMenu({ busy, onChoose }: { busy: boolean; onChoose: (action: NewAction) => void }) {
  const translateUi = useUi();
  const { layout } = useLayout();
  const [sheet, setSheet] = useState(false);

  const list = (close: () => void) => (
    <ul className="space-y-0.5">
      {OPTIONS.map(({ action, icon: Icon, title, detail }) => (
        <li key={action}>
          <button
            type="button"
            onClick={() => {
              close();
              onChoose(action);
            }}
            className="no-callout flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface active:bg-surface"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sage-soft text-sage-text">
              <Icon size={18} aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold">{title}</span>
              <span className="block text-[12.5px] text-ink-soft">{detail}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );

  if (layout === 'wide') {
    return (
      <Popover
        label={translateUi('Add to Thesaurus')}
        placement="bottom-end"
        className="w-76"
        trigger={(props) => (
          <Button {...props} icon={Plus} loading={busy}><UiText source={'New'} /></Button>
        )}
      >
        {(close) => list(close)}
      </Popover>
    );
  }
  return (
    <>
      <Button icon={Plus} loading={busy} onClick={() => setSheet(true)}><UiText source={'New'} /></Button>
      <Drawer open={sheet} onClose={() => setSheet(false)} title={translateUi('Add to Thesaurus')}>
        {list(() => setSheet(false))}
      </Drawer>
    </>
  );
}
