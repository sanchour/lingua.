import { cx } from '@/lib/cx';
import type { PlanKind } from '@/data/plan';

/** Lingua+ Max's mark: MAX in spaced capitals, in the accent's foil, inside a hairline. Quiet, no fill. */
export function MaxMark({ className }: { className?: string }) {
  return (
    <span className={cx('inline-flex items-center rounded-full border border-accent-text/35 px-[0.75em] py-[0.35em] text-[10px] leading-none font-semibold', className)}>
      <span className="plan-max-word tracking-[0.32em]">MAX</span>
    </span>
  );
}

/** Beside the Lingua name: "+" for Lingua+, a hairline and MAX for Max (quiet, no fill), nothing for free. */
export function PlanBadge({ plan, size = 17 }: { plan: PlanKind; size?: number }) {
  if (plan === 'max')
    return (
      <span className="plan-max-in ml-2 inline-flex items-center gap-2 align-[0.2em]" title="Lingua+ Max">
        <span className="h-3 w-px bg-line-strong" aria-hidden />
        <span className="plan-max-word font-sans text-[9.5px] leading-none font-semibold tracking-[0.32em]">MAX</span>
      </span>
    );
  if (plan === 'plus')
    return (
      <sup className="ml-0.5 font-medium text-accent-text" style={{ fontSize: size }} aria-label="Plus">
        +
      </sup>
    );
  return null;
}
