import { useUi } from '@/design/i18n/UiText';
import { useNavigate } from 'react-router';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, List, Type } from 'lucide-react';
import type { Settings, Theme } from '@/data/settings';
import type { Text } from '@/data/types';
import { useLayout } from '@/design/hooks/useLayout';
import { Drawer, IconButton, Popover } from '@/design/primitives';
import { TypographyPanel } from './TypographyPanel';

interface ReaderChromeProps {
  tools?: ReactNode;
  visible: boolean;
  text: Text;
  chapterTitle?: string;
  reader: Settings['reader'];
  theme: Theme;
  typographyOpen: boolean;
  setTypographyOpen: (open: boolean) => void;
  onContents: () => void;
  onHoverChange: (hovering: boolean) => void;
}

/** The reader's top bar: hidden until needed, fades in over the page margin. */
export function ReaderChrome({ tools, visible, text, chapterTitle, reader, theme, typographyOpen, setTypographyOpen, onContents, onHoverChange }: ReaderChromeProps) {
  const translateUi = useUi();
  const navigate = useNavigate();
  const { layout } = useLayout();

  return (
    <>
      <AnimatePresence>
        {(visible || typographyOpen) && (
          <motion.header
            className="no-callout fixed inset-x-0 top-0 z-30 pt-safe"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
            onFocusCapture={() => onHoverChange(true)}
            onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onHoverChange(false); }}
            onPointerEnter={() => onHoverChange(true)}
            onPointerLeave={() => onHoverChange(false)}
          >
            <div className="absolute inset-0 bg-bg/90 backdrop-blur-md" aria-hidden />
            <div
              className="relative flex h-14 items-center gap-1"
              style={{ paddingLeft: 'max(10px, env(safe-area-inset-left))', paddingRight: 'max(10px, env(safe-area-inset-right))' }}
            >
              <IconButton icon={ChevronLeft} label={translateUi('Library')} onClick={() => navigate('/codex')} tooltipPlacement="bottom" />
              <div className="min-w-0 flex-1 px-2 text-center">
                <p lang={text.lang} className="truncate font-serif text-[15px] font-semibold">
                  {text.title}
                </p>
                {chapterTitle && (
                  <p lang={text.lang} className="truncate text-[12px] text-ink-faint">
                    {chapterTitle}
                  </p>
                )}
              </div>
              {tools}
              <IconButton icon={List} label={translateUi('Contents')} onClick={onContents} tooltipPlacement="bottom" />
              {layout === 'wide' ? (
                <Popover
                  label={translateUi('Typography')}
                  placement="bottom-end"
                  onOpenChange={setTypographyOpen}
                  trigger={(props) => (
                    <button
                      {...props}
                      type="button"
                      aria-label={translateUi('Typography')}
                      className="grid size-10 place-items-center rounded-xl text-ink-soft transition-colors hover:bg-surface hover:text-ink"
                    >
                      <Type size={19} aria-hidden />
                    </button>
                  )}
                >
                  <TypographyPanel reader={reader} theme={theme} lang={text.lang} />
                </Popover>
              ) : (
                <IconButton icon={Type} label={translateUi('Typography')} onClick={() => setTypographyOpen(true)} showTooltip={false} />
              )}
            </div>
          </motion.header>
        )}
      </AnimatePresence>
      {layout !== 'wide' && (
        <Drawer open={typographyOpen} onClose={() => setTypographyOpen(false)} title={translateUi('Reading')}>
          <div className="flex justify-center">
            <TypographyPanel reader={reader} theme={theme} lang={text.lang} />
          </div>
        </Drawer>
      )}
    </>
  );
}
