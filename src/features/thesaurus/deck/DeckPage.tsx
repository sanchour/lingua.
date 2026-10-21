import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { BackLink } from '@/app/BackLink';
import { Ellipsis, FolderInput, Layers, Pencil, Plus, Puzzle, Search, Settings2, TextCursorInput, Trash2, Zap } from 'lucide-react';
import { useApp } from '@/app/context';
import { PageHeader } from '@/app/PageHeader';
import { formatInterval, maturityOf } from '@/core/srs/scheduler';
import { deleteDeck, updateDeck, useDeck, useDeckCards, useDeckCounts, useDeckNotes, useFolders } from '@/data/decks';
import type { Card, Note } from '@/data/types';
import { Button, buttonClasses, EmptyState, MenuItem, Popover } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { DeckGlyph } from '../common/DeckIcon';
import { articleFor } from '../common/words';
import { ConfirmDialog, MoveDialog, NameDialog } from '../library/dialogs';
import type { ConfirmRequest, MoveRequest, NameRequest } from '../library/dialogs';
import { DeckSettings } from './DeckSettings';
import { PlusChip } from '@/features/plans/Locked';
import { useGate } from '@/features/plans/PlanRoute';
import { DeckStats } from './DeckStats';
import { NoteEditor } from './NoteEditor';
import type { EditorTarget } from './NoteEditor';

const PAGE = 120;
const DOT: Record<string, string> = { new: 'bg-line-strong', learning: 'bg-accent', young: 'bg-sage/55', mature: 'bg-sage' };

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
                  <MenuItem
                    icon={Trash2}
                    label="Delete deck"
                    danger
                    onClick={() => {
                      close();
                      setConfirming({
                        title: `Delete “${deck.name}”?`,
                        body: 'Its cards and their review history go. Words you know stay known in your books.',
                        confirm: 'Delete deck',
                        onConfirm: async () => {
                          await deleteDeck(deck.id);
                          navigate('/thesaurus', { replace: true });
                        },
                      });
                    }}
                  />
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
            <ul className="divide-y divide-line/60 rounded-3xl border border-line/70 bg-surface px-2">
              {list.slice(0, shown).map((note) => (
                <NoteRow key={note.id} note={note} cards={cardsByNote.get(note.id) ?? []} lang={deck.lang} onOpen={() => setEditor({ mode: 'edit', note, cards: cardsByNote.get(note.id) ?? [] })} />
              ))}
              {list.length === 0 && <li className="py-6 text-center text-sm text-ink-soft">No cards match “{query}”.</li>}
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
      <DeckSettings deck={deck} open={settings} onClose={() => setSettings(false)} />
      <NameDialog request={naming} onClose={() => setNaming(null)} />
      <ConfirmDialog request={confirming} onClose={() => setConfirming(null)} />
      <MoveDialog request={moving} onClose={() => setMoving(null)} />
    </>
  );
}

function NoteRow({ note, cards, lang, onOpen }: { note: Note; cards: Card[]; lang: string; onOpen: () => void }) {
  const main = cards.find((c) => c.direction === 'recognition') ?? cards[0];
  const stage = main ? maturityOf(main) : 'new';
  const suspended = cards.length > 0 && cards.every((c) => c.suspended);
  const article = articleFor(lang, note.gender, note.term, note.pos);
  const next = main && main.state !== 0 ? formatInterval(Math.max(0, main.due - Date.now())) : null;
  return (
    <li>
      <button type="button" onClick={onOpen} className={cx('no-callout flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-raised/60', suspended && 'opacity-50')}>
        <span className={cx('size-2 shrink-0 rounded-full', DOT[stage])} title={suspended ? 'suspended' : stage} aria-hidden />
        <span lang={lang} className="min-w-0 basis-2/5 truncate font-serif text-[17px]">
          {article && <span className="text-ink-faint">{article} </span>}
          {note.term}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">{note.meaning}</span>
        <span className="hidden shrink-0 text-[12px] font-semibold text-ink-faint tabular-nums sm:block">{suspended ? 'suspended' : next ? `in ${next}` : 'new'}</span>
      </button>
    </li>
  );
}
