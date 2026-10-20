import { Link } from 'react-router';
import { ArrowRight, Gem, RotateCcw } from 'lucide-react';
import { SECTIONS } from '@/app/sections';
import { FREE_ROOMS, getPlus, hasPlus, PLUS_PRICE, PLUS_ROOMS, resetPlus } from '@/data/plus';
import type { Settings } from '@/data/settings';
import { Button } from '@/design/primitives';
import { toast } from '@/state/ui';
import { SettingsSection } from '../SettingsSection';

const BLURB: Record<string, string> = {
  Codex: 'Read books, articles and comics with every word at a tap.',
  Thesaurus: 'Your words and decks, spaced so they stick.',
  Sonus: 'Podcasts, audiobooks, music and radio with live text.',
  Visio: 'Films and shows with subtitles you can study.',
  Mundus: 'A guide to what to read, watch and play next.',
  Grammatica: 'Grammar when you need it, with drills.',
  Colloquium: 'Talk with an AI, in your language.',
  Ratio: 'Your time, words and progress.',
};

function Rooms({ title, names }: { title: string; names: string[] }) {
  return (
    <div className="mt-6">
      <p className="mb-2 text-[12px] font-bold tracking-[0.14em] text-ink-faint uppercase">{title}</p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {names.map((name) => {
          const room = SECTIONS.find((s) => s.name === name);
          const Icon = room?.icon;
          return (
            <li key={name}>
              <Link to={room?.path ?? '/'} className="group flex h-full items-start gap-3 rounded-2xl border border-line p-3.5 transition-colors hover:border-line-strong hover:bg-surface/60">
                {Icon && (
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sage-soft text-sage-text">
                    <Icon size={18} aria-hidden />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold">{name}</span>
                  <span className="block text-[13px] leading-snug text-ink-soft">{BLURB[name]}</span>
                </span>
                <ArrowRight size={15} className="mt-1 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Lingua+ (a preview: nothing is charged and nothing is locked): what it is, what is in it, get or reset. */
export function PlusSection({ meta }: { meta: Settings['meta'] }) {
  const owned = hasPlus(meta);
  const since = owned ? new Date(meta.plusAt!).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  return (
    <SettingsSection id="plus" icon={Gem} title="Lingua+" description="One purchase, no subscription: Lingua+ opens every room. The free edition keeps Codex and Thesaurus.">
      <div className="flex flex-col items-start gap-3 rounded-2xl bg-accent-soft/50 p-5 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="font-serif text-[22px] leading-tight font-semibold">{owned ? 'Everything is open to you.' : `Every room, once, for ${PLUS_PRICE}.`}</p>
          <p className="mt-1 text-[13.5px] text-ink-soft">
            {owned ? `Yours since ${since}. This is a preview: nothing was charged.` : 'A preview for now: the button charges nothing, and nothing is locked yet.'}
          </p>
        </div>
        {owned ? (
          <Button
            variant="secondary"
            icon={RotateCcw}
            onClick={() => {
              void resetPlus();
              toast('Lingua+ is removed from this device.');
            }}
          >
            Reset Lingua+
          </Button>
        ) : (
          <Button
            icon={Gem}
            onClick={() => {
              void getPlus();
              toast('Lingua+ is on. Nothing was charged.', { tone: 'success' });
            }}
          >
            Get Lingua+
          </Button>
        )}
      </div>
      <Rooms title="In the free edition" names={FREE_ROOMS} />
      <Rooms title="With Lingua+" names={PLUS_ROOMS} />
    </SettingsSection>
  );
}
