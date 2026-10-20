import { useEffect, useState } from 'react';
import { Check, Moon } from 'lucide-react';
import { Popover } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { cancelSleepTimer, setSleepTimer, usePlayer } from '@/services/audio/engine';
import { endOf, minutesLeft, sleepStatus } from './labels';

const MINUTES = [5, 10, 15, 30, 45, 60];

/**
 * The minutes left on a timer in minutes, checked once a second (never per frame); it only renders
 * again when the number changes.
 */
function useMinutesLeft(endsAt: number | null): number | null {
  const [left, setLeft] = useState<{ endsAt: number; minutes: number } | null>(null);
  useEffect(() => {
    if (endsAt === null) return;
    const update = () => {
      const minutes = minutesLeft(endsAt, Date.now());
      setLeft((was) => (was?.endsAt === endsAt && was.minutes === minutes ? was : { endsAt, minutes }));
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [endsAt]);
  if (endsAt === null) return null;
  // A timer just set shows its own minutes straight away, not the last timer's.
  return left?.endsAt === endsAt ? left.minutes : minutesLeft(endsAt, Date.now());
}

/** The moon in the player: stop after some minutes, at the end of the chapter, or at the end of the part. */
export function SleepButton() {
  const media = usePlayer((s) => s.media);
  const sleep = usePlayer((s) => s.sleep);
  const left = useMinutesLeft(sleep?.mode === 'minutes' ? sleep.endsAt : null);
  // Live radio has no chapters or end; its own player doesn't use this.
  if (!media || media.kind === 'radio') return null;
  const end = endOf(media);
  const status = sleepStatus(sleep, left, end);

  const row = (label: string, on: boolean, pick: () => void, close: () => void) => (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => {
        pick();
        close();
      }}
      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition-colors hover:bg-surface"
    >
      {label}
      {on && <Check size={15} className="text-accent-text" aria-hidden />}
    </button>
  );

  return (
    <Popover
      label="Sleep timer"
      placement="top"
      className="w-60"
      trigger={(props) => (
        <button
          {...props}
          type="button"
          aria-label={sleep ? `Sleep timer: ${status.toLowerCase()}` : 'Sleep timer'}
          title="Sleep timer"
          className={cx(
            'relative grid size-9 place-items-center rounded-full border transition-colors',
            sleep ? 'border-accent/40 bg-accent-soft text-accent-text' : 'border-line bg-raised hover:border-line-strong',
          )}
        >
          <Moon size={15} className={sleep ? 'fill-current' : undefined} aria-hidden />
          {/* The minutes left sit on the moon as a badge, so the row keeps its width on a phone. */}
          {left !== null && (
            <span className="absolute -top-1.5 -right-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent-fill px-1 text-[10.5px] font-bold text-on-accent tabular-nums" aria-hidden>
              {left}
            </span>
          )}
        </button>
      )}
    >
      {(close) => (
        <div>
          <div className="px-3 pt-1.5 pb-2">
            <p className="text-sm font-bold">Sleep timer</p>
            <p className="text-[12.5px] text-ink-soft">{status}</p>
          </div>
          <div role="group" aria-label="Stop after" className="grid grid-cols-3 gap-1">
            {MINUTES.map((m) => (
              <button
                key={m}
                type="button"
                aria-label={`${m} minutes`}
                onClick={() => {
                  setSleepTimer({ minutes: m });
                  close();
                }}
                className="h-10 rounded-xl text-sm font-semibold tabular-nums transition-colors hover:bg-surface active:bg-surface"
              >
                {m} min
              </button>
            ))}
          </div>
          <div className="mx-2 my-1.5 h-px bg-line" />
          {(media.chapters?.length ?? 0) > 1 && row('End of chapter', sleep?.mode === 'chapter', () => setSleepTimer('chapter'), close)}
          {row(`End of ${end}`, sleep?.mode === 'part', () => setSleepTimer('part'), close)}
          {sleep && (
            <button
              type="button"
              onClick={() => {
                cancelSleepTimer();
                close();
              }}
              className="flex w-full items-center rounded-xl px-3 py-2 text-sm font-semibold text-accent-text transition-colors hover:bg-surface"
            >
              Turn off
            </button>
          )}
        </div>
      )}
    </Popover>
  );
}
