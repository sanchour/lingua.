import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'motion/react';
import { ArrowRight, BookOpen, Check, ChevronRight, Clapperboard, Flame, Headphones, Layers, Music2, PenLine, Sparkles, Sprout, Trophy, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useApp } from '@/app/context';
import { PageHeader } from '@/app/PageHeader';
import { formatDuration } from '@/core/audio/cues';
import { getLanguage } from '@/core/lang/languages';
import { curatedPrompt } from '@/core/lang/prompts';
import { useJourney } from '@/data/journey';
import { useJournal } from '@/data/journal';
import { useAllProgress, useLibrary } from '@/data/library';
import { useMediaList, usePlaybackMap } from '@/data/media';
import { paceOf } from '@/data/ratio';
import { patchSetting } from '@/data/settings';
import { useSavedSongs } from '@/data/songs';
import type { Enjoyment } from '@/data/settings';
import { useToday } from '@/data/stats';
import { useDueSummary } from '@/data/study';
import { useVocabularyCounts } from '@/data/words';
import { Card } from '@/design/primitives';
import { spring } from '@/design/motion';
import { localDateKey } from '@/lib/format';
import { cx } from '@/lib/cx';
import { BookCover } from '@/features/codex/library/BookCover';
import { SongArt } from '@/features/cantus/SongArt';
import { Artwork } from '@/features/sonus/library/Artwork';
import { Poster } from '@/features/visio/library/Poster';
import { MundusHomeCard } from '@/features/mundus/HomeCard';
import { studyMinutes, useHomeFacts } from './facts';
import type { HomeFacts } from './facts';
import { GoalRing } from './GoalRing';
import { orderSteps } from './order';

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

const label = 'text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase';

/**
 * Home at a glance: today's goal and the next few things worth doing, then the week, the numbers
 * that matter and the latest milestone. Two columns from tablet width up, one on phones.
 */
export default function HomePage() {
  const { language, settings } = useApp();
  const target = getLanguage(language.id);
  const facts = useHomeFacts(language.id);
  const steps = facts?.firstSteps;
  const stepsLeft = steps ? Object.values(steps).filter((d) => !d).length : 0;
  const showSteps = Boolean(steps) && stepsLeft > 0 && !settings.ui.firstStepsHidden;

  return (
    <>
      <PageHeader title={greeting(new Date().getHours())} eyebrow={`${target?.endonym ?? language.id} · ${language.level}`} />
      <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 grid-cols-1 gap-5">
          <motion.div {...enter(0)}>
            <TodayPanel lang={language.id} level={language.level} goal={language.dailyGoal.readMinutes} enjoys={settings.learner.enjoys} />
          </motion.div>
          {showSteps && (
            <motion.div {...enter(1)}>
              <FirstSteps steps={steps!} />
            </motion.div>
          )}
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-5">
          <motion.div {...enter(2)}>
            <WeekCard facts={facts} goal={language.dailyGoal.readMinutes} />
          </motion.div>
          <motion.div {...enter(3)}>
            <NumbersCard lang={language.id} />
          </motion.div>
          <motion.div {...enter(4)}>
            <MilestoneCard lang={language.id} />
          </motion.div>
          <motion.div {...enter(5)} className="empty:hidden">
            <MundusHomeCard lang={language.id} level={language.level} />
          </motion.div>
        </div>
      </div>
    </>
  );
}

// ── Today ─────────────────────────────────────────────────────────────────────

interface Step {
  key: string;
  to: string;
  icon: LucideIcon;
  tone: 'accent' | 'sage' | 'ink';
  title: string;
  detail: string;
  art?: ReactNode;
}

