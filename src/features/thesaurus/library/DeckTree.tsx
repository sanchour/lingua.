import { UiText, useUi } from '@/design/i18n/UiText';
import { useState } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, ChevronRight, Combine, Copy, Ellipsis, Folder as FolderIcon, FolderInput, FolderPlus, Layers, Pencil, Pin, PinOff, Plus, Puzzle, Trash2 } from 'lucide-react';
import type { DeckCounts } from '@/data/decks';
import { deleteDeck, deleteFolder, updateDeck, updateFolder } from '@/data/decks';
import { duplicateDeck, setDeckFlag, shiftDeck } from '@/data/deckTools';
import type { DeckSort } from '@/data/settings';
import type { Deck, Folder } from '@/data/types';
import { buttonClasses, MenuItem, Popover } from '@/design/primitives';
import { spring } from '@/design/motion';
import { useGate } from '@/features/plans/PlanRoute';
import { cx } from '@/lib/cx';
import { DeckGlyph } from '../common/DeckIcon';
import type { ConfirmRequest, MoveRequest, NameRequest } from './dialogs';
import { CARD_STATES, studiedAgo } from './states';

export interface TreeActions {
  ask: (request: NameRequest) => void;
  confirm: (request: ConfirmRequest) => void;
  move: (request: MoveRequest) => void;
  /** Opens the merge dialog for a deck. */
  merge: (deck: Deck) => void;
  newDeck: (folderId: string | null) => void;
  /** Sorted by hand: the deck menu offers Move up and Move down. */
  byHand?: boolean;
}

interface TreeProps {
  decks: Deck[];
  folders: Folder[];
  counts: Map<string, DeckCounts> | undefined;
  /** When each deck was last studied (from the study outlook). */
  lastStudied: Map<string, number> | undefined;
  actions: TreeActions;
  order: Order;
}

/** How decks and folders are ordered at every level of the tree. */
interface Order {
  decks: (a: Deck, b: Deck) => number;
  folders: (a: Folder, b: Folder) => number;
}

export const sumCounts = (list: Array<DeckCounts | undefined>) =>
  list.reduce<DeckCounts>((a, c) => (c ? { total: a.total + c.total, new: a.new + c.new, learning: a.learning + c.learning, due: a.due + c.due } : a), { total: 0, new: 0, learning: 0, due: 0 });

const work = (c: DeckCounts | undefined) => (c ? c.due + c.learning + c.new : 0);

const cardCount = (c: DeckCounts | undefined) => (c ? `${c.total.toLocaleString()} ${c.total === 1 ? 'card' : 'cards'}` : '');

/** Every deck inside a folder, its subfolders' too. */
const within = (f: Folder, decks: Deck[], folders: Folder[]): Deck[] => [...decks.filter((d) => d.folderId === f.id), ...folders.filter((c) => c.parentId === f.id).flatMap((c) => within(c, decks, folders))];

/** The table's columns: deck, today's work, last studied (with Study and Ludus on hover), options. */
const ROW = 'grid grid-cols-[minmax(0,1fr)_132px_32px] items-center gap-x-3 lg:grid-cols-[minmax(0,1fr)_132px_156px_32px]';

/** Builds the ordering for a sort choice; folders follow the decks inside them. */
export function deckOrder(sort: DeckSort, decks: Deck[], folders: Folder[], counts: Map<string, DeckCounts> | undefined, lastStudied: Map<string, number> | undefined): Order {
  const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });
  const byName = (a: { name: string }, b: { name: string }) => collator.compare(a.name, b.name);
  const metric = (d: Deck): number =>
    sort === 'due' ? work(counts?.get(d.id)) : sort === 'size' ? (counts?.get(d.id)?.total ?? 0) : sort === 'recent' ? (lastStudied?.get(d.id) ?? 0) : 0;
  const folderMetric = (f: Folder): number => {
    const values = within(f, decks, folders).map(metric);
    return sort === 'recent' ? Math.max(0, ...values) : values.reduce((a, b) => a + b, 0);
  };
  // Pinned decks sit first, in whatever order the rest follow.
  const pinnedFirst = (order: (a: Deck, b: Deck) => number) => (a: Deck, b: Deck) => Number(b.pinned ?? 0) - Number(a.pinned ?? 0) || order(a, b);
  if (sort === 'name') return { decks: pinnedFirst(byName), folders: byName };
  if (sort === 'hand') return { decks: pinnedFirst((a, b) => a.order - b.order || a.createdAt - b.createdAt), folders: byName };
  return { decks: pinnedFirst((a, b) => metric(b) - metric(a) || byName(a, b)), folders: (a, b) => folderMetric(b) - folderMetric(a) || byName(a, b) };
}

