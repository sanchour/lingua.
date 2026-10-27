import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/design/primitives';

/** True when a section is the only one on its page, which already carries its name. */
export const SectionAlone = createContext(false);

export function SettingsSection({
  id,
  icon: Icon,
  title,
  description,
  children,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const alone = useContext(SectionAlone);
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24">
      <Card className="p-5 md:p-6">
        {alone ? (
          <header className="mb-4">
            <h2 id={`${id}-title`} className="sr-only">
              {title}
            </h2>
            {description && (
              <p data-hint="" className="text-sm leading-snug text-ink-soft">
                {description}
              </p>
            )}
          </header>
        ) : (
          <header className="mb-4 flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sage-soft text-sage-text">
              <Icon size={18} aria-hidden />
            </span>
            <div className="min-w-0 pt-0.5">
              <h2 id={`${id}-title`} className="font-serif text-xl leading-tight font-semibold">
                {title}
              </h2>
              {description && (
                <p data-hint="" className="mt-1 text-sm leading-snug text-ink-soft">
                  {description}
                </p>
              )}
            </div>
          </header>
        )}
        {children}
      </Card>
    </section>
  );
}
