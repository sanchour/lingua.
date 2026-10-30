import { UiText, useUi } from '@/design/i18n/UiText';
import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import Dexie from 'dexie';
import { dayEnd, maturityOf } from '@/core/srs/scheduler';
import type { Maturity } from '@/core/srs/scheduler';
import { db } from '@/data/db';
import type { DeckCounts } from '@/data/decks';
import type { Card } from '@/data/types';
import { Card as Panel } from '@/design/primitives';
import { REVIEW, STAGES } from '../library/states';

const DAY = 86_400_000;
const LABELS: Record<Maturity, string> = { new: 'New', learning: 'Learning', young: 'Young', mature: 'Known well' };
/** The same colours as the deck's cards and Thesaurus's pills (5.1-3b). */
const COLORS: Record<Maturity, string> = { new: STAGES.new.color, learning: STAGES.learning.color, young: STAGES.young.color, mature: STAGES.mature.color };

/** Today's counts, how settled the deck is (maturity), true retention and the week ahead. */
export function DeckStats({ deckId, cards, counts }: { deckId: string; cards: Card[]; counts: DeckCounts | undefined }) {
  const translateUi = useUi();
  const now = Date.now();
  const maturity = useMemo(() => {
    const m: Record<Maturity, number> = { new: 0, learning: 0, young: 0, mature: 0 };
    for (const c of cards) if (!c.suspended) m[maturityOf(c)]++;
    return m;
  }, [cards]);

  // True retention: share of reviews of known cards (not new, not learning) answered without "Again".
  const retention = useLiveQuery(async () => {
    const logs = await db.reviewLogs
      .where('[deckId+reviewedAt]')
      .between([deckId, now - 30 * DAY], [deckId, Dexie.maxKey])
      .filter((l) => l.affectedSchedule === 1 && l.stateBefore === 2)
      .toArray();
    return logs.length ? { share: logs.filter((l) => l.rating > 1).length / logs.length, n: logs.length } : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId, cards.length]);

  const forecast = useMemo(() => {
    const end = dayEnd(now);
    const days = Array.from({ length: 7 }, () => 0);
    for (const c of cards) {
      if (c.suspended || c.state === 0) continue;
      const i = c.due < end ? 0 : Math.ceil((c.due - end) / DAY);
      if (i < 7) days[i]++;
    }
    return days;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards]);

  const active = cards.filter((c) => !c.suspended).length;
  const peak = Math.max(1, ...forecast);
  const weekday = (i: number) => (i === 0 ? 'Today' : new Date(now + i * DAY).toLocaleDateString('en', { weekday: 'short' }));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Panel>
        <dl className="grid grid-cols-4 gap-2">
          {[
            ['Due', (counts?.due ?? 0) + (counts?.learning ?? 0), 'text-[color-mix(in_oklab,#6a90b4_62%,var(--ink))]'],
            ['New today', counts?.new ?? 0, 'text-sage-text'],
            ['Cards', counts?.total ?? cards.length, ''],
            ['Retention', retention ? `${Math.round(retention.share * 100)}%` : '–', ''],
          ].map(([label, value, tone]) => (
            <div key={label as string}>
              <dt className="text-[12px] font-bold tracking-wide text-ink-faint uppercase">{label}</dt>
              <dd className={`font-serif text-2xl font-semibold tabular-nums ${tone}`}>{typeof value === 'number' ? value.toLocaleString() : value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-5">
          <div className="flex h-2.5 overflow-hidden rounded-full bg-sunken" role="img" aria-label={(Object.keys(LABELS) as Maturity[]).map((k) => `${maturity[k]} ${LABELS[k].toLowerCase()}`).join(', ')}>
            {active > 0 &&
              (Object.keys(LABELS) as Maturity[]).map((k) => (
                <span key={k} style={{ width: `${(maturity[k] / active) * 100}%`, background: COLORS[k] }} />
              ))}
          </div>
          <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-soft">
            {(Object.keys(LABELS) as Maturity[]).map((k) => (
              <li key={k} className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: COLORS[k] }} aria-hidden />
                {LABELS[k]} <span className="font-semibold text-ink tabular-nums">{maturity[k].toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </Panel>

      <Panel>
        <p className="text-[12px] font-bold tracking-wide text-ink-faint uppercase"><UiText source={'The week ahead'} /></p>
        <div className="mt-3 flex h-24 items-end gap-2">
          {forecast.map((n, i) => (
            <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5" title={translateUi('{0}: {1} reviews', [weekday(i), n])}>
              <span className="text-[11px] font-semibold text-ink-faint tabular-nums">{n || ''}</span>
              <span
                className="w-full rounded-md"
                style={{ height: `${Math.max(n ? 6 : 2, (n / peak) * 60)}px`, opacity: n ? (i === 0 ? 1 : 0.7) : 0.3, background: REVIEW }}
              />
              <span className="text-[11px] font-semibold text-ink-soft">{weekday(i)}</span>
            </div>
          ))}
        </div>
        {retention && <p className="mt-3 text-[12.5px] text-ink-soft"><UiText source={'Retention counts {0} reviews of known cards in the last 30 days.'} values={[retention.n]} /></p>}
      </Panel>
    </div>
  );
}
