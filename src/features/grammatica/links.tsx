import { UiText, useUi } from '@/design/i18n/UiText';
// Grammatica from the rest of the app: "Why this form?" in the word drawer, and the Home card.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, BookA, Lightbulb } from 'lucide-react';
import { loadGrammar } from '@/core/grammar/load';
import { nextTopic, topicForTags, topicState } from '@/core/grammar/progress';
import type { Grammar } from '@/core/grammar/types';
import { topicsOf } from '@/core/grammar/types';
import { useGrammarItems, useGrammarProgress } from '@/data/grammar';
import { Card } from '@/design/primitives';
import { TopicRing } from './parts';

function useGrammarOf(lang: string): Grammar | null | undefined {
  const [state, setState] = useState<{ lang: string; grammar: Grammar | null }>();
  useEffect(() => {
    let alive = true;
    void loadGrammar(lang).then((g) => alive && setState({ lang, grammar: g }));
    return () => {
      alive = false;
    };
  }, [lang]);
  return state?.lang === lang ? state.grammar : undefined;
}

/**
 * Under a form's description in the word drawer ("first-person singular preterite indicative of
 * comer"): the grammar topic that explains it, when one matches. Nothing otherwise.
 */
export function WhyThisForm({ lang, description }: { lang: string; description: string }) {
  const grammar = useGrammarOf(lang);
  const topic = useMemo(() => (grammar ? topicForTags(grammar, description.toLowerCase().replace(/[,;()]/g, ' ')) : undefined), [grammar, description]);
  if (!topic) return null;
  return (
    <Link
      to={`/cursus/grammatica/${topic.id}`}
      className="group flex items-center gap-3 rounded-2xl border border-sage/40 bg-sage-soft/40 px-3.5 py-2.5 transition-colors hover:border-sage hover:bg-sage-soft"
    >
      <Lightbulb size={18} className="shrink-0 text-sage-text" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-bold tracking-[0.1em] text-sage-text uppercase"><UiText source={'Why this form?'} /></span>
        <span className="block truncate text-[14.5px] font-semibold">{topic.title}</span>
      </span>
      <ArrowRight size={16} className="shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

/** Grammatica on Home: what's due for review, or the next topic with its ring. Nothing without a grammar. */
export function GrammarHomeCard({ lang, level }: { lang: string; level: string }) {
  const translateUi = useUi();
  const grammar = useGrammarOf(lang);
  const progress = useGrammarProgress(lang);
  const items = useGrammarItems(lang);
  if (!grammar || !progress || !items) return null;
  const now = Date.now();
  const due = items.filter((i) => i.state !== 0 && i.due <= now).length;
  const next = nextTopic(grammar, progress, level);
  const learned = topicsOf(grammar).filter((t) => (progress.get(t.id)?.step ?? 1) >= 6).length;
  if (!next && !due) return null;
  const state = next ? topicState(next, progress.get(next.id), items, now) : undefined;
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="inline-flex items-center gap-1.5 text-[12px] font-bold tracking-[0.12em] text-sage-text uppercase">
          <BookA size={14} aria-hidden /> Grammatica
        </p>
        <Link to="/cursus/grammatica" className="hit inline-flex items-center gap-1 text-[13px] font-semibold text-accent-text hover:underline"><UiText source={'{0} of {1} learned {2}'} values={[learned, topicsOf(grammar).length, <ArrowRight size={14} aria-hidden />]} /></Link>
      </div>
      {due > 0 ? (
        <Link to="/cursus/grammatica/review" className="group -m-2 flex items-center gap-3.5 rounded-2xl p-2 transition-colors hover:bg-surface">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent-soft font-serif text-[18px] font-semibold text-accent-text tabular-nums">{due}</span>
          <span className="min-w-0 flex-1">
            <span className="block font-serif text-[17px] leading-snug font-semibold">{due === 1 ? translateUi('One grammar item to review') : translateUi('{0} grammar items to review', [due])}</span>
            <span className="mt-0.5 block text-[13.5px] text-ink-soft"><UiText source={'A few quick exercises, from the topics you\'ve begun.'} /></span>
          </span>
        </Link>
      ) : (
        next && (
          <Link to={`/cursus/grammatica/${next.id}/lesson`} className="group -m-2 flex items-center gap-3.5 rounded-2xl p-2 transition-colors hover:bg-surface">
            <TopicRing state={state} size={48} />
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] font-semibold text-ink-faint">
                {state?.started ? translateUi('Carry on · step {0} of 5', [state.step]) : translateUi('Next up')} · {next.level}
              </span>
              <span className="block font-serif text-[17px] leading-snug font-semibold">{next.title}</span>
              <span className="mt-0.5 line-clamp-2 block text-[13.5px] leading-snug text-ink-soft">{next.summary}</span>
            </span>
          </Link>
        )
      )}
    </Card>
  );
}
