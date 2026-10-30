import { UiText, useUi } from '@/design/i18n/UiText';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Check, FolderPlus, LoaderCircle, Plus } from 'lucide-react';
import { useDecks } from '@/data/decks';
import { addStarterDeck, addStarterToDeck, starterKey, starterName, useStarterDecks } from '@/data/starter';
import type { StarterSpec } from '@/data/starter';
import type { Deck } from '@/data/types';
import { Button, MenuItem, Popover } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { toast } from '@/state/ui';
import { deckIcon } from '../common/DeckIcon';

interface AddStarterMenuProps {
  lang: string;
  spec: StarterSpec;
  /** Leave out the words already marked Known (the booklet's switch; on by default). */
  skipKnown?: boolean;
  /** A small round + on a Discover card, or an "Add to…" button in the booklet's bar. */
  trigger: 'icon' | 'button';
}

/**
 * "Add to My decks" or "Add to…" a deck the learner has (5.1-3b), for a ready-made deck or a stop on
 * the journey. Words already in the chosen deck are skipped, and the toast says how many were added.
 */
export function AddStarterMenu({ lang, spec, skipKnown = true, trigger }: AddStarterMenuProps) {
  const translateUi = useUi();
  const navigate = useNavigate();
  const decks = useDecks(lang);
  const starters = useStarterDecks(lang);
  const own = starters?.get(starterKey(spec));
  const [busy, setBusy] = useState(false);
  const targets = (decks ?? []).filter((d) => d.id !== own?.id).sort((a, b) => a.name.localeCompare(b.name));
  const name = starterName(spec);

  const run = async (close: () => void, to?: Deck) => {
    close();
    if (!to && own) return navigate(`/thesaurus/deck/${own.id}`);
    setBusy(true);
    try {
      if (!to) {
        const result = await addStarterDeck(lang, spec, { skipKnown });
        toast({ source: '{0} is ready · {1} {2}', values: [String(name), String(result.added.toLocaleString()), result.added === 1 ? { source: 'card' } : { source: 'cards' }] }, {
          tone: 'success',
          action: { label: 'Study', onClick: () => navigate(`/thesaurus/study/${result.deckId}?mode=recall`) },
        });
        return;
      }
      const result = await addStarterToDeck(lang, spec, to.id, { skipKnown });
      const there = result.skippedInDeck ? ` · ${result.skippedInDeck.toLocaleString()} already there` : '';
      toast(result.added ? { source: 'Added {0} {1} to {2}{3}', values: [String(result.added.toLocaleString()), result.added === 1 ? { source: 'word' } : { source: 'words' }, String(to.name), String(there)] } : { source: 'Every word of {0} is already in {1}', values: [String(name), String(to.name)] }, {
        tone: result.added ? 'success' : 'default',
        action: { label: 'Open', onClick: () => navigate(`/thesaurus/deck/${to.id}`) },
      });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Those words couldn’t be added.', { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popover
      label={translateUi('Add {0}', [name])}
      placement="bottom-end"
      className="w-64"
      trigger={(props) =>
        trigger === 'icon' ? (
          <button
            {...props}
            type="button"
            aria-label={translateUi('Add {0}', [name])}
            className={cx(
              'grid size-8 place-items-center rounded-full bg-raised/90 text-ink shadow-elev-2 backdrop-blur transition-[opacity,transform,background-color] hover:scale-105 hover:bg-raised',
              'pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-within:opacity-100 pointer-fine:focus-visible:opacity-100 pointer-fine:aria-expanded:opacity-100',
            )}
          >
            {busy ? <LoaderCircle size={16} className="animate-spin" aria-hidden /> : <Plus size={17} strokeWidth={2.4} aria-hidden />}
          </button>
        ) : (
          <Button {...props} variant="secondary" size="lg" icon={FolderPlus} loading={busy}><UiText source={'Add to…'} /></Button>
        )
      }
    >
      {(close) => (
        <div className="space-y-0.5">
          <MenuItem icon={own ? Check : Plus} label={own ? translateUi('In My decks') : translateUi('Add to My decks')} detail={own ? translateUi('Open the deck') : translateUi('As a new ready-made deck')} onClick={() => void run(close)} />
          {targets.length > 0 && (
            <>
              <p className="px-3 pt-2.5 pb-1 text-[11.5px] font-bold tracking-[0.1em] text-ink-faint uppercase"><UiText source={'Add to a deck you have'} /></p>
              <div className="max-h-64 space-y-0.5 overflow-y-auto">
                {targets.map((d) => (
                  <MenuItem key={d.id} icon={deckIcon(d)} label={d.name} onClick={() => void run(close, d)} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </Popover>
  );
}
