import { UiText, useUi } from '@/design/i18n/UiText';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, AudioLines, Check, Gamepad2, GraduationCap, HardDrive, Infinity as Forever, KeyRound, Languages, Lightbulb, MessagesSquare, Mic, Music, PenLine, RotateCcw, ShieldCheck, Tv } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PRICES } from '@/data/plan';
import type { PlanKind } from '@/data/plan';
import { spring } from '@/design/motion';
import { Button, Segmented } from '@/design/primitives';
import { TEST_MODE } from '@/services/licence/config';
import { toast } from '@/state/ui';
import { useBuy } from './PlanCards';

type Perk = { icon: LucideIcon; name: string; text: string };

const PLUS: Perk[] = [
  { icon: Gamepad2, name: 'Ludus', text: 'Games that drill your own decks' },
  { icon: Music, name: 'Sonus+', text: 'Sing along, podcasts, song games' },
  { icon: Tv, name: 'Streaming', text: 'Your shows with study subtitles' },
  { icon: GraduationCap, name: 'Cursus', text: 'The course, Grammatica and typing' },
  { icon: MessagesSquare, name: 'Sermo', text: 'Scenes to talk through in your AI app' },
  { icon: Forever, name: 'Every update', text: 'For life, no subscription' },
];
const MAX: Perk[] = [
  { icon: Languages, name: 'AI translation', text: 'Any sentence, in its context' },
  { icon: Lightbulb, name: 'Explain', text: 'Why it’s said that way' },
  { icon: PenLine, name: 'Diary feedback', text: 'Corrections on your own writing' },
  { icon: Mic, name: 'Dictation', text: 'Text for any audio and video' },
  { icon: AudioLines, name: 'Natural voices', text: 'Hear it as it’s really spoken' },
  { icon: KeyRound, name: 'Your own key', text: 'Free Groq or Gemini, kept on your device' },
];

/** Max a year against twelve months of it, and what a year comes to each month. */
const [YEAR, MONTH] = [parseFloat(PRICES.maxYear.slice(1)), parseFloat(PRICES.maxMonth.slice(1))];
const SAVING = Math.round((1 - YEAR / (MONTH * 12)) * 100);
const PER_MONTH = `€${(YEAR / 12).toFixed(2)}`;

