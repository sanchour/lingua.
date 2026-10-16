import { useState } from 'react';
import { useNavigate } from 'react-router';
import { readDeckTable } from '@/core/parsers/deckCsv';
import { decodeText } from '@/core/parsers/text';
import { importApkg } from '@/services/import/decks';
import { pickFile } from '@/services/files/files';
import { toast } from '@/state/ui';
import type { CsvSource } from './CsvImportDrawer';

/** Picks a CSV (then confirms its columns) or an Anki package (imported in the background). */
export function useDeckImport(lang: string) {
  const navigate = useNavigate();
  const [csv, setCsv] = useState<CsvSource | null>(null);
  const [apkgProgress, setApkgProgress] = useState<number | null>(null);

  const pickCsv = async () => {
    const file = await pickFile('.csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain');
    if (!file) return;
    try {
      const table = readDeckTable(decodeText(new Uint8Array(await file.arrayBuffer()), lang));
      if (!table.rows.length) throw new Error('That file is empty.');
      setCsv({ name: file.name.replace(/\.(csv|tsv|txt)$/i, ''), table });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'That file couldn’t be read.', { tone: 'error' });
    }
  };

  const pickApkg = async () => {
    const file = await pickFile('.apkg,.colpkg,application/zip,application/octet-stream');
    if (!file) return;
    setApkgProgress(0);
    try {
      const result = await importApkg(lang, file, setApkgProgress);
      const first = result.deckIds[0];
      toast(`Anki deck imported · ${result.cards.toLocaleString()} cards${result.media ? `, ${result.media} sounds and pictures` : ''}`, {
        tone: 'success',
        action: result.deckIds.length === 1 ? { label: 'Open', onClick: () => navigate(`/thesaurus/deck/${first}`) } : undefined,
      });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'The Anki deck couldn’t be imported.', { tone: 'error' });
    } finally {
      setApkgProgress(null);
    }
  };

  return { csv, closeCsv: () => setCsv(null), pickCsv, pickApkg, apkgProgress };
}
