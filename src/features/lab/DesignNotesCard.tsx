import { UiText, useUi } from '@/design/i18n/UiText';
import { useState } from 'react';
import { ClipboardCopy, PenLine, Trash2 } from 'lucide-react';
import { patchSetting } from '@/data/settings';
import { Button, ToggleRow } from '@/design/primitives';
import { toast } from '@/state/ui';
import { copyNotes } from './designNotes/copy';
import { useDesignNotes } from './designNotes/notes';
import { Facts, LabCard } from './LabCard';

/** Settings › Lab › Design notes (7-0b): turn the tool on, and copy or clear what was noted. */
export function DesignNotesCard({ on }: { on: boolean }) {
  const translateUi = useUi();
  const notes = useDesignNotes((s) => s.notes);
  const clearAll = useDesignNotes((s) => s.clearAll);
  const [sure, setSure] = useState(false);
  const [shown, setShown] = useState<string | null>(null);
  const open = notes.filter((n) => !n.done).length;
  const pages = new Set(notes.map((n) => n.path)).size;

  const deleteAll = () => {
    if (!sure) return setSure(true);
    clearAll();
    setSure(false);
    toast('Every design note was deleted.');
  };

  return (
    <LabCard icon={PenLine} title={translateUi('Design notes')} description={translateUi('Pin a note to anything on screen while you look at the design, then copy them all for Claude. Kept on this device only.')}>
      <ToggleRow title={translateUi('Show the notes tool')} description={translateUi('A small bar at the bottom right. Alt N picks an element; a click pins a note; Esc stops.')} checked={on} onChange={(value) => void patchSetting('ui', { designNotes: value })} />
      <div className="mt-4">
        <Facts
          rows={[
            ['Notes', notes.length ? `${notes.length} (${open} open)` : 'None yet'],
            ['Pages', String(pages)],
          ]}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" icon={ClipboardCopy} onClick={() => void copyNotes(notes).then(setShown)} disabled={!notes.length}><UiText source={'Copy for Claude'} /></Button>
        <Button variant="ghost" icon={Trash2} onClick={deleteAll} onBlur={() => setSure(false)} disabled={!notes.length}>
          {sure ? translateUi('Delete all {0}?', [notes.length]) : translateUi('Delete all')}
        </Button>
      </div>
      {shown && <textarea readOnly autoFocus value={shown} rows={10} onFocus={(e) => e.currentTarget.select()} aria-label={translateUi('Design notes as Markdown')} className="mt-3 w-full rounded-xl border border-line bg-raised p-3 font-mono text-xs" />}
    </LabCard>
  );
}
