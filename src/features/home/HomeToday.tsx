import { UiText, useUi } from '@/design/i18n/UiText';
import { useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Clapperboard,
  Flame,
  GraduationCap,
  Headphones,
  Layers,
  Newspaper,
  PenLine,
  Podcast,
  Sparkles,
  Tv,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useApp } from '@/app/context';
import { PageHeader } from '@/app/PageHeader';
import { formatDuration } from '@/core/audio/cues';
import { getLanguage } from '@/core/lang/languages';
import type { Level } from '@/core/lang/levels';
import { newsSources } from '@/core/lang/news';
import { curatedPrompt } from '@/core/lang/prompts';
import { SAMPLES } from '@/core/lang/samples';
import { STARTER_THEMES } from '@/core/lang/starter';
import { GROUP_KIND, withinReach } from '@/core/mundus/types';
import type { Pick, PickGroup } from '@/core/mundus/types';
import { useBooks } from '@/data/books';
import { getDailyQuote } from '@/core/ratio/analytics';
import { useJournal } from '@/data/journal';
import { useAllProgress, useLibrary } from '@/data/library';
import { useMediaList, usePlaybackMap } from '@/data/media';
import type { Enjoyment } from '@/data/settings';
import { useSavedSongs } from '@/data/songs';
import { starterKey, useStarterList } from '@/data/starter';
import { useToday } from '@/data/stats';
import { useDueSummary } from '@/data/study';
import { Card, Drawer } from '@/design/primitives';
import { quote } from '@/design/flavours';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { localDateKey } from '@/lib/format';
import { SongArt } from '@/features/cantus/SongArt';
import { BookCover } from '@/features/codex/library/BookCover';
import { Art } from '@/features/mundus/Art';
import { pickKey, usePickLookups, useStreaming } from '@/features/mundus/hooks';
import { PickCard } from '@/features/mundus/PicksView';
import { useGuide } from '@/features/mundus/useGuide';
import { usePlan } from '@/features/plans/usePlan';
import { Artwork } from '@/features/sonus/library/Artwork';
import { Poster } from '@/features/visio/library/Poster';
import { TitleSheet } from '@/features/visio/services/TitleSheet';
import type { SheetTitle } from '@/features/visio/services/TitleSheet';
import { pickImageQuery, THEME_ARTICLE } from '@/services/mundus/images';
import { posterUrl } from '@/services/mundus/tmdb';
import { useUI } from '@/state/ui';
import { studyMinutes, useHomeFacts } from './facts';
import type { HomeFacts } from './facts';
import { enter, greeting, homeGreeting, label, TONE, useNextSteps } from './HomeClassic';
import { DailyWordCard } from './DailyWordCard';

const DATE = new Intl.DateTimeFormat('en', { weekday: 'long', day: 'numeric', month: 'long' });

/** Today's minutes by room, in the rooms' tones, for the ribbon and its legend. */
const ROOMS = [
  { key: 'readMs', name: 'Reading', tone: 'bg-accent' },
  { key: 'listenMs', name: 'Listening', tone: 'bg-sage' },
  { key: 'watchMs', name: 'Watching', tone: 'bg-accent/50' },
  { key: 'writeMs', name: 'Writing', tone: 'bg-ink-faint' },
] as const;

/** Days in a row the goal was met, today counting only once it is. */
function streakOf(week: HomeFacts['week']): number {
  let streak = 0;
  for (let i = week.length - 1; i >= 0; i--) {
    if (week[i].met) streak++;
    else if (i < week.length - 1) break;
  }
  return streak;
}

/**
 * Home (Lingua 6):
 * - Time-of-day dynamic Claude-style greeting header
 * - Top row: Today + Goal + Where you left off on the left; Choose a mode (with bookish fine-line
 *   icons from the handbook/onboarding) on the right
 * - Middle shelf: Continue learning > (links to Bibliotheca)
 * - Bottom shelf: Discover your next content > (links to Explora)
 */
