import { useUi } from '@/design/i18n/UiText';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { motion } from 'motion/react';
import { IconButton } from '@/design/primitives';
import { spring } from '@/design/motion';

/** The study screen's quiet top bar: close, a progress hairline, and room for counts or actions. */
export function StudyBar({ title, progress, onClose, children, wide }: { title: string; progress: number; onClose: () => void; children?: ReactNode; wide?: boolean }) {
  const translateUi = useUi();
  return (
    <header className="fixed inset-x-0 top-0 z-20 bg-bg/85 backdrop-blur-md" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className={`mx-auto flex h-14 items-center gap-3 px-3 sm:px-6 ${wide ? 'max-w-6xl' : 'max-w-3xl'}`}>
        <IconButton icon={X} label={translateUi('Close')} shortcut="Esc" onClick={onClose} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-center text-[13px] font-semibold text-ink-soft">{title}</p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sunken">
            <motion.div className="h-full origin-left rounded-full bg-sage" initial={false} animate={{ scaleX: Math.max(0.02, Math.min(1, progress)) }} transition={spring.soft} />
          </div>
        </div>
        <div className="flex min-w-10 items-center justify-end gap-1">{children}</div>
      </div>
    </header>
  );
}
