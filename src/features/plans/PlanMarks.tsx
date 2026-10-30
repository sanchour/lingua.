import { UiText, useUi } from '@/design/i18n/UiText';
import { cx } from '@/lib/cx';
import type { PlanKind } from '@/data/plan';

/** Lingua+ Max's mark: MAX in spaced capitals, in the accent's foil, inside a hairline. Quiet, no fill. */
export function MaxMark({ className }: { className?: string }) {
  return (
    <span className={cx('inline-flex items-center rounded-full border border-accent-text/35 px-[0.75em] py-[0.35em] text-[10px] leading-none font-semibold', className)}>
      <span className="plan-max-word tracking-[0.32em]"><UiText source={'MAX'} /></span>
    </span>
  );
}

/** Beside the Lingua name: "+" for Lingua+; for Max the same "+", then a hairline and MAX (quiet, no fill); nothing for free. */
export function PlanBadge({ plan, size = 17 }: { plan: PlanKind; size?: number }) {
  const translateUi = useUi();
  if (plan === 'free') return null;
  const plus = (
    <sup className="ml-0.5 font-medium text-accent-text" style={{ fontSize: size }} aria-label={translateUi('Plus')}>
      +
    </sup>
  );
  if (plan === 'plus') return plus;
  return (
    <>
      {plus}
      <span className="plan-max-in ml-1 inline-flex items-center gap-1.5 align-[0.2em]" title={translateUi('Lingua+ Max')}>
        <span className="h-3 w-px bg-line-strong" aria-hidden />
        <span className="plan-max-word font-sans text-[9.5px] leading-none font-semibold tracking-[0.32em]"><UiText source={'MAX'} /></span>
      </span>
    </>
  );
}
