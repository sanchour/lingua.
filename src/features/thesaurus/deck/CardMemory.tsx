// One card's memory, said plainly (6-3b): how likely it is remembered now, how long it lasts, how it fades, and two ways to change it:
// put it on another day, or forget it and start again.
import { useState } from 'react';
import { describeRetrievability } from '@/core/srs/memory';
import { formatInterval, maturityOf, retrievability } from '@/core/srs/scheduler';
import { describeStability, fadingCurve } from '@/core/srs/views';
import { forgetCard, rescheduleCard } from '@/data/memoryViews';
import type { Card } from '@/data/types';
import { Button } from '@/design/primitives';
import { toast } from '@/state/ui';

const DAY = 86_400_000;
const dateInput = (ms: number) => {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** The chance of remembering, day by day if it is not reviewed: a line that only goes down. */
function Curve({ card, now }: { card: Card; now: number }) {
  const points = fadingCurve(card, now, 60);
  if (points.length < 2) return null;
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${(p.day / 60) * 100},${(1 - p.r) * 24}`).join(' ');
  return (
    <svg viewBox="0 0 100 24" preserveAspectRatio="none" role="img" aria-label="How the chance of remembering falls over the next two months" className="mt-1 h-8 w-full overflow-visible text-sage-text">
      <line x1="0" x2="100" y1={(1 - 0.9) * 24} y2={(1 - 0.9) * 24} stroke="currentColor" strokeOpacity="0.25" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function CardMemory({ card, onChanged }: { card: Card; onChanged: () => void }) {
  const now = Date.now();
  const [day, setDay] = useState(dateInput(card.due > now ? card.due : now + DAY));
  const studied = card.state !== 0;
  const remembered = describeRetrievability(retrievability(card, now));

  const run = async (work: () => Promise<void>, done: string) => {
    try {
      await work();
      toast(done);
      onChanged();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'That did not work.', { tone: 'error' });
    }
  };

  return (
    <div className="py-2">
      <p className="text-[13px] text-ink-soft">
        <span className="font-semibold text-ink">{card.direction === 'production' ? 'Meaning → word' : 'Word → meaning'}</span> · {maturityOf(card)}
        {studied && ` · next in ${formatInterval(Math.max(0, card.due - now))}`} · {card.reps} reviews{card.lapses ? `, ${card.lapses} lapses` : ''}
        {card.leech ? ' · keeps slipping' : ''}
        {remembered && ` · remembered today: ${remembered.words} (${remembered.label.toLowerCase()})`}
        {studied && ` · lasts ${describeStability(card.stability)}`}
      </p>
      {studied && <Curve card={card} now={now} />}
      {studied && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input type="date" value={day} min={dateInput(now)} onChange={(e) => setDay(e.target.value)} aria-label="Show this card again on" className="h-8 rounded-lg border border-line bg-bg px-2 text-[13px]" />
          <Button type="button" variant="secondary" size="sm" disabled={!day} onClick={() => void run(() => rescheduleCard(card.id, new Date(`${day}T04:00:00`).getTime()), 'Put on that day')}>
            Put on that day
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => void run(() => forgetCard(card.id), 'Forgotten: it starts again as a new card')}>
            Forget it
          </Button>
        </div>
      )}
    </div>
  );
}