function Perks({ perks }: { perks: Perk[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-3">
      {perks.map(({ icon: Icon, name, text }) => (
        <li key={name} className="flex gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-text">
            <Icon size={16} strokeWidth={1.8} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-[13.5px] leading-tight font-semibold">{name}</span>
            <span className="block text-[12px] leading-snug text-ink-soft">{text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Yours({ children }: { children: ReactNode }) {
  return (
    <p className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-sage/15 text-[14.5px] font-semibold text-sage-text">
      <Check size={17} strokeWidth={3} aria-hidden /> {children}
    </p>
  );
}

/**
 * The first start's last page (5.1-2b): Lingua+ and Max made worth wanting. Two big cards, Lingua+ in
 * the page's own light and Max always in the evening's, each with what it opens and one big button;
 * free stays one clear line under them. Only true promises: what each plan opens, how it is paid, and
 * that words stay on the device.
 */
export function PlanPitch({ current, onFree, replay = false }: { current: PlanKind; onFree: () => void; replay?: boolean }) {
  const translateUi = useUi();
  const [period, setPeriod] = useState<'month' | 'year'>('month');
  const { busy, get: buyNow } = useBuy();
  // The Device lab's replay of the first start (7-0d) buys nothing.
  const get = replay ? async (_: Parameters<typeof buyNow>[0]) => void toast('Buying is off in the replay.') : buyNow;
  const rise = (i: number) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { ...spring.soft, delay: 0.08 + i * 0.1 } });

  return (
    <div>
      <div className="mb-4 text-center">
        <p className="text-[12px] font-bold tracking-[0.14em] text-accent-text uppercase"><UiText source={'One last page'} /></p>
        <h1 className="mt-1 font-serif text-[34px] leading-tight font-semibold tracking-tight"><UiText source={'Unlock all of Lingua'} /></h1>
        <p className="mt-1 text-[15px] text-ink-soft"><UiText source={'Free stays free, for good. Go further with Lingua+, once, or bring AI along with Max.'} /></p>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <motion.section {...rise(0)} className="relative flex flex-col overflow-hidden rounded-[28px] border border-accent/45 bg-gradient-to-br from-accent-soft via-raised to-raised p-5 shadow-elev-3">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-serif text-[28px] leading-none font-semibold"><UiText source={'Lingua{0}'} values={[<span className="text-accent-text">+</span>]} /></h2>
            <span className="rounded-full bg-accent-fill px-3 py-1 text-[11.5px] font-bold tracking-wide text-on-accent"><UiText source={'Pay once, keep it'} /></span>
          </div>
          <p className="mt-3 flex items-baseline gap-2">
            <span className="font-serif text-[42px] leading-none font-semibold tabular-nums">{PRICES.plus}</span>
            <span className="text-[13.5px] text-ink-soft"><UiText source={'once, every update included'} /></span>
          </p>
          <div className="mt-4 flex-1">
            <Perks perks={PLUS} />
          </div>
          <div className="mt-4">
            {current === 'free' ? (
              <Button size="lg" block loading={busy === 'plus'} onClick={() => void get('plus')} iconRight={ArrowRight}><UiText source={'Get Lingua+ for {0}'} values={[PRICES.plus]} /></Button>
            ) : (
              <Yours>{current === 'plus' ? translateUi('Lingua+ is yours') : translateUi('Included in your Max')}</Yours>
            )}
          </div>
        </motion.section>

        {/* Max is always drawn in the evening's light: dark, with the gold foil. */}
        <motion.section {...rise(1)} data-theme="nocturne" data-palette="charcoal" className="relative flex flex-col overflow-hidden rounded-[28px] border border-accent/60 bg-bg p-5 text-ink shadow-elev-3 ring-1 ring-accent/25">
          <span className="pointer-events-none absolute -top-24 -right-20 size-72 rounded-full bg-accent/25 blur-3xl" aria-hidden />
          <div className="relative flex items-start justify-between gap-3">
            <h2 className="flex items-center gap-2.5 font-serif text-[28px] leading-none font-semibold">
              <span><UiText source={'Lingua{0}'} values={[<span className="text-accent-text">+</span>]} /></span>
              <span className="plan-max-word font-sans text-[16px] font-bold tracking-[0.32em]"><UiText source={'MAX'} /></span>
            </h2>
            <Segmented<'month' | 'year'>
              label={translateUi('Billing')}
              value={period}
              onChange={setPeriod}
              options={[
                { value: 'month', label: translateUi('Monthly') },
                { value: 'year', label: translateUi('Yearly') },
              ]}
            />
          </div>
          <p className="relative mt-3 flex items-baseline gap-2">
            <span className="font-serif text-[42px] leading-none font-semibold tabular-nums">{period === 'month' ? PRICES.maxMonth : PRICES.maxYear}</span>
            <span className="text-[13.5px] text-ink-soft">{period === 'month' ? translateUi('a month, cancel any time') : translateUi('a year: about {0} a month, save {1}%', [PER_MONTH, SAVING])}</span>
          </p>
          <div className="relative mt-4 flex-1">
            <Perks perks={MAX} />
          </div>
          <div className="relative mt-4">
            {current === 'max' ? (
              <Yours><UiText source={'Max is yours'} /></Yours>
            ) : (
              <Button size="lg" block loading={busy === 'maxMonth' || busy === 'maxYear'} onClick={() => void get(period === 'month' ? 'maxMonth' : 'maxYear')} iconRight={ArrowRight}><UiText source={'Get Max{0}'} values={[current === 'free' ? ', with everything in Lingua+' : '']} /></Button>
            )}
          </div>
        </motion.section>
      </div>

      <motion.div {...rise(2)} className="mt-3 flex items-center gap-4 rounded-2xl border border-line bg-surface px-5 py-3">
        <p className="min-w-0 flex-1 text-[13.5px] text-ink-soft"><UiText source={'{0} every book and article, your decks, the radio and audiobooks, alphabets, Mundus and Diarium.'} values={[<span className="font-semibold text-ink"><UiText source={'Free, for good:'} /></span>]} /></p>
        <Button variant="ghost" onClick={onFree} iconRight={ArrowRight}><UiText source={'Continue free'} /></Button>
      </motion.div>

      <ul className="mt-2.5 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-[12px] text-ink-faint">
        <li className="flex items-center gap-1.5">
          <ShieldCheck size={14} aria-hidden /> {TEST_MODE ? translateUi('Test mode: nothing is charged') : translateUi('Secure payment with Stripe')}
        </li>
        <li className="flex items-center gap-1.5"><UiText source={'{0} Lingua+ stays yours, Max or not'} values={[<Forever size={14} aria-hidden />]} /></li>
        <li className="flex items-center gap-1.5"><UiText source={'{0} Cancel Max any time'} values={[<RotateCcw size={14} aria-hidden />]} /></li>
        <li className="flex items-center gap-1.5"><UiText source={'{0} Your words stay on your device'} values={[<HardDrive size={14} aria-hidden />]} /></li>
      </ul>
    </div>
  );
}
