import { useState } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronRight, Ellipsis, Folder as FolderIcon, FolderInput, FolderPlus, Pencil, Plus, Trash2 } from 'lucide-react';
import type { DeckCounts } from '@/data/decks';
import { deleteDeck, deleteFolder, updateDeck, updateFolder } from '@/data/decks';
import type { DeckSort } from '@/data/settings';
import type { Deck, Folder } from '@/data/types';
import { MenuItem, Popover } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { DeckGlyph } from '../common/DeckIcon';
import type { ConfirmRequest, MoveRequest, NameRequest } from './dialogs';

export interface TreeActions {
  ask: (request: NameRequest) => void;
  confirm: (request: ConfirmRequest) => void;
  move: (request: MoveRequest) => void;
  newDeck: (folderId: string | null) => void;
}

interface TreeProps {
  decks: Deck[];
  folders: Folder[];
  counts: Map<string, DeckCounts> | undefined;
  actions: TreeActions;
  order: Order;
}

/** How decks and folders are ordered at every level of the tree. */
interface Order {
  decks: (a: Deck, b: Deck) => number;
  folders: (a: Folder, b: Folder) => number;
}

const sum = (list: Array<DeckCounts | undefined>) =>
  list.reduce<DeckCounts>((a, c) => (c ? { total: a.total + c.total, new: a.new + c.new, learning: a.learning + c.learning, due: a.due + c.due } : a), { total: 0, new: 0, learning: 0, due: 0 });

const work = (c: DeckCounts | undefined) => (c ? c.due + c.learning + c.new : 0);

/** Builds the ordering for a sort choice; folders follow the decks inside them. */
export function deckOrder(sort: DeckSort, decks: Deck[], folders: Folder[], counts: Map<string, DeckCounts> | undefined, lastStudied: Map<string, number> | undefined): Order {
  const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });
  const byName = (a: { name: string }, b: { name: string }) => collator.compare(a.name, b.name);
  const metric = (d: Deck): number =>
    sort === 'due' ? work(counts?.get(d.id)) : sort === 'size' ? (counts?.get(d.id)?.total ?? 0) : sort === 'recent' ? (lastStudied?.get(d.id) ?? 0) : 0;
  const inside = (f: Folder): Deck[] => [...decks.filter((d) => d.folderId === f.id), ...folders.filter((c) => c.parentId === f.id).flatMap(inside)];
  const folderMetric = (f: Folder): number => {
    const values = inside(f).map(metric);
    return sort === 'recent' ? Math.max(0, ...values) : values.reduce((a, b) => a + b, 0);
  };
  if (sort === 'name') return { decks: byName, folders: byName };
  return { decks: (a, b) => metric(b) - metric(a) || byName(a, b), folders: (a, b) => folderMetric(b) - folderMetric(a) || byName(a, b) };
}

/** Folders (collapsible, nested) and decks, in the chosen order. */
export function DeckTree({ decks, folders, counts, actions, order }: TreeProps) {
  const roots = folders.filter((f) => !f.parentId || !folders.some((p) => p.id === f.parentId)).sort(order.folders);
  const loose = decks.filter((d) => !d.folderId || !folders.some((f) => f.id === d.folderId)).sort(order.decks);
  return (
    <div className="divide-y divide-line/60 rounded-3xl border border-line/70 bg-surface p-1.5">
      {roots.map((f) => (
        <FolderGroup key={f.id} folder={f} depth={0} {...{ decks, folders, counts, actions, order }} />
      ))}
      {loose.map((d) => (
        <DeckRow key={d.id} deck={d} counts={counts?.get(d.id)} depth={0} folders={folders} actions={actions} />
      ))}
    </div>
  );
}

