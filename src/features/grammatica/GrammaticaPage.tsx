import { useMemo } from 'react';
import { Link } from 'react-router';
import { ArrowRight, BookA, Compass, RotateCcw, Zap } from 'lucide-react';
import { useApp } from '@/app/context';
import { PageHeader } from '@/app/PageHeader';
import { getLanguage } from '@/core/lang/languages';
import { nextTopic, topicState } from '@/core/grammar/progress';
import type { TopicState } from '@/core/grammar/progress';
import type { Topic } from '@/core/grammar/types';
import { useGrammarItems, useGrammarProgress } from '@/data/grammar';
import { Badge, buttonClasses, Card, EmptyState } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { eyebrow, TopicRing, useGrammar } from './parts';
import { LettersCard } from './letters/LettersCard';

/**
 * Grammatica (Lingua 3.0-8): the language's grammar as short topics, A1 first. Each topic opens
 * with real sentences, then a short rule, tables and comparisons. Nothing is locked; "Next up" is
 * only a suggestion at the learner's level.
 */
export default function GrammaticaPage() {
  const { language } = useApp();
  const lang = language.id;
  const info = getLanguage(lang);
  const grammar = useGrammar(lang);
  const progress = useGrammarProgress(lang);
  const items = useGrammarItems(lang);

  const states = useMemo(() => {
    const out = new Map<string, TopicState>();
    if (!grammar || !progress || !items) return out;
    const now = Date.now();
    for (const unit of grammar.units) for (const t of unit.topics) out.set(t.id, topicState(t, progress.get(t.id), items, now));
    return out;
  }, [grammar, progress, items]);

  const dueCount = [...states.values()].reduce((n, s) => n + s.due, 0);
  const next = grammar && progress ? nextTopic(grammar, progress, language.level) : undefined;

  return (
    <>
      <PageHeader title="Grammatica" eyebrow={`Grammar in ${info?.name ?? lang}`} />
      {grammar === undefined ? (
        <div className="h-64" />
      ) : grammar === null ? (
        <>
          <LettersCard lang={lang} />
          <Card>
            <EmptyState icon={BookA} title={`No grammar for ${info?.name ?? lang} yet`}>
              Grammatica has topics for the main languages first. Your words, decks and the reader work as always.
            </EmptyState>
          </Card>
        </>
      ) : (
        <>
          <LettersCard lang={lang} />
          {next && <NextUp topic={next} state={states.get(next.id)} />}
          {progress && progress.size === 0 && <Placement />}
          <Practice due={dueCount} placed={!!progress && progress.size > 0} />
          {grammar.units.map((unit) => (
            <section key={unit.title} className="mt-10 first:mt-0">
              <div className="mb-3.5 flex items-baseline justify-between gap-3">
                <h2 className="font-serif text-[22px] font-semibold">{unit.title}</h2>
                <p className={eyebrow}>{levelSpan(unit.topics)}</p>
              </div>
              <ul className="grid gap-2.5 xl:grid-cols-2">
                {unit.topics.map((t) => (
                  <li key={t.id}>
                    <TopicRow topic={t} state={states.get(t.id)} next={t.id === next?.id} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <p className="mt-10 text-[12.5px] leading-relaxed text-ink-faint">
            Every sentence comes from Lingua’s {info?.name ?? lang} dictionary (Wiktionary, CC BY-SA). Rules checked against{' '}
            {grammar.sources.map((s, i) => (
              <span key={s.name}>
                {i > 0 && (i === grammar.sources.length - 1 ? ' and ' : ', ')}
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noreferrer" className="underline decoration-line-strong underline-offset-2 hover:text-ink-soft">
                    {s.name}
                  </a>
                ) : (
                  s.name
                )}
              </span>
            ))}
            .
          </p>
        </>
      )}
    </>
  );
}

function levelSpan(topics: Topic[]): string {
  const levels = [...new Set(topics.map((t) => t.level))];
  return levels.length > 1 ? `${levels[0]}–${levels[levels.length - 1]}` : (levels[0] ?? '');
}

function NextUp({ topic, state }: { topic: Topic; state?: TopicState }) {
  return (
    <Link
      to={`/cursus/grammatica/${topic.id}`}
      className="group mb-2 flex items-center gap-4 rounded-3xl border border-line/70 bg-surface p-5 transition-colors hover:border-line-strong sm:p-6"
    >
      <TopicRing state={state} size={56} />
      <span className="min-w-0 flex-1">
        <span className={cx(eyebrow, 'block text-sage-text')}>{state?.started ? 'Carry on' : 'Next up'} · {topic.level}</span>
        <span className="mt-1 block font-serif text-[21px] leading-tight font-semibold">{topic.title}</span>
        <span className="mt-1 line-clamp-2 block text-[14px] leading-snug text-ink-soft">{topic.summary}</span>
      </span>
      <ArrowRight size={20} className="shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

function TopicRow({ topic, state, next }: { topic: Topic; state?: TopicState; next: boolean }) {
  return (
    <Link
      to={`/cursus/grammatica/${topic.id}`}
      className={cx(
        'flex h-full items-center gap-3.5 rounded-2xl border p-3.5 transition-colors active:scale-[0.99]',
        next ? 'border-sage/50 bg-sage-soft/30' : 'border-line/60 bg-surface hover:border-line-strong',
      )}
    >
      <TopicRing state={state} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="min-w-0 text-[15.5px] leading-snug font-semibold">{topic.title}</span>
          {state && state.due > 0 && <Badge tone="accent">{state.due} due</Badge>}
        </span>
        <span className="mt-0.5 line-clamp-2 block text-[13.5px] leading-snug text-ink-soft">{topic.summary}</span>
      </span>
      <Badge>{topic.level}</Badge>
    </Link>
  );
}

/** Before anything is begun: a quick check that marks the topics already known. */
function Placement() {
  return (
    <div className="mb-2 flex flex-col gap-3 rounded-3xl border border-dashed border-line-strong/70 p-5 sm:flex-row sm:items-center sm:p-6">
      <Compass size={26} className="shrink-0 text-accent-text" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block font-serif text-[18px] leading-snug font-semibold">Know some already?</span>
        <span className="mt-0.5 block text-[14px] leading-snug text-ink-soft">A two-minute check, two quick questions per topic. What you get right is marked learned, so you start where you are.</span>
      </span>
      <Link to="/cursus/grammatica/placement" className={cx(buttonClasses('secondary', 'md'), 'shrink-0')}>
        Check what I know
      </Link>
    </div>
  );
}

/** Review what's due across topics, or a Lightning round over the topics begun. */
function Practice({ due, placed }: { due: number; placed: boolean }) {
  return (
    <div className="mb-2 flex flex-wrap gap-2">
      <Link to="/cursus/grammatica/review" className={cx(buttonClasses(due ? 'primary' : 'secondary', 'md'), 'flex-1 sm:flex-none', !due && 'pointer-events-none opacity-60')} aria-disabled={!due}>
        <RotateCcw size={17} aria-hidden />
        {due ? `Review ${due} due` : 'Nothing due to review'}
      </Link>
      <Link to="/cursus/grammatica/review?mode=lightning" className={cx(buttonClasses('secondary', 'md'), 'flex-1 sm:flex-none')}>
        <Zap size={17} aria-hidden />
        Lightning round
      </Link>
      {placed && (
        <Link to="/cursus/grammatica/placement" className={cx(buttonClasses('ghost', 'md'), 'flex-1 sm:ml-auto sm:flex-none')}>
          <Compass size={17} aria-hidden />
          Check what I know
        </Link>
      )}
    </div>
  );
}
