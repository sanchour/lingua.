import { useState } from 'react';
import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { PRICES } from '@/data/plan';
import type { Feature, PlanKind } from '@/data/plan';
import { Button, Segmented } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { TEST_MODE } from '@/services/licence/config';
import { buy } from '@/services/licence/store';
import type { Product } from '@/services/licence/store';
import { toast } from '@/state/ui';
import { MaxMark } from './PlanMarks';

/** What each plan adds, in the order the plans screen lists it (D4's table, 5.1-2a). */
export const PLAN_LISTS: Record<PlanKind, string[]> = {
  free: [
    'Codex: every book, article and comic, with every word a tap away',
    'Thesaurus: unlimited decks and flashcards, Discover, add anything',
    'Sonus et Visio: your library, audiobooks and the radio',
    'Cursus: alphabets and writing',
    'Mentis: Mundus the guide and Diarium',
    'Ratio and every setting',
  ],
  plus: ['Ludus, the games for your decks', 'Sonus+: music to sing, podcasts, song games', 'Streaming: your services’ shows with study subtitles', 'Cursus: the course, Grammatica and typing', 'Sermo: scenes to talk through in your AI app', 'Every update, for life'],
  max: ['Everything in Lingua+', 'AI translation and Explain in context', 'Diary checking and feedback on your writing', 'Automatic dictation for audio and video', 'Natural AI voices', 'With your own free Groq or Gemini key'],
};

/** Which plan a locked feature needs, for the highlight. */
const NEEDS: Record<Feature, Exclude<PlanKind, 'free'>> = { ludus: 'plus', sonusPlus: 'plus', streaming: 'plus', course: 'plus', grammatica: 'plus', typing: 'plus', sermo: 'plus', ai: 'max' };

interface PlanCardsProps {
  current: PlanKind;
  /** The feature that sent the learner here: its plan is lifted. */
  feature?: Feature;
  /** "Continue free" (onboarding and the sheet); without it the free card only says it's yours. */
  onFree?: () => void;
  onBought?: () => void;
}

/** Buying a plan: which product is on its way, and the call that starts it (shared with the first start's pitch). */
export function useBuy(onBought?: () => void) {
  const [busy, setBusy] = useState<Product | null>(null);
  const get = async (product: Product) => {
    setBusy(product);
    try {
      const done = await buy(product);
      const name = product === 'plus' ? 'Lingua+' : 'Lingua+ Max';
      if (done === 'pretend') toast(`${name} is on. Test mode: nothing was charged.`, { tone: 'success' });
      else toast('Finish paying on the page that opened. Lingua picks up your licence when you come back.', { duration: 9000 });
      onBought?.();
    } finally {
      setBusy(null);
    }
  };
  return { busy, get };
}

/** Free, Lingua+ and Max side by side: what each adds, its price, one button. Never pushy. */
export function PlanCards({ current, feature, onFree, onBought }: PlanCardsProps) {
  const [yearly, setYearly] = useState(false);
  const { busy, get } = useBuy(onBought);
  const lifted = feature ? NEEDS[feature] : 'plus';

  return (
    <div>
      <div className="grid gap-3 md:grid-cols-3">
        <Column title="Free" price="Free" note="Always" lifted={false} items={PLAN_LISTS.free}>
          {onFree ? (
            <Button variant="secondary" block onClick={onFree}>
              Continue free
            </Button>
          ) : (
            <p className="h-10 text-center text-[13.5px] leading-10 font-semibold text-ink-faint">{current === 'free' ? 'Your plan' : 'Always included'}</p>
          )}
        </Column>
        <Column title={<>Lingua<span className="text-accent-text">+</span></>} price={PRICES.plus} note="Once, with every update" lifted={lifted === 'plus'} badge={lifted === 'plus' ? 'Best value' : undefined} items={PLAN_LISTS.plus}>
          {current === 'free' ? (
            <Button block loading={busy === 'plus'} onClick={() => void get('plus')}>
              Get Lingua+
            </Button>
          ) : (
            <p className="h-10 text-center text-[13.5px] leading-10 font-semibold text-sage-text">{current === 'plus' ? 'Your plan' : 'Included in Max'}</p>
          )}
        </Column>
        <Column
          title={
            <span className="inline-flex items-center gap-2">
              Lingua<span className="-ml-2 text-accent-text">+</span> <MaxMark />
            </span>
          }
          price={yearly ? PRICES.maxYear : PRICES.maxMonth}
          note={yearly ? 'A year (about €4.17 a month)' : 'A month, cancel any time'}
          lifted={lifted === 'max'}
          items={PLAN_LISTS.max}
        >
          {current === 'max' ? (
            <p className="h-10 text-center text-[13.5px] leading-10 font-semibold text-sage-text">Your plan</p>
          ) : (
            <div className="space-y-2">
              <Segmented<'year' | 'month'>
                block
                label="Billing"
                value={yearly ? 'year' : 'month'}
                onChange={(v) => setYearly(v === 'year')}
                options={[
                  { value: 'month', label: 'Monthly' },
                  { value: 'year', label: 'Yearly' },
                ]}
              />
              <Button block variant={lifted === 'max' ? 'primary' : 'secondary'} loading={busy === 'maxYear' || busy === 'maxMonth'} onClick={() => void get(yearly ? 'maxYear' : 'maxMonth')}>
                Get Max
              </Button>
            </div>
          )}
        </Column>
      </div>
      <p className="mt-4 text-center text-[12.5px] leading-snug text-ink-faint">
        {TEST_MODE ? 'Test mode: the buttons switch the plan on this device and charge nothing.' : 'Payments go through Stripe. Max renews until you cancel it in Settings › Lingua+.'} Lingua+ bought once stays yours,
        Max or not.
      </p>
    </div>
  );
}

function Column({ title, price, note, items, lifted, badge, children }: { title: ReactNode; price: string; note: string; items: string[]; lifted: boolean; badge?: string; children: ReactNode }) {
  return (
    <section className={cx('relative flex flex-col rounded-3xl border p-4 sm:p-5 transition-colors', lifted ? 'border-accent/45 bg-raised shadow-elev-2' : 'border-line bg-surface')}>
      {badge && <span className="absolute -top-2.5 left-5 rounded-full bg-accent-fill px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-on-accent">{badge}</span>}
      <h3 className="font-serif text-[22px] leading-tight font-semibold">{title}</h3>
      <p className="mt-3 font-serif text-[30px] leading-none font-semibold tabular-nums">{price}</p>
      <p className="mt-1 text-[12.5px] text-ink-faint">{note}</p>
      <ul className="mt-3.5 flex-1 space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-[13.5px] leading-snug text-ink-soft">
            <Check size={15} className="mt-0.5 shrink-0 text-sage-text" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-4">{children}</div>
    </section>
  );
}
