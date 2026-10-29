import { useState } from 'react';
import { useNavigate } from 'react-router';
import { WRITING_TASKS, writingTaskPrompt } from '@/core/journal/tasks';
import { createEntry } from '@/data/journal';
import { Button, Card, Select } from '@/design/primitives';
import { toast } from '@/state/ui';

export function WritingTasks({ lang }: { lang: string }) {
  const [id, setId] = useState(WRITING_TASKS[0].id);
  const [details, setDetails] = useState('');
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();
  const task = WRITING_TASKS.find((t) => t.id === id)!;
  const start = async () => {
    setStarting(true);
    try {
      const entryId = await createEntry(lang, { text: writingTaskPrompt(task, details), taskId: task.id });
      navigate(`/mentis/diarium/${entryId}`);
    } catch {
      toast('Could not start the task. Please try again.', { tone: 'error' });
    } finally {
      setStarting(false);
    }
  };
  return (
    <Card className="space-y-4 p-5">
      <h2 className="font-serif text-xl font-semibold">Writing tasks</h2>
      <Select label="Choose a task" value={id} onChange={setId} options={WRITING_TASKS.map((t) => ({ value: t.id, label: t.title }))} />
      <p className="text-sm leading-relaxed text-ink-soft">{task.brief}</p>
      <p className="text-[13px] text-ink-faint">Aim for {task.minWords}–{task.maxWords} words. A guide, not a limit.</p>
      <label className="block text-[13px] font-semibold text-ink-soft">
        Your material (optional)
        <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} placeholder="Words, notes, an article or a paragraph to work from…" className="mt-2 w-full resize-y rounded-xl border border-line bg-raised p-3 font-normal text-ink" />
      </label>
      <Button onClick={() => void start()} loading={starting}>Start this task</Button>
    </Card>
  );
}
