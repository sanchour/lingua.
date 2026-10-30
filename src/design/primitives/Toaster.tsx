import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { CircleCheck, TriangleAlert } from 'lucide-react';
import { useLayout } from '@/design/hooks/useLayout';
import { usePortalRoot } from '@/design/hooks/usePortalRoot';
import { spring } from '@/design/motion';
import { useUI } from '@/state/ui';
import type { ToastItem } from '@/state/ui';

export function Toaster() {
  const toasts = useUI((s) => s.toasts);
  const { layout } = useLayout();
  const portalRoot = usePortalRoot();
  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 z-[80] flex flex-col items-center gap-2 px-4"
      aria-live="polite"
      style={{ bottom: layout === 'wide' ? 24 : 'calc(env(safe-area-inset-bottom) + 100px)' }}
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>,
    portalRoot,
  );
}

function Toast({ toast }: { toast: ToastItem }) {
  const dismiss = useUI((s) => s.dismissToast);

  useEffect(() => {
    if (!toast.duration) return;
    const timer = window.setTimeout(() => dismiss(toast.id), toast.duration);
    return () => window.clearTimeout(timer);
  }, [toast.id, toast.duration, dismiss]);

  const Icon = toast.tone === 'success' ? CircleCheck : toast.tone === 'error' ? TriangleAlert : null;

  return (
    <motion.div
      layout="position"
      role={toast.tone === 'error' ? 'alert' : 'status'}
      className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl bg-inverse py-3 pr-3 pl-4 text-sm font-medium text-on-inverse shadow-elev-3"
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97, transition: { duration: 0.14 } }}
      transition={spring.snappy}
    >
      {Icon && <Icon size={18} className="shrink-0" aria-hidden />}
      <span className="min-w-0 flex-1">{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          className="rounded-lg px-2.5 py-1 font-bold underline-offset-2 hover:underline"
          onClick={() => {
            toast.action?.onClick();
            dismiss(toast.id);
          }}
        >
          {toast.action.label}
        </button>
      )}
    </motion.div>
  );
}
