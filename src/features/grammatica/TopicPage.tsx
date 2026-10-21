import { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { useApp } from '@/app/context';
import { BackLink } from '@/app/BackLink';
import { PageHeader } from '@/app/PageHeader';
import { topicState } from '@/core/grammar/progress';
import { findTopic, openingExamples } from '@/core/grammar/types';
import { useGrammarItems, useGrammarProgress } from '@/data/grammar';
import { Card } from '@/design/primitives';
import { LessonCard } from './LessonCard';
import { CompareView, Rich, Section, SentenceLine, TableView, useGrammar, WatchOut } from './parts';

/**
 * One grammar topic, examples first: a few real sentences (each can be played), then the rule,
 * then tables, a side-by-side comparison where two structures are easily confused, and more
 * sentences to read.
 */
export default function TopicPage() {
  const { topicId = '' } = useParams();
  const { language } = useApp();
  const lang = language.id;
  const grammar = useGrammar(lang);
  const progress = useGrammarProgress(lang);
  const items = useGrammarItems(lang);
  const found = grammar ? findTopic(grammar, topicId) : undefined;
  const state = useMemo(() => (found && progress && items ? topicState(found, progress.get(found.id), items, Date.now()) : undefined), [found, progress, items]);

  if (grammar === undefined) return <div className="h-64" />;
  const topic = grammar ? findTopic(grammar, topicId) : undefined;
  // A topic from another language (after a language switch) leads back to the list.
  if (!grammar || !topic) return <Navigate to="/cursus/grammatica" replace />;

  const unit = grammar.units.find((u) => u.topics.includes(topic));
  const opening = openingExamples(topic);
  const openingSet = new Set(opening.map((e) => e.s.replace(/[[\]]/g, '')));
  const more = topic.items.filter((i) => !openingSet.has(i.s.replace(/[[\]]/g, '')));
  const related = (topic.related ?? []).map((id) => findTopic(grammar, id)).filter((t) => t !== undefined);

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink to="/cursus/grammatica">Grammatica</BackLink>
      <PageHeader title={topic.title} eyebrow={`${topic.level} · ${unit?.title ?? 'Grammar'}`} />
      <p className="-mt-3 text-[17px] leading-snug text-ink-soft">{topic.summary}</p>
      <LessonCard topic={topic} state={state} />

      <Section title="See it first">
        <Card className="divide-y divide-line/60 p-0">
          {opening.map((ex) => (
            <div key={ex.s} className="px-4 py-4 sm:px-5">
              <SentenceLine example={ex} lang={lang} size="lg" />
            </div>
          ))}
        </Card>
      </Section>

      <Section title="The rule">
        <div className="space-y-3 text-[16.5px] leading-relaxed text-ink-soft">
          {topic.rule.map((p) => (
            <p key={p}>
              <Rich text={p} lang={lang} />
            </p>
          ))}
        </div>
      </Section>

      {topic.compare && (
        <Section title={topic.compare.title}>
          <CompareView compare={topic.compare} lang={lang} />
        </Section>
      )}

      {topic.tables && topic.tables.length > 0 && (
        <Section title={topic.tables.length > 1 ? 'Tables' : 'Table'}>
          <div className="grid gap-5">
            {topic.tables.map((t, i) => (
              <TableView key={i} table={t} lang={lang} />
            ))}
          </div>
        </Section>
      )}

      {topic.watch && (
        <div className="mt-8">
          <WatchOut>{topic.watch}</WatchOut>
        </div>
      )}

      {more.length > 0 && (
        <Section title="More sentences">
          <Card className="divide-y divide-line/60 p-0">
            {more.map((ex) => (
              <div key={ex.s} className="px-4 py-3.5 sm:px-5">
                <SentenceLine example={ex} lang={lang} />
              </div>
            ))}
          </Card>
        </Section>
      )}

      {related.length > 0 && (
        <Section title="Related">
          <div className="flex flex-wrap gap-2">
            {related.map((t) => (
              <Link key={t.id} to={`/cursus/grammatica/${t.id}`} className="rounded-full border border-line px-3.5 py-1.5 text-[14px] font-semibold transition-colors hover:border-line-strong hover:bg-surface">
                {t.title}
              </Link>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
