import { UiText, useUi } from '@/design/i18n/UiText';
// The learner's weak spots (6-5), in Ratio: what they keep getting wrong, from the one record every room writes to.
// A mistake on three different days, or in three places, is persistent; once is a slip, and is not shown.
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Target } from 'lucide-react';
import type { EvidenceItem, WeakSpot } from '@/core/contracts/learner';
import { loadGrammar } from '@/core/grammar/load';
import { findTopic } from '@/core/grammar/types';
import type { Grammar } from '@/core/grammar/types';
import { useWeakSpots } from '@/data/learner';
import { Panel } from './common';

/** What a spot is about, in words: the word, the grammar topic's title, or the sound. */
export function nameOf(item: EvidenceItem, grammar: Grammar | null | undefined): string {
  switch (item.type) {
    case 'word':
      return item.wordId.split(':').slice(1).join(':');
    case 'grammar':
      return (grammar && findTopic(grammar, item.topicId)?.title) || item.topicId.replace(/^course:/, '').replace(/[:-]/g, ' ');
    case 'sound':
      return item.soundId;
    default:
      return 'A sentence pattern';
  }
}

const where = (s: WeakSpot) => (s.item.type === 'grammar' && !s.item.topicId.startsWith('course:') ? `/cursus/grammatica/${s.item.topicId}` : undefined);

export function WeakSpotsPanel({ lang }: { lang: string }) {
  const translateUi = useUi();
  const spots = useWeakSpots(lang, { limit: 40 });
  const [grammar, setGrammar] = useState<Grammar | null>();
  useEffect(() => {
    let alive = true;
    void loadGrammar(lang).then((g) => alive && setGrammar(g ?? null));
    return () => {
      alive = false;
    };
  }, [lang]);
  const persistent = (spots ?? []).filter((s) => s.persistent).slice(0, 6);
  if (!persistent.length) return null;

  return (
    <Panel title={translateUi('Weak spots')} icon={Target}>
      <p className="mb-3 text-[13.5px] text-ink-soft"><UiText source={'What you keep getting wrong, on different days or in different places. Practise these first.'} /></p>
      <ul className="divide-y divide-line/60">
        {persistent.map((s) => {
          const to = where(s);
          const name = nameOf(s.item, grammar);
          return (
            <li key={`${s.item.type}-${JSON.stringify(s.item)}-${s.category ?? ''}`} className="flex items-center gap-3 py-2.5">
              <span className="min-w-0 flex-1">
                {to ? (
                  <Link to={to} className="font-serif text-[16px] font-semibold hover:underline">
                    {name}
                  </Link>
                ) : (
                  <span lang={s.item.type === 'word' ? lang : undefined} className="font-serif text-[16px] font-semibold">
                    {name}
                  </span>
                )}
                {s.category && <span className="ml-2 text-[12.5px] text-ink-faint">{s.category.replace('-', ' ')}</span>}
              </span>
              <span className="shrink-0 text-[12.5px] text-ink-soft tabular-nums"><UiText source={'wrong {0}× on {1} {2}'} values={[s.wrong, s.days, s.days === 1 ? <UiText source={'day'} /> : <UiText source={'days'} />]} /></span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
