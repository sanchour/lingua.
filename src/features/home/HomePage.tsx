import { Link } from 'react-router';
import { motion } from 'motion/react';
import { ArrowRight, BookMarked, BookOpen, Flame, Gamepad2, Layers, Sprout, Target } from 'lucide-react';
import { useApp } from '@/app/context';
import { PageHeader } from '@/app/PageHeader';
import { getLanguage } from '@/core/lang/languages';
import { useAllProgress, useLibrary } from '@/data/library';
import { useStreak, useToday } from '@/data/stats';
import { useDueSummary } from '@/data/study';
import { useVocabularyCounts } from '@/data/words';
import { buttonClasses, Card, CardTitle } from '@/design/primitives';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { BookCover } from '@/features/codex/library/BookCover';
import { GoalRing } from './GoalRing';

function greeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 18) return 'Good afternoon';
  if (hour >= 18 && hour < 23) return 'Good evening';
  return 'Burning the midnight oil';
}

const enter = (i: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { ...spring.soft, delay: 0.05 * i },
});

export default function HomePage() {
  const { language } = useApp();
  const target = getLanguage(language.id);

  return (
    <>
      <PageHeader title={greeting(new Date().getHours())} eyebrow={`${target?.endonym ?? language.id} · ${language.level}`} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <motion.div {...enter(0)}>
          <TodayCard lang={language.id} goal={language.dailyGoal.readMinutes} />
        </motion.div>
        <motion.div {...enter(1)}>
          <StreakCard lang={language.id} />
        </motion.div>
        <motion.div {...enter(2)} className="md:col-span-2 lg:col-span-1">
          <VocabularyCard lang={language.id} />
        </motion.div>
        <motion.div {...enter(3)} className="md:col-span-2 lg:col-span-3">
          <ContinueCard lang={language.id} />
        </motion.div>
        <motion.div {...enter(4)} className="md:col-span-2 lg:col-span-3">
          <ReviewCard lang={language.id} />
        </motion.div>
      </div>
    </>
  );
}

