import { UiText, useUi } from '@/design/i18n/UiText';
// Your own playlists (6-9): name a list, put items in it, and the library can show just that list. An item can be in several.
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { setMediaPlaylists } from '@/data/media';
import type { Media } from '@/data/types';
import { Button, Dialog } from '@/design/primitives';

export function PlaylistDialog({ open, onClose, media, existing }: { open: boolean; onClose: () => void; media: Media; existing: string[] }) {
  const translateUi = useUi();
  const [chosen, setChosen] = useState<string[]>(media.playlists ?? []);
  const [fresh, setFresh] = useState('');
  useEffect(() => {
    if (open) setChosen(media.playlists ?? []);
    setFresh('');
  }, [open, media.playlists]);
  const names = [...new Set([...existing, ...chosen])];
  const add = () => {
    const name = fresh.trim();
    if (name) setChosen((c) => [...new Set([...c, name])]);
    setFresh('');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={translateUi('Playlists')}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}><UiText source={'Cancel'} /></Button>
          <Button
            onClick={async () => {
              await setMediaPlaylists(media.id, fresh.trim() ? [...chosen, fresh.trim()] : chosen);
              onClose();
            }}
          ><UiText source={'Save'} /></Button>
        </>
      }
    >
      <div className="space-y-3 pt-2">
        <p className="text-[14px] text-ink-soft"><UiText source={'“{0}” is in:'} values={[media.title]} /></p>
        <ul className="space-y-1">
          {names.map((n) => (
            <li key={n}>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-surface">
                <input type="checkbox" checked={chosen.includes(n)} onChange={(e) => setChosen((c) => (e.target.checked ? [...c, n] : c.filter((x) => x !== n)))} />
                <span className="text-[15px]">{n}</span>
              </label>
            </li>
          ))}
          {!names.length && <li className="px-2 text-[14px] text-ink-faint"><UiText source={'No playlists yet. Name the first one.'} /></li>}
        </ul>
        <div className="flex gap-2">
          <input value={fresh} onChange={(e) => setFresh(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} maxLength={30} placeholder={translateUi('A new playlist')} aria-label={translateUi('A new playlist')} className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-raised px-3 text-[15px] outline-none focus:border-accent" />
          <Button variant="secondary" icon={Plus} onClick={add} disabled={!fresh.trim()}><UiText source={'Add'} /></Button>
        </div>
      </div>
    </Dialog>
  );
}
