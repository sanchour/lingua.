import { UiText, useUi } from '@/design/i18n/UiText';
import { ImmersionPage } from '@/features/culture/ImmersionPage';
import { CultureShelf } from '@/features/culture/CultureShelf';
import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Check, ChevronRight, Lock, Sparkles } from 'lucide-react';
import { useApp } from '@/app/context';
import { PageHeader } from '@/app/PageHeader';
import { useInRoom } from '@/app/room';
import { LANE_NAME, LANES, nextLevelPicks, STAGES, stageIndex, tipsByReach } from '@/core/mundus/guide';
import type { Lane, Step } from '@/core/mundus/guide';
import { tipsFor } from '@/core/mundus/tips';
import type { Tip } from '@/core/mundus/tips';
import { GROUP_KIND } from '@/core/mundus/types';
import type { Pick, PickGroup } from '@/core/mundus/types';
import { toggleChallenge, useChallenges } from '@/data/challenges';
import { useVocabularyCounts } from '@/data/words';
import { Drawer, Segmented } from '@/design/primitives';
import { useLayout } from '@/design/hooks/useLayout';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { localDateKey } from '@/lib/format';
import { pickKey, usePickLookups, useStreaming } from '@/features/mundus/hooks';
import type { PickLookup } from '@/features/mundus/hooks';
import { PickCard } from '@/features/mundus/PicksView';
import { ReplyBar } from '@/features/mundus/ReplyBar';
import { TIP_ICONS, TipsView } from '@/features/mundus/TipsView';
import { TitleSheet } from '@/features/visio/services/TitleSheet';
import type { SheetTitle } from '@/features/visio/services/TitleSheet';
import { pickImageQuery } from '@/services/mundus/images';
import { posterUrl } from '@/services/mundus/tmdb';
import { Art } from '@/features/mundus/Art';
import { MUNDUS, Compass, LANE_HUE, LANE_ICON } from './Compass';
import { useGuide } from './useGuide';
import type { Guide } from './useGuide';

const label = 'text-[12px] font-bold tracking-[0.14em] text-ink-faint uppercase';
const GROUP_LANE: Record<PickGroup, Lane> = { series: 'watch', films: 'watch', youtube: 'watch', books: 'read', podcasts: 'listen', games: 'words', dictionaries: 'words' };
const tint = (hue: string, amount = 16): CSSProperties => ({ background: `color-mix(in oklab, ${hue} ${amount}%, var(--color-surface))` });
const rise = (i: number) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { ...spring.soft, delay: 0.05 * i } });

type Tab = 'guide' | 'try' | 'culture' | 'immerse';
const TABS: Array<{ id: Tab; label: string; short: string; to: string }> = [
  { id: 'immerse', label: 'Every day', short: 'Every day', to: '/mentis/immerse' },
  { id: 'culture', label: 'Culture', short: 'Culture', to: '/mentis/culture' },
  { id: 'guide', label: 'Your guide', short: 'Guide', to: '/mentis' },
  { id: 'try', label: 'Things to try', short: 'Try', to: '/mentis/try' },
];

/**
 * Mundus (Lingua 3.0-7, replacing Mundus): a friend who knows your level, what you enjoy and how
 * your week went, and points you somewhere good. Your guide: three next steps with their reasons,
 * the path ahead and things to try. Explore: a shelf for every room. Every pick and Things to try:
 * the full lists. Everything opens inside Lingua.
 */
export default function MundusPage() {
  const sub = useParams()['*'];
  const tab: Tab = sub === 'try' || sub === 'culture' || sub === 'immerse' ? sub : 'guide';
  const { language } = useApp();
  const guide = useGuide();
  const streaming = useStreaming();
  const lookups = usePickLookups(language.id, guide?.picks, streaming.country, streaming.services.length ? streaming.token : '');
  const [opened, setOpened] = useState<{ pick: Pick; group: PickGroup } | null>(null);
  const [sheet, setSheet] = useState<SheetTitle | null>(null);
  const open = (pick: Pick, group: PickGroup) => {
    if (group === 'series' || group === 'films') setSheet({ pick, type: group === 'series' ? 'tv' : 'movie', tmdb: lookups.get(pickKey(pick))?.title });
    else setOpened({ pick, group });
  };

  return (
    <>
      <PageHeader title="Mundus" eyebrow={`Your guide to ${guide?.langName ?? 'the language'}`} />
      <Tabs tab={tab} />
      {tab === 'immerse' ? <ImmersionPage key={language.id} /> : tab === 'culture' ? <CultureShelf key={language.id} lang={language.id} /> : guide === undefined ? (
        <div className="h-96" />
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring.snappy}>
            {tab === 'guide' && <GuideTab guide={guide} level={language.level} lookups={lookups} onOpen={open} />}
            {tab === 'try' && <TipsView lang={guide.lang} />}
          </motion.div>
        </AnimatePresence>
      )}
      <Drawer open={Boolean(opened)} onClose={() => setOpened(null)} title={opened?.pick.title ?? ''}>
        {opened && guide && <PickCard pick={opened.pick} kind={GROUP_KIND[opened.group]} lang={guide.lang} level={language.level} hue={LANE_HUE[GROUP_LANE[opened.group]]} icon={LANE_ICON[GROUP_LANE[opened.group]]} />}
      </Drawer>
      <TitleSheet lang={language.id} title={sheet} onClose={() => setSheet(null)} />
    </>
  );
}

