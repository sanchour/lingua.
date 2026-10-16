import { Check } from 'lucide-react';
import { getLevel, LEVELS } from '@/core/lang/levels';
import type { Level } from '@/core/lang/levels';
import { Badge, Card, ToggleRow } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { StepTitle } from './StepTitle';

interface LevelStepProps {
  level: Level;
  seedKnown: boolean;
  onLevel: (level: Level) => void;
  onSeedKnown: (value: boolean) => void;
}

export function LevelStep({ level, seedKnown, onLevel, onSeedKnown }: LevelStepProps) {
  const info = getLevel(level);
  return (
    <div>
      <StepTitle title="How far along are you?" body="This sets up your first decks. Nothing is locked in." />

      <div role="radiogroup" aria-label="Current level" className="grid gap-2 sm:grid-cols-2">
        {LEVELS.map((l) => {
          const selected = l.id === level;
          return (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onLevel(l.id)}
              className={cx(
                'no-callout flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-[transform,background-color,border-color] duration-150 active:scale-[0.98]',
                selected ? 'border-accent bg-accent-soft' : 'border-line bg-raised hover:border-line-strong',
              )}
            >
              <span
                className={cx(
                  'grid size-10 shrink-0 place-items-center rounded-xl text-sm font-bold',
                  selected ? 'bg-accent-fill text-on-accent' : 'bg-sunken text-ink-soft',
                )}
              >
                {selected ? <Check size={18} strokeWidth={3} aria-hidden /> : l.id}
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold">{l.name}</span>
                <span className="block text-[13px] leading-snug text-ink-soft">{l.blurb}</span>
              </span>
            </button>
          );
        })}
      </div>

      <Card className="mt-5 py-2">
        <ToggleRow
          title={info.seedKnownTopN ? `Mark the ${info.seedKnownTopN.toLocaleString()} most common words as known` : 'Start with a clean slate'}
          description={
            info.seedKnownTopN
              ? 'Saves clicking through words you already know. You can change any word later.'
              : 'Every word starts unseen, ready to discover.'
          }
          checked={info.seedKnownTopN > 0 && seedKnown}
          onChange={onSeedKnown}
          disabled={info.seedKnownTopN === 0}
        />
        <div className="flex flex-wrap items-center gap-1.5 border-t border-line pt-3 pb-2">
          <span className="mr-1 text-[13px] font-semibold text-ink-soft">Starter decks:</span>
          {info.starterDecks.map((d) => (
            <Badge key={d} tone="sage">
              {d}
            </Badge>
          ))}
        </div>
      </Card>
    </div>
  );
}
