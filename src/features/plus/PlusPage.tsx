import { Link } from 'react-router';
import { ArrowRight, Check, Gem, RotateCcw } from 'lucide-react';
import { useApp } from '@/app/context';
import { PageHeader } from '@/app/PageHeader';
import { SECTIONS } from '@/app/sections';
import { FREE_ROOMS, getPlus, hasPlus, PLUS_PRICE, PLUS_ROOMS, resetPlus } from '@/data/plus';
import { Button, Card } from '@/design/primitives';
import { toast } from '@/state/ui';

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

/** Lingua+ as a room of its own: what it is, what is in it, and how to get or reset it (a preview: nothing is charged or locked). */
export default function PlusPage() {
  const { settings } = useApp();
  const owned = hasPlus(settings.meta);
  const room = (name: string) => SECTIONS.find((s) => s.name === name);
  const since = owned ? new Date(settings.meta.plusAt!).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  return (
    <>
      <PageHeader title="Lingua+" eyebrow={owned ? `Yours since ${since}` : 'One purchase, every room'} />
      <Card className="mb-8 flex flex-col items-start gap-4 bg-accent-soft/50 p-6 sm:flex-row sm:items-center sm:p-8">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-accent text-on-accent">
          <Gem size={26} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-serif text-2xl leading-tight font-semibold">{owned ? 'Everything is open to you.' : `Every room, once, for ${PLUS_PRICE}.`}</p>
          <p className="mt-1 text-[14.5px] text-ink-soft">
            {owned ? 'Thank you for supporting Lingua. This is a preview: nothing was charged.' : 'No subscription. Free keeps Codex and Thesaurus. This is a preview: the button charges nothing, and nothing is locked yet.'}
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
            size="lg"
            icon={Gem}
            onClick={() => {
              void getPlus();
              toast('Lingua+ is on. Nothing was charged.', { tone: 'success' });
            }}
          >
            Get Lingua+
          </Button>
        )}
      </Card>

      {[
        ['In the free edition', FREE_ROOMS],
        ['With Lingua+', PLUS_ROOMS],
      ].map(([title, names]) => (
        <section key={title as string} className="mb-8">
          <h2 className="mb-3 text-[12px] font-bold tracking-[0.14em] text-ink-faint uppercase">{title as string}</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(names as string[]).map((name) => {
              const r = room(name);
              const Icon = r?.icon ?? Check;
              return (
                <li key={name}>
                  <Link to={r?.path ?? '/'} className="group flex h-full items-start gap-3.5 rounded-2xl border border-line bg-raised p-4 transition-colors hover:border-line-strong">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sage-soft text-sage-text">
                      <Icon size={19} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{name}</span>
                      <span className="block text-[13.5px] leading-snug text-ink-soft">{BLURB[name]}</span>
                    </span>
                    <ArrowRight size={16} className="mt-1 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
