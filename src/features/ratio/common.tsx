import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { getLanguage } from '@/core/lang/languages';
import { LANGUAGE_NAMES } from '@/core/parsers/notion';
import type { Activity } from '@/data/ratio';
import { cx } from '@/lib/cx';

export const ACTIVITY_LABEL: Record<Activity, string> = {
  read: 'Reading',
  listen: 'Listening',
  watch: 'Watching',
  review: 'Flashcards',
  ludus: 'Ludus',
  write: 'Writing',
  logged: 'Logged',
};

export const ACTIVITY_COLOR: Record<Activity, string> = {
  read: 'var(--sage)',
  listen: 'color-mix(in oklab, var(--sage) 45%, var(--ink-faint))',
  watch: 'color-mix(in oklab, var(--accent) 35%, var(--ink-faint))',
  review: 'var(--accent)',
  ludus: 'color-mix(in oklab, var(--accent) 55%, var(--sage))',
  write: 'color-mix(in oklab, var(--accent) 50%, var(--sunken))',
  logged: 'var(--line-strong)',
};

export const langName = (code: string) => getLanguage(code)?.name ?? LANGUAGE_NAMES[code] ?? code;

export function hours(minutes: number): string {
  if (minutes < 1) return '0 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = minutes / 60;
  return `${h < 10 ? Math.round(h * 10) / 10 : Math.round(h).toLocaleString()} h`;
}

export const pct = (share: number) => `${Math.round(share * 100)}%`;
export const shortDate = (ms: number) => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** A section of the dashboard: a quiet card with a small title. */
export function Panel({ title, icon: Icon, children, className, action }: { title: string; icon?: LucideIcon; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={cx('rounded-3xl border border-line/70 bg-surface p-5 sm:p-6', className)} aria-label={title}>
      <header className="mb-4 flex items-center gap-2">
        {Icon && <Icon size={17} className="text-sage-text" aria-hidden />}
        <h2 className="flex-1 text-[13px] font-bold tracking-wide text-ink-soft uppercase">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

/** A big number with a small caption. */
export function Stat({ value, label, hint }: { value: ReactNode; label: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <dd className="truncate font-serif text-[26px] leading-tight font-semibold tabular-nums">{value}</dd>
      <dt className="mt-0.5 text-[12px] font-bold tracking-wide text-ink-faint uppercase">{label}</dt>
      {hint && <p className="mt-0.5 text-[12.5px] text-ink-soft">{hint}</p>}
    </div>
  );
}

export function Legend({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] font-semibold text-ink-soft">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