const roots = (folders: Folder[]) => folders.filter((f) => !f.parentId || !folders.some((p) => p.id === f.parentId));
const loose = (decks: Deck[], folders: Folder[]) => decks.filter((d) => !d.folderId || !folders.some((f) => f.id === d.folderId));

/** My decks as a desktop table: folders (folding, nested, with their summed counts) and decks, in the chosen order. */
export function DeckTree({ decks, folders, counts, lastStudied, actions, order }: TreeProps) {
  return (
    <div>
      <ColumnHeads />
      <div className="divide-y divide-line/60 rounded-3xl border border-line/70 bg-surface p-1.5">
        {roots(folders)
          .sort(order.folders)
          .map((f) => (
            <FolderGroup key={f.id} folder={f} depth={0} {...{ decks, folders, counts, lastStudied, actions, order }} />
          ))}
        {loose(decks, folders)
          .sort(order.decks)
          .map((d) => (
            <DeckRow key={d.id} deck={d} counts={counts?.get(d.id)} last={lastStudied?.get(d.id)} depth={0} folders={folders} actions={actions} />
          ))}
      </div>
    </div>
  );
}

function ColumnHeads() {
  const translateUi = useUi();
  return (
    <div className={cx(ROW, 'pr-3.25 pb-2 pl-4 text-[11.5px] font-bold tracking-[0.1em] text-ink-faint uppercase')} aria-hidden>
      <span className="pl-12"><UiText source={'Deck'} /></span>
      <span className="text-center" title={translateUi('New · learning · to review')}><UiText source={'Today'} /></span>
      <span className="hidden lg:block"><UiText source={'Last studied'} /></span>
      <span />
    </div>
  );
}

function FolderGroup({ folder, depth, decks, folders, counts, lastStudied, actions, order }: TreeProps & { folder: Folder; depth: number }) {
  const translateUi = useUi();
  const [open, setOpen] = useState(true);
  const children = folders.filter((f) => f.parentId === folder.id).sort(order.folders);
  const own = decks.filter((d) => d.folderId === folder.id).sort(order.decks);
  const inside = within(folder, decks, folders);
  const total = sumCounts(inside.map((d) => counts?.get(d.id)));
  const last = Math.max(0, ...inside.map((d) => lastStudied?.get(d.id) ?? 0)) || undefined;
  const empty = !children.length && !own.length;

  return (
    <div>
      <div className={cx(ROW, 'group relative rounded-2xl pr-1.5 transition-colors hover:bg-raised/60')}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="no-callout flex min-w-0 items-center gap-3 rounded-2xl py-2.5 pr-2 text-left before:absolute before:inset-0 before:rounded-2xl"
          style={{ paddingLeft: 4 + depth * 20 }}
        >
          <ChevronRight size={16} className={cx('shrink-0 text-ink-faint transition-transform duration-200', open && 'rotate-90')} aria-hidden />
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sunken text-ink-soft">
            <FolderIcon size={17} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold">{folder.name}</span>
            <span className="block truncate text-[12.5px] text-ink-faint">
              {empty ? translateUi('Empty') : `${inside.length} ${inside.length === 1 ? 'deck' : 'decks'} · ${cardCount(total)}`}
            </span>
          </span>
        </button>
        <Counts counts={empty ? undefined : total} />
        <span className="hidden text-[13px] text-ink-soft lg:block">{empty ? '' : studiedAgo(last)}</span>
        <FolderMenu folder={folder} folders={folders} actions={actions} />
      </div>
      <AnimatePresence initial={false}>
        {open && !empty && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.1 } }} transition={spring.snappy}>
            {children.map((f) => (
              <FolderGroup key={f.id} folder={f} depth={depth + 1} {...{ decks, folders, counts, lastStudied, actions, order }} />
            ))}
            {own.map((d) => (
              <DeckRow key={d.id} deck={d} counts={counts?.get(d.id)} last={lastStudied?.get(d.id)} depth={depth + 1} folders={folders} actions={actions} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Search results: matching decks in a flat table, each with the folder it lives in. */
export function DeckResults({ decks, folders, counts, lastStudied, actions }: Omit<TreeProps, 'order'>) {
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
        <DeckRow key={d.id} deck={d} counts={counts?.get(d.id)} last={lastStudied?.get(d.id)} depth={0} folders={folders} actions={actions} path={pathOf(d)} />
      ))}
    </div>
  );
}

