import { cloneElement, useEffect, useId, useRef, useState } from 'react';
import type { ReactElement, ReactNode, Ref, SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react-dom';
import type { Placement } from '@floating-ui/react-dom';
import { useLayout } from '@/design/hooks/useLayout';
import { Kbd } from './Kbd';

interface TooltipProps {
  label: ReactNode;
  shortcut?: string;
  placement?: Placement;
  disabled?: boolean;
  children: ReactElement<Record<string, unknown>>;
}

type Handler = (event: SyntheticEvent) => void;

function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as { current: T | null }).current = node;
    }
  };
}

/** Hover / keyboard-focus label for mouse devices. Touch devices never see tooltips. */
export function Tooltip({ label, shortcut, placement = 'top', disabled = false, children }: TooltipProps) {
  const { pointer } = useLayout();
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const id = useId();
  const { refs, floatingStyles } = useFloating({
    open,
    placement,
    transform: false,
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (pointer !== 'fine' || disabled) return children;

  const show = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(true), 380);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    setOpen(false);
  };
  const props = children.props as Record<string, Handler | Ref<Element> | undefined>;
  const chain = (name: string, fn: () => void) => (event: SyntheticEvent) => {
    (props[name] as Handler | undefined)?.(event);
    fn();
  };

  return (
    <>
      {cloneElement(children, {
        ref: mergeRefs(props.ref as Ref<Element> | undefined, refs.setReference),
        onPointerEnter: chain('onPointerEnter', show),
        onPointerLeave: chain('onPointerLeave', hide),
        onFocus: chain('onFocus', show),
        onBlur: chain('onBlur', hide),
        onPointerDown: chain('onPointerDown', hide),
        'aria-describedby': open ? id : undefined,
      })}
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={refs.setFloating}
              style={floatingStyles}
              id={id}
              role="tooltip"
              className="pointer-events-none z-[90] flex items-center gap-2 rounded-lg bg-inverse px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-on-inverse shadow-elev-2"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.08 } }}
              transition={{ duration: 0.12 }}
            >
              {label}
              {shortcut && <Kbd tone="inverse">{shortcut}</Kbd>}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
