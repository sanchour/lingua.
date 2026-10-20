import { Check, Gem, RotateCcw } from 'lucide-react';
import { FREE_ROOMS, getPlus, hasPlus, PLUS_PRICE, PLUS_ROOMS, resetPlus } from '@/data/plus';
import type { Settings } from '@/data/settings';
import { Button } from '@/design/primitives';
import { toast } from '@/state/ui';
import { SettingsSection } from '../SettingsSection';

/** Lingua+, a placeholder: the button charges nothing and nothing is locked yet. */
export function PlusSection({ meta }: { meta: Settings['meta'] }) {
  const owned = hasPlus(meta);
  return (
    <SettingsSection
      id="plus"
      icon={Gem}
      title="Lingua+"
      description="One purchase, no subscription: Lingua+ unlocks every room. The free edition keeps Codex and Thesaurus."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-line p-4">
          <p className="text-[12px] font-bold tracking-[0.12em] text-ink-faint uppercase">Free</p>
          <ul className="mt-2 space-y-1.5 text-[14.5px]">
            {FREE_ROOMS.map((r) => (
              <li key={r} className="flex items-center gap-2">
                <Check size={15} className="text-sage-text" aria-hidden /> {r}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-accent/40 bg-accent-soft/40 p-4">
          <p className="text-[12px] font-bold tracking-[0.12em] text-accent-text uppercase">Lingua+</p>
          <ul className="mt-2 space-y-1.5 text-[14.5px]">
            <li className="flex items-center gap-2 font-semibold">
              <Check size={15} className="text-accent-text" aria-hidden /> Everything in free
            </li>
            {PLUS_ROOMS.map((r) => (
              <li key={r} className="flex items-center gap-2">
                <Check size={15} className="text-accent-text" aria-hidden /> {r}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-start gap-3 rounded-2xl border border-line p-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{owned ? 'You have Lingua+' : `Get Lingua+ · ${PLUS_PRICE}`}</p>
          <p className="text-sm text-ink-soft">
            {owned
              ? `Since ${new Date(meta.plusAt!).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })}. This is a preview: nothing was charged.`
              : 'A preview for now: the button charges nothing, and nothing is locked yet.'}
          </p>
        </div>
        {owned ? (
          <Button
            variant="secondary"
            icon={RotateCcw}
            onClick={() => {
              void resetPlus();
              toast('Lingua+ is removed from this device.');
            }}
          >
            Reset Lingua+
          </Button>
        ) : (
          <Button
            icon={Gem}
            onClick={() => {
              void getPlus();
              toast('Lingua+ is on. Nothing was charged.', { tone: 'success' });
            }}
          >
            Get Lingua+
          </Button>
        )}
      </div>
    </SettingsSection>
  );
}