interface RowProps {
  deck: Deck;
  counts?: DeckCounts;
  last?: number;
  depth: number;
  folders: Folder[];
  actions: TreeActions;
  path?: string;
}

function DeckRow({ deck, counts, last, depth, folders, actions, path }: RowProps) {
  const ludusGate = useGate('ludus');
  return (
    <div className={cx(ROW, 'group relative rounded-2xl pr-1.5 transition-colors focus-within:bg-raised/60 hover:bg-raised/60')}>
      <Link
        to={`/thesaurus/deck/${deck.id}`}
        className="no-callout flex min-w-0 items-center gap-3 rounded-2xl py-2.5 pr-2 before:absolute before:inset-0 before:rounded-2xl"
        style={{ paddingLeft: 10 + depth * 20 + (depth ? 26 : 0) }}
      >
        <DeckGlyph deck={deck} />
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold">
            {deck.name}
            <DeckMarks deck={deck} />
          </span>
          <span className="block truncate text-[12.5px] text-ink-faint">{[path, cardCount(counts)].filter(Boolean).join(' · ') || ' '}</span>
        </span>
      </Link>
      <Counts counts={counts} />
      <span className="relative hidden h-8 items-center lg:flex">
        <span className="text-[13px] text-ink-soft transition-opacity duration-150 group-focus-within:opacity-0 group-hover:opacity-0">{studiedAgo(last)}</span>
        {/* Hover (or tab into the row) for the two ways to study it. */}
        <span className="absolute inset-y-0 right-0 z-[1] flex items-center gap-1 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100">
          <Link to={`/thesaurus/study/${deck.id}?mode=recall`} className={buttonClasses('primary', 'sm')}><UiText source={'{0}Study'} values={[<Layers size={15} aria-hidden />]} /></Link>
          <Link to={`/thesaurus/study/${deck.id}?mode=ludus`} onClick={ludusGate ?? undefined} className={buttonClasses('secondary', 'sm')}>
            <Puzzle size={15} aria-hidden />
            Ludus
          </Link>
        </span>
      </span>
      <DeckMenu deck={deck} folders={folders} actions={actions} />
    </div>
  );
}

