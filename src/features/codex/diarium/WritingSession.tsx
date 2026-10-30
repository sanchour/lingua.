import { UiText, useUi } from '@/design/i18n/UiText';
import { useEffect, useState } from 'react';
import { formatClock } from '@/core/audio/cues';
import { WRITING_TASKS, writingTimerMs } from '@/core/journal/tasks';
import { Button } from '@/design/primitives';

export function WritingSession({ taskId, words }: { taskId?: string; words: number }) {
  const translateUi = useUi();
  const task = WRITING_TASKS.find((t) => t.id === taskId);
  const [elapsed, setElapsed] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (startedAt === null) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [startedAt]);
  const toggle = () => {
    const time = Date.now();
    setNow(time);
    setElapsed(writingTimerMs(elapsed, startedAt, time));
    setStartedAt(startedAt === null ? time : null);
  };
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl bg-surface px-4 py-3 text-sm">
      {task && <p className="mr-auto text-ink-soft"><UiText source={'{0} / {1}–{2} words {3}'} values={[words, task.minWords, task.maxWords, <span className="text-ink-faint">· {words < task.minWords ? translateUi('keep going when you are ready') : words <= task.maxWords ? translateUi('within the suggested length') : translateUi('above the suggested length')}</span>]} /></p>}
      <span className="font-semibold tabular-nums" aria-label={translateUi('Writing timer')}>{formatClock(writingTimerMs(elapsed, startedAt, now))}</span>
      <Button size="sm" variant="ghost" onClick={toggle}>{startedAt === null ? translateUi('Start timer') : translateUi('Pause timer')}</Button>
      <Button size="sm" variant="ghost" onClick={() => { setElapsed(0); setStartedAt(null); }}><UiText source={'Reset timer'} /></Button>
      <span className="text-xs text-ink-faint"><UiText source={'Timer resets when you leave.'} /></span>
    </div>
  );
}
