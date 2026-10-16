import { Check, Download } from 'lucide-react';
import { getLanguage } from '@/core/lang/languages';
import { FREQUENCY_MILESTONES, STARTER_THEMES } from '@/core/lang/starter';
import { starterKey, useFrequencyProgress, useStarterDecks, useStarterList } from '@/data/starter';
import type { StarterSpec } from '@/data/starter';
import { Button, Card } from '@/design/primitives';
import { installPack, usePackJobs } from '@/services/packs/packs';
import { THEME_ICONS } from '../common/DeckIcon';
import { VocabularyJourney } from './VocabularyJourney';


/** The ready-made library: a path of frequency milestones and a shelf of themed sets. */
export function StarterLibrary({ lang, onOpen }: { lang: string; onOpen: (spec: StarterSpec) => void }) {
  const list = useStarterList(lang);
  const added = useStarterDecks(lang);
  const progress = useFrequencyProgress(lang, FREQUENCY_MILESTONES);
  const job = usePackJobs((s) => s.jobs[lang]);
  const name = getLanguage(lang)?.name ?? lang;

  if (list === undefined) return <div className="h-64" />;
  if (list === null) {
    return (
      <Card className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <p className="flex-1 text-sm text-ink-soft">
          Ready-made {name} decks come with the {name} dictionary{job ? ', which is being installed now.' : '.'}
        </p>
        {!job && (
          <Button variant="secondary" icon={Download} onClick={() => void installPack(lang)}>
            Install dictionary
          </Button>
        )}
      </Card>
    );
  }

  const milestones = FREQUENCY_MILESTONES.filter((_, i) => i === 0 || FREQUENCY_MILESTONES[i - 1] < list.lemmaFreq.length);
  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-1 font-serif text-[22px] font-semibold">Your vocabulary journey</h3>
        <VocabularyJourney
          milestones={milestones}
          progress={progress}
          added={(m) => Boolean(added?.get(starterKey({ kind: 'frequency', milestone: m })))}
          onOpen={(m) => onOpen({ kind: 'frequency', milestone: m })}
        />
        <p className="mt-1 text-[12.5px] text-ink-faint">Each stop adds the next band of words, so you never see a word twice.</p>
      </section>

      <div>
        <h3 className="mb-3 text-[13px] font-bold tracking-wide text-ink-soft uppercase">Themes</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {STARTER_THEMES.filter((t) => list.themes[t.id]?.length).map((t) => {
            const Icon = THEME_ICONS[t.id];
            const deck = added?.get(starterKey({ kind: 'theme', id: t.id }));
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onOpen({ kind: 'theme', id: t.id })}
                className="no-callout group flex flex-col items-start gap-3 rounded-2xl border border-line/70 bg-surface p-4 text-left transition-[transform,border-color,background-color] duration-150 hover:border-line-strong hover:bg-raised active:scale-[0.98]"
              >
                <span className="flex w-full items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-sage-soft text-sage-text">
                    <Icon size={19} aria-hidden />
                  </span>
                  {deck && (
                    <span className="grid size-6 place-items-center rounded-full bg-sage text-bg" title="Added">
                      <Check size={14} strokeWidth={3} aria-label="Added" />
                    </span>
                  )}
                </span>
                <span>
                  <span className="block text-[15px] leading-tight font-semibold">{t.name}</span>
                  <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-snug text-ink-soft">{t.blurb}</span>
                </span>
                <span className="text-[12px] font-bold text-ink-faint">{list.themes[t.id].length} words</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
