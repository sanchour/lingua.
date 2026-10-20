import { useMemo } from 'react';
import { Link } from 'react-router';
import { ArrowRight, BookOpen, Check, Film, Tv } from 'lucide-react';
import type { Level } from '@/core/lang/levels';
import { tipOfTheDay, tipsFor } from '@/core/mundus/tips';
import type { Pick, PickLevel } from '@/core/mundus/types';
import { toggleChallenge, useChallenges } from '@/data/challenges';
import { Card } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { localDateKey } from '@/lib/format';
import { usePicks } from './hooks';
import { TIP_ICONS } from './TipsView';

const label = 'text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase';
const ORDER: PickLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

/**
 * Mundus on Home: on alternate days a challenge to take the language out of the app, or something
 * picked by hand to watch or read at the learner's level. Always a way into Mundus.
 */
export function MundusHomeCard({ lang, level }: { lang: string; level: Level }) {
  const picks = usePicks(lang);
  const done = useChallenges(lang);
  const today = localDateKey();
  const day = Math.floor(Date.now() / 86_400_000);
  const tips = useMemo(() => tipsFor(lang), [lang]);

  const pick = useMemo(() => {
    if (!picks) return undefined;
    const reach = Math.max(1, ORDER.indexOf(level as PickLevel) + 1);
    const pool: Array<{ pick: Pick; kind: 'series' | 'film' | 'book' }> = [
      ...picks.series.map((p) => ({ pick: p, kind: 'series' as const })),
      ...picks.films.map((p) => ({ pick: p, kind: 'film' as const })),
      ...picks.books.map((p) => ({ pick: p, kind: 'book' as const })),
    ].filter((x) => ORDER.indexOf(x.pick.level) <= reach);
    return pool.length ? pool[day % pool.length] : undefined;
  }, [picks, level, day]);

  if (done === undefined || picks === undefined) return null;
  // Today's marks don't count yet, so the challenge stays put once it's ticked.
  const doneIds = new Set(done.filter((r) => r.date !== today).map((r) => r.tipId));
  const tip = tipOfTheDay(tips, doneIds, day);
  const showTip = Boolean(tip) && (!pick || day % 2 === 0);

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className={label}>{showTip ? 'Beyond the app' : 'Picked for you'}</p>
        <Link to={showTip ? '/mundus?tab=beyond' : '/mundus'} className="hit inline-flex items-center gap-1 text-[13px] font-semibold text-accent-text hover:underline">
          Mundus <ArrowRight size={14} aria-hidden />
        </Link>
      </div>
      {showTip && tip ? (
        <TipBody lang={lang} tipId={tip.id} title={tip.title} teaser={tip.teaser} icon={tip.icon} doneToday={done.some((r) => r.tipId === tip.id && r.date === today)} />
      ) : pick ? (
        <Link to={`/mundus?kind=${pick.kind === 'book' ? 'books' : pick.kind === 'film' ? 'films' : 'series'}`} className="group -m-2 flex items-start gap-3.5 rounded-2xl p-2 transition-colors hover:bg-surface">
          <span className="grid aspect-[2/3] w-11 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-text" aria-hidden>
            {pick.kind === 'book' ? <BookOpen size={18} /> : pick.kind === 'film' ? <Film size={18} /> : <Tv size={18} />}
          </span>
          <span className="min-w-0 flex-1">
            <span lang={lang} className="block font-serif text-[17px] leading-snug font-semibold">
              {pick.pick.title}
            </span>
            <span className="mt-0.5 block text-[13px] text-ink-faint">{[pick.pick.en, pick.pick.by, pick.pick.level === 'A1' ? 'A1' : `${pick.pick.level}+`].filter(Boolean).join(' · ')}</span>
            <span className="mt-1 line-clamp-2 block text-[13.5px] leading-snug text-ink-soft">{pick.pick.why}</span>
          </span>
        </Link>
      ) : null}
    </Card>
  );
}

function TipBody({ lang, tipId, title, teaser, icon, doneToday }: { lang: string; tipId: string; title: string; teaser: string; icon: keyof typeof TIP_ICONS; doneToday: boolean }) {
  const Icon = TIP_ICONS[icon];
  return (
    <div className="flex items-start gap-3.5">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-sage-soft text-sage-text" aria-hidden>
        <Icon size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-serif text-[17px] leading-snug font-semibold">{title}</p>
        <p className="mt-0.5 text-[13.5px] leading-snug text-ink-soft">{teaser}</p>
        <button
          type="button"
          onClick={() => void toggleChallenge(lang, tipId)}
          aria-pressed={doneToday}
          className={cx(
            'no-callout mt-3 inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-[background-color,transform] duration-150 active:scale-[0.96] pointer-coarse:h-10',
            doneToday ? 'bg-sage text-on-accent' : 'bg-inverse text-on-inverse',
          )}
        >
          <Check size={14} strokeWidth={2.6} aria-hidden /> {doneToday ? 'Done today' : 'I did it'}
        </button>
      </div>
    </div>
  );
}
