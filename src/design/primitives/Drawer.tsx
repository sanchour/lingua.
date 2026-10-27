import { useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls } from 'motion/react';
import type { PanInfo } from 'motion/react';
import { X } from 'lucide-react';
import { useLayout } from '@/design/hooks/useLayout';
import { fade, spring } from '@/design/motion';
import { IconButton } from './IconButton';
import { trapTab, useOverlay } from './overlay';
import { usePortalRoot } from '@/design/hooks/usePortalRoot';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Secondary content: a slide-over panel on wide screens, a draggable bottom sheet on phones.
 */
export function Drawer(props: DrawerProps) {
  const portalRoot = usePortalRoot();
  const { layout } = useLayout();
  return createPortal(
    <AnimatePresence>
      {props.open && (layout === 'wide' ? <SlideOver key="slide" {...props} /> : <BottomSheet key="sheet" {...props} />)}
    </AnimatePresence>,
    portalRoot,
  );
}

function Scrim({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      className="absolute inset-0 bg-scrim"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={fade}
      onClick={onClose}
      aria-hidden
    />
  );
}

function Header({ id, title, description, onClose }: { id: string; title: string; description?: string; onClose: () => void }) {
  return (
    <header className="flex items-start gap-3 px-6 pt-4 pb-3">
      <div className="min-w-0 flex-1">
        <h2 id={id} className="font-serif text-xl font-semibold">
          {title}
        </h2>
        {description && (
          <p data-hint="" className="mt-0.5 text-sm text-ink-soft">
            {description}
          </p>
        )}
      </div>
      <IconButton icon={X} label="Close" size="sm" variant="soft" onClick={onClose} showTooltip={false} className="-mr-1" />
    </header>
  );
}

function SlideOver({ onClose, title, description, children, footer }: DrawerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useOverlay(ref, onClose);
  return (
    <div className="fixed inset-0 z-50">
      <Scrim onClose={onClose} />
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={trapTab}
        className="absolute top-3 right-3 bottom-3 flex w-[min(440px,calc(100vw-24px))] flex-col rounded-3xl border border-line bg-raised shadow-elev-3 outline-none"
        initial={{ x: '108%' }}
        animate={{ x: 0 }}
        exit={{ x: '108%' }}
        transition={spring.sheet}
      >
        <div className="pt-2" />
        <Header id={titleId} title={title} description={description} onClose={onClose} />
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-6">{children}</div>
        {footer && <footer className="border-t border-line px-6 py-4">{footer}</footer>}
      </motion.div>
    </div>
  );
}

function BottomSheet({ onClose, title, description, children, footer }: DrawerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const drag = useDragControls();
  useOverlay(ref, onClose);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 600) onClose();
  };

  return (
    <div className="fixed inset-0 z-50">
      <Scrim onClose={onClose} />
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={trapTab}
        className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-[28px] border-t border-line bg-raised pb-safe shadow-elev-3 outline-none"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={spring.sheet}
        drag="y"
        dragControls={drag}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.7 }}
        onDragEnd={onDragEnd}
      >
        {/* Drag handle + header start the drag; the content area scrolls normally. */}
        <div className="no-callout cursor-grab touch-none" onPointerDown={(e) => drag.start(e)}>
          <div className="mx-auto mt-2.5 mb-1 h-1.5 w-10 rounded-full bg-line-strong" />
          <Header id={titleId} title={title} description={description} onClose={onClose} />
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-6">{children}</div>
        {footer && <footer className="border-t border-line px-6 pt-4 pb-2">{footer}</footer>}
      </motion.div>
    </div>
  );
}