function TodayCard({ lang, goal }: { lang: string; goal: number }) {
  const today = useToday(lang);
  const minutes = ((today?.readMs ?? 0) + (today?.listenMs ?? 0) + (today?.watchMs ?? 0)) / 60_000;
  return (
    <Card className="h-full">
      <CardTitle icon={Target}>Today</CardTitle>
      <div className="flex items-center gap-5">
        <GoalRing value={minutes} goal={goal} size={120} />
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-ink-soft">Words read</dt>
            <dd className="font-serif text-xl font-semibold tabular-nums">{(today?.wordsRead ?? 0).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">New words</dt>
            <dd className="font-serif text-xl font-semibold tabular-nums">{((today?.newKnown ?? 0) + (today?.newLearning ?? 0)).toLocaleString()}</dd>
          </div>
        </dl>
      </div>
    </Card>
  );
}

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function StreakCard({ lang }: { lang: string }) {
  const streak = useStreak(lang);
  const days = streak?.days ?? 0;
  // Label the last 7 days ending today.
  const labels = Array.from({ length: 7 }, (_, i) => WEEKDAYS[(new Date(Date.now() - (6 - i) * 86_400_000).getDay() + 6) % 7]);

  return (
    <Card className="h-full">
      <CardTitle icon={Flame}>Streak</CardTitle>
      <div className="flex items-baseline gap-2">
        <span className="font-serif text-4xl font-semibold tabular-nums">{days}</span>
        <span className="text-sm font-semibold text-ink-soft">{days === 1 ? 'day' : 'days'}</span>
      </div>
      <div className="mt-4 flex justify-between gap-1.5">
        {labels.map((label, i) => {
          const met = streak?.week[i] ?? false;
          const today = i === 6;
          return (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <span
                className={cx(
                  'grid size-8 place-items-center rounded-full',
                  met ? 'bg-accent-fill text-on-accent' : today ? 'border-2 border-dashed border-accent/60' : 'bg-sunken',
                )}
              >
                {met && <Flame size={15} aria-hidden />}
              </span>
              <span className={cx('text-[11px] font-bold', today ? 'text-accent-text' : 'text-ink-faint')}>{label}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[13px] text-ink-soft">Reach your daily goal to keep the hearth lit.</p>
    </Card>
  );
}

function VocabularyCard({ lang }: { lang: string }) {
  const counts = useVocabularyCounts(lang);
  return (
    <Card className="h-full">
      <CardTitle icon={Sprout}>Vocabulary</CardTitle>
      <div className="flex items-baseline gap-2">
        <span className="font-serif text-4xl font-semibold tabular-nums">{(counts?.known ?? 0).toLocaleString()}</span>
        <span className="text-sm font-semibold text-ink-soft">words known</span>
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-soft">
        <span className="inline-block size-2.5 rounded-full bg-accent" aria-hidden />
        {(counts?.learning ?? 0).toLocaleString()} learning
      </p>
    </Card>
  );
}

function ContinueCard({ lang }: { lang: string }) {
  const texts = useLibrary(lang);
  const progress = useAllProgress();
  const current = texts?.find((t) => t.kind !== 'shelfItem' && !t.finishedAt && t.lastOpenedAt);
  const pct = current && progress?.get(current.id) ? Math.round(progress.get(current.id)!.percent * 100) : 0;

  return (
    <Card>
      <CardTitle icon={BookMarked}>Continue</CardTitle>
      {current ? (
        <div className="flex items-center gap-4">
          <Link to={`/codex/read/${current.id}`} className="w-14 shrink-0" aria-label={`Continue reading ${current.title}`}>
            <BookCover text={current} size="sm" />
          </Link>
          <div className="min-w-0 flex-1">
            <p lang={current.lang} className="truncate font-serif text-lg font-semibold">
              {current.title}
            </p>
            <p className="text-sm text-ink-soft">
              {pct}% read{current.stats ? ` · ${Math.round(current.stats.knownShare * 100)}% known` : ''}
            </p>
          </div>
          <Link to={`/codex/read/${current.id}`} className={buttonClasses('secondary', 'md')}>
            Read <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-raised text-ink-faint shadow-elev-1">
            <BookOpen size={24} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-serif text-lg font-semibold">Nothing on the lectern yet</p>
            <p className="mt-0.5 text-sm text-ink-soft">Books and episodes you open will wait for you here.</p>
          </div>
          <Link to="/codex" className={buttonClasses('secondary', 'md')}>
            Open Codex
          </Link>
        </div>
      )}
    </Card>
  );
}

function ReviewCard({ lang }: { lang: string }) {
  const today = useDueSummary(lang);
  const total = today ? today.due + today.fresh : 0;
  return (
    <Card>
      <CardTitle icon={Layers}>Review</CardTitle>
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-4xl font-semibold tabular-nums">{total}</span>
          <span className="text-sm font-semibold text-ink-soft">{total === 1 ? 'card today' : 'cards today'}</span>
        </div>
        <p className="flex-1 text-sm text-ink-soft">
          {!today || today.decks === 0
            ? 'Add a ready-made deck or mark words as Learning while you read.'
            : total === 0
              ? 'All caught up. Practise freely with Ludus.'
              : [today.due && `${today.due} to review`, today.fresh && `${today.fresh} new`].filter(Boolean).join(' · ')}
        </p>
        <div className="flex gap-2">
          {today && today.decks > 0 && (
            <Link to="/thesaurus/study/all?mode=ludus" className={buttonClasses('ghost', 'md')}>
              <Gamepad2 size={17} aria-hidden /> Ludus
            </Link>
          )}
          {total > 0 ? (
            <Link to="/thesaurus/study/all?mode=recall" className={buttonClasses('primary', 'md')}>
              Review <ArrowRight size={16} aria-hidden />
            </Link>
          ) : (
            <Link to="/thesaurus" className={buttonClasses('secondary', 'md')}>
              Thesaurus
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}
