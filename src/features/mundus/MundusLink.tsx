import { Link } from 'react-router';
import { ChevronRight, Compass } from 'lucide-react';
import { cx } from '@/lib/cx';
import type { ShelfId } from '@/features/mundus/ExploreView';

/**
 * A quiet way into Mundus from a room: "Ideas from Mundus", opening its explore shelves at the one whose
 * picks belong in that room.
 */
export function MundusLink({ shelf, className, children }: { shelf?: ShelfId; className?: string; children: string }) {
  return (
    <Link
      to={shelf ? `/mundus/explore?shelf=${shelf}` : '/mundus'}
      className={cx('no-callout group flex items-center gap-3 rounded-2xl border border-dashed border-line-strong/70 px-4 py-3 transition-colors hover:border-line-strong hover:bg-surface', className ?? 'mt-12')}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-text" aria-hidden>
        <Compass size={19} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11.5px] font-bold tracking-[0.13em] text-ink-faint uppercase">Ideas from Mundus</span>
        <span className="block text-[14.5px] leading-snug font-semibold">{children}</span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
