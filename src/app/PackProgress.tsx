import { UiText } from '@/design/i18n/UiText';
import { AnimatePresence, motion } from 'motion/react';
import { BookDown } from 'lucide-react';
import { getLanguage } from '@/core/lang/languages';
import { useLayout } from '@/design/hooks/useLayout';
import { spring } from '@/design/motion';
import { usePackJobs } from '@/services/packs/packs';

const PHASE: Record<string, string> = { download: 'Downloading', unpack: 'Unpacking', store: 'Shelving' };

/** A quiet pill while a dictionary installs in the background. */
export function PackProgress() {
  const jobs = Object.values(usePackJobs((s) => s.jobs));
  const { layout } = useLayout();
  const job = jobs[0];
  // Download, unpack and store share one bar: 0–45 %, 45–50 %, 50–100 %.
  const overall = job ? (job.phase === 'download' ? job.pct * 0.45 : job.phase === 'unpack' ? 0.47 : 0.5 + job.pct * 0.5) : 0;

  return (
    <div
      className="pointer-events-none fixed z-[75] flex justify-center"
      style={layout === 'wide' ? { right: 24, bottom: 24 } : { left: 0, right: 0, bottom: 'calc(env(safe-area-inset-bottom) + 96px)' }}
    >
      <AnimatePresence>
        {job && (
          <motion.div
            key="pack"
            role="status"
            className="pointer-events-auto w-72 rounded-2xl border border-line bg-raised px-4 py-3 shadow-elev-2"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
            transition={spring.snappy}
          >
            <div className="flex items-center gap-2.5 text-sm">
              <BookDown size={17} className="shrink-0 text-sage-text" aria-hidden />
              <span className="min-w-0 flex-1 truncate font-semibold"><UiText source={'{0} dictionary'} values={[getLanguage(job.lang)?.endonym ?? job.lang]} /></span>
              <span className="text-xs text-ink-faint tabular-nums">{Math.round(overall * 100)}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sunken">
              <div className="h-full origin-left rounded-full bg-sage transition-transform duration-200" style={{ transform: `scaleX(${Math.max(0.02, overall)})` }} />
            </div>
            <p className="mt-1.5 text-[12px] text-ink-faint"><UiText source={'{0} · works offline once done'} values={[<UiText source={PHASE[job.phase]} />]} /></p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
