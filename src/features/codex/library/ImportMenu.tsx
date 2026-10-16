import { useState } from 'react';
import { BookUp, ClipboardPaste, FileText, Library, Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLayout } from '@/design/hooks/useLayout';
import { Button, Drawer, Popover } from '@/design/primitives';
import { PasteDrawer } from './PasteDrawer';
import type { ImportKind } from './useImporter';

const OPTIONS: Array<{ kind: ImportKind | 'paste'; icon: LucideIcon; title: string; detail: string }> = [
  { kind: 'epub', icon: BookUp, title: 'EPUB book', detail: 'DRM-free e-books, e.g. from Files or iCloud Drive' },
  { kind: 'txt', icon: FileText, title: 'Text file', detail: 'Plain .txt in any encoding' },
  { kind: 'paste', icon: ClipboardPaste, title: 'Paste text', detail: 'An article, chapter or lyrics' },
  { kind: 'goodreads', icon: Library, title: 'Goodreads shelves', detail: 'The CSV from Goodreads → Import and export' },
];

export function ImportMenu({ lang, busy, onImport }: { lang: string; busy: boolean; onImport: (kind: ImportKind) => void }) {
  const { layout } = useLayout();
  const [sheet, setSheet] = useState(false);
  const [paste, setPaste] = useState(false);

  const choose = (kind: ImportKind | 'paste', close: () => void) => {
    close();
    if (kind === 'paste') setPaste(true);
    else onImport(kind);
  };

  const list = (close: () => void) => (
    <ul className="space-y-0.5">
      {OPTIONS.map(({ kind, icon: Icon, title, detail }) => (
        <li key={kind}>
          <button
            type="button"
            onClick={() => choose(kind, close)}
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

  return (
    <>
      {layout === 'wide' ? (
        <Popover
          label="Add to library"
          placement="bottom-end"
          className="w-80"
          trigger={(props) => (
            <Button {...props} icon={Plus} loading={busy}>
              Add
            </Button>
          )}
        >
          {(close) => list(close)}
        </Popover>
      ) : (
        <>
          <Button icon={Plus} loading={busy} onClick={() => setSheet(true)}>
            Add
          </Button>
          <Drawer open={sheet} onClose={() => setSheet(false)} title="Add to your library">
            {list(() => setSheet(false))}
          </Drawer>
        </>
      )}
      <PasteDrawer open={paste} onClose={() => setPaste(false)} lang={lang} />
    </>
  );
}