function useNextSteps(lang: string, level: Parameters<typeof curatedPrompt>[1], enjoys: Enjoyment[]): Step[] | undefined {
  const due = useDueSummary(lang);
  const texts = useLibrary(lang);
  const progress = useAllProgress();
  const listening = useMediaList(lang);
  const videos = useMediaList(lang, 'watch');
  const playback = usePlaybackMap();
  const journal = useJournal(lang);
  const songs = useSavedSongs(lang);
  if (!due || !texts || !listening || !videos || !journal || !songs) return undefined;

  const steps: Step[] = [];
  const cards = due.due + due.fresh;
  if (cards > 0) {
    steps.push({
      key: 'review',
      to: '/thesaurus/study/all?mode=recall',
      icon: Layers,
      tone: 'accent',
      title: `${cards} ${cards === 1 ? 'card' : 'cards'} to review`,
      detail: [due.due && `${due.due} due`, due.fresh && `${due.fresh} new`].filter(Boolean).join(' · '),
    });
  }

  const book = texts.find((t) => t.kind !== 'shelfItem' && !t.finishedAt && t.lastOpenedAt);
  if (book) {
    const pct = Math.round((progress?.get(book.id)?.percent ?? 0) * 100);
    steps.push({
      key: 'read',
      to: `/codex/read/${book.id}`,
      icon: BookOpen,
      tone: 'ink',
      title: book.title,
      detail: `Continue reading · ${pct}%${book.stats ? ` · ${Math.round(book.stats.knownShare * 100)}% known` : ''}`,
      art: (
        <span className="block w-9">
          <BookCover text={book} size="sm" />
        </span>
      ),
    });
  }

  const unfinished = (m: { id: string; lastPlayedAt?: number }) => Boolean(m.lastPlayedAt) && !playback?.get(m.id)?.completed;
  const episode = listening.find((m) => m.kind !== 'spotify' && unfinished(m));
  if (episode) {
    const left = episode.durationMs ? episode.durationMs - (playback?.get(episode.id)?.positionMs ?? 0) : 0;
    steps.push({
      key: 'listen',
      to: `/sonus/play/${episode.id}`,
      icon: Headphones,
      tone: 'sage',
      title: episode.title,
      detail: `Continue listening${left > 60_000 ? ` · ${formatDuration(left)} left` : ''}`,
      art: <Artwork title={episode.title} coverBlobId={episode.coverBlobId} coverUrl={episode.coverUrl} className="w-10" rounded="rounded-lg" />,
    });
  }

  const video = videos.find(unfinished);
  if (video) {
    steps.push({
      key: 'watch',
      to: `/visio/watch/${video.id}`,
      icon: Clapperboard,
      tone: 'accent',
      title: video.title,
      detail: 'Continue watching',
      art: (
        <span className="block w-16">
          <Poster title={video.title} coverBlobId={video.coverBlobId} className="rounded-lg shadow-none" />
        </span>
      ),
    });
  }

  // A song for today: one of your songs, a different one each day.
  if (songs.length) {
    const byAge = [...songs].sort((a, b) => a.createdAt - b.createdAt);
    const song = byAge[Math.floor(Date.now() / 86_400_000) % byAge.length];
    const sungToday = Boolean(song.lastPlayedAt && localDateKey(song.lastPlayedAt) === localDateKey());
    steps.push({
      key: 'song',
      to: `/sonus/song/${encodeURIComponent(song.id)}`,
      icon: Music2,
      tone: 'accent',
      title: song.title,
      detail: sungToday ? `Song for today · ${song.artist} · sing it once more` : `Song for today · ${song.artist}`,
      art: <SongArt url={song.artworkUrl} title={song.title} className="w-10" rounded="rounded-lg" size={100} />,
    });
  }

  const wroteToday = journal.some((e) => e.date === localDateKey() && e.words > 0);
  if (!wroteToday) {
    const prompt = curatedPrompt(lang, level);
    steps.push({ key: 'write', to: '/codex?tab=diarium', icon: PenLine, tone: 'sage', title: 'Write today’s entry', detail: prompt.en || prompt.text });
  }

  if (!book) steps.push({ key: 'find', to: '/codex', icon: Sparkles, tone: 'ink', title: 'Find something to read', detail: 'Graded stories, articles, or your own books' });
  // Nothing started yet in a kind you enjoy: a way in.
  if (!episode && enjoys.includes('listening')) {
    steps.push({ key: 'find-listen', to: '/sonus?tab=podcasts', icon: Headphones, tone: 'sage', title: 'Find something to listen to', detail: 'Podcasts with a transcript that follows along' });
  }
  if (!songs.length && enjoys.includes('music')) {
    steps.push({ key: 'find-song', to: '/sonus?tab=music', icon: Music2, tone: 'accent', title: 'Find a song to learn', detail: 'Lyrics that light up as they’re sung, every word a tap away' });
  }
  if (!video && enjoys.includes('watching')) {
    steps.push({ key: 'find-watch', to: '/visio', icon: Clapperboard, tone: 'accent', title: 'Watch something', detail: 'A film or an episode with subtitles in both languages' });
  }
  return orderSteps(steps, enjoys).slice(0, 4);
}

