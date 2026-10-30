import { UiText, useUi } from '@/design/i18n/UiText';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, BookOpen, Clock, Compass, Feather, Headphones, Keyboard, Layers, Plus, Printer, Sparkles, Sprout } from 'lucide-react';
import { useApp } from '@/app/context';
import { getLanguage } from '@/core/lang/languages';
import { estimateLevel } from '@/core/ratio/estimate';
import { LISTENING_KIND_LABEL, lookupsPer1000 } from '@/core/ratio/kinds';
import { useLanguages } from '@/data/languages';
import { ACTIVITIES, loadOverview } from '@/data/ratio';
import type { Overview as OverviewData } from '@/data/ratio';
import { BarChart } from '@/design/charts/BarChart';
import { Heatmap } from '@/design/charts/Heatmap';
import { LineChart } from '@/design/charts/LineChart';
import { gradeColor, Ring } from '@/design/charts/Ring';
import { compact } from '@/design/charts/useWidth';
import { Button } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/data/db';
import type { CefrLevel } from '@/data/types';
import type { EvidenceRow } from '@/core/contracts/learner';
import { LogTimeDrawer, MomentDrawer } from './forms';
import { GrammarPanel } from './GrammarPanel';
import { ErrorLogPanel } from './ErrorLogPanel';
import { SkillBalancePanel } from './SkillBalancePanel';
import { WeakSpotsPanel } from './WeakSpotsPanel';
import { MilestoneStamps } from './MilestoneStamps';
import { RealLifeGoalsPanel } from './RealLifeGoalsPanel';
import { AdvancedAnalyticsPanel } from './AdvancedAnalyticsPanel';
import { ReflectionDrawer } from './ReflectionDrawer';
import { MonthlyReportModal } from './MonthlyReportModal';
import { ACTIVITY_COLOR, ACTIVITY_LABEL, hours, Legend, Panel, pct, shortDate, Stat } from './common';

const MODE_LABEL: Record<string, string> = { mcq: 'Choose', match: 'Match pairs', cloze: 'Fill the gap', build: 'Build sentences', type: 'Typing', listen: 'Listening', speak: 'Speaking' };
const weekday = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' });

