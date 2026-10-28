import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, BookA, Check, Compass, RotateCcw, Zap } from 'lucide-react';
import { useApp } from '@/app/context';
import { PageHeader } from '@/app/PageHeader';
import { getLanguage } from '@/core/lang/languages';
import { grammarLevel, ladder, levelPath, weakSpots, whyNext } from '@/core/grammar/path';
import type { PathStatus } from '@/core/grammar/path';
import { nextTopic, STEPS, topicState } from '@/core/grammar/progress';
import type { TopicState } from '@/core/grammar/progress';
import type { GrammarLevel, Topic } from '@/core/grammar/types';
import { useGrammarItems, useGrammarProgress } from '@/data/grammar';
import { Badge, buttonClasses, Card, EmptyState, Segmented } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { eyebrow, TopicRing, useGrammar } from './parts';
import { LettersCard } from './letters/LettersCard';

/**
 * Grammatica (Lingua 3.0-8, a guided path in 5.2-8): the next step large with its reason, a ladder of levels, the chosen
 * level as a path, and on the right what is due, what slipped, and the placement check. All topics is one tab away.
 * Nothing is locked; the path is only a suggestion at the learner's level.
 */
export default function GrammaticaPage() {
  const { language } = useApp();
  const lang = language.id;
  const info = getLanguage(lang);
  const grammar = useGrammar(lang);
  const progress = useGrammarProgress(lang);
  const items = useGrammarItems(lang);
  const [tab, setTab] = useState<'path' | 'all'>('path');
  const [picked, setPicked] = useState<GrammarLevel>();

  const ready = Boolean(grammar && progress && items);
  const states = useMemo(() => {
    const out = new Map<string, TopicState>();
    if (!grammar || !progress || !items) return out;
    const now = Date.now();
    for (const unit of grammar.units) for (const t of unit.topics) out.set(t.id, topicState(t, progress.get(t.id), items, now));
    return out;
  }, [grammar, progress, items]);

  const learned = useMemo(() => new Set([...states].filter(([, s]) => s.learned).map(([id]) => id)), [states]);
  const dueCount = [...states.values()].reduce((n, s) => n + s.due, 0);
  const next = grammar && progress ? nextTopic(grammar, progress, language.level) : undefined;
  const rungs = useMemo(() => (grammar ? ladder(grammar, learned) : []), [grammar, learned]);
  const weak = useMemo(() => (grammar && items ? weakSpots(grammar, items, Date.now()) : []), [grammar, items]);
  const level = picked ?? next?.level ?? grammarLevel(language.level);
  const path = useMemo(() => (grammar ? levelPath(grammar, level, learned, next?.id) : []), [grammar, level, learned, next?.id]);
  const placed = Boolean(progress && progress.size > 0);

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
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0">
            <div className="mb-5">
              <Segmented<'path' | 'all'>
                label="View"
                value={tab}
                onChange={setTab}
                options={[
                  { value: 'path', label: 'Your path' },
                  { value: 'all', label: 'All topics' },
                ]}
              />
            </div>
            {tab === 'path' ? (
              <>
                {next ? (
                  <NextStep topic={next} state={states.get(next.id)} why={ready ? whyNext(grammar, next, states.get(next.id), language.level, learned) : ''} />
                ) : (
                  ready && (
                    <Card className="p-6">
                      <p className="font-serif text-[20px] font-semibold">Every topic is learned.</p>
                      <p className="mt-1 text-[14.5px] text-ink-soft">Reviews keep them fresh; a Lightning round is a good way to use them.</p>
                    </Card>
                  )
                )}
                <Ladder rungs={rungs} learnerLevel={grammarLevel(language.level)} picked={level} onPick={setPicked} />
                <ol className="mt-4 grid gap-2" aria-label={`${level} topics`}>
                  {path.map((stop) => (
                    <li key={stop.topic.id}>
                      <PathRow topic={stop.topic} status={stop.status} state={states.get(stop.topic.id)} />
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <AllTopics units={grammar.units} states={states} nextId={next?.id} />
            )}
            <Sources name={info?.name ?? lang} sources={grammar.sources} />
          </div>

          <aside className="grid gap-4 lg:sticky lg:top-6">
            <Due due={dueCount} />
            {weak.length > 0 && (
              <Card className="p-4">
                <p className={eyebrow}>Where it slips</p>
                <ul className="mt-2 grid gap-1">
                  {weak.map((w) => (
                    <li key={w.topic.id}>
                      <Link to={`/cursus/grammatica/${w.topic.id}`} className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-[14.5px] transition-colors hover:bg-sunken">
                        <span className="min-w-0 flex-1 truncate font-semibold">{w.topic.title}</span>
                        <span className="shrink-0 text-[12.5px] text-ink-faint">
                          missed {w.lapses}×{w.due ? ` · ${w.due} due` : ''}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            <Placement placed={placed} />
            <LettersCard lang={lang} />
          </aside>
        </div>
      )}
    </>
  );
}

/** The next topic, large: why it is next, its five steps, and Start. */
function NextStep({ topic, state, why }: { topic: Topic; state?: TopicState; why: string }) {
  const step = state?.step ?? 1;
  return (
    <div className="rounded-3xl border border-line/70 bg-surface p-5 sm:p-7">
      <div className="flex items-start gap-5">
        <TopicRing state={state} size={72} />
        <div className="min-w-0 flex-1">
          <p className={cx(eyebrow, 'text-sage-text')}>
            {state?.started ? 'Carry on' : 'Your next step'} · {topic.level}
          </p>
          <h2 className="mt-1 font-serif text-[clamp(1.5rem,2.4vw,1.9rem)] leading-tight font-semibold">{topic.title}</h2>
          <p className="mt-1.5 text-[15.5px] leading-snug text-ink-soft">{topic.summary}</p>
          {why && <p className="mt-3 text-[14.5px] leading-snug text-ink-faint">{why}</p>}
        </div>
      </div>
      <ol className="mt-5 grid grid-cols-5 gap-2" aria-label="The five steps">
        {STEPS.map((s) => (
          <li key={s.n} title={s.hint}>
            <div className={cx('h-1.5 rounded-full', s.n < step ? 'bg-sage' : s.n === step ? 'bg-sage/40' : 'bg-sunken')} />
            <p className={cx('mt-1.5 text-[12.5px] font-semibold', s.n === step ? 'text-ink' : 'text-ink-faint')}>{s.name}</p>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <Link to={`/cursus/grammatica/${topic.id}/lesson`} className={buttonClasses('primary', 'lg')}>
          {state?.started ? `Continue: step ${Math.min(step, 5)}` : 'Start'}
          <ArrowRight size={18} aria-hidden />
        </Link>
        <Link to={`/cursus/grammatica/${topic.id}`} className={buttonClasses('ghost', 'lg')}>
          Read the topic first
        </Link>
      </div>
    </div>
  );
}

/** The levels the grammar has, with how many topics are learned; a level can be picked to see its path. */
function Ladder({ rungs, learnerLevel, picked, onPick }: { rungs: ReturnType<typeof ladder>; learnerLevel: GrammarLevel; picked: GrammarLevel; onPick: (l: GrammarLevel) => void }) {
  return (
    <div className="mt-6 grid gap-2.5" style={{ gridTemplateColumns: `repeat(${Math.max(1, rungs.length)}, minmax(0, 1fr))` }} role="group" aria-label="Levels">
      {rungs.map((r) => (
        <button
          key={r.level}
          type="button"
          aria-pressed={r.level === picked}
          onClick={() => onPick(r.level)}
          className={cx('no-callout rounded-2xl border p-3 text-left transition-colors', r.level === picked ? 'border-sage/60 bg-sage-soft/30' : 'border-line/60 bg-surface hover:border-line-strong')}
        >
          <span className="flex items-baseline justify-between gap-2">
            <span className="font-serif text-[18px] font-semibold">{r.level}</span>
            {r.level === learnerLevel && <span className="text-[11.5px] font-bold tracking-wide text-accent-text uppercase">You</span>}
          </span>
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-sunken">
            <span className="block h-full rounded-full bg-sage" style={{ width: `${(r.learned / r.total) * 100}%` }} />
          </span>
          <span className="mt-1.5 block text-[12.5px] text-ink-faint tabular-nums">
            {r.learned} of {r.total}
          </span>
        </button>
      ))}
    </div>
  );
}

const STATUS_LABEL: Record<PathStatus, string> = { done: 'Learned', current: 'Now', next: 'Next', later: '' };

function PathRow({ topic, status, state }: { topic: Topic; status: PathStatus; state?: TopicState }) {
  return (
    <Link
      to={`/cursus/grammatica/${topic.id}`}
      className={cx(
        'flex items-center gap-3.5 rounded-2xl border p-3 transition-colors active:scale-[0.995]',
        status === 'current' ? 'border-sage/50 bg-sage-soft/30' : 'border-line/60 bg-surface hover:border-line-strong',
        status === 'later' && 'opacity-80',
      )}
    >
      <TopicRing state={state} size={42} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="min-w-0 truncate text-[15.5px] font-semibold">{topic.title}</span>
          {state && state.due > 0 && <Badge tone="accent">{state.due} due</Badge>}
        </span>
        <span className="mt-0.5 line-clamp-1 block text-[13.5px] text-ink-soft">{topic.summary}</span>
      </span>
      {STATUS_LABEL[status] && (
        <span className={cx('inline-flex shrink-0 items-center gap-1 text-[12.5px] font-bold tracking-wide uppercase', status === 'done' ? 'text-sage-text' : status === 'current' ? 'text-accent-text' : 'text-ink-faint')}>
          {status === 'done' && <Check size={13} strokeWidth={2.6} aria-hidden />}
          {STATUS_LABEL[status]}
        </span>
      )}
    </Link>
  );
}

/** Every topic, by unit, one click from the path. */
function AllTopics({ units, states, nextId }: { units: Array<{ title: string; topics: Topic[] }>; states: Map<string, TopicState>; nextId?: string }) {
  return (
    <>
      {units.map((unit) => (
        <section key={unit.title} className="mt-8 first:mt-0">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="font-serif text-[21px] font-semibold">{unit.title}</h2>
            <p className={eyebrow}>{levelSpan(unit.topics)}</p>
          </div>
          <ul className="grid gap-2.5 xl:grid-cols-2">
            {unit.topics.map((t) => (
              <li key={t.id}>
                <TopicRow topic={t} state={states.get(t.id)} next={t.id === nextId} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

function levelSpan(topics: Topic[]): string {
  const levels = [...new Set(topics.map((t) => t.level))];
  return levels.length > 1 ? `${levels[0]}–${levels[levels.length - 1]}` : (levels[0] ?? '');
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

function Sources({ name, sources }: { name: string; sources: Array<{ name: string; url?: string }> }) {
  return (
    <p className="mt-10 text-[12.5px] leading-relaxed text-ink-faint">
      Every sentence comes from Lingua’s {name} dictionary (Wiktionary, CC BY-SA). Rules checked against{' '}
      {sources.map((s, i) => (
        <span key={s.name}>
          {i > 0 && (i === sources.length - 1 ? ' and ' : ', ')}
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
  );
}

/** Review what's due across topics, or a Lightning round over the topics begun. */
function Due({ due }: { due: number }) {
  return (
    <Card className="p-4">
      <p className={eyebrow}>Reviews</p>
      <p className="mt-1 font-serif text-[20px] leading-snug font-semibold">{due ? `${due} due` : 'Nothing due'}</p>
      <div className="mt-3 grid gap-2">
        <Link to="/cursus/grammatica/review" className={cx(buttonClasses(due ? 'primary' : 'secondary', 'md'), !due && 'pointer-events-none opacity-60')} aria-disabled={!due}>
          <RotateCcw size={17} aria-hidden />
          {due ? `Review ${due} due` : 'Nothing to review'}
        </Link>
        <Link to="/cursus/grammatica/review?mode=lightning" className={buttonClasses('secondary', 'md')}>
          <Zap size={17} aria-hidden />
          Lightning round
        </Link>
      </div>
    </Card>
  );
}

/** A quick check that marks the topics already known, so the path starts where the learner is. */
function Placement({ placed }: { placed: boolean }) {
  return (
    <Card className={cx('p-4', !placed && 'border-dashed border-line-strong/70')}>
      <div className="flex items-start gap-3">
        <Compass size={22} className="mt-0.5 shrink-0 text-accent-text" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-serif text-[17px] leading-snug font-semibold">{placed ? 'Check what I know' : 'Know some already?'}</p>
          <p className="mt-0.5 text-[13.5px] leading-snug text-ink-soft">A two-minute check, two quick questions per topic. What you get right is marked learned, so you start where you are.</p>
          <Link to="/cursus/grammatica/placement" className={cx(buttonClasses(placed ? 'ghost' : 'secondary', 'sm'), 'mt-2.5')}>
            Start the check
          </Link>
        </div>
      </div>
    </Card>
  );
}