function FolderGroup({ folder, depth, decks, folders, counts, actions, order }: TreeProps & { folder: Folder; depth: number }) {
  const [open, setOpen] = useState(true);
  const children = folders.filter((f) => f.parentId === folder.id).sort(order.folders);
  const own = decks.filter((d) => d.folderId === folder.id).sort(order.decks);
  const descendants = (f: Folder): Deck[] => [...decks.filter((d) => d.folderId === f.id), ...folders.filter((c) => c.parentId === f.id).flatMap(descendants)];
  const total = sum(descendants(folder).map((d) => counts?.get(d.id)));
  const empty = !children.length && !own.length;

  return (
    <div>
      <div className="group flex items-center gap-1 rounded-2xl pr-1.5 transition-colors hover:bg-raised/60" style={{ paddingLeft: depth * 20 }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="no-callout flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left"
        >
          <ChevronRight size={16} className={cx('shrink-0 text-ink-faint transition-transform duration-200', open && 'rotate-90')} aria-hidden />
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sunken text-ink-soft">
            <FolderIcon size={17} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold">{folder.name}</span>
            <span className="block text-[12.5px] text-ink-faint">
              {empty ? 'Empty' : `${descendants(folder).length} ${descendants(folder).length === 1 ? 'deck' : 'decks'}`}
            </span>
          </span>
          <Counts counts={total} />
        </button>
        <Popover
          label="Folder options"
          placement="bottom-end"
          className="w-60"
          trigger={(props) => <OptionsButton {...props} label={`${folder.name} options`} />}
        >
          {(close) => (
            <div className="space-y-0.5">
              <MenuItem icon={Plus} label="New deck here" onClick={() => (close(), actions.newDeck(folder.id))} />
              <MenuItem
                icon={Pencil}
                label="Rename"
                onClick={() => {
                  close();
                  actions.ask({ title: 'Rename folder', label: 'Name', initial: folder.name, confirm: 'Rename', onConfirm: (name) => updateFolder(folder.id, { name }) });
                }}
              />
              <MenuItem
                icon={FolderInput}
                label="Move into…"
                onClick={() => {
                  close();
                  actions.move({ title: `Move “${folder.name}”`, folders, current: folder.parentId, exclude: folder.id, onConfirm: (parentId) => updateFolder(folder.id, { parentId }) });
                }}
              />
              <MenuItem
                icon={Trash2}
                label="Delete folder"
                danger
                onClick={() => {
                  close();
                  actions.confirm({
                    title: `Delete “${folder.name}”?`,
                    body: 'The folder goes away; its decks and folders move up a level. No cards are deleted.',
                    confirm: 'Delete folder',
                    onConfirm: () => deleteFolder(folder.id),
                  });
                }}
              />
            </div>
          )}
        </Popover>
      </div>
      <AnimatePresence initial={false}>
        {open && !empty && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.1 } }} transition={spring.snappy}>
            {children.map((f) => (
              <FolderGroup key={f.id} folder={f} depth={depth + 1} {...{ decks, folders, counts, actions, order }} />
            ))}
            {own.map((d) => (
              <DeckRow key={d.id} deck={d} counts={counts?.get(d.id)} depth={depth + 1} folders={folders} actions={actions} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Search results: matching decks in a flat list, each with the folder it lives in. */
export function DeckResults({ decks, folders, counts, actions }: Omit<TreeProps, 'order'>) {
  const pathOf = (d: Deck) => {
    const names: string[] = [];
    let f = folders.find((x) => x.id === d.folderId);
    while (f) {
      names.unshift(f.name);
      const parent = f.parentId;
      f = parent ? folders.find((x) => x.id === parent) : undefined;
    }
    return names.join(' / ');
  };
  return (
    <div className="divide-y divide-line/60 rounded-3xl border border-line/70 bg-surface p-1.5">
      {decks.map((d) => (
        <DeckRow key={d.id} deck={d} counts={counts?.get(d.id)} depth={0} folders={folders} actions={actions} path={pathOf(d)} />
      ))}
    </div>
  );
}

function DeckRow({ deck, counts, depth, folders, actions, path }: { deck: Deck; counts?: DeckCounts; depth: number; folders: Folder[]; actions: TreeActions; path?: string }) {
  return (
    <div className="group flex items-center gap-1 rounded-2xl pr-1.5 transition-colors hover:bg-raised/60" style={{ paddingLeft: depth * 20 + (depth ? 26 : 0) }}>
      <Link to={`/thesaurus/deck/${deck.id}`} className="no-callout flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-2.5 py-2.5">
        <DeckGlyph deck={deck} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{deck.name}</span>
          <span className="block truncate text-[12.5px] text-ink-faint">
            {path && <>{path} · </>}
            {counts ? `${counts.total.toLocaleString()} ${counts.total === 1 ? 'card' : 'cards'}` :' '}</span>
        </span>
        {counts && <Counts counts={counts} />}
      </Link>
      <Popover label="Deck options" placement="bottom-end" className="w-60" trigger={(props) => <OptionsButton {...props} label={`${deck.name} options`} />}>
        {(close) => (
          <div className="space-y-0.5">
            <MenuItem
              icon={Pencil}
              label="Rename"
              onClick={() => {
                close();
                actions.ask({ title: 'Rename deck', label: 'Name', initial: deck.name, confirm: 'Rename', onConfirm: (name) => updateDeck(deck.id, { name }) });
              }}
            />
            <MenuItem
              icon={folders.length ? FolderInput : FolderPlus}
              label="Move to folder…"
              onClick={() => {
                close();
                actions.move({ title: `Move “${deck.name}”`, folders, current: deck.folderId, onConfirm: (folderId) => updateDeck(deck.id, { folderId }) });
              }}
            />
            <MenuItem
              icon={Trash2}
              label="Delete deck"
              danger
              onClick={() => {
                close();
                actions.confirm({
                  title: `Delete “${deck.name}”?`,
                  body:
                    deck.kind === 'mined'
                      ? 'Its cards and their review history go. Words stay marked as Learning in your books; marking a word again makes a new card.'
                      : 'Its cards and their review history go. Words you know stay known in your books.',
                  confirm: 'Delete deck',
                  onConfirm: () => deleteDeck(deck.id),
                });
              }}
            />
          </div>
        )}
      </Popover>
    </div>
  );
}

function OptionsButton({ label, ...props }: { label: string } & Record<string, unknown>) {
  return (
    <button
      {...props}
      type="button"
      aria-label={label}
      className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-faint opacity-100 transition-[opacity,background-color,color] hover:bg-surface hover:text-ink group-hover:opacity-100 pointer-fine:opacity-0 pointer-fine:focus-visible:opacity-100 pointer-fine:aria-expanded:opacity-100 pointer-coarse:size-10"
    >
      <Ellipsis size={17} aria-hidden />
    </button>
  );
}

/** Due reviews in amber/terracotta, new cards in sage; nothing when there's nothing to do. */
export function Counts({ counts }: { counts: DeckCounts }) {
  const due = counts.due + counts.learning;
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-[12.5px] font-bold tabular-nums">
      {due > 0 && (
        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-accent-text" title={`${due} to review`}>
          {due.toLocaleString()}
        </span>
      )}
      {counts.new > 0 && (
        <span className="rounded-full bg-sage-soft px-2 py-0.5 text-sage-text" title={`${counts.new} new`}>
          {counts.new.toLocaleString()}
        </span>
      )}
    </span>
  );
}
