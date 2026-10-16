import { useState } from 'react';
import { useNavigate } from 'react-router';
import { EpubError } from '@/services/import/epub';
import { importEpubFile, importGoodreads, importSample, importTxtFile } from '@/services/import/importers';
import { pickFile } from '@/services/files/files';
import { toast } from '@/state/ui';

export type ImportKind = 'epub' | 'txt' | 'goodreads' | 'sample';

/** Runs an import with progress and a friendly result toast. */
export function useImporter(lang: string) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<ImportKind | null>(null);

  const open = (id: string) => navigate(`/codex/read/${id}`);

  const run = async (kind: ImportKind, file?: File) => {
    try {
      if (kind === 'sample') {
        setBusy(kind);
        open(await importSample(lang));
        return;
      }
      const accept = kind === 'epub' ? '.epub,application/epub+zip' : kind === 'txt' ? '.txt,text/plain' : '.csv,text/csv';
      const chosen = file ?? (await pickFile(accept));
      if (!chosen) return;
      setBusy(kind);
      if (kind === 'goodreads') {
        const added = await importGoodreads(lang, chosen);
        toast(added ? `Added ${added} books to your shelves.` : 'Those books are already on your shelves.', { tone: 'success' });
        return;
      }
      const id = kind === 'epub' ? await importEpubFile(lang, chosen) : await importTxtFile(lang, chosen);
      toast('Added to your library.', { tone: 'success', action: { label: 'Read', onClick: () => open(id) } });
    } catch (error) {
      const message = error instanceof EpubError || error instanceof Error ? error.message : 'That file couldn’t be imported.';
      toast(message, { tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  return { busy, run };
}