/** Mundus's own tabs, under Mentis's: a segmented control (Mentis's tabs have the digit shortcuts). */
function Tabs({ tab }: { tab: Tab }) {
  const navigate = useNavigate();
  const { layout } = useLayout();
  return (
    <div className="-mt-1 mb-5">
      <Segmented<Tab>
        block={layout !== 'wide'}
        label="Mundus"
        value={tab}
        onChange={(next) => navigate(TABS.find((t) => t.id === next)!.to)}
        options={TABS.map((t) => ({ value: t.id, label: layout === 'wide' ? t.label : t.short }))}
      />
    </div>
  );
}

/** Your guide: the note and next steps; on a wide window, the week and things to try in a side panel. */
function GuideTab({ guide, level, lookups, onOpen }: { guide: Guide; level: Parameters<typeof stageIndex>[0]; lookups: Map<string, PickLookup>; onOpen: (pick: Pick, group: PickGroup) => void }) {
  const translateUi = useUi();
  const inRoom = useInRoom();
  return (
    // In Mentis the room's rail takes the right; the week and things to try follow below.
    <div className={cx('grid gap-12', !inRoom && 'xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-10')}>
      <div className="min-w-0 space-y-8">
        <Hero guide={guide} level={level} />
        <section aria-labelledby="next-title">
          <h2 id="next-title" className="mb-4 font-serif text-[24px] leading-tight font-semibold"><UiText source={'Next for you'} /></h2>
          <div className="grid gap-3 md:grid-cols-3">
            {guide.steps.map((step, i) => (
              <motion.div key={step.key} {...rise(i)} className="min-w-0">
                <StepCard step={step} n={i + 1} lang={guide.lang} done={step.type === 'tip' && guide.doneToday.has(step.tip.id)} lookup={step.type === 'pick' ? lookups.get(pickKey(step.pick)) : undefined} onOpen={onOpen} />
              </motion.div>
            ))}
          </div>
        </section>
        <Path guide={guide} level={level} lookups={lookups} onOpen={onOpen} />
      </div>
      <aside className="space-y-10 xl:sticky xl:top-24 xl:self-start" aria-label={translateUi('Your week and things to try')}>
        <WeekPanel guide={guide} />
        <TryNow lang={guide.lang} level={level} />
      </aside>
    </div>
  );
}

