import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, Layers } from 'lucide-react';
import { getLanguage } from '@/core/lang/languages';
import { frequencyBand, getTheme } from '@/core/lang/starter';
import { addStarterDeck, starterItems, starterKey, starterName, useStarterDecks } from '@/data/starter';
import type { StarterItem, StarterSpec } from '@/data/starter';
import { Badge, Button, Drawer, ToggleRow } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { toast } from '@/state/ui';
import { articleFor } from '../common/words';

const PREVIEW = 40;

/** A ready-made deck before it's added: its words, what you already know, and one tap to add it. */
export function StarterDrawer({ lang, spec, onClose }: { lang: string; spec: StarterSpec | null; onClose: () => void }) {
  const navigate = useNavigate();
  const added = useStarterDecks(lang);
  const [items, setItems] = useState<StarterItem[] | null>(null);
  const [skipKnown, setSkipKnown] = useState(true);
  const [busy, setBusy] = useState(false);
  const deck = spec ? added?.get(starterKey(spec)) : undefined;

  useEffect(() => {
    if (!spec) return;
    let alive = true;
    setItems(null);
    void starterItems(lang, spec).then((list) => alive && setItems(list));
    return () => {
      alive = false;
    };
  }, [lang, spec]);

  const usable = items?.filter((i) => i.meaning) ?? [];
  const known = usable.filter((i) => i.known && !i.inDeck).length;
  const inDeck = usable.filter((i) => i.inDeck).length;
  const toAdd = usable.length - inDeck - (skipKnown ? known : 0);
  const language = getLanguage(lang)?.name ?? lang;

  const description = !spec
    ? ''
    : spec.kind === 'frequency'
      ? (() => {
          const [from, to] = frequencyBand(spec.milestone);
          return from === 1 ? `The ${to} most common ${language} words` : `${language} words ${from.toLocaleString('en')}–${to.toLocaleString('en')} by frequency`;
        })()
      : (getTheme(spec.id)?.blurb ?? '');

  const add = async () => {
    if (!spec) return;
    setBusy(true);
    try {
      const result = await addStarterDeck(lang, spec, { skipKnown });
      onClose();
      toast(`${starterName(spec)} is ready · ${result.added.toLocaleString()} cards`, {
        tone: 'success',
        action: { label: 'Study', onClick: () => navigate(`/thesaurus/study/${result.deckId}?mode=recall`) },
      });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'That deck couldn’t be added.', { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      open={Boolean(spec)}
      onClose={onClose}
      title={spec ? starterName(spec) : ''}
      description={description}
      footer={
        deck ? (
          <div className="flex gap-2">
            <Button variant="secondary" block onClick={() => (onClose(), navigate(`/thesaurus/deck/${deck.id}`))}>
              Open deck
            </Button>
            <Button block icon={Layers} onClick={() => (onClose(), navigate(`/thesaurus/study/${deck.id}?mode=recall`))}>
              Study
            </Button>
          </div>
        ) : (
          <Button block size="lg" iconRight={ArrowRight} disabled={!items || toAdd <= 0} loading={busy} onClick={() => void add()}>
            {toAdd > 0 ? `Add ${toAdd.toLocaleString()} ${toAdd === 1 ? 'card' : 'cards'}` : 'Nothing new to add'}
          </Button>
        )
      }
    >
      {items === null ? (
        <div className="space-y-2 pt-2" aria-hidden>
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-11 animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            <Badge>{usable.length.toLocaleString()} words</Badge>
            {known > 0 && <Badge tone="sage">{known.toLocaleString()} you know</Badge>}
            {inDeck > 0 && <Badge tone="accent">{inDeck.toLocaleString()} already in your decks</Badge>}
          </div>
          {deck ? (
            <p className="mt-4 text-sm text-ink-soft">This deck is in your Thesaurus.</p>
          ) : (
            known > 0 && (
              <div className="mt-2 border-b border-line">
                <ToggleRow title="Leave out words I know" description="Words marked Known in your reading or by your level." checked={skipKnown} onChange={setSkipKnown} />
              </div>
            )
          )}
          <ul className="mt-3 divide-y divide-line/60">
            {usable.slice(0, PREVIEW).map((item, i) => {
              const article = articleFor(lang, item.gender, item.term, item.pos);
              const faded = item.inDeck || (skipKnown && item.known);
              return (
                <li key={`${item.term}-${i}`} className={cx('flex items-baseline gap-3 py-2.5', faded && 'opacity-45')}>
                  <span lang={lang} className="min-w-0 shrink-0 basis-[45%] truncate font-serif text-[17px]">
                    {article && <span className="text-ink-faint">{article} </span>}
                    {item.term}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">{item.meaning}</span>
                  {item.known && !item.inDeck && <span className="shrink-0 text-[11px] font-bold text-sage-text">known</span>}
                </li>
              );
            })}
          </ul>
          {usable.length > PREVIEW && <p className="mt-3 text-center text-[13px] text-ink-faint">and {(usable.length - PREVIEW).toLocaleString()} more</p>}
        </>
      )}
    </Drawer>
  );
}
