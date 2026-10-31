import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useLayout } from '@/design/hooks/useLayout';
import { useInRoom } from './room';
import { useUI } from '@/state/ui';

interface PageHeaderProps {
  title: string;
  englishTitle?: string;
  /** Small caps line above the title. */
  eyebrow?: string;
  englishEyebrow?: string;
  actions?: ReactNode;
}

/**
 * Large page title. On phones it hands off to the compact header title once scrolled away,
 * like native iOS large titles. Inside a room's tab only the actions show (the room has the title).
 */
export function PageHeader(props: PageHeaderProps) {
  const inRoom = useInRoom();
  if (inRoom) return props.actions ? <div className="-mt-2 mb-6 flex items-center justify-end gap-2">{props.actions}</div> : null;
  return <LargeTitle {...props} />;
}

function LargeTitle({ title, englishTitle, eyebrow, englishEyebrow, actions }: PageHeaderProps) {
  const { layout } = useLayout();
  const setPageTitle = useUI((s) => s.setPageTitle);
  const setHidden = useUI((s) => s.setPageTitleHidden);
  const topBarHeight = useUI((s) => s.topBarHeight);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => setPageTitle(title), [title, setPageTitle]);

  useEffect(() => {
    const el = titleRef.current;
    if (layout === 'wide' || !el) return;
    const io = new IntersectionObserver(([entry]) => setHidden(!entry.isIntersecting), {
      rootMargin: `-${topBarHeight}px 0px 0px 0px`,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [layout, topBarHeight, setHidden]);

  const wide = layout === 'wide';
  return (
    <header className={wide ? 'mb-5 flex items-end gap-4' : 'mt-1 mb-6 flex items-end gap-3'}>
      <div className="min-w-0 flex-1">
        {eyebrow && <p title={englishEyebrow} className="mb-1 text-[12px] font-bold tracking-[0.14em] text-sage-text uppercase">{eyebrow}</p>}
        <h1
          ref={titleRef}
          title={englishTitle}
          className={
            wide
              ? 'font-display text-[42px] leading-[1.1] font-semibold tracking-tight motion-safe:animate-[title-rise_220ms_ease-out_both] transition-opacity duration-200 ease-out hover:opacity-80 focus-visible:opacity-80'
              : 'font-display text-[32px] leading-[1.15] font-semibold tracking-tight'
          }
        >
          {title}
        </h1>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
