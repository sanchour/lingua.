import { UiText, useUi } from '@/design/i18n/UiText';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'motion/react';
import { ArrowRight, BookOpen, Check, ChevronRight, Clapperboard, Flame, Headphones, Layers, MessagesSquare, Music2, PenLine, Sparkles, Sprout, Trophy, X } from 'lucide-react';
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
import { ColloquiumHomeCard } from '@/features/colloquium/HomeCard';
import { GrammarHomeCard } from '@/features/grammatica/links';
import { LettersCard } from '@/features/grammatica/letters/LettersCard';
import { lastTalked } from '@/features/colloquium/choices';
import { studyMinutes, useHomeFacts } from './facts';
import type { HomeFacts } from './facts';
import { GoalRing } from './GoalRing';
import { orderSteps } from './order';

export function greeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 18) return 'Good afternoon';
  if (hour >= 18 && hour < 23) return 'Good evening';
  return 'Burning the midnight oil';
}

interface GreetingContext {
  name?: string;
  langName?: string;
}

const MORNING_EARLY: Array<(c: GreetingContext) => string> = [
  ({ name }) => (name ? `Good morning, ${name}` : 'Good morning'),
  ({ name }) => (name ? `Coffee and a chapter, ${name}?` : 'Coffee and a chapter?'),
  ({ name }) => (name ? `A fresh page this morning, ${name}` : 'A fresh page this morning'),
  ({ name }) => (name ? `Early at the desk, ${name}` : 'Early at the reading desk'),
  ({ name, langName }) => (name ? `Morning light and a little ${langName ?? 'reading'}, ${name}` : `Morning light and a little ${langName ?? 'reading'}`),
];

const MORNING_LATE: Array<(c: GreetingContext) => string> = [
  ({ name }) => (name ? `Good morning, ${name}` : 'Good morning'),
  ({ name }) => (name ? `Back at the desk, ${name}` : 'Back at the desk'),
  ({ name }) => (name ? `What shall we read today, ${name}?` : 'What shall we read today?'),
  ({ name }) => (name ? `Ready for a page or two, ${name}?` : 'Ready for a page or two?'),
  ({ name, langName }) => (name ? `Your ${langName ?? ''} shelves are waiting, ${name}`.replace('  ', ' ') : `Your ${langName ?? ''} shelves are waiting`.replace('  ', ' ')),
];

const AFTERNOON: Array<(c: GreetingContext) => string> = [
  ({ name }) => (name ? `Good afternoon, ${name}` : 'Good afternoon'),
  ({ name }) => (name ? `Pick up where you left off, ${name}?` : 'Pick up where you left off?'),
  ({ name, langName }) => (name ? `A quiet break with ${langName ?? 'a good book'}, ${name}?` : `A quiet break with ${langName ?? 'a good book'}?`),
  ({ name }) => (name ? `Afternoon at the scriptorium, ${name}` : 'Afternoon at the scriptorium'),
  ({ name }) => (name ? `Room for one more chapter, ${name}?` : 'Room for one more chapter?'),
];

const EVENING: Array<(c: GreetingContext) => string> = [
  ({ name }) => (name ? `Good evening, ${name}` : 'Good evening'),
  ({ name }) => (name ? `The reading lamp is lit, ${name}` : 'The reading lamp is lit'),
  ({ name, langName }) => (name ? `Unwinding with ${langName ?? 'a story'}, ${name}?` : `Unwinding with ${langName ?? 'a story'}?`),
  ({ name }) => (name ? `Settling in for the evening, ${name}` : 'Settling in for the evening'),
  ({ name }) => (name ? `One last story for the day, ${name}?` : 'One last story for the day?'),
];

const LATE_NIGHT: Array<(c: GreetingContext) => string> = [
  ({ name }) => (name ? `Burning the midnight oil, ${name}?` : 'Burning the midnight oil?'),
  ({ name }) => (name ? `Night owl hours, ${name}` : 'Night owl hours'),
  ({ name }) => (name ? `Quiet house, open book, ${name}` : 'Quiet house, open book'),
  ({ name }) => (name ? `Just one more page, ${name}?` : 'Just one more page?'),
  ({ name, langName }) => (name ? `Late-night ${langName ?? 'reading'}, ${name}?` : `Late-night ${langName ?? 'reading'}?`),
];

/** Time-of-day bookish greeting, Claude-style, with deterministic or cycled pick. */
export function homeGreeting(hour: number, name?: string, langName?: string, offset = 0): string {
  const pool =
    hour >= 5 && hour < 9
      ? MORNING_EARLY
      : hour >= 9 && hour < 12
        ? MORNING_LATE
        : hour >= 12 && hour < 17
          ? AFTERNOON
          : hour >= 17 && hour < 22
            ? EVENING
            : LATE_NIGHT;
  const daySeed = Math.floor(Date.now() / 86_400_000) + hour;
  const fn = pool[(daySeed + offset) % pool.length];
  return fn({ name: name?.trim() || undefined, langName });
}

export const enter = (i: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { ...spring.soft, delay: 0.05 * i },
});

export const label = 'text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase';

