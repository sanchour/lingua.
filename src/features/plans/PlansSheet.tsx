import { UiText, useUi } from '@/design/i18n/UiText';
import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { FEATURE_NAME, FEATURE_PLAN } from '@/data/plan';
import type { Feature } from '@/data/plan';
import { usePortalRoot } from '@/design/hooks/usePortalRoot';
import { fade, spring } from '@/design/motion';
import { IconButton } from '@/design/primitives';
import { trapTab, useOverlay } from '@/design/primitives/overlay';
import { useUI } from '@/state/ui';
import { PlanCards } from './PlanCards';
import { usePlan } from './usePlan';

/** The plans, over whatever is open: from a "+" chip (that plan lifted) or from Home and Settings. */
export function PlansSheet() {
  const plansFor = useUI((s) => s.plansFor);
  const close = useUI((s) => s.closePlans);
  const portalRoot = usePortalRoot();
  return createPortal(<AnimatePresence>{plansFor && <Panel feature={plansFor === 'all' ? undefined : plansFor} onClose={close} />}</AnimatePresence>, portalRoot);
}

function Panel({ feature, onClose }: { feature?: Feature; onClose: () => void }) {
  const translateUi = useUi();
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const plan = usePlan();
  useOverlay(ref, onClose);
  const title = feature ? `${FEATURE_NAME[feature]} comes with ${FEATURE_PLAN[feature] === 'max' ? 'Lingua+ Max' : 'Lingua+'}` : 'Lingua’s plans';
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto p-4 sm:p-5">
      <motion.div className="fixed inset-0 bg-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade} onClick={onClose} aria-hidden />
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={trapTab}
        className="relative w-full max-w-4xl rounded-[28px] border border-line bg-bg p-5 sm:p-6 shadow-elev-3 outline-none"
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12 } }}
        transition={spring.snappy}
      >
        <div className="mb-4 sm:mb-5 flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="font-serif text-[28px] leading-tight font-semibold">
              {title}
            </h2>
            <p className="mt-1 text-[14.5px] text-ink-soft"><UiText source={'Everything free stays free. Choose what fits, or carry on as you are.'} /></p>
          </div>
          <IconButton icon={X} label={translateUi('Close')} onClick={onClose} />
        </div>
        <PlanCards current={plan} feature={feature} onFree={onClose} onBought={onClose} />
      </motion.div>
    </div>
  );
}
