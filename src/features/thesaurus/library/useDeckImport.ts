import { useState } from 'react';
import { useNavigate } from 'react-router';
import { readDeckTable } from '@/core/parsers/deckCsv';
import type { DeckTable } from '@/core/parsers/deckCsv';
import { kindleClippingsToNotes, looksLikeKindleClippings, parseKindleClippings } from '@/core/parsers/kindle';
import { parseMarkdownDocument } from '@/core/parsers/markdownImport';
import { parseQuizletToTable } from '@/core/parsers/quizlet';
import { decodeText } from '@/core/parsers/text';
import { importApkg } from '@/services/import/decks';
import { pickFile } from '@/services/files/files';
import { toast } from '@/state/ui';
import type { CsvSource } from './CsvImportDrawer';

export function readAnyDeckFileTable(rawText: string, fileName = ''): DeckTable {
  if (looksLikeKindleClippings(rawText)) {
    const notes = kindleClippingsToNotes(parseKindleClippings(rawText));
    return {
      header: false,
      delimiter: '\t',
      rows: notes.map((n) => [n.term, n.meaning, n.example?.text ?? '', (n.tags ?? []).join(' ')]),
    };
  }
  if (/\.(md|markdown)$/i.test(fileName) || /^---\r?\n/.test(rawText) || /\[\[[^[\]]+\]\]/.test(rawText)) {
    const md = parseMarkdownDocument(rawText);
    if (md.notes.length > 0) {
      return {
        header: false,
        delimiter: '\t',
        rows: md.notes.map((n) => [n.term, n.meaning, n.example?.text ?? '', (n.tags ?? []).join(' ')]),
      };
    }
  }
  const csvTable = readDeckTable(rawText);
  if (csvTable.rows.length > 0 && (csvTable.rows[0]?.length ?? 0) >= 2) {
    return csvTable;
  }
  const quizlet = parseQuizletToTable(rawText);
  if (quizlet.rows.length > 0) return quizlet;
  return csvTable;
}

/** Picks a CSV, Quizlet export, Markdown file, or Kindle My Clippings.txt (then confirms its columns) or an Anki package. */
export function useDeckImport(lang: string) {
  const navigate = useNavigate();
  const [csv, setCsv] = useState<CsvSource | null>(null);
  const [apkgProgress, setApkgProgress] = useState<number | null>(null);

  const pickCsv = async () => {
    const file = await pickFile('.csv,.tsv,.txt,.md,text/csv,text/tab-separated-values,text/plain,text/markdown');
    if (!file) return;
    try {
      const text = decodeText(new Uint8Array(await file.arrayBuffer()), lang);
      const table = readAnyDeckFileTable(text, file.name);
      if (!table.rows.length) throw new Error('That file is empty.');
      setCsv({ name: file.name.replace(/\.(csv|tsv|txt|md|markdown)$/i, ''), table, rawText: text });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'That file couldn’t be read.', { tone: 'error', duration: 10000 });
    }
  };

  const pickApkg = async () => {
    const file = await pickFile('.apkg,.colpkg,application/zip,application/octet-stream');
    if (!file) return;
    setApkgProgress(0);
    try {
      const result = await importApkg(lang, file, setApkgProgress);
      const first = result.deckIds[0];
      toast({ source: 'Anki deck imported · {0} cards{1}', values: [String(result.cards.toLocaleString()), result.media ? { source: ', {0} sounds and pictures', values: [String(result.media)] } : String('')] }, {
        tone: 'success',
        action: result.deckIds.length === 1 ? { label: 'Open', onClick: () => navigate(`/thesaurus/deck/${first}`) } : undefined,
      });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'The Anki deck couldn’t be imported.', { tone: 'error', duration: 10000 });
    } finally {
      setApkgProgress(null);
    }
  };

  return { csv, closeCsv: () => setCsv(null), pickCsv, pickApkg, apkgProgress };
}