/**
 * Home as it was before 5.1-2c, kept as Settings › Preferences › Home layout › Classic: today's goal
 * and the next few things worth doing, then the week, the numbers that matter and the latest
 * milestone. Its parts (Next up, First steps, the week) are shared with the Today layout.
 */
export function HomeClassic() {
  const translateUi = useUi();
  const { language, settings } = useApp();
  const target = getLanguage(language.id);
  const facts = useHomeFacts(language.id);
  const steps = facts?.firstSteps;
  const stepsLeft = steps ? Object.values(steps).filter((d) => !d).length : 0;
  const showSteps = Boolean(steps) && stepsLeft > 0 && !settings.ui.firstStepsHidden;

  return (
    <>
      <PageHeader title={translateUi(greeting(new Date().getHours()))} eyebrow={`${target?.endonym ?? language.id} · ${language.level}`} />
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
          <motion.div {...enter(3)} className="empty:hidden">
            <LettersCard lang={language.id} level={language.level} home />
          </motion.div>
          <motion.div {...enter(3)} className="empty:hidden">
            <GrammarHomeCard lang={language.id} level={language.level} />
          </motion.div>
          <motion.div {...enter(3)}>
            <NumbersCard lang={language.id} />
          </motion.div>
          <motion.div {...enter(4)}>
            <MilestoneCard lang={language.id} />
          </motion.div>
          <motion.div {...enter(5)} className="empty:hidden">
            <MundusHomeCard />
          </motion.div>
          <motion.div {...enter(6)} className="empty:hidden">
            <ColloquiumHomeCard lang={language.id} level={language.level} />
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

export function useNextSteps(lang: string, level: Parameters<typeof curatedPrompt>[1], enjoys: Enjoyment[], limit = 4): Step[] | undefined {
  const translateUi = useUi();
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
      title: translateUi('{0} cards to review', [cards]),
      detail: [due.due && translateUi('{0} due', [due.due]), due.fresh && translateUi('{0} new', [due.fresh])].filter(Boolean).join(' · '),
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
      detail: translateUi('Continue reading · {0}%{1}', [pct, book.stats ? translateUi(' · {0}% known', [Math.round(book.stats.knownShare * 100)]) : '']),
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
      detail: translateUi('Continue listening{0}', [left > 60_000 ? translateUi(' · {0} left', [formatDuration(left)]) : '']),
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
      detail: translateUi("Continue watching"),
      art: (
        <span className="block w-16">
          <Poster title={video.title} coverBlobId={video.coverBlobId} coverUrl={video.coverUrl} className="rounded-lg shadow-none" />
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
      detail: sungToday ? translateUi('Song for today · {0} · sing it once more', [song.artist]) : translateUi('Song for today · {0}', [song.artist]),
      art: <SongArt url={song.artworkUrl} title={song.title} className="w-10" rounded="rounded-lg" size={100} />,
    });
  }

  const wroteToday = journal.some((e) => e.date === localDateKey() && e.words > 0);
  if (!wroteToday) {
    const prompt = curatedPrompt(lang, level);
    steps.push({ key: 'write', to: '/mentis/diarium', icon: PenLine, tone: 'sage', title: translateUi("Write today’s entry"), detail: prompt.en || prompt.text });
  }

  // Now and then (every third day, when Sermo hasn't opened an AI this week) ten minutes of talking.
  const day = Math.floor(Date.now() / 86_400_000);
  if (day % 3 === 0 && Date.now() - lastTalked() > 7 * 86_400_000) {
    steps.push({ key: 'talk', to: '/mentis/sermo', icon: MessagesSquare, tone: 'accent', title: translateUi("Talk for ten minutes"), detail: translateUi("A scene in Sermo, by voice or text with an AI") });
  }

  if (!book) steps.push({ key: 'find', to: '/codex', icon: Sparkles, tone: 'ink', title: translateUi("Find something to read"), detail: translateUi("Graded stories, articles, or your own books") });
  // Nothing started yet in a kind you enjoy: a way in.
  if (!episode && enjoys.includes('listening')) {
    steps.push({ key: 'find-listen', to: '/sonus?tab=podcasts', icon: Headphones, tone: 'sage', title: translateUi("Find something to listen to"), detail: translateUi("Podcasts with a transcript that follows along") });
  }
  if (!songs.length && enjoys.includes('music')) {
    steps.push({ key: 'find-song', to: '/sonus?tab=music', icon: Music2, tone: 'accent', title: translateUi("Find a song to learn"), detail: translateUi("Lyrics that light up as they’re sung, every word a tap away") });
  }
  if (!video && enjoys.includes('watching')) {
    steps.push({ key: 'find-watch', to: '/visio', icon: Clapperboard, tone: 'accent', title: translateUi("Watch something"), detail: translateUi("A film or an episode with subtitles in both languages") });
  }
  return orderSteps(steps, enjoys).slice(0, limit);
}

export const TONE: Record<Step['tone'], string> = {
  accent: 'bg-accent-soft text-accent-text',
  sage: 'bg-sage-soft text-sage-text',
  ink: 'bg-sunken text-ink-soft',
};

