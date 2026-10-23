import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import type { LucideIcon } from 'lucide-react';
import { Kbd, Segmented } from '@/design/primitives';
import { useHotkeys } from '@/design/hooks/useHotkeys';
import { useLayout } from '@/design/hooks/useLayout';
import { cx } from '@/lib/cx';

export interface RoomTab<T extends string> {
  id: T;
  label: string;
  /** A shorter label for the phone's segmented control. */
  short?: string;
  to: string;
  icon?: LucideIcon;
  /** After the label: a "+" chip on a tab the plan doesn't open. */
  badge?: ReactNode;
}

interface RoomTabsProps<T extends string> {
  label: string;
  tabs: Array<RoomTab<T>>;
  active: T;
  /** Something at the end of the strip (Sonus+ in Sonus et Visio; Thesaurus's search, sort, view and New). */
  end?: ReactNode;
  /** 1…n open the tabs (off where the page uses the digits itself). */
  keys?: boolean;
}

/** A room's tabs (Cursus, Sonus et Visio, Mentis): on desktop a tab strip like a desktop app's, with 1…n as shortcuts. */
export function RoomTabs<T extends string>({ label, tabs, active, end, keys = true }: RoomTabsProps<T>) {
  const navigate = useNavigate();
  const { layout, pointer } = useLayout();
  const hints = keys && pointer === 'fine';
  useHotkeys(Object.fromEntries(tabs.map((t, i) => [String(i + 1), () => navigate(t.to)])), hints);
  if (layout !== 'wide') {
    return (
      <div className="mb-7 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <Segmented<T> block label={label} value={active} onChange={(next) => navigate(tabs.find((t) => t.id === next)!.to)} options={tabs.map((t) => ({ value: t.id, label: t.short ?? t.label }))} />
        </div>
        {end}
      </div>
    );
  }
  return (
    <nav aria-label={label} className="mb-9 flex items-center gap-1 border-b border-line">
      {tabs.map((t, i) => (
        <Link
          key={t.id}
          to={t.to}
          aria-current={active === t.id ? 'page' : undefined}
          className={cx('-mb-px inline-flex h-11 items-center gap-2 border-b-2 px-3.5 text-[14.5px] font-semibold transition-colors', active === t.id ? 'border-ink text-ink' : 'border-transparent text-ink-soft hover:text-ink')}
        >
          {t.icon && <t.icon size={16} aria-hidden />}
          {t.label}
          {t.badge}
          {hints && <Kbd>{i + 1}</Kbd>}
        </Link>
      ))}
      {end && <div className="mb-1.5 ml-auto flex items-center gap-2">{end}</div>}
    </nav>
  );
}
