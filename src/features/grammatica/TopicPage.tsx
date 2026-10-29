import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { Bookmark, Check, FileText } from 'lucide-react';
import { useApp } from '@/app/context';
import { BackLink } from '@/app/BackLink';
import { PageHeader } from '@/app/PageHeader';
import { topicState } from '@/core/grammar/progress';
import { findTopic, openingExamples } from '@/core/grammar/types';
import { getPrerequisites } from '@/core/grammar/prerequisites';
import { useGrammarBookmarks, toggleGrammarBookmark, useGrammarNote, saveGrammarNote } from '@/data/grammarUserData';
import { useGrammarItems, useGrammarProgress } from '@/data/grammar';
import { Card } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { LessonCard } from './LessonCard';
import { CompareView, Rich, Section, SentenceLine, TableView, useGrammar, WatchOut } from './parts';

/**
 * One grammar topic, examples first: a few real sentences (each can be played), then the rule,
 * then tables, a side-by-side comparison where two structures are easily confused, and more
 * sentences to read.
 * In 6-7: prerequisites ("Before this: …"), bookmarking, and personal notes stored to the notebook.
 */
export default function TopicPage() {
  const { topicId = '' } = useParams();
  const { language } = useApp();
  const lang = language.id;
  const grammar = useGrammar(lang);
  const progress = useGrammarProgress(lang);
  const items = useGrammarItems(lang);
  const bookmarks = useGrammarBookmarks(lang);
  const existingNote = useGrammarNote(lang, topicId);

  const [noteText, setNoteText] = useState('');
  useEffect(() => {
    if (existingNote !== undefined) setNoteText(existingNote);
  }, [existingNote]);

  const found = grammar ? findTopic(grammar, topicId) : undefined;
  const state = useMemo(() => (found && progress && items ? topicState(found, progress.get(found.id), items, Date.now()) : undefined), [found, progress, items]);

  const learned = useMemo(() => {
    const set = new Set<string>();
    if (!grammar || !progress || !items) return set;
    const now = Date.now();
    for (const unit of grammar.units) {
      for (const t of unit.topics) {
        if (topicState(t, progress.get(t.id), items, now).learned) set.add(t.id);
      }
    }
    return set;
  }, [grammar, progress, items]);

  if (grammar === undefined) return <div className="h-64" />;
  const topic = grammar ? findTopic(grammar, topicId) : undefined;
  // A topic from another language (after a language switch) leads back to the list.
  if (!grammar || !topic) return <Navigate to="/cursus/grammatica" replace />;

  const isBookmarked = bookmarks.has(topic.id);
  const prereqs = getPrerequisites(grammar, topic);
  const unit = grammar.units.find((u) => u.topics.includes(topic));
  const opening = openingExamples(topic);
  const openingSet = new Set(opening.map((e) => e.s.replace(/[[\]]/g, '')));
  const more = topic.items.filter((i) => !openingSet.has(i.s.replace(/[[\]]/g, '')));
  const related = (topic.related ?? []).map((id) => findTopic(grammar, id)).filter((t) => t !== undefined);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center justify-between">
        <BackLink to="/cursus/grammatica">Grammatica</BackLink>
        <button
          type="button"
          onClick={() => void toggleGrammarBookmark(lang, topic.id)}
          className={cx(
            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-semibold transition-colors',
            isBookmarked
              ? 'border-accent/40 bg-accent-soft/30 text-accent-text'
              : 'border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink',
          )}
          aria-pressed={isBookmarked}
          title={isBookmarked ? 'Remove bookmark' : 'Bookmark this topic'}
        >
          <Bookmark size={15} fill={isBookmarked ? 'currentColor' : 'none'} aria-hidden />
          <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
        </button>
      </div>

      <PageHeader title={topic.title} eyebrow={`${topic.level} · ${unit?.title ?? 'Grammar'}`} />
      <p className="-mt-3 text-[17px] leading-snug text-ink-soft">{topic.summary}</p>

      {/* Prerequisites: Before this */}
      {prereqs.length > 0 && (
        <div className="mt-5 rounded-2xl border border-line/70 bg-surface/70 p-4">
          <p className="text-[12px] font-bold tracking-wide uppercase text-ink-faint">Before this: Recommended foundations</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {prereqs.map((p) => {
              const done = learned.has(p.id);
              return (
                <Link
                  key={p.id}
                  to={`/cursus/grammatica/${p.id}`}
                  className={cx(
                    'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[13.5px] font-medium transition-colors',
                    done ? 'border-sage/50 bg-sage-soft/30 text-ink' : 'border-line bg-raised hover:border-line-strong',
                  )}
                >
                  {done ? <Check size={14} className="text-sage-text" aria-hidden /> : null}
                  <span>{p.title}</span>
                  <span className="text-[11.5px] text-ink-faint">{p.level}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 max-w-3xl">
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

          {/* Personal note on topic (notebook) */}
          <Section title="Your notes">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText size={16} className="text-ink-faint" aria-hidden />
                <span className="text-[13px] font-medium text-ink-faint">Notebook entry for this rule</span>
              </div>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onBlur={() => void saveGrammarNote(lang, topic.id, noteText)}
                placeholder="A reminder, personal mnemonic, or example in your own words…"
                rows={3}
                className="w-full resize-y rounded-xl border border-line bg-raised px-3 py-2 text-[14.5px] leading-snug outline-none placeholder:text-ink-faint focus:border-ink"
              />
              <div className="mt-2 flex items-center justify-between text-[12px] text-ink-faint">
                <span>Saved automatically on leaving the box.</span>
                {noteText.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setNoteText('');
                      void saveGrammarNote(lang, topic.id, '');
                    }}
                    className="hover:text-ink"
                  >
                    Clear note
                  </button>
                )}
              </div>
            </Card>
          </Section>

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
        <aside className="order-first lg:sticky lg:top-6 lg:order-last">
          <LessonCard topic={topic} state={state} />
        </aside>
      </div>
    </div>
  );
}