function TodayPanel({ lang, level, goal, enjoys }: { lang: string; level: Parameters<typeof curatedPrompt>[1]; goal: number; enjoys: Enjoyment[] }) {
  const translateUi = useUi();
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
          <p className={label}><UiText source={'Today'} /></p>
          <p className="mt-1 font-serif text-[22px] leading-snug font-semibold sm:text-2xl">
            {minutes === 0 ? translateUi('A fresh page.') : left === 0 ? translateUi('Goal reached. Lovely.') : translateUi('{0} {1} to your goal', [left, left === 1 ? 'minute' : 'minutes'])}
          </p>
          <p className="mt-1 text-[14px] text-ink-soft">{parts.length ? parts.join(' · ') : translateUi('Read, listen, watch or write for {0} minutes.', [goal])}</p>
        </div>
      </div>

      <div className="mt-6 border-t border-line pt-4">
        <p className={cx(label, 'mb-1')}><UiText source={'Next up'} /></p>
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
                  <span className="block truncate text-[13px] text-ink-soft"><UiText source={s.detail} /></span>
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

export const FIRST: Array<{ key: keyof HomeFacts['firstSteps']; title: string; to: string }> = [
  { key: 'read', title: 'Read something in Codex', to: '/codex' },
  { key: 'marked', title: 'Mark a word you’re learning', to: '/codex' },
  { key: 'reviewed', title: 'Review a few flashcards', to: '/thesaurus' },
  { key: 'listened', title: 'Listen or watch with a transcript', to: '/sonus' },
  { key: 'wrote', title: 'Write a first journal entry', to: '/mentis/diarium' },
];

export function FirstSteps({ steps }: { steps: HomeFacts['firstSteps'] }) {
  const translateUi = useUi();
  const done = FIRST.filter((f) => steps[f.key]).length;
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-3 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className={label}><UiText source={'First steps'} /></p>
          <p className="mt-0.5 text-[14px] text-ink-soft"><UiText source={'{0} of {1} done: one turn around every room.'} values={[done, FIRST.length]} /></p>
        </div>
        <button
          type="button"
          aria-label={translateUi('Hide first steps')}
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

export function WeekCard({ facts, goal }: { facts?: HomeFacts; goal: number }) {
  const translateUi = useUi();
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
        <p className={label}><UiText source={'This week'} /></p>
        {streak > 0 ? (
          <p className="flex items-center gap-1 text-[13px] font-semibold text-accent-text"><UiText source={'{0} {1} {2} in a row'} values={[<Flame size={14} aria-hidden />, streak, streak === 1 ? <UiText source={'day'} /> : <UiText source={'days'} />]} /></p>
        ) : (
          <p className="text-[13px] font-semibold text-ink-faint"><UiText source={'{0} min a day'} values={[goal]} /></p>
        )}
      </div>
      <div className="mt-4 flex h-24 items-end justify-between gap-2" role="img" aria-label={translateUi('Minutes studied over the last seven days: {0}', [week.map((d) => Math.round(d.minutes)).join(', ')])}>
        {week.map((d, i) => {
          const today = i === week.length - 1;
          const h = d.minutes ? Math.max(8, (d.minutes / max) * 100) : 0;
          return (
            <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <div className="relative flex w-full max-w-9 flex-1 items-end overflow-hidden rounded-lg bg-sunken">
                <div className={cx('h-full w-full rounded-lg transition-transform duration-700', d.met ? 'bg-accent' : 'bg-accent/45')} style={{ transform: `translateY(${100 - h}%)` }} />
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
        <p className={label}><UiText source={'At a glance'} /></p>
        <Link to="/ratio" className="hit inline-flex items-center gap-1 text-[13px] font-semibold text-accent-text hover:underline"><UiText source={'Ratio {0}'} values={[<ArrowRight size={14} aria-hidden />]} /></Link>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
        {stats.map((s) => (
          <div key={s.label}>
            <dd className="font-serif text-[26px] leading-none font-semibold tabular-nums">{s.value}</dd>
            <dt className="mt-1 text-[12.5px] font-semibold text-ink-soft"><UiText source={s.label} /></dt>
          </div>
        ))}
      </dl>
    </Card>
  );
}

const DATE = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long' });

function MilestoneCard({ lang }: { lang: string }) {
  const translateUi = useUi();
  const journey = useJourney();
  const latest = journey?.find((e) => e.lang === lang || e.lang === '*');
  if (!journey) return null;
  return (
    <Link to="/ratio?tab=tabula" className="block">
      <Card className="flex items-center gap-4 p-5 transition-colors hover:bg-surface sm:p-6">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-sage-soft text-sage-text">{latest ? <Trophy size={20} aria-hidden /> : <Sprout size={20} aria-hidden />}</span>
        <span className="min-w-0 flex-1">
          <span className={label}>{latest ? translateUi('Milestone · {0}', [DATE.format(latest.at)]) : translateUi('Your journey')}</span>
          <span className="mt-0.5 block truncate font-serif text-[17px] font-semibold">{latest ? latest.title : translateUi('Milestones gather here as you go')}</span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-ink-faint" aria-hidden />
      </Card>
    </Link>
  );
}
