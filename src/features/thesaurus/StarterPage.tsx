import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { BackLink } from '@/app/BackLink';
import { useDockBottom } from '@/app/dock';
import { motion } from 'motion/react';
import { ArrowRight, Check, Layers } from 'lucide-react';
import { useApp } from '@/app/context';
import { getLanguage } from '@/core/lang/languages';
import { FREQUENCY_MILESTONES, frequencyBand, getTheme, JOURNEY_STAGES } from '@/core/lang/starter';
import { addStarterDeck, starterItems, starterName, useStarterDecks, starterKey } from '@/data/starter';
import type { StarterItem, StarterSpec } from '@/data/starter';
import { Button, Switch } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { toast } from '@/state/ui';
import { THEME_ICONS } from './common/DeckIcon';
import { articleFor, posName } from './common/words';

const PAGE = 120;

/** "top-500" / "theme-food" → the ready-made deck it names. */
export function specFromKey(key: string | undefined): StarterSpec | null {
  if (!key) return null;
  const top = /^top-(\d+)$/.exec(key);
  if (top && FREQUENCY_MILESTONES.includes(Number(top[1]) as (typeof FREQUENCY_MILESTONES)[number])) return { kind: 'frequency', milestone: Number(top[1]) };
  const theme = /^theme-(.+)$/.exec(key);
  return theme && getTheme(theme[1]) ? { kind: 'theme', id: theme[1] } : null;
}

/** A ready-made deck as a little vocabulary booklet: every word, what you know, and one tap to add. */
export default function StarterPage() {
  const { key } = useParams();
  const spec = useMemo(() => specFromKey(key), [key]);
  if (!spec) {
    return (
      <div className="py-20 text-center">
        <p className="font-serif text-xl">That ready-made deck doesn’t exist.</p>
        <Link to="/thesaurus?tab=discover" className="hit mt-4 inline-block font-semibold text-accent-text">
          Back to Discover
        </Link>
      </div>
    );
  }
  return <Booklet key={key} spec={spec} />;
}

