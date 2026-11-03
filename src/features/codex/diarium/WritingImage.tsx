import { useEffect, useState } from 'react';
import { blobUrl } from '@/data/library';
import { setWritingImage } from '@/data/writingTools';
import type { JournalEntry } from '@/data/types';
import { UiText, useUi } from '@/design/i18n/UiText';
import { Button } from '@/design/primitives';
import { pickFile } from '@/services/files/files';

export function WritingImage({ entry }: { entry: JournalEntry }) {
  const ui = useUi();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true; let current: string | null = null;
    setUrl(null); setError('');
    if (entry.pictureBlobId) void blobUrl(entry.pictureBlobId).then((u) => { if (alive) { current = u; setUrl(u); if (!u) setError('This picture is missing on this device. Restore a backup that includes images.'); } else if (u) URL.revokeObjectURL(u); }).catch(() => { if (alive) setError('The picture could not be opened.'); });
    return () => { alive = false; if (current) URL.revokeObjectURL(current); };
  }, [entry.pictureBlobId]);
  const choose = async () => {
    const file = await pickFile('image/png,image/jpeg,image/webp,image/gif');
    if (!file) return;
    setBusy(true); setError('');
    try { await setWritingImage(entry.id, file); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not save the picture.'); }
    finally { setBusy(false); }
  };
  return <details open={entry.writingTaskId === 'picture' || Boolean(entry.pictureBlobId)} className="mb-5 rounded-xl border border-line p-4"><summary className="cursor-pointer font-semibold"><UiText source="Picture to describe" /></summary>
    <p className="my-3 text-sm text-ink-soft"><UiText source="Your picture stays on this device and in media backups. AI receives only your writing and prompt." /></p>
    {url && <img src={url} alt={ui('Picture to describe')} className="mb-4 max-h-80 max-w-full rounded-lg object-contain" />}
    <div className="flex gap-3"><Button size="sm" variant="secondary" loading={busy} onClick={() => void choose()}><UiText source="Choose picture" /></Button>{entry.pictureBlobId && <Button size="sm" variant="ghost" disabled={busy} onClick={() => void setWritingImage(entry.id, null).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))}><UiText source="Remove picture" /></Button>}</div>
    {error && <p role="alert" className="mt-3 text-sm text-accent-text"><UiText source={error} /></p>}
  </details>;
}
