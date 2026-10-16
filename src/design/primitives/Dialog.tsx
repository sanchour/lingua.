import { useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { fade, spring } from '@/design/motion';
import { trapTab, useOverlay } from './overlay';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}

/** Centered modal for short decisions (confirmations, choices). */
export function Dialog(props: DialogProps) {
  return createPortal(<AnimatePresence>{props.open && <DialogPanel {...props} />}</AnimatePresence>, document.body);
}

function DialogPanel({ onClose, title, children, actions }: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useOverlay(ref, onClose);
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4">
      <motion.div
        className="absolute inset-0 bg-scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={fade}
        onClick={onClose}
        aria-hidden
      />
      <motion.div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={trapTab}
        className="relative w-full max-w-md rounded-3xl border border-line bg-raised p-6 shadow-elev-3 outline-none"
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
        transition={spring.snappy}
      >
        <h2 id={titleId} className="font-serif text-xl font-semibold">
          {title}
        </h2>
        {children && <div className="mt-2 text-sm leading-relaxed text-ink-soft">{children}</div>}
        {actions && <div className="mt-6 flex flex-wrap justify-end gap-2">{actions}</div>}
      </motion.div>
    </div>
  );
}