/** The week lane by lane, for the desktop side panel (on a phone the compass says it). */
function WeekPanel({ guide }: { guide: Guide }) {
  const most = Math.max(1, ...LANES.map((l) => guide.week[l]));
  return (
    <section aria-labelledby="week-title" className="hidden rounded-3xl border border-line/60 bg-surface p-5 xl:block">
      <h2 id="week-title" className={label}><UiText source={'The last seven days'} /></h2>
      <ul className="mt-4 space-y-3">
        {LANES.map((l) => {
          const Icon = LANE_ICON[l];
          return (
            <li key={l} className="flex items-center gap-3 text-[13.5px]">
              <Icon size={16} style={{ color: LANE_HUE[l] }} aria-hidden />
              <span className="w-14 font-semibold">{LANE_NAME[l]}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken">
                <span className="block h-full rounded-full" style={{ width: `${(guide.week[l] / most) * 100}%`, background: LANE_HUE[l] }} />
              </span>
              <span className="w-12 text-right text-ink-soft tabular-nums"><UiText source={'{0} min'} values={[guide.week[l]]} /></span>
              {l === guide.steer.lane && (
                <span className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: MUNDUS }}><UiText source={'Next'} /></span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ── The note and the compass ────────────────────────────────────────────────

function Hero({ guide, level }: { guide: Guide; level: Parameters<typeof stageIndex>[0] }) {
  const translateUi = useUi();
  const counts = useVocabularyCounts(guide.lang);
  const stage = STAGES[stageIndex(level)];
  return (
    <motion.section
      {...rise(0)}
      aria-label={translateUi('Your week')}
      className="relative overflow-hidden rounded-[28px] border border-line/60 p-5 sm:p-6"
      style={{ background: `radial-gradient(120% 90% at 0% 0%, color-mix(in oklab, ${MUNDUS} 22%, transparent), transparent 60%), radial-gradient(90% 80% at 100% 100%, color-mix(in oklab, #d49b54 16%, transparent), transparent 65%), var(--color-surface)` }}
    >
      <Contours />
      <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-10">
        <div className="min-w-0 flex-1 self-stretch">
          <p className={label} style={{ color: MUNDUS }}><UiText source={'Mundus says'} /></p>
          <p aria-live="polite" className="mt-2 font-serif text-[21px] leading-snug font-semibold text-ink sm:text-[25px]">
            {guide.note}
          </p>
          <ReplyBar replies={guide.replies} />
          <div className="mt-4 flex flex-wrap gap-2">
            <Chip>
              {stage.name} · {level === 'A0' ? translateUi('beginner') : level}
            </Chip>
            {counts && counts.known > 0 && <Chip><UiText source={'{0} words known'} values={[counts.known.toLocaleString('en')]} /></Chip>}
          </div>
        </div>
        <div className="text-ink">
          <Compass week={guide.week} lane={guide.steer.lane} size={208} />
        </div>
      </div>
    </motion.section>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex h-8 items-center rounded-full bg-surface/80 px-3 text-[13px] font-semibold text-ink-soft shadow-elev-1">{children}</span>;
}

/** Faint contour lines, like a map's, behind the note. */
function Contours() {
  return (
    <svg aria-hidden viewBox="0 0 400 300" preserveAspectRatio="xMaxYMid slice" className="pointer-events-none absolute inset-0 size-full" style={{ color: MUNDUS }}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path key={i} d={`M ${180 + i * 6} ${-20 + i * 4} C ${260 + i * 18} ${40 + i * 22}, ${210 + i * 26} ${150 + i * 10}, ${330 + i * 14} ${220 + i * 12} S ${430} ${330 - i * 8}, ${460} ${300 + i * 6}`} fill="none" stroke="currentColor" strokeOpacity={0.09} strokeWidth={1.2} />
      ))}
    </svg>
  );
}

// ── Next steps ─────────────────────────────────────────────────────────────

function StepCard({ step, n, lang, done, lookup, onOpen }: { step: Step; n: number; lang: string; done: boolean; lookup?: PickLookup; onOpen: (pick: Pick, group: PickGroup) => void }) {
  const translateUi = useUi();
  const lane: Lane | null = step.type === 'pick' || step.type === 'room' ? step.lane : null;
  const hue = lane ? LANE_HUE[lane] : step.type === 'tip' ? '#6b8e78' : MUNDUS;
  const Icon = lane ? LANE_ICON[lane] : step.type === 'tip' ? TIP_ICONS[step.tip.icon] : Sparkles;
  const kind = lane ? LANE_NAME[lane] : step.type === 'tip' ? 'Try' : 'Grammar';
  const poster = step.type === 'pick' ? posterUrl(lookup?.title.posterPath, 'w185') : undefined;
  const title = step.type === 'pick' ? step.pick.title : step.type === 'tip' ? step.tip.title : step.title;

  const button = 'no-callout inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[13.5px] font-semibold transition-transform active:scale-[0.97]';
  const action =
    step.type === 'pick' ? (
      <button type="button" onClick={() => onOpen(step.pick, step.group)} className={cx(button, 'bg-inverse text-on-inverse')}>
        {step.group === 'series' || step.group === 'films' ? translateUi('Where to watch') : translateUi('Open')} <ArrowRight size={15} aria-hidden />
      </button>
    ) : step.type === 'tip' ? (
      <span className="flex flex-wrap items-center gap-2">
        <button type="button" aria-pressed={done} onClick={() => void toggleChallenge(lang, step.tip.id)} className={cx(button, done ? 'bg-sage text-on-accent' : 'bg-inverse text-on-inverse')}>
          <Check size={15} strokeWidth={2.6} aria-hidden /> {done ? translateUi('Done today') : translateUi('I did it')}
        </button>
        <Link to="/mentis/try" className="hit text-[13px] font-semibold text-ink-soft hover:text-ink"><UiText source={'How'} /></Link>
      </span>
    ) : (
      <Link to={step.to} className={cx(button, 'bg-inverse text-on-inverse')}>
        {step.type === 'room' ? step.action : translateUi('Open the topic')} <ArrowRight size={15} aria-hidden />
      </Link>
    );

  return (
    <article className="flex h-full flex-col rounded-3xl border border-line/60 p-5" style={tint(hue, 12)}>
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-xl" style={{ ...tint(hue, 30), color: `color-mix(in oklab, ${hue} 85%, var(--color-ink))` }} aria-hidden>
          <Icon size={18} />
        </span>
        <span className="text-[12px] font-bold tracking-[0.14em] uppercase" style={{ color: `color-mix(in oklab, ${hue} 85%, var(--color-ink))` }}>
          {kind}
        </span>
        {step.minutes && <span className="ml-auto rounded-full bg-surface/80 px-2 py-0.5 text-[11.5px] font-bold text-ink-soft"><UiText source={'{0} min'} values={[step.minutes]} /></span>}
        <span className={cx('font-serif text-[15px] font-semibold text-ink-faint tabular-nums', !step.minutes && 'ml-auto')} aria-hidden>
          {n}
        </span>
      </div>
      <div className="mt-4 flex gap-3.5">
        {step.type === 'pick' && (
          <span className="aspect-[2/3] w-16 shrink-0 self-start overflow-hidden rounded-xl shadow-elev-1 sm:w-[72px]" aria-hidden>
            {poster ? <img src={poster} alt="" className="size-full object-cover" /> : <Art query={pickImageQuery(step.pick, step.group, lang)} fallback={<span className="grid size-full place-items-center" style={{ ...tint(hue, 30), color: hue }}><Icon size={20} /></span>} />}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 lang={step.type === 'pick' ? lang : undefined} className="font-serif text-[20px] leading-snug font-semibold">
            {title}
          </h3>
          {step.type === 'pick' && <p className="mt-1 text-[13.5px] leading-snug text-ink-soft">{step.pick.why}</p>}
          {step.type === 'tip' && <p className="mt-1 text-[13.5px] leading-snug text-ink-soft">{step.tip.teaser}</p>}
        </div>
      </div>
      <p className="mt-3 flex gap-1.5 text-[13px] leading-snug text-ink-soft italic">
        <Sparkles size={13} className="mt-0.5 shrink-0" style={{ color: hue }} aria-hidden /> {step.reason}
      </p>
      <div className="mt-auto pt-4">{action}</div>
    </article>
  );
}

// ── The path ───────────────────────────────────────────────────────────────

function Path({ guide, level, lookups, onOpen }: { guide: Guide; level: Parameters<typeof stageIndex>[0]; lookups: Map<string, PickLookup>; onOpen: (pick: Pick, group: PickGroup) => void }) {
  const here = stageIndex(level);
  const next = STAGES[here + 1];
  const ahead = useMemo(() => nextLevelPicks(guide.picks, level, 4), [guide.picks, level]);
  return (
    <section aria-labelledby="path-title">
      <h2 id="path-title" className="mb-4 font-serif text-[24px] leading-tight font-semibold"><UiText source={'Your path'} /></h2>
      <ol className="relative grid grid-cols-4 gap-1">
        <span className="absolute top-[11px] right-[12.5%] left-[12.5%] h-0.5 rounded-full bg-line" aria-hidden />
        <span className="absolute top-[11px] left-[12.5%] h-0.5 rounded-full" style={{ width: `${(here / 3) * 75}%`, background: MUNDUS }} aria-hidden />
        {STAGES.map((s, i) => (
          <li key={s.id} className="relative flex flex-col items-center text-center" aria-current={i === here ? 'step' : undefined}>
            <span
              className={cx('grid size-6 place-items-center rounded-full border-2', i < here ? 'border-transparent text-white' : i === here ? 'border-transparent text-white ring-4' : 'border-line-strong bg-bg')}
              style={i <= here ? { background: MUNDUS, ['--tw-ring-color' as string]: `color-mix(in oklab, ${MUNDUS} 25%, transparent)` } : undefined}
            >
              {i < here && <Check size={13} strokeWidth={3} aria-hidden />}
            </span>
            <span className={cx('mt-2 text-[12.5px] leading-tight font-semibold sm:text-[13.5px]', i === here ? 'text-ink' : 'text-ink-faint')}>{s.name}</span>
            <span className="text-[11.5px] text-ink-faint">{s.from}</span>
          </li>
        ))}
      </ol>
      <p className="mt-5 text-[14.5px] leading-relaxed text-ink-soft">
        <span className="font-semibold text-ink"><UiText source={'Now:'} /></span> {STAGES[here].line}
        {next && (
          <>
            {' '}
            <span className="font-semibold text-ink"><UiText source={'At {0}:'} values={[next.from]} /></span> {next.line.charAt(0).toLowerCase() + next.line.slice(1)}
          </>
        )}
      </p>
      {ahead.length > 0 && (
        <>
          <p className={cx(label, 'mt-6 mb-3 flex items-center gap-1.5')}><UiText source={'{0} Further along, at {1}: a taste'} values={[<Lock size={12} aria-hidden />, ahead[0].pick.level]} /></p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ahead.map(({ pick, group }) => {
              const poster = posterUrl(lookups.get(pickKey(pick))?.title.posterPath, 'w185');
              const lane = GROUP_LANE[group];
              const Icon = LANE_ICON[lane];
              return (
                <li key={pickKey(pick)}>
                  <button type="button" onClick={() => onOpen(pick, group)} className="no-callout group flex w-full items-center gap-3 rounded-2xl border border-line/60 bg-surface p-2.5 text-left transition-colors hover:border-line-strong">
                    <span className="aspect-[2/3] w-11 shrink-0 overflow-hidden rounded-lg" aria-hidden>
                      {poster ? (
                        <img src={poster} alt="" className="size-full object-cover" />
                      ) : (
                        <Art query={pickImageQuery(pick, group, guide.lang)} fallback={<span className="grid size-full place-items-center" style={{ ...tint(LANE_HUE[lane], 26), color: LANE_HUE[lane] }}><Icon size={16} /></span>} />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span lang={guide.lang} className="line-clamp-2 block text-[13.5px] leading-snug font-semibold">
                        {pick.title}
                      </span>
                      <span className="block text-[12px] text-ink-faint">{LANE_NAME[lane]}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

// ── Things to try ──────────────────────────────────────────────────────────

function TryNow({ lang, level }: { lang: string; level: Parameters<typeof stageIndex>[0] }) {
  const translateUi = useUi();
  const done = useChallenges(lang);
  const today = localDateKey();
  const { now, later } = useMemo(() => tipsByReach(tipsFor(lang), level), [lang, level]);
  if (!done) return null;
  const ever = new Set(done.filter((r) => r.date !== today).map((r) => r.tipId));
  const doneToday = new Set(done.filter((r) => r.date === today).map((r) => r.tipId));
  const shown = now.filter((t) => !ever.has(t.id)).slice(0, 4);
  return (
    <section aria-labelledby="try-title">
      <div className="mb-4 flex items-baseline gap-3">
        <h2 id="try-title" className="min-w-0 flex-1 font-serif text-[24px] leading-tight font-semibold"><UiText source={'Things to try'} /></h2>
        <Link to="/mentis/try" className="hit inline-flex shrink-0 items-center gap-0.5 text-[13px] font-semibold text-ink-soft hover:text-ink"><UiText source={'All of them {0}'} values={[<ChevronRight size={14} aria-hidden />]} /></Link>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {shown.map((t) => (
          <TryCard key={t.id} tip={t} lang={lang} done={doneToday.has(t.id)} />
        ))}
      </ul>
      <p className="mt-3 text-[13px] text-ink-faint">
        {ever.size ? translateUi('{0} done so far. ', [ever.size]) : ''}
        {later.length ? translateUi('{0} more open up as you go.', [later.length]) : translateUi('Every one is open to you now.')}
      </p>
    </section>
  );
}

function TryCard({ tip, lang, done }: { tip: Tip; lang: string; done: boolean }) {
  const translateUi = useUi();
  const Icon = TIP_ICONS[tip.icon];
  return (
    <li className="flex items-start gap-3.5 rounded-3xl border border-line/60 bg-surface p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-sage-soft text-sage-text" aria-hidden>
        <Icon size={19} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-serif text-[16.5px] leading-snug font-semibold">{tip.title}</p>
        <p className="mt-0.5 text-[13.5px] leading-snug text-ink-soft">{tip.teaser}</p>
      </div>
      <button
        type="button"
        aria-pressed={done}
        aria-label={done ? translateUi('Done today: {0}', [tip.title]) : translateUi('I did it: {0}', [tip.title])}
        onClick={() => void toggleChallenge(lang, tip.id)}
        className={cx('no-callout grid size-10 shrink-0 place-items-center rounded-full border transition-colors', done ? 'border-transparent bg-sage text-on-accent' : 'border-line text-ink-faint hover:border-line-strong hover:text-ink')}
      >
        <Check size={17} strokeWidth={2.6} aria-hidden />
      </button>
    </li>
  );
}