export function Overview() {
  const { language } = useApp();
  const lang = language.id;
  const [data, setData] = useState<OverviewData | null>(null);

  // Only the language being learned: every language you speak is in Tabula.
  useEffect(() => {
    let alive = true;
    setData(null);
    const load = () => void loadOverview([lang]).then((d) => alive && setData(d));
    load();
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [lang]);

  const languages = useLanguages();
  const [drawer, setDrawer] = useState<'time' | 'moment' | 'review' | 'report' | null>(null);
  const close = () => {
    setDrawer(null);
    void loadOverview([lang]).then(setData);
  };

  const evidence = useLiveQuery(() => db.evidence.where('lang').equals(lang).toArray(), [lang]) ?? [];
  const conversationsCount = useLiveQuery(
    async () => (await db.journeyEvents.where('lang').equals(lang).toArray()).filter((e) => e.kind === 'conversation' || e.kind === 'encounter').length,
    [lang],
  ) ?? 0;

  const monthlyReportData = {
    languageName: getLanguage(language.id)?.name ?? language.id,
    monthName: new Date().toLocaleDateString(undefined, { month: 'long' }),
    year: new Date().getFullYear(),
    knownWords: data?.vocabulary.known ?? 0,
    newWordsMonth: data?.vocabulary.newPerWeek.reduce((sum, w) => sum + w.words, 0) ?? 0,
    hoursStudiedMonth: (data ? ACTIVITIES.reduce((sum, a) => sum + data.habit.totals[a], 0) : 0) / 60,
    booksReadMonth: data?.reading.finishedThisYear ?? 0,
    conversationsHeldMonth: conversationsCount,
    currentStreak: data?.habit.current ?? 0,
    stampsUnlocked: ['First Word', '500 Words', 'First Book', 'One Week'].filter((_, i) => i < ((data?.vocabulary.known ?? 0) > 500 ? 3 : 1)),
    skillsSummary: [
      { name: 'Reading', hours: (data?.reading.minutes ?? 0) / 60, accuracy: 0.94 },
      { name: 'Listening', hours: (data?.listening.minutes ?? 0) / 60, accuracy: 0.89 },
      { name: 'Writing', hours: (data?.habit.totals.write ?? 0) / 60, accuracy: 0.86 },
      { name: 'Vocabulary', hours: (data?.habit.totals.review ?? 0) / 60, accuracy: 0.91 },
    ],
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" icon={Sparkles} onClick={() => setDrawer('review')}><UiText source={'Weekly review'} /></Button>
        <Button variant="ghost" icon={Printer} onClick={() => setDrawer('report')}><UiText source={'Monthly report'} /></Button>
        <Button variant="ghost" icon={Clock} onClick={() => setDrawer('time')}>
          <UiText source={'Log time'} />
        </Button>
        <Button variant="ghost" icon={Plus} onClick={() => setDrawer('moment')}>
          <UiText source={'Add a moment'} />
        </Button>
      </div>
      {!data ? <div className="h-96 animate-pulse rounded-3xl bg-surface" /> : <Dashboard data={data} lang={lang} evidence={evidence} conversationsCount={conversationsCount} />}
      <LogTimeDrawer open={drawer === 'time'} onClose={close} languages={languages ?? []} lang={lang} />
      <MomentDrawer open={drawer === 'moment'} onClose={close} languages={languages ?? []} lang={lang} />
      <ReflectionDrawer open={drawer === 'review'} onClose={close} lang={lang} />
      <MonthlyReportModal open={drawer === 'report'} onClose={close} data={monthlyReportData} />
    </div>
  );
}

function LevelCard({ known, said }: { known: number; said: string }) {
  const translateUi = useUi();
  const e = estimateLevel(known);
  return (
    <Panel title={translateUi('Where you are')} icon={Compass}>
      <div className="grid items-center gap-6 sm:grid-cols-[auto_minmax(0,1fr)]">
        <div>
          <p className="font-serif text-[40px] leading-none font-semibold tabular-nums">~{e.level}</p>
          <p className="mt-1 text-[12px] font-bold tracking-wide text-ink-faint uppercase"><UiText source={'Estimated'} /></p>
        </div>
        <div className="min-w-0">
          {e.next && (
            <>
              <div className="h-2 overflow-hidden rounded-full bg-sunken">
                <div className="h-full rounded-full bg-sage" style={{ width: `${e.progress * 100}%` }} />
              </div>
              <p className="mt-1.5 text-[13.5px] text-ink-soft tabular-nums"><UiText source={'{0} more words to about {1}.'} values={[e.next.remaining.toLocaleString(), e.next.level]} /></p>
            </>
          )}
          <p className="mt-2 text-[13px] leading-snug text-ink-faint"><UiText source={'An estimate from the {0} words you know, nothing more: listening, speaking and grammar can sit above or below it. You say you are {1}; that is the level Lingua uses.'} values={[known.toLocaleString(), said]} /></p>
        </div>
      </div>
    </Panel>
  );
}

function Dashboard({ data, lang, evidence, conversationsCount }: { data: OverviewData; lang: string; evidence: EvidenceRow[]; conversationsCount: number }) {
  const translateUi = useUi();
  const { language } = useApp();
  const { vocabulary: v, reading: r, listening: l, flashcards: f, writing: w, habit: h } = data;
  const totalMinutes = ACTIVITIES.reduce((n, a) => n + h.totals[a], 0);
  const heat = useMemo(() => new Map(h.days.map((d) => [d.date, d.total])), [h.days]);
  const last30 = useMemo(() => {
    const byDate = new Map(h.days.map((d) => [d.date, d]));
    return f.reviewsPerDay.map(({ date }) => {
      const d = byDate.get(date);
      return { label: new Date(`${date}T12:00:00`).getDate().toString(), values: ACTIVITIES.map((a) => Math.round(d?.minutes[a] ?? 0)), current: date === f.reviewsPerDay.at(-1)?.date };
    });
  }, [h.days, f.reviewsPerDay]);
  const dayparts = [
    { label: 'Morning', minutes: h.byHour.slice(5, 12).reduce((a, b) => a + b, 0) },
    { label: 'Afternoon', minutes: h.byHour.slice(12, 18).reduce((a, b) => a + b, 0) },
    { label: 'Evening', minutes: h.byHour.slice(18, 23).reduce((a, b) => a + b, 0) },
    { label: 'Night', minutes: h.byHour[23] + h.byHour.slice(0, 5).reduce((a, b) => a + b, 0) },
  ];
  const daypartMax = Math.max(1, ...dayparts.map((d) => d.minutes));
  const lookups = lookupsPer1000(r.lookups, r.lookupWords);
  const maturityTotal = Math.max(1, f.maturity.new + f.maturity.learning + f.maturity.young + f.maturity.mature);

  return (
    <div className="space-y-5">
      {/* At a glance */}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Known words', value: v.known.toLocaleString(), hint: translateUi('{0} learning', [v.learning.toLocaleString()]) },
          { label: 'Time studied', value: hours(totalMinutes), hint: 'last 12 months' },
          { label: 'Streak', value: translateUi(h.current === 1 ? '{0} day' : '{0} days', [h.current]), hint: translateUi('Longest: {0}', [h.longest]) },
          { label: 'This week', value: `${h.weekMet.filter(Boolean).length} / 7`, hint: 'goal days' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-surface px-4 py-3.5">
            <Stat value={s.value} label={s.label} hint={s.hint} />
          </div>
        ))}
      </dl>

      {/* Where you are */}
      <LevelCard known={v.known} said={language.level} />

      {/* Time & habit */}
      <Panel title={translateUi('Time and habit')} icon={Clock}>
        <Heatmap values={heat} format={(m) => `${hours(m)} studied`} />
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div>
            <p className="mb-3 text-[13px] font-semibold text-ink-soft"><UiText source={'Last 30 days, minutes a day'} /></p>
            <BarChart bars={last30} colors={ACTIVITIES.map((a) => ACTIVITY_COLOR[a])} names={ACTIVITIES.map((a) => translateUi(ACTIVITY_LABEL[a]))} labelEvery={5} format={(n) => compact(n)} />
            <div className="mt-3">
              <Legend items={ACTIVITIES.filter((a) => h.totals[a] >= 1).map((a) => ({ label: `${translateUi(ACTIVITY_LABEL[a])} · ${hours(h.totals[a])}`, color: ACTIVITY_COLOR[a] }))} />
            </div>
          </div>
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-[13px] font-semibold text-ink-soft"><UiText source={'When you study'} /></p>
              <ul className="space-y-1.5">
                {dayparts.map((d) => (
                  <li key={d.label} className="grid grid-cols-[76px_1fr_auto] items-center gap-2 text-[12.5px]">
                    <span className="font-semibold text-ink-soft"><UiText source={d.label} /></span>
                    <span className="h-2 overflow-hidden rounded-full bg-sunken">
                      <span className="block h-full origin-left rounded-full bg-sage" style={{ transform: `scaleX(${d.minutes / daypartMax})` }} />
                    </span>
                    <span className="w-12 text-right text-ink-faint tabular-nums">{hours(d.minutes)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-[13px] font-semibold text-ink-soft"><UiText source={'This week’s goal'} /></p>
              <div className="flex gap-1.5">
                {h.weekMet.map((met, i) => (
                  <span key={i} className={cx('grid size-8 place-items-center rounded-full text-[11px] font-bold', met ? 'bg-sage text-bg' : 'bg-sunken text-ink-faint')}>
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Vocabulary */}
        <Panel title={translateUi('Vocabulary')} icon={Sprout}>
          <dl className="mb-5 grid grid-cols-3 gap-3">
            <Stat value={v.known.toLocaleString()} label={translateUi('Known')} />
            <Stat value={v.learning.toLocaleString()} label={translateUi('Learning')} />
            <Stat value={v.families.toLocaleString()} label={translateUi('Word families')} />
          </dl>
          <LineChart
            series={[
              { name: 'Known', color: 'var(--sage)', points: v.knownSeries },
              { name: 'Learning', color: 'var(--accent)', points: v.learningSeries },
            ]}
            formatX={shortDate}
            formatY={(n) => compact(n)}
          />
          {v.coverage && (
            <div className="mt-6">
              <p className="mb-3 text-[13px] font-semibold text-ink-soft"><UiText source={'Of the most common words, you know'} /></p>
              <div className="flex justify-between gap-2">
                {v.coverage.map((c) => (
                  <div key={c.top} className="flex flex-col items-center gap-1.5">
                    <Ring value={c.share} size={58} stroke={5} label={translateUi('{0} of the top {1}', [pct(c.share), c.top])}>
                      <span className="text-[13px] font-bold tabular-nums">{pct(c.share)}</span>
                    </Ring>
                    <span className="text-[11.5px] font-semibold text-ink-faint"><UiText source={'top {0}'} values={[compact(c.top)]} /></span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-6">
            <p className="mb-3 text-[13px] font-semibold text-ink-soft"><UiText source={'New words a week'} /></p>
            <BarChart bars={v.newPerWeek.map((x) => ({ label: shortDate(new Date(`${x.week}T12:00:00`).getTime()), values: [x.words], current: x.current }))} colors={['var(--sage)']} names={[translateUi('New words')]} height={110} labelEvery={3} />
          </div>
        </Panel>

        {/* Reading */}
        <Panel title={translateUi('Reading')} icon={BookOpen}>
          <dl className="mb-5 grid grid-cols-3 gap-3">
            <Stat value={hours(r.minutes)} label={translateUi('Read')} />
            <Stat value={compact(r.words)} label={translateUi('Words')} />
            <Stat value={r.wpm ?? '—'} label={translateUi('Words / min')} />
          </dl>
          <p className="mb-5 text-[14px] text-ink-soft">
            {lookups === null ? translateUi('Look-ups per 1,000 words show once you have read a little more.') : <><UiText source={'{0} look-ups per 1,000 words read{1}'} values={[<span className="font-semibold text-ink tabular-nums">{lookups}</span>, lookups <= 20 ? ': you are reading mostly without help.' : '.']} /></>}
          </p>
          <LineChart series={[{ name: 'Words a minute', color: 'var(--sage)', points: r.wpmSeries }]} formatX={(x) => `Week of ${shortDate(x)}`} height={130} empty={translateUi('Read a few sessions to see your speed')} />
          <p className="mt-5 text-[14px] text-ink-soft"><UiText source={'{0} {1} finished{2}.'} values={[<span className="font-semibold text-ink">{r.finished}</span>, r.finished === 1 ? translateUi('book') : translateUi('books'), r.finishedThisYear ? `, ${r.finishedThisYear} this year` : '']} /></p>
          {r.books.length > 0 && (
            <ul className="mt-4 space-y-2.5">
              {r.books.map((b) => (
                <li key={b.id}>
                  <Link to={`/codex/read/${b.id}`} className="group grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1">
                    <span lang={b.lang} className="truncate text-[14px] font-semibold group-hover:underline">
                      {b.title}
                    </span>
                    <span className="text-[12.5px] text-ink-faint tabular-nums"><UiText source={'{0} known'} values={[pct(b.known)]} /></span>
                    <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-sunken">
                      <span className="block h-full origin-left rounded-full bg-sage" style={{ transform: `scaleX(${b.known})` }} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Flashcards */}
        <Panel title={translateUi('Flashcards')} icon={Layers}>
          <dl className="mb-5 grid grid-cols-3 gap-3">
            <Stat value={f.retention30 === null ? '—' : pct(f.retention30)} label={translateUi('Recall 30 d')} />
            <Stat value={f.retention90 === null ? '—' : pct(f.retention90)} label={translateUi('Recall 90 d')} />
            <Stat value={f.secondsPerCard === null ? '—' : `${f.secondsPerCard} s`} label={translateUi('Per card')} />
          </dl>
          <p className="mb-3 text-[13px] font-semibold text-ink-soft"><UiText source={'Reviews, last 30 days'} /></p>
          <BarChart bars={f.reviewsPerDay.map((d, i) => ({ label: new Date(`${d.date}T12:00:00`).getDate().toString(), values: [d.reviews], current: i === f.reviewsPerDay.length - 1 }))} colors={['var(--accent)']} names={[translateUi('Reviews')]} height={110} labelEvery={5} />
          <p className="mt-6 mb-3 text-[13px] font-semibold text-ink-soft"><UiText source={'Coming up (14 days)'} /></p>
          <BarChart bars={f.forecast.map((d, i) => ({ label: i === 0 ? 'Today' : weekday(d.date), values: [d.due], current: i === 0 }))} colors={['color-mix(in oklab, var(--accent) 55%, var(--sunken))']} names={[translateUi('Due')]} height={100} labelEvery={1} />
          <p className="mt-6 mb-2 text-[13px] font-semibold text-ink-soft"><UiText source={'Your cards'} /></p>
          <div className="flex h-3 overflow-hidden rounded-full bg-sunken">
            {(
              [
                ['new', 'var(--line-strong)'],
                ['learning', 'var(--accent)'],
                ['young', 'color-mix(in oklab, var(--sage) 55%, var(--sunken))'],
                ['mature', 'var(--sage)'],
              ] as const
            ).map(([k, color]) => (
              <span key={k} style={{ width: `${(f.maturity[k] / maturityTotal) * 100}%`, background: color }} />
            ))}
          </div>
          <div className="mt-2">
            <Legend
              items={[
                { label: translateUi('New {0}', [f.maturity.new]), color: 'var(--line-strong)' },
                { label: translateUi('Learning {0}', [f.maturity.learning]), color: 'var(--accent)' },
                { label: translateUi('Young {0}', [f.maturity.young]), color: 'color-mix(in oklab, var(--sage) 55%, var(--sunken))' },
                { label: translateUi('Mature {0}', [f.maturity.mature]), color: 'var(--sage)' },
              ]}
            />
          </div>
          {f.ludus.length > 0 && (
            <>
              <p className="mt-6 mb-2 text-[13px] font-semibold text-ink-soft"><UiText source={'Ludus, right the first time'} /></p>
              <ul className="space-y-1.5">
                {f.ludus.map((m) => (
                  <li key={m.mode} className="grid grid-cols-[110px_1fr_auto] items-center gap-2 text-[12.5px]">
                    <span className="font-semibold text-ink-soft">{MODE_LABEL[m.mode] ?? m.mode}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-sunken">
                      <span className="block h-full origin-left rounded-full" style={{ transform: `scaleX(${m.accuracy})`, background: gradeColor(m.accuracy * 100) }} />
                    </span>
                    <span className="w-10 text-right text-ink-faint tabular-nums">{pct(m.accuracy)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>

        <div className="space-y-5">
          {/* Listening */}
          <Panel title={translateUi('Listening, music and watching')} icon={Headphones}>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Stat value={hours(l.minutes)} label={translateUi('Listened')} />
              <Stat value={l.finished} label={translateUi('Finished')} />
              <Stat value={l.withTranscript} label={translateUi('Read along')} />
              <Stat value={l.songs} label={l.songs === 1 ? translateUi('Song sung') : translateUi('Songs sung')} />
              <Stat value={hours(l.songMinutes)} label={translateUi('With music')} />
              <Stat value={l.mined} label={translateUi('Words saved')} />
            </dl>
            {l.byKind.length > 0 && (
              <div className="mt-5">
                <p className="mb-3 text-[13px] font-semibold text-ink-soft"><UiText source={'By kind'} /></p>
                <ul className="space-y-2">
                  {l.byKind.map((k) => (
                    <li key={k.kind} className="flex items-center gap-3 text-[14px]">
                      <span className="w-28 shrink-0 text-ink-soft">{LISTENING_KIND_LABEL[k.kind]}</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-sunken">
                        <span className="block h-full rounded-full bg-sage" style={{ width: `${(k.minutes / Math.max(...l.byKind.map((x) => x.minutes))) * 100}%` }} />
                      </span>
                      <span className="w-14 text-right text-ink-faint tabular-nums">{hours(k.minutes)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>

          {data.typing && (
            <Panel
              title={translateUi('Typing')}
              icon={Keyboard}
              action={
                <Link to="/cursus/typing" className="hit inline-flex items-center gap-1 text-[13px] font-semibold text-ink-soft hover:text-ink"><UiText source={'Practise {0}'} values={[<ArrowRight size={14} aria-hidden />]} /></Link>
              }
            >
              <dl className="grid grid-cols-3 gap-3">
                <Stat value={data.typing.averageWpm ?? '—'} label={translateUi('Words / min')} hint={translateUi('Average over the letters practised')} />
                <Stat value={data.typing.accuracy === null ? '—' : pct(data.typing.accuracy)} label={translateUi('Accuracy')} />
                <Stat value={data.typing.unlocked} label={translateUi('Letters')} />
              </dl>
              <p className="mt-4 text-[13.5px] text-ink-soft"><UiText source={'Your slowest letter types at {0} words a minute; the course asks for {1}.'} values={[data.typing.wpm, data.typing.target]} /></p>
            </Panel>
          )}

          {/* Writing */}
          <Panel
            title={translateUi('Writing')}
            icon={Feather}
            action={
              <Link to="/mentis/diarium" className="hit inline-flex items-center gap-1 text-[13px] font-semibold text-ink-soft hover:text-ink"><UiText source={'Diarium {0}'} values={[<ArrowRight size={14} aria-hidden />]} /></Link>
            }
          >
            <dl className="mb-5 grid grid-cols-3 gap-3">
              <Stat value={w.entries} label={translateUi('Entries')} />
              <Stat value={compact(w.words)} label={translateUi('Words')} />
              <Stat value={w.grades.length ? w.grades.at(-1)!.y : '—'} label={translateUi('Last grade')} />
            </dl>
            <LineChart series={[{ name: 'Grade', color: 'var(--sage)', points: w.grades }]} formatX={shortDate} yMax={100} height={120} empty={translateUi('Check two entries to see your grade trend')} />
            {w.errors.length > 0 && (
              <>
                <p className="mt-5 mb-2 text-[13px] font-semibold text-ink-soft"><UiText source={'What to work on'} /></p>
                <ul className="flex flex-wrap gap-1.5">
                  {w.errors.map((e) => (
                    <li key={e.category} className="rounded-full bg-accent-soft px-3 py-1 text-[12.5px] font-semibold text-accent-text">
                      {e.category} · {e.count}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Panel>
        </div>
      </div>

      <GrammarPanel lang={lang} />
      <WeakSpotsPanel lang={lang} />
      <SkillBalancePanel lang={lang} />
      <ErrorLogPanel lang={lang} />

      <MilestoneStamps
        knownWords={v.known}
        finishedBooks={r.finished}
        conversations={conversationsCount}
        journalEntries={w.entries}
        songsSung={l.songs}
        streakDays={h.current}
        totalHours={totalMinutes / 60}
      />

      <RealLifeGoalsPanel lang={lang} />

      <AdvancedAnalyticsPanel
        evidence={evidence}
        targetLevel={language.level as CefrLevel}
        knownWords={v.known}
        listeningHours={l.minutes / 60}
        readingWords={r.words}
        studyMinutesBySkill={{
          reading: r.minutes,
          listening: l.minutes,
          writing: h.totals.write,
          vocabulary: h.totals.review,
        }}
      />
    </div>
  );
}
