import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { BackLink } from '@/app/BackLink';
import { Check, CheckSquare, Ellipsis, FolderInput, Layers, Pause, Pencil, Play, Plus, Puzzle, Search, Settings2, Sparkles, Tag, TextCursorInput, Trash2, Zap } from 'lucide-react';
import { useApp } from '@/app/context';
import { PageHeader } from '@/app/PageHeader';
import { formatInterval, maturityOf } from '@/core/srs/scheduler';
import { NOTE_SORTS, sortNotes } from '@/core/srs/sortNotes';
import type { NoteSort } from '@/core/srs/sortNotes';
import { deleteDeck, forgetDeck, updateDeck, useDeck, useDeckCards, useDeckCounts, useDecks, useDeckNotes, useFolders } from '@/data/decks';
import { deleteNotes, moveNotes, suspendNotes, tagNotes } from '@/data/deckTools';
import { createDeck } from '@/data/decks';
import type { Card, Note } from '@/data/types';
import { Button, buttonClasses, EmptyState, MenuItem, Popover } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { DeckGlyph } from '../common/DeckIcon';
import { articleFor } from '../common/words';
import { ConfirmDialog, MergeDialog, MoveDialog, NameDialog } from '../library/dialogs';
import type { ConfirmRequest, MergeRequest, MoveRequest, NameRequest } from '../library/dialogs';
import { STAGES } from '../library/states';
import { DeckSettings } from './DeckSettings';
import { PlusChip } from '@/features/plans/Locked';
import { useGate } from '@/features/plans/PlanRoute';
import { DeckStats } from './DeckStats';
import { NoteEditor } from './NoteEditor';
import { TidyDialog } from './TidyDialog';
import type { EditorTarget } from './NoteEditor';

const PAGE = 120;

