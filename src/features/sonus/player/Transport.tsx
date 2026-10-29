import { Link } from 'react-router';
import { Bike, Check, EyeOff, LoaderCircle, Pause, Play, Repeat, Repeat1, RotateCcw, RotateCw, SkipBack, SkipForward, StepForward } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Popover } from '@/design/primitives';
import { cx } from '@/lib/cx';
import { loopLabel } from '@/core/audio/loop';
import { cycleLoop, toggleListenFirst, nextSentence, previousSentence, setKeepPitch, setRate, toggleLineByLine, toggleRepeat, skip, toggle, usePlayer } from '@/services/audio/engine';
import { SleepButton } from './SleepTimer';

export const RATES = [0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.25, 1.5];
export const rateLabel = (r: number) => `${r}×`;

function Round({ icon: Icon, label, onClick, disabled, children }: { icon: LucideIcon; label: string; onClick: () => void; disabled?: boolean; children?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="relative grid size-12 place-items-center rounded-full text-ink-soft transition-[transform,background-color,color] duration-150 hover:bg-surface hover:text-ink active:scale-90 disabled:opacity-35"
    >
      <Icon size={22} strokeWidth={1.9} aria-hidden />
      {children && <span className="absolute text-[8.5px] font-bold tabular-nums">{children}</span>}
    </button>
  );
}

/** Play/pause with skips, sentence steps, speed, sentence repeat, the sleep timer and the way into commute mode. */
export function Transport({ className }: { className?: string }) {
  const status = usePlayer((s) => s.status);
  const hasCues = usePlayer((s) => Boolean(s.cues?.length));
  const back = usePlayer((s) => s.skipBackSec);
  const fwd = usePlayer((s) => s.skipFwdSec);
  const rate = usePlayer((s) => s.rate);
  const repeat = usePlayer((s) => s.repeat);
  const loop = usePlayer((s) => s.abLoop);
  const lineByLine = usePlayer((s) => s.lineByLine);
  const keepPitch = usePlayer((s) => s.keepPitch);
  const listenFirst = usePlayer((s) => s.listenFirst);
  const playing = status === 'playing';

  return (
    <div className={className}>
      <div className="flex items-center justify-center gap-1 sm:gap-2">
        <Round icon={SkipBack} label="Previous sentence" onClick={previousSentence} disabled={!hasCues} />
        <Round icon={RotateCcw} label={`Back ${back} seconds`} onClick={() => skip(-back)}>
          {String(back)}
        </Round>
        <button
          type="button"
          aria-label={playing ? 'Pause' : 'Play'}
          onClick={toggle}
          className="mx-1 grid size-16 place-items-center rounded-full bg-inverse text-on-inverse shadow-elev-2 transition-transform duration-150 active:scale-90"
        >
          {status === 'loading' ? (
            <LoaderCircle size={26} className="animate-spin" aria-hidden />
          ) : playing ? (
            <Pause size={26} className="fill-current" aria-hidden />
          ) : (
            <Play size={26} className="translate-x-0.5 fill-current" aria-hidden />
          )}
        </button>
        <Round icon={RotateCw} label={`Forward ${fwd} seconds`} onClick={() => skip(fwd)}>
          {String(fwd)}
        </Round>
        <Round icon={SkipForward} label="Next sentence" onClick={nextSentence} disabled={!hasCues} />
      </div>

      {/* A very narrow phone wraps these rather than overflowing. */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Popover
          label="Speed"
          placement="top"
          className="w-44"
          trigger={(props) => (
            <button {...props} type="button" aria-label={`Speed ${rateLabel(rate)}`} className="h-9 min-w-14 rounded-full border border-line bg-raised px-3 text-[13px] font-bold tabular-nums transition-colors hover:border-line-strong">
              {rateLabel(rate)}
            </button>
          )}
        >
          {(close) => (
            <div role="radiogroup" aria-label="Speed">
              {RATES.map((r) => (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={r === rate}
                  onClick={() => {
                    setRate(r);
                    close();
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold tabular-nums transition-colors hover:bg-surface"
                >
                  {r === 1 ? 'Normal' : rateLabel(r)}
                  {r === rate && <Check size={15} className="text-accent-text" aria-hidden />}
                </button>
              ))}
              <label className="mt-1 flex cursor-pointer items-center gap-2 border-t border-line/60 px-3 pt-2 text-[13px] font-semibold">
                <input type="checkbox" checked={keepPitch} onChange={(e) => setKeepPitch(e.target.checked)} />
                Keep the pitch
              </label>
            </div>
          )}
        </Popover>
        <button
          type="button"
          disabled={!hasCues}
          title={hasCues ? 'Repeat each sentence' : 'Sentence repeats need a transcript'}
          aria-label={`Repeat each sentence: ${repeat === 1 ? 'off' : `${repeat} times`}`}
          onClick={() => toggleRepeat()}
          className={cx(
            'flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-bold transition-colors disabled:opacity-40',
            repeat > 1 ? 'border-accent/40 bg-accent-soft text-accent-text' : 'border-line bg-raised hover:border-line-strong',
          )}
        >
          <Repeat size={14} aria-hidden />
          {repeat > 1 ? `${repeat}×` : 'Repeat'}
        </button>
        <button
          type="button"
          title="Mark where a part starts, then where it ends: it plays again and again. A third press clears it. (key: [)"
          aria-label={`Loop a part: ${loopLabel(loop)}`}
          onClick={cycleLoop}
          className={cx('flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-bold transition-colors', loop ? 'border-accent/40 bg-accent-soft text-accent-text' : 'border-line bg-raised hover:border-line-strong')}
        >
          <Repeat1 size={14} aria-hidden />
          {loopLabel(loop)}
        </button>
        <button
          type="button"
          disabled={!hasCues}
          title={hasCues ? 'Pause after each line; press play for the next (key: L)' : 'Line by line needs a transcript'}
          aria-pressed={lineByLine}
          onClick={toggleLineByLine}
          className={cx('flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-bold transition-colors disabled:opacity-40', lineByLine ? 'border-accent/40 bg-accent-soft text-accent-text' : 'border-line bg-raised hover:border-line-strong')}
        >
          <StepForward size={14} aria-hidden />
          Line by line
        </button>
        <button
          type="button"
          disabled={!hasCues}
          title={hasCues ? 'Keep the text blurred until a line has played: listen first, then read' : 'Needs a transcript'}
          aria-pressed={listenFirst}
          onClick={toggleListenFirst}
          className={cx('flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-bold transition-colors disabled:opacity-40', listenFirst ? 'border-accent/40 bg-accent-soft text-accent-text' : 'border-line bg-raised hover:border-line-strong')}
        >
          <EyeOff size={14} aria-hidden />
          Listen first
        </button>
        <SleepButton />
        <Link to="/sonus/commute" className="flex h-9 items-center gap-1.5 rounded-full border border-line bg-raised px-3 text-[13px] font-bold transition-colors hover:border-line-strong">
          <Bike size={15} aria-hidden /> Commute
        </Link>
      </div>
    </div>
  );
}
