import { UiText, useUi } from '@/design/i18n/UiText';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { parseQuizletToTable } from '@/core/parsers/quizlet';
import { guessColumns, ROLE_LABELS, tableToNotes } from '@/core/parsers/deckCsv';
import type { ColumnRole, DeckTable } from '@/core/parsers/deckCsv';
import type { Folder } from '@/data/types';
import { Button, Drawer, Select, ToggleRow } from '@/design/primitives';
import { importCsvDeck } from '@/services/import/decks';
import { toast } from '@/state/ui';
import { folderOptions } from './dialogs';

export interface CsvSource {
  name: string;
  table: DeckTable;
  rawText?: string;
}

const ROLES = Object.keys(ROLE_LABELS) as ColumnRole[];
const NO_FOLDER = '__none';

/** Confirms how a spreadsheet maps onto cards (columns are guessed), then imports it as a deck. */
export function CsvImportDrawer({ lang, source, folders, onClose }: { lang: string; source: CsvSource | null; folders: Folder[]; onClose: () => void }) {
  const translateUi = useUi();
  const navigate = useNavigate();
  const [termSeparator, setTermSeparator] = useState('');
  const [rowSeparator, setRowSeparator] = useState('\\n');
  const [header, setHeader] = useState(false);
  const [roles, setRoles] = useState<ColumnRole[]>([]);
  const [name, setName] = useState('');
  const [folder, setFolder] = useState(NO_FOLDER);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!source) return;
    setTermSeparator(''); setRowSeparator('\\n');
    setHeader(source.table.header);
    setRoles(guessColumns(source.table));
    setName(source.name);
    setFolder(NO_FOLDER);
  }, [source]);

  const custom = useMemo(() => source?.rawText && termSeparator ? parseQuizletToTable(source.rawText, { termDelimiter: termSeparator.replace(/\\t/g, '\t'), rowDelimiter: rowSeparator.replace(/\\n/g, '\n') || '\n' }) : null, [source, termSeparator, rowSeparator]);
  useEffect(() => { if (custom) { setRoles(['term', 'meaning']); setHeader(false); } }, [custom]);
  const table = useMemo(() => (source ? { ...(custom ?? source.table), header } : null), [source, custom, header]);
  const notes = useMemo(() => (table ? tableToNotes(table, roles) : []), [table, roles]);
  const preview = table ? table.rows.slice(header ? 1 : 0, (header ? 1 : 0) + 6) : [];
  const width = roles.length;

  const setRole = (i: number, role: ColumnRole) =>
    setRoles((prev) => prev.map((r, k) => (k === i ? role : role !== 'ignore' && role !== 'tags' && r === role ? 'ignore' : r)));

  const run = async () => {
    setBusy(true);
    try {
      const { deckId, added } = await importCsvDeck(lang, name.trim() || 'Imported deck', folder === NO_FOLDER ? null : folder, notes);
      onClose();
      toast({ source: '{0} imported · {1} cards', values: [String(name), String(added.toLocaleString())] }, { tone: 'success', action: { label: 'Open', onClick: () => navigate(`/thesaurus/deck/${deckId}`) } });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'The file couldn’t be imported.', { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      open={Boolean(source)}
      onClose={onClose}
      title={translateUi('Import a word list')}
      description={translateUi('Check which column is which. The first rows are shown below.')}
      footer={
        <Button block size="lg" iconRight={ArrowRight} disabled={!notes.length || !roles.includes('term')} loading={busy} onClick={() => void run()}>
          {notes.length ? translateUi('Import {0} {1}', [notes.length.toLocaleString(), notes.length === 1 ? 'card' : 'cards']) : translateUi('Choose a Word column')}
        </Button>
      }
    >
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-bold tracking-wide text-ink-soft uppercase"><UiText source={'Deck name'} /></span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-11 w-full rounded-xl border border-line bg-bg px-3.5 text-[15px] font-medium outline-none focus:border-accent"
        />
      </label>
      {folders.length > 0 && (
        <div className="mt-3">
          <Select label={translateUi('Folder')} value={folder} onChange={setFolder} options={folderOptions(folders)} />
        </div>
      )}
      {source?.rawText && <details className="mt-4 text-sm"><summary className="cursor-pointer"><UiText source="Custom separators" /></summary><div className="mt-2 grid grid-cols-2 gap-3">
        <label><UiText source="Term separator" /><input className="mt-1 w-full rounded-lg border border-line bg-raised p-2" value={termSeparator} onChange={(e) => setTermSeparator(e.target.value)} /></label>
        <label><UiText source="Row separator" /><input className="mt-1 w-full rounded-lg border border-line bg-raised p-2" value={rowSeparator} onChange={(e) => setRowSeparator(e.target.value)} /></label>
      </div></details>}
      <div className="mt-2 border-b border-line">
        <ToggleRow title={translateUi('First row is a header')} checked={header} onChange={setHeader} />
      </div>

      <div className="mt-4 -mx-6 overflow-x-auto px-6">
        <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {Array.from({ length: width }, (_, i) => (
                <th key={i} className="min-w-36 pr-2 pb-2 text-left align-bottom font-normal">
                  {header && <span className="mb-1 block truncate text-[12px] font-semibold text-ink-faint">{table?.rows[0][i]}</span>}
                  <Select label={translateUi('Column {0}', [i + 1])} hideLabel value={roles[i] ?? 'ignore'} onChange={(r) => setRole(i, r)} options={ROLES.map((r) => ({ value: r, label: translateUi(ROLE_LABELS[r]) }))} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, r) => (
              <tr key={r}>
                {Array.from({ length: width }, (_, i) => (
                  <td key={i} lang={roles[i] === 'term' || roles[i] === 'example' ? lang : undefined} className={`max-w-56 truncate border-t border-line/60 py-2 pr-3 ${roles[i] === 'ignore' ? 'text-ink-faint' : ''}`}>
                    {row[i]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Drawer>
  );
}
