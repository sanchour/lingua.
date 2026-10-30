import { UiText, useUi } from '@/design/i18n/UiText';
import { useState } from 'react';
import { ArrowRightLeft, Check, Layers, Plus } from 'lucide-react';
import { db } from '@/data/db';
import { addNote, createDeck, moveNote, useDecks } from '@/data/decks';
import type { NoteInput } from '@/data/decks';
import { Popover } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { toast } from '@/state/ui';

/**
 * A small "+ Deck" button: puts this word (with its meaning and sentence) into a deck you choose.
 * A word already saved by marking it Learning (`move`) is moved to that deck instead of copied.
 */
export function AddToDeck({ lang, note, move }: { lang: string; note: NoteInput; move?: { noteId: string; deckId: string } }) {
  const translateUi = useUi();
  const decks = useDecks(lang);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [added, setAdded] = useState<string | null>(null);

  const add = async (deckId: string, deckName: string, close: () => void) => {
    if (move) {
      close();
      if (deckId === move.deckId) return toast({ source: '“{0}” is already in {1}.', values: [String(note.term), String(deckName)] });
      await moveNote(move.noteId, deckId);
      setAdded(deckName);
      return toast({ source: 'Moved “{0}” to {1}.', values: [String(note.term), String(deckName)] }, { tone: 'success' });
    }
    const existing = (await db.notes.where('deckId').equals(deckId).toArray()).find((n) => !n.deletedAt && n.term.toLocaleLowerCase(lang) === note.term.toLocaleLowerCase(lang));
    close();
    if (existing) return toast({ source: '“{0}” is already in {1}.', values: [String(note.term), String(deckName)] });
    await addNote(deckId, note);
    setAdded(deckName);
    toast({ source: 'Added “{0}” to {1}.', values: [String(note.term), String(deckName)] }, { tone: 'success' });
  };

  return (
    <Popover
      label={move ? translateUi('Move to a deck') : translateUi('Add to a deck')}
      placement="bottom-end"
      className="w-72"
      onOpenChange={(open) => !open && setNaming(false)}
      trigger={(props) => (
        <button
          {...props}
          type="button"
          title={added ? translateUi('In {0}', [added]) : move ? translateUi('Move to another deck') : translateUi('Add to a deck')}
          className={cx(
            'flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-bold transition-colors',
            added ? 'border-sage/40 bg-sage-soft text-sage-text' : 'border-line bg-raised text-ink-soft hover:border-line-strong hover:text-ink',
          )}
        >
          {added ? <Check size={14} aria-hidden /> : move ? <ArrowRightLeft size={13} aria-hidden /> : <Plus size={14} aria-hidden />}
          {move && !added ? translateUi('Move') : translateUi('Deck')}
        </button>
      )}
    >
      {(close) => (
        <div>
          <p className="px-3 pt-1.5 pb-1 text-[11.5px] font-bold tracking-[0.1em] text-ink-faint uppercase">{move ? translateUi('Move to') : translateUi('Add to')}</p>
          <div className="max-h-64 overflow-y-auto">
            {(decks ?? []).filter((d) => d.id !== move?.deckId).map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => void add(d.id, d.name, close)}
                className="no-callout flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors hover:bg-surface"
              >
                <Layers size={15} className="shrink-0 text-ink-faint" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{d.name}</span>
              </button>
            ))}
          </div>
          <div className="mt-1 border-t border-line pt-1.5">
            {naming ? (
              <form
                className="flex gap-1.5 px-1 pb-1"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const deckName = name.trim();
                  if (!deckName) return;
                  const id = await createDeck(lang, { name: deckName, folderId: null });
                  setName('');
                  await add(id, deckName, close);
                }}
              >
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={translateUi('Deck name')}
                  autoFocus
                  className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-bg px-2.5 text-[14px]"
                  aria-label={translateUi('New deck name')}
                />
                <button type="submit" disabled={!name.trim()} className="h-9 rounded-lg bg-inverse px-3 text-[13px] font-bold text-on-inverse disabled:opacity-40"><UiText source={'Add'} /></button>
              </form>
            ) : (
              <button type="button" onClick={() => setNaming(true)} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-semibold text-accent-text transition-colors hover:bg-surface"><UiText source={'{0} New deck…'} values={[<Plus size={15} aria-hidden />]} /></button>
            )}
          </div>
        </div>
      )}
    </Popover>
  );
}
