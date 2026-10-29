import { DeckLook } from './DeckLook';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Check, Eraser, Trash2 } from 'lucide-react';
import { EXERCISE_KINDS, EXERCISE_NAME } from '@/core/srs/ludus';
import { parseSteps } from '@/core/srs/scheduler';
import { orderNewCards, setDeckDirections, updateDeck } from '@/data/decks';
import { DEFAULT_SETTINGS, useSettings } from '@/data/settings';
import type { Card, Deck, Note } from '@/data/types';
import { Button, Drawer, Segmented, Slider, ToggleRow } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { CARD_WIDTH, cardLookProps } from '../common/cardLook';
import type { CardLook } from '../common/cardLook';
import { articleFor, splitAt } from '../common/words';

type Ways = 'recognition' | 'production' | 'both';
const toWays = (d: Card['direction'][]): Ways => (d.length > 1 ? 'both' : d[0] === 'production' ? 'production' : 'recognition');
const fromWays = (w: Ways): Card['direction'][] => (w === 'both' ? ['recognition', 'production'] : [w]);

/** A deck's card width: the one every card has, or its own. */
type CardWidthChoice = 'all' | NonNullable<Deck['config']['cardWidth']>;
type NewOrder = NonNullable<Deck['config']['newOrder']>;

interface DeckSettingsProps {
  deck: Deck;
  open: boolean;
  onClose: () => void;
  /** The deck's words, in the page's order: the preview shows the first (with a sentence, for that front). */
  samples: Note[];
  /** The danger zone's two actions; the page asks before doing either. */
  onForget: () => void;
  onDelete: () => void;
}

/**
 * How a deck is studied (5.1-3b): a live card at the top, then Daily limits, Order, Card look, Ludus
 * and the Danger zone. Nothing changes until Save.
 */
