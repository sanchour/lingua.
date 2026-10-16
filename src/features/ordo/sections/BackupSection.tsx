import { useState } from 'react';
import type { DragEvent } from 'react';
import { Archive, ArchiveRestore, Download, Share } from 'lucide-react';
import { BackupError, exportBackup, readBackup, restoreBackup } from '@/data/backup';
import type { ParsedBackup } from '@/data/backup';
import type { Settings } from '@/data/settings';
import { useLayout } from '@/design/hooks/useLayout';
import { Button, Dialog, ToggleRow } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { formatBytes, formatDateTime } from '@/lib/format';
import { canShareFile, downloadFile, pickFile, shareFile } from '@/services/files/files';
import { toast } from '@/state/ui';
import { SettingsSection } from '../SettingsSection';

const COUNT_LABELS: Array<[string, string]> = [
  ['words', 'words'],
  ['texts', 'books & texts'],
  ['notes', 'flashcards'],
  ['decks', 'decks'],
  ['media', 'audio & video'],
  ['reviewLogs', 'reviews'],
];

export function BackupSection({ meta }: { meta: Settings['meta'] }) {
  const { layout } = useLayout();
  const [includeMedia, setIncludeMedia] = useState(true);
  const [includeKeys, setIncludeKeys] = useState(false);
  const [busy, setBusy] = useState<'export' | 'read' | 'restore' | null>(null);
  const [ready, setReady] = useState<File | null>(null);
  const [incoming, setIncoming] = useState<ParsedBackup | null>(null);
  const [dragging, setDragging] = useState(false);

  const create = async () => {
    setBusy('export');
    try {
      const file = await exportBackup({ includeMedia, includeApiKeys: includeKeys });
      if (layout === 'compact' && canShareFile(file)) {
        // The share sheet needs a fresh tap, so the file is offered on a second button.
        setReady(file);
      } else {
        downloadFile(file);
        toast(`Backup saved (${formatBytes(file.size)}).`, { tone: 'success' });
      }
    } catch {
      toast('The backup could not be created.', { tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const share = async (file: File) => {
    try {
      const result = await shareFile(file, 'Lingua backup');
      if (result === 'shared') {
        toast('Backup shared.', { tone: 'success' });
        setReady(null);
      }
    } catch {
      downloadFile(file);
    }
  };

  const open = async (file: File | null) => {
    if (!file) return;
    setBusy('read');
    try {
      setIncoming(await readBackup(file));
    } catch (error) {
      toast(error instanceof BackupError ? error.message : 'That file could not be read.', { tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const restore = async (mode: 'merge' | 'replace') => {
    if (!incoming) return;
    setBusy('restore');
    try {
      const summary = await restoreBackup(incoming, mode);
      setIncoming(null);
      toast(
        mode === 'merge' ? `Merged: ${summary.added} added, ${summary.updated} updated.` : `Restored ${summary.added} items from the backup.`,
        { tone: 'success' },
      );
    } catch {
      toast('Restoring failed. Your data was left unchanged.', { tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void open(e.dataTransfer.files?.[0] ?? null);
  };

  const counts = incoming?.manifest.counts as Record<string, number> | undefined;

  return (
    <SettingsSection
      id="backup"
      icon={Archive}
      title="Backup & move devices"
      description="Make a backup on one device and restore it on the other to carry your words, decks and progress across."
    >
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cx('rounded-2xl border border-dashed p-4 transition-colors', dragging ? 'border-accent bg-accent-soft' : 'border-line-strong')}
      >
        <div className="flex flex-wrap gap-2">
          {ready ? (
            <>
              <Button icon={Share} onClick={() => void share(ready)}>
                Share backup
              </Button>
              <Button variant="secondary" icon={Download} onClick={() => downloadFile(ready)}>
                Save file
              </Button>
            </>
          ) : (
            <Button icon={Archive} onClick={() => void create()} loading={busy === 'export'}>
              Create backup
            </Button>
          )}
          <Button variant="secondary" icon={ArchiveRestore} loading={busy === 'read'} onClick={() => void pickFile('.zip,application/zip').then(open)}>
            Restore from file
          </Button>
        </div>
        <p className="mt-3 text-[13px] text-ink-soft">
          {meta.lastBackupAt ? `Last backup: ${formatDateTime(meta.lastBackupAt)}.` : 'No backup yet.'}
          {layout === 'wide' && ' You can also drop a backup file here.'}
        </p>
      </div>

      <div className="mt-2 divide-y divide-line">
        <ToggleRow title="Include audio, video and images" description="Bigger file; turn off to move only words and progress." checked={includeMedia} onChange={setIncludeMedia} />
        <ToggleRow title="Include API keys" description="Off by default so keys never leave this device by accident." checked={includeKeys} onChange={setIncludeKeys} />
      </div>

      <Dialog
        open={incoming !== null}
        onClose={() => busy !== 'restore' && setIncoming(null)}
        title="Restore this backup?"
        actions={
          <>
            <Button variant="ghost" onClick={() => setIncoming(null)} disabled={busy === 'restore'}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void restore('replace')} disabled={busy === 'restore'}>
              Replace
            </Button>
            <Button onClick={() => void restore('merge')} loading={busy === 'restore'} data-autofocus>
              Merge
            </Button>
          </>
        }
      >
        {incoming && (
          <>
            <p>Made {formatDateTime(incoming.manifest.exportedAt)}.</p>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-ink">
              {COUNT_LABELS.map(([key, label]) => (
                <li key={key}>
                  <span className="font-semibold tabular-nums">{(counts?.[key] ?? 0).toLocaleString()}</span> {label}
                </li>
              ))}
            </ul>
            <p className="mt-3">
              <strong className="text-ink">Merge</strong> keeps the newest version of everything from both devices.{' '}
              <strong className="text-ink">Replace</strong> discards what is on this device first.
            </p>
          </>
        )}
      </Dialog>
    </SettingsSection>
  );
}
