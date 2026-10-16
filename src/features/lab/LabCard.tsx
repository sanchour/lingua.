import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/design/primitives';

export function LabCard({ icon: Icon, title, description, children }: { icon: LucideIcon; title: string; description?: string; children: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sage-soft text-sage-text">
          <Icon size={18} aria-hidden />
        </span>
        <div className="min-w-0 pt-0.5">
          <h2 className="font-serif text-lg leading-tight font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-sm leading-snug text-ink-soft">{description}</p>}
        </div>
      </div>
      {children}
    </Card>
  );
}

export function LogList({ lines, empty }: { lines: string[]; empty: string }) {
  return (
    <div className="mt-3 max-h-40 overflow-y-auto rounded-xl bg-sunken/70 px-3 py-2 font-mono text-[12px] leading-relaxed text-ink-soft">
      {lines.length ? lines.map((line, i) => <div key={i}>{line}</div>) : <div className="italic">{empty}</div>}
    </div>
  );
}

export function Facts({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-ink-soft">{k}</dt>
          <dd className="min-w-0 font-semibold break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
