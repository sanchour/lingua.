import { useUi } from '@/design/i18n/UiText';
// The next five weeks of reviews, one square a day (6-3b): darker where more fall due, today ringed.
import { useDueCalendar } from '@/data/memoryViews';
import { cx } from '@/lib/cx';

export function DueCalendar({ lang }: { lang: string }) {
  const translateUi = useUi();
  const days = useDueCalendar(lang);
  if (!days) return null;
  const max = Math.max(1, ...days.map((d) => d.count));
  // Weeks start on Monday: blanks before the first day line it up under its weekday.
  const lead = (new Date(days[0].at + 12 * 3_600_000).getDay() + 6) % 7;
  return (
    <div className="mt-4" role="group" aria-label={translateUi('Reviews due in the next five weeks')}>
      <div className="grid grid-cols-7 gap-1 text-center text-[10.5px] font-semibold text-ink-faint">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <span key={`b${i}`} />
        ))}
        {days.map((d, i) => (
          <span
            key={d.day}
            title={translateUi('{0}: {1} due', [new Date(d.at + 12 * 3_600_000).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }), d.count])}
            className={cx('grid aspect-square place-items-center rounded-md text-[11px] tabular-nums', i === 0 && 'ring-2 ring-ink', d.count ? 'text-ink' : 'text-ink-faint')}
            style={{ background: d.count ? `color-mix(in oklab, var(--sage) ${Math.round(18 + (d.count / max) * 60)}%, transparent)` : 'var(--sunken)' }}
          >
            {d.count || ''}
          </span>
        ))}
      </div>
    </div>
  );
}