export function HomeToday() {
  const translateUi = useUi();
  const { language, settings } = useApp();
  const plan = usePlan();
  const openPlans = useUI((s) => s.openPlans);
  const target = getLanguage(language.id);
  const facts = useHomeFacts(language.id);
  const name = settings.learner.name?.trim();
  const goal = language.dailyGoal.readMinutes;
  const streak = streakOf(facts?.week ?? []);

  return (
    <>
      <PageHeader
        title={settings.ui.interfaceLanguage ? `${translateUi(greeting(new Date().getHours()))}${name ? `, ${name}` : ''}` : homeGreeting(new Date().getHours(), name, target?.name)}
        eyebrow={`${DATE.format(new Date())} · ${target?.endonym ?? language.id} · ${language.level}${language.goal ? ` → ${language.goal}` : ''}`}
        actions={
          plan === 'free' ? (
            <button
              type="button"
              onClick={() => openPlans()}
              className="inline-flex h-9 items-center gap-1 rounded-full border border-accent/40 px-4 text-[13.5px] font-semibold transition-colors hover:border-accent hover:bg-accent-soft"
            ><UiText source={'Lingua{0}'} values={[<span className="text-accent-text">+</span>]} /></button>
          ) : undefined
        }
      />

      <div className="space-y-6">
        {/* Top row: Today + Goal + Where you left off on the left, Choose a mode on the right */}
        <div className="grid grid-cols-12 items-stretch gap-4 sm:gap-5">
          <motion.div {...enter(0)} className="col-span-12 min-w-0 md:col-span-7 xl:col-span-8">
            <TodayCard lang={language.id} level={language.level} goal={goal} streak={streak} enjoys={settings.learner.enjoys} />
          </motion.div>
          <motion.div {...enter(1)} className="col-span-12 min-w-0 md:col-span-5 xl:col-span-4">
            <ChooseModeCard />
          </motion.div>
        </div>

        {/* Word of the day & Quick review (6-25, F1523, F1524) */}
        <motion.div {...enter(2)}>
          <DailyWordCard lang={language.id} />
        </motion.div>

        {/* Daily motivational quote (6-17, F1164) */}
        {(() => {
          const quote = getDailyQuote();
          return (
            <motion.div {...enter(2.5)} className="rounded-2xl border border-line bg-surface/70 px-5 py-3 text-center sm:px-8">
              <p className="font-serif text-[14.5px] italic text-ink">"{quote.text}"</p>
              <p className="mt-1 font-sans text-[11.5px] font-semibold text-ink-faint">— {quote.author}</p>
            </motion.div>
          );
        })()}

        {/* Middle section: Continue learning > (opens Bibliotheca) */}
        <motion.div {...enter(3)}>
          <ContinueLearningSection lang={language.id} level={language.level} />
        </motion.div>

        {/* Bottom section: Discover your next content > (opens Explora) */}
        <motion.div {...enter(4)}>
          <DiscoverContentSection lang={language.id} level={language.level} />
        </motion.div>
      </div>
    </>
  );
}

// ── Top Left: Today + Goal + Where you left off ──────────────────────────────

