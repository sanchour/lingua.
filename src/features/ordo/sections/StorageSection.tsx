import { UiText, useUi } from '@/design/i18n/UiText';
import { useCallback, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { HardDrive, Lock, ShieldCheck, Trash2 } from 'lucide-react';
import { db } from '@/data/db';
import type { BlobRow } from '@/data/types';
import { removeStoredMedia, restoreStoredMedia, storedMedia } from '@/data/storageMedia';
import { formatBytes } from '@/lib/format';
import { Badge, Button, Card, Dialog } from '@/design/primitives';
import { getStorageInfo, requestPersistence } from '@/services/storage/persist';
import type { StorageInfo } from '@/services/storage/persist';
import { toast } from '@/state/ui';
import { SettingsSection } from '../SettingsSection';

export function StorageSection() {
  const translateUi = useUi();
  const [removing, setRemoving] = useState<BlobRow['kind'] | null>(null);
  const [removed, setRemoved] = useState<BlobRow[]>([]);
  const [busy, setBusy] = useState(false);
  const media = useLiveQuery(() => storedMedia(), []);
  const mediaLabels = { audio: translateUi('Audio'), video: translateUi('Video'), recording: translateUi('Recordings'), image: translateUi('Images'), cover: translateUi('Covers') };
  const [info, setInfo] = useState<StorageInfo | null>(null);
  const refresh = useCallback(() => void getStorageInfo().then(setInfo), []);
  useEffect(refresh, [refresh]);

  const counts = useLiveQuery(async () => {
    const [packs, dictWords, texts, chapters, notes, decks, blobs, songs] = await Promise.all([
      db.dictPacks.count(),
      db.fullDict.count(),
      db.texts.count(),
      db.chapters.count(),
      db.notes.count(),
      db.decks.count(),
      db.blobs.count(),
      db.songs.count(),
    ]);
    return { packs, dictWords, texts, chapters, notes, decks, blobs, songs };
  });

  const changeMedia = async (kind?: BlobRow['kind']) => {
    setBusy(true);
    try {
      if (kind) { setRemoved(await removeStoredMedia(kind)); setRemoving(null); }
      else { await restoreStoredMedia(removed); setRemoved([]); }
      refresh();
    } catch { toast('Could not change stored media.', { tone: 'error' }); }
    finally { setBusy(false); }
  };

  const share = info && info.quota ? Math.min(1, info.usage / info.quota) : 0;

  return (
    <SettingsSection id="storage" icon={HardDrive} title={translateUi('Storage')} description={translateUi('Saved content stays on this device. Online features send only the content they need.')}>
      {info && !info.supported ? (
        <p className="text-sm text-ink-soft"><UiText source={'This browser does not report storage usage.'} /></p>
      ) : (
        <>
          <div>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-semibold"><UiText source={'{0} used'} values={[info ? formatBytes(info.usage) : '…']} /></span>
              <span className="text-ink-soft">{info ? translateUi('{0} available', [formatBytes(info.quota)]) : ''}</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-sunken" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share * 100)} aria-label={translateUi('Storage used')}>
              <div className="h-full origin-left rounded-full bg-sage transition-transform duration-500" style={{ transform: `scaleX(${Math.max(share, 0.01)})` }} />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {info?.persisted ? (
              <Badge tone="sage"><UiText source={'{0} Protected from automatic clean-up'} values={[<ShieldCheck size={13} aria-hidden />]} /></Badge>
            ) : (
              <>
                <Badge><UiText source={'Not yet protected'} /></Badge>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={ShieldCheck}
                  onClick={async () => {
                    const granted = await requestPersistence();
                    toast(
                      granted ? 'Storage is now protected.' : 'The browser declined for now. Installing Lingua to your home screen or desktop usually grants it.',
                      { tone: granted ? 'success' : 'default' },
                    );
                    refresh();
                  }}
                ><UiText source={'Protect my data'} /></Button>
              </>
            )}
          </div>

          {/* Storage breakdown by kind (6-25, F1546) */}
          <div className="mt-6">
            <p className="text-[14px] font-semibold text-ink"><UiText source={'Storage by kind'} /></p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Card className="p-3">
                <p className="text-[11px] font-bold text-ink-faint uppercase"><UiText source={'Dictionaries'} /></p>
                <p className="mt-1 font-serif text-lg font-semibold tabular-nums">{counts?.dictWords.toLocaleString() ?? '…'}</p>
                <p className="text-[11.5px] text-ink-soft"><UiText source={'offline words'} /></p>
              </Card>
              <Card className="p-3">
                <p className="text-[11px] font-bold text-ink-faint uppercase"><UiText source={'Books & texts'} /></p>
                <p className="mt-1 font-serif text-lg font-semibold tabular-nums">{counts?.texts.toLocaleString() ?? '…'}</p>
                <p className="text-[11.5px] text-ink-soft"><UiText source={'{0} chapters'} values={[counts?.chapters ?? 0]} /></p>
              </Card>
              <Card className="p-3">
                <p className="text-[11px] font-bold text-ink-faint uppercase"><UiText source={'Flashcards'} /></p>
                <p className="mt-1 font-serif text-lg font-semibold tabular-nums">{counts?.notes.toLocaleString() ?? '…'}</p>
                <p className="text-[11.5px] text-ink-soft"><UiText source={'in {0} decks'} values={[counts?.decks ?? 0]} /></p>
              </Card>
              <Card className="p-3">
                <p className="text-[11px] font-bold text-ink-faint uppercase"><UiText source={'Media & audio'} /></p>
                <p className="mt-1 font-serif text-lg font-semibold tabular-nums">{counts?.blobs.toLocaleString() ?? '…'}</p>
                <p className="text-[11.5px] text-ink-soft"><UiText source={'{0} songs'} values={[counts?.songs ?? 0]} /></p>
              </Card>
            </div>
            <div className="mt-3 space-y-2">
              {media?.map((m) => <div key={m.kind} className="flex items-center justify-between gap-3 text-sm">
                <span>{mediaLabels[m.kind]} · {m.count} · {formatBytes(m.bytes)}</span>
                <Button variant="ghost" size="sm" disabled={busy || !m.count || removed.length > 0} icon={Trash2} onClick={() => setRemoving(m.kind)}>{translateUi('Delete saved {0}', [mediaLabels[m.kind]])}</Button>
              </div>)}
              {removed.length > 0 && <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
                <span><UiText source={'Deleted {0} files. Undo is available on this page.'} values={[removed.length]} /></span>
                <Button disabled={busy} onClick={() => void changeMedia()}><UiText source={'Undo'} /></Button>
              </div>}
            </div>
            <Dialog open={removing !== null} onClose={() => !busy && setRemoving(null)} title={translateUi('Delete {0}?', [removing ? mediaLabels[removing] : ''])} actions={<>
              <Button variant="secondary" disabled={busy} onClick={() => setRemoving(null)}><UiText source={'Cancel'} /></Button>
              <Button variant="danger" disabled={busy} onClick={() => removing && void changeMedia(removing)}><UiText source={'Delete'} /></Button>
            </>}>
              <p><UiText source={'These are saved files, not a cache. Deleting removes attachments across languages. Undo is available until you leave this page.'} /></p>
            </Dialog>
          </div>

          {/* Privacy & Destination Disclosures (6-25, F1544) */}
          <div className="mt-6 rounded-2xl border border-line bg-surface p-4.5">
            <div className="flex items-center gap-2 text-[14px] font-bold text-ink"><UiText source={'{0}Privacy & destinations: what travels where'} values={[<Lock size={15} className="text-sage-text" aria-hidden />]} /></div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft"><UiText source={'Saved content stays on this device. Online features send only the content they need.'} /></p>
            <ul className="mt-3 space-y-2 text-[12.5px] leading-snug text-ink-soft">
              <li className="flex items-start gap-2">
                <span className="font-semibold text-ink"><UiText source={'• AI requests:'} /></span>
                <span><UiText source={'AI sends your chosen text or audio to the selected provider using your key. That provider’s privacy and retention policies apply.'} /></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-ink"><UiText source={'• Translation:'} /></span>
                <span><UiText source={'Sent on demand to your chosen provider (MyMemory / Lingva) only when you look up a word; local pack dictionaries work 100% offline.'} /></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-ink"><UiText source={'• Speech & audio:'} /></span>
                <span><UiText source={'Local voices and Whisper work on this device. Online speech uses your selected provider; browser speech recognition may use the browser vendor’s servers.'} /></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-ink"><UiText source={'• Analytics & tracking:'} /></span>
                <span><UiText source={'Zero telemetry, zero third-party analytics, and zero tracking cookies.'} /></span>
              </li>
            </ul>
          </div>
        </>
      )}
    </SettingsSection>
  );
}
