import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { BackLink } from '@/app/BackLink';
import { Ellipsis, FolderInput, Layers, Pencil, Plus, Puzzle, Search, Settings2, TextCursorInput, Trash2, Zap } from 'lucide-react';
import { useApp } from '@/app/context';
import { PageHeader } from '@/app/PageHeader';
import { formatInterval, maturityOf } from '@/core/srs/scheduler';
import { deleteDeck, forgetDeck, updateDeck, useDeck, useDeckCards, useDeckCounts, useDeckNotes, useFolders } from '@/data/decks';
import type { Card, Note } from '@/data/types';
import { Button, buttonClasses, EmptyState, MenuItem, Popover } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { DeckGlyph } from '../common/DeckIcon';
import { articleFor } from '../common/words';
import { ConfirmDialog, MoveDialog, NameDialog } from '../library/dialogs';
import type { ConfirmRequest, MoveRequest, NameRequest } from '../library/dialogs';
import { STAGES } from '../library/states';
import { DeckSettings } from './DeckSettings';
import { PlusChip } from '@/features/plans/Locked';
import { useGate } from '@/features/plans/PlanRoute';
import { DeckStats } from './DeckStats';
import { NoteEditor } from './NoteEditor';
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
  const counts = useDeckCounts(deck ? [deck] : undefined)?.get(deckId ?? '');

  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [settings, setSettings] = useState(false);
  const [naming, setNaming] = useState<NameRequest | null>(null);
  const [confirming, setConfirming] = useState<ConfirmRequest | null>(null);
  const [moving, setMoving] = useState<MoveRequest | null>(null);
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE);

  const cardsByNote = useMemo(() => {
    const map = new Map<string, Card[]>();
    for (const c of cards ?? []) map.set(c.noteId, [...(map.get(c.noteId) ?? []), c]);
    return map;
  }, [cards]);

  const list = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    const all = [...(notes ?? [])].sort((a, b) => (a.freqRank ?? Infinity) - (b.freqRank ?? Infinity) || a.createdAt - b.createdAt);
    return q ? all.filter((n) => n.term.toLocaleLowerCase().includes(q) || n.meaning.toLocaleLowerCase().includes(q)) : all;
  }, [notes, query]);

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
                  <MenuItem icon={Trash2} label="Delete deck" danger onClick={() => (close(), askDelete())} />
                </div>
              )}
            </Popover>
          </>
        }
      />

      <div className="-mt-4 mb-6 flex items-center gap-3">
        <DeckGlyph deck={deck} />
        <p className="text-[15px] text-ink-soft">{deck.description ?? `${notes.length.toLocaleString()} ${notes.length === 1 ? 'word' : 'words'}`}</p>
      </div>

      {notes.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
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
                <NoteCard key={note.id} note={note} cards={cardsByNote.get(note.id) ?? []} lang={deck.lang} onOpen={() => setEditor({ mode: 'edit', note, cards: cardsByNote.get(note.id) ?? [] })} />
              ))}
              {list.length === 0 && <li className="col-span-full py-6 text-center text-sm text-ink-soft">No cards match “{query}”.</li>}
            </ul>
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
    </>
  );
}

/** A small card in the deck's grid (5.1-3b): the word, its stage and when it's due; it turns over on hover to show the meaning. */
function NoteCard({ note, cards, lang, onOpen }: { note: Note; cards: Card[]; lang: string; onOpen: () => void }) {
  const main = cards.find((c) => c.direction === 'recognition') ?? cards[0];
  const stage = STAGES[main ? maturityOf(main) : 'new'];
  const suspended = cards.length > 0 && cards.every((c) => c.suspended);
  const article = articleFor(lang, note.gender, note.term, note.pos);
  const now = Date.now();
  const when = suspended ? 'suspended' : !main || main.state === 0 ? 'new' : main.due <= now ? 'due now' : `in ${formatInterval(main.due - now)}`;
  const face = 'absolute inset-0 rounded-2xl border border-line/70 p-3 [backface-visibility:hidden]';
  return (
    <li className="[perspective:900px]">
      <button type="button" onClick={onOpen} aria-label={`${note.term}: ${note.meaning}`} className={cx('group/card no-callout block h-[120px] w-full text-left', suspended && 'opacity-50')}>
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
