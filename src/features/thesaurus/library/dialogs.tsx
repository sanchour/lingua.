import { UiText, useUi } from '@/design/i18n/UiText';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Deck, Folder } from '@/data/types';
import { Button, Dialog, Select } from '@/design/primitives';

const NO_FOLDER = '__none';

export function folderOptions(folders: Folder[], exclude?: string) {
  const depth = (f: Folder): number => (f.parentId ? 1 + depth(folders.find((p) => p.id === f.parentId) ?? { ...f, parentId: null }) : 0);
  return [
    { value: NO_FOLDER, label: 'No folder' },
    ...folders.filter((f) => f.id !== exclude).map((f) => ({ value: f.id, label: `${'  '.repeat(depth(f))}${f.name}` })),
  ];
}

export interface NameRequest {
  title: string;
  label: string;
  initial?: string;
  confirm: string;
  /** Offer a folder choice (new deck, new folder). */
  folders?: Folder[];
  folderId?: string | null;
  onConfirm: (name: string, folderId: string | null) => void | Promise<void>;
}

/** Asks for a name (and optionally a folder): new deck, new folder, rename. */
export function NameDialog({ request, onClose }: { request: NameRequest | null; onClose: () => void }) {
  const translateUi = useUi();
  const [name, setName] = useState('');
  const [folder, setFolder] = useState<string>(NO_FOLDER);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!request) return;
    setName(request.initial ?? '');
    setFolder(request.folderId ?? NO_FOLDER);
    setBusy(false);
    const t = window.setTimeout(() => input.current?.select(), 60);
    return () => window.clearTimeout(t);
  }, [request]);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!request || !name.trim()) return;
    setBusy(true);
    await request.onConfirm(name.trim(), folder === NO_FOLDER ? null : folder);
    onClose();
  };

  return (
    <Dialog
      open={Boolean(request)}
      onClose={onClose}
      title={request?.title ?? ''}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}><UiText source={'Cancel'} /></Button>
          <Button onClick={() => void submit()} disabled={!name.trim()} loading={busy}>
            {request?.confirm}
          </Button>
        </>
      }
    >
      <form onSubmit={(e) => void submit(e)} className="space-y-4 pt-2">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-bold tracking-wide text-ink-soft uppercase">{request?.label}</span>
          <input
            ref={input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className="h-11 w-full rounded-xl border border-line bg-bg px-3.5 text-[15px] font-medium text-ink outline-none focus:border-accent"
          />
        </label>
        {request?.folders && request.folders.length > 0 && (
          <Select label={translateUi('Folder')} value={folder} onChange={setFolder} options={folderOptions(request.folders)} />
        )}
      </form>
    </Dialog>
  );
}

export interface ConfirmRequest {
  title: string;
  body: string;
  confirm: string;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({ request, onClose }: { request: ConfirmRequest | null; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  useEffect(() => setBusy(false), [request]);
  return (
    <Dialog
      open={Boolean(request)}
      onClose={onClose}
      title={request?.title ?? ''}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}><UiText source={'Cancel'} /></Button>
          <Button
            variant="danger"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              await request?.onConfirm();
              onClose();
            }}
          >
            {request?.confirm}
          </Button>
        </>
      }
    >
      {request?.body}
    </Dialog>
  );
}

export interface MergeRequest {
  title: string;
  /** The decks it can be merged into. */
  decks: Deck[];
  /** The button, and the field's label; a merge by default. */
  confirm?: string;
  label?: string;
  onConfirm: (deckId: string) => void | Promise<void>;
}

/** Folding one deck into another: its cards go into the chosen deck and it is put away. */
export function MergeDialog({ request, onClose }: { request: MergeRequest | null; onClose: () => void }) {
  const translateUi = useUi();
  const [target, setTarget] = useState('');
  useEffect(() => setTarget(request?.decks[0]?.id ?? ''), [request]);
  const none = !request?.decks.length;
  return (
    <Dialog
      open={Boolean(request)}
      onClose={onClose}
      title={request?.title ?? ''}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}><UiText source={'Cancel'} /></Button>
          <Button
            disabled={none}
            onClick={async () => {
              await request?.onConfirm(target);
              onClose();
            }}
          >
            {request?.confirm ?? translateUi('Merge')}
          </Button>
        </>
      }
    >
      <div className="pt-2">
        {none ? <p className="text-[14px] text-ink-soft"><UiText source={'There is no other deck in this language.'} /></p> : <Select label={request?.label ?? translateUi('Into')} value={target} onChange={setTarget} options={(request?.decks ?? []).map((d) => ({ value: d.id, label: d.name }))} />}
      </div>
    </Dialog>
  );
}

export interface MoveRequest {
  title: string;
  folders: Folder[];
  current: string | null;
  /** A folder can't move into itself. */
  exclude?: string;
  onConfirm: (folderId: string | null) => void | Promise<void>;
}

export function MoveDialog({ request, onClose }: { request: MoveRequest | null; onClose: () => void }) {
  const translateUi = useUi();
  const [folder, setFolder] = useState<string>(NO_FOLDER);
  useEffect(() => setFolder(request?.current ?? NO_FOLDER), [request]);
  return (
    <Dialog
      open={Boolean(request)}
      onClose={onClose}
      title={request?.title ?? ''}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}><UiText source={'Cancel'} /></Button>
          <Button
            onClick={async () => {
              await request?.onConfirm(folder === NO_FOLDER ? null : folder);
              onClose();
            }}
          ><UiText source={'Move'} /></Button>
        </>
      }
    >
      <div className="pt-2">
        <Select label={translateUi('Folder')} value={folder} onChange={setFolder} options={request ? folderOptions(request.folders, request.exclude) : []} />
      </div>
    </Dialog>
  );
}
