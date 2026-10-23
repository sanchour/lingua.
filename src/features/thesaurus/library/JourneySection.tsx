import { FREQUENCY_MILESTONES } from '@/core/lang/starter';
import { starterKey, useFrequencyProgress, useStarterDecks, useStarterList } from '@/data/starter';
import type { StarterSpec } from '@/data/starter';
import { VocabularyJourney } from './VocabularyJourney';

/** "Your vocabulary journey" under My decks (5.1-3b): the frequency path, stop by stop. Nothing until the pack is in. */
export function JourneySection({ lang, onOpen }: { lang: string; onOpen: (spec: StarterSpec) => void }) {
  const list = useStarterList(lang);
  const added = useStarterDecks(lang);
  const progress = useFrequencyProgress(lang, FREQUENCY_MILESTONES);
  if (!list) return null;

  const milestones = FREQUENCY_MILESTONES.filter((_, i) => i === 0 || FREQUENCY_MILESTONES[i - 1] < list.lemmaFreq.length);
  return (
    <section className="mt-10">
      <h3 className="mb-1 font-serif text-[22px] font-semibold">Your vocabulary journey</h3>
      <VocabularyJourney
        milestones={milestones}
        progress={progress}
        added={(m) => Boolean(added?.get(starterKey({ kind: 'frequency', milestone: m })))}
        onOpen={(m) => onOpen({ kind: 'frequency', milestone: m })}
      />
      <p className="mt-1 text-[12.5px] text-ink-faint">Each stop adds the next band of words, so you never see a word twice.</p>
    </section>
  );
}