export default function DeckPage() {
  const { deckId } = useParams();
  const { language } = useApp();
  const navigate = useNavigate();
  const deck = useDeck(deckId);
  const ludusGate = useGate('ludus');
  const notes = useDeckNotes(deckId);
  const cards = useDeckCards(deckId);
  const folders = useFolders(language.id);
  const allDecks = useDecks(language.id);
  const counts = useDeckCounts(deck ? [deck] : undefined)?.get(deckId ?? '');

  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [settings, setSettings] = useState(false);
  const [naming, setNaming] = useState<NameRequest | null>(null);
  const [confirming, setConfirming] = useState<ConfirmRequest | null>(null);
  const [moving, setMoving] = useState<MoveRequest | null>(null);
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE);
  const [how, setHow] = useState<NoteSort>('common');
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [tidying, setTidying] = useState(false);
  const [movingCards, setMovingCards] = useState<MergeRequest | null>(null);

  const cardsByNote = useMemo(() => {
    const map = new Map<string, Card[]>();
    for (const c of cards ?? []) map.set(c.noteId, [...(map.get(c.noteId) ?? []), c]);
    return map;
  }, [cards]);

  const list = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    const all = sortNotes(notes ?? [], cardsByNote, how);
    return q ? all.filter((n) => n.term.toLocaleLowerCase().includes(q) || n.meaning.toLocaleLowerCase().includes(q)) : all;
  }, [notes, query, how, cardsByNote]);

  if (deck === null || deck?.deletedAt) {
    return (
      <EmptyState icon={Layers} title="This deck isn’t here any more" action={<Link to="/thesaurus" className={buttonClasses('secondary', 'md')}>Back to Thesaurus</Link>} />
    );
  }
  if (!deck || !notes || !cards) return <div className="min-h-[60dvh]" />;

  const due = (counts?.due ?? 0) + (counts?.learning ?? 0) + (counts?.new ?? 0);
  const askDelete = () =>
    setConfirming({
      title: `Delete “${deck.name}”?`,
      body: 'Its cards and their review history go. Words you know stay known in your books.',
      confirm: 'Delete deck',
      onConfirm: async () => {
        await deleteDeck(deck.id);
        navigate('/thesaurus', { replace: true });
      },
    });
  const askForget = () =>
    setConfirming({
      title: `Forget your progress in “${deck.name}”?`,
      body: 'Every card goes back to new and comes again as new cards do. What you studied stays in Ratio’s history.',
      confirm: 'Forget progress',
      onConfirm: () => forgetDeck(deck.id).then(() => undefined),
    });

  const toggle = (id: string) =>
    setPicked((p) => {
      const next = new Set(p);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const ids = [...picked];
  const askTags = (remove: boolean) =>
    setNaming({
      title: remove ? `Remove a tag from ${ids.length} ${ids.length === 1 ? 'card' : 'cards'}` : `Tag ${ids.length} ${ids.length === 1 ? 'card' : 'cards'}`,
      label: 'Tags, separated by commas',
      confirm: remove ? 'Remove' : 'Add',
      onConfirm: (text) => {
        const tags = text.split(',').map((t) => t.trim()).filter(Boolean);
        return tagNotes(ids, remove ? { remove: tags } : { add: tags });
      },
    });
  const askSplit = () =>
    setNaming({
      title: `A new deck from ${ids.length} ${ids.length === 1 ? 'card' : 'cards'}`,
      label: 'Name',
      initial: `${deck.name}, part 2`,
      confirm: 'Split off',
      onConfirm: async (name) => {
        const to = await createDeck(deck.lang, { name, folderId: deck.folderId });
        await moveNotes(ids, to);
        setPicked(new Set());
      },
    });
  const askMove = () =>
    setMovingCards({
      title: `Move ${ids.length} ${ids.length === 1 ? 'card' : 'cards'}`,
      label: 'To the deck',
      confirm: 'Move',
      decks: (allDecks ?? []).filter((d) => d.id !== deck.id && !d.deletedAt),
      onConfirm: async (to) => {
        await moveNotes(ids, to);
        setPicked(new Set());
      },
    });
  const askDeleteCards = () =>
    setConfirming({
      title: `Delete ${ids.length} ${ids.length === 1 ? 'card' : 'cards'}?`,
      body: 'The cards and their review history go. Words you know stay known in your books.',
      confirm: 'Delete',
      onConfirm: async () => {
        await deleteNotes(ids);
        setPicked(new Set());
      },
    });

  return (
    <>
      <BackLink to="/thesaurus">Thesaurus</BackLink>
      <PageHeader
        title={deck.name}
        actions={
          <>
            <Button variant="secondary" icon={Plus} onClick={() => setEditor({ mode: 'new', deckId: deck.id })}>
              <span className="hidden sm:inline">Add card</span>
            </Button>
            <Popover
              label="Deck options"
              placement="bottom-end"
              className="w-60"
              trigger={(props) => (
                <button {...props} type="button" aria-label="Deck options" className="grid size-10 place-items-center rounded-xl text-ink-soft transition-colors hover:bg-surface hover:text-ink">
                  <Ellipsis size={19} aria-hidden />
                </button>
              )}
            >
              {(close) => (
                <div className="space-y-0.5">
                  <MenuItem icon={Settings2} label="Deck settings" onClick={() => (close(), setSettings(true))} />
                  <MenuItem
                    icon={Pencil}
                    label="Rename"
                    onClick={() => {
                      close();
                      setNaming({ title: 'Rename deck', label: 'Name', initial: deck.name, confirm: 'Rename', onConfirm: (name) => updateDeck(deck.id, { name }) });
                    }}
                  />
                  <MenuItem
                    icon={FolderInput}
                    label="Move to folder…"
                    onClick={() => {
                      close();
                      setMoving({ title: `Move “${deck.name}”`, folders: folders ?? [], current: deck.folderId, onConfirm: (folderId) => updateDeck(deck.id, { folderId }) });
                    }}
                  />
                  <MenuItem icon={Sparkles} label="Tidy…" onClick={() => (close(), setTidying(true))} />
                  <MenuItem icon={Trash2} label="Delete deck" danger onClick={() => (close(), askDelete())} />
                </div>
              )}
            </Popover>
          </>
        }
      />

      <div className="mb-5 flex items-center gap-3">
        <DeckGlyph deck={deck} />
        <p className="text-[15px] text-ink-soft">{deck.description ?? `${notes.length.toLocaleString()} ${notes.length === 1 ? 'word' : 'words'}`}</p>
      </div>

      {notes.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          <Link
            to={`/thesaurus/study/${deck.id}?mode=recall`}
            className={cx(buttonClasses('primary', 'lg'), !due && 'pointer-events-none opacity-45')}
            aria-disabled={!due}
          >
            <Layers size={18} aria-hidden />
            {due ? `Review ${due}` : 'Nothing due'}
          </Link>
          <Link to={`/thesaurus/study/${deck.id}?mode=ludus`} onClick={ludusGate ?? undefined} className={buttonClasses('secondary', 'lg')}>
            <Puzzle size={18} aria-hidden />
            Ludus
            {ludusGate && <PlusChip feature="ludus" />}
          </Link>
          <Link to={`/thesaurus/study/${deck.id}?mode=ludus&lightning=1`} onClick={ludusGate ?? undefined} className={buttonClasses('secondary', 'lg')}>
            <Zap size={18} aria-hidden />
            Lightning
          </Link>
          <Link to={`/thesaurus/study/${deck.id}?mode=ludus&kind=sentences`} onClick={ludusGate ?? undefined} className={buttonClasses('secondary', 'lg')} title="Real sentences with one of the deck's words missing">
            <TextCursorInput size={18} aria-hidden />
            Sentences
          </Link>
        </div>
      )}

      {notes.length > 0 && <DeckStats deckId={deck.id} cards={cards} counts={counts} />}

      <section className="mt-10" aria-labelledby="cards-title">
        <div className="mb-3 flex items-center gap-3">
          <h2 id="cards-title" className="flex-1 font-serif text-2xl font-semibold">
            Cards
          </h2>
          {notes.length > 0 && (
            <p className="hidden items-center gap-3 text-[12.5px] text-ink-soft lg:flex" aria-hidden>
              {Object.values(STAGES).map((s) => (
                <span key={s.label} className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
              ))}
            </p>
          )}
          {notes.length > 1 && (
            <select
              aria-label="Order the cards"
              value={how}
              onChange={(e) => setHow(e.target.value as NoteSort)}
              className="h-10 cursor-pointer rounded-xl border border-line bg-raised px-3 text-[13.5px] font-medium text-ink-soft outline-none hover:border-line-strong"
            >
              {NOTE_SORTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
          {notes.length > 1 && (
            <Button
              variant={selecting ? 'primary' : 'ghost'}
              icon={CheckSquare}
              onClick={() => {
                setSelecting(!selecting);
                setPicked(new Set());
              }}
            >
              {selecting ? 'Done' : 'Select'}
            </Button>
          )}
          {notes.length > 8 && (
            <label className="relative">
              <span className="sr-only">Search cards</span>
              <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-faint" aria-hidden />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShown(PAGE);
                }}
                placeholder="Search"
                className="h-10 w-44 rounded-xl border border-line bg-raised pr-3 pl-9 text-sm outline-none focus:border-accent sm:w-60"
              />
            </label>
          )}
        </div>

        {notes.length === 0 ? (
          <EmptyState icon={Plus} title="No cards yet" action={<Button icon={Plus} onClick={() => setEditor({ mode: 'new', deckId: deck.id })}>Add the first card</Button>}>
            Add words by hand here, or mark words as Learning while you read.
          </EmptyState>
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {list.slice(0, shown).map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  cards={cardsByNote.get(note.id) ?? []}
                  lang={deck.lang}
                  selecting={selecting}
                  selected={picked.has(note.id)}
                  onOpen={() => (selecting ? toggle(note.id) : setEditor({ mode: 'edit', note, cards: cardsByNote.get(note.id) ?? [] }))}
                />
              ))}
              {list.length === 0 && <li className="col-span-full py-6 text-center text-sm text-ink-soft">No cards match “{query}”.</li>}
            </ul>
            {selecting && (
              <div className="sticky bottom-4 z-20 mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-raised p-2.5 shadow-elev-3" role="toolbar" aria-label="Selected cards">
                <span className="px-2 text-[14px] font-semibold tabular-nums">{ids.length} selected</span>
                <Button variant="ghost" onClick={() => setPicked(new Set(list.map((n) => n.id)))}>
                  Select all{query ? ' shown' : ''}
                </Button>
                <span className="flex-1" />
                <Button variant="secondary" icon={Tag} disabled={!ids.length} onClick={() => askTags(false)}>
                  Tag
                </Button>
                <Button variant="ghost" disabled={!ids.length} onClick={() => askTags(true)}>
                  Untag
                </Button>
                <Button variant="secondary" icon={FolderInput} disabled={!ids.length} onClick={askMove}>
                  Move
                </Button>
                <Button variant="secondary" icon={Layers} disabled={!ids.length} onClick={askSplit}>
                  Split off
                </Button>
                <Button variant="secondary" icon={Pause} disabled={!ids.length} onClick={() => void suspendNotes(ids, true)}>
                  Suspend
                </Button>
                <Button variant="secondary" icon={Play} disabled={!ids.length} onClick={() => void suspendNotes(ids, false)}>
                  Resume
                </Button>
                <Button variant="secondary" icon={Trash2} disabled={!ids.length} onClick={askDeleteCards}>
                  Delete
                </Button>
              </div>
            )}
            {list.length > shown && (
              <div className="mt-4 text-center">
                <Button variant="ghost" onClick={() => setShown((n) => n + PAGE * 4)}>
                  Show more ({(list.length - shown).toLocaleString()})
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      <NoteEditor lang={deck.lang} target={editor} onClose={() => setEditor(null)} />
      <DeckSettings deck={deck} open={settings} onClose={() => setSettings(false)} samples={list.length ? list : notes} onForget={askForget} onDelete={askDelete} />
      <NameDialog request={naming} onClose={() => setNaming(null)} />
      <ConfirmDialog request={confirming} onClose={() => setConfirming(null)} />
      <MoveDialog request={moving} onClose={() => setMoving(null)} />
      <MergeDialog request={movingCards} onClose={() => setMovingCards(null)} />
      <TidyDialog open={tidying} onClose={() => setTidying(false)} notes={notes} lang={deck.lang} />
    </>
  );
}

/** A small card in the deck's grid (5.1-3b): the word, its stage and when it's due; it turns over on hover to show the meaning. */
function NoteCard({ note, cards, lang, onOpen, selecting = false, selected = false }: { note: Note; cards: Card[]; lang: string; onOpen: () => void; selecting?: boolean; selected?: boolean }) {
  const main = cards.find((c) => c.direction === 'recognition') ?? cards[0];
  const stage = STAGES[main ? maturityOf(main) : 'new'];
  const suspended = cards.length > 0 && cards.every((c) => c.suspended);
  const article = articleFor(lang, note.gender, note.term, note.pos);
  const now = Date.now();
  const when = suspended ? 'suspended' : !main || main.state === 0 ? 'new' : main.due <= now ? 'due now' : `in ${formatInterval(main.due - now)}`;
  const face = 'absolute inset-0 rounded-2xl border border-line/70 p-3 [backface-visibility:hidden]';
  return (
    <li className="[perspective:900px]">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${note.term}: ${note.meaning}`}
        aria-pressed={selecting ? selected : undefined}
        className={cx('group/card no-callout relative block h-[120px] w-full rounded-2xl text-left', suspended && 'opacity-50', selected && 'ring-2 ring-accent')}
      >
        {selecting && (
          <span className={cx('absolute right-2 bottom-2 z-10 grid size-5 place-items-center rounded-full border', selected ? 'border-accent bg-accent text-on-accent' : 'border-line-strong bg-raised')} aria-hidden>
            {selected && <Check size={13} strokeWidth={3} />}
          </span>
        )}
        <span className="relative block size-full transition-transform duration-500 ease-out [transform-style:preserve-3d] group-hover/card:[transform:rotateY(180deg)] group-focus-visible/card:[transform:rotateY(180deg)] motion-reduce:transition-none">
          <span className={cx(face, 'flex flex-col bg-surface')}>
            <span className="flex items-center justify-between gap-2 text-[11.5px] font-semibold text-ink-faint">
              <span className="inline-flex items-center gap-1.5" title={stage.label}>
                <span className="size-2 rounded-full" style={{ background: stage.color }} aria-hidden />
                {stage.label}
              </span>
              <span className="tabular-nums">{when}</span>
            </span>
            <span lang={lang} className="m-auto line-clamp-2 px-1 text-center font-serif text-[18px] leading-tight break-words">
              {article && <span className="text-ink-faint">{article} </span>}
              {note.term}
            </span>
          </span>
          <span className={cx(face, 'grid place-items-center bg-raised text-center [transform:rotateY(180deg)]')}>
            <span className="line-clamp-4 text-[14px] leading-snug text-ink-soft">{note.meaning || '—'}</span>
          </span>
        </span>
      </button>
    </li>
  );
}