const TONE: Record<Step['tone'], string> = {
  accent: 'bg-accent-soft text-accent-text',
  sage: 'bg-sage-soft text-sage-text',
  ink: 'bg-sunken text-ink-soft',
};

function TodayPanel({ lang, level, goal, enjoys }: { lang: string; level: Parameters<typeof curatedPrompt>[1]; goal: number; enjoys: Enjoyment[] }) {
  const today = useToday(lang);
  const steps = useNextSteps(lang, level, enjoys);
  const minutes = studyMinutes(today);
  const left = Math.max(0, Math.ceil(goal - minutes));
  const min = (ms: number | undefined, what: string) => (ms && ms >= 60_000 ? `${Math.round(ms / 60_000)} min ${what}` : null);
  const parts = [
    min(today?.readMs, 'read'),
    min(today?.listenMs, 'listened'),
    min(today?.watchMs, 'watched'),
    min(today?.writeMs, 'written'),
    today?.reviews ? `${today.reviews} ${today.reviews === 1 ? 'card' : 'cards'}` : null,
  ].filter(Boolean) as string[];

  return (
    <Card className="p-5 sm:p-7">
      <div className="flex items-center gap-5 sm:gap-7">
        <GoalRing value={minutes} goal={goal} size={112} />
        <div className="min-w-0">
          <p className={label}>Today</p>
          <p className="mt-1 font-serif text-[22px] leading-snug font-semibold sm:text-2xl">
            {minutes === 0 ? 'A fresh page.' : left === 0 ? 'Goal reached. Lovely.' : `${left} ${left === 1 ? 'minute' : 'minutes'} to your goal`}
          </p>
          <p className="mt-1 text-[14px] text-ink-soft">{parts.length ? parts.join(' · ') : `Read, listen, watch or write for ${goal} minutes.`}</p>
        </div>
      </div>

      <div className="mt-6 border-t border-line pt-4">
        <p className={cx(label, 'mb-1')}>Next up</p>
        <ul className="-mx-2">
          {(steps ?? []).map((s) => (
            <li key={s.key}>
              <Link to={s.to} className="group flex items-center gap-3.5 rounded-2xl px-2 py-2.5 transition-colors hover:bg-surface">
                {s.art ?? (
                  <span className={cx('grid size-10 shrink-0 place-items-center rounded-xl', TONE[s.tone])}>
                    <s.icon size={19} aria-hidden />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span lang={s.key === 'review' || s.key === 'write' || s.key.startsWith('find') ? undefined : lang} className="block truncate text-[15px] font-semibold">
                    {s.title}
                  </span>
                  <span className="block truncate text-[13px] text-ink-soft">{s.detail}</span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

// ── First steps ───────────────────────────────────────────────────────────────

const FIRST: Array<{ key: keyof HomeFacts['firstSteps']; title: string; to: string }> = [
  { key: 'read', title: 'Read something in Codex', to: '/codex' },
  { key: 'marked', title: 'Mark a word you’re learning', to: '/codex' },
  { key: 'reviewed', title: 'Review a few flashcards', to: '/thesaurus' },
  { key: 'listened', title: 'Listen or watch with a transcript', to: '/sonus' },
  { key: 'wrote', title: 'Write a first journal entry', to: '/codex?tab=diarium' },
];

function FirstSteps({ steps }: { steps: HomeFacts['firstSteps'] }) {
  const done = FIRST.filter((f) => steps[f.key]).length;
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-3 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className={label}>First steps</p>
          <p className="mt-0.5 text-[14px] text-ink-soft">
            {done} of {FIRST.length} done: one turn around every room.
          </p>
        </div>
        <button
          type="button"
          aria-label="Hide first steps"
          onClick={() => void patchSetting('ui', { firstStepsHidden: true })}
          className="grid size-9 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-surface hover:text-ink"
        >
          <X size={17} aria-hidden />
        </button>
      </div>
      <ul className="-mx-2">
        {FIRST.map((f) => {
          const ok = steps[f.key];
          return (
            <li key={f.key}>
              <Link to={f.to} className={cx('flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-surface', ok && 'pointer-events-none')}>
                <span className={cx('grid size-6 shrink-0 place-items-center rounded-full border-2', ok ? 'border-sage bg-sage text-on-accent' : 'border-line-strong')}>
                  {ok && <Check size={13} strokeWidth={3} aria-hidden />}
                </span>
                <span className={cx('text-[14.5px]', ok ? 'text-ink-faint line-through decoration-1' : 'font-semibold')}>{f.title}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// ── The week, numbers, milestone ──────────────────────────────────────────────

const WEEKDAY = new Intl.DateTimeFormat('en', { weekday: 'narrow' });

function WeekCard({ facts, goal }: { facts?: HomeFacts; goal: number }) {
  const week = facts?.week ?? [];
  let streak = 0;
  for (let i = week.length - 1; i >= 0; i--) {
    if (week[i].met) streak++;
    else if (i < week.length - 1) break;
  }
  const max = Math.max(goal, ...week.map((d) => d.minutes));
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <p className={label}>This week</p>
        {streak > 0 ? (
          <p className="flex items-center gap-1 text-[13px] font-semibold text-accent-text">
            <Flame size={14} aria-hidden /> {streak} {streak === 1 ? 'day' : 'days'} in a row
          </p>
        ) : (
          <p className="text-[13px] font-semibold text-ink-faint">{goal} min a day</p>
        )}
      </div>
      <div className="mt-4 flex h-24 items-end justify-between gap-2" role="img" aria-label={`Minutes studied over the last seven days: ${week.map((d) => Math.round(d.minutes)).join(', ')}`}>
        {week.map((d, i) => {
          const today = i === week.length - 1;
          const h = d.minutes ? Math.max(8, (d.minutes / max) * 100) : 0;
          return (
            <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <div className="relative flex w-full max-w-9 flex-1 items-end overflow-hidden rounded-lg bg-sunken">
                <div className={cx('w-full rounded-lg transition-[height] duration-700', d.met ? 'bg-accent' : 'bg-accent/45')} style={{ height: `${h}%` }} />
              </div>
              <span className={cx('text-[11px] font-bold', today ? 'text-accent-text' : 'text-ink-faint')}>{WEEKDAY.format(new Date(`${d.date}T12:00:00`))}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function NumbersCard({ lang }: { lang: string }) {
  const counts = useVocabularyCounts(lang);
  const pace = useLiveQuery(() => paceOf(lang), [lang]);
  const hours = (h?: number) => (h === undefined ? '–' : h < 10 ? h.toFixed(1) : Math.round(h).toLocaleString());
  const stats: Array<{ value: string; label: string }> = [
    { value: (counts?.known ?? 0).toLocaleString(), label: 'words known' },
    { value: (counts?.learning ?? 0).toLocaleString(), label: 'learning' },
    { value: hours(pace?.hoursThisWeek), label: 'hours this week' },
    { value: hours(pace?.hours), label: 'hours in all' },
  ];
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <p className={label}>At a glance</p>
        <Link to="/ratio" className="hit inline-flex items-center gap-1 text-[13px] font-semibold text-accent-text hover:underline">
          Ratio <ArrowRight size={14} aria-hidden />
        </Link>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
        {stats.map((s) => (
          <div key={s.label}>
            <dd className="font-serif text-[26px] leading-none font-semibold tabular-nums">{s.value}</dd>
            <dt className="mt-1 text-[12.5px] font-semibold text-ink-soft">{s.label}</dt>
          </div>
        ))}
      </dl>
    </Card>
  );
}

const DATE = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long' });

function MilestoneCard({ lang }: { lang: string }) {
  const journey = useJourney();
  const latest = journey?.find((e) => e.lang === lang || e.lang === '*');
  if (!journey) return null;
  return (
    <Link to="/ratio?tab=iter" className="block">
      <Card className="flex items-center gap-4 p-5 transition-colors hover:bg-surface sm:p-6">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-sage-soft text-sage-text">{latest ? <Trophy size={20} aria-hidden /> : <Sprout size={20} aria-hidden />}</span>
        <span className="min-w-0 flex-1">
          <span className={label}>{latest ? `Milestone · ${DATE.format(latest.at)}` : 'Your journey'}</span>
          <span className="mt-0.5 block truncate font-serif text-[17px] font-semibold">{latest ? latest.title : 'Milestones gather here as you go'}</span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-ink-faint" aria-hidden />
      </Card>
    </Link>
  );
}