export function DeckSettings({ deck, open, onClose, samples, onForget, onDelete }: DeckSettingsProps) {
  const settings = useSettings();
  const look = settings?.cards ?? DEFAULT_SETTINGS.cards;
  const globalOff = useMemo(() => new Set(settings?.lessons.ludusOff ?? []), [settings]);
  const [newPerDay, setNewPerDay] = useState(deck.config.newPerDay);
  const [maxReviews, setMaxReviews] = useState(deck.config.maxReviews);
  const [retention, setRetention] = useState(deck.config.desiredRetention);
  const [ways, setWays] = useState<Ways>(toWays(deck.config.directions));
  const [order, setOrder] = useState<NewOrder>(deck.config.newOrder ?? 'ordered');
  const [front, setFront] = useState(deck.config.front ?? 'word');
  const [width, setWidth] = useState<CardWidthChoice>(deck.config.cardWidth ?? 'all');
  const [off, setOff] = useState<string[]>(deck.config.ludusOff ?? []);
  const [bury, setBury] = useState(Boolean(deck.config.burySiblings));
  const [steps, setSteps] = useState((deck.config.learningSteps ?? []).join(' '));
  const [about, setAbout] = useState(deck.description ?? '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNewPerDay(deck.config.newPerDay);
    setMaxReviews(deck.config.maxReviews);
    setRetention(deck.config.desiredRetention);
    setWays(toWays(deck.config.directions));
    setOrder(deck.config.newOrder ?? 'ordered');
    setFront(deck.config.front ?? 'word');
    setWidth(deck.config.cardWidth ?? 'all');
    setOff(deck.config.ludusOff ?? []);
    setBury(Boolean(deck.config.burySiblings));
    setSteps((deck.config.learningSteps ?? []).join(' '));
    setAbout(deck.description ?? '');
  }, [open, deck]);

  const save = async () => {
    setBusy(true);
    await updateDeck(deck.id, {
      description: about.trim() || undefined,
      config: { ...deck.config, newPerDay, maxReviews, desiredRetention: retention, front, cardWidth: width === 'all' ? undefined : width, newOrder: order, ludusOff: off.length ? off : undefined, burySiblings: bury || undefined, learningSteps: parseSteps(steps) },
    });
    if (ways !== toWays(deck.config.directions)) await setDeckDirections(deck.id, fromWays(ways));
    // The order is written into the cards, so a new direction's cards follow it too.
    if (order !== (deck.config.newOrder ?? 'ordered') || ways !== toWays(deck.config.directions)) await orderNewCards(deck.id, order);
    setBusy(false);
    onClose();
  };

  // At least two kinds of exercise stay on, counting those turned off for every lesson.
  const toggleKind = (kind: string) => {
    if (off.includes(kind)) return setOff(off.filter((k) => k !== kind));
    const left = EXERCISE_KINDS.filter((k) => !globalOff.has(k) && !off.includes(k) && k !== kind);
    if (left.length >= 2) setOff([...off, kind]);
  };

  const danger = (act: () => void) => () => {
    onClose();
    act();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Deck settings"
      description={deck.name}
      footer={
        <Button block size="lg" loading={busy} onClick={() => void save()}>
          Save
        </Button>
      }
    >
      <div className="space-y-7">
        <Preview note={(front === 'sentence' && samples.find((n) => n.example?.text)) || samples[0]} lang={deck.lang} ways={ways} front={front} width={CARD_WIDTH[width === 'all' ? (look.width ?? 'normal') : width]} look={look} />

        <Section title="Look">
          <DeckLook deck={deck} />
        </Section>

        <Section title="About">
          <label className="block">
            <span className="mb-2 block text-[14px] font-semibold">Description</span>
            <textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={2} maxLength={300} placeholder="What this deck is for" className="w-full resize-y rounded-xl border border-line bg-raised p-3 text-[15px] outline-none focus:border-accent" />
          </label>
        </Section>

        <Section title="Daily limits">
          <Slider label="New cards a day" value={newPerDay} min={0} max={100} step={1} onChange={setNewPerDay} format={(v) => String(v)} />
          <Slider label="Reviews a day, at most" value={maxReviews} min={20} max={1000} step={10} onChange={setMaxReviews} format={(v) => String(v)} />
          <div>
            <Slider label="Remember" value={Math.round(retention * 100)} min={80} max={97} step={1} onChange={(v) => setRetention(v / 100)} format={(v) => `${v}%`} />
            <Hint>How sure you want to be of a card when it comes back. Higher means more reviews; 90% is a calm balance.</Hint>
          </div>
        </Section>

        <Section title="Order">
          <Field label="Study direction">
            <Segmented<Ways>
              label="Study direction"
              block
              value={ways}
              onChange={setWays}
              options={[
                { value: 'recognition', label: 'Word → meaning' },
                { value: 'production', label: 'Meaning → word' },
                { value: 'both', label: 'Both' },
              ]}
            />
            {ways !== toWays(deck.config.directions) && (
              <Hint>
                {ways === 'both' || !deck.config.directions.includes(ways === 'recognition' ? 'recognition' : 'production')
                  ? 'New cards are added for the other direction.'
                  : 'Cards for the direction you turn off are removed, with their history.'}
              </Hint>
            )}
          </Field>
          {ways === 'both' && <ToggleRow title="One direction a day" description="After you answer a word one way, the other way waits until tomorrow." checked={bury} onChange={setBury} />}
          <Field label="Learning steps">
            <input value={steps} onChange={(e) => setSteps(e.target.value)} placeholder="1m 10m (the default)" aria-label="Learning steps" className="h-10 w-full rounded-xl border border-line bg-bg px-3 text-[15px] outline-none focus:border-ink" autoComplete="off" />
            {steps.trim() && !parseSteps(steps) && <Hint>Use up to four, each longer than the one before: 1m, 10m, 1h, 1d.</Hint>}
            {!steps.trim() && <Hint>How long a new or forgotten card waits between its first looks.</Hint>}
          </Field>
          <Field label="New cards">
            <Segmented<NewOrder>
              label="New cards"
              block
              value={order}
              onChange={setOrder}
              options={[
                { value: 'ordered', label: 'Most common first' },
                { value: 'shuffled', label: 'Shuffled' },
              ]}
            />
            <Hint>{order === 'ordered' ? 'The most common words come first, where the deck knows how common they are; the rest as they were added.' : 'New cards come in a random order, shuffled once now.'}</Hint>
          </Field>
        </Section>

        <Section title="Card look">
          <Field label="Front">
            <Segmented<'word' | 'sentence'>
              label="Card front"
              block
              value={front}
              onChange={setFront}
              options={[
                { value: 'word', label: 'The word' },
                { value: 'sentence', label: 'A sentence with a gap' },
              ]}
            />
          </Field>
          <Field label="Width">
            <Segmented<CardWidthChoice>
              label="Card width"
              block
              value={width}
              onChange={setWidth}
              options={[
                { value: 'all', label: 'As all cards' },
                { value: 'thin', label: 'Thin' },
                { value: 'normal', label: 'Normal' },
                { value: 'wide', label: 'Wide' },
              ]}
            />
          </Field>
          <Hint>The style, colour and font are the same for every card: Settings › Study and cards.</Hint>
        </Section>

        <Section title="Ludus">
          <Hint>The exercises in this deck’s lessons. Click one to leave it out here; greyed ones are off for every lesson.</Hint>
          <div className="flex flex-wrap gap-1.5">
            {EXERCISE_KINDS.map((kind) => {
              const everywhere = globalOff.has(kind);
              const on = !everywhere && !off.includes(kind);
              return (
                <button
                  key={kind}
                  type="button"
                  disabled={everywhere}
                  aria-pressed={on}
                  onClick={() => toggleKind(kind)}
                  title={everywhere ? 'Off for every lesson (Ludus’s own settings)' : undefined}
                  className={cx(
                    'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition-colors',
                    on ? 'border-transparent bg-sage-soft text-sage-text' : 'border-line text-ink-faint hover:border-line-strong hover:text-ink-soft',
                    everywhere && 'cursor-not-allowed opacity-50',
                  )}
                >
                  {on && <Check size={13} strokeWidth={3} aria-hidden />}
                  {EXERCISE_NAME[kind]}
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Danger zone" danger>
          <DangerRow title="Forget progress" detail="Every card back to new. Its review history stays in Ratio." action={<Button variant="secondary" size="sm" icon={Eraser} onClick={danger(onForget)}>Forget…</Button>} />
          <DangerRow title="Delete deck" detail="The deck, its cards and their history go." action={<Button variant="danger" size="sm" icon={Trash2} onClick={danger(onDelete)}>Delete…</Button>} />
        </Section>
      </div>
    </Drawer>
  );
}

function Section({ title, danger = false, children }: { title: string; danger?: boolean; children: ReactNode }) {
  return (
    <section className={cx('space-y-4 border-t pt-5', danger ? 'border-accent/30' : 'border-line')}>
      <h3 className={cx('text-[12px] font-bold tracking-[0.12em] uppercase', danger ? 'text-accent-text' : 'text-ink-faint')}>{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[14px] font-semibold">{label}</p>
      {children}
    </div>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <p data-hint="" className="mt-1.5 text-[13px] leading-snug text-ink-soft">{children}</p>;
}

function DangerRow({ title, detail, action }: { title: string; detail: string; action: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold">{title}</p>
        <p className="text-[12.5px] leading-snug text-ink-soft">{detail}</p>
      </div>
      {action}
    </div>
  );
}

interface PreviewProps {
  note?: Note;
  lang: string;
  ways: Ways;
  front: 'word' | 'sentence';
  width: number;
  look: CardLook;
}

/** The deck's card as it will look: its front and, under a line, its back, drawn at the chosen width. */
function Preview({ note, lang, ways, front, width, look }: PreviewProps) {
  const props = cardLookProps(look, lang);
  const term = note?.term ?? 'palabra';
  const meaning = note?.meaning ?? 'word';
  const article = note ? articleFor(lang, note.gender, note.term, note.pos) : null;
  const sentence = note?.example?.text;
  const gap = sentence && front === 'sentence' && ways !== 'production' ? splitAt(sentence, note?.example?.cloze ?? findSpan(sentence, term, lang)) : null;
  const word = (
    <span lang={lang}>
      {article && <span className="font-normal text-ink-faint">{article} </span>}
      {term}
    </span>
  );
  const shown = ways === 'production' ? meaning : gap ? null : word;
  return (
    <div className="rounded-2xl bg-sunken/60 px-4 py-5">
      <div
        data-look={props['data-look']}
        data-tint={props['data-tint']}
        style={{ ...props.style, width: `${Math.round((width / CARD_WIDTH.wide) * 100)}%` }}
        className="flashcard mx-auto flex min-h-[132px] flex-col items-center justify-center rounded-[18px] border border-line px-4 py-4 text-center shadow-elev-1 transition-[width] duration-300"
      >
        {gap ? (
          <p lang={lang} className="text-[15px] leading-snug">
            {gap[0]}
            <span className="inline-block min-w-12 border-b-2 border-ink-faint align-baseline" aria-label="the missing word" />
            {gap[2]}
          </p>
        ) : (
          <p className="text-[22px] leading-tight font-semibold break-words">{shown}</p>
        )}
        <span className="my-3 h-px w-10 bg-line" aria-hidden />
        <p className="text-[13.5px] text-ink-soft">{ways === 'production' ? word : meaning}</p>
      </div>
      <p className="mt-2.5 text-center text-[12px] text-ink-faint">
        {ways === 'both'
          ? 'Both ways: this card, and one with the meaning in front.'
          : gap
            ? 'A sentence with the word missing; cards without one show the word.'
            : front === 'sentence' && ways === 'recognition'
              ? 'No word here has a sentence yet, so its cards show the word.'
              : 'Front, then the back under the line.'}
      </p>
    </div>
  );
}

const findSpan = (sentence: string, term: string, lang: string): [number, number] | undefined => {
  const at = sentence.toLocaleLowerCase(lang).indexOf(term.toLocaleLowerCase(lang));
  return at >= 0 ? [at, at + term.length] : undefined;
};
