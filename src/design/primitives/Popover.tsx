import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode, Ref } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react-dom';
import type { Placement } from '@floating-ui/react-dom';
import { spring } from '@/design/motion';
import { cx } from '@/lib/cx';
import { usePortalRoot } from '@/design/hooks/usePortalRoot';

export interface PopoverTriggerProps {
  ref: Ref<HTMLButtonElement>;
  onClick: () => void;
  'aria-expanded': boolean;
  'aria-haspopup': 'dialog';
  'aria-controls': string;
}

interface PopoverProps {
  trigger: (props: PopoverTriggerProps) => ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  placement?: Placement;
  className?: string;
  label: string;
  onOpenChange?: (open: boolean) => void;
}

/** Small anchored panel for tucked-away controls (metadata, quick settings). */
export function Popover({ trigger, children, placement = 'bottom-start', className, label, onOpenChange }: PopoverProps) {
  const portalRoot = usePortalRoot();
  const [open, setOpen] = useState(false);
  const onOpenChangeRef = useRef(onOpenChange);
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  });
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) onOpenChangeRef.current?.(open);
    mounted.current = true;
  }, [open]);
  const id = useId();
  const { refs, floatingStyles, elements } = useFloating({
    open,
    placement,
    transform: false,
    middleware: [offset(8), flip({ padding: 12 }), shift({ padding: 12 })],
    whileElementsMounted: autoUpdate,
  });
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      const reference = elements.reference instanceof Node ? elements.reference : null;
      if (elements.floating?.contains(target) || reference?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Handled here: page shortcuts (which skip handled keys) must not also act on it.
        e.preventDefault();
        setOpen(false);
        (elements.reference as HTMLElement | null)?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, elements]);

  return (
    <>
      {trigger({
        ref: refs.setReference,
        onClick: () => setOpen((v) => !v),
        'aria-expanded': open,
        'aria-haspopup': 'dialog',
        'aria-controls': id,
      })}
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={refs.setFloating}
              id={id}
              role="dialog"
              aria-label={label}
              style={floatingStyles}
              className={cx('z-[55] min-w-56 rounded-2xl border border-line bg-raised p-2 shadow-elev-3', className)}
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.1 } }}
              transition={spring.snappy}
            >
              {typeof children === 'function' ? children(close) : children}
            </motion.div>
          )}
        </AnimatePresence>,
        portalRoot,
      )}
    </>
  );
}