function Booklet({ spec }: { spec: StarterSpec }) {
  const { language } = useApp();
  const lang = language.id;
  const navigate = useNavigate();
  const added = useStarterDecks(lang);
  const deck = added?.get(starterKey(spec));
  const [items, setItems] = useState<StarterItem[] | null>(null);
  const [skipKnown, setSkipKnown] = useState(true);
  const [shown, setShown] = useState(PAGE);
  const [busy, setBusy] = useState(false);
  // The bar floats above the tab bar (and the mini player) on phones.
  const barBottom = useDockBottom();

  useEffect(() => {
    let alive = true;
    void starterItems(lang, spec).then((list) => alive && setItems(list));
    return () => {
      alive = false;
    };
  }, [lang, spec]);

  const usable = items?.filter((i) => i.meaning) ?? [];
  const known = usable.filter((i) => i.known && !i.inDeck).length;
  const inDeck = usable.filter((i) => i.inDeck).length;
  const toAdd = usable.length - inDeck - (skipKnown ? known : 0);
  const knownShare = usable.length ? usable.filter((i) => i.known).length / usable.length : 0;
  const languageName = getLanguage(lang)?.name ?? lang;

  const frequency = spec.kind === 'frequency';
  const theme = spec.kind === 'theme' ? getTheme(spec.id) : undefined;
  const Icon = theme ? THEME_ICONS[theme.id] : null;
  const [from, to] = frequency ? frequencyBand(spec.milestone) : [0, 0];
  const stage = frequency ? JOURNEY_STAGES[spec.milestone] : undefined;
  const blurb = frequency
    ? `${from === 1 ? `The ${to} most common` : `Words ${from.toLocaleString('en')}–${to.toLocaleString('en')} by frequency, the next most common`} ${languageName} words. With them you can ${stage?.lets ?? 'read more'}.`
    : theme?.blurb;

  const add = async () => {
    setBusy(true);
    try {
      const result = await addStarterDeck(lang, spec, { skipKnown });
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
    <div className="pb-32">
      <BackLink to="/thesaurus?tab=discover">Discover</BackLink>

      <header className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <motion.span
          className="grid size-24 shrink-0 place-items-center rounded-[28px] bg-sage-soft text-sage-text shadow-elev-1"
          initial={{ scale: 0.9, rotate: -6, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={spring.gentle}
        >
          {Icon ? <Icon size={40} strokeWidth={1.6} aria-hidden /> : <span className="font-serif text-[30px] font-semibold tabular-nums">{to >= 1000 ? `${to / 1000}k` : to}</span>}
        </motion.span>
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[12px] font-bold tracking-[0.14em] text-sage-text uppercase">{frequency ? `Ready-made · ${stage?.name ?? 'Most common words'}` : 'Ready-made · Theme'}</p>
          <h1 className="font-serif text-[34px] leading-tight font-semibold tracking-tight sm:text-[40px]">{frequency ? `Top ${to.toLocaleString('en')}` : theme?.name}</h1>
          {blurb && <p className="mt-1.5 max-w-xl text-[15px] leading-relaxed text-ink-soft">{blurb}</p>}
        </div>
      </header>

      {items && (
        <div className="mt-6 flex flex-col gap-4 rounded-3xl border border-line/70 bg-surface p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold">
              {usable.length.toLocaleString()} words
              {known > 0 && <span className="text-sage-text"> · {known.toLocaleString()} you know</span>}
              {inDeck > 0 && <span className="text-accent-text"> · {inDeck.toLocaleString()} already in your decks</span>}
            </p>
            <div className="mt-2 h-2 max-w-sm overflow-hidden rounded-full bg-sunken">
              <motion.div className="h-full origin-left rounded-full bg-sage" initial={{ scaleX: 0 }} animate={{ scaleX: knownShare }} transition={{ ...spring.gentle, delay: 0.15 }} />
            </div>
          </div>
          {!deck && known > 0 && (
            <label className="flex cursor-pointer items-center gap-3 text-[14px] font-semibold">
              Leave out words I know
              <Switch checked={skipKnown} onChange={setSkipKnown} label="Leave out words I know" />
            </label>
          )}
        </div>
      )}

      <div className="mt-7">
        {items === null ? (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="h-[74px] animate-pulse rounded-2xl bg-surface" />
            ))}
          </div>
        ) : (
          <ol className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {usable.slice(0, shown).map((item, i) => {
              const article = articleFor(lang, item.gender, item.term, item.pos);
              const faded = item.inDeck || (!deck && skipKnown && item.known);
              return (
                <motion.li
                  key={`${item.term}-${i}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: faded ? 0.5 : 1, y: 0 }}
                  transition={{ ...spring.soft, delay: Math.min(i, 24) * 0.012 }}
                  className="group relative flex items-center gap-3 rounded-2xl border border-line/70 bg-raised py-3 pr-2 pl-4 shadow-elev-1"
                >
                  {frequency && <span className="absolute top-2 right-3 text-[10.5px] font-bold text-ink-faint tabular-nums">{(from + i).toLocaleString('en')}</span>}
                  <div className="min-w-0 flex-1">
                    <p lang={lang} className="truncate font-serif text-[18px] leading-tight font-semibold">
                      {article && <span className="font-normal text-ink-faint">{article} </span>}
                      {item.term}
                    </p>
                    <p className="mt-0.5 truncate text-[13px] text-ink-soft">
                      {item.pos && <span className="mr-1.5 text-[10.5px] font-bold tracking-wide text-ink-faint uppercase">{posName(item.pos)}</span>}
                      {item.meaning}
                    </p>
                  </div>
                  {item.known && !item.inDeck ? (
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-sage-soft text-sage-text" title="You know this word">
                      <Check size={14} strokeWidth={3} aria-label="Known" />
                    </span>
                  ) : item.inDeck ? (
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-text" title="Already in your decks">
                      <Layers size={13} aria-label="In your decks" />
                    </span>
                  ) : null}
                </motion.li>
              );
            })}
          </ol>
        )}
        {usable.length > shown && (
          <div className="mt-6 flex justify-center">
            <Button variant="secondary" onClick={() => setShown((n) => n + PAGE)}>
              Show {Math.min(PAGE, usable.length - shown).toLocaleString()} more words
            </Button>
          </div>
        )}
      </div>

      <div className="pointer-events-none fixed inset-x-0 z-20 flex justify-center px-4 lg:pl-[248px]" style={{ bottom: barBottom }}>
        <div className="pointer-events-auto flex w-full max-w-xl items-center gap-2 rounded-3xl border border-line/80 bg-raised/95 p-2 shadow-elev-3 backdrop-blur-xl">
          {deck ? (
            <>
              <p className="min-w-0 flex-1 truncate pl-3 text-[14px] font-semibold text-sage-text">In your Thesaurus</p>
              <Button variant="secondary" onClick={() => navigate(`/thesaurus/deck/${deck.id}`)}>
                Open deck
              </Button>
              <Button icon={Layers} onClick={() => navigate(`/thesaurus/study/${deck.id}?mode=recall`)}>
                Study
              </Button>
            </>
          ) : (
            <Button block size="lg" iconRight={ArrowRight} disabled={!items || toAdd <= 0} loading={busy} onClick={() => void add()} className={cx(toAdd <= 0 && 'opacity-60')}>
              {!items ? 'Opening the booklet…' : toAdd > 0 ? `Add ${toAdd.toLocaleString()} ${toAdd === 1 ? 'card' : 'cards'}` : 'You know every word here'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
