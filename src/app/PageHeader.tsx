import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useLayout } from '@/design/hooks/useLayout';
import { useUI } from '@/state/ui';

interface PageHeaderProps {
  title: string;
  /** Small caps line above the title. */
  eyebrow?: string;
  actions?: ReactNode;
}

/**
 * Large page title. On phones it hands off to the compact header title once scrolled away,
 * like native iOS large titles.
 */
export function PageHeader({ title, eyebrow, actions }: PageHeaderProps) {
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
    <header className={wide ? 'mb-9 flex items-end gap-4' : 'mt-1 mb-6 flex items-end gap-3'}>
      <div className="min-w-0 flex-1">
        {eyebrow && <p className="mb-1.5 text-[12px] font-bold tracking-[0.14em] text-sage-text uppercase">{eyebrow}</p>}
        <h1
          ref={titleRef}
          className={
            wide
              ? 'font-serif text-[42px] leading-[1.1] font-semibold tracking-tight'
              : 'font-serif text-[32px] leading-[1.15] font-semibold tracking-tight'
          }
        >
          {title}
        </h1>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