/** My decks as cards: decks outside folders first, then each folder's under its name. */
export function DeckCards({ decks, folders, counts, lastStudied, actions, order }: TreeProps) {
  const sections: Array<{ folder: Folder | null; title: string; decks: Deck[] }> = [];
  const free = loose(decks, folders).sort(order.decks);
  if (free.length) sections.push({ folder: null, title: '', decks: free });
  const walk = (f: Folder, path: string) => {
    const title = path ? `${path} / ${f.name}` : f.name;
    const own = decks.filter((d) => d.folderId === f.id).sort(order.decks);
    if (own.length) sections.push({ folder: f, title, decks: own });
    folders
      .filter((c) => c.parentId === f.id)
      .sort(order.folders)
      .forEach((c) => walk(c, title));
  };
  roots(folders)
    .sort(order.folders)
    .forEach((f) => walk(f, ''));

  return (
    <div className="space-y-7">
      {sections.map((s) => (
        <section key={s.folder?.id ?? 'loose'} aria-label={s.title || 'Decks'}>
          {s.folder && (
            <div className="group mb-2.5 flex items-center gap-2 pl-1">
              <FolderIcon size={15} className="text-ink-faint" aria-hidden />
              <p className="min-w-0 truncate text-[13px] font-bold text-ink-soft">{s.title}</p>
              <FolderMenu folder={s.folder} folders={folders} actions={actions} />
            </div>
          )}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(232px,1fr))] gap-3">
            {s.decks.map((d) => (
              <DeckCard key={d.id} deck={d} counts={counts?.get(d.id)} last={lastStudied?.get(d.id)} folders={folders} actions={actions} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function DeckCard({ deck, counts, last, folders, actions }: Omit<RowProps, 'depth' | 'path'>) {
  const ludusGate = useGate('ludus');
  return (
    <div className="group relative flex min-w-0 flex-col rounded-2xl border border-line/70 bg-surface p-4 transition-[border-color,box-shadow,translate] duration-200 focus-within:border-line-strong hover:-translate-y-0.5 hover:border-line-strong hover:shadow-elev-2">
      <div className="flex items-start justify-between gap-2">
        <DeckGlyph deck={deck} size="lg" />
        <DeckMenu deck={deck} folders={folders} actions={actions} />
      </div>
      <Link to={`/thesaurus/deck/${deck.id}`} className="no-callout mt-3 min-w-0 before:absolute before:inset-0 before:rounded-2xl">
        <span className="block truncate font-serif text-[17px] leading-tight font-semibold">
          {deck.name}
          <DeckMarks deck={deck} />
        </span>
        <span className="mt-0.5 block truncate text-[12.5px] text-ink-faint">{[cardCount(counts), last ? `studied ${studiedAgo(last).toLowerCase()}` : 'not studied yet'].filter(Boolean).join(' · ')}</span>
      </Link>
      <div className="mt-4 flex items-center justify-between gap-2">
        <Counts counts={counts} />
        <span className="relative z-[1] flex gap-1">
          <Link to={`/thesaurus/study/${deck.id}?mode=ludus`} onClick={ludusGate ?? undefined} aria-label="Ludus" title="Ludus" className={cx(buttonClasses('ghost', 'sm'), 'w-8 px-0 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100')}>
            <Puzzle size={15} aria-hidden />
          </Link>
          <Link to={`/thesaurus/study/${deck.id}?mode=recall`} className={buttonClasses('secondary', 'sm')}><UiText source={'Study'} /></Link>
        </span>
      </div>
    </div>
  );
}

/** What the learner marked a deck as: pinned, important, put away. */
function DeckMarks({ deck }: { deck: Deck }) {
  const translateUi = useUi();
  return (
    <>
      {deck.pinned ? <Pin size={12} aria-label={translateUi('Pinned')} className="ml-1.5 inline text-ink-faint" /> : null}
      {deck.archived ? <span className="ml-1.5 rounded-full bg-sunken px-1.5 py-px align-middle text-[10.5px] font-semibold text-ink-faint"><UiText source={'Archived'} /></span> : null}
    </>
  );
}

function DeckMenu({ deck, folders, actions }: { deck: Deck; folders: Folder[]; actions: TreeActions }) {
  const translateUi = useUi();
  return (
    <Popover label={translateUi('Deck options')} placement="bottom-end" className="w-60" trigger={(props) => <OptionsButton {...props} label={translateUi('{0} options', [deck.name])} />}>
      {(close) => (
        <div className="space-y-0.5">
          <MenuItem
            icon={Pencil}
            label={translateUi('Rename')}
            onClick={() => {
              close();
              actions.ask({ title: 'Rename deck', label: 'Name', initial: deck.name, confirm: 'Rename', onConfirm: (name) => updateDeck(deck.id, { name }) });
            }}
          />
          <MenuItem
            icon={folders.length ? FolderInput : FolderPlus}
            label={translateUi('Move to folder…')}
            onClick={() => {
              close();
              actions.move({ title: `Move “${deck.name}”`, folders, current: deck.folderId, onConfirm: (folderId) => updateDeck(deck.id, { folderId }) });
            }}
          />
          {actions.byHand && (
            <>
              <MenuItem icon={ArrowUp} label={translateUi('Move up')} onClick={() => (close(), void shiftDeck(deck.id, -1))} />
              <MenuItem icon={ArrowDown} label={translateUi('Move down')} onClick={() => (close(), void shiftDeck(deck.id, 1))} />
            </>
          )}
          <MenuItem
            icon={deck.pinned ? PinOff : Pin}
            label={deck.pinned ? translateUi('Unpin') : translateUi('Pin to the top')}
            onClick={() => {
              close();
              void setDeckFlag(deck.id, 'pinned', !deck.pinned);
            }}
          />
          <MenuItem
            icon={Copy}
            label={translateUi('Duplicate')}
            onClick={() => {
              close();
              void duplicateDeck(deck.id);
            }}
          />
          <MenuItem
            icon={Combine}
            label={translateUi('Merge into…')}
            onClick={() => {
              close();
              actions.merge(deck);
            }}
          />
          <MenuItem
            icon={deck.archived ? ArchiveRestore : Archive}
            label={deck.archived ? translateUi('Bring back') : translateUi('Archive')}
            onClick={() => {
              close();
              void setDeckFlag(deck.id, 'archived', !deck.archived);
            }}
          />
          <MenuItem
            icon={Trash2}
            label={translateUi('Delete deck')}
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
  );
}

function FolderMenu({ folder, folders, actions }: { folder: Folder; folders: Folder[]; actions: TreeActions }) {
  const translateUi = useUi();
  return (
    <Popover label={translateUi('Folder options')} placement="bottom-end" className="w-60" trigger={(props) => <OptionsButton {...props} label={translateUi('{0} options', [folder.name])} />}>
      {(close) => (
        <div className="space-y-0.5">
          <MenuItem icon={Plus} label={translateUi('New deck here')} onClick={() => (close(), actions.newDeck(folder.id))} />
          <MenuItem
            icon={Pencil}
            label={translateUi('Rename')}
            onClick={() => {
              close();
              actions.ask({ title: 'Rename folder', label: 'Name', initial: folder.name, confirm: 'Rename', onConfirm: (name) => updateFolder(folder.id, { name }) });
            }}
          />
          <MenuItem
            icon={FolderInput}
            label={translateUi('Move into…')}
            onClick={() => {
              close();
              actions.move({ title: `Move “${folder.name}”`, folders, current: folder.parentId, exclude: folder.id, onConfirm: (parentId) => updateFolder(folder.id, { parentId }) });
            }}
          />
          <MenuItem
            icon={Trash2}
            label={translateUi('Delete folder')}
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
  );
}

function OptionsButton({ label, ...props }: { label: string } & Record<string, unknown>) {
  return (
    <button
      {...props}
      type="button"
      aria-label={label}
      className="relative z-[1] grid size-8 shrink-0 place-items-center rounded-lg text-ink-faint opacity-100 transition-[opacity,background-color,color] hover:bg-surface hover:text-ink group-hover:opacity-100 pointer-fine:opacity-0 pointer-fine:group-focus-within:opacity-100 pointer-fine:focus-visible:opacity-100 pointer-fine:aria-expanded:opacity-100 pointer-coarse:size-10"
    >
      <Ellipsis size={17} aria-hidden />
    </button>
  );
}

/** Today's work in three columns (new, learning, to review), each in its colour with its glyph (never colour alone, F1536); a faint 0 where there's none. */
export function Counts({ counts }: { counts?: DeckCounts }) {
  return (
    <span className="grid w-[132px] shrink-0 grid-cols-3 gap-1 text-[12.5px] font-bold tabular-nums">
      {CARD_STATES.map((s) => {
        const n = counts?.[s.key] ?? 0;
        return (
          <span key={s.key} title={counts ? `${n.toLocaleString()} ${s.label}` : undefined} className={cx('inline-flex items-center justify-center gap-0.5 rounded-full py-0.5 text-center', n ? s.pill : 'text-ink-faint/50')}>
            {n ? <span className="text-[9px] opacity-75" aria-hidden>{s.glyph}</span> : null}
            {counts ? n.toLocaleString() : ''}
          </span>
        );
      })}
    </span>
  );
}