function TodayCard({
  lang,
  level,
  goal,
  streak,
  enjoys,
}: {
  lang: string;
  level: Level;
  goal: number;
  streak: number;
  enjoys: Enjoyment[];
}) {
  const translateUi = useUi();
  const { settings } = useApp();
  const today = useToday(lang);
  const steps = useNextSteps(lang, level, enjoys, 3);
  const minutes = studyMinutes(today);
  const left = Math.max(0, Math.ceil(goal - minutes));
  const scale = Math.max(goal, minutes) || 1;
  const parts = ROOMS.map((r) => ({ ...r, minutes: (today?.[r.key] ?? 0) / 60_000 })).filter((r) => r.minutes >= 0.5);
  const primary = steps?.[0];
  const secondary = (steps ?? []).slice(1, 3);
  const streakEnabled = settings.habits?.streakEnabled ?? true;
  const isRestDay = (settings.habits?.restDays ?? []).includes(new Date().getDay());

  return (
    <Card className="flex h-full flex-col justify-between p-4 sm:p-5">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <p className={label}><UiText source={'Today'} /></p>
            {streakEnabled && streak > 0 && (
              <Link
                to="/ratio"
                className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-[12px] font-bold text-accent-text transition-colors hover:bg-accent/20"
              >
                <Flame size={13} aria-hidden /> {streak} {streak === 1 ? translateUi('day') : translateUi('days')}
              </Link>
            )}
            {isRestDay && (
              <span className="inline-flex items-center rounded-full bg-sunken px-2.5 py-0.5 text-[11px] font-semibold text-ink-faint"><UiText source={'Rest day'} /></span>
            )}
          </div>
          <p className="text-[13px] font-semibold text-ink-soft">
            {isRestDay && minutes === 0
              ? translateUi('Rest day. Practice gently if you wish.')
              : minutes === 0
                ? translateUi('A fresh page.')
                : left === 0
                  ? translateUi('Goal reached. Lovely.')
                  : translateUi('{0} {1} to go', [left, left === 1 ? 'minute' : 'minutes'])}
          </p>
        </div>

        <div className="mt-1.5 flex items-baseline justify-between gap-4">
          <p className="font-serif text-[30px] leading-none font-semibold tabular-nums sm:text-[32px]">
            {Math.floor(minutes)} <span className="text-[17px] font-normal text-ink-soft"><UiText source={'of {0} minutes'} values={[goal]} /></span>
          </p>
          <Link to="/ratio" className="text-[12.5px] font-semibold text-ink-faint transition-colors hover:text-ink"><UiText source={'Ratio ›'} /></Link>
        </div>

        {/* Goal ribbon across the card, split by room */}
        <motion.div
          className="relative mt-2.5 flex h-2.5 origin-left overflow-hidden rounded-full bg-sunken"
          initial={{ scaleX: 0.6, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={spring.soft}
          role="img"
          aria-label={translateUi('{0} of {1} minutes today{2}', [Math.floor(minutes), goal, parts.length ? `: ${parts.map((p) => `${p.name.toLowerCase()} ${Math.round(p.minutes)}`).join(', ')}` : ''])}
        >
          {parts.map((p) => (
            <span key={p.key} className={cx('h-full border-r-2 border-raised last:border-r-0', p.tone)} style={{ width: `${(p.minutes / scale) * 100}%` }} />
          ))}
          {minutes > goal && <span className="absolute inset-y-0 w-0.5 bg-ink/40" style={{ left: `${(goal / scale) * 100}%` }} aria-hidden />}
        </motion.div>

        <p className="mt-2 flex min-h-4 flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-soft">
          {parts.length ? (
            parts.map((p) => (
              <span key={p.key} className="inline-flex items-center gap-1.5"><UiText source={'{0} {1} {2} min'} values={[<span className={cx('size-2 rounded-full', p.tone)} aria-hidden />, p.name, Math.round(p.minutes)]} /></span>
            ))
          ) : (
            <span><UiText source={'Read, listen, watch or write: it all counts toward your daily goal.'} /></span>
          )}
          {today?.reviews ? <span><UiText source={'{0} {1} reviewed'} values={[today.reviews, today.reviews === 1 ? 'card' : 'cards']} /></span> : null}
        </p>
      </div>

      {/* Where you left off */}
      <div className="mt-3.5 border-t border-line pt-3">
        <div className="mb-2 flex items-center justify-between">
          <p className={label}><UiText source={'Where you left off'} /></p>
          <Link to="/bibliotheca" className="text-[12px] font-semibold text-ink-faint transition-colors hover:text-ink"><UiText source={'All active ›'} /></Link>
        </div>

        {primary ? (
          <div className="space-y-2">
            <Link
              to={primary.to}
              className="group flex items-center gap-3 rounded-2xl border border-line/80 bg-surface p-2.5 transition-[border-color,background-color,transform] hover:-translate-y-0.5 hover:border-line-strong hover:bg-surface/90 sm:px-3.5 sm:py-2.5"
            >
              {primary.art ?? (
                <span className={cx('grid size-10 shrink-0 place-items-center rounded-xl', TONE[primary.tone])}>
                  <primary.icon size={19} aria-hidden />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span
                  lang={primary.key === 'review' || primary.key === 'write' || primary.key.startsWith('find') ? undefined : lang}
                  className="block truncate font-serif text-[16px] leading-snug font-semibold"
                >
                  {primary.title}
                </span>
                <span className="block truncate text-[12.5px] text-ink-soft">{primary.detail}</span>
              </span>
              <span className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-accent px-3 text-[12.5px] font-semibold text-on-accent shadow-elev-1 transition-transform group-hover:translate-x-0.5"><UiText source={'Resume {0}'} values={[<ArrowRight size={13} aria-hidden />]} /></span>
            </Link>

            {secondary.length > 0 && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {secondary.map((s) => (
                  <Link
                    key={s.key}
                    to={s.to}
                    className="group flex items-center gap-2 rounded-xl border border-line/60 bg-surface/50 px-2.5 py-1.5 transition-colors hover:border-line-strong hover:bg-surface"
                  >
                    <span className={cx('grid size-6 shrink-0 place-items-center rounded-lg', TONE[s.tone])}>
                      <s.icon size={13} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        lang={s.key === 'review' || s.key === 'write' || s.key.startsWith('find') ? undefined : lang}
                        className="block truncate text-[12.5px] font-semibold"
                      >
                        {s.title}
                      </span>
                    </span>
                    <ChevronRight size={14} className="shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          <Link
            to="/codex"
            className="group flex items-center justify-between gap-3 rounded-2xl border border-line/80 bg-surface p-3 transition-colors hover:border-line-strong"
          >
            <div>
              <p className="font-serif text-[16px] font-semibold"><UiText source={'Open a first page in Codex'} /></p>
              <p className="text-[12.5px] text-ink-soft"><UiText source={'Start with a short sample story or add your own book.'} /></p>
            </div>
            <ArrowRight size={17} className="shrink-0 text-accent-text transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        )}
      </div>
    </Card>
  );
}

// ── Top Right: Choose a mode (Bookish fine-line icons from handbook/onboarding) ─

interface ModeItem {
  id: string;
  name: string;
  role: string;
  to: string;
  illustration: ReactNode;
}

const MODES: ModeItem[] = [
  {
    id: 'codex',
    name: 'Codex',
    role: 'Read books & texts',
    to: '/codex',
    illustration: (
      <svg viewBox="0 0 44 36" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" className="h-9 w-11 text-ink-soft" aria-hidden>
        <path d="M22 8C17.5 6 10.5 6 6 7.8v20.4c4.5-1.8 11.5-1.8 16 .2 4.5-2 11.5-2 16-.2V7.8C33.5 6 26.5 6 22 8Z" fill="currentColor" fillOpacity={0.05} />
        <path d="M22 8v20.4" />
        <path d="M10 13h8M10 17h8M10 21h6" strokeOpacity={0.65} />
        <path d="M26 13h8M26 17h7M26 21h5" strokeOpacity={0.65} />
        {/* Terracotta ribbon bookmark */}
        <path d="M29 7v11l-2.2-1.8L24.6 18V7.3" className="text-accent" fill="currentColor" fillOpacity={0.18} />
      </svg>
    ),
  },
  {
    id: 'sonus',
    name: 'Sonus',
    role: 'Listen & podcasts',
    to: '/sonus',
    illustration: (
      <svg viewBox="0 0 44 36" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" className="h-9 w-11 text-ink-soft" aria-hidden>
        <path d="M10 20v-3a12 12 0 0 1 24 0v3" />
        <rect x="7.5" y="18.5" width="5.5" height="9.5" rx="2.5" fill="currentColor" fillOpacity={0.07} />
        <rect x="31" y="18.5" width="5.5" height="9.5" rx="2.5" fill="currentColor" fillOpacity={0.07} />
        {/* Terracotta soundwaves in the middle */}
        <path d="M18 22v3M22 18.5v10M26 21v5" className="text-accent" strokeWidth={1.5} />
      </svg>
    ),
  },
  {
    id: 'visio',
    name: 'Visio',
    role: 'Watch with subtitles',
    to: '/visio',
    illustration: (
      <svg viewBox="0 0 44 36" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" className="h-9 w-11 text-ink-soft" aria-hidden>
        <rect x="6" y="6.5" width="32" height="21" rx="3.5" fill="currentColor" fillOpacity={0.05} />
        <path d="M19.5 13.2 26.5 17l-7 3.8V13.2Z" className="text-accent" fill="currentColor" fillOpacity={0.2} />
        {/* Subtitle lines */}
        <path d="M13 24h10" className="text-accent" strokeWidth={1.5} />
        <path d="M25.5 24h5.5" strokeOpacity={0.65} />
        <path d="M15 31h14" strokeOpacity={0.5} />
      </svg>
    ),
  },
  {
    id: 'thesaurus',
    name: 'Thesaurus',
    role: 'Cards & dictionary',
    to: '/thesaurus',
    illustration: (
      <svg viewBox="0 0 44 36" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" className="h-9 w-11 text-ink-soft" aria-hidden>
        <rect x="13" y="5.5" width="22" height="15" rx="2.5" transform="rotate(5 24 13)" strokeOpacity={0.45} />
        <rect x="9" y="10" width="23" height="16.5" rx="2.8" fill="currentColor" fillOpacity={0.05} />
        <path d="M14 16.5h11" className="text-accent" strokeWidth={1.5} />
        <path d="M14 20.5h8" strokeOpacity={0.65} />
        <circle cx="27.5" cy="16.5" r="1.6" className="text-accent" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'mentis',
    name: 'Mentis',
    role: 'Guide, talk & write',
    to: '/mentis',
    illustration: (
      <svg viewBox="0 0 44 36" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" className="h-9 w-11 text-ink-soft" aria-hidden>
        {/* Warm reading lamp & fountain nib */}
        <path d="M14 29h16M22 19v10" />
        <path d="M13.5 19h17l-3.2-9.5H16.7L13.5 19Z" className="text-accent" fill="currentColor" fillOpacity={0.14} />
        <path d="M18.5 22.5c1 1.4 2.2 2 3.5 2s2.5-.6 3.5-2" className="text-accent" />
      </svg>
    ),
  },
  {
    id: 'cursus',
    name: 'Cursus',
    role: 'Course & grammar',
    to: '/cursus',
    illustration: (
      <svg viewBox="0 0 44 36" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" className="h-9 w-11 text-ink-soft" aria-hidden>
        {/* Winding path & milestone flag */}
        <path d="M8 27c5-1 7-6 13-6s8-6 15-7" strokeDasharray="2.2 2.2" />
        <circle cx="11" cy="26.5" r="2.2" fill="currentColor" fillOpacity={0.15} />
        <circle cx="22" cy="21" r="2.2" fill="currentColor" fillOpacity={0.15} />
        <path d="M32 7v14" className="text-accent" />
        <path d="M32 7.5 39 10l-7 2.8V7.5Z" className="text-accent" fill="currentColor" fillOpacity={0.22} />
      </svg>
    ),
  },
];

function ChooseModeCard() {
  return (
    <Card className="flex h-full flex-col justify-between p-4 sm:p-5">
      <div className="mb-2.5 flex items-baseline justify-between gap-2">
        <p className={label}><UiText source={'Choose a mode'} /></p>
        <span className="font-serif text-[12px] italic text-ink-faint"><UiText source={'Your scriptorium'} /></span>
      </div>

      <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-2">
        {MODES.map((m) => (
          <Link
            key={m.id}
            to={m.to}
            className="group flex flex-col items-center justify-center rounded-2xl border border-line/80 bg-surface/65 px-2.5 py-2 text-center transition-[transform,border-color,background-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-accent/50 hover:bg-surface hover:shadow-elev-1"
          >
            <span className="transition-transform duration-200 group-hover:scale-105 [&>svg]:h-7 [&>svg]:w-9">{m.illustration}</span>
            <span className="mt-1 font-serif text-[14.5px] leading-tight font-semibold text-ink group-hover:text-accent-text">{m.name}</span>
            <span className="mt-0.5 line-clamp-1 text-[11px] text-ink-soft">{m.role}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

// ── Middle Section: Continue learning > (links to /bibliotheca) ──────────────

interface ContinueItem {
  id: string;
  to: string;
  room: string;
  title: string;
  detail: string;
  pct?: number;
  art: ReactNode;
  langAttr?: string;
}

function ContinueLearningSection({ lang, level }: { lang: string; level: Level }) {
  const translateUi = useUi();
  const allTexts = useLibrary(lang);
  const progress = useAllProgress();
  const listening = useMediaList(lang);
  const videos = useMediaList(lang, 'watch');
  const audiobooks = useBooks(lang);
  const playback = usePlaybackMap();
  const songs = useSavedSongs(lang);
  const due = useDueSummary(lang);
  const journal = useJournal(lang);

  const items = useMemo<ContinueItem[]>(() => {
    const list: ContinueItem[] = [];

    // 1. In-progress books in Codex
    const readable = (allTexts ?? []).filter((t) => t.kind !== 'shelfItem' && !t.finishedAt);
    const activeBooks = readable
      .filter((t) => t.lastOpenedAt || (progress?.get(t.id)?.percent ?? 0) > 0)
      .sort((a, b) => (b.lastOpenedAt ?? b.createdAt) - (a.lastOpenedAt ?? a.createdAt));

    for (const book of activeBooks.slice(0, 2)) {
      const pct = Math.round((progress?.get(book.id)?.percent ?? 0) * 100);
      list.push({
        id: `book:${book.id}`,
        to: `/codex/read/${book.id}`,
        room: 'Codex',
        title: book.title,
        detail: `${pct}% read${book.author ? ` · ${book.author}` : ''}`,
        pct: Math.max(4, pct),
        langAttr: lang,
        art: (
          <div className="flex size-full items-center justify-center bg-sunken p-2.5">
            <div className="h-full aspect-[2/3] overflow-hidden rounded shadow-elev-1">
              <BookCover text={book} size="sm" className="size-full" />
            </div>
          </div>
        ),
      });
    }

    // 2. Unfinished audio in Sonus
    const activeAudio = (listening ?? [])
      .filter((m) => m.kind !== 'spotify' && m.lastPlayedAt && !playback?.get(m.id)?.completed)
      .sort((a, b) => (b.lastPlayedAt ?? 0) - (a.lastPlayedAt ?? 0));

    for (const ep of activeAudio.slice(0, 2)) {
      const p = playback?.get(ep.id);
      const pct = ep.durationMs && p ? Math.round((p.positionMs / ep.durationMs) * 100) : 25;
      const left = ep.durationMs && p ? Math.max(0, ep.durationMs - p.positionMs) : 0;
      list.push({
        id: `audio:${ep.id}`,
        to: `/sonus/play/${ep.id}`,
        room: 'Sonus',
        title: ep.title,
        detail: left > 60_000 ? `${formatDuration(left)} left` : ep.collection || 'Continue listening',
        pct,
        langAttr: lang,
        art: <Artwork title={ep.title} coverBlobId={ep.coverBlobId} coverUrl={ep.coverUrl} className="size-full object-cover" rounded="rounded-none" />,
      });
    }

    // 3. Unfinished video in Visio
    const activeVideos = (videos ?? [])
      .filter((v) => v.lastPlayedAt && !playback?.get(v.id)?.completed)
      .sort((a, b) => (b.lastPlayedAt ?? 0) - (a.lastPlayedAt ?? 0));

    for (const vid of activeVideos.slice(0, 1)) {
      const p = playback?.get(vid.id);
      const pct = vid.durationMs && p ? Math.round((p.positionMs / vid.durationMs) * 100) : 30;
      list.push({
        id: `video:${vid.id}`,
        to: `/visio/watch/${vid.id}`,
        room: 'Visio',
        title: vid.title,
        detail: vid.collection || 'Continue watching',
        pct,
        langAttr: lang,
        art: <Poster title={vid.title} coverBlobId={vid.coverBlobId} coverUrl={vid.coverUrl} className="size-full rounded-none shadow-none" />,
      });
    }

    // 4. Audiobooks in Sonus
    for (const ab of (audiobooks ?? []).slice(0, 1)) {
      if (list.length >= 5) break;
      list.push({
        id: `audiobook:${ab.id}`,
        to: `/sonus/book/${ab.id}`,
        room: 'Sonus',
        title: ab.title,
        detail: ab.author ? `Audiobook · ${ab.author}` : 'Audiobook',
        langAttr: lang,
        art: <Artwork title={ab.title} coverBlobId={ab.coverBlobId} coverUrl={ab.coverUrl} className="size-full object-cover" rounded="rounded-none" />,
      });
    }

    // 5. Due flashcards in Thesaurus
    const dueCards = (due?.due ?? 0) + (due?.fresh ?? 0);
    if (dueCards > 0 && list.length < 5) {
      list.push({
        id: 'thesaurus:due',
        to: '/thesaurus/study/all?mode=recall',
        room: 'Thesaurus',
        title: `${dueCards} ${dueCards === 1 ? 'card' : 'cards'} to review`,
        detail: [due?.due && `${due.due} due`, due?.fresh && `${due.fresh} new`].filter(Boolean).join(' · '),
        art: <WarmVignette hue="#6b8e78" icon={Layers} label={`${dueCards}`} />,
      });
    }

    // 6. Saved songs in Cantus
    if ((songs ?? []).length > 0 && list.length < 5) {
      const s = songs![0];
      list.push({
        id: `song:${s.id}`,
        to: `/cantus/song/${encodeURIComponent(s.id)}`,
        room: 'Sonus+',
        title: s.title,
        detail: `Song · ${s.artist}`,
        langAttr: lang,
        art: <SongArt url={s.artworkUrl} title={s.title} className="size-full object-cover" rounded="rounded-none" size={240} />,
      });
    }

    // 7. Fill remaining slots up to 5 with welcoming rooms so the 5-card shelf is always complete & balanced
    if (list.length < 5 && readable.length > activeBooks.length) {
      const nextBook = readable.find((t) => !activeBooks.includes(t));
      if (nextBook) {
        list.push({
          id: `next-book:${nextBook.id}`,
          to: `/codex/read/${nextBook.id}`,
          room: 'Codex',
          title: nextBook.title,
          detail: nextBook.author || 'Up next on your shelf',
          langAttr: lang,
          art: (
            <div className="flex size-full items-center justify-center bg-sunken p-2.5">
              <div className="h-full aspect-[2/3] overflow-hidden rounded shadow-elev-1">
                <BookCover text={nextBook} size="sm" className="size-full" />
              </div>
            </div>
          ),
        });
      }
    }

    if (list.length < 5 && !activeBooks.length) {
      const sampleTitle = SAMPLES[lang]?.title ?? SAMPLES.en.title;
      list.push({
        id: 'codex:sample',
        to: '/codex',
        room: 'Codex',
        title: quote(SAMPLES[lang] ? lang : 'en', sampleTitle),
        detail: 'A short starter story, ready to read',
        langAttr: lang,
        art: <WarmVignette hue="#c86d51" icon={BookOpen} label={translateUi('Read')} />,
      });
    }

    if (list.length < 5) {
      list.push({
        id: 'cursus:path',
        to: '/cursus',
        room: 'Cursus',
        title: `Course & Grammatica`,
        detail: `Structured lessons and drills for ${level}`,
        art: <WarmVignette hue="#5f87a8" icon={GraduationCap} label={level} />,
      });
    }

    if (list.length < 5 && dueCards === 0) {
      list.push({
        id: 'thesaurus:browse',
        to: '/thesaurus',
        room: 'Thesaurus',
        title: 'Core vocabulary decks',
        detail: 'Top frequency words & everyday themes',
        art: <WarmVignette hue="#6b8e78" icon={Layers} label="100+" />,
      });
    }

    const wroteToday = (journal ?? []).some((e) => e.date === localDateKey() && e.words > 0);
    if (list.length < 5 && !wroteToday) {
      const prompt = curatedPrompt(lang, level);
      list.push({
        id: 'mentis:diarium',
        to: '/mentis/diarium',
        room: 'Mentis',
        title: 'Today’s journal entry',
        detail: prompt.en || prompt.text,
        art: <WarmVignette hue="#b56fa0" icon={PenLine} label={translateUi('Write')} />,
      });
    }

    if (list.length < 5) {
      list.push({
        id: 'sonus:explore',
        to: '/sonus?tab=radio',
        room: 'Sonus',
        title: 'Live radio & podcasts',
        detail: 'Listen in from stations around the world',
        art: <WarmVignette hue="#d49b54" icon={Headphones} label={translateUi('Live')} />,
      });
    }

    return list.slice(0, 5);
  }, [allTexts, progress, listening, videos, audiobooks, playback, songs, due, journal, lang, level]);

  return (
    <section aria-label={translateUi('Continue learning')}>
      <div className="mb-2.5 flex items-baseline justify-between gap-4">
        <Link to="/bibliotheca" className="group inline-flex items-center gap-1.5">
          <h2 className="font-serif text-[20px] font-semibold tracking-tight transition-colors group-hover:text-accent-text sm:text-[22px]"><UiText source={'Continue learning'} /></h2>
          <ChevronRight size={19} className="text-ink-soft transition-transform duration-150 group-hover:translate-x-1 group-hover:text-accent-text" aria-hidden />
        </Link>
        <Link to="/bibliotheca" className="text-[12.5px] font-semibold text-ink-soft transition-colors hover:text-ink"><UiText source={'Bibliotheca ›'} /></Link>
      </div>

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((item, idx) => (
          <Link
            key={item.id}
            to={item.to}
            className={cx(
              'group flex flex-col overflow-hidden rounded-2xl border border-line/80 bg-raised shadow-elev-1 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-elev-2',
              idx === 4 && 'hidden lg:flex',
              idx === 3 && 'sm:hidden lg:flex',
            )}
          >
            <div className="relative h-24 w-full overflow-hidden bg-sunken">
              {item.art}
              <span className="absolute top-2 left-2 rounded-full bg-surface/90 px-2 py-0.5 text-[10px] font-bold tracking-[0.08em] text-ink backdrop-blur-md uppercase shadow-elev-1">
                {item.room}
              </span>
              {item.pct !== undefined && item.pct > 0 && (
                <span className="absolute inset-x-0 bottom-0 h-1 bg-black/25" aria-hidden>
                  <span className="block h-full origin-left bg-accent" style={{ transform: `scaleX(${Math.min(1, Math.max(0.05, item.pct / 100))})` }} />
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col justify-between p-3">
              <div>
                <p lang={item.langAttr} className="line-clamp-1 font-serif text-[15px] leading-snug font-semibold group-hover:text-accent-text">
                  {item.title}
                </p>
                <p className="mt-0.5 line-clamp-1 text-[12px] leading-snug text-ink-soft">{item.detail}</p>
              </div>
              <span className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-semibold text-accent-text"><UiText source={'Continue {0}'} values={[<ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" aria-hidden />]} /></span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ── Bottom Section: Discover your next content > (links to /explora) ─────────

const PICK_HUE: Record<string, string> = {
  series: '#c86d51',
  films: '#b56fa0',
  books: '#6b8e78',
  podcasts: '#5f87a8',
  youtube: '#cf6a6a',
  games: '#8a7fb0',
  dictionaries: '#9a8466',
};

const PICK_ICON: Record<PickGroup, LucideIcon> = {
  series: Tv,
  films: Clapperboard,
  books: BookOpen,
  podcasts: Podcast,
  youtube: Clapperboard,
  games: Sparkles,
  dictionaries: BookOpen,
};

const PICK_TOOL: Record<PickGroup, string> = {
  series: 'Visio · Watch',
  films: 'Visio · Watch',
  youtube: 'Visio · Watch',
  books: 'Codex · Read',
  podcasts: 'Sonus · Listen',
  games: 'Mentis · Play',
  dictionaries: 'Thesaurus',
};

interface DiscoverCardItem {
  id: string;
  tool: string;
  level?: string;
  title: string;
  detail: string;
  art: ReactNode;
  langAttr?: string;
  onClick: () => void;
}

function DiscoverContentSection({ lang, level }: { lang: string; level: Level }) {
  const translateUi = useUi();
  const navigate = useNavigate();
  const guide = useGuide();
  const starterList = useStarterList(lang);
  const streaming = useStreaming();
  const lookups = usePickLookups(lang, guide?.picks, streaming.country, streaming.services.length ? streaming.token : '');
  const [opened, setOpened] = useState<{ pick: Pick; group: PickGroup } | null>(null);
  const [sheet, setSheet] = useState<SheetTitle | null>(null);

  const cards = useMemo<DiscoverCardItem[]>(() => {
    const out: DiscoverCardItem[] = [];
    const picks = guide?.picks;

    const addPick = (group: PickGroup) => {
      const candidates = (picks?.[group] ?? []).filter((p) => withinReach(p.level, level));
      const chosen = candidates[0] ?? picks?.[group]?.[0];
      if (!chosen) return;
      const key = pickKey(chosen);
      const lookup = lookups.get(key);
      const poster = posterUrl(lookup?.title.posterPath, 'w185');
      const hue = PICK_HUE[group] ?? '#c86d51';
      const Icon = PICK_ICON[group];
      out.push({
        id: `pick:${key}`,
        tool: PICK_TOOL[group],
        level: chosen.level,
        title: chosen.title,
        detail: chosen.why || chosen.by || 'Picked for your level',
        langAttr: lang,
        onClick: () => {
          if (group === 'series' || group === 'films') {
            setSheet({ pick: chosen, type: group === 'series' ? 'tv' : 'movie', tmdb: lookup?.title });
          } else {
            setOpened({ pick: chosen, group });
          }
        },
        art: poster ? (
          <img src={poster} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
        ) : (
          <Art
            query={pickImageQuery(chosen, group, lang)}
            fit="cover"
            fallback={<WarmVignette hue={hue} icon={Icon} label={chosen.level} />}
          />
        ),
      });
    };

    if (picks) {
      addPick('books');
      addPick('podcasts');
      addPick('series');
      addPick('films');
    }

    // Starter vocabulary theme deck for Thesaurus
    const themes = STARTER_THEMES.filter((t) => (starterList?.themes[t.id]?.length ?? 0) >= 8);
    if (themes.length > 0 && out.length < 5) {
      const theme = themes[0];
      const count = starterList?.themes[theme.id]?.length ?? 0;
      out.push({
        id: `theme:${theme.id}`,
        tool: 'Thesaurus · Deck',
        level,
        title: theme.name,
        detail: `${count} essential words · ${theme.blurb}`,
        onClick: () => navigate('/thesaurus/ready/' + starterKey({ kind: 'theme', id: theme.id })),
        art: (
          <Art
            query={THEME_ARTICLE[theme.id] ? { kind: 'article', title: THEME_ARTICLE[theme.id] } : null}
            fallback={<WarmVignette hue="#7c8f4e" icon={Layers} label={`${count}`} />}
          />
        ),
      });
    }

    // News source for Codex
    const news = newsSources(lang);
    if (news.length > 0 && out.length < 5) {
      const src = news[0];
      out.push({
        id: `news:${src.id}`,
        tool: 'Codex · News',
        title: src.name,
        detail: 'Today’s articles, clean and ready to read with 1-tap lookup',
        onClick: () => navigate('/explora?tab=read'),
        art: <WarmVignette hue="#4f93a0" icon={Newspaper} label={translateUi('News')} />,
      });
    }

    // Fallbacks if language has no curated Mundus picks yet
    if (out.length < 5) {
      out.push({
        id: 'explora:gutenberg',
        tool: 'Codex · Classics',
        title: 'Project Gutenberg & Wikipedia',
        detail: 'Free books and today’s most-read articles in your language',
        onClick: () => navigate('/explora?tab=read'),
        art: <WarmVignette hue="#c86d51" icon={BookOpen} label={translateUi('Free')} />,
      });
    }
    if (out.length < 5) {
      out.push({
        id: 'explora:audiobooks',
        tool: 'Sonus · Listen',
        title: 'LibriVox Audiobooks & Radio',
        detail: 'Free public-domain audiobooks and live radio stations',
        onClick: () => navigate('/sonus?tab=books'),
        art: <WarmVignette hue="#5f87a8" icon={Headphones} label={translateUi('Audio')} />,
      });
    }
    if (out.length < 5) {
      out.push({
        id: 'explora:words',
        tool: 'Thesaurus · Words',
        title: 'Top 100 Frequency Deck',
        detail: 'The words you meet most often, with example sentences',
        onClick: () => navigate('/explora?tab=words'),
        art: <WarmVignette hue="#6b8e78" icon={Layers} label={translateUi('Top 100')} />,
      });
    }
    if (out.length < 5) {
      out.push({
        id: 'explora:visio',
        tool: 'Visio · Watch',
        title: 'Series & Films on Streaming',
        detail: 'Browse shows in your language with dual-subtitle support',
        onClick: () => navigate('/visio?tab=services'),
        art: <WarmVignette hue="#b56fa0" icon={Clapperboard} label={translateUi('Watch')} />,
      });
    }

    return out.slice(0, 5);
  }, [guide?.picks, level, lookups, lang, starterList, navigate]);

  return (
    <section aria-label={translateUi('Discover your next content')}>
      <div className="mb-2.5 flex items-baseline justify-between gap-4">
        <Link to="/explora" className="group inline-flex items-center gap-1.5">
          <h2 className="font-serif text-[20px] font-semibold tracking-tight transition-colors group-hover:text-accent-text sm:text-[22px]"><UiText source={'Discover your next content'} /></h2>
          <ChevronRight size={19} className="text-ink-soft transition-transform duration-150 group-hover:translate-x-1 group-hover:text-accent-text" aria-hidden />
        </Link>
        <Link to="/explora" className="text-[12.5px] font-semibold text-ink-soft transition-colors hover:text-ink"><UiText source={'Explora ›'} /></Link>
      </div>

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            className={cx(
              'group flex flex-col overflow-hidden rounded-2xl border border-line/80 bg-raised text-left shadow-elev-1 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-elev-2',
              idx === 4 && 'hidden lg:flex',
              idx === 3 && 'sm:hidden lg:flex',
            )}
          >
            <div className="relative h-24 w-full overflow-hidden bg-sunken">
              {item.art}
              <span className="absolute top-2 left-2 rounded-full bg-surface/90 px-2 py-0.5 text-[10px] font-bold tracking-[0.08em] text-ink backdrop-blur-md uppercase shadow-elev-1">
                {item.tool}
              </span>
              {item.level && (
                <span className="absolute top-2 right-2 rounded-full bg-ink/75 px-1.5 py-0.5 text-[10px] font-bold text-bg backdrop-blur-md">
                  {item.level}
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col justify-between p-3">
              <div>
                <p lang={item.langAttr} className="line-clamp-1 font-serif text-[15px] leading-snug font-semibold group-hover:text-accent-text">
                  {item.title}
                </p>
                <p className="mt-0.5 line-clamp-1 text-[12px] leading-snug text-ink-soft">{item.detail}</p>
              </div>
              <span className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-semibold text-sage-text"><UiText source={'Explore {0}'} values={[<ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" aria-hidden />]} /></span>
            </div>
          </button>
        ))}
      </div>

      <Drawer open={Boolean(opened)} onClose={() => setOpened(null)} title={opened?.pick.title ?? ''}>
        {opened && (
          <PickCard
            pick={opened.pick}
            kind={GROUP_KIND[opened.group]}
            lang={lang}
            level={level}
            hue={PICK_HUE[opened.group] ?? '#c86d51'}
            icon={PICK_ICON[opened.group]}
          />
        )}
      </Drawer>
      <TitleSheet lang={lang} title={sheet} onClose={() => setSheet(null)} />
    </section>
  );
}

function WarmVignette({ hue, icon: Icon, label: text }: { hue: string; icon: LucideIcon; label?: string }) {
  const style: CSSProperties = {
    background: `linear-gradient(155deg, color-mix(in oklab, ${hue} 22%, var(--color-surface)), color-mix(in oklab, ${hue} 9%, var(--color-surface)))`,
    color: `color-mix(in oklab, ${hue} 72%, var(--color-ink))`,
  };
  return (
    <div className="relative flex size-full items-center justify-center overflow-hidden p-4" style={style}>
      <Icon size={64} strokeWidth={1.25} className="absolute -right-2 -bottom-3 rotate-[-8deg] opacity-25 transition-transform duration-300 group-hover:rotate-[-2deg] group-hover:scale-105" aria-hidden />
      {text && <span className="relative font-serif text-[26px] font-semibold tracking-tight opacity-85">{text}</span>}
    </div>
  );
}
