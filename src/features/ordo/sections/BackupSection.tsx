import { UiText, useUi } from '@/design/i18n/UiText';
import { useState } from 'react';
import type { DragEvent } from 'react';
import { Archive, ArchiveRestore, BookCheck, Download, Share } from 'lucide-react';
import { BackupError, exportBackup, readBackup, restoreBackup } from '@/data/backup';
import { finishedBooksCsv } from '@/data/library';
import type { ParsedBackup } from '@/data/backup';
import type { Settings } from '@/data/settings';
import { useApp } from '@/app/context';
import { useLayout } from '@/design/hooks/useLayout';
import { Button, Dialog, ToggleRow } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { formatBytes, formatDateTime } from '@/lib/format';
import { canShareFile, downloadFile, pickFile, shareFile } from '@/services/files/files';
import { toast } from '@/state/ui';
import { SettingsSection } from '../SettingsSection';
import { ExportDataPanel } from './ExportDataPanel';

const COUNT_LABELS: Array<[string, string]> = [
  ['words', 'words'],
  ['texts', 'books & texts'],
  ['notes', 'flashcards'],
  ['decks', 'decks'],
  ['media', 'audio & video'],
  ['reviewLogs', 'reviews'],
];

export function BackupSection({ meta }: { meta: Settings['meta'] }) {
  const translateUi = useUi();
  const { language } = useApp();
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
      title={translateUi('Backup & move devices')}
      description={translateUi('Make a backup on one device and restore it on the other to carry your words, decks and progress across.')}
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
              <Button icon={Share} onClick={() => void share(ready)}><UiText source={'Share backup'} /></Button>
              <Button variant="secondary" icon={Download} onClick={() => downloadFile(ready)}><UiText source={'Save file'} /></Button>
            </>
          ) : (
            <Button icon={Archive} onClick={() => void create()} loading={busy === 'export'}><UiText source={'Create backup'} /></Button>
          )}
          <Button variant="secondary" icon={ArchiveRestore} loading={busy === 'read'} onClick={() => void pickFile('.zip,application/zip').then(open)}><UiText source={'Restore from file'} /></Button>
        </div>
        <p className="mt-3 text-[13px] text-ink-soft">
          {meta.lastBackupAt ? translateUi('Last backup: {0}.', [formatDateTime(meta.lastBackupAt)]) : translateUi('No backup yet.')}
          {layout === 'wide' && translateUi(' You can also drop a backup file here.')}
        </p>
      </div>

      <div className="mt-2 divide-y divide-line">
        <ToggleRow title={translateUi('Include audio, video and images')} description={translateUi('Bigger file; turn off to move only words and progress.')} checked={includeMedia} onChange={setIncludeMedia} />
        <ToggleRow title={translateUi('Include API keys')} description={translateUi('Off by default so keys never leave this device by accident.')} checked={includeKeys} onChange={setIncludeKeys} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-sunken/50 p-4">
        <div className="min-w-[14rem] flex-1">
          <p className="font-semibold"><UiText source={'Books for Goodreads'} /></p>
          <p data-hint="" className="text-[13px] text-ink-soft"><UiText source={'The books you finished in Lingua as a CSV. On Goodreads: My Books → Import and export.'} /></p>
        </div>
        <Button
          variant="secondary"
          icon={BookCheck}
          onClick={async () => {
            const { file, count } = await finishedBooksCsv();
            if (!count) return toast('No finished books yet. Mark a book as finished in Codex first.');
            downloadFile(file);
            toast(`Saved ${count} ${count === 1 ? 'book' : 'books'} for Goodreads.`, { tone: 'success' });
          }}
        ><UiText source={'Export finished books'} /></Button>
      </div>

      <ExportDataPanel language={language} />

      <Dialog
        open={incoming !== null}
        onClose={() => busy !== 'restore' && setIncoming(null)}
        title={translateUi('Restore this backup?')}
        actions={
          <>
            <Button variant="ghost" onClick={() => setIncoming(null)} disabled={busy === 'restore'}><UiText source={'Cancel'} /></Button>
            <Button variant="danger" onClick={() => void restore('replace')} disabled={busy === 'restore'}><UiText source={'Replace'} /></Button>
            <Button onClick={() => void restore('merge')} loading={busy === 'restore'} data-autofocus><UiText source={'Merge'} /></Button>
          </>
        }
      >
        {incoming && (
          <>
            <p><UiText source={'Made {0}.'} values={[formatDateTime(incoming.manifest.exportedAt)]} /></p>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-ink">
              {COUNT_LABELS.map(([key, label]) => (
                <li key={key}>
                  <span className="font-semibold tabular-nums">{(counts?.[key] ?? 0).toLocaleString()}</span> {label}
                </li>
              ))}
            </ul>
            <p className="mt-3"><UiText source={'{0} keeps the newest version of everything from both devices.{1}{2} discards what is on this device first.'} values={[<strong className="text-ink"><UiText source={'Merge'} /></strong>, ' ', <strong className="text-ink"><UiText source={'Replace'} /></strong>]} /></p>
          </>
        )}
      </Dialog>
    </SettingsSection>
  );
}
