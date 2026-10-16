import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight } from 'lucide-react';
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
}

const ROLES = Object.keys(ROLE_LABELS) as ColumnRole[];
const NO_FOLDER = '__none';

/** Confirms how a spreadsheet maps onto cards (columns are guessed), then imports it as a deck. */
export function CsvImportDrawer({ lang, source, folders, onClose }: { lang: string; source: CsvSource | null; folders: Folder[]; onClose: () => void }) {
  const navigate = useNavigate();
  const [header, setHeader] = useState(false);
  const [roles, setRoles] = useState<ColumnRole[]>([]);
  const [name, setName] = useState('');
  const [folder, setFolder] = useState(NO_FOLDER);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!source) return;
    setHeader(source.table.header);
    setRoles(guessColumns(source.table));
    setName(source.name);
    setFolder(NO_FOLDER);
  }, [source]);

  const table = useMemo(() => (source ? { ...source.table, header } : null), [source, header]);
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
      toast(`${name} imported · ${added.toLocaleString()} cards`, { tone: 'success', action: { label: 'Open', onClick: () => navigate(`/thesaurus/deck/${deckId}`) } });
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
      title="Import a word list"
      description="Check which column is which. The first rows are shown below."
      footer={
        <Button block size="lg" iconRight={ArrowRight} disabled={!notes.length || !roles.includes('term')} loading={busy} onClick={() => void run()}>
          {notes.length ? `Import ${notes.length.toLocaleString()} ${notes.length === 1 ? 'card' : 'cards'}` : 'Choose a Word column'}
        </Button>
      }
    >
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-bold tracking-wide text-ink-soft uppercase">Deck name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-11 w-full rounded-xl border border-line bg-bg px-3.5 text-[15px] font-medium outline-none focus:border-accent"
        />
      </label>
      {folders.length > 0 && (
        <div className="mt-3">
          <Select label="Folder" value={folder} onChange={setFolder} options={folderOptions(folders)} />
        </div>
      )}
      <div className="mt-2 border-b border-line">
        <ToggleRow title="First row is a header" checked={header} onChange={setHeader} />
      </div>

      <div className="mt-4 -mx-6 overflow-x-auto px-6">
        <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {Array.from({ length: width }, (_, i) => (
                <th key={i} className="min-w-36 pr-2 pb-2 text-left align-bottom font-normal">
                  {header && <span className="mb-1 block truncate text-[12px] font-semibold text-ink-faint">{table?.rows[0][i]}</span>}
                  <Select label={`Column ${i + 1}`} hideLabel value={roles[i] ?? 'ignore'} onChange={(r) => setRole(i, r)} options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))} />
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
