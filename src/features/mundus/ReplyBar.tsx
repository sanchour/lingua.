import { useState } from 'react';
import { ArrowUp, CircleHelp, Clock, RotateCcw, SkipForward } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ASKABLE, askLabel } from '@/core/mundus/guide';
import type { Replies } from '@/core/mundus/guide';
import { useCan } from '@/features/plans/usePlan';
import { sayInWords } from '@/services/llm/mundus';
import { toast } from '@/state/ui';
import { cx } from '@/lib/cx';
import { LANE_ICON } from './Compass';
import { say } from './replies';

const chip =
  'no-callout inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13.5px] font-semibold transition-[background-color,border-color,transform] active:scale-[0.97]';

/**
 * What the learner can say back to Mundus (5.2-7): a few replies that change the steps under the line, kept for the day.
 * With Max a small box takes the same in the learner's own words.
 */
export function ReplyBar({ replies }: { replies: Replies }) {
  const max = useCan('ai');
  const [words, setWords] = useState('');
  const [busy, setBusy] = useState(false);
  const said = replies.lane || replies.short || replies.skips > 0 || replies.last === 'why';

  const send = async () => {
    const text = words.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const sayings = await sayInWords(text);
      if (!sayings.length) toast('Mundus didn’t find anything to change in that. Try “something shorter” or “I’d rather listen”.');
      for (const s of sayings) say(s);
      if (sayings.length) setWords('');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'The AI didn’t answer. Try the buttons instead.', { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const reply = (key: string, Icon: LucideIcon, text: string, on: boolean, onClick: () => void) => (
    <button key={key} type="button" aria-pressed={on} onClick={onClick} className={cx(chip, on ? 'border-transparent bg-inverse text-on-inverse' : 'border-line/70 bg-surface/80 text-ink-soft hover:border-line-strong hover:text-ink')}>
      <Icon size={15} aria-hidden /> {text}
    </button>
  );

  return (
    <div className="mt-4">
      <div role="group" aria-label="Say something back to Mundus" className="flex flex-wrap items-center gap-2">
        {reply('short', Clock, 'Something shorter', Boolean(replies.short), () => say({ kind: 'short' }))}
        {ASKABLE.filter((l) => l !== replies.lane).map((l) => {
          const Icon = LANE_ICON[l];
          return reply(l, Icon, askLabel(l), false, () => say({ kind: 'lane', lane: l }));
        })}
        {reply('why', CircleHelp, 'Why this?', replies.last === 'why', () => say({ kind: 'why' }))}
        {reply('skip', SkipForward, 'Not today', false, () => say({ kind: 'skip' }))}
        {said && (
          <button type="button" onClick={() => say({ kind: 'reset' })} className="hit inline-flex items-center gap-1 text-[13px] font-semibold text-ink-soft hover:text-ink">
            <RotateCcw size={13} aria-hidden /> Start over
          </button>
        )}
      </div>
      {max && (
        <form
          className="mt-3 flex max-w-md items-center gap-1 rounded-full border border-line/70 bg-surface/80 py-1 pr-1 pl-4 focus-within:border-line-strong"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <input
            value={words}
            onChange={(e) => setWords(e.target.value)}
            maxLength={200}
            aria-label="Tell Mundus in your own words"
            placeholder="Or say it your way: “20 minutes, and I’m tired”"
            className="h-8 min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-ink-faint"
          />
          <button type="submit" disabled={!words.trim() || busy} aria-label="Send" className="grid size-8 place-items-center rounded-full bg-inverse text-on-inverse disabled:opacity-40">
            <ArrowUp size={15} aria-hidden />
          </button>
        </form>
      )}
    </div>
  );
}
